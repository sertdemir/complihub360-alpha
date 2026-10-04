import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { LEAD_FEE_POLICY_VERSION } from '../billing.js';
import { createHash, createHmac, randomUUID, generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';

// ─── API integration tests (13-layer audit P1 #7) ────────────────────────────
// The real HTTP server runs in-process on a test port; only supabaseApi is
// replaced by an in-memory table store. This pins the manually-verified flows:
// auth gate, /search (slug mapping + anonymization + engine resilience),
// scheduling create/reschedule guards, reviews aggregate, watcher tick smoke.

// In-memory "database" — one array per table, equality-filtered like PostgREST.
const { db, resetDb } = vi.hoisted(() => {
    const db: Record<string, any[]> = {};
    return { db, resetDb: () => { for (const k of Object.keys(db)) delete db[k]; } };
});

vi.mock('../supabase.js', () => ({
    supabaseApi: {
        async select(table: string, match: Record<string, any> = {}, opts: { order?: string; limit?: number } = {}) {
            let rows = (db[table] ?? []).filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
            if (opts.order) {
                const [col, dir] = opts.order.split('.');
                rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : 1) * (dir === 'desc' ? -1 : 1));
            }
            if (opts.limit) rows = rows.slice(0, opts.limit);
            return rows;
        },
        async insert(table: string, data: any) {
            const rows = (Array.isArray(data) ? data : [data]).map((r) => ({ id: randomUUID(), ...r }));
            (db[table] ??= []).push(...rows);
            return rows;
        },
        async update(table: string, match: Record<string, any>, data: any) {
            const rows = (db[table] ?? []).filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
            rows.forEach((r) => Object.assign(r, data));
            return rows;
        },
        // Spiegelt supabaseApi.updateWhere: der Aufrufer schreibt den
        // PostgREST-Ausdruck selbst. Hier gebraucht werden 'eq.<wert>' und
        // 'is.null'; alles andere waere im Test eine stille Falschannahme,
        // deshalb wirft es.
        async updateWhere(table: string, filters: Record<string, string>, data: any) {
            const passt = (r: any) => Object.entries(filters).every(([k, expr]) => {
                if (expr === 'is.null') return r[k] === null || r[k] === undefined;
                if (expr.startsWith('eq.')) return String(r[k]) === expr.slice(3);
                throw new Error(`unsupported filter in test store: ${expr}`);
            });
            const rows = (db[table] ?? []).filter(passt);
            rows.forEach((r) => Object.assign(r, data));
            return rows;
        },
        async upsert(table: string, onConflict: string, data: any) {
            const keys = onConflict.split(',').map((k) => k.trim()).filter(Boolean);
            const rows = Array.isArray(data) ? data : [data];
            const store = (db[table] ??= []);
            for (const r of rows) {
                const hit = keys.length
                    ? store.find((x) => keys.every((k) => x[k] === r[k]))
                    : undefined;
                if (hit) Object.assign(hit, r);
                else store.push({ id: randomUUID(), ...r });
            }
            return rows;
        },
        async remove(table: string, match: Record<string, any> = {}) {
            const store = (db[table] ??= []);
            const gone = store.filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
            db[table] = store.filter((r) => !gone.includes(r));
            return gone;
        },
        // `auth.users` liegt in PostgREST nicht offen; die API fragt die
        // Adresse deshalb ueber die Funktion aus 20260922010000 nach. Der
        // Speicher hier bildet `auth.users` als eigene Tabelle ab — bewusst
        // getrennt von `db.users` (public.users), weil genau deren
        // Verwechslung der Fehler war, den diese Aenderung behebt.
        async rpc(fn: string, params: Record<string, any> = {}) {
            if (fn === 'auth_user_id_by_email') {
                const gesucht = String(params.p_email ?? '').trim().toLowerCase();
                const treffer = (db.auth_users ?? []).filter(
                    (u) => String(u.email).toLowerCase() === gesucht && !u.deleted_at);
                // Genau eine, oder keine — wie die SQL-Funktion.
                return treffer.length === 1 ? treffer[0].id : null;
            }
            // Gegenstueck aus 20261001184141: nur bestaetigte, lebende Logins.
            if (fn === 'auth_user_email_by_id') {
                const u = (db.auth_users ?? []).find((x) => x.id === params.p_user_id && !x.deleted_at && x.email_confirmed_at);
                return u ? u.email : null;
            }
            throw new Error(`unmocked rpc in test store: ${fn}`);
        },
    },
}));

// Storage (Phase 2 Onboarding): kein Netz im Test. `uploaded` sagt, welche
// Objektpfade "im Bucket liegen" — objectInfo() antwortet danach.
const { uploaded } = vi.hoisted(() => ({ uploaded: new Set<string>() }));
// Stripe (Phase 4): kein Netz im Test. Alles, was api.stripe.com erreichen
// koennte, geht durch stripe.ts — und das hier ersetzt es als Ganzes. Nicht
// globalThis.fetch: darueber spricht die Suite mit dem eigenen Server.
const { stripeMock } = vi.hoisted(() => ({
    stripeMock: {
        configured: true,
        getCustomerBilling: vi.fn(),
        createPaymentIntent: vi.fn(),
        refundPaymentIntent: vi.fn(),
        stripeRequest: vi.fn(),
    },
}));
vi.mock('../stripe.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../stripe.js')>();
    return {
        ...real,
        isStripeConfigured: () => stripeMock.configured,
        getCustomerBilling: (...a: any[]) => stripeMock.getCustomerBilling(...a),
        createPaymentIntent: (...a: any[]) => stripeMock.createPaymentIntent(...a),
        refundPaymentIntent: (...a: any[]) => stripeMock.refundPaymentIntent(...a),
        stripeRequest: (...a: any[]) => stripeMock.stripeRequest(...a),
        ensureStripeCustomer: async (key: string) => `cus_${key}`,
    };
});
function resetStripe() {
    stripeMock.configured = true;
    stripeMock.getCustomerBilling.mockReset().mockResolvedValue({ defaultPaymentMethodId: 'pm_test_1', paymentMethodLabel: 'visa ····4242', email: 'geheim@testkanzlei.example', billingInfoComplete: true, delinquent: false });
    stripeMock.createPaymentIntent.mockReset().mockResolvedValue({ ok: true, paymentIntentId: 'pi_test_1', status: 'succeeded' });
    stripeMock.refundPaymentIntent.mockReset().mockResolvedValue({ refundId: 're_test_1' });
    stripeMock.stripeRequest.mockReset().mockImplementation(async (_m: string, path: string) => { throw new Error(`unmocked stripe call: ${path}`); });
}
vi.mock('../storage.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../storage.js')>();
    return {
        ...real,
        async signedUploadUrl(_bucket: string, path: string) {
            return { url: `https://storage.test/upload/${path}`, token: 'tok', method: 'PUT', expiresAt: new Date(Date.now() + 7200_000).toISOString() };
        },
        async signedDownloadUrl(_bucket: string, path: string) { return `https://storage.test/signed/${path}?token=x`; },
        async objectInfo(_bucket: string, path: string) { return uploaded.has(path) ? { size: 4321, mimeType: 'application/pdf' } : null; },
    };
});
// VIES: 'DE' + 9 Ziffern gilt, alles andere ist ungueltig — deterministisch.
vi.mock('../vies.js', () => ({
    normaliseVatId: (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    async checkVatId(raw: string) {
        const vatId = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const valid = /^DE\d{9}$/.test(vatId);
        return { status: valid ? 'valid' : 'invalid', vatId, countryCode: vatId.slice(0, 2), name: valid ? 'Testkanzlei' : null, checkedAt: new Date().toISOString() };
    },
}));

const PORT = 3611;
const BASE = `http://127.0.0.1:${PORT}`;
const API_KEY = 'test-api-key';
const JWT_SECRET = 'test-jwt-secret';

function signJwt(payload: Record<string, any>): string {
    const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = b64({ alg: 'HS256', typ: 'JWT' });
    const body = b64({ role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
    const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
    return `${head}.${body}.${sig}`;
}

const USER_ID = randomUUID();
const USER_JWT = signJwt({ sub: USER_ID, email: 'test@complihub.test' });

// ES256: what migrated Supabase projects issue — the public key is served
// via the project's JWKS endpoint, mocked below on JWKS_PORT.
const JWKS_PORT = 3612;
const ES_KID = 'test-es256-kid';
const esKeys = generateKeyPairSync('ec', { namedCurve: 'P-256' });

function signEs256Jwt(payload: Record<string, any>, kid: string = ES_KID): string {
    const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = b64({ alg: 'ES256', typ: 'JWT', kid });
    const body = b64({ role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
    const sig = cryptoSign('sha256', Buffer.from(`${head}.${body}`), { key: esKeys.privateKey, dsaEncoding: 'ieee-p1363' })
        .toString('base64url');
    return `${head}.${body}.${sig}`;
}

async function api(path: string, init: RequestInit & { auth?: 'key' | 'jwt' | 'none' } = {}) {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(init.headers as any) };
    if (init.auth === 'key' || init.auth === undefined) headers['x-api-key'] = API_KEY;
    if (init.auth === 'jwt') headers['authorization'] = `Bearer ${USER_JWT}`;
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Der opake Ref eines Test-Anbieters — deterministisch aus dem Schluessel, damit Tests ihn nachschlagen koennen. */
const refOf = (key: string) => createHash('md5').update(`ref:${key}`).digest('hex').slice(0, 12);

function seedProvider(over: Record<string, any> = {}) {
    const key = over.provider_key ?? 'test-kanzlei';
    const row = {
        provider_key: 'test-kanzlei',
        public_ref: refOf(key),
        name: 'Testkanzlei Schmidt GmbH',
        contact_email: 'geheim@testkanzlei.example',
        website_url: 'https://testkanzlei-schmidt.example',
        pseudonym_label: 'Verifizierte Steuerkanzlei · Norddeutschland',
        region: 'Norddeutschland',
        active_since: 2015,
        categories: ['vat', 'vat_oss'],
        languages: ['de', 'en'],
        countries_supported: ['DE'],
        rating: 4.8,
        completed_count: 120,
        avg_response_hours: 4,
        billing_model: 'project',
        pricing_table: [{ service: 'VAT-Registrierung', price: 'ab 900 €' }],
        is_verified: true,
        availability: 'available',
        partner_status: 'active',
        ...over,
    };
    (db.providers ??= []).push(row);

    // Matchbarkeit haengt ab jetzt an `matchable_provider_services`, nicht an
    // `partner_status`. Das Fixture bildet nach, was die Migration aus dem
    // Bestand macht: eine freigegebene Leistung je Bereich, freigegeben in
    // jedem angegebenen Markt — und nur fuer Anbieter, deren Lifecycle das
    // erlaubt (active und downgraded werden beide zu 'active' uebernommen).
    //
    // `areas` traegt die Bereichs-Slugs des Wizards; `categories` oben bleibt
    // die Selbstauskunft, die auf dem Draht nichts mehr entscheidet.
    const areas: string[] = over.areas ?? ['tax-vat'];
    delete (row as any).areas;
    // Zahlungsbereit (Spec §21.1) — entscheidet die Buchung, nie das Matching.
    const bookable: boolean = over.bookable ?? true;
    delete (row as any).bookable;
    // Nachweise fuer die Verifikationstiefe (Phase 3): 'independent' | 'reviewed' | 'none'.
    const depth: 'independent' | 'reviewed' | 'none' = over.depth ?? 'none';
    delete (row as any).depth;
    if (depth !== 'none') {
        const result = depth === 'independent' ? 'independently_verified' : 'reviewed';
        for (const t of ['incorporation', 'vat_id', 'insurance', 'representative_identity']) {
            (db.provider_evidence ??= []).push({
                id: randomUUID(), provider_key: row.provider_key, evidence_type: t, source: t === 'vat_id' ? 'registry_check' : 'document',
                result, upload_confirmed: true,
            });
        }
        // Regulierte Bereiche verlangen eine Zulassung je Land (verificationRules).
        for (const area of areas) if (area === 'tax-vat' || area === 'legal-advisory') for (const land of row.countries_supported ?? []) {
            (db.provider_evidence ??= []).push({
                id: randomUUID(), provider_key: row.provider_key, evidence_type: 'professional_licence', source: 'document',
                result, upload_confirmed: true, supports_service_codes: [area], supports_countries: [land],
            });
        }
    }
    // Bereichsnamen fuer die Beschreibung ("Tax and VAT · Region") — einmal je Test.
    for (const area of areas) {
        if (!(db.service_categories ??= []).some((c) => c.code === area)) {
            db.service_categories.push({ code: area, parent_code: null, label_en: area === 'tax-vat' ? 'Tax and VAT' : area === 'legal-advisory' ? 'Legal Support' : area, active: true });
        }
    }
    const matchbar = row.partner_status === 'active' || row.partner_status === 'downgraded';
    if (matchbar) {
        const view = (db.matchable_provider_services ??= []);
        for (const area of areas) {
            for (const land of row.countries_supported ?? []) {
                view.push({
                    service_id: randomUUID(),
                    provider_key: row.provider_key,
                    service_code: area,
                    service_name: area === 'tax-vat' ? 'Tax and VAT' : area,
                    area_code: area,
                    country_code: land,
                    provider_availability: row.availability,
                    bookable_chargeable: bookable,
                    provider_lifecycle_status: 'active',
                });
            }
        }
    }
    return row;
}

beforeAll(async () => {
    // Mock JWKS endpoint — supabaseJwt.ts derives its URL from SUPABASE_URL.
    const jwk = esKeys.publicKey.export({ format: 'jwk' });
    await new Promise<void>((resolve) => {
        createHttpServer((_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ keys: [{ ...jwk, kid: ES_KID, alg: 'ES256', use: 'sig' }] }));
        }).listen(JWKS_PORT, resolve);
    });
    process.env.SUPABASE_URL = `http://127.0.0.1:${JWKS_PORT}`;

    process.env.PORT = String(PORT);
    process.env.API_KEY = API_KEY;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.WATCHERS_ENABLED = 'false';
    process.env.RATE_LIMIT_MAX = '10000'; // die Suite laeuft komplett von 127.0.0.1
    process.env.NODE_ENV = 'development';
    delete process.env.RESEND_API_KEY; // mailer → email_outbox events, no network
    await import('../index.js');
    // The listen callback fires async — poll /health until the server answers.
    for (let i = 0; i < 50; i++) {
        try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('test server did not come up');
});

beforeEach(() => { resetDb(); uploaded.clear(); resetStripe(); });

describe('auth gate', () => {
    it('lets /health through without credentials', async () => {
        const r = await api('/health', { auth: 'none' });
        expect(r.status).toBe(200);
        expect(r.body.ok).toBe(true);
    });

    it('401s protected routes without credentials', async () => {
        const r = await api('/api/v1/bookings', { auth: 'none' });
        expect(r.status).toBe(401);
        expect(r.body.errorCode).toBe('UNAUTHORIZED');
    });

    // Audit P1 #4: the frontend ships NO shared api key — the guest funnel
    // runs on explicitly public routes, everything else stays gated.
    it('serves the guest funnel without any credentials (public routes)', async () => {
        seedProvider();
        const search = await api('/api/v1/search', {
            method: 'POST', auth: 'none',
            body: JSON.stringify({ country: 'DE', structured_answers: { domains: ['tax-vat'] } }),
        });
        expect(search.status).toBe(200);
        expect(search.body.providers).toHaveLength(1);

        const save = await api('/api/v1/session', {
            method: 'POST', auth: 'none',
            body: JSON.stringify({ guest_key: 'guest-abc', country: 'DE', categories: ['tax-vat'] }),
        });
        expect([200, 201]).toContain(save.status);
    });

    it('keeps admin + booking routes closed for guests', async () => {
        const tick = await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}', auth: 'none' });
        expect(tick.status).toBe(401);
        const book = await api('/api/v1/scheduling', { method: 'POST', body: '{}', auth: 'none' });
        expect(book.status).toBe(401);
        const patch = await api(`/api/v1/scheduling/${randomUUID()}`, { method: 'PATCH', body: '{}', auth: 'none' });
        expect(patch.status).toBe(401);
    });

    it('still verifies and attaches a JWT sent on a public route', async () => {
        seedProvider();
        const r = await api('/api/v1/search', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ country: 'DE', structured_answers: { domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
    });

    // Supabase "JWT signing keys" migration: tokens arrive ES256-signed with
    // a kid resolved against the project JWKS (staging regression 2026-09-01:
    // the HS256-only gate 401ed every logged-in user).
    it('accepts an ES256 token signed with the published JWKS key', async () => {
        const token = signEs256Jwt({ sub: USER_ID, email: 'test@complihub.test' });
        const res = await fetch(`${BASE}/api/v1/bookings`, { headers: { authorization: `Bearer ${token}` } });
        expect(res.status).toBe(200);
    });

    it('rejects an ES256 token with an unknown kid', async () => {
        const token = signEs256Jwt({ sub: USER_ID }, 'kid-not-in-jwks');
        const res = await fetch(`${BASE}/api/v1/bookings`, { headers: { authorization: `Bearer ${token}` } });
        expect(res.status).toBe(401);
    });

    it('rejects a tampered ES256 token', async () => {
        const token = signEs256Jwt({ sub: USER_ID });
        const [head, , sig] = token.split('.');
        const forgedBody = Buffer.from(JSON.stringify({ role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, sub: randomUUID() })).toString('base64url');
        const res = await fetch(`${BASE}/api/v1/bookings`, { headers: { authorization: `Bearer ${head}.${forgedBody}.${sig}` } });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/v1/search', () => {
    it('matches a wizard slug against an APPROVED service and anonymizes the result', async () => {
        seedProvider({ depth: 'independent' });
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.providers).toHaveLength(1);
        const p = r.body.providers[0];
        // Phase 3: der Titel entsteht im System — Buchstabe je Liste plus
        // Beschreibung aus freigegebenem Bereich und Region.
        expect(p.title).toBe('Verified Provider A');
        expect(p.letter).toBe('A');
        expect(p.descriptor).toBe('Tax and VAT · Norddeutschland');
        expect(p.public_ref).toBe(refOf('test-kanzlei'));
        expect(p.provider_key).toBeUndefined();
        expect(p.pseudonym_label).toBeUndefined();
        expect(p.rank_basis.verification).toBe('independent');
        expect(p.match).toBeGreaterThan(0);
        expect(p.match_basis.domains_matched).toEqual(['tax-vat']);
        // Auf dem Draht steht die freigegebene Leistung, nicht die
        // Selbstauskunft aus `categories` ('vat', 'vat_oss').
        expect(p.specializations).toEqual(['Tax and VAT']);
        // Stage-1 anonymity: no identity fields on the wire.
        expect(p.name).toBeUndefined();
        expect(p.contact_email).toBeUndefined();
        expect(p.website_url).toBeUndefined();
    });

    // Der eigentliche Umbau: ein aktiver Anbieter OHNE freigegebene Leistung in
    // diesem Markt erscheint nicht mehr. Vorher entschied `partner_status` plus
    // `countries_supported`, und diese Zeile waere gruen gewesen, obwohl nichts
    // geprueft war (§19).
    it('hides an active provider that has no approved service — partner_status alone is not enough', async () => {
        seedProvider({ provider_key: 'ungeprueft', areas: [] });
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.providers).toEqual([]);
    });

    // Gegenprobe zur Freigabe je Markt (§19): dieselbe Leistung, anderes Land.
    it('hides a provider whose service is approved for another market only', async () => {
        seedProvider({ countries_supported: ['AT'] });
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.providers).toEqual([]);
    });

    // §14: die Abrechnung darf die Sichtbarkeit nicht steuern. Die View meldet
    // `bookable_chargeable` nur — wer daraus einen Filter macht, faellt hier.
    it('still matches a provider that is not billing-ready (§14)', async () => {
        seedProvider();
        (db.matchable_provider_services ?? []).forEach((r: any) => { r.bookable_chargeable = false; });
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.body.providers).toHaveLength(1);
    });

    it('returns enriched laws: focus domains confirmed and sorted first, with statute + severity', async () => {
        seedProvider();
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat', 'logistics-customs'] } }),
        });
        expect(r.status).toBe(200);
        const laws = r.body.laws as any[];
        expect(laws.length).toBeGreaterThan(0);
        const vat = laws.find((l) => l.id === 'tax-vat-registration');
        expect(vat?.state).toBe('confirmed');
        expect(vat?.severity).toBe('high');
        expect(vat?.source).toContain('UStG');
        // LOGISTICS is a focus domain → its templates must be present…
        expect(laws.some((l) => l.id === 'log-eori')).toBe(true);
        // …and every focus law sorts before the first score-ranked 'likely' law.
        const firstLikely = laws.findIndex((l) => l.state === 'likely');
        if (firstLikely !== -1) {
            expect(laws.slice(0, firstLikely).every((l) => l.state === 'confirmed')).toBe(true);
        }
    });

    it('survives an unknown engine country (laws empty, providers still scored)', async () => {
        // A provider may support a country the ENGINE has no profile for —
        // matching must keep working, only the laws payload stays empty.
        seedProvider({ countries_supported: ['XX'] });
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'XX', structured_answers: { domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.laws).toEqual([]);
        expect(r.body.providers).toHaveLength(1);
    });
});

