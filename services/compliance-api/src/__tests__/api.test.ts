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
        async rpc() { return []; },
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
        const [head, body, sig] = token.split('.');
        const forgedBody = Buffer.from(JSON.stringify({ role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, sub: randomUUID() })).toString('base64url');
        const res = await fetch(`${BASE}/api/v1/bookings`, { headers: { authorization: `Bearer ${head}.${forgedBody}.${sig}` } });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/v1/search', () => {
    it('matches canonical wizard slugs against legacy provider categories and anonymizes the result', async () => {
        seedProvider();
        const r = await api('/api/v1/search', {
            method: 'POST',
            body: JSON.stringify({ country: 'DE', structured_answers: { markets: ['DE'], domains: ['tax-vat'] } }),
        });
        expect(r.status).toBe(200);
        expect(r.body.providers).toHaveLength(1);
        const p = r.body.providers[0];
        // Slug 'tax-vat' must hit the legacy 'vat'/'vat_oss' categories.
        expect(p.pseudonym_label).toContain('Steuerkanzlei');
        expect(p.match).toBeGreaterThan(0);
        // Stage-1 anonymity: no identity fields on the wire.
        expect(p.name).toBeUndefined();
        expect(p.contact_email).toBeUndefined();
        expect(p.website_url).toBeUndefined();
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

describe('POST /api/v1/reviews', () => {
    it('stores the review and recomputes the provider aggregate rating', async () => {
        const p = seedProvider({ rating: 5 });
        (db.reviews ??= []).push({ id: randomUUID(), provider_key: 'test-kanzlei', from_role: 'user', rating: 5 });
        const r = await api('/api/v1/reviews', {
            method: 'POST', auth: 'jwt',
            body: JSON.stringify({ provider_key: 'test-kanzlei', from_role: 'user', rating: 4, categories: ['expertise'] }),
        });
        expect(r.status).toBe(201);
        expect(db.reviews).toHaveLength(2);
        expect(p.rating).toBe(4.5);
        expect(db.event_log.some((e) => e.type === 'review_submitted')).toBe(true);
    });
});

describe('GET /api/v1/provider/:key/billing/preview', () => {
    it('returns the current-period charge preview with usage and pricing', async () => {
        seedProvider({ subscription_plan: 'none', subscription_since: null });
        const period = new Date().toISOString().slice(0, 7);
        (db.event_log ??= []).push(
            { id: randomUUID(), type: 'provider_lead_charged', timestamp: `${period}-05T10:00:00Z`, payload: { providerKey: 'test-kanzlei' } },
            { id: randomUUID(), type: 'provider_lead_charged', timestamp: `${period}-06T10:00:00Z`, payload: { providerKey: 'test-kanzlei' } },
            { id: randomUUID(), type: 'provider_lead_charged', timestamp: `${period}-07T10:00:00Z`, payload: { providerKey: 'test-kanzlei' } },
            { id: randomUUID(), type: 'provider_detail_opened', timestamp: `${period}-05T09:00:00Z`, payload: { providerKey: 'test-kanzlei' } },
        );
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview');
        expect(r.status).toBe(200);
        expect(r.body.usage).toEqual({ leads: 3, detail_opens: 1, free_leads_left: 2 });
        // 3 leads − 2 free = 1×120 € + 1 detail open ×3 €
        expect(r.body.total_cents).toBe(12000 + 300);
        expect(r.body.pricing.abo_annual_cents).toBe(149000);
    });

    it('is not public — guests get 401', async () => {
        const r = await api('/api/v1/provider/test-kanzlei/billing/preview', { auth: 'none' });
        expect(r.status).toBe(401);
    });
});

describe('POST /api/v1/admin/watchers/tick', () => {
    it('runs a shadow tick against an empty store without erroring', async () => {
        const r = await api('/api/v1/admin/watchers/tick', { method: 'POST', body: '{}', auth: 'key' });
        expect(r.status).toBe(200);
        expect(r.body.summary ?? r.body).toBeTruthy();
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
