import { beforeEach, describe, expect, it, vi } from 'vitest';

const structuredLog = vi.fn();
vi.mock('@complihub360/types', () => ({ structuredLog: (...a: unknown[]) => structuredLog(...a) }));

import { checkDependencies, dependencyReport, logReport, requiredDependencies, resetDependencyCache, unknownRequired, type DependencyReport } from '../dependencyCheck.js';

// Systemcheck 24.11.2026, Befund 4: niemand pruefte, ob die Schluessel noch
// gelten. Was hier haelt: jede Anbindung wird einmal LESEND gefragt, das
// Ergebnis nennt nie ein Geheimnis, und ein abgewiesener Schluessel sieht
// nie wie "alles gut" aus.

const ENV = {
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
  STRIPE_SECRET_KEY: 'rk_test_stripe-secret',
  RESEND_API_KEY: 're_resend-secret',
  NYLAS_API_KEY: 'nyk_nylas-secret',
  LLM_API_KEY: 'llm-secret',
};
const SECRETS = ['service-secret', 'rk_test_stripe-secret', 're_resend-secret', 'nyk_nylas-secret', 'llm-secret'];

type Reply = { status: number; body?: unknown } | 'down';
function fetchWith(replies: Record<string, Reply>) {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, method: String(init?.method || 'GET') });
    const key = Object.keys(replies).find((k) => url.includes(k));
    const r: Reply = key ? replies[key] : { status: 200, body: {} };
    if (r === 'down') throw new Error('connect ETIMEDOUT');
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status });
  };
  return { fetchImpl, calls };
}
const state = (r: DependencyReport, name: string) => r.checks.find((c) => c.name === name)?.state;
const note = (r: DependencyReport, name: string) => r.checks.find((c) => c.name === name)?.note;

beforeEach(() => { structuredLog.mockReset(); resetDependencyCache(); });