// ─── Referenz-ID ("Technical details", Canvas-Wahl B3) ────────────────────────
// Scheitert die Risk Map, zeigt der Zustand "Risk Map failed" eine Referenz-ID,
// die der Nutzer dem Support nennt. Das funktioniert nur, wenn der Browser und
// das Log DIESELBE ID kennen. Der Browser schickt sie als `x-correlation-id`;
// diese Tests halten fest, dass der Server sie annimmt, zurueckgibt und im
// Fehlerfall ins Log schreibt — und dass er nichts Internes preisgibt.
describe('POST /api/v1/search — Referenz-ID', () => {
    const REF = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';
    const suche = (headers: Record<string, string>, body = JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } })) =>
        fetch(`${BASE}/api/v1/search`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

    it('gibt die ID des Browsers auf jeder Antwort zurueck, auch bei Erfolg', async () => {
        const res = await suche({ 'x-correlation-id': REF });
        expect(res.status).toBe(200);
        expect(res.headers.get('x-correlation-id')).toBe(REF);
        // Staging: UI und API auf verschiedenen Origins — ohne Expose sieht
        // der Browser den Header nicht.
        expect(res.headers.get('access-control-expose-headers')).toContain('x-correlation-id');
    });

    it('ersetzt einen Wert, der keine ID ist, statt ihn zu uebernehmen', async () => {
        for (const fremd of ['kurz', 'a'.repeat(65), 'ref mit leerzeichen', '"}{"level":"info"']) {
            const res = await suche({ 'x-correlation-id': fremd });
            const id = res.headers.get('x-correlation-id');
            expect(id).not.toBe(fremd);
            expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
        }
    });

    it('schreibt die ID bei einem Fehler ins Log und nennt nach aussen nur sie', async () => {
        const { supabaseApi } = await import('../supabase.js');
        const select = vi.spyOn(supabaseApi, 'select').mockRejectedValueOnce(
            new Error('Supabase select failed: connection to db.internal:5432 refused'),
        );
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = await suche({ 'x-correlation-id': REF });
            const body = await res.json();

            // Ein Datenbankausfall ist kein Fehler der Anfrage.
            expect(res.status).toBe(500);
            expect(body).toEqual({ errorCode: 'INTERNAL', message: 'Search failed', correlationId: REF });
            expect(JSON.stringify(body)).not.toContain('db.internal');

            // Der Support findet die Ursache unter genau dieser ID.
            const zeile = log.mock.calls.map((c) => String(c[0])).find((l) => l.includes('Search failed'));
            expect(zeile).toBeDefined();
            const eintrag = JSON.parse(zeile!);
            expect(eintrag.correlationId).toBe(REF);
            expect(eintrag.detail).toContain('db.internal');
        } finally {
            select.mockRestore();
            log.mockRestore();
        }
    });

    it('meldet kaputtes JSON als Fehler der Anfrage, mit ID', async () => {
        const res = await suche({ 'x-correlation-id': REF }, '{kein json');
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId: REF });
    });
});

// ─── Phase 4: Buchung → Bestaetigung → Belastung → Offenlegung ───────────────

function seedAcknowledgement() {
    (db.booking_acknowledgements ??= []).push(
        { version: 'booking-ack-v1', language: 'en', body: 'With this booking … 10 % …', shared_fields: ['email', 'company_name', 'message'], effective_from: '2026-10-01' },
        { version: 'booking-ack-v1', language: 'de', body: 'Mit dieser Buchung … 10 % …', shared_fields: ['email', 'company_name', 'message'], effective_from: '2026-10-01' },
    );
}
function seedUserDiscountPolicy() {
    (db.user_discount_policy ??= []).push({ version: 1, pct: 10, recurring_treatment: 'undecided', effective_from: '2026-10-01' });
}
function seedSession(over: Record<string, any> = {}) {
    const row = { id: randomUUID(), user_id: USER_ID, country: 'DE', markets: ['DE'], categories: ['tax-vat'], answers: {}, status: 'active', ...over };
    (db.sessions ??= []).push(row);
    return row;
}
const MEMBER_ID = randomUUID();
function seedMember(providerKey = 'test-kanzlei', userId = MEMBER_ID) {
    (db.provider_members ??= []).push({ provider_key: providerKey, user_id: userId, role: 'owner' });
}
/** Alles, was eine Buchung mit Belastung braucht: Anbieter mit Karte, Preise, Text, Policy, Sitzung. */
function seedBookable(providerOver: Record<string, any> = {}, plan: string | null = 'growth') {
    const p = seedProvider({ stripe_customer_id: 'cus_test', ...providerOver });
    seedPricing();
    if (plan) seedSubscription(p.provider_key, plan, { current_period_start: '2020-01-01', started_at: '2020-01-01T00:00:00Z' });
    seedAcknowledgement();
    seedUserDiscountPolicy();
    seedMember(p.provider_key);
    return { provider: p, session: seedSession() };
}
const inAWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString();
const book = (body: Record<string, unknown>) => api('/api/v1/scheduling', { method: 'POST', auth: 'jwt', body: JSON.stringify(body) });
const standardBody = (session: { id: string }, over: Record<string, unknown> = {}) => ({
    public_ref: refOf('test-kanzlei'), slot_start: inAWeek(), message: 'Erstgespräch', acknowledgement_version: 'booking-ack-v1', session_id: session.id, ...over,
});

