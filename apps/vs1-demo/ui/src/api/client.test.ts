import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError, referenceOf } from './client';

// ─── Referenz-ID ("Technical details", Canvas-Wahl B3) ────────────────────────
// Scheitert ein Aufruf, braucht der Nutzer eine Referenz, die der Support im
// Server-Log wiederfindet: die `x-correlation-id`, die der Browser mitschickt.
// Diese Tests halten fest, dass jeder Fehlerweg sie traegt — auch der, auf dem
// gar keine Antwort zurueckkommt — und dass es die ist, unter der geloggt wurde.

vi.mock('../lib/supabase', () => ({ getAccessToken: async () => null, isMockApi: false }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** Die ID, die apiFetch beim n-ten Aufruf gesendet hat. */
const gesendet = (n = 0) => (fetchMock.mock.calls[n][1] as RequestInit & { headers: Record<string, string> }).headers['x-correlation-id'];
const antwort = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

async function fehlerVon(p: Promise<unknown>): Promise<ApiError> {
  const err = await p.then(() => { throw new Error('kein Fehler'); }, (e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

describe('apiFetch · Referenz-ID', () => {
  it('traegt die gesendete ID, wenn gar keine Antwort kommt', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await fehlerVon(apiFetch('/api/v1/search'));
    expect(err.status).toBe(0);
    expect(err.correlationId).toBe(gesendet());
    expect(referenceOf(err)?.id).toBe(gesendet());
  });

  it('nimmt bei einem HTTP-Fehler die ID, unter der der Server geloggt hat', async () => {
    fetchMock.mockResolvedValue(antwort(500, { errorCode: 'INTERNAL', message: 'Search failed', correlationId: 'server-ersetzt-1234' }));
    const err = await fehlerVon(apiFetch('/api/v1/search'));
    expect(err.status).toBe(500);
    expect(err.correlationId).toBe('server-ersetzt-1234');
  });

  it('faellt auf den Antwort-Header zurueck, dann auf die gesendete ID', async () => {
    fetchMock.mockResolvedValueOnce(antwort(502, '<html>Bad Gateway</html>', { 'x-correlation-id': 'aus-dem-header-99' }));
    expect((await fehlerVon(apiFetch('/a'))).correlationId).toBe('aus-dem-header-99');

    fetchMock.mockResolvedValueOnce(antwort(502, '<html>Bad Gateway</html>'));
    expect((await fehlerVon(apiFetch('/b'))).correlationId).toBe(gesendet(1));
  });

  it('meldet einen unlesbaren 200-Koerper als Fehler mit ID', async () => {
    fetchMock.mockResolvedValue(antwort(200, '<html>Proxy</html>'));
    const err = await fehlerVon(apiFetch('/api/v1/search'));
    expect(err.correlationId).toBe(gesendet());
  });

  it('sendet je Aufruf eine eigene ID und stempelt den Fehler in UTC', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const a = await fehlerVon(apiFetch('/a'));
    const b = await fehlerVon(apiFetch('/b'));
    expect(a.correlationId).not.toBe(b.correlationId);
    expect(a.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('erfindet keine Referenz fuer Fehler, die nicht aus apiFetch kommen', () => {
    expect(referenceOf(new Error('irgendwas'))).toBeNull();
    expect(referenceOf(undefined)).toBeNull();
  });
});
