import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signState, verifyState, authUrl, exchangeCode, hostedAuthConfigured, settingsUrl } from '../nylasAuth.js';

// ─── Nylas Hosted Auth (Beta-Plan Fr 16.10.) ────────────────────────────────
// Der state ist das Credential des Rueckwegs: signiert, mit Ablauf, und nur
// mit dem eigenen Geheimnis gueltig.

beforeEach(() => {
    process.env.NYLAS_API_KEY = 'nyk_test';
    process.env.NYLAS_CLIENT_ID = 'client-123';
    process.env.NYLAS_CALLBACK_URI = 'https://api.test/api/v1/nylas/callback';
    delete process.env.NYLAS_STATE_SECRET;
    process.env.PUBLIC_APP_URL = 'https://app.test/';
});
afterEach(() => vi.unstubAllGlobals());

describe('state', () => {
    it('signiert, prueft und liest Anbieter und Sprache', () => {
        const s = signState('test-kanzlei', 'de');
        expect(verifyState(s)).toMatchObject({ p: 'test-kanzlei', l: 'de' });
    });

    it('verworfen: veraendert, abgelaufen, fremdes Geheimnis, Unsinn', () => {
        const s = signState('test-kanzlei', 'de', 1_000);
        expect(verifyState(s, 1_000 + 16 * 60 * 1000)).toBeNull();
        const fresh = signState('test-kanzlei', 'de');
        const [payload, mac] = fresh.split('.');
        const forged = Buffer.from(JSON.stringify({ p: 'fremde-kanzlei', l: 'de', exp: Date.now() + 60_000, n: 'x' })).toString('base64url');
        expect(verifyState(`${forged}.${mac}`)).toBeNull();
        process.env.NYLAS_STATE_SECRET = 'anderes-geheimnis';
        expect(verifyState(`${payload}.${mac}`)).toBeNull();
        expect(verifyState('kaputt')).toBeNull();
        expect(verifyState(null)).toBeNull();
    });

    it('unbekannte Sprache wird Englisch', () => {
        expect(verifyState(signState('k', 'fr'))?.l).toBe('en');
    });
});

describe('Konfiguration und URLs', () => {
    it('braucht Key, Client-ID und Callback', () => {
        expect(hostedAuthConfigured()).toBe(true);
        delete process.env.NYLAS_CLIENT_ID;
        expect(hostedAuthConfigured()).toBe(false);
    });

    it('Auth-URL auf der EU-Region mit Client, Callback und state', () => {
        const u = new URL(authUrl('st.ate'));
        expect(u.origin).toBe('https://api.eu.nylas.com');
        expect(u.pathname).toBe('/v3/connect/auth');
        expect(Object.fromEntries(u.searchParams)).toEqual({ client_id: 'client-123', redirect_uri: 'https://api.test/api/v1/nylas/callback', response_type: 'code', state: 'st.ate' });
    });

    it('Rueckweg in die Einstellungen der Sprache', () => {
        expect(settingsUrl('de', 'connected')).toBe('https://app.test/de/partner-dashboard/settings?calendar=connected');
        expect(settingsUrl('xx', 'failed')).toBe('https://app.test/en/partner-dashboard/settings?calendar=failed');
    });
});

describe('exchangeCode', () => {
    it('tauscht den Code und liefert Grant und Adresse', async () => {
        const f = vi.fn(async () => new Response(JSON.stringify({ grant_id: 'g-1', email: 'kanzlei@example.com' }), { status: 200 }));
        vi.stubGlobal('fetch', f);
        expect(await exchangeCode('code-1')).toEqual({ grantId: 'g-1', email: 'kanzlei@example.com' });
        const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://api.eu.nylas.com/v3/connect/token');
        expect(JSON.parse(String(init.body))).toMatchObject({ client_id: 'client-123', client_secret: 'nyk_test', grant_type: 'authorization_code', code: 'code-1' });
    });

    it('Fehler oder unvollstaendige Antwort: null, kein Wurf', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 400 })));
        expect(await exchangeCode('x')).toBeNull();
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ grant_id: 'g' }), { status: 200 })));
        expect(await exchangeCode('x')).toBeNull();
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        expect(await exchangeCode('x')).toBeNull();
    });
});