describe('POST /api/v1/scheduling — Buchung ist der bezahlte Lead (Phase 4, ADR-0005)', () => {
    it('requires a logged-in user — the server api key is not enough', async () => {
        const r = await api('/api/v1/scheduling', { method: 'POST', body: '{}', auth: 'key' });
        expect(r.status).toBe(401);
    });

    it('Happy Path: Ledger → Stripe → Buchung → Offenlegung, Zaehler, Events, Anbieter informiert', async () => {
        const { session } = seedBookable();
        (db.provider_discount_counter ??= []).push({ provider_key: 'test-kanzlei', cycle_start: '2020-01-01', used: 1 });
        const r = await book(standardBody(session));
        expect(r.status).toBe(201);
        expect(r.body.booking).toMatchObject({ status: 'confirmed', public_ref: refOf('test-kanzlei'), acknowledgement_version: 'booking-ack-v1', shared_fields: ['email', 'company_name', 'message'], user_discount: { pct: 10, policy_version: 1 } });
        // Offenlegung genau hier, nach der Belastung.
        expect(r.body.provider_identity.name).toBe('Testkanzlei Schmidt GmbH');

        // Ledger VOR der Buchung, pending → captured als Ereignis, Idempotency-Key = Ledger-ID.
        const ledger = db.provider_lead_ledger[0];
        expect(ledger).toMatchObject({ kind: 'charge', provider_key: 'test-kanzlei', user_id: USER_ID, booking_id: null, area_code: 'tax-vat', countries: ['DE'], computed_band: 1, standard_fee_cents: 9900, plan_code_at_charge: 'growth', discount_pct: 10, discount_sequence: 2, final_fee_cents: 8910, currency: 'USD', payment_status: 'pending', policy_version: LEAD_FEE_POLICY_VERSION });
        expect(db.provider_lead_ledger_payment_events).toEqual([expect.objectContaining({ ledger_id: ledger.id, status: 'captured', stripe_ref: 'pi_test_1' })]);
        expect(stripeMock.createPaymentIntent).toHaveBeenCalledTimes(1);
        expect(stripeMock.createPaymentIntent.mock.calls[0][0]).toMatchObject({ customerId: 'cus_test', paymentMethodId: 'pm_test_1', amountCents: 8910, currency: 'USD', idempotencyKey: ledger.id, metadata: expect.objectContaining({ ledger_id: ledger.id }) });

        // Die Buchung traegt alles, was die Checkliste beweisen will.
        const row = db.scheduling[0];
        expect(row).toMatchObject({ user_id: USER_ID, lead_charged: true, identity_revealed: true, lead_ledger_id: ledger.id, acknowledgement_version: 'booking-ack-v1', shared_fields: ['email', 'company_name', 'message'], user_discount_pct: 10, user_discount_policy_version: 1 });
        expect(row.sharing_confirmed_at).toBeTruthy();
        expect(row.price_snapshot).toMatchObject({ included: [], terms_version: null });
        expect(row.service_id).toBeTruthy();
        // Zaehler: zweiter Rabatt im Zyklus.
        expect(db.provider_discount_counter[0]).toMatchObject({ provider_key: 'test-kanzlei', cycle_start: '2020-01-01', used: 2 });
        const events = db.event_log.map((e) => e.type);
        expect(events).toEqual(expect.arrayContaining(['scheduling_confirmed', 'provider_lead_charged', 'lead.revealed']));
        const revealed = db.event_log.find((e) => e.type === 'lead.revealed');
        expect(revealed.payload).toMatchObject({ bookingId: row.id, sharedFields: ['email', 'company_name', 'message'], acknowledgementVersion: 'booking-ack-v1' });
        await new Promise((r) => setTimeout(r, 20));
        expect(db.notifications).toEqual([expect.objectContaining({ user_id: MEMBER_ID, type: 'booking_created' })]);
        expect(db.event_log.some((e) => e.type === 'email_outbox' && e.payload.kind === 'booking_provider')).toBe(true);
    });

    it('Leak-Guard: Band, Gebuehr, Ledger und Stripe stehen nicht auf dem Nutzer-Draht', async () => {
        const { session } = seedBookable();
        const r = await book(standardBody(session));
        expect(r.status).toBe(201);
        const text = JSON.stringify(r.body);
        for (const rx of [/fee/i, /band/i, /ledger/i, /stripe/i, /discount_sequence/, /pi_test/, /cus_test/, /provider_key/]) expect(text).not.toMatch(rx);
        expect(r.body.booking.user_discount).toEqual({ pct: 10, policy_version: 1 });
    });

    it('Rabattfolge: der vierte Growth-Lead zahlt voll', async () => {
        const { session } = seedBookable();
        (db.provider_discount_counter ??= []).push({ provider_key: 'test-kanzlei', cycle_start: '2020-01-01', used: 3 });
        const r = await book(standardBody(session));
        expect(r.status).toBe(201);
        expect(db.provider_lead_ledger[0]).toMatchObject({ discount_pct: 0, discount_sequence: null, final_fee_cents: 9900 });
        expect(db.provider_discount_counter[0].used).toBe(3);
    });

    it('Legal Support: keine Gebuehr, kein Stripe-Aufruf, Ledger n/a — die Offenlegung kommt trotzdem', async () => {
        seedBookable({ areas: ['legal-advisory'] });
        const session = seedSession({ categories: ['legal-advisory'] });
        const r = await book(standardBody(session));
        expect(r.status).toBe(201);
        expect(r.body.provider_identity.name).toBe('Testkanzlei Schmidt GmbH');
        expect(stripeMock.createPaymentIntent).not.toHaveBeenCalled();
        expect(db.provider_lead_ledger[0]).toMatchObject({ area_code: 'legal-advisory', standard_fee_cents: 0, final_fee_cents: 0, payment_status: 'n/a' });
        expect(db.provider_lead_ledger_payment_events ?? []).toHaveLength(0);
        expect(db.scheduling[0]).toMatchObject({ lead_charged: false, identity_revealed: true });
    });

    it('Karte abgelehnt: keine Buchung, neutraler Satz, Anbieter gesperrt und informiert', async () => {
        const { session } = seedBookable();
        stripeMock.createPaymentIntent.mockResolvedValue({ ok: false, kind: 'card', reason: 'card_declined', stripeRef: 'pi_fail', detail: 'generic_decline' });
        const r = await book(standardBody(session));
        expect(r.status).toBe(409);
        expect(r.body).toMatchObject({ errorCode: 'BOOKING_NOT_COMPLETED', reason: 'provider_billing' });
        expect(JSON.stringify(r.body)).not.toMatch(/declin|card|stripe|Testkanzlei/i);
        expect(db.scheduling ?? []).toHaveLength(0);
        expect(db.provider_discount_counter ?? []).toHaveLength(0);
        // Die Spur bleibt: Ledger pending, Ereignis failed.
        expect(db.provider_lead_ledger).toHaveLength(1);
        expect(db.provider_lead_ledger_payment_events).toEqual([expect.objectContaining({ status: 'failed', stripe_ref: 'pi_fail' })]);
        const p = db.providers[0];
        expect(p.billing_ready).toBe(false);
        expect(p.billing_block_reasons).toEqual(['payment_failed']);
        expect(p.last_payment_failure).toMatchObject({ payment_method_id: 'pm_test_1', reason: 'card_declined' });
        expect(db.event_log.map((e) => e.type)).toContain('lead_payment_failed');
        expect(db.notifications).toEqual([expect.objectContaining({ user_id: MEMBER_ID, type: 'payment_failed' })]);
        expect(db.event_log.some((e) => e.type === 'email_outbox' && e.payload.kind === 'payment_failed_provider')).toBe(true);
    });

    it('Stripe nicht erreichbar: 502, keine Buchung, billing_ready unberuehrt', async () => {
        const { session } = seedBookable();
        stripeMock.createPaymentIntent.mockResolvedValue({ ok: false, kind: 'stripe', reason: 'stripe_error', stripeRef: null, detail: 'ECONNRESET' });
        const r = await book(standardBody(session));
        expect(r.status).toBe(502);
        expect(r.body.errorCode).toBe('BILLING_ERROR');
        expect(db.scheduling ?? []).toHaveLength(0);
        expect(db.providers[0].billing_ready).toBeUndefined();
        expect(db.event_log.map((e) => e.type)).toContain('lead_payment_error');
        expect(db.notifications ?? []).toHaveLength(0);
    });

    it('Fassung fehlt oder veraltet: 400 / 409 mit der gueltigen Version, kein Ledger', async () => {
        const { session } = seedBookable();
        const r1 = await book(standardBody(session, { acknowledgement_version: undefined }));
        expect(r1.status).toBe(400);
        const r2 = await book(standardBody(session, { acknowledgement_version: 'booking-ack-v0' }));
        expect(r2.status).toBe(409);
        expect(r2.body).toMatchObject({ errorCode: 'ACKNOWLEDGEMENT_OUTDATED', current_version: 'booking-ack-v1' });
        expect(db.provider_lead_ledger ?? []).toHaveLength(0);
        expect(stripeMock.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('Slot schon vergeben: 409 vor jeder Belastung', async () => {
        const { session } = seedBookable();
        const slot = inAWeek();
        (db.scheduling ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', user_id: randomUUID(), slot_start: slot, status: 'confirmed' });
        const r = await book(standardBody(session, { slot_start: slot }));
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('SLOT_TAKEN');
        expect(stripeMock.createPaymentIntent).not.toHaveBeenCalled();
        expect(db.provider_lead_ledger ?? []).toHaveLength(0);
    });

    it('kein Zahlungsmittel hinterlegt: 409 BILLING_NOT_READY, kein Ledger, Grund am Anbieter', async () => {
        const { session } = seedBookable();
        stripeMock.getCustomerBilling.mockResolvedValue({ defaultPaymentMethodId: null, paymentMethodLabel: null, email: null, billingInfoComplete: false, delinquent: false });
        const r = await book(standardBody(session));
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('BILLING_NOT_READY');
        expect(db.provider_lead_ledger ?? []).toHaveLength(0);
        expect(db.providers[0].billing_block_reasons).toEqual(expect.arrayContaining(['no_payment_method']));
    });

    it('fremde Sitzung → 404; ohne Sitzung und ohne Bereich → 400 OPPORTUNITY_REQUIRED', async () => {
        seedBookable({ areas: ['tax-vat', 'data-privacy'] });
        const fremd = seedSession({ user_id: randomUUID() });
        const r1 = await book(standardBody(fremd));
        expect(r1.status).toBe(404);
        const r2 = await book(standardBody({ id: '' }, { session_id: undefined }));
        expect(r2.status).toBe(400);
        expect(r2.body.errorCode).toBe('OPPORTUNITY_REQUIRED');
        expect(db.provider_lead_ledger ?? []).toHaveLength(0);
    });

    it('Kompensation: scheitert die Buchung nach der Belastung, wird erstattet und protokolliert', async () => {
        const { session } = seedBookable();
        const { supabaseApi } = await import('../supabase.js');
        const realInsert = supabaseApi.insert;
        const spy = vi.spyOn(supabaseApi, 'insert').mockImplementation(async (table: string, data: any) => {
            if (table === 'scheduling') throw new Error('duplicate key value violates unique constraint "scheduling_confirmed_slot_uq" (23505)');
            return realInsert(table, data);
        });
        try {
            const r = await book(standardBody(session));
            expect(r.status).toBe(409);
            expect(r.body.errorCode).toBe('SLOT_TAKEN');
        } finally { spy.mockRestore(); }
        expect(stripeMock.refundPaymentIntent).toHaveBeenCalledWith('pi_test_1', expect.stringMatching(/:refund$/));
        expect(db.provider_lead_ledger_payment_events.map((e: any) => e.status)).toEqual(['captured', 'refunded']);
        expect(db.event_log.map((e) => e.type)).toContain('lead_charge_reversed');
        expect(db.scheduling ?? []).toHaveLength(0);
    });

    it('Neutralitaet: Essential und Global bekommen fuer dieselbe Opportunity dasselbe Band und dieselbe Standardgebuehr', async () => {
        seedPricing(); seedAcknowledgement(); seedUserDiscountPolicy();
        const a = seedProvider({ provider_key: 'ess-kanzlei', name: 'Essential Kanzlei', stripe_customer_id: 'cus_a' });
        const b = seedProvider({ provider_key: 'glo-kanzlei', name: 'Global Kanzlei', stripe_customer_id: 'cus_b' });
        seedSubscription(a.provider_key, 'essential', { current_period_start: '2020-01-01' });
        seedSubscription(b.provider_key, 'global', { current_period_start: '2020-01-01' });
        const session = seedSession();
        const r1 = await book({ public_ref: refOf('ess-kanzlei'), slot_start: inAWeek(), acknowledgement_version: 'booking-ack-v1', session_id: session.id });
        const r2 = await book({ public_ref: refOf('glo-kanzlei'), slot_start: inAWeek(), acknowledgement_version: 'booking-ack-v1', session_id: session.id });
        expect([r1.status, r2.status]).toEqual([201, 201]);
        const [l1, l2] = db.provider_lead_ledger;
        expect(l1.computed_band).toBe(l2.computed_band);
        expect(l1.standard_fee_cents).toBe(l2.standard_fee_cents);
        expect(l1.final_fee_cents).toBe(9900);           // Essential: kein Rabatt
        expect(l2.final_fee_cents).toBe(8415);           // Global: 15 % auf den ersten Lead
    });

    it('404s for a provider that is not matchable — partner_status entscheidet nichts', async () => {
        seedBookable({ partner_status: 'inactive' });
        const r = await book({ public_ref: refOf('test-kanzlei'), slot_start: inAWeek(), acknowledgement_version: 'booking-ack-v1' });
        expect(r.status).toBe(404);
    });

    it('409 mit Grund, wenn der Anbieter matchbar, aber nicht zahlungsbereit ist (§21.1)', async () => {
        seedBookable({ bookable: false });
        const r = await book({ public_ref: refOf('test-kanzlei'), slot_start: inAWeek(), acknowledgement_version: 'booking-ack-v1' });
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('BILLING_NOT_READY');
        expect(db.scheduling ?? []).toHaveLength(0);
        expect(db.provider_lead_ledger ?? []).toHaveLength(0);
    });
});

describe('GET /api/v1/acknowledgement — der Text vor der Buchung', () => {
    it('ist oeffentlich, kennt Sprache und Rabatt', async () => {
        seedAcknowledgement(); seedUserDiscountPolicy();
        const r = await api('/api/v1/acknowledgement?lang=de', { auth: 'none' });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ version: 'booking-ack-v1', language: 'de', shared_fields: ['email', 'company_name', 'message'], user_discount: { pct: 10, policy_version: 1, recurring_treatment: 'undecided' } });
        expect(r.body.body).toContain('10 %');
    });
    it('faellt auf Englisch zurueck', async () => {
        seedAcknowledgement();
        const r = await api('/api/v1/acknowledgement?lang=tr', { auth: 'none' });
        expect(r.body.language).toBe('en');
        expect(r.body.user_discount).toBeNull();
    });
});

describe('Anbieterseite: Lead-Karte, Selbstauskunft, Zahlungsbereitschaft (Phase 4)', () => {
    async function gebucht() {
        const { session } = seedBookable();
        const r = await book(standardBody(session));
        expect(r.status).toBe(201);
        return r.body.booking.id as string;
    }

    it('GET /provider/:key/bookings traegt Gebuehr, Rabatt, 10 % und die Selbstauskunft', async () => {
        const bookingId = await gebucht();
        (db.users ??= []).push({ id: USER_ID, email: 'test@complihub.test' });
        const r = await api('/api/v1/provider/test-kanzlei/bookings', { auth: 'key' });
        expect(r.status).toBe(200);
        const b = r.body.bookings.find((x: any) => x.id === bookingId);
        expect(b.lead).toEqual({ band: 1, standard_fee_cents: 9900, discount_pct: 10, discount_sequence: 1, final_fee_cents: 8910, currency: 'USD', payment_status: 'captured', fee_enabled: true });
        expect(b.user_discount_pct).toBe(10);
        expect(b.proposal).toBeNull();
        expect(b.acknowledgement_version).toBe('booking-ack-v1');
        expect(b.price_snapshot).toBeTruthy();
    });

    it('PATCH …/proposal: Upsert, Validierung, nur die eigene Buchung', async () => {
        const bookingId = await gebucht();
        const r0 = await api(`/api/v1/provider/test-kanzlei/bookings/${bookingId}/proposal`, { method: 'PATCH', auth: 'key', body: JSON.stringify({ proposal_issued: false, discount_shown: true }) });
        expect(r0.status).toBe(400);
        const r1 = await api(`/api/v1/provider/test-kanzlei/bookings/${bookingId}/proposal`, { method: 'PATCH', auth: 'key', body: JSON.stringify({ proposal_issued: true, discount_shown: true }) });
        expect(r1.status).toBe(200);
        expect(r1.body.proposal).toMatchObject({ proposal_issued: true, discount_shown: true });
        const r2 = await api(`/api/v1/provider/test-kanzlei/bookings/${bookingId}/proposal`, { method: 'PATCH', auth: 'key', body: JSON.stringify({ proposal_issued: true, discount_shown: false }) });
        expect(r2.status).toBe(200);
        expect(db.lead_proposal_reports).toHaveLength(1);
        expect(db.lead_proposal_reports[0]).toMatchObject({ booking_id: bookingId, discount_shown: false, discount_pct: 10, policy_version: 1 });
        expect(db.event_log.filter((e) => e.type === 'lead_proposal_reported')).toHaveLength(2);
        const r3 = await api(`/api/v1/provider/test-kanzlei/bookings/${randomUUID()}/proposal`, { method: 'PATCH', auth: 'key', body: JSON.stringify({ proposal_issued: true, discount_shown: true }) });
        expect(r3.status).toBe(404);
        const rb = await api('/api/v1/provider/test-kanzlei/bookings', { auth: 'key' });
        expect(rb.body.bookings[0].proposal).toMatchObject({ proposal_issued: true, discount_shown: false });
    });

    it('die Selbstauskunft ist Anbieter-eigen: ein fremder Login bekommt 404 vom Guard', async () => {
        const bookingId = await gebucht();
        const r = await api(`/api/v1/provider/test-kanzlei/bookings/${bookingId}/proposal`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ proposal_issued: true, discount_shown: true }) });
        expect(r.status).toBe(404);
    });

    it('POST /provider/:key/billing/sync setzt billing_ready aus Karte, Abo und Mandat', async () => {
        seedProvider({ stripe_customer_id: 'cus_test', billing_ready: false, billing_block_reasons: ['no_payment_method'] });
        seedPricing();
        seedSubscription('test-kanzlei', 'growth');
        (db.provider_agreement_acceptance ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', agreement_type: 'billing_authorization', version: '2026-09', superseded_at: null });
        const r = await api('/api/v1/provider/test-kanzlei/billing/sync', { method: 'POST', auth: 'key', body: '{}' });
        expect(r.status).toBe(200);
        expect(r.body.readiness).toMatchObject({ ready: true, reasons: [], payment_method: 'visa ····4242', changed: true });
        expect(db.providers[0]).toMatchObject({ billing_ready: true, billing_block_reasons: [] });
        expect(db.providers[0].billing_synced_at).toBeTruthy();
        expect(db.event_log.map((e) => e.type)).toContain('billing_readiness_changed');
    });

    it('payment_failed verschwindet nur mit einem anderen Zahlungsmittel', async () => {
        seedProvider({ stripe_customer_id: 'cus_test', billing_ready: false, billing_block_reasons: ['payment_failed'], last_payment_failure: { at: '2026-10-01T10:00:00Z', payment_method_id: 'pm_test_1', reason: 'card_declined' } });
        seedPricing(); seedSubscription('test-kanzlei', 'growth');
        (db.provider_agreement_acceptance ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', agreement_type: 'billing_authorization', version: '2026-09', superseded_at: null });
        const r1 = await api('/api/v1/provider/test-kanzlei/billing/sync', { method: 'POST', auth: 'key', body: '{}' });
        expect(r1.body.readiness).toMatchObject({ ready: false, reasons: ['payment_failed'] });
        stripeMock.getCustomerBilling.mockResolvedValue({ defaultPaymentMethodId: 'pm_test_2', paymentMethodLabel: 'mastercard ····4444', email: null, billingInfoComplete: true, delinquent: false });
        const r2 = await api('/api/v1/provider/test-kanzlei/billing/sync', { method: 'POST', auth: 'key', body: '{}' });
        expect(r2.body.readiness).toMatchObject({ ready: true, reasons: [] });
    });

    it('ohne Stripe-Schluessel antwortet der Sync 503, und der Watcher ueberspringt ihn', async () => {
        seedProvider({ stripe_customer_id: 'cus_test' });
        stripeMock.configured = false;
        const r = await api('/api/v1/provider/test-kanzlei/billing/sync', { method: 'POST', auth: 'key', body: '{}' });
        expect(r.status).toBe(503);
        const { runBillingReadinessTick } = await import('../leadCharge.js');
        expect(await runBillingReadinessTick(false)).toEqual({ synced: 0, changed: 0, errors: 0 });
    });

    it('der Watcher prueft die aeltesten zuerst und zaehlt Aenderungen', async () => {
        seedProvider({ stripe_customer_id: 'cus_test', lifecycle_status: 'active', billing_ready: false, billing_block_reasons: [] });
        seedPricing(); seedSubscription('test-kanzlei', 'growth');
        (db.provider_agreement_acceptance ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', agreement_type: 'billing_authorization', version: '2026-09', superseded_at: null });
        const { runBillingReadinessTick } = await import('../leadCharge.js');
        expect(await runBillingReadinessTick(true)).toEqual({ synced: 1, changed: 0, errors: 0 });
        expect(db.providers[0].billing_ready).toBe(false);                 // Shadow schreibt nur Marker
        expect(db.event_log.map((e) => e.type)).toContain('billing_readiness_sync_shadow');
        expect(await runBillingReadinessTick(false)).toEqual({ synced: 1, changed: 1, errors: 0 });
        expect(db.providers[0].billing_ready).toBe(true);
    });
});

describe('PATCH /api/v1/scheduling/:id (reschedule + outcome guards)', () => {
    const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

    function seedBooking(over: Record<string, any> = {}) {
        const row = {
            id: randomUUID(), provider_key: 'test-kanzlei', user_id: USER_ID,
            slot_start: future(1), slot_end: future(1), status: 'confirmed',
            lead_charged: true, identity_revealed: true, message: null, ...over,
        };
        (db.scheduling ??= []).push(row);
        return row;
    }

    it('moves a confirmed booking: same lead, +30min end, reschedule event', async () => {
        seedProvider();
        const b = seedBooking();
        const target = future(3);
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: target }) });
        expect(r.status).toBe(200);
        expect(r.body.slot_start).toBe(target);
        expect(Date.parse(r.body.slot_end) - Date.parse(target)).toBe(30 * 60 * 1000);
        expect(db.scheduling[0].slot_start).toBe(target);
        expect(db.event_log.some((e) => e.type === 'booking_rescheduled')).toBe(true);
    });

    it('400s a slot in the past', async () => {
        const b = seedBooking();
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: '2020-01-01T09:00:00.000Z' }) });
        expect(r.status).toBe(400);
    });

    it('409s when the target slot is already booked for the provider', async () => {
        const b = seedBooking();
        const clashSlot = future(5);
        seedBooking({ slot_start: clashSlot });
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: clashSlot }) });
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('SLOT_TAKEN');
    });

    it('409s rescheduling a booking that is not confirmed', async () => {
        const b = seedBooking({ status: 'completed' });
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: future(2) }) });
        expect(r.status).toBe(409);
    });

    it("403s another user's booking", async () => {
        const b = seedBooking({ user_id: randomUUID() });
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: future(2) }) });
        expect(r.status).toBe(403);
    });

    it('cancel keeps the lead fee and logs user_cancelled', async () => {
        const b = seedBooking();
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ status: 'cancelled' }) });
        expect(r.status).toBe(200);
        expect(db.scheduling[0].status).toBe('cancelled');
        expect(db.scheduling[0].lead_charged).toBe(true); // §11 P7: no refund
        expect(db.event_log.some((e) => e.type === 'user_cancelled')).toBe(true);
    });

    it('completed outcome bumps the provider quality counter', async () => {
        const p = seedProvider({ completed_count: 7 });
        const b = seedBooking();
        const r = await api(`/api/v1/scheduling/${b.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ status: 'completed' }) });
        expect(r.status).toBe(200);
        expect(p.completed_count).toBe(8);
    });
});

describe('PATCH /api/v1/scheduling/:id — Absage', () => {
    // Befund 2026-08-31: der Storno-Pfad schrieb nicht, WER abgesagt hat, und
    // der Anbieter erfuhr nichts (der Verschieben-Pfad mailte, dieser nicht).
    const seedBooking = () => {
        const id = randomUUID();
        (db.scheduling ??= []).push({
            id, provider_key: 'test-kanzlei', user_id: USER_ID,
            slot_start: new Date(Date.now() + 86400_000).toISOString(), status: 'confirmed',
        });
        return id;
    };

    it('schreibt cancelled_by und cancelled_at an die Zeile', async () => {
        seedProvider();
        const id = seedBooking();
        const r = await api(`/api/v1/scheduling/${id}`, {
            method: 'PATCH', auth: 'jwt', body: JSON.stringify({ status: 'cancelled' }),
        });
        expect(r.status).toBe(200);
        const row = db.scheduling.find((b: any) => b.id === id);
        expect(row.cancelled_by).toBe('user');
        expect(row.cancelled_at).toBeTruthy();
    });

    it('benachrichtigt den Anbieter per Mail (Outbox ohne Resend-Key)', async () => {
        seedProvider();
        const id = seedBooking();
        await api(`/api/v1/scheduling/${id}`, {
            method: 'PATCH', auth: 'jwt', body: JSON.stringify({ status: 'cancelled' }),
        });
        // Der Mailversand ist nebenlaeufig — kurz nachfassen statt sofort urteilen.
        let mail: any;
        for (let i = 0; i < 20 && !mail; i++) {
            await new Promise((r) => setTimeout(r, 25));
            mail = (db.event_log ?? []).find((e: any) =>
                e.type === 'email_outbox' && e.payload?.kind === 'cancellation_provider');
        }
        expect(mail?.payload?.to).toBe('geheim@testkanzlei.example');
    });

    it('laesst ein Outcome (completed) ohne cancelled_by durch', async () => {
        seedProvider();
        const id = seedBooking();
        db.scheduling.find((b: any) => b.id === id).slot_start = new Date(Date.now() - 3600_000).toISOString();
        await api(`/api/v1/scheduling/${id}`, {
            method: 'PATCH', auth: 'jwt', body: JSON.stringify({ status: 'completed' }),
        });
        const row = db.scheduling.find((b: any) => b.id === id);
        expect(row.status).toBe('completed');
        expect(row.cancelled_by).toBeUndefined();
    });
});

describe('POST /api/v1/reviews — nur aus einer gehaltenen Buchung', () => {
    // Bewertungen tragen 0.3 des Ranking-Scores. Frueher nahm die Route jede
    // Bewertung ohne Buchung an und stempelte sie verified — Ranking per
    // Fake-Account. Diese Tests halten die Tuer zu.
    const vergangen = () => new Date(Date.now() - 2 * 3600_000).toISOString();
    function seedBooking(over: Record<string, any> = {}) {
        const b = { id: randomUUID(), provider_key: 'test-kanzlei', user_id: USER_ID, status: 'confirmed', slot_start: vergangen(), ...over };
        (db.scheduling ??= []).push(b);
        return b;
    }

    it('speichert die Bewertung und rechnet das Aggregat nur aus buchungsgebundenen Bewertungen', async () => {
        const p = seedProvider({ rating: 5 });
        (db.reviews ??= []).push({ id: randomUUID(), booking_id: randomUUID(), provider_key: 'test-kanzlei', from_role: 'user', rating: 5 });
        // Alt-Zeile ohne Buchung: zaehlt nicht mehr
        db.reviews.push({ id: randomUUID(), booking_id: null, provider_key: 'test-kanzlei', from_role: 'user', rating: 1 });
        const b = seedBooking();
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, from_role: 'user', rating: 4, categories: ['expertise'] }),
        });
        expect(r.status).toBe(201);
        expect(p.rating).toBe(4.5);
        expect(db.event_log.some((e) => e.type === 'review_submitted')).toBe(true);
    });

    it('lehnt eine Bewertung ohne booking_id ab (400)', async () => {
        seedProvider();
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ provider_key: 'test-kanzlei', from_role: 'user', rating: 1 }),
        });
        expect(r.status).toBe(400);
        expect(db.reviews ?? []).toHaveLength(0);
    });

    it('nimmt den Anbieter aus der Buchung, nicht aus dem Body', async () => {
        seedProvider();
        seedProvider({ provider_key: 'andere-kanzlei', rating: 5 });
        const b = seedBooking();
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, provider_key: 'andere-kanzlei', from_role: 'user', rating: 1 }),
        });
        expect(r.status).toBe(201);
        expect(db.reviews[0].provider_key).toBe('test-kanzlei');
    });

    it('verbirgt fremde Buchungen als 404', async () => {
        seedProvider();
        const b = seedBooking({ user_id: randomUUID() });
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, from_role: 'user', rating: 1 }),
        });
        expect(r.status).toBe(404);
    });

    it('lehnt eine Bewertung vor dem Termin ab (409)', async () => {
        seedProvider();
        const b = seedBooking({ slot_start: new Date(Date.now() + 86_400_000).toISOString() });
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, from_role: 'user', rating: 5 }),
        });
        expect(r.status).toBe(409);
    });

    it('nimmt je Buchung und Seite genau eine Bewertung an (409 beim zweiten Mal)', async () => {
        seedProvider();
        const b = seedBooking();
        const send = () => api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, from_role: 'user', rating: 5 }),
        });
        expect((await send()).status).toBe(201);
        expect((await send()).status).toBe(409);
    });

    it('laesst den Anbieter nur als Mitglied den Lead bewerten', async () => {
        seedProvider();
        const b = seedBooking({ user_id: randomUUID() });
        const send = () => api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ booking_id: b.id, from_role: 'provider', rating: 4 }),
        });
        expect((await send()).status).toBe(404);
        (db.provider_members ??= []).push({ provider_key: 'test-kanzlei', user_id: USER_ID, role: 'owner' });
        expect((await send()).status).toBe(201);
    });
});

describe('Ownership: Anbieter-eigene Routen gehoeren ihren Mitgliedern', () => {
    // Frueher reichte irgendein Login, um fremde Profile zu aendern, fremde
    // Leads samt Nutzer-E-Mails zu lesen und fremde Stripe-Portale zu oeffnen.
    const EIGENE_ROUTEN: Array<[string, string]> = [
        ['GET', '/bookings'], ['GET', '/coverage'], ['PATCH', '/coverage'], ['PATCH', '/profile'],
        ['GET', '/invoices'], ['PATCH', '/availability'], ['POST', '/billing-portal'],
        ['POST', '/change-email'], ['GET', '/billing/preview'],
        ['GET', '/subscription'], ['POST', '/subscription'],
        // Phase 2 Onboarding
        ['GET', '/application'], ['PATCH', '/application'], ['POST', '/services'],
        ['PATCH', '/services/00000000-0000-0000-0000-000000000001'], ['DELETE', '/services/00000000-0000-0000-0000-000000000001'],
        ['PUT', '/services/00000000-0000-0000-0000-000000000001/coverage'],
        ['POST', '/evidence/upload-url'], ['POST', '/evidence/registry'], ['POST', '/evidence/00000000-0000-0000-0000-000000000001/confirm'],
        ['POST', '/agreements'], ['POST', '/submit'], ['GET', '/verification'],
        // Change-Control (§18)
        ['GET', '/changes'], ['DELETE', '/changes/00000000-0000-0000-0000-000000000001'], ['POST', '/material-event'],
    ];

    it.each(EIGENE_ROUTEN)('%s …%s: fremder Login bekommt 404 und aendert nichts', async (method, suffix) => {
        const p = seedProvider();
        const vorher = JSON.stringify(p);
        const r = await api(`/api/v1/provider/test-kanzlei${suffix}`, {
            method, auth: 'jwt',
            body: method === 'GET' ? undefined : JSON.stringify({ countries_supported: ['US'], pseudonym_label: 'x', status: 'ooo', email: 'boese@example.test' }),
        });
        expect(r.status).toBe(404);
        expect(JSON.stringify(p)).toBe(vorher);
    });

    it('laesst das Mitglied auf den eigenen Anbieter', async () => {
        seedProvider();
        (db.provider_members ??= []).push({ provider_key: 'test-kanzlei', user_id: USER_ID, role: 'owner' });
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview', { auth: 'jwt' });
        expect(r.status).toBe(200);
    });

    it('Partner-Termine tragen die Firma aus der Anfrage, ohne Anfrage null (2 V1)', async () => {
        seedProvider();
        (db.provider_members ??= []).push({ provider_key: 'test-kanzlei', user_id: USER_ID, role: 'owner' });
        const mitAnfrage = randomUUID(), ohneAnfrage = randomUUID();
        (db.users ??= []).push({ id: mitAnfrage, email: 'alex.weber@acme.example' }, { id: ohneAnfrage, email: 'info@hafenkontor.example' });
        (db.engagement_requests ??= []).push(
            { id: randomUUID(), provider_key: 'test-kanzlei', user_id: mitAnfrage, category: 'product-packaging', country: 'DE', structured_answers: { company: 'Acme GmbH' }, created_at: '2026-09-30T08:00:00Z' },
            { id: randomUUID(), provider_key: 'andere-kanzlei', user_id: ohneAnfrage, category: 'tax-vat', country: 'DE', structured_answers: { company: 'Fremde Firma' }, created_at: '2026-09-30T08:00:00Z' },
        );
        (db.scheduling ??= []).push(
            { id: randomUUID(), provider_key: 'test-kanzlei', user_id: mitAnfrage, slot_start: '2026-10-02T07:00:00Z', slot_end: '2026-10-02T07:30:00Z', status: 'confirmed' },
            { id: randomUUID(), provider_key: 'test-kanzlei', user_id: ohneAnfrage, slot_start: '2026-09-13T13:00:00Z', slot_end: '2026-09-13T13:30:00Z', status: 'no_show' },
        );
        const r = await api('/api/v1/provider/test-kanzlei/bookings', { auth: 'jwt' });
        expect(r.status).toBe(200);
        const [neu, alt] = r.body.bookings;
        expect(neu).toMatchObject({ user_company: 'Acme GmbH', category: 'product-packaging', country: 'DE', user_email: 'alex.weber@acme.example' });
        // Die Anfrage an einen ANDEREN Anbieter verraet hier nichts.
        expect(alt).toMatchObject({ user_company: null, category: null, country: null });
    });

    it('laesst das Mitglied NICHT auf einen anderen Anbieter', async () => {
        seedProvider();
        seedProvider({ provider_key: 'andere-kanzlei' });
        (db.provider_members ??= []).push({ provider_key: 'test-kanzlei', user_id: USER_ID, role: 'owner' });
        const r = await api('/api/v1/provider/andere-kanzlei/bookings', { auth: 'jwt' });
        expect(r.status).toBe(404);
    });

    it('laesst Admin-JWT und Server-Key durch', async () => {
        seedProvider();
        const admin = signJwt({ sub: randomUUID(), app_metadata: { role: 'admin' } });
        const r1 = await fetch(`${BASE}/api/v1/provider/test-kanzlei/billing/preview`, { headers: { authorization: `Bearer ${admin}` } });
        expect(r1.status).toBe(200);
        const r2 = await api('/api/v1/provider/test-kanzlei/billing/preview');
        expect(r2.status).toBe(200);
    });

    it('laesst die Nutzer-Routen eines Anbieters offen — ueber den Ref, nie ueber den Schluessel', async () => {
        seedProvider();
        const r = await api(`/api/v1/p/${refOf('test-kanzlei')}/reviews`, { auth: 'jwt' });
        expect(r.status).toBe(200);
        // Der alte Pfad mit dem Schluessel ist weg: er laege ausserhalb des
        // Guards und waere ein Rueckkanal vom Ref zum Namen.
        const alt = await api('/api/v1/provider/test-kanzlei/reviews', { auth: 'jwt' });
        expect(alt.status).toBe(404);
    });
});

describe('GET /api/v1/me/provider', () => {
    it('meldet ehrlich 404, wenn der Login keinem Anbieter gehoert', async () => {
        const r = await api('/api/v1/me/provider', { auth: 'jwt' });
        expect(r.status).toBe(404);
        expect(r.body.errorCode).toBe('NOT_A_PROVIDER');
    });

    it('liefert den eigenen Anbieter', async () => {
        seedProvider();
        (db.provider_members ??= []).push({ provider_key: 'test-kanzlei', user_id: USER_ID, role: 'owner' });
        const r = await api('/api/v1/me/provider', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.provider_key).toBe('test-kanzlei');
    });
});

describe('POST /api/v1/admin/provider/:key/member', () => {
    it('ist fuer normale Logins gesperrt', async () => {
        seedProvider();
        const r = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', auth: 'jwt', body: JSON.stringify({ user_id: USER_ID }),
        });
        expect(r.status).toBe(403);
        expect(db.provider_members ?? []).toHaveLength(0);
    });

    it('verknuepft per E-Mail und haelt die Launch-Grenze: ein Login je Anbieter', async () => {
        seedProvider();
        (db.auth_users ??= []).push({ id: USER_ID, email: 'test@complihub.test' });
        const r = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', body: JSON.stringify({ email: 'Test@Complihub.test' }),
        });
        expect(r.status).toBe(201);
        expect(db.provider_members).toEqual([expect.objectContaining({ provider_key: 'test-kanzlei', user_id: USER_ID })]);
        const zweiter = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', body: JSON.stringify({ user_id: randomUUID() }),
        });
        expect(zweiter.status).toBe(409);
    });

    // ─── Der Fehler vom 22.09.2026, festgenagelt ────────────────────────────
    // Vier Logins waren in Supabase angelegt, bestaetigt und anmeldefaehig.
    // Der Endpunkt sagte trotzdem "user_id or a known email required", weil er
    // die Adresse in `public.users` suchte — und die Profilzeile dort entsteht
    // erst, wenn jemand eine Gast-Sitzung uebernimmt. Ein Anbieter, der nie
    // den Assistenten benutzt hat, hat keine.
    //
    // Dieser Test laesst `db.users` ABSICHTLICH leer. Er faellt zurueck auf
    // 400, sobald wieder in der Profiltabelle gesucht wird.
    it('findet den Login auch ohne Profilzeile in public.users', async () => {
        seedProvider();
        (db.auth_users ??= []).push({ id: USER_ID, email: 'frisch@complihub.test' });
        expect(db.users ?? []).toHaveLength(0);
        const r = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', body: JSON.stringify({ email: 'frisch@complihub.test' }),
        });
        expect(r.status).toBe(201);
        expect(db.provider_members).toEqual([expect.objectContaining({ user_id: USER_ID })]);
    });

    it('verknuepft nichts, wenn die Adresse kein Konto hat', async () => {
        seedProvider();
        const r = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', body: JSON.stringify({ email: 'niemand@complihub.test' }),
        });
        expect(r.status).toBe(400);
        expect(db.provider_members ?? []).toHaveLength(0);
    });

    // Mehrdeutig heisst nicht "nimm den ersten". Lieber keine Mitgliedschaft
    // als eine an der falschen Person — dieselbe Regel wie im Backfill.
    it('verknuepft nichts, wenn zwei Konten dieselbe Adresse tragen', async () => {
        seedProvider();
        (db.auth_users ??= []).push(
            { id: randomUUID(), email: 'doppelt@complihub.test' },
            { id: randomUUID(), email: 'doppelt@complihub.test' },
        );
        const r = await api('/api/v1/admin/provider/test-kanzlei/member', {
            method: 'POST', body: JSON.stringify({ email: 'doppelt@complihub.test' }),
        });
        expect(r.status).toBe(400);
        expect(db.provider_members ?? []).toHaveLength(0);
    });
});

// Pricing v2 (Spec B, ADR-0003): Katalog und Baender, wie die Migration sie seedet.
function seedPricing() {
    (db.plan_catalog ??= []).push(
        { code: 'essential', version: 1, label: 'Essential', currency: 'USD', monthly_cents: 5900, annual_cents: 59000, category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0, included_blog_articles: 0, api_eligible: false, analytics_level: 'basic', effective_from: '2026-09-22' },
        { code: 'growth', version: 1, label: 'Growth', currency: 'USD', monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3, included_blog_articles: 1, api_eligible: false, analytics_level: 'enhanced', effective_from: '2026-09-22' },
        { code: 'global', version: 1, label: 'Global', currency: 'USD', monthly_cents: 18900, annual_cents: 189000, category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6, included_blog_articles: 2, api_eligible: true, analytics_level: 'advanced', effective_from: '2026-09-22' },
    );
    (db.lead_band_config ??= []).push(
        { band: 1, version: 1, label: 'Focused', fee_cents: 9900, currency: 'USD', effective_from: '2026-09-22' },
        { band: 2, version: 1, label: 'Core', fee_cents: 14900, currency: 'USD', effective_from: '2026-09-22' },
        { band: 3, version: 1, label: 'Advanced', fee_cents: 29900, currency: 'USD', effective_from: '2026-09-22' },
        { band: 4, version: 1, label: 'Strategic', fee_cents: 49900, currency: 'USD', effective_from: '2026-09-22' },
    );
    db.lead_band_rules ??= [];
    (db.lead_fee_eligibility ??= []).push({ area_code: 'legal-advisory', country_code: '*', enabled: false });
}

function seedSubscription(providerKey: string, planCode: string, over: Record<string, any> = {}) {
    const row = {
        id: randomUUID(), provider_key: providerKey, plan_code: planCode, plan_version: 1, cadence: 'monthly', status: 'active',
        current_period_start: '2026-09-01', current_period_end: '2026-10-01', started_at: '2026-09-01T00:00:00Z', ended_at: null, ...over,
    };
    (db.provider_subscriptions ??= []).push(row);
    return row;
}

describe('GET /api/v1/provider/:key/billing/preview — Pricing v2', () => {
    it('zeigt Plan, Kontingent (genutzt/offen), Ledger-Summen und Guthaben', async () => {
        seedProvider();
        seedPricing();
        seedSubscription('test-kanzlei', 'growth', { current_period_start: '2020-01-01', started_at: '2020-01-01T00:00:00Z' });
        (db.provider_discount_counter ??= []).push({ provider_key: 'test-kanzlei', cycle_start: '2020-01-01', used: 2 });
        (db.provider_lead_ledger ??= []).push(
            { id: randomUUID(), kind: 'charge', provider_key: 'test-kanzlei', standard_fee_cents: 9900, final_fee_cents: 8910, payment_status: 'captured', created_at: '2026-01-01T00:00:00Z' },
            { id: randomUUID(), kind: 'charge', provider_key: 'test-kanzlei', standard_fee_cents: 14900, final_fee_cents: 13410, payment_status: 'captured', created_at: '2026-01-02T00:00:00Z' },
            // Eine gescheiterte Belastung steht im Ledger, zaehlt aber nicht (Phase 4).
            { id: randomUUID(), kind: 'charge', provider_key: 'test-kanzlei', standard_fee_cents: 14900, final_fee_cents: 13410, payment_status: 'pending', created_at: '2026-01-02T01:00:00Z' },
            { id: randomUUID(), kind: 'credit', provider_key: 'test-kanzlei', standard_fee_cents: 0, final_fee_cents: 0, created_at: '2026-01-03T00:00:00Z' },
        );
        (db.provider_credits ??= []).push({ provider_key: 'test-kanzlei', amount_cents: 2673, currency: 'USD', reason: 'user_no_rebook_30pct' });
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview');
        expect(r.status).toBe(200);
        expect(r.body.currency).toBe('USD');
        expect(r.body.subscription).toMatchObject({ plan_code: 'growth', label: 'Growth', cadence: 'monthly', category_allowance: 5 });
        expect(r.body.discount).toMatchObject({ pct: 10, count: 3, used: 2, remaining: 1 });
        expect(r.body.leads).toEqual({ count: 2, standard_cents: 24800, discount_cents: 2480, final_cents: 22320 });
        expect(r.body.readiness).toEqual({ ready: false, reasons: [], synced_at: null });
        expect(r.body.credit_balance_cents).toBe(2673);
        // Abo-Zeile des laufenden Monats + Leads des Zyklus
        expect(r.body.lines).toHaveLength(1);
        expect(r.body.total_cents).toBe(9900 + 22320);
        expect(r.body.pricing.plans.map((p: any) => p.code)).toEqual(['essential', 'growth', 'global']);
        expect(r.body.pricing.bands.map((b: any) => b.fee_cents)).toEqual([9900, 14900, 29900, 49900]);
    });

    it('ohne Abo: kein Plan, kein Rabatt, Standardpreise sichtbar', async () => {
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview');
        expect(r.status).toBe(200);
        expect(r.body.subscription).toBeNull();
        expect(r.body.discount).toMatchObject({ pct: 0, count: 0, used: 0, remaining: 0 });
        expect(r.body.total_cents).toBe(0);
    });

    it('is not public — guests get 401', async () => {
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview', { auth: 'none' });
        expect(r.status).toBe(401);
    });
});

describe('Kommerzielle Neutralitaet: das Abo ist kein Ranking-Merkmal', () => {
    // Spec A §14, Spec B Grundsaetze, DNA §3. Zwei bis auf den Plan identische
    // Anbieter muessen denselben Score bekommen, und ein Planwechsel darf die
    // Reihenfolge nicht aendern. Wer das Abo je in den Scorer zieht, scheitert hier.
    const suche = () => api('/api/v1/search', {
        method: 'POST', auth: 'none',
        body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
    });

    it('Essential und Global: gleicher Score, gleiche Reihenfolge wie ohne Abo', async () => {
        seedPricing();
        seedProvider({ provider_key: 'ohne-abo', rating: 4.6 });
        seedProvider({ provider_key: 'kanzlei-zwei', rating: 4.6 });
        seedProvider({ provider_key: 'kanzlei-drei', rating: 4.6 });
        seedSubscription('kanzlei-zwei', 'essential');
        seedSubscription('kanzlei-drei', 'global');
        const r = await suche();
        expect(r.status).toBe(200);
        const scores = new Map(r.body.providers.map((p: any) => [p.public_ref, p.match]));
        expect(scores.get(refOf('kanzlei-drei'))).toBe(scores.get(refOf('ohne-abo')));
        expect(scores.get(refOf('kanzlei-zwei'))).toBe(scores.get(refOf('ohne-abo')));
        // Kein Feld auf dem Draht verraet den Plan.
        for (const p of r.body.providers) {
            expect(Object.keys(p).join(' ')).not.toMatch(/plan|subscription/i);
            expect(JSON.stringify(Object.values(p))).not.toMatch(/"(essential|growth|global)"/i);
        }
    });

    it('ein Planwechsel aendert die Reihenfolge nicht', async () => {
        seedPricing();
        seedProvider({ provider_key: 'a-kanzlei', rating: 4.9 });
        seedProvider({ provider_key: 'b-kanzlei', rating: 4.1 });
        seedSubscription('b-kanzlei', 'global');
        const vorher = (await suche()).body.providers.map((p: any) => p.public_ref);
        db.provider_subscriptions = [];
        seedSubscription('a-kanzlei', 'global');
        const nachher = (await suche()).body.providers.map((p: any) => p.public_ref);
        expect(nachher).toEqual(vorher);
        expect(vorher[0]).toBe(refOf('a-kanzlei'));
    });

    // Phase 3 (ADR-0004): auch `partner_status` ist kein Ranking-Merkmal mehr.
    // Was zaehlt, ist die Verifikationstiefe — unabhaengig geprueft e
    // Pflichtnachweise —, und die kann jeder Anbieter sofort erreichen.
    it('partner_status aendert weder Score noch Reihenfolge', async () => {
        seedProvider({ provider_key: 'aktiv', rating: 4.6, partner_status: 'active' });
        seedProvider({ provider_key: 'abgestuft', rating: 4.6, partner_status: 'downgraded' });
        const r = await suche();
        const byRef = new Map(r.body.providers.map((p: any) => [p.public_ref, p]));
        expect(byRef.get(refOf('abgestuft')).match).toBe(byRef.get(refOf('aktiv')).match);
        expect(byRef.get(refOf('abgestuft')).is_verified).toBe(true);
        expect(byRef.get(refOf('abgestuft')).rank_basis).toEqual(byRef.get(refOf('aktiv')).rank_basis);
    });

    it('unabhaengig geprueft e Nachweise stehen vor nur gesichteten — bei gleicher Passung und Leistung', async () => {
        seedProvider({ provider_key: 'gesichtet', rating: 4.6, depth: 'reviewed' });
        seedProvider({ provider_key: 'unabhaengig', rating: 4.6, depth: 'independent' });
        seedProvider({ provider_key: 'ohne', rating: 4.6, depth: 'none' });
        const r = await suche();
        expect(r.body.providers.map((p: any) => p.public_ref)).toEqual([refOf('unabhaengig'), refOf('gesichtet'), refOf('ohne')]);
        expect(r.body.providers.map((p: any) => p.rank_basis.verification)).toEqual(['independent', 'reviewed', 'none']);
        expect(r.body.providers.map((p: any) => p.letter)).toEqual(['A', 'B', 'C']);
    });
});

describe('Anonymitaet auf dem Draht (Phase 3, ADR-0004)', () => {
    // Was ein Nutzer vor der Buchung bekommt, darf den Anbieter nicht
    // verraten: kein Schluessel, kein Name, keine Domain, keine Kontaktdaten —
    // in keiner Antwort, auch nicht als Wert in einem Freitext.
    const VERRAETER = [/provider_key/, /pseudonym_label/, /Testkanzlei/i, /Schmidt/i, /testkanzlei-schmidt/i, /test-kanzlei/, /contact_email/, /website_url/, /geheim@/];
    const sauber = (body: unknown) => {
        const text = JSON.stringify(body);
        for (const rx of VERRAETER) expect(text).not.toMatch(rx);
    };
    // Ein Freitext, der den Anbieter nennt — Altbestand, den das Netz beim Lesen faengt.
    const mitLeck = () => seedProvider({
        depth: 'independent',
        services: ['USt-Registrierung', 'Beratung durch Testkanzlei Schmidt GmbH', { title: 'OSS-Betreuung durch Schmidt', includes: ['Quartalsmeldungen', 'Fristen — siehe testkanzlei-schmidt.example'] }],
        credentials: ['Steuerberater seit 2010, siehe testkanzlei-schmidt.example'],
        work_mode: 'Remote, Kontakt: geheim@testkanzlei.example',
        pricing_table: [{ service: 'VAT', price: 'ab 900 €', note: 'HRB 12345' }],
    });

    it('Suche', async () => {
        mitLeck();
        const r = await api('/api/v1/search', { method: 'POST', auth: 'none', body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }) });
        expect(r.status).toBe(200);
        expect(r.body.providers).toHaveLength(1);
        sauber(r.body.providers);
    });

    it('Detail — Freitexte maskiert, Register-Felder internal fehlen', async () => {
        mitLeck();
        const r = await api(`/api/v1/p/${refOf('test-kanzlei')}/detail`, { auth: 'jwt' });
        expect(r.status).toBe(200);
        sauber(r.body);
        const d = r.body.detail;
        expect(d.services[1]).toBe('Beratung durch […]');
        expect(d.services[2]).toEqual({ title: 'OSS-Betreuung durch […]', includes: ['Quartalsmeldungen', 'Fristen — siehe […]'] });
        expect(d.credentials[0]).toContain('[…]');
        expect(d.work_mode).toBe('Remote, Kontakt: […]');
        expect(d.pricing_table[0].note).toBe('[…]');
        expect(d.confirmation_rate).toBeUndefined();
        expect(d.countries_supported).toBeUndefined();
        expect(d.markets).toEqual(['DE']);
        expect(d.specializations).toEqual(['Tax and VAT']);
        expect(d.descriptor).toBe('Tax and VAT · Norddeutschland');
        // 3 V3: Codes fuer die Uebersetzung im UI, die Region roh.
        expect(d.area_codes).toEqual(['tax-vat']);
        expect(d.descriptor_region).toBe('Norddeutschland');
        expect(d.rank_basis.verification).toBe('independent');
    });

    it('Bewertungen — ein Mandant, der den Anbieter nennt, verraet ihn nicht', async () => {
        mitLeck();
        (db.reviews ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', from_role: 'user', verified: true, booking_id: randomUUID(), rating: 5, body: 'Frau Schmidt von der Testkanzlei war super.', created_at: new Date().toISOString() });
        const r = await api(`/api/v1/p/${refOf('test-kanzlei')}/reviews`, { auth: 'jwt' });
        expect(r.status).toBe(200);
        sauber(r.body);
        expect(r.body.reviews[0].body).toContain('[…]');
    });

    it('Slots und Termine vor der Offenlegung', async () => {
        mitLeck();
        const slots = await api(`/api/v1/p/${refOf('test-kanzlei')}/slots`, { auth: 'jwt' });
        expect(slots.status).toBe(200);
        sauber(slots.body);
        (db.scheduling ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', user_id: USER_ID, slot_start: new Date().toISOString(), slot_end: new Date().toISOString(), status: 'confirmed', identity_revealed: false });
        const b = await api('/api/v1/bookings', { auth: 'jwt' });
        expect(b.status).toBe(200);
        sauber(b.body);
        expect(b.body.bookings[0].provider_name).toBe('Verified Provider');
        expect(b.body.bookings[0].provider_descriptor).toBe('Tax and VAT · Norddeutschland');
        expect(b.body.bookings[0].provider_area_codes).toEqual(['tax-vat']);
        expect(b.body.bookings[0].public_ref).toBe(refOf('test-kanzlei'));
    });

    it('Termine nach der Offenlegung tragen den Namen, aber weiter keinen Schluessel', async () => {
        mitLeck();
        (db.scheduling ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', user_id: USER_ID, slot_start: new Date().toISOString(), slot_end: new Date().toISOString(), status: 'confirmed', identity_revealed: true });
        const b = await api('/api/v1/bookings', { auth: 'jwt' });
        expect(b.body.bookings[0].provider_name).toBe('Testkanzlei Schmidt GmbH');
        expect(b.body.bookings[0].provider_website).toBe('https://testkanzlei-schmidt.example');
        expect(JSON.stringify(b.body)).not.toMatch(/provider_key|test-kanzlei/);
    });

    it('ein unbekannter oder sprechender Ref ist 404', async () => {
        seedProvider();
        expect((await api('/api/v1/p/000000000000/detail', { auth: 'jwt' })).status).toBe(404);
        expect((await api('/api/v1/p/test-kanzlei/detail', { auth: 'jwt' })).status).toBe(404);
        expect((await api('/api/v1/provider/test-kanzlei/detail', { auth: 'jwt' })).status).toBe(404);
    });

    it('Nachrichten an Nutzer tragen den Ref, nicht den Schluessel', async () => {
        seedProvider();
        (db.scheduling ??= []).push({ id: 'b1', provider_key: 'test-kanzlei', user_id: USER_ID, slot_start: new Date(Date.now() + 86_400_000).toISOString(), slot_end: new Date(Date.now() + 90_000_000).toISOString(), status: 'confirmed', identity_revealed: true });
        const r = await api('/api/v1/scheduling/b1', { method: 'PATCH', auth: 'key', body: JSON.stringify({ status: 'cancelled' }) });
        expect(r.status).toBe(200);
        const n = (db.notifications ?? []).find((x: any) => x.type === 'booking_cancelled');
        expect(n).toBeDefined();
        expect(n.payload.providerRef).toBe(refOf('test-kanzlei'));
        expect(n.payload.providerKey).toBeUndefined();
    });
});

describe('Identitaets-Scan an den Schreibrouten (Phase 3)', () => {
    // Blockieren und benennen (Nutzer-Entscheidung 2026-09-27): ein Freitext
    // mit Firmenname, Domain oder Rechtsform wird nicht gespeichert; die
    // Antwort sagt, was wo gefunden wurde — ohne Verstoss-Sprache.
    it('PATCH /profile: Rechtsform in der Region → 422 mit Fundstelle', async () => {
        seedProvider();
        const r = await api('/api/v1/provider/test-kanzlei/profile', { method: 'PATCH', auth: 'key', body: JSON.stringify({ region: 'Hamburg, Mustermann GmbH' }) });
        expect(r.status).toBe(422);
        expect(r.body.errorCode).toBe('IDENTITY_IN_TEXT');
        expect(r.body.findings[0]).toMatchObject({ field: 'region', type: 'legal_form', match: 'Mustermann GmbH' });
        expect(r.body.message).not.toMatch(/violat|verstoss|verstoß/i);
        expect(db.providers[0].region).toBe('Norddeutschland');
    });

    it('PATCH /profile: Domain in der Preistabelle → 422; der eigene Name → own_name', async () => {
        seedProvider();
        const r = await api('/api/v1/provider/test-kanzlei/profile', { method: 'PATCH', auth: 'key', body: JSON.stringify({ pricing_table: [{ service: 'VAT', note: 'siehe beispiel.de' }] }) });
        expect(r.status).toBe(422);
        expect(r.body.findings[0].type).toBe('domain');
        const r2 = await api('/api/v1/provider/test-kanzlei/profile', { method: 'PATCH', auth: 'key', body: JSON.stringify({ region: 'Schmidt-Land' }) });
        expect(r2.status).toBe(422);
        expect(r2.body.findings[0].type).toBe('own_name');
    });

    it('PATCH /profile: sauberer Text → 200; pseudonym_label wird still ignoriert', async () => {
        seedProvider();
        const r = await api('/api/v1/provider/test-kanzlei/profile', { method: 'PATCH', auth: 'key', body: JSON.stringify({ region: 'Norditalien', pseudonym_label: 'Testkanzlei Schmidt' }) });
        expect(r.status).toBe(200);
        expect(r.body.updated).toContain('region');
        expect(r.body.updated).not.toContain('pseudonym_label');
        expect(db.providers[0].pseudonym_label).toBe('Verifizierte Steuerkanzlei · Norddeutschland');
    });
});

describe('POST /api/v1/admin/watchers/tick', () => {
    it('runs a shadow tick against an empty store without erroring', async () => {
        const r = await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}', auth: 'key' });
        expect(r.status).toBe(200);
        expect(r.body.summary ?? r.body).toBeTruthy();
    });
});

describe('Zurueckziehen und Erinnern gehoeren dem Ersteller', () => {
    const seedEngagement = (over: Record<string, any> = {}) => {
        const row = { id: randomUUID(), user_id: USER_ID, provider_key: 'test-kanzlei', country: 'DE', category: 'vat', status: 'created', created_at: new Date().toISOString(), ...over };
        (db.engagement_requests ??= []).push(row);
        return row;
    };

    it('zieht eine ABGELAUFENE Anfrage zurueck — sie war vorher eine Sackgasse', async () => {
        const e = seedEngagement({ status: 'expired' });
        const r = await api(`/api/v1/engagement/${e.id}/withdraw`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(r.status).toBe(200);
        expect(r.body.status).toBe('withdrawn');
    });

    it('weist Zurueckziehen nach der Bestaetigung weiter ab (409)', async () => {
        const e = seedEngagement({ status: 'confirmed' });
        const r = await api(`/api/v1/engagement/${e.id}/withdraw`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(r.status).toBe(409);
    });

    it('verbirgt fremde Anfragen als 404 — zurueckziehen wie erinnern', async () => {
        const fremd = seedEngagement({ user_id: randomUUID() });
        const w = await api(`/api/v1/engagement/${fremd.id}/withdraw`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(w.status).toBe(404);
        const rm = await api(`/api/v1/engagement/${fremd.id}/remind`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(rm.status).toBe(404);
        // Die Zeile ist unveraendert — nichts wurde zurueckgezogen.
        expect(db.engagement_requests.find((x: any) => x.id === fremd.id).status).toBe('created');
    });
});

describe('Pflicht-Status je Sitzung', () => {
    // Zwei Achsen, die nie verschmelzen duerfen: die GELTUNG kommt aus der
    // Engine, die BEARBEITUNG vom Nutzer. Diese Endpunkte decken die zweite ab.
    const seedSession = () => {
        const row = { id: randomUUID(), user_id: USER_ID, country: 'DE', categories: ['vat'], answers: {}, status: 'active' };
        (db.sessions ??= []).push(row);
        return row.id;
    };

    it('liefert anfangs nichts — was fehlt, ist offen', async () => {
        const id = seedSession();
        const r = await api(`/api/v1/session/${id}/obligations`);
        expect(r.status).toBe(200);
        expect(r.body.items).toEqual([]);
    });

    it('setzt einen Zustand und vergibt das Erledigt-Datum serverseitig', async () => {
        const id = seedSession();
        const put = await api(`/api/v1/session/${id}/obligations/tax-vat-registration`, {
            method: 'PUT', body: JSON.stringify({ status: 'done' }),
        });
        expect(put.status).toBe(200);
        expect(put.body.done_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        const list = await api(`/api/v1/session/${id}/obligations`);
        expect(list.body.items).toHaveLength(1);
        expect(list.body.items[0]).toMatchObject({ obligation_id: 'tax-vat-registration', status: 'done' });
    });

    it('ueberschreibt denselben Schluessel statt zu doppeln', async () => {
        const id = seedSession();
        await api(`/api/v1/session/${id}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) });
        await api(`/api/v1/session/${id}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
        const list = await api(`/api/v1/session/${id}/obligations`);
        expect(list.body.items).toHaveLength(1);
        expect(list.body.items[0].status).toBe('done');
    });

    it('"open" loescht die Zeile — der Ausgangszustand braucht keinen Eintrag', async () => {
        const id = seedSession();
        await api(`/api/v1/session/${id}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
        const back = await api(`/api/v1/session/${id}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'open' }) });
        expect(back.status).toBe(200);
        const list = await api(`/api/v1/session/${id}/obligations`);
        expect(list.body.items).toEqual([]);
    });

    it('weist unbekannte Zustaende ab', async () => {
        const id = seedSession();
        const r = await api(`/api/v1/session/${id}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'erledigt-ish' }) });
        expect(r.status).toBe(400);
    });

    it('antwortet 404 fuer eine Sitzung, die es nicht gibt', async () => {
        const r = await api(`/api/v1/session/${randomUUID()}/obligations/prod-epr`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
        expect(r.status).toBe(404);
    });

    // Empfaengerbindung (gleiches Muster wie Anfragen/Benachrichtigungen):
    // der JWT-Nutzer sieht und setzt nur Staende der EIGENEN Sitzungen.
    it('liest die eigene Sitzung per JWT', async () => {
        const id = seedSession();
        const r = await api(`/api/v1/session/${id}/obligations`, { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.items).toEqual([]);
    });

    it('verbirgt fremde Sitzungen als 404 — lesen wie schreiben', async () => {
        const fremd = { id: randomUUID(), user_id: randomUUID(), country: 'DE', categories: ['vat'], answers: {}, status: 'active' };
        (db.sessions ??= []).push(fremd);
        const read = await api(`/api/v1/session/${fremd.id}/obligations`, { auth: 'jwt' });
        expect(read.status).toBe(404);
        const write = await api(`/api/v1/session/${fremd.id}/obligations/prod-epr`, {
            method: 'PUT', auth: 'jwt', body: JSON.stringify({ status: 'done' }),
        });
        expect(write.status).toBe(404);
    });
});

