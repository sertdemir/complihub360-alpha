// Der Szenario-Laeufer (scripts/e2e/scenarios.mjs) gegen eine Attrappe. Dass
// seine Anfragen zu den echten Routen passen, haelt die API-Suite
// (api.test.ts, "Stufe A"). Hier zaehlt das Urteil: erkennt er, wenn die API
// etwas durchlaesst, das sie nicht durchlassen darf, und raeumt er auf?
// Laeuft in CI ueber `npm run scripts:test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runScenarios, signIn, readConfig } from './scenarios.mjs';

const TOKENS = { user: 'token-user', provider: 'token-provider' };
const REF = 'af3dcda86248';
const slotIn = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Eine API, die sich richtig verhaelt. `over` biegt einzelne Antworten um. */
function fakeApi(over = {}) {
  const calls = [];
  const bookings = new Map();
  const who = (init) => {
    const auth = init?.headers?.authorization;
    if (auth === `Bearer ${TOKENS.user}`) return 'user';
    if (auth === `Bearer ${TOKENS.provider}`) return 'provider';
    if (init?.headers?.['x-api-key'] === 'server-key') return 'server';
    return 'guest';
  };
  const reply = (status, body) => new Response(JSON.stringify(body), { status });
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const method = init.method || 'GET';
    const as = who(init);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, path, as, body });
    const key = `${method} ${path} ${as}`;
    if (over[key]) return reply(...over[key]({ body, bookings }));
    if (over[`${method} ${path}`]) return reply(...over[`${method} ${path}`]({ body, bookings, as }));

    if (path === '/api/v1/admin/readiness') return as === 'server' ? reply(200, { ok: true, checks: [] }) : as === 'guest' ? reply(401, {}) : reply(403, {});
    if (path === '/api/v1/search') return reply(200, { providers: [{ public_ref: REF, title: 'Verified Provider A' }] });
    if (path === '/api/v1/me/agreements') return as === 'guest' ? reply(401, {}) : reply(200, { agreements: { beta: { agreement: 'beta', required: true, current_version: 'beta-2026-11' } } });
    if (path === '/api/v1/me/agreements/beta') return reply(200, { ok: true });
    if (path === '/api/v1/me/provider') return as === 'provider' ? reply(200, { provider_key: 'e2e-kanzlei', lifecycle_status: 'active' }) : as === 'guest' ? reply(401, {}) : reply(404, { errorCode: 'NOT_A_PROVIDER' });
    if (path === '/api/v1/provider/e2e-kanzlei/bookings') {
      if (as === 'guest') return reply(401, {});
      if (as !== 'provider') return reply(404, { errorCode: 'NOT_FOUND' });
      return reply(200, { bookings: [...bookings.values()] });
    }
    if (path === `/api/v1/p/${REF}/slots`) return reply(200, { slots: [slotIn(3), slotIn(9)], booking_open: true });
    if (path === '/api/v1/session') return reply(201, { ok: true, id: 'session-1' });
    if (path === '/api/v1/acknowledgement') return reply(200, { version: 'booking-ack-v2' });
    if (path === '/api/v1/bookings') return as === 'guest' ? reply(401, {}) : reply(200, { bookings: [...bookings.values()] });
    if (path === '/api/v1/scheduling' && method === 'POST') {
      if (as !== 'user') return reply(401, {});
      const same = [...bookings.values()].find((b) => b.request_id === body.request_id);
      if (same) return reply(200, { booking: same, provider_identity: { name: 'E2E Kanzlei' } });
      if ([...bookings.values()].some((b) => b.slot_start === body.slot_start && b.status === 'confirmed')) return reply(409, { errorCode: 'SLOT_TAKEN' });
      const b = { id: `booking-${bookings.size + 1}`, status: 'confirmed', slot_start: body.slot_start, request_id: body.request_id, message: body.message };
      bookings.set(b.id, b);
      return reply(201, { booking: b, provider_identity: { name: 'E2E Kanzlei' } });
    }
    const m = /^\/api\/v1\/scheduling\/(.+)$/.exec(path);
    if (m && method === 'PATCH') {
      if (as === 'guest') return reply(401, {});
      const b = bookings.get(m[1]);
      if (!b) return reply(404, {});
      b.status = body.status;
      return reply(200, { ok: true });
    }
    return reply(404, { errorCode: 'NOT_FOUND' });
  };
  return { fetchImpl, calls, bookings };
}

