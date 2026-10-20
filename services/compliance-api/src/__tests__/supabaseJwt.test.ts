import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkSupabaseJwt, resetJwksCacheForTests } from '../supabaseJwt.js';

// ─── Ablehnung mit Grund (20.10.2026) ───────────────────────────────────────
// Beta-Klicktest: Login klappte, die API lehnte das Token still ab, die App
// meldete "Sitzung abgelaufen". Das Tor loggt jetzt den Grund; hier ist
// festgehalten, dass jeder Fall seinen eigenen Grund bekommt.

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'ES256', use: 'sig', key_ops: ['verify'], ext: true };

function es256(kid: string, payload: object, key = privateKey) {
  const head = `${b64({ alg: 'ES256', kid, typ: 'JWT' })}.${b64(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(head), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${sig}`;
}

beforeEach(() => {
  resetJwksCacheForTests();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })));
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.SUPABASE_JWT_SECRET; });

describe('checkSupabaseJwt', () => {
  it('ES256 mit bekanntem Schluessel: Payload, kein Grund (Gegenprobe)', async () => {
    const r = await checkSupabaseJwt(es256('k1', { sub: 'u1', role: 'authenticated' }));
    expect(r.reason).toBeNull();
    expect(r.payload?.sub).toBe('u1');
  });

  it('unbekannte kid: es256_unknown_kid mit Anzahl bekannter Schluessel', async () => {
    const r = await checkSupabaseJwt(es256('fremd', { sub: 'u1' }));
    expect(r).toMatchObject({ payload: null, reason: 'es256_unknown_kid', kid: 'fremd', knownKeys: 1 });
  });

  it('falsche Signatur: es256_bad_signature', async () => {
    const other = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
    const r = await checkSupabaseJwt(es256('k1', { sub: 'u1' }, other));
    expect(r.reason).toBe('es256_bad_signature');
  });

  it('HS256 ohne Secret, alg none, kaputtes Token', async () => {
    expect((await checkSupabaseJwt(`${b64({ alg: 'HS256' })}.${b64({})}.x`)).reason).toBe('hs256_no_secret');
    expect((await checkSupabaseJwt(`${b64({ alg: 'none' })}.${b64({})}.`)).reason).toBe('unsupported_alg');
    expect((await checkSupabaseJwt('kein-token')).reason).toBe('malformed');
  });
});

describe('JWKS-Abruf unter Last (Beta 20.10.2026: fuenf Aufrufe, knownKeys 0)', () => {
  it('parallele Aufrufe teilen EINEN Abruf und kommen alle durch', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const fetchMock = vi.fn(async () => { await gate; return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }); });
    vi.stubGlobal('fetch', fetchMock);
    const token = es256('k1', { sub: 'u1', role: 'authenticated' });
    const runs = Array.from({ length: 5 }, () => checkSupabaseJwt(token));
    release();
    const results = await Promise.all(runs);
    expect(results.map((r) => r.reason)).toEqual([null, null, null, null, null]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gescheiterter Abruf haelt den leeren Cache nicht fest und wird geloggt', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue(new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const token = es256('k1', { sub: 'u1', role: 'authenticated' });
    // Erster Abruf scheitert (geloggt), die unbekannte kid loest sofort den
    // zweiten aus — die 30-s-Bremse greift bei leerem Cache nicht.
    expect((await checkSupabaseJwt(token)).reason).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('ERR_JWKS_FETCH'))).toBe(true);
    warn.mockRestore();
  });
});