describe('PATCH /api/v1/session/:id — Antworten aktualisieren (Canvas-Wahl 2B)', () => {
    const seed = (over: Record<string, any> = {}) => {
        const row = { id: randomUUID(), user_id: USER_ID, country: 'DE', markets: ['DE'], categories: ['tax-vat'], answers: { country: 'DE', note: 'alt' }, label: 'Shop', status: 'active', ...over };
        (db.sessions ??= []).push(row);
        return row;
    };

    it('ersetzt die Antworten und zieht country/markets/categories nach', async () => {
        const row = seed();
        const answers = { country: 'IT', markets: ['IT', 'ES'], categories: ['tax-vat', 'data-privacy'], note: 'neu' };
        const r = await api(`/api/v1/session/${row.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ answers }) });
        expect(r.status).toBe(200);
        const saved = db.sessions.find((x: any) => x.id === row.id);
        expect(saved.answers).toEqual(answers);
        expect(saved.country).toBe('IT');
        expect(saved.markets).toEqual(['IT', 'ES']);
        expect(saved.categories).toEqual(['tax-vat', 'data-privacy']);
        expect(saved.label).toBe('Shop');
    });

    it('nimmt nur Strings in markets/categories', async () => {
        const row = seed();
        const r = await api(`/api/v1/session/${row.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ answers: { markets: ['DE', 7, null], categories: [{ x: 1 }, 'tax-vat'] } }) });
        expect(r.status).toBe(200);
        const saved = db.sessions.find((x: any) => x.id === row.id);
        expect(saved.markets).toEqual(['DE']);
        expect(saved.categories).toEqual(['tax-vat']);
    });

    it('verbirgt fremde Sitzungen als 404 — auch fuer label/status', async () => {
        const fremd = seed({ user_id: randomUUID() });
        const r = await api(`/api/v1/session/${fremd.id}`, { method: 'PATCH', auth: 'jwt', body: JSON.stringify({ label: 'geklaut' }) });
        expect(r.status).toBe(404);
        expect(db.sessions.find((x: any) => x.id === fremd.id).label).toBe('Shop');
    });

    it('Server-Key behaelt die Betriebssicht', async () => {
        const fremd = seed({ user_id: randomUUID() });
        const r = await api(`/api/v1/session/${fremd.id}`, { method: 'PATCH', auth: 'key', body: JSON.stringify({ status: 'archived' }) });
        expect(r.status).toBe(200);
        expect(db.sessions.find((x: any) => x.id === fremd.id).status).toBe('archived');
    });
});