const run = (api, level, extra = {}) => runScenarios({ apiUrl: 'https://api.example.test', level, tokens: TOKENS, apiKey: 'server-key', providerRef: REF, fetchImpl: api.fetchImpl, ...extra });
const failed = (out) => out.results.filter((r) => r.status === 'fail').map((r) => r.name);

test('smoke gegen eine korrekte API: alles bestanden, nur gelesen', async () => {
  const api = fakeApi();
  const out = await run(api, 'smoke');
  assert.deepEqual(failed(out), []);
  assert.equal(out.ok, true);
  // Die Suche ist ein POST, schreibt aber nichts; sonst darf smoke nichts senden.
  assert.deepEqual(api.calls.filter((c) => c.method !== 'GET' && c.path !== '/api/v1/search').map((c) => `${c.method} ${c.path} ${c.as}`), ['POST /api/v1/scheduling guest']);
  assert.equal(api.bookings.size, 0);
});

test('full gegen eine korrekte API: eine Buchung, am Ende abgesagt, Nachricht gekennzeichnet', async () => {
  const api = fakeApi();
  const out = await run(api, 'full');
  assert.deepEqual(failed(out), []);
  assert.equal(out.ok, true);
  assert.equal(api.bookings.size, 1);
  const [b] = api.bookings.values();
  assert.equal(b.status, 'cancelled');
  assert.match(b.message, /^\[E2E-Test\]/);
  // Gebucht wird das spaeteste Zeitfenster.
  assert.ok(Date.parse(b.slot_start) > Date.now() + 8 * 86_400_000);
});

test('Identitaet eines Anbieters vor der Buchung auf dem Draht: gescheitert', async () => {
  const api = fakeApi({ 'POST /api/v1/search': () => [200, { providers: [{ public_ref: REF, contact_email: 'kanzlei@example.test' }] }] });
  const out = await run(api, 'smoke');
  assert.equal(out.ok, false);
  assert.deepEqual(failed(out), ['Gast: Suche antwortet, Anbieter bleiben anonym']);
  assert.match(out.results.find((r) => r.status === 'fail').detail, /contact_email/);
});

test('der Nutzer kommt an fremde Leads: gescheitert', async () => {
  const api = fakeApi({ 'GET /api/v1/provider/e2e-kanzlei/bookings user': () => [200, { bookings: [{ id: 'x' }] }] });
  const out = await run(api, 'smoke');
  assert.equal(out.ok, false);
  assert.deepEqual(failed(out), ['Rechte: der Nutzer kommt nicht an die Leads des Anbieters']);
});

test('Buchen ohne Anmeldung geht durch: gescheitert', async () => {
  const api = fakeApi({ 'POST /api/v1/scheduling guest': () => [201, { booking: { id: 'x', status: 'confirmed' } }] });
  const out = await run(api, 'smoke');
  assert.deepEqual(failed(out), ['Gast: Buchungen und Buchen sind ohne Anmeldung zu']);
});

test('die Wiederholung legt eine zweite Buchung an: gescheitert, und BEIDE werden nicht bestaetigt zurueckgelassen', async () => {
  let n = 0;
  const api = fakeApi({
    'POST /api/v1/scheduling user': ({ body, bookings }) => {
      const b = { id: `dup-${++n}`, status: 'confirmed', slot_start: body.slot_start, request_id: body.request_id, message: body.message };
      bookings.set(b.id, b);
      return [201, { booking: b, provider_identity: { name: 'E2E Kanzlei' } }];
    },
  });
  const out = await run(api, 'full');
  assert.equal(out.ok, false);
  assert.ok(failed(out).includes('Buchung: dieselbe Anfrage noch einmal legt nichts Zweites an'));
  // Jede Buchung, die dieser Lauf ausgeloest hat, ist am Ende abgesagt, auch die unerwarteten.
  assert.ok(api.bookings.size >= 2);
  assert.deepEqual([...api.bookings.values()].map((b) => b.status), [...api.bookings.values()].map(() => 'cancelled'));
});

test('scheitert die Absage, raeumt der Laeufer trotzdem auf und meldet beides', async () => {
  let first = true;
  const api = fakeApi({
    'PATCH /api/v1/scheduling/booking-1 user': ({ bookings }) => {
      if (first) { first = false; return [500, { errorCode: 'INTERNAL' }]; }
      bookings.get('booking-1').status = 'cancelled';
      return [200, { ok: true }];
    },
  });
  const out = await run(api, 'full');
  assert.equal(out.ok, false);
  assert.ok(failed(out).includes('Absage: der Nutzer sagt ab, die Buchung steht als abgesagt da'));
  assert.equal(out.results.find((r) => r.name === 'Aufraeumen: die Testbuchung absagen').status, 'pass');
  assert.equal(api.bookings.get('booking-1').status, 'cancelled');
});

