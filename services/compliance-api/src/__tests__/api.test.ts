import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';

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
        async upsert(table: string, _onConflict: string, data: any) {
            const rows = Array.isArray(data) ? data : [data];
            (db[table] ??= []).push(...rows.map((r) => ({ id: randomUUID(), ...r })));
            return rows;
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