describe('POST /api/v1/session/:id/duplicate — Label vom Frontend, Eigentuemer-Bindung', () => {
    const seed = (over: Record<string, any> = {}) => {
        const row = { id: randomUUID(), user_id: USER_ID, country: 'DE', markets: ['DE'], categories: ['tax-vat'], answers: { country: 'DE' }, label: 'Shop', status: 'active', ...over };
        (db.sessions ??= []).push(row);
        return row;
    };

    it('uebernimmt das mitgeschickte Label', async () => {
        const row = seed();
        const r = await api(`/api/v1/session/${row.id}/duplicate`, { method: 'POST', auth: 'jwt', body: JSON.stringify({ label: 'Kopie von Shop' }) });
        expect(r.status).toBe(201);
        const copy = db.sessions.find((x: any) => x.id === r.body.id);
        expect(copy.label).toBe('Kopie von Shop');
        expect(copy.answers).toEqual({ country: 'DE' });
        expect(copy.user_id).toBe(USER_ID);
    });

    it('faellt ohne Label auf "Copy of …" zurueck', async () => {
        const row = seed();
        const r = await api(`/api/v1/session/${row.id}/duplicate`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(r.status).toBe(201);
        expect(db.sessions.find((x: any) => x.id === r.body.id).label).toBe('Copy of Shop');
    });

    it('verbirgt fremde Sitzungen als 404', async () => {
        const fremd = seed({ user_id: randomUUID() });
        const before = db.sessions.length;
        const r = await api(`/api/v1/session/${fremd.id}/duplicate`, { method: 'POST', auth: 'jwt', body: '{}' });
        expect(r.status).toBe(404);
        expect(db.sessions.length).toBe(before);
    });
});

describe('GET /api/v1/sessions — welcher Ausweis zaehlt', () => {
    // Der guest_key lebt im localStorage EINES Browsers. Wer sich am Telefon
    // anmeldet, saehe damit eine leere Liste, obwohl die Sitzungen laengst
    // seinem Konto gehoeren. Deshalb schlaegt der JWT den guest_key.
    const seed = (over: Record<string, any> = {}) => {
        const row = {
            id: randomUUID(), country: 'DE', markets: [], categories: ['vat'],
            answers: {}, status: 'active', created_at: new Date().toISOString(),
            user_id: null, guest_key: null, ...over,
        };
        (db.sessions ??= []).push(row);
        return row.id;
    };

    it('liefert angemeldet die eigenen Sitzungen — auch ohne guest_key', async () => {
        const mine = seed({ user_id: USER_ID });
        seed({ guest_key: 'fremder-schluessel-12345678' });
        const r = await api('/api/v1/sessions', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.sessions.map((s: any) => s.id)).toEqual([mine]);
    });

    it('ignoriert angemeldet einen mitgeschickten fremden guest_key', async () => {
        const mine = seed({ user_id: USER_ID });
        seed({ guest_key: 'fremder-schluessel-12345678' });
        const r = await api('/api/v1/sessions?guest_key=fremder-schluessel-12345678', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.sessions.map((s: any) => s.id)).toEqual([mine]);
    });

    it('liefert als Gast weiterhin ueber den guest_key', async () => {
        const gast = seed({ guest_key: 'gast-schluessel-abcdefgh' });
        seed({ user_id: USER_ID });
        const r = await api('/api/v1/sessions?guest_key=gast-schluessel-abcdefgh', { auth: 'none' });
        expect(r.status).toBe(200);
        expect(r.body.sessions.map((s: any) => s.id)).toEqual([gast]);
    });

    it('verlangt ohne Anmeldung und ohne guest_key eine Angabe', async () => {
        const r = await api('/api/v1/sessions', { auth: 'none' });
        expect(r.status).toBe(400);
    });
});

describe('GET /api/v1/dashboard', () => {
    // Die Kennzahlen des Arbeitsbereichs. Bis 2026-08-30 standen sie fest im
    // Frontend; ein frisches Konto sah dieselbe erfundene Lage wie jedes
    // andere. Diese Tests halten fest, dass sie aus echten Zeilen kommen.
    const seedSession = (over: Record<string, any> = {}) => {
        const row = {
            id: randomUUID(), user_id: USER_ID, country: 'DE', markets: ['FR'],
            categories: ['tax-vat'], answers: {}, status: 'active',
            created_at: new Date().toISOString(), label: null, ...over,
        };
        (db.sessions ??= []).push(row);
        return row.id;
    };

    it('verlangt eine Anmeldung — der Server-Key genuegt nicht', async () => {
        const r = await api('/api/v1/dashboard', { auth: 'key' });
        expect(r.status).toBe(401);
    });

    it('meldet fuer ein frisches Konto ehrlich null', async () => {
        const r = await api('/api/v1/dashboard', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.sessions.total).toBe(0);
        expect(r.body.sessions.items).toEqual([]);
        expect(r.body.obligations.open).toBe(0);
    });

    it('zaehlt nur eigene Sitzungen, keine fremden', async () => {
        seedSession();
        seedSession({ user_id: randomUUID() });
        seedSession({ user_id: null, guest_key: 'fremd-abcdefgh' });
        const r = await api('/api/v1/dashboard', { auth: 'jwt' });
        expect(r.body.sessions.total).toBe(1);
    });

    it('laesst archivierte Sitzungen aus', async () => {
        seedSession();
        seedSession({ status: 'archived' });
        const r = await api('/api/v1/dashboard', { auth: 'jwt' });
        expect(r.body.sessions.total).toBe(1);
    });

    it('rechnet erledigte Pflichten aus den offenen heraus', async () => {
        const id = seedSession();
        const vorher = (await api('/api/v1/dashboard', { auth: 'jwt' })).body;
        const eine = vorher.sessions.items[0];
        if (eine.total === 0) return;   // ohne Laenderprofil gibt es nichts abzuziehen

        // Eine beliebige Pflicht dieser Sitzung abhaken.
        const liste = await api(`/api/v1/session/${id}/obligations`);
        expect(liste.status).toBe(200);
        const irgendeine = 'tax-vat-registration';
        (db.session_obligation_status ??= []).push({
            session_id: id, obligation_id: irgendeine, status: 'done',
            done_at: '2026-08-30',
        });

        const nachher = (await api('/api/v1/dashboard', { auth: 'jwt' })).body;
        expect(nachher.obligations.open).toBeLessThanOrEqual(vorher.obligations.open);
    });

    it('summiert die Schweregrade auf die Zahl der offenen Pflichten', async () => {
        seedSession();
        const r = await api('/api/v1/dashboard', { auth: 'jwt' });
        const summe = Object.values(r.body.obligations.by_severity as Record<string, number>)
            .reduce((a, b) => a + b, 0);
        expect(summe).toBe(r.body.obligations.open);
    });

    it('liefert je Sitzung die Maerkte und die offenen Pflichten nach Stufe', async () => {
        // Dashboard S2/S3 (2026-09-27): ein Kaestchen je Pflicht, nach Risiko
        // gefaerbt — die Stufen muessen sich zu "open" der Sitzung summieren.
        seedSession({ country: 'DE', markets: ['FR', 'DE'] });
        const r = await api('/api/v1/dashboard', { auth: 'jwt' });
        const s = r.body.sessions.items[0];
        expect(s.markets).toEqual(['DE', 'FR']);
        const summe = Object.values(s.by_severity as Record<string, number>).reduce((a, b) => a + b, 0);
        expect(summe).toBe(s.open);
    });
});


describe('GET /api/v1/domain/:slug — Bereichs-Querschnitt', () => {
    // Canvas "Bereichsseite" (2026-09-13): ein Bereich ist der Querschnitt
    // ueber alle Sitzungen des Nutzers. Der Endpunkt liefert je aktiver
    // Sitzung die Pflichten DIESES Bereichs, nichts aus anderen Bereichen.
    const seedSession = (over: Record<string, any> = {}) => {
        const row = {
            id: randomUUID(), user_id: USER_ID, country: 'DE', markets: ['FR'],
            categories: ['tax-vat'], answers: {}, status: 'active',
            created_at: new Date().toISOString(), label: 'Testlauf', ...over,
        };
        (db.sessions ??= []).push(row);
        return row.id;
    };

    it('verlangt eine Anmeldung — der Server-Key genuegt nicht', async () => {
        const r = await api('/api/v1/domain/tax-vat', { auth: 'key' });
        expect(r.status).toBe(401);
    });

    it('kennt nur die acht Bereiche', async () => {
        const r = await api('/api/v1/domain/full-support', { auth: 'jwt' });
        expect(r.status).toBe(404);
    });

    it('meldet fuer ein frisches Konto ehrlich nichts', async () => {
        const r = await api('/api/v1/domain/tax-vat', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.sessions).toEqual([]);
        expect(r.body.open).toBe(0);
        expect(r.body.archived).toBe(0);
        expect(r.body.next_due_days).toBeNull();
    });

    it('liefert nur Pflichten dieses Bereichs, nur aus eigenen aktiven Sitzungen', async () => {
        seedSession({ categories: ['tax-vat', 'data-privacy'] });
        seedSession({ user_id: randomUUID() });
        seedSession({ status: 'archived' });
        const r = await api('/api/v1/domain/tax-vat', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.sessions).toHaveLength(1);
        expect(r.body.archived).toBe(1);
        const pflichten = r.body.sessions[0].obligations as Array<{ id: string; status: string; markets: string[] }>;
        // Steuern liefert die Engine fuer DE immer; Datenschutz darf hier nicht auftauchen.
        expect(pflichten.length).toBeGreaterThan(0);
        expect(pflichten.every((o) => o.id.startsWith('tax-'))).toBe(true);
        expect(pflichten.every((o) => o.status === 'open')).toBe(true);
        expect(r.body.markets).toEqual(expect.arrayContaining(['DE', 'FR']));
    });

    it('nimmt erledigte Pflichten aus der Zahl der offenen heraus, behaelt sie aber mit Stand', async () => {
        const id = seedSession();
        const vorher = (await api('/api/v1/domain/tax-vat', { auth: 'jwt' })).body;
        (db.session_obligation_status ??= []).push({
            session_id: id, obligation_id: 'tax-vat-registration', status: 'done', done_at: '2026-09-01',
        });
        const nachher = (await api('/api/v1/domain/tax-vat', { auth: 'jwt' })).body;
        expect(nachher.open).toBe(vorher.open - 1);
        const eintrag = nachher.sessions[0].obligations.find((o: { id: string }) => o.id === 'tax-vat-registration');
        expect(eintrag?.status).toBe('done');
    });
});

describe('GET /api/v1/notifications', () => {
    // Bis 2026-08-31 lieferte diese Route `event_log` mit LEEREM Filter: jedes
    // angemeldete Konto bekam alle Zeilen aller Nutzer, samt der Mailadressen
    // in den `email_sent`-Nutzlasten. Die Tests hier halten fest, dass die
    // Antwort jetzt an den Aufrufer gebunden ist.
    const seedNotification = (over: Record<string, any> = {}) => {
        const row = {
            id: randomUUID(), user_id: USER_ID, type: 'provider_replied',
            subject: 'engagement', subject_id: randomUUID(), payload: {},
            created_at: new Date().toISOString(), read_at: null, ...over,
        };
        (db.notifications ??= []).push(row);
        return row;
    };

    it('meldet fuer ein frisches Konto ein leeres Fach', async () => {
        const r = await api('/api/v1/notifications', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.notifications).toEqual([]);
        expect(r.body.unread).toBe(0);
    });

    it('zeigt eigene Zeilen und keine fremden', async () => {
        seedNotification();
        seedNotification({ user_id: randomUUID() });
        seedNotification({ user_id: randomUUID() });
        const r = await api('/api/v1/notifications', { auth: 'jwt' });
        expect(r.body.notifications).toHaveLength(1);
        expect(r.body.unread).toBe(1);
    });

    it('gibt ohne Anmeldung nichts heraus — auch nicht dem Server-Key', async () => {
        seedNotification();
        const r = await api('/api/v1/notifications', { auth: 'key' });
        expect(r.body.notifications ?? []).toEqual([]);
    });

    it('markiert eine einzelne Zeile als gelesen', async () => {
        const n = seedNotification();
        const r = await api('/api/v1/notifications/read', {
            method: 'POST', auth: 'jwt', body: JSON.stringify({ id: n.id }),
        });
        expect(r.status).toBe(200);
        expect(r.body.marked).toBe(1);
        expect((await api('/api/v1/notifications', { auth: 'jwt' })).body.unread).toBe(0);
    });

    it('markiert keine fremde Zeile, auch wenn die id stimmt', async () => {
        const fremd = seedNotification({ user_id: randomUUID() });
        const r = await api('/api/v1/notifications/read', {
            method: 'POST', auth: 'jwt', body: JSON.stringify({ id: fremd.id }),
        });
        expect(r.body.marked).toBe(0);
        expect(db.notifications.find((n: any) => n.id === fremd.id).read_at).toBeNull();
    });

    it('laesst beim Alles-Markieren bereits gelesene Zeitpunkte stehen', async () => {
        const alt = seedNotification({ read_at: '2026-08-01T00:00:00.000Z' });
        seedNotification();
        const r = await api('/api/v1/notifications/read', {
            method: 'POST', auth: 'jwt', body: JSON.stringify({ all: true }),
        });
        expect(r.body.marked).toBe(1);
        expect(db.notifications.find((n: any) => n.id === alt.id).read_at).toBe('2026-08-01T00:00:00.000Z');
    });
});

describe('Benachrichtigungen entstehen aus Vorgaengen', () => {
    // Weg A: die Quelle zuerst. Diese Tests halten die Schreibstellen fest —
    // wer eine Benachrichtigung bekommt, und wer ausdruecklich keine.
    const seedEngagement = (over: Record<string, any> = {}) => {
        const row = {
            id: randomUUID(), user_id: USER_ID, provider_key: 'test-kanzlei',
            country: 'DE', category: 'tax-vat', structured_answers: {},
            message: 'Bitte um Angebot', status: 'delivered',
            created_at: new Date().toISOString(), ...over,
        };
        (db.engagement_requests ??= []).push(row);
        return row;
    };
    const seedToken = (engagementId: string, action: string) => {
        const token = randomUUID();
        (db.magic_link_tokens ??= []).push({
            id: randomUUID(), engagement_id: engagementId, action,
            token_hash: createHash('sha256').update(token).digest('hex'),
            expires_at: new Date(Date.now() + 3600_000).toISOString(), used_at: null,
        });
        return token;
    };

    it('benachrichtigt den Anfragenden, wenn der Anbieter zusagt', async () => {
        const eng = seedEngagement();
        const token = seedToken(eng.id, 'confirm');
        const r = await api('/api/v1/provider/confirm', {
            method: 'POST', auth: 'none', body: JSON.stringify({ engagementId: eng.id, token }),
        });
        expect(r.status).toBe(200);
        const meine = (db.notifications ?? []).filter((n: any) => n.user_id === USER_ID);
        expect(meine).toHaveLength(1);
        expect(meine[0].type).toBe('provider_confirmed');
        expect(meine[0].subject_id).toBe(eng.id);
    });

    it('benachrichtigt niemanden, wenn die Anfrage von einem Gast stammt', async () => {
        const eng = seedEngagement({ user_id: null });
        const token = seedToken(eng.id, 'decline');
        await api('/api/v1/provider/decline', {
            method: 'POST', auth: 'none', body: JSON.stringify({ engagementId: eng.id, token }),
        });
        expect(db.notifications ?? []).toEqual([]);
    });

    it('traegt keine Mailadresse in die Nutzlast — auch wenn eine danebensteht', async () => {
        const eng = seedEngagement({
            structured_answers: { requester_email: 'kunde@example.com', company: 'Muster GmbH' },
        });
        const token = seedToken(eng.id, 'confirm');
        await api('/api/v1/provider/confirm', {
            method: 'POST', auth: 'none', body: JSON.stringify({ engagementId: eng.id, token }),
        });
        const alles = JSON.stringify(db.notifications ?? []);
        expect(alles).not.toContain('kunde@example.com');
        expect(alles).not.toContain('Muster GmbH');
    });

    it('meldet die Antwort des Anbieters, aber nicht die eigene', async () => {
        const eng = seedEngagement();
        await api(`/api/v1/engagement/${eng.id}/message`, {
            method: 'POST', body: JSON.stringify({ author: 'user', body: 'Nachfrage von mir' }),
        });
        expect(db.notifications ?? []).toEqual([]);
        await api(`/api/v1/engagement/${eng.id}/message`, {
            method: 'POST', body: JSON.stringify({ author: 'provider', body: 'Antwort' }),
        });
        expect((db.notifications ?? []).map((n: any) => n.type)).toEqual(['engagement_message']);
    });

    it('schweigt, wenn der Nutzer seinen eigenen Termin verschiebt', async () => {
        seedProvider();
        const bookingId = randomUUID();
        (db.scheduling ??= []).push({
            id: bookingId, provider_key: 'test-kanzlei', user_id: USER_ID,
            slot_start: new Date(Date.now() + 86400_000).toISOString(), status: 'confirmed',
        });
        const neu = new Date(Date.now() + 172800_000).toISOString();
        const r = await api(`/api/v1/scheduling/${bookingId}`, {
            method: 'PATCH', auth: 'jwt', body: JSON.stringify({ slot_start: neu }),
        });
        expect(r.status).toBe(200);
        expect(db.notifications ?? []).toEqual([]);
    });
});


describe('Anfragen gehoeren ihrem Ersteller', () => {
    // Bis 2026-08-31 nahm POST /engagement die user_id aus dem BODY (und das
    // Frontend schickte keine — alle UI-Anfragen gehoerten niemandem), und
    // GET /requests lieferte mit leerem Filter die Anfragen ALLER Nutzer,
    // samt requester_email und Firmenname. Diese Tests pinnen beides fest.
    const anlegen = (body: Record<string, unknown> = {}) =>
        api('/api/v1/engagement', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ provider_key: 'test-kanzlei', country: 'DE', category: 'tax-vat', message: 'Bitte um Angebot', ...body }),
        });

    it('schreibt den Ersteller aus dem Token — ein fremdes user_id im Body zaehlt nicht', async () => {
        seedProvider();
        const fremd = randomUUID();
        const r = await anlegen({ user_id: fremd });
        expect([200, 201]).toContain(r.status);
        const row = (db.engagement_requests ?? []).find((e: any) => e.id === r.body.id);
        expect(row.user_id).toBe(USER_ID);
        expect(row.user_id).not.toBe(fremd);
    });

    it('listet nur die eigenen Anfragen, keine fremden', async () => {
        (db.engagement_requests ??= []).push(
            { id: randomUUID(), user_id: USER_ID, provider_key: 'test-kanzlei', country: 'DE', category: 'tax-vat', structured_answers: {}, status: 'created', created_at: new Date().toISOString() },
            { id: randomUUID(), user_id: randomUUID(), provider_key: 'test-kanzlei', country: 'DE', category: 'tax-vat', structured_answers: { requester_email: 'fremd@example.com' }, status: 'created', created_at: new Date().toISOString() },
        );
        const r = await api('/api/v1/requests', { auth: 'jwt' });
        expect(r.status).toBe(200);
        expect(r.body.requests).toHaveLength(1);
        expect(JSON.stringify(r.body)).not.toContain('fremd@example.com');
    });

    it('laesst den Server-Schluessel weiter alles sehen (Betriebssicht)', async () => {
        (db.engagement_requests ??= []).push(
            { id: randomUUID(), user_id: USER_ID, provider_key: 'test-kanzlei', country: 'DE', category: 'tax-vat', structured_answers: {}, status: 'created', created_at: new Date().toISOString() },
            { id: randomUUID(), user_id: randomUUID(), provider_key: 'test-kanzlei', country: 'DE', category: 'tax-vat', structured_answers: {}, status: 'created', created_at: new Date().toISOString() },
        );
        const r = await api('/api/v1/requests', { auth: 'key' });
        expect(r.body.requests).toHaveLength(2);
    });
});

// ─── Phase 2: Onboarding und Verifikation ────────────────────────────────────

function seedTaxonomy() {
    db.service_categories = [];
    db.service_categories.push(
        { code: 'tax-vat', parent_code: null, label_en: 'Tax and VAT', active: true },
        { code: 'tax-vat.returns', parent_code: 'tax-vat', label_en: 'VAT returns', active: true },
        { code: 'data-privacy', parent_code: null, label_en: 'Data and Privacy', active: true },
        { code: 'legal-advisory', parent_code: null, label_en: 'Legal Support', active: true },
    );
}