describe('checkDependencies', () => {
  it('alles antwortet: ok, und jede Gegenseite wurde nur gelesen', async () => {
    const { fetchImpl, calls } = fetchWith({ '/v3/grants/': { status: 200, body: { data: { grant_status: 'valid' } } } });
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: ['g1', 'g2'] });
    expect(r.ok).toBe(true);
    expect(r.checks.map((c) => c.name)).toEqual(['database', 'stripe', 'mail', 'calendar', 'calendar_grants', 'llm']);
    expect(r.checks.every((c) => c.state === 'ok')).toBe(true);
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
    // Kein Aufruf, der etwas ausloest: keine Mail, keine Belastung, kein Chat.
    expect(calls.some((c) => /\/emails|payment_intents|chat\/completions|embeddings/.test(c.url))).toBe(false);
  });

  it('nennt nie ein Geheimnis und nie einen Antwortkoerper', async () => {
    const { fetchImpl } = fetchWith({
      'api.stripe.com': { status: 401, body: { error: { message: 'Invalid API Key provided: rk_test_stripe-secret' } } },
      'api.resend.com': { status: 403, body: { name: 'validation_error', message: 'API key re_resend-secret is invalid' } },
    });
    const text = JSON.stringify(await checkDependencies({ env: ENV, fetchImpl, grantIds: ['grant-id-123'] }));
    for (const s of SECRETS) expect(text).not.toContain(s);
    expect(text).not.toContain('Invalid API Key');
    expect(text).not.toContain('grant-id-123');
  });

  it('abgewiesener Schluessel: rejected, der Bericht ist nicht ok', async () => {
    const { fetchImpl } = fetchWith({ 'api.stripe.com': { status: 401 } });
    const r = await checkDependencies({ env: ENV, fetchImpl });
    expect(state(r, 'stripe')).toBe('rejected');
    expect(r.ok).toBe(false);
  });

  it('keine Antwort: unreachable, nicht ok', async () => {
    const { fetchImpl } = fetchWith({ 'api.scaleway.ai': 'down' });
    const r = await checkDependencies({ env: ENV, fetchImpl });
    expect(state(r, 'llm')).toBe('unreachable');
    expect(r.ok).toBe(false);
  });

  it('5xx der Gegenseite: error, nicht ok', async () => {
    const { fetchImpl } = fetchWith({ 'db.example.test': { status: 503 } });
    const r = await checkDependencies({ env: ENV, fetchImpl });
    expect(state(r, 'database')).toBe('error');
    expect(r.ok).toBe(false);
  });

  it('Stripe: der Modus steht im Hinweis, aus dem Praefix gelesen', async () => {
    const { fetchImpl } = fetchWith({});
    expect(note(await checkDependencies({ env: ENV, fetchImpl }), 'stripe')).toBe('mode_test');
    expect(note(await checkDependencies({ env: { ...ENV, STRIPE_SECRET_KEY: 'sk_live_x' }, fetchImpl }), 'stripe')).toBe('mode_live');
  });

  it('Resend: ein Schluessel, der nur senden darf, gilt als gueltig', async () => {
    const { fetchImpl } = fetchWith({ 'api.resend.com': { status: 401, body: { name: 'restricted_api_key', message: 'This API key is restricted to only send emails' } } });
    const r = await checkDependencies({ env: ENV, fetchImpl });
    expect(state(r, 'mail')).toBe('ok');
    expect(note(r, 'mail')).toBe('send_only_key');
  });

  it('Resend: ein ungueltiger Schluessel bleibt abgewiesen', async () => {
    const { fetchImpl } = fetchWith({ 'api.resend.com': { status: 403, body: { name: 'validation_error' } } });
    const r = await checkDependencies({ env: ENV, fetchImpl });
    expect(state(r, 'mail')).toBe('rejected');
    expect(note(r, 'mail')).toBe('validation_error');
  });

  it('Kalenderfreigaben: eine abgelaufene macht den Bericht rot und wird gezaehlt', async () => {
    const { fetchImpl } = fetchWith({
      '/v3/grants/good': { status: 200, body: { data: { grant_status: 'valid' } } },
      '/v3/grants/expired': { status: 200, body: { data: { grant_status: 'invalid' } } },
      '/v3/grants/gone': { status: 404 },
    });
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: ['good', 'expired', 'gone', 'good'] });
    expect(state(r, 'calendar_grants')).toBe('rejected');
    expect(note(r, 'calendar_grants')).toBe('grants_3_invalid_2');
    expect(r.ok).toBe(false);
  });

  it('Kalenderfreigaben: keine verbunden ist kein Befund', async () => {
    const { fetchImpl } = fetchWith({});
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: [] });
    expect(state(r, 'calendar_grants')).toBe('ok');
    expect(note(r, 'calendar_grants')).toBe('grants_0');
  });

  // Befund aus dem Review: eine gescheiterte Abfrage sah aus wie "kein Kalender verbunden".
  it('Kalenderfreigaben: nicht ladbar heisst nicht geprueft, nie gut', async () => {
    const { fetchImpl } = fetchWith({});
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: 'load_failed' });
    expect(state(r, 'calendar_grants')).toBe('error');
    expect(note(r, 'calendar_grants')).toBe('grants_not_loaded');
    expect(r.ok).toBe(false);
  });

  it('Kalenderfreigaben: gueltig ist nur, was Nylas ausdruecklich so nennt', async () => {
    const { fetchImpl } = fetchWith({ '/v3/grants/': { status: 200, body: { data: { id: 'x' } } } });
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: ['g1'] });
    expect(state(r, 'calendar_grants')).toBe('rejected');
    expect(note(r, 'calendar_grants')).toBe('grants_1_invalid_1');
  });

  it('Kalenderfreigaben: 429 und 5xx sind keine abgelaufene Freigabe, aber auch kein Gut', async () => {
    const { fetchImpl } = fetchWith({
      '/v3/grants/slow': { status: 429 },
      '/v3/grants/good': { status: 200, body: { data: { grant_status: 'valid' } } },
    });
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: ['good', 'slow'] });
    expect(state(r, 'calendar_grants')).toBe('unreachable');
    expect(note(r, 'calendar_grants')).toBe('grants_2_invalid_0_unknown_1');
    expect(r.ok).toBe(false);
  });

  it('Kalenderfreigaben: mehr als ein Lauf prueft faellt auf, statt gruen zu bleiben', async () => {
    const { fetchImpl, calls } = fetchWith({ '/v3/grants/': { status: 200, body: { data: { grant_status: 'valid' } } } });
    const ids = Array.from({ length: 53 }, (_, i) => `g${i}`);
    const r = await checkDependencies({ env: ENV, fetchImpl, grantIds: ids });
    expect(calls.filter((c) => c.url.includes('/v3/grants/'))).toHaveLength(50);
    expect(state(r, 'calendar_grants')).toBe('error');
    expect(note(r, 'calendar_grants')).toBe('grants_50_invalid_0_unchecked_3');
  });

  it('Datenbank: der oeffentliche anon-Schluessel an Stelle des Server-Schluessels wird abgewiesen, ohne Netz', async () => {
    const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;
    const { fetchImpl, calls } = fetchWith({});
    const anon = await checkDependencies({ env: { ...ENV, SUPABASE_SERVICE_ROLE_KEY: jwt('anon') }, fetchImpl });
    expect(state(anon, 'database')).toBe('rejected');
    expect(note(anon, 'database')).toBe('not_service_role');
    expect(calls.some((c) => c.url.includes('db.example.test'))).toBe(false);
    const service = await checkDependencies({ env: { ...ENV, SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') }, fetchImpl });
    expect(state(service, 'database')).toBe('ok');
  });
});

describe('nicht konfiguriert', () => {
  const bare = { SUPABASE_URL: ENV.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: ENV.SUPABASE_SERVICE_ROLE_KEY };

  it('ohne Liste: fehlende Anbindungen sind benannt, der Bericht bleibt ok', async () => {
    const { fetchImpl, calls } = fetchWith({});
    const r = await checkDependencies({ env: bare, fetchImpl });
    expect(r.ok).toBe(true);
    for (const n of ['stripe', 'mail', 'calendar', 'calendar_grants', 'llm']) expect(state(r, n)).toBe('not_configured');
    // Ohne Schluessel wird die Gegenseite gar nicht erst gefragt.
    expect(calls).toHaveLength(1);
  });

  it('mit READINESS_REQUIRED: was verlangt ist und fehlt, macht den Bericht rot', async () => {
    const { fetchImpl } = fetchWith({});
    const r = await checkDependencies({ env: { ...bare, READINESS_REQUIRED: 'mail, calendar' }, fetchImpl });
    expect(r.required).toEqual(['database', 'mail', 'calendar']);
    expect(r.ok).toBe(false);
  });

  it('die Datenbank ist immer verlangt; Unbekanntes in der Liste faellt weg', () => {
    expect(requiredDependencies({})).toEqual(['database']);
    expect(requiredDependencies({ READINESS_REQUIRED: 'Stripe,foo,stripe' })).toEqual(['database', 'stripe']);
  });

  // Befund aus dem Review: "resend" statt "mail" strich die Anforderung still.
  it('ein Tippfehler in der Liste macht den Bericht rot und wird genannt', async () => {
    expect(unknownRequired({ READINESS_REQUIRED: 'stripe, resend ,nylas' })).toEqual(['resend', 'nylas']);
    const { fetchImpl } = fetchWith({});
    const r = await checkDependencies({ env: { ...ENV, READINESS_REQUIRED: 'stripe,resend' }, fetchImpl });
    expect(r.unknownRequired).toEqual(['resend']);
    expect(r.ok).toBe(false);
    expect(logReport(r, 40_000_000)).toBe('error');
    expect(structuredLog).toHaveBeenCalledWith('error', 'Dependency check failed', expect.objectContaining({ failing: 'config:unknown_required' }));
  });
});

describe('Zwischenspeicher und Meldung', () => {
  const report = (failing: Array<[DependencyReport['checks'][number]['name'], DependencyReport['checks'][number]['state']]>): DependencyReport => ({
    ok: failing.length === 0, checkedAt: '2026-11-24T22:00:00Z', cached: false, required: ['database'], unknownRequired: [],
    checks: [{ name: 'database', state: 'ok', ms: 1 }, ...failing.map(([name, s]) => ({ name, state: s, ms: 1 }))],
  });

  it('die Route fragt die Gegenseiten hoechstens alle fuenf Minuten', async () => {
    const load = vi.fn().mockResolvedValue([]);
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const first = await dependencyReport(load, { now: 1_000_000 });
    const second = await dependencyReport(load, { now: 1_000_000 + 60_000 });
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    const fresh = await dependencyReport(load, { now: 1_000_000 + 61_000, fresh: true });
    expect(fresh.cached).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('lassen sich die Freigaben nicht laden, laufen die uebrigen Pruefungen trotzdem', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const r = await dependencyReport(() => Promise.reject(new Error('db down')), { fresh: true });
    expect(r.checks).toHaveLength(6);
    // Ohne Kalender-Schluessel bleibt es "nicht konfiguriert"; mit Schluessel
    // stuende hier grants_not_loaded (Test oben).
    expect(r.checks.find((c) => c.name === 'calendar_grants')?.state).toBe('not_configured');
    spy.mockRestore();
  });

  it('meldet beim Kippen einmal, schweigt danach und erinnert nach sechs Stunden', () => {
    const t0 = 10_000_000;
    expect(logReport(report([['stripe', 'rejected']]), t0)).toBe('error');
    expect(structuredLog).toHaveBeenCalledWith('error', 'Dependency check failed', expect.objectContaining({ errorCode: 'ERR_DEPENDENCY', failing: 'stripe:rejected', reminder: false }));
    expect(logReport(report([['stripe', 'rejected']]), t0 + 60 * 60 * 1000)).toBe('silent');
    expect(logReport(report([['stripe', 'rejected']]), t0 + 6 * 60 * 60 * 1000)).toBe('error');
    expect(structuredLog).toHaveBeenLastCalledWith('error', 'Dependency check failed', expect.objectContaining({ reminder: true }));
  });

  it('meldet sofort, wenn etwas anderes kippt, und einmal die Erholung', () => {
    const t0 = 20_000_000;
    logReport(report([['stripe', 'rejected']]), t0);
    expect(logReport(report([['stripe', 'rejected'], ['mail', 'unreachable']]), t0 + 1000)).toBe('error');
    expect(logReport(report([]), t0 + 2000)).toBe('recovered');
    expect(structuredLog).toHaveBeenLastCalledWith('info', 'Dependency check recovered', expect.objectContaining({ recoveredFrom: 'mail:unreachable,stripe:rejected' }));
    expect(logReport(report([]), t0 + 3000)).toBe('silent');
  });

  it('alles gut von Anfang an: keine Zeile', () => {
    expect(logReport(report([]), 30_000_000)).toBe('silent');
    expect(structuredLog).not.toHaveBeenCalled();
  });
});
