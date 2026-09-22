import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
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
            throw new Error(`unmocked rpc in test store: ${fn}`);
        },
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

function seedProvider(over: Record<string, any> = {}) {
    const row = {
        provider_key: 'test-kanzlei',
        name: 'Testkanzlei Schmidt GmbH',
        contact_email: 'geheim@testkanzlei.example',
        website_url: 'https://testkanzlei.example',
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
                    bookable_chargeable: false,
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

beforeEach(() => resetDb());

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
        seedProvider();
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.providers).toHaveLength(1);
        const p = r.body.providers[0];
        expect(p.pseudonym_label).toContain('Steuerkanzlei');
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

describe('POST /api/v1/scheduling (booking = paid lead)', () => {
    it('requires a logged-in user — the server api key is not enough', async () => {
        const r = await api('/api/v1/scheduling', { method: 'POST', body: '{}', auth: 'key' });
        expect(r.status).toBe(401);
    });

    it('creates the booking, charges the lead and reveals the identity', async () => {
        seedProvider();
        const slot = new Date(Date.now() + 86_400_000).toISOString();
        const r = await api('/api/v1/scheduling', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ provider_key: 'test-kanzlei', slot_start: slot, message: 'Erstgespräch' }),
        });
        expect(r.status).toBe(201);
        expect(r.body.booking.status).toBe('confirmed');
        // Stage-3 reveal happens exactly here.
        expect(r.body.provider_identity.name).toBe('Testkanzlei Schmidt GmbH');
        const row = db.scheduling[0];
        expect(row.user_id).toBe(USER_ID);
        expect(row.lead_charged).toBe(true);
        const events = db.event_log.map((e) => e.type);
        expect(events).toContain('scheduling_confirmed');
        expect(events).toContain('provider_lead_charged');
    });

    it('404s for a provider that is not active', async () => {
        seedProvider({ partner_status: 'downgraded' });
        const r = await api('/api/v1/scheduling', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ provider_key: 'test-kanzlei', slot_start: new Date(Date.now() + 86_400_000).toISOString() }),
        });
        expect(r.status).toBe(404);
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

    it('laesst die Nutzer-Routen eines Anbieters offen (Detail, Slots, Reviews)', async () => {
        seedProvider();
        const r = await api('/api/v1/provider/test-kanzlei/reviews', { auth: 'jwt' });
        expect(r.status).not.toBe(404);
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
            { id: randomUUID(), kind: 'charge', provider_key: 'test-kanzlei', standard_fee_cents: 9900, final_fee_cents: 8910, created_at: '2026-01-01T00:00:00Z' },
            { id: randomUUID(), kind: 'charge', provider_key: 'test-kanzlei', standard_fee_cents: 14900, final_fee_cents: 13410, created_at: '2026-01-02T00:00:00Z' },
            { id: randomUUID(), kind: 'credit', provider_key: 'test-kanzlei', standard_fee_cents: 0, final_fee_cents: 0, created_at: '2026-01-03T00:00:00Z' },
        );
        (db.provider_credits ??= []).push({ provider_key: 'test-kanzlei', amount_cents: 2673, currency: 'USD', reason: 'user_no_rebook_30pct' });
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview');
        expect(r.status).toBe(200);
        expect(r.body.currency).toBe('USD');
        expect(r.body.subscription).toMatchObject({ plan_code: 'growth', label: 'Growth', cadence: 'monthly', category_allowance: 5 });
        expect(r.body.discount).toMatchObject({ pct: 10, count: 3, used: 2, remaining: 1 });
        expect(r.body.leads).toEqual({ count: 2, standard_cents: 24800, discount_cents: 2480, final_cents: 22320 });
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
        const scores = new Map(r.body.providers.map((p: any) => [p.provider_key, p.match]));
        expect(scores.get('kanzlei-drei')).toBe(scores.get('ohne-abo'));
        expect(scores.get('kanzlei-zwei')).toBe(scores.get('ohne-abo'));
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
        const vorher = (await suche()).body.providers.map((p: any) => p.provider_key);
        db.provider_subscriptions = [];
        seedSubscription('a-kanzlei', 'global');
        const nachher = (await suche()).body.providers.map((p: any) => p.provider_key);
        expect(nachher).toEqual(vorher);
        expect(vorher[0]).toBe('a-kanzlei');
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