test('Buchung nicht moeglich: die abhaengigen Schritte sind uebersprungen, nicht bestanden', async () => {
  const api = fakeApi({ 'POST /api/v1/scheduling user': () => [409, { errorCode: 'PROVIDER_NOT_BOOKABLE' }] });
  const out = await run(api, 'full');
  assert.equal(out.ok, false);
  assert.match(out.results.find((r) => r.status === 'fail').detail, /PROVIDER_NOT_BOOKABLE/);
  assert.ok(out.skipped >= 5);
  assert.equal(api.bookings.size, 0);
});

test('Gebuehr oder Zahlungsweg in der Antwort an den Nutzer: gescheitert, Buchung wird abgesagt', async () => {
  const api = fakeApi({
    'POST /api/v1/scheduling user': ({ body, bookings }) => {
      const b = { id: 'leak-1', status: 'confirmed', slot_start: body.slot_start, request_id: body.request_id, message: body.message };
      bookings.set(b.id, b);
      return [201, { booking: { ...b, final_fee_cents: 8910 }, provider_identity: { name: 'E2E Kanzlei' } }];
    },
  });
  const out = await run(api, 'full');
  assert.equal(out.ok, false);
  assert.match(out.results.find((r) => r.status === 'fail').detail, /fee_cents/);
  assert.equal(api.bookings.get('leak-1').status, 'cancelled');
});

test('ein Lauf, in dem nichts geprueft wurde, ist nicht bestanden', async () => {
  const api = { fetchImpl: async () => { throw new Error('connect ECONNREFUSED'); } };
  const out = await run(api, 'smoke');
  assert.equal(out.ok, false);
  assert.equal(out.passed, 0);
});

test('unbekannte Stufe wirft, statt still smoke zu fahren', async () => {
  await assert.rejects(() => run(fakeApi(), 'everything'), /unknown level/);
});

test('signIn: eine gescheiterte Anmeldung nennt den Status, nie Adresse, Passwort oder Antwort', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error_description: 'Invalid login credentials for e2e-user@example.test' }), { status: 400 });
  await assert.rejects(
    () => signIn({ supabaseUrl: 'https://db.example.test', anonKey: 'anon', email: 'e2e-user@example.test', password: 'geheim-123', fetchImpl }),
    (err) => { assert.match(err.message, /Status 400/); assert.doesNotMatch(err.message, /e2e-user|geheim|Invalid login/); return true; },
  );
});

test('signIn: gibt das Token zurueck und schickt das Passwort nur an Supabase', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url, body: JSON.parse(init.body), apikey: init.headers.apikey }); return new Response(JSON.stringify({ access_token: 'jwt-1' }), { status: 200 }); };
  const token = await signIn({ supabaseUrl: 'https://db.example.test/', anonKey: 'anon', email: 'a@b.test', password: 'pw', fetchImpl });
  assert.equal(token, 'jwt-1');
  assert.equal(seen[0].url, 'https://db.example.test/auth/v1/token?grant_type=password');
  assert.equal(seen[0].apikey, 'anon');
});

test('readConfig: nennt, was fehlt; full braucht eine ausdrueckliche Erlaubnis', () => {
  assert.deepEqual(readConfig({}).missing, ['API_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD', 'E2E_PROVIDER_EMAIL', 'E2E_PROVIDER_PASSWORD']);
  const full = { API_URL: 'a', SUPABASE_URL: 'b', SUPABASE_ANON_KEY: 'c', E2E_USER_EMAIL: 'd', E2E_USER_PASSWORD: 'e', E2E_PROVIDER_EMAIL: 'f', E2E_PROVIDER_PASSWORD: 'g' };
  assert.deepEqual(readConfig(full).missing, []);
  assert.equal(readConfig(full).level, 'smoke');
  assert.equal(readConfig({ ...full, E2E_LEVEL: 'full' }).allowFull, false);
  assert.equal(readConfig({ ...full, E2E_LEVEL: 'full', E2E_ALLOW_FULL: 'true' }).allowFull, true);
});
