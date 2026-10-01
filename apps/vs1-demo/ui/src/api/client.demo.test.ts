import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── TEMP-DEMO-DATEN ──────────────────────────────────────────────────────────
// Auf Staging (VITE_DEMO_LOGIN=1) beantwortet der Browser die Aufrufe eines
// Demo-Logins aus dem Demo-Datensatz. Echte Logins (mit Token) und Besucher
// ohne Demo-Login gehen weiter an den Server. Der Schalter wird beim Laden des
// Moduls gelesen — deshalb Env setzen, Module zuruecksetzen, dann importieren.

const token = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('../lib/supabase', () => ({ getAccessToken: async () => token.value, isMockApi: false }));

const fetchMock = vi.fn();

async function ladeClient() {
  vi.resetModules();
  return import('./client');
}

beforeEach(() => {
  vi.stubEnv('VITE_DEMO_LOGIN', '1');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, echt: true }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  token.value = null;
  localStorage.setItem('demo_is_logged_in', 'true');
  localStorage.setItem('demo_user_role', 'user');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('apiFetch · Demo-Datensatz auf Staging', () => {
  it('beantwortet den Demo-Login aus dem Datensatz, ohne den Server zu fragen', async () => {
    const { apiFetch } = await ladeClient();
    const res = await apiFetch<{ sessions: unknown[] }>('/api/v1/sessions');
    expect(res.sessions.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trennt Nutzer- und Partnersicht ueber die Demo-Rolle', async () => {
    const { apiFetch } = await ladeClient();
    type Rows = { requests: Array<{ id: string }> };
    const nutzer = await apiFetch<Rows>('/api/v1/requests?limit=5');
    localStorage.setItem('demo_user_role', 'partner');
    const partner = await apiFetch<Rows>('/api/v1/requests');
    expect(nutzer.requests.length).toBeGreaterThan(0);
    expect(partner.requests.length).toBeGreaterThan(0);
    expect(partner.requests.map((r) => r.id)).not.toEqual(nutzer.requests.map((r) => r.id));
  });

  it('wirft fuer einen Status aus dem Datensatz einen ApiError, wie der Server', async () => {
    const { apiFetch, ApiError } = await ladeClient();
    localStorage.setItem('demo_user_role', 'partner');
    const err = await apiFetch('/api/v1/admin/events').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).status).toBe(403);
  });

  it('laesst echte Logins beim Server', async () => {
    token.value = 'echter-token';
    const { apiFetch } = await ladeClient();
    expect(await apiFetch('/api/v1/sessions')).toEqual({ ok: true, echt: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('laesst Besucher ohne Demo-Login beim Server', async () => {
    localStorage.removeItem('demo_is_logged_in');
    const { apiFetch } = await ladeClient();
    await apiFetch('/api/v1/search', { method: 'POST', body: '{}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('greift ohne VITE_DEMO_LOGIN gar nicht (Produktion)', async () => {
    vi.stubEnv('VITE_DEMO_LOGIN', '');
    const { apiFetch } = await ladeClient();
    await apiFetch('/api/v1/sessions');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