/** Ein Anbieter im Entwurf mit eigenem Login — der Normalfall der Bewerbungsstrecke. */
function seedApplicant(over: Record<string, any> = {}) {
    const p = seedProvider({ provider_key: 'neue-kanzlei', name: 'Neue Kanzlei', partner_status: 'inactive', lifecycle_status: 'draft', billing_ready: false, billing_block_reasons: ['no_payment_method'], ...over });
    (db.provider_members ??= []).push({ provider_key: 'neue-kanzlei', user_id: USER_ID, role: 'owner' });
    seedTaxonomy();
    return p;
}

const own = (path: string, init: RequestInit = {}) => api(`/api/v1/provider/neue-kanzlei${path}`, { auth: 'jwt', ...init });
const ADMIN_JWT = () => signJwt({ sub: randomUUID(), app_metadata: { role: 'admin' } });
async function adminApi(path: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_JWT()}`, ...(init.headers as any) } });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Fuellt das Dossier bis kurz vor dem Einreichen: Rechtsform, eine Leistung in DE, Nachweise, Annahmen. */
async function fillDossier(annahmen: string[] = ['provider_agreement', 'privacy_notice', 'billing_authorization']) {
    await own('/application', { method: 'PATCH', body: JSON.stringify({ contact_email: 'k@neue.test', entity_type: 'GmbH', registration_number: 'HRB 4711', registered_address: 'Weg 1, Hamburg', representative_name: 'Anna Beispiel' }) });
    const svc = await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'data-privacy', service_name: 'Datenschutz-Paket' }) });
    await own(`/services/${svc.body.service.id}/coverage`, { method: 'PUT', body: JSON.stringify({ countries: ['DE'] }) });
    for (const type of ['incorporation', 'insurance']) {
        const up = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: type, original_name: `${type}.pdf`, mime_type: 'application/pdf', size_bytes: 1000 }) });
        uploaded.add(up.body.file_ref);
        await own(`/evidence/${up.body.evidence_id}/confirm`, { method: 'POST', body: '{}' });
    }
    await own('/evidence/registry', { method: 'POST', body: JSON.stringify({ evidence_type: 'vat_id', vat_id: 'DE 123456789' }) });
    for (const agreement_type of annahmen) {
        await own('/agreements', { method: 'POST', body: JSON.stringify({ agreement_type, version: '2026-09', language: 'de', accepted_by_name: 'Anna Beispiel', accepted_by_title: 'GF' }) });
    }
    return svc.body.service.id as string;
}

describe('Bewerbungsstrecke: Dossier, Leistungen, Nachweise (Phase 2)', () => {
    it('liefert das Dossier mit Kapitelstatus und ohne Reviewer-Interna', async () => {
        seedApplicant();
        const r = await own('/application');
        expect(r.status).toBe(200);
        expect(r.body.chapters.submit.ready).toBe(false);
        expect(r.body.chapters.legal.complete).toBe(false);
        expect(r.body.checklist.map((c: any) => c.type)).toEqual(['incorporation', 'vat_id', 'insurance', 'representative_identity']);
        expect(JSON.stringify(r.body)).not.toContain('stripe_customer_id');
    });

    it('schreibt Rechtsform getrennt in provider_confidential, nicht in providers', async () => {
        seedApplicant();
        const r = await own('/application', { method: 'PATCH', body: JSON.stringify({ name: 'Neue Kanzlei GmbH', registration_number: 'HRB 1' }) });
        expect(r.status).toBe(200);
        expect(db.providers[0].name).toBe('Neue Kanzlei GmbH');
        expect((db.providers[0] as any).registration_number).toBeUndefined();
        expect(db.provider_confidential[0].registration_number).toBe('HRB 1');
    });

    it('legt eine Leistung als pending_verification an und Laender als pending-Zeilen (2B)', async () => {
        seedApplicant();
        const svc = await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat.returns' }) });
        expect(svc.status).toBe(201);
        expect(svc.body.service.status).toBe('pending_verification');
        expect(svc.body.service.service_name).toBe('VAT returns');
        const cov = await own(`/services/${svc.body.service.id}/coverage`, { method: 'PUT', body: JSON.stringify({ countries: ['DE', 'AT', 'DE'] }) });
        expect(cov.status).toBe(200);
        expect(cov.body.coverage.map((c: any) => `${c.country_code}:${c.status}`)).toEqual(['AT:pending', 'DE:pending']);
        // Die Checkliste verlangt jetzt eine Zulassung je Land.
        const dossier = await own('/application');
        expect(dossier.body.checklist.filter((c: any) => c.type === 'professional_licence').map((c: any) => c.country_code).sort()).toEqual(['AT', 'DE']);
    });

    it('weist unbekannte Codes und Dubletten ab', async () => {
        seedApplicant();
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'astrologie' }) })).status).toBe(422);
        await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat' }) });
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat' }) })).status).toBe(409);
    });

    it('setzt das Kategorie-Kontingent durch: Essential und eine zweite Hauptkategorie → 422', async () => {
        seedApplicant();
        seedPricing();
        seedSubscription('neue-kanzlei', 'essential');
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat' }) })).status).toBe(201);
        const zweite = await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'data-privacy' }) });
        expect(zweite.status).toBe(422);
        expect(zweite.body.errorCode).toBe('CATEGORY_ALLOWANCE');
        expect(zweite.body).toMatchObject({ allowance: 1, used: 2, plan: 'essential' });
        // Eine Unterkategorie derselben Hauptkategorie ist frei.
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat.returns' }) })).status).toBe(201);
    });

    it('sperrt ohne Abo nicht — der Plan fehlt dann im Gate, nicht beim Eintragen', async () => {
        seedApplicant();
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'tax-vat' }) })).status).toBe(201);
        expect((await own('/services', { method: 'POST', body: JSON.stringify({ service_code: 'data-privacy' }) })).status).toBe(201);
    });

    it('stellt eine Upload-URL nur fuer erlaubte Typen und Groessen aus und bestaetigt erst, wenn die Datei da ist', async () => {
        seedApplicant();
        const zip = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: 'incorporation', original_name: 'a.zip', mime_type: 'application/zip', size_bytes: 10 }) });
        expect(zip.status).toBe(415);
        const gross = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: 'incorporation', original_name: 'a.pdf', mime_type: 'application/pdf', size_bytes: 21 * 1024 * 1024 }) });
        expect(gross.status).toBe(413);
        expect(db.provider_evidence ?? []).toHaveLength(0);

        const up = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: 'incorporation', original_name: 'HR Auszug (2026).pdf', mime_type: 'application/pdf', size_bytes: 1000 }) });
        expect(up.status).toBe(201);
        expect(up.body.file_ref).toBe(`neue-kanzlei/${up.body.evidence_id}/HR-Auszug-2026-.pdf`);
        expect(up.body.upload.method).toBe('PUT');
        expect(db.provider_evidence[0].upload_confirmed).toBe(false);

        const zuFrueh = await own(`/evidence/${up.body.evidence_id}/confirm`, { method: 'POST', body: '{}' });
        expect(zuFrueh.status).toBe(409);
        expect(zuFrueh.body.errorCode).toBe('UPLOAD_NOT_FOUND');

        uploaded.add(up.body.file_ref);
        const ok = await own(`/evidence/${up.body.evidence_id}/confirm`, { method: 'POST', body: '{}' });
        expect(ok.status).toBe(200);
        expect(db.provider_evidence[0]).toMatchObject({ upload_confirmed: true, size_bytes: 4321 });
    });

    it('speichert die Registerabfrage statt eines Dokuments', async () => {
        seedApplicant();
        const r = await own('/evidence/registry', { method: 'POST', body: JSON.stringify({ evidence_type: 'vat_id', vat_id: 'de-123456789' }) });
        expect(r.status).toBe(201);
        expect(r.body.evidence).toMatchObject({ source: 'registry_check', result: 'independently_verified', identifier: 'DE123456789' });
        expect(db.providers[0]).toMatchObject({ vat_id: 'DE123456789', vat_id_status: 'valid' });
        const schlecht = await own('/evidence/registry', { method: 'POST', body: JSON.stringify({ vat_id: 'XX1' }) });
        expect(schlecht.body.evidence.result).toBe('rejected');
    });

    it('haelt Annahmen versioniert und loest die alte Fassung ab, ohne sie zu loeschen', async () => {
        seedApplicant();
        await own('/agreements', { method: 'POST', body: JSON.stringify({ agreement_type: 'provider_agreement', version: 'v1', accepted_by_name: 'A' }) });
        await own('/agreements', { method: 'POST', body: JSON.stringify({ agreement_type: 'provider_agreement', version: 'v2', accepted_by_name: 'A' }) });
        expect(db.provider_agreement_acceptance).toHaveLength(2);
        expect(db.provider_agreement_acceptance.find((a: any) => a.version === 'v1').superseded_at).toBeTruthy();
        expect(db.provider_agreement_acceptance.find((a: any) => a.version === 'v2').superseded_at).toBeUndefined();
        expect((await own('/agreements', { method: 'POST', body: JSON.stringify({ agreement_type: 'nda', version: 'v1', accepted_by_name: 'A' }) })).status).toBe(400);
    });
});

describe('Einreichen (4C): nichts geht raus, was unvollstaendig ist', () => {
    it('nennt die fehlenden Punkte statt nur abzulehnen', async () => {
        seedApplicant();
        const r = await own('/submit', { method: 'POST', body: '{}' });
        expect(r.status).toBe(422);
        expect(r.body.errorCode).toBe('INCOMPLETE');
        expect(r.body.missing).toEqual(expect.arrayContaining(['legal.entity_type', 'services.none', 'evidence.incorporation', 'agreements.provider_agreement']));
        expect(db.providers[0].lifecycle_status).toBe('draft');
    });

    it('setzt submitted, sobald alles da ist — und nur einmal', async () => {
        seedApplicant();
        await fillDossier();
        const r = await own('/submit', { method: 'POST', body: '{}' });
        expect(r.status).toBe(200);
        expect(db.providers[0].lifecycle_status).toBe('submitted');
        expect(db.provider_review_log.some((l: any) => l.subject === 'lifecycle' && l.to_value === 'submitted' && l.actor_kind === 'provider')).toBe(true);
        const nochmal = await own('/submit', { method: 'POST', body: '{}' });
        expect(nochmal.status).toBe(409);
    });

    it('nimmt den Antrag ohne Abrechnungsermaechtigung an (4C)', async () => {
        // Gegenprobe an der echten Strecke: nur die beiden Annahmen der ersten
        // Stufe sind erteilt. Vor der Trennung war das ein 422.
        seedApplicant();
        await fillDossier(['provider_agreement', 'privacy_notice']);
        const r = await own('/submit', { method: 'POST', body: '{}' });
        expect(r.status).toBe(200);
        expect(db.providers[0].lifecycle_status).toBe('submitted');
    });

    it('das Kapitel Annahmen zaehlt nur die Einreich-Stufe', async () => {
        seedApplicant();
        await fillDossier(['provider_agreement', 'privacy_notice']);
        const r = await own('/application');
        expect(r.body.chapters.agreements.complete).toBe(true);
        expect(r.body.chapters.submit.ready).toBe(true);
    });
});

describe('Review-Arbeitsplatz (6A/7A/8A): nur Admin, Zell-Aktionen, Gate', () => {
    it('ist fuer normale Logins und Gaeste zu — auch /admin/stats', async () => {
        seedApplicant();
        expect((await api('/api/v1/admin/review/queue', { auth: 'jwt' })).status).toBe(403);
        expect((await api('/api/v1/admin/review/neue-kanzlei', { auth: 'jwt' })).status).toBe(403);
        expect((await api('/api/v1/admin/stats', { auth: 'jwt' })).status).toBe(403);
        expect((await api('/api/v1/admin/review/queue', { auth: 'none' })).status).toBe(401);
    });

    it('zeigt eingereichte Bewerbungen in der Queue mit Risiko', async () => {
        seedApplicant();
        await fillDossier();
        await own('/submit', { method: 'POST', body: '{}' });
        const q = await adminApi('/api/v1/admin/review/queue');
        expect(q.status).toBe(200);
        expect(q.body.rows).toEqual([expect.objectContaining({ kind: 'application', provider_key: 'neue-kanzlei', risk: 'medium', lifecycle_status: 'submitted' })]);
    });

    it('liefert dem Reviewer das Dossier mit signierter Download-URL je bestaetigtem Nachweis', async () => {
        seedApplicant();
        await fillDossier();
        const d = await adminApi('/api/v1/admin/review/neue-kanzlei');
        expect(d.status).toBe(200);
        const docs = d.body.evidence.filter((e: any) => e.source === 'document');
        expect(docs).toHaveLength(2);
        expect(docs.every((e: any) => e.download_url?.startsWith('https://storage.test/signed/'))).toBe(true);
        expect(d.body.evidence.find((e: any) => e.source === 'registry_check').download_url).toBeNull();
        expect(d.body.gate.ok).toBe(false);
        expect(d.body.confidential.registration_number).toBe('HRB 4711');
    });

    it('Zell-Aktion approve hebt den Service-Status; request_info legt eine Nachfrage an und setzt more_info_required', async () => {
        seedApplicant();
        const serviceId = await fillDossier();
        await own(`/services/${serviceId}/coverage`, { method: 'PUT', body: JSON.stringify({ countries: ['DE', 'AT'] }) });
        await own('/submit', { method: 'POST', body: '{}' });
        const cells = db.provider_service_coverage.filter((c: any) => c.service_id === serviceId);
        const de = cells.find((c: any) => c.country_code === 'DE');
        const at = cells.find((c: any) => c.country_code === 'AT');

        const ohneGrund = await adminApi(`/api/v1/admin/review/neue-kanzlei/coverage/${at.id}`, { method: 'POST', body: JSON.stringify({ action: 'reject' }) });
        expect(ohneGrund.status).toBe(400);

        const ok = await adminApi(`/api/v1/admin/review/neue-kanzlei/coverage/${de.id}`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
        expect(ok.status).toBe(200);
        expect(ok.body.service_status).toBe('limited');            // AT ist noch offen
        expect(db.provider_services.find((s: any) => s.id === serviceId).status).toBe('limited');

        const frage = await adminApi(`/api/v1/admin/review/neue-kanzlei/coverage/${at.id}`, { method: 'POST', body: JSON.stringify({ action: 'request_info', evidence_type: 'professional_licence', reason: 'Bitte die Zulassung fuer Oesterreich nachreichen.' }) });
        expect(frage.status).toBe(201);
        expect(db.provider_evidence_requests).toEqual([expect.objectContaining({ evidence_type: 'professional_licence', country_code: 'AT', status: 'open' })]);
        expect(db.providers[0].lifecycle_status).toBe('more_info_required');
        // Der Anbieter erfaehrt es: Benachrichtigung an den Dashboard-Login, Mail im Outbox-Log.
        expect(db.notifications.some((n: any) => n.user_id === USER_ID && n.type === 'verification_info_requested' && n.subject === 'provider')).toBe(true);
        expect(db.event_log.some((e: any) => e.type === 'email_outbox' && e.payload?.kind === 'verification_info_requested')).toBe(true);
        // Der Anbieter sieht die Nachfrage im Verification Center.
        const v = await own('/verification');
        expect(v.body.open_requests).toHaveLength(1);
        expect(v.body.matrix[0].cells.map((c: any) => `${c.country_code}:${c.status}`).sort()).toEqual(['AT:pending', 'DE:approved']);
        expect(JSON.stringify(v.body.history)).not.toContain('actor_id');
    });

    it('der bestaetigte Upload erfuellt die Nachfrage und holt das Konto zurueck in die Pruefung', async () => {
        seedApplicant();
        const serviceId = await fillDossier();
        await own('/submit', { method: 'POST', body: '{}' });
        await adminApi('/api/v1/admin/review/neue-kanzlei/request', { method: 'POST', body: JSON.stringify({ evidence_type: 'insurance', message: 'Die Police ist nicht mehr gueltig — bitte die aktuelle.' }) });
        expect(db.providers[0].lifecycle_status).toBe('more_info_required');
        const up = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: 'insurance', original_name: 'police-2027.pdf', mime_type: 'application/pdf', size_bytes: 500 }) });
        uploaded.add(up.body.file_ref);
        const c = await own(`/evidence/${up.body.evidence_id}/confirm`, { method: 'POST', body: '{}' });
        expect(c.status).toBe(200);
        expect(c.body.fulfilled_requests).toHaveLength(1);
        expect(db.provider_evidence_requests[0]).toMatchObject({ status: 'fulfilled', fulfilled_evidence_id: up.body.evidence_id });
        expect(db.providers[0].lifecycle_status).toBe('under_verification');
        void serviceId;
    });

    it('Gate: active, wenn Nachweise geprueft, eine Zelle frei und die Annahmen da sind — Billing sperrt nicht (TKT-PROV-05)', async () => {
        seedApplicant();
        const serviceId = await fillDossier();
        await own('/submit', { method: 'POST', body: '{}' });
        await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'under_verification' }) });

        const zu = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'active' }) });
        expect(zu.status).toBe(422);
        expect(zu.body.errorCode).toBe('GATE_NOT_MET');
        expect(zu.body.gate.missing).toEqual(expect.arrayContaining(['evidence.incorporation', 'evidence.insurance', 'evidence.representative_identity', 'coverage.none_approved']));
        // Billing taucht hier nicht auf — §21.1 sperrt die gebuehrenpflichtige
        // Buchung, nicht die Aktivierung (TKT-PROV-05). Auch nicht, solange
        // noch etwas anderes fehlt.
        expect(zu.body.gate.missing.filter((m: string) => m.startsWith('billing.'))).toEqual([]);
        expect(db.providers[0].lifecycle_status).toBe('under_verification');

        // Reviewer prueft die Dokumente und gibt die Zelle frei. Billing bleibt
        // absichtlich unbereit — es darf das Aktivieren nicht sperren (§21.1).
        for (const e of db.provider_evidence.filter((x: any) => x.source === 'document')) {
            const r = await adminApi(`/api/v1/admin/review/neue-kanzlei/evidence/${e.id}`, { method: 'POST', body: JSON.stringify({ result: 'reviewed', notes: 'passt' }) });
            expect(r.status).toBe(200);
        }
        const vertretung = await own('/evidence/upload-url', { method: 'POST', body: JSON.stringify({ evidence_type: 'representative_identity', original_name: 'vollmacht.pdf', mime_type: 'application/pdf', size_bytes: 500 }) });
        uploaded.add(vertretung.body.file_ref);
        await own(`/evidence/${vertretung.body.evidence_id}/confirm`, { method: 'POST', body: '{}' });
        await adminApi(`/api/v1/admin/review/neue-kanzlei/evidence/${vertretung.body.evidence_id}`, { method: 'POST', body: JSON.stringify({ result: 'reviewed' }) });
        const cell = db.provider_service_coverage.find((c: any) => c.service_id === serviceId);
        await adminApi(`/api/v1/admin/review/neue-kanzlei/coverage/${cell.id}`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });

        // Der Anbieter steht auf billing_ready=false mit Grund 'no_payment_method'.
        // Vorher stand genau das in `missing`, und weil niemand das Flag setzte,
        // ging das Gate fuer keinen Anbieter je auf. Jetzt wird es GEMELDET.
        const offen = await adminApi('/api/v1/admin/review/neue-kanzlei/gate');
        expect(offen.body.gate.missing).toEqual([]);
        expect(offen.body.gate.ok).toBe(true);
        expect(offen.body.gate.billing).toEqual({ ready: false, blocks_chargeable_booking: ['not_ready', 'no_payment_method'] });

        // Aktivieren OHNE billing_ready anzufassen.
        const auf = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'active' }) });
        expect(auf.status).toBe(200);
        expect(db.providers[0]).toMatchObject({ lifecycle_status: 'active', partner_status: 'active' });
        expect(db.notifications.some((n: any) => n.type === 'verification_activated')).toBe(true);
        expect(db.event_log.some((e: any) => e.type === 'email_outbox' && e.payload?.kind === 'verification_activated')).toBe(true);
    });

    it('Gate: active verlangt alle Zellen frei — sonst nur limited', async () => {
        seedApplicant();
        const serviceId = await fillDossier();
        await own(`/services/${serviceId}/coverage`, { method: 'PUT', body: JSON.stringify({ countries: ['DE', 'AT'] }) });
        await own('/submit', { method: 'POST', body: '{}' });
        await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'under_verification' }) });
        for (const e of db.provider_evidence.filter((x: any) => x.source === 'document')) {
            await adminApi(`/api/v1/admin/review/neue-kanzlei/evidence/${e.id}`, { method: 'POST', body: JSON.stringify({ result: 'reviewed' }) });
        }
        db.provider_evidence.push({ id: randomUUID(), provider_key: 'neue-kanzlei', evidence_type: 'representative_identity', source: 'registry_check', result: 'independently_verified', upload_confirmed: true });
        const de = db.provider_service_coverage.find((c: any) => c.service_id === serviceId && c.country_code === 'DE');
        await adminApi(`/api/v1/admin/review/neue-kanzlei/coverage/${de.id}`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
        Object.assign(db.providers[0], { billing_ready: true, billing_block_reasons: [] });

        const active = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'active' }) });
        expect(active.status).toBe(422);
        expect(active.body.errorCode).toBe('GATE_TARGET_LIMITED');
        const limited = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'limited' }) });
        expect(limited.status).toBe(200);
        expect(db.providers[0].lifecycle_status).toBe('limited');
    });

    it('verbietet Statuswechsel, die kein Reviewer setzt', async () => {
        seedApplicant();
        const r = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'submitted' }) });
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('TRANSITION_NOT_ALLOWED');
        const ohneGrund = await adminApi('/api/v1/admin/review/neue-kanzlei/lifecycle', { method: 'POST', body: JSON.stringify({ to: 'terminated' }) });
        expect(ohneGrund.status).toBe(409); // draft → terminated ist nicht erlaubt; ein Reviewer beendet keinen Entwurf
    });
});

describe('Change-Control fuer aktive Partner (§18–20)', () => {
    /** Aktiver Partner mit einer freigegebenen Leistung und Rechtsform. */
    function seedActivePartner() {
        seedApplicant({ lifecycle_status: 'active', partner_status: 'active' });
        const svc = { id: randomUUID(), provider_key: 'neue-kanzlei', service_code: 'tax-vat', service_name: 'USt-Registrierung', status: 'approved', price_min: 1200, price_max: 2400, currency: 'EUR', completion_days_estimate: 15, exclusions: [] as string[] };
        (db.provider_services ??= []).push(svc);
        (db.provider_confidential ??= []).push({ provider_key: 'neue-kanzlei', entity_type: 'GmbH', representative_name: 'Anna Beispiel' });
        return svc;
    }
    const changes = () => (db.provider_change_requests ?? []) as any[];

    it('haelt eine Preiserhoehung zurueck — Nutzer sehen weiter den alten Preis', async () => {
        const svc = seedActivePartner();
        const r = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, price_max: 2600 }) });
        expect(r.status).toBe(200);
        expect(r.body.updated).toEqual(['price_min']);
        expect(r.body.held).toEqual(['price_max']);
        expect(svc).toMatchObject({ price_min: 1000, price_max: 2400 });
        expect(changes().map((c) => `${c.effect}:${c.field_path}:${c.status}`).sort()).toEqual(['applied:price_min:submitted', 'held:price_max:submitted']);
        expect(changes().find((c) => c.effect === 'held')).toMatchObject({ service_id: svc.id, deadline_class: 'before_effective_date', old_value: { price_max: 2400 }, new_value: { price_max: 2600 } });
    });

    it('fuehrt einen offenen Vorgang fort statt einen zweiten anzulegen — ein Speichern mit Live-Werten zieht nichts zurueck', async () => {
        const svc = seedActivePartner();
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600 }) });
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2800, exclusions: ['Buchhaltung'] }) });
        const held = changes().filter((c) => c.effect === 'held');
        expect(held).toHaveLength(1);
        expect(held[0]).toMatchObject({ old_value: { price_max: 2400, exclusions: [] }, new_value: { price_max: 2800, exclusions: ['Buchhaltung'] } });
        // Die Oberflaeche schickt das ganze Kapitel, auch mit Live-Werten.
        const ganzes = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1200, price_max: 2400, exclusions: [], description: 'Neu' }) });
        expect(ganzes.body.held.sort()).toEqual(['exclusions', 'price_max']);
        expect(held[0].status).toBe('submitted');
        expect(held[0].new_value).toEqual({ price_max: 2800, exclusions: ['Buchhaltung'] });
    });

    it('uebernimmt einen neuen Firmennamen und die Vertretung sofort, mit Pruefvorgang', async () => {
        seedActivePartner();
        const r = await own('/application', { method: 'PATCH', body: JSON.stringify({ name: 'Neue Kanzlei Partner GmbH', representative_name: 'Ben Beispiel', languages: ['de'] }) });
        expect(r.status).toBe(200);
        expect(r.body.held).toEqual([]);
        expect(db.providers[0].name).toBe('Neue Kanzlei Partner GmbH');
        expect(db.provider_confidential[0].representative_name).toBe('Ben Beispiel');
        expect(changes()).toEqual([expect.objectContaining({ effect: 'applied', field_path: 'name,representative_name', change_type: 'legal_name,responsible_professional', applied_at: expect.any(String) })]);
    });

    it('legt vor der Aktivierung keinen Vorgang an', async () => {
        seedApplicant();
        await own('/application', { method: 'PATCH', body: JSON.stringify({ name: 'X GmbH', registration_number: 'HRB 1' }) });
        expect(changes()).toHaveLength(0);
    });

    it('Pruefteam gibt frei: der wartende Wert geht live — ein ueberholter Vorgang wird nicht uebernommen', async () => {
        const svc = seedActivePartner();
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600 }) });
        const id = changes()[0].id;
        const detail = await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`);
        expect(detail.status).toBe(200);
        expect(detail.body).toMatchObject({ live: { price_max: 2400 }, stale: false, service: { id: svc.id } });

        // Inzwischen hat jemand den Live-Wert geaendert (z. B. eine Senkung).
        svc.price_max = 2300;
        const ueberholt = await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
        expect(ueberholt.status).toBe(409);
        expect(ueberholt.body.errorCode).toBe('STALE_CHANGE');
        expect(svc.price_max).toBe(2300);

        svc.price_max = 2400;
        const ok = await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
        expect(ok.status).toBe(200);
        expect(svc.price_max).toBe(2600);
        expect(changes()[0]).toMatchObject({ status: 'applied', applied_at: expect.any(String) });
        const nochmal = await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) });
        expect(nochmal.status).toBe(409);
    });

    it('Ablehnen braucht eine Begruendung, die der Partner liest', async () => {
        const svc = seedActivePartner();
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600 }) });
        const id = changes()[0].id;
        expect((await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'reject' }) })).status).toBe(400);
        expect((await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note: 'Bitte die neue Preisbasis erläutern.' }) })).status).toBe(200);
        expect(svc.price_max).toBe(2400);
        const liste = await own('/changes');
        expect(liste.body.changes[0]).toMatchObject({ status: 'rejected', reviewer_note: 'Bitte die neue Preisbasis erläutern.' });
        expect(liste.body.changes[0].reviewer_id).toBeUndefined();
    });

    it('ein uebernommener Wert laesst sich nicht ablehnen, nur nachpruefen', async () => {
        seedActivePartner();
        await own('/application', { method: 'PATCH', body: JSON.stringify({ name: 'Neu GmbH' }) });
        const id = changes()[0].id;
        expect((await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note: 'x' }) })).status).toBe(400);
        const nach = await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify({ decision: 'require_reverification', note: 'Bitte neuen Registerauszug hochladen.' }) });
        expect(nach.status).toBe(200);
        expect(changes()[0]).toMatchObject({ status: 'under_review', requires_reverification: true });
    });

    it('der Partner zieht nur zurueck, was noch wartet', async () => {
        const svc = seedActivePartner();
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, price_max: 2600 }) });
        const held = changes().find((c) => c.effect === 'held');
        const applied = changes().find((c) => c.effect === 'applied');
        expect((await own(`/changes/${applied.id}`, { method: 'DELETE' })).status).toBe(409);
        expect((await own(`/changes/${held.id}`, { method: 'DELETE' })).status).toBe(200);
        expect(held.status).toBe('withdrawn');
    });

    it('ein wesentliches Ereignis pausiert nur die gewaehlten Leistungen; das Pruefteam setzt sie zurueck', async () => {
        const svc = seedActivePartner();
        const zweite = { id: randomUUID(), provider_key: 'neue-kanzlei', service_code: 'data-privacy', service_name: 'DSGVO', status: 'limited' };
        db.provider_services.push(zweite);
        const morgen = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
        expect((await own('/material-event', { method: 'POST', body: JSON.stringify({ event_type: 'insurance_lost', occurred_on: morgen, service_ids: 'all' }) })).status).toBe(400);
        expect((await own('/material-event', { method: 'POST', body: JSON.stringify({ event_type: 'insurance_lost', occurred_on: '2026-09-30' }) })).status).toBe(400);

        const r = await own('/material-event', { method: 'POST', body: JSON.stringify({ event_type: 'insurance_lost', occurred_on: '2026-09-30', service_ids: [svc.id] }) });
        expect(r.status).toBe(201);
        expect(r.body.paused_service_ids).toEqual([svc.id]);
        expect(svc.status).toBe('paused');
        expect(zweite.status).toBe('limited');
        const ev = changes()[0];
        expect(ev).toMatchObject({ effect: 'pause', deadline_class: 'immediate_24h', event_type: 'insurance_lost', affected_service_ids: [svc.id] });

        const q = await adminApi('/api/v1/admin/review/queue');
        expect(q.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'change_request', risk: 'high', detail: 'insurance_lost', ref_id: ev.id })]));

        expect((await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${ev.id}`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) })).status).toBe(400);
        expect((await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${ev.id}`, { method: 'POST', body: JSON.stringify({ decision: 'resume' }) })).status).toBe(200);
        expect(svc.status).toBe('approved');
    });

    it('dry_run sagt vorher, was wartet und was sofort gilt — ohne zu schreiben (B V2)', async () => {
        const svc = seedActivePartner();
        const r = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, completion_days_estimate: 10, capacity_status: 'limited', dry_run: true }) });
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ dry_run: true, instant: ['capacity_status'] });
        expect(r.body.held).toEqual([{ field: 'price_max', old: 2400, new: 2600, change_type: 'pricing' }]);
        expect(r.body.review.map((f: any) => f.field)).toEqual(['completion_days_estimate']);
        expect(svc).toMatchObject({ price_max: 2400, completion_days_estimate: 15 });
        expect(changes()).toHaveLength(0);
    });

    it('der Partner erfaehrt die Entscheidung per Mail, mit der Begruendung (§26)', async () => {
        const svc = seedActivePartner();
        db.providers[0].contact_email = 'kanzlei@neue.test';
        db.providers[0].languages = ['de'];
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600 }) });
        await adminApi(`/api/v1/admin/review/neue-kanzlei/change/${changes()[0].id}`, { method: 'POST', body: JSON.stringify({ decision: 'reject', note: 'Bitte die Preisbasis nennen.' }) });
        const mail = db.event_log.find((e) => e.type === 'email_outbox' && e.payload.kind === 'change_rejected');
        expect(mail.payload).toMatchObject({ to: 'kanzlei@neue.test', subject: 'Ihre Änderung wurde nicht übernommen' });
        expect(mail.payload.text).toContain('Hinweis unseres Prüfteams: Bitte die Preisbasis nennen.');
        expect(mail.payload.text).toContain('ein Mensch antwortet Ihnen');
    });

    it('eine Pause erreicht nur Nutzer mit Termin im pausierten Bereich — per Mail und als Flag an ihren Terminen (F V1)', async () => {
        const svc = seedActivePartner();
        const morgen = new Date(Date.now() + 86400_000).toISOString();
        const andererNutzer = randomUUID();
        (db.users ??= []).push({ id: USER_ID, email: 'test@complihub.test' }, { id: andererNutzer, email: 'datenschutz@kunde.test' });
        (db.engagement_requests ??= []).push(
            { id: randomUUID(), user_id: USER_ID, provider_key: 'neue-kanzlei', category: 'tax-vat', country: 'de', created_at: new Date().toISOString() },
            { id: randomUUID(), user_id: andererNutzer, provider_key: 'neue-kanzlei', category: 'data-privacy', country: 'es', created_at: new Date().toISOString() },
        );
        (db.scheduling ??= []).push(
            { id: randomUUID(), provider_key: 'neue-kanzlei', user_id: USER_ID, slot_start: morgen, slot_end: morgen, status: 'confirmed' },
            { id: randomUUID(), provider_key: 'neue-kanzlei', user_id: andererNutzer, slot_start: morgen, slot_end: morgen, status: 'confirmed' },
        );
        const r = await own('/material-event', { method: 'POST', body: JSON.stringify({ event_type: 'insurance_lost', occurred_on: '2026-09-30', service_ids: [svc.id] }) });
        expect(r.body.users_notified).toBe(1);
        const mails = db.event_log.filter((e) => e.type === 'email_outbox' && e.payload.kind === 'booking_provider_paused');
        expect(mails.map((m) => m.payload.to)).toEqual(['test@complihub.test']);
        expect(mails[0].payload.text).toContain('kostenfrei absagen');
        expect(mails[0].payload.text).not.toMatch(/Versicherung|insurance/i);

        const termine = await api('/api/v1/bookings', { auth: 'jwt' });
        expect(termine.body.bookings.map((b: any) => b.provider_paused)).toEqual([true]);
    });

    it('ist fuer normale Logins zu', async () => {
        const svc = seedActivePartner();
        await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600 }) });
        const id = changes()[0].id;
        expect((await api(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { auth: 'jwt' })).status).toBe(403);
        expect((await api(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', auth: 'jwt', body: JSON.stringify({ decision: 'approve' }) })).status).toBe(403);
    });

    describe('„Gilt ab": geplante Konditionen (A V2, E V2, D V2)', () => {
        const inDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
        const ab = inDays(30);
        const decide = (id: string, body: Record<string, unknown>) =>
            adminApi(`/api/v1/admin/review/neue-kanzlei/change/${id}`, { method: 'POST', body: JSON.stringify(body) });
        const tick = async (shadow = false) => {
            process.env.WATCHERS_SHADOW = shadow ? 'true' : 'false';
            try { return await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}' }); } finally { delete process.env.WATCHERS_SHADOW; }
        };

        it('weist ein Datum heute, in der Vergangenheit, zu weit voraus oder ohne Change-Control ab', async () => {
            const svc = seedActivePartner();
            for (const [d, reason] of [[inDays(0), 'past'], [inDays(-3), 'past'], ['01.01.2027', 'format'], [inDays(400), 'too_far']] as const) {
                const r = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: d }) });
                expect(r.status).toBe(400);
                expect(r.body).toMatchObject({ errorCode: 'EFFECTIVE_DATE_INVALID', reason });
            }
            svc.status = 'pending_verification';
            const offen = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            expect(offen.status).toBe(422);
            expect(changes()).toHaveLength(0);
        });

        it('in beide Richtungen: Erhoehung wartet mit Datum, Senkung ist ohne Pruefung geplant — nichts geht sofort live', async () => {
            const svc = seedActivePartner();
            const probe = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, price_max: 2600, effective_at: ab, dry_run: true }) });
            expect(probe.body).toMatchObject({ instant: [], held: [{ field: 'price_max' }], scheduled: [{ field: 'price_min' }], effective_at: `${ab}T00:00:00.000Z` });
            expect(changes()).toHaveLength(0);

            const r = await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, price_max: 2600, effective_at: ab }) });
            expect(r.status).toBe(200);
            expect(r.body).toMatchObject({ updated: [], held: ['price_max'], scheduled: ['price_min'] });
            expect(svc).toMatchObject({ price_min: 1200, price_max: 2400 });
            const held = changes().find((c) => c.status === 'submitted');
            const plan = changes().find((c) => c.status === 'approved');
            expect(held).toMatchObject({ effect: 'held', field_path: 'price_max', effective_at: `${ab}T00:00:00.000Z` });
            expect(plan).toMatchObject({ effect: 'held', field_path: 'price_min', applied_at: null, effective_at: `${ab}T00:00:00.000Z` });
            expect(plan.reviewed_at ?? null).toBeNull();
            // Queue: das Datum ist die Frist; das ungepruefte Geplante steht nicht darin.
            const q = await adminApi('/api/v1/admin/review/queue');
            const rows = q.body.rows.filter((x: any) => x.kind === 'change_request');
            expect(rows.map((x: any) => [x.ref_id, x.due_at])).toEqual([[held.id, held.effective_at]]);
        });

        it('Freigabe vor dem Datum plant ein und nennt das Datum in der Mail; der Waechter uebernimmt am Datum', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            const c = changes()[0];
            const ok = await decide(c.id, { decision: 'approve' });
            expect(ok.status).toBe(200);
            expect(ok.body.scheduled_for).toBe(c.effective_at);
            expect(c).toMatchObject({ status: 'approved', applied_at: null });
            expect(svc.price_max).toBe(2400);
            const mail = db.event_log.find((e) => e.type === 'email_outbox' && e.payload.kind === 'change_approved_scheduled');
            expect(mail.payload.subject).toContain(ab.slice(0, 4));

            // Noch nicht faellig: der Lauf laesst den Vorgang stehen.
            expect((await tick()).body.summary.scheduledChangesApplied).toBe(0);
            // Faellig — Shadow zaehlt nur.
            c.effective_at = new Date(Date.now() - 60_000).toISOString();
            expect((await tick(true)).body.summary.scheduledChangesApplied).toBe(1);
            expect(svc.price_max).toBe(2400);
            const live = await tick();
            expect(live.body.summary).toMatchObject({ scheduledChangesApplied: 1, scheduledChangesStale: 0 });
            expect(svc.price_max).toBe(2600);
            expect(c).toMatchObject({ status: 'applied', applied_at: expect.any(String) });
            // Geprueft war er schon — kein Folgevorgang.
            expect(changes()).toHaveLength(1);
        });

        it('eine geplante Senkung wird am Datum uebernommen und dann wie jede Senkung nachgeprueft', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, effective_at: ab }) });
            const plan = changes()[0];
            plan.effective_at = new Date(Date.now() - 60_000).toISOString();
            await tick();
            expect(svc.price_min).toBe(1000);
            expect(plan.status).toBe('applied');
            expect(changes().find((c) => c.effect === 'applied')).toMatchObject({ status: 'submitted', field_path: 'price_min', old_value: { price_min: 1200 }, new_value: { price_min: 1000 } });
        });

        it('ueberholt am Datum: nichts wird ueberschrieben, der Vorgang geht zurueck in die Pruefung', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            const c = changes()[0];
            await decide(c.id, { decision: 'approve' });
            svc.price_max = 2500;
            c.effective_at = new Date(Date.now() - 60_000).toISOString();
            expect((await tick()).body.summary.scheduledChangesStale).toBe(1);
            expect(svc.price_max).toBe(2500);
            expect(c.status).toBe('under_review');
        });

        it('Freigabe nach dem Datum gilt ab der Freigabe, nie rueckwirkend', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            const c = changes()[0];
            c.effective_at = new Date(Date.now() - 86400_000).toISOString();
            const before = Date.now();
            await decide(c.id, { decision: 'approve' });
            expect(svc.price_max).toBe(2600);
            expect(c.status).toBe('applied');
            expect(new Date(c.effective_at).getTime()).toBeGreaterThanOrEqual(before - 1000);
            expect(db.event_log.some((e) => e.payload?.kind === 'change_approved')).toBe(true);
        });

        it('der Partner zieht eine geplante Aenderung bis zum Datum zurueck', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            const c = changes()[0];
            await decide(c.id, { decision: 'approve' });
            expect((await own(`/changes/${c.id}`, { method: 'DELETE' })).status).toBe(200);
            expect(c.status).toBe('withdrawn');
            await tick();
            expect(svc.price_max).toBe(2400);
        });

        it('das letzte Speichern eines Feldes gewinnt — ein ueberholter geplanter Wert faellt heraus', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1000, completion_days_estimate: 10, effective_at: ab }) });
            const plan = changes()[0];
            // Jetzt sofort: 1100 statt 1000 ab Datum.
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_min: 1100 }) });
            expect(svc.price_min).toBe(1100);
            expect(plan).toMatchObject({ status: 'approved', field_path: 'completion_days_estimate', new_value: { completion_days_estimate: 10 } });
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ completion_days_estimate: 12 }) });
            expect(plan.status).toBe('withdrawn');
        });

        it('ein neues Datum ersetzt das alte; „ab sofort" nimmt es weg', async () => {
            const svc = seedActivePartner();
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2700, effective_at: inDays(60) }) });
            const held = changes().filter((c) => c.status === 'submitted');
            expect(held).toHaveLength(1);
            expect(held[0]).toMatchObject({ new_value: { price_max: 2700 }, effective_at: `${inDays(60)}T00:00:00.000Z` });
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2700 }) });
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2650 }) });
            expect(held[0]).toMatchObject({ new_value: { price_max: 2650 }, effective_at: null });
        });

        it('Nutzer sehen nur Freigegebenes, neutral in der Detailansicht', async () => {
            const svc = seedActivePartner();
            db.providers[0].countries_supported = ['DE'];
            (db.matchable_provider_services ??= []).push({ service_id: svc.id, provider_key: 'neue-kanzlei', service_code: 'tax-vat', service_name: 'USt-Registrierung', area_code: 'tax-vat', country_code: 'DE', price_min: 1200, price_max: 2400, currency: 'EUR', provider_availability: 'available', bookable_chargeable: true, provider_lifecycle_status: 'active' });
            await own(`/services/${svc.id}`, { method: 'PATCH', body: JSON.stringify({ price_max: 2600, effective_at: ab }) });
            const vorher = await api(`/api/v1/p/${refOf('neue-kanzlei')}/detail`, { auth: 'jwt' });
            expect(vorher.status).toBe(200);
            expect(vorher.body.detail.planned_prices).toEqual([]);
            await decide(changes()[0].id, { decision: 'approve' });
            const nachher = await api(`/api/v1/p/${refOf('neue-kanzlei')}/detail`, { auth: 'jwt' });
            expect(nachher.body.detail.planned_prices).toEqual([{ service_name: 'USt-Registrierung', effective_at: `${ab}T00:00:00.000Z`, currency: 'EUR', price_min: 1200, price_max: 2600 }]);
        });
    });
});

describe('Watcher: Nachweis-Ablauf', () => {
    it('warnt 30 Tage vorher einmal und setzt bei Ablauf reverification_due mit Frist', async () => {
        seedApplicant({ lifecycle_status: 'active', partner_status: 'active' });
        const bald = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);
        const vorbei = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
        db.provider_evidence = [
            { id: 'e-bald', provider_key: 'neue-kanzlei', evidence_type: 'insurance', source: 'document', result: 'reviewed', upload_confirmed: true, expires_at: bald },
            { id: 'e-vorbei', provider_key: 'neue-kanzlei', evidence_type: 'professional_licence', source: 'document', result: 'reviewed', upload_confirmed: true, expires_at: vorbei },
        ];
        process.env.WATCHERS_SHADOW = 'false';
        try {
            const r1 = await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}' });
            expect(r1.body.summary).toMatchObject({ evidenceExpiringNotices: 1, evidenceExpired: 1, reverificationDue: 1 });
            expect(db.provider_evidence.find((e: any) => e.id === 'e-vorbei').result).toBe('expired');
            expect(db.providers[0].lifecycle_status).toBe('reverification_due');
            expect(db.providers[0].reverification_grace_until).toBeTruthy();
            expect(db.notifications.filter((n: any) => n.type === 'evidence_expiring')).toHaveLength(1);
            const r2 = await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}' });
            expect(r2.body.summary).toMatchObject({ evidenceExpiringNotices: 0, evidenceExpired: 0, reverificationDue: 0 });
        } finally {
            delete process.env.WATCHERS_SHADOW;
        }
    });
});

// ─── „Request This Market“ (Zustand marketUnavailable) ───────────────────────
// Entscheidung 2026-09-27: anfragen darf jeder, ein Update gibt es nur mit
// Konto, und fuer Gaeste speichern wir keine Adresse. Die Identitaet kommt
// allein aus dem geprueften JWT.

describe('POST /api/v1/market-requests', () => {
    const post = (body: Record<string, unknown>, auth: 'none' | 'jwt' = 'none') =>
        api('/api/v1/market-requests', { method: 'POST', auth, body: JSON.stringify(body) });

    it('lets a guest request a market the engine does not cover — one row, no address', async () => {
        const res = await post({ market: 'br', domains: ['tax-vat', 'data-privacy'], guest_key: 'guest-abc-123' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ ok: true, market: 'BR', notify: false });

        const rows = db.market_requests ?? [];
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ requester_key: 'guest:guest-abc-123', guest_key: 'guest-abc-123', user_id: null, market: 'BR', notify: false });
        expect(Object.keys(rows[0])).not.toContain('email');
        // Das Protokoll zaehlt den Markt, nicht den Gast.
        const ev = (db.event_log ?? []).find((e) => e.type === 'market_requested');
        expect(ev?.payload).toEqual({ market: 'BR', account: false, notify: false });
    });

    it('counts a person once per market — asking again updates the row', async () => {
        await post({ market: 'BR', domains: ['tax-vat'], guest_key: 'guest-abc-123' });
        await post({ market: 'BR', domains: ['tax-vat', 'environment'], guest_key: 'guest-abc-123' });
        const rows = db.market_requests ?? [];
        expect(rows).toHaveLength(1);
        expect(rows[0].domains).toEqual(['tax-vat', 'environment']);
    });

    it('refuses an availability update for a guest — we would need an address', async () => {
        const res = await post({ market: 'BR', guest_key: 'guest-abc-123', notify: true });
        expect(res.status).toBe(403);
        expect(res.body.errorCode).toBe('NOTIFY_REQUIRES_ACCOUNT');
        expect(db.market_requests ?? []).toHaveLength(0);
    });

    it('takes the account from the token, never from the body', async () => {
        const someoneElse = randomUUID();
        const res = await post({ market: 'AR', notify: true, user_id: someoneElse, guest_key: 'guest-abc-123' }, 'jwt');
        expect(res.status).toBe(200);
        expect(res.body.notify).toBe(true);
        const rows = db.market_requests ?? [];
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ requester_key: `user:${USER_ID}`, user_id: USER_ID, guest_key: null, notify: true });
    });

    it('says so when the market is already covered', async () => {
        const res = await post({ market: 'DE', guest_key: 'guest-abc-123' });
        expect(res.status).toBe(409);
        expect(res.body.errorCode).toBe('MARKET_COVERED');
        expect(db.market_requests ?? []).toHaveLength(0);
    });

    it('rejects a malformed market, a missing guest key and unknown areas', async () => {
        expect((await post({ market: 'Brazil', guest_key: 'guest-abc-123' })).status).toBe(400);
        expect((await post({ market: 'BR' })).status).toBe(400);
        expect((await post({ market: 'BR', guest_key: 'a b' })).status).toBe(400);
        await post({ market: 'BR', domains: ['tax-vat', 'not-a-domain', 42], guest_key: 'guest-abc-123' });
        expect((db.market_requests ?? [])[0].domains).toEqual(['tax-vat']);
    });

    it('keeps the language of the request for the update, and only the four we write', async () => {
        await post({ market: 'AR', notify: true, locale: 'de-DE' }, 'jwt');
        await post({ market: 'BR', notify: true, locale: 'fr' }, 'jwt');
        const byMarket = Object.fromEntries((db.market_requests ?? []).map((r) => [r.market, r.locale]));
        expect(byMarket).toEqual({ AR: 'de', BR: null });
    });

    it('answers broken JSON with 400 and a reference', async () => {
        const res = await api('/api/v1/market-requests', { method: 'POST', auth: 'none', body: '{broken' });
        expect(res.status).toBe(400);
        expect(res.body.errorCode).toBe('INVALID_JSON');
        expect(typeof res.body.correlationId).toBe('string');
    });
});

// ─── Markt-Update: der Versand (Watcher) ─────────────────────────────────────
// "Email me when <market> is covered" (F3). Abgedeckt heisst: die Engine hat ein
// Laenderprofil. BR hat keins, DE schon — eine DE-Zeile steht hier fuer einen
// Markt, der nach der Anfrage in die Engine gekommen ist (ueber die API laesst
// sie sich nicht anlegen, die antwortet 409).

describe('Watcher: Markt-Update', () => {
    const OTHER = '00000000-0000-4000-8000-0000000000b2';
    const seed = () => {
        db.auth_users = [
            { id: USER_ID, email: 'jana@example.com', email_confirmed_at: '2026-09-01T00:00:00Z' },
            { id: OTHER, email: 'offen@example.com', email_confirmed_at: null },
        ];
        db.market_requests = [
            { id: 'mr-de', requester_key: `user:${USER_ID}`, user_id: USER_ID, guest_key: null, market: 'DE', notify: true, notified_at: null, locale: 'de' },
            { id: 'mr-br', requester_key: `user:${USER_ID}`, user_id: USER_ID, guest_key: null, market: 'BR', notify: true, notified_at: null, locale: 'de' },
            { id: 'mr-nl-no', requester_key: `user:${USER_ID}`, user_id: USER_ID, guest_key: null, market: 'NL', notify: false, notified_at: null, locale: null },
            { id: 'mr-nl-guest', requester_key: 'guest:guest-abc-123', user_id: null, guest_key: 'guest-abc-123', market: 'NL', notify: false, notified_at: null, locale: null },
        ];
    };
    const tick = () => api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}' });
    const mails = () => (db.event_log ?? []).filter((e) => e.payload?.kind === 'market_covered');

    it('mails once, in the language of the request, only for a covered market someone asked an update for', async () => {
        seed();
        process.env.WATCHERS_SHADOW = 'false';
        try {
            const r1 = await tick();
            expect(r1.body.summary.marketCoveredNotices).toBe(1);
            const sent = mails();
            expect(sent).toHaveLength(1);
            expect(sent[0].type).toBe('email_outbox');
            expect(sent[0].payload).toMatchObject({ requestId: 'mr-de', market: 'DE', to: 'jana@example.com' });
            expect(sent[0].payload.subject).toBe('Deutschland ist jetzt auf CompliHub360 abgedeckt');
            expect(sent[0].payload.text).toContain('/de/wizard');
            expect(db.market_requests.find((r: any) => r.id === 'mr-de').notified_at).toBeTruthy();
            // Nicht abgedeckt, kein Update gewuenscht, Gast: nichts.
            for (const id of ['mr-br', 'mr-nl-no', 'mr-nl-guest']) {
                expect(db.market_requests.find((r: any) => r.id === id).notified_at).toBeNull();
            }
            const r2 = await tick();
            expect(r2.body.summary.marketCoveredNotices).toBe(0);
            expect(mails()).toHaveLength(1);
        } finally {
            delete process.env.WATCHERS_SHADOW;
        }
    });

    it('does not mail a row another tick has already claimed', async () => {
        seed();
        db.market_requests.find((r: any) => r.id === 'mr-de').notified_at = '2026-10-01T08:00:00Z';
        process.env.WATCHERS_SHADOW = 'false';
        try {
            await tick();
            expect(mails()).toHaveLength(0);
        } finally {
            delete process.env.WATCHERS_SHADOW;
        }
    });

    it('sends one mail when two passes run at the same time (claim before send)', async () => {
        seed();
        const { runMarketCoverageTick } = await import('../watchers.js');
        const { supabaseApi } = await import('../supabase.js');
        // Der Testspeicher gibt Objekt-Referenzen heraus; eine echte Datenbank
        // liefert einen Schnappschuss. Ohne Kopie saehe der zweite Durchlauf
        // die Aenderung des ersten und der Claim bliebe ungeprueft.
        const original = supabaseApi.select.bind(supabaseApi);
        const spy = vi.spyOn(supabaseApi, 'select').mockImplementation(async (...args: Parameters<typeof original>) =>
            JSON.parse(JSON.stringify(await original(...args))));
        try {
            // Beide lesen dieselbe offene Zeile; nur einer bekommt den Claim.
            const [a, b] = await Promise.all([runMarketCoverageTick(false), runMarketCoverageTick(false)]);
            expect(a.notices + b.notices).toBe(1);
            expect(mails()).toHaveLength(1);
        } finally {
            spy.mockRestore();
        }
    });

    it('writes to no unconfirmed address — and does not try again', async () => {
        seed();
        db.market_requests = [{ id: 'mr-x', requester_key: `user:${OTHER}`, user_id: OTHER, guest_key: null, market: 'DE', notify: true, notified_at: null, locale: null }];
        process.env.WATCHERS_SHADOW = 'false';
        try {
            await tick();
            await tick();
            const ev = mails();
            expect(ev).toHaveLength(1);
            expect(ev[0].type).toBe('email_skipped_no_address');
            expect(JSON.stringify(ev[0].payload)).not.toContain('offen@example.com');
        } finally {
            delete process.env.WATCHERS_SHADOW;
        }
    });

    it('says what happened and what is possible now — no pressure, one mail only', async () => {
        const { renderMarketCoveredMail } = await import('../mailer.js');
        const en = renderMarketCoveredMail('BR', null);
        expect(en.subject).toBe('Brazil is now covered on CompliHub360');
        expect(en.text).toContain('which requirements may apply');
        expect(en.text).toContain('/en/wizard');
        expect(en.text).toContain('This is the only email we send about this request.');
        expect(renderMarketCoveredMail('BR', 'tr').subject).toBe('Brezilya artık CompliHub360\'ta kapsanıyor');
        // Abgenommen 01.10.2026 (Nutzer, nach der echten Mail auf Staging):
        // wortgleich halten — eine Aenderung braucht eine neue Abnahme.
        const url = (loc: string) => `${(process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '')}/${loc}/wizard`;
        expect(en.text).toBe([
            'You asked us to let you know when we cover Brazil. We do now.',
            '',
            'You can create a Risk Map for Brazil and see which requirements may apply to your business.',
            '',
            `→ Create a Risk Map: ${url('en')}`,
            '',
            'This is the only email we send about this request.',
        ].join('\n'));
        const de = renderMarketCoveredMail('DE', 'de');
        expect(de.subject).toBe('Deutschland ist jetzt auf CompliHub360 abgedeckt');
        expect(de.text).toBe([
            'Sie hatten uns gebeten, Ihnen Bescheid zu geben, sobald wir Deutschland abdecken. Das ist jetzt der Fall.',
            '',
            'Sie können eine Risk Map für Deutschland erstellen und sehen, welche Anforderungen für Ihr Unternehmen gelten können.',
            '',
            `→ Risk Map erstellen: ${url('de')}`,
            '',
            'Dies ist die einzige E-Mail, die wir zu dieser Anfrage senden.',
        ].join('\n'));
        expect(renderMarketCoveredMail('BR', 'xx').subject).toBe(en.subject);
    });

    it('in shadow mode only marks — no mail, the row stays open', async () => {
        seed();
        await tick();
        await tick();
        expect(mails()).toHaveLength(0);
        expect((db.event_log ?? []).filter((e) => e.type === 'market_covered_notice_shadow')).toHaveLength(1);
        expect(db.market_requests.find((r: any) => r.id === 'mr-de').notified_at).toBeNull();
    });
});

/** Monatsschritt mit Kuerzung — spiegelt addMonths aus subscriptions.ts. */
function addMonthsIso(dateIso: string, months: number): string {
    const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
    const t = m - 1 + months;
    const ty = y + Math.floor(t / 12);
    const tm = ((t % 12) + 12) % 12;
    const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

// ─── Ein Abo kann entstehen (TKT-PROV-07) ────────────────────────────────────
// Bis zum 2026-10-01 hatte `provider_subscriptions` keinen Schreiber: kein
// Checkout, keine Admin-Zuweisung. Weil `billingReadiness` ein laufendes Abo
// verlangt, war damit niemand buchbar. Diese Tests nageln den Weg hinein fest —
// und die beiden Grenzen, die dabei nicht verrutschen durften: kein stiller
// Tarifwechsel, und ein Tarif macht allein noch nicht buchbar.

describe('Abo-Schreiber — Tarifwahl, Admin-Zuweisung, Periode', () => {
    it('GET /subscription zeigt vorher kein Abo, aber die waehlbaren Tarife', async () => {
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/subscription');
        expect(r.status).toBe(200);
        expect(r.body.subscription).toBeNull();
        expect(r.body.plans.map((p: any) => p.code)).toEqual(['essential', 'growth', 'global']);
        expect(r.body.plans[1]).toMatchObject({ monthly_cents: 9900, annual_cents: 99000, currency: 'USD' });
    });

    it('die Tarifwahl legt das Abo an, mit Periode, Herkunft und Protokolleintrag', async () => {
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'growth', cadence: 'monthly' }),
        });
        expect(r.status).toBe(201);
        expect(r.body.subscription).toMatchObject({ plan_code: 'growth', cadence: 'monthly', status: 'active' });

        const row = db.provider_subscriptions[0];
        expect(row).toMatchObject({ provider_key: 'test-kanzlei', plan_code: 'growth', source: 'provider_self_serve', status: 'active' });
        // Der Stub setzt keine Spalten-Defaults: hier undefined, in Postgres
        // NULL. `openRow` prueft auf falsy, beides traegt.
        expect(row.ended_at ?? null).toBeNull();
        // Beim Monatsabo fallen Zyklusende und Verlaengerung zusammen; beim
        // Jahresabo nicht (eigener Test unten).
        expect(row.current_period_end).toBe(row.renewal_date);
        expect(row.current_period_end > row.current_period_start).toBe(true);

        // Der Anbieter sieht den Vorgang in seiner eigenen Historie.
        expect(db.provider_review_log.map((l: any) => [l.subject, l.action, l.to_value]))
            .toContainEqual(['subscription', 'subscription_started', 'growth/monthly']);
        expect(db.event_log.map((e: any) => e.type)).toContain('provider_subscription_started');
    });

    it('Jahresabo: der Zyklus bleibt ein MONAT, nur die Verlaengerung liegt ein Jahr weiter', async () => {
        // Die erste Fassung dieses PRs hat hier einen ein Jahr langen Zyklus
        // gesetzt. Weil `cycleStartFor` den Rabattzaehler am Zyklusbeginn
        // festmacht, haette der Anbieter seine 15 % auf die ersten sechs Leads
        // dann einmal im JAHR bekommen statt im Monat — zu seinen Lasten.
        // Spec B: "The counter resets on the monthly billing-cycle date."
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'global', cadence: 'annual' }),
        });
        expect(r.status).toBe(201);
        const row = db.provider_subscriptions[0];
        const { current_period_start: s, current_period_end: e, renewal_date: ren } = row;

        // Zyklus: genau ein Monat.
        expect(e).toBe(addMonthsIso(s, 1));
        // Verlaengerung: ein Jahr — und damit NICHT das Zyklusende.
        expect(ren).toBe(addMonthsIso(s, 12));
        expect(ren).not.toBe(e);
    });

    it('ein zweites Abo wird abgelehnt — ein Tarifwechsel ist hier bewusst nicht moeglich', async () => {
        // Spec B laesst "proration, cancellation notice, grace period,
        // failed-payment retry, and reactivation rules" ausdruecklich offen.
        // Ein Wechsel per Tarifwahl wuerde eine Pro-rata-Regel erfinden.
        seedProvider();
        seedPricing();
        await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'essential', cadence: 'monthly' }),
        });
        const second = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'global', cadence: 'monthly' }),
        });
        expect(second.status).toBe(409);
        expect(second.body.errorCode).toBe('SUBSCRIPTION_EXISTS');
        expect(db.provider_subscriptions).toHaveLength(1);
        expect(db.provider_subscriptions[0].plan_code).toBe('essential');
    });

    it('weist einen unbekannten Tarif und eine unbekannte Zahlweise ab', async () => {
        seedProvider();
        seedPricing();
        const a = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'platinum', cadence: 'monthly' }),
        });
        expect(a.status).toBe(400);
        expect(a.body.errorCode).toBe('UNKNOWN_PLAN');
        const b = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'growth', cadence: 'weekly' }),
        });
        expect(b.status).toBe(400);
        expect(db.provider_subscriptions ?? []).toHaveLength(0);
    });

    it('ein Tarif allein macht noch nicht buchbar — die Zahlungsmethode fehlt weiter', async () => {
        // Die Grenze aus TKT-PROV-05: das Abo ist EINE von sieben Bedingungen.
        // Waere das anders, wuerde ein bezahlter Tarif Buchbarkeit kaufen.
        seedProvider({ billing_ready: false, billing_block_reasons: ['inactive_subscription'] });
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'growth', cadence: 'monthly' }),
        });
        expect(r.status).toBe(201);
        const p = db.providers.find((x: any) => x.provider_key === 'test-kanzlei');
        expect(p.billing_ready).toBe(false);
        expect(p.billing_block_reasons).toContain('no_payment_method');
        expect(p.billing_block_reasons).not.toContain('inactive_subscription');
    });

    it.each([['terminated'], ['suspended']])(
        'ein %s Konto kann keinen Tarif beginnen — auch nicht per Admin-Zuweisung', async (status) => {
        // Geld von einem Konto zu nehmen, das nicht vermittelt werden kann,
        // waere Geld fuer nichts: "Businesses should not pay for services they
        // do not need."
        seedProvider({ lifecycle_status: status });
        seedPricing();
        const self = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'growth', cadence: 'monthly' }),
        });
        expect(self.status).toBe(409);
        expect(self.body.errorCode).toBe('PROVIDER_NOT_ELIGIBLE');

        const admin = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'start', plan_code: 'growth', cadence: 'monthly' }),
        });
        expect(admin.status).toBe(409);
        expect(admin.body.errorCode).toBe('PROVIDER_NOT_ELIGIBLE');
        expect(db.provider_subscriptions ?? []).toHaveLength(0);
    });

    it.each([['draft'], ['submitted'], ['paused']])(
        'ein %s Konto darf dagegen einen Tarif beginnen — Abrechnung und Aktivierung sind zwei Achsen', async (status) => {
        seedProvider({ lifecycle_status: status });
        seedPricing();
        const r = await api('/api/v1/provider/test-kanzlei/subscription', {
            method: 'POST', body: JSON.stringify({ plan_code: 'essential', cadence: 'monthly' }),
        });
        expect(r.status).toBe(201);
    });

    it('Admin-Zuweisung: beenden und neu beginnen sind zwei sichtbare Vorgaenge', async () => {
        seedProvider();
        seedPricing();
        const start = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'start', plan_code: 'essential', cadence: 'monthly' }),
        });
        expect(start.status).toBe(201);
        expect(db.provider_subscriptions[0].source).toBe('admin');

        // Ohne Beenden kein Wechsel — auch nicht fuer den Admin.
        const blocked = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'start', plan_code: 'growth', cadence: 'monthly' }),
        });
        expect(blocked.status).toBe(409);

        const ended = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'end', reason: 'Umstellung auf Growth' }),
        });
        expect(ended.status).toBe(200);
        expect(ended.body.ended_plan).toBe('essential');
        // 'ended' und ended_at gehoeren zusammen — die Tabelle verlangt das.
        expect(db.provider_subscriptions[0].status).toBe('ended');
        expect(db.provider_subscriptions[0].ended_at).toBeTruthy();

        const again = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'start', plan_code: 'growth', cadence: 'annual' }),
        });
        expect(again.status).toBe(201);
        expect(db.provider_subscriptions).toHaveLength(2);
        expect(db.provider_review_log.filter((l: any) => l.subject === 'subscription')).toHaveLength(3);
    });

    it('Beenden ohne laufendes Abo ist ein 409, kein stiller Erfolg', async () => {
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/admin/provider-subscriptions', {
            method: 'POST', body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'end' }),
        });
        expect(r.status).toBe(409);
        expect(r.body.errorCode).toBe('NO_SUBSCRIPTION');
    });

    it('die Admin-Zuweisung ist nicht fuer einen angemeldeten Anbieter offen', async () => {
        seedProvider();
        seedPricing();
        const r = await api('/api/v1/admin/provider-subscriptions', {
            auth: 'jwt', method: 'POST',
            body: JSON.stringify({ provider_key: 'test-kanzlei', action: 'start', plan_code: 'global', cadence: 'monthly' }),
        });
        expect(r.status).toBe(403);
        expect(db.provider_subscriptions ?? []).toHaveLength(0);
    });

    it('der Waechter-Pass rollt den Zyklus eines JAHRESabos monatlich weiter', async () => {
        // Der Fall, der vorher falsch war: zwoelf Zyklen im Jahr, nicht einer.
        // Der Verlaengerungstermin wird dabei vom Abo-Beginn aus gerechnet.
        seedProvider();
        seedPricing();
        seedSubscription('test-kanzlei', 'global', {
            cadence: 'annual', current_period_start: '2026-08-05', current_period_end: '2026-09-05',
            started_at: '2026-08-05T00:00:00Z', renewal_date: '2027-08-05',
        });
        const { runSubscriptionPeriodTick } = await import('../subscriptions.js');
        const r = await runSubscriptionPeriodTick(false, new Date('2026-11-20T00:00:00Z'));
        expect(r.rolled).toBe(1);
        expect(db.provider_subscriptions[0]).toMatchObject({
            current_period_start: '2026-11-05', current_period_end: '2026-12-05',
            renewal_date: '2027-08-05',
        });
    });

    it('der Waechter-Pass rollt eine abgelaufene Periode weiter', async () => {
        seedProvider();
        seedPricing();
        seedSubscription('test-kanzlei', 'growth', {
            current_period_start: '2026-01-01', current_period_end: '2026-02-01', started_at: '2026-01-01T00:00:00Z',
        });
        const { runSubscriptionPeriodTick } = await import('../subscriptions.js');
        const r = await runSubscriptionPeriodTick(false, new Date('2026-03-15T00:00:00Z'));
        expect(r.rolled).toBe(1);
        expect(db.provider_subscriptions[0]).toMatchObject({ current_period_start: '2026-03-01', current_period_end: '2026-04-01' });
        expect(db.event_log.map((e: any) => e.type)).toContain('provider_subscription_period_rolled');
    });

    it('der Waechter-Pass laesst ein beendetes Abo in Ruhe', async () => {
        seedProvider();
        seedPricing();
        seedSubscription('test-kanzlei', 'growth', {
            current_period_start: '2026-01-01', current_period_end: '2026-02-01',
            status: 'ended', ended_at: '2026-02-01T00:00:00Z',
        });
        const { runSubscriptionPeriodTick } = await import('../subscriptions.js');
        const r = await runSubscriptionPeriodTick(false, new Date('2026-03-15T00:00:00Z'));
        expect(r.rolled).toBe(0);
        expect(db.provider_subscriptions[0].current_period_end).toBe('2026-02-01');
    });

    it('Shadow zaehlt, schreibt aber nicht', async () => {
        seedProvider();
        seedPricing();
        seedSubscription('test-kanzlei', 'growth', {
            current_period_start: '2026-01-01', current_period_end: '2026-02-01',
        });
        const { runSubscriptionPeriodTick } = await import('../subscriptions.js');
        const r = await runSubscriptionPeriodTick(true, new Date('2026-03-15T00:00:00Z'));
        expect(r.rolled).toBe(1);
        expect(db.provider_subscriptions[0].current_period_end).toBe('2026-02-01');
    });
});
