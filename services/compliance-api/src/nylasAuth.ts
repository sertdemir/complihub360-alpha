import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { structuredLog } from '@complihub360/types';

// ─── Nylas Hosted Auth: der Anbieter verbindet seinen Kalender selbst ────────
// Beta-Plan Fr 16.10. Bis hierher gab es Free/Busy und Termine (nylas.ts),
// aber keinen Weg fuer den Anbieter, ein Konto zu verbinden — die Grant-ID
// haette jemand von Hand in providers.nylas_grant_id schreiben muessen.
//
// Ablauf (Nylas v3, Region EU):
//   1. POST /provider/:key/calendar/connect  → Auth-URL mit signiertem state
//   2. Nylas/Google/Microsoft fragen den Anbieter, leiten zurueck auf
//      GET /nylas/callback?code&state
//   3. Code gegen Grant tauschen, grant_id und Adresse am Anbieter speichern,
//      zurueck in die Einstellungen des Partner-Bereichs.
//
// Der state ist das Credential des Rueckwegs: provider_key, Sprache und
// Ablauf, HMAC-signiert. Ohne gueltigen state wird nichts gespeichert. Die
// Tokens bleiben bei Nylas; wir halten nur die Grant-ID (siehe Migration
// 20261005000000). Dieses Modul wirft nicht — Fehler werden Ergebnisse.

const API_URI = () => process.env.NYLAS_API_URI || 'https://api.eu.nylas.com';
const API_KEY = () => process.env.NYLAS_API_KEY || '';
const CLIENT_ID = () => process.env.NYLAS_CLIENT_ID || '';
const CALLBACK = () => process.env.NYLAS_CALLBACK_URI || '';
const STATE_SECRET = () => process.env.NYLAS_STATE_SECRET || API_KEY();
const STATE_TTL_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 8000;
const LOCALES = new Set(['en', 'de', 'es', 'tr']);

/** Hosted Auth braucht Key, Client-ID und eine registrierte Callback-URI. */
export function hostedAuthConfigured(): boolean {
    return API_KEY().length > 0 && CLIENT_ID().length > 0 && CALLBACK().length > 0;
}

export type AuthState = { p: string; l: string; exp: number; n: string };

function sign(payload: string): string {
    return createHmac('sha256', STATE_SECRET()).update(payload).digest('base64url');
}

export function signState(providerKey: string, locale: string, now = Date.now()): string {
    const l = LOCALES.has(locale) ? locale : 'en';
    const body: AuthState = { p: providerKey, l, exp: now + STATE_TTL_MS, n: randomBytes(8).toString('base64url') };
    const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

/** Gueltiger, nicht abgelaufener state → Inhalt; sonst null. */
export function verifyState(state: string | null | undefined, now = Date.now()): AuthState | null {
    if (!state || !STATE_SECRET()) return null;
    const [payload, mac] = state.split('.');
    if (!payload || !mac) return null;
    const want = Buffer.from(sign(payload));
    const got = Buffer.from(mac);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    try {
        const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthState;
        if (typeof body.p !== 'string' || !/^[a-z0-9-]+$/.test(body.p)) return null;
        if (typeof body.exp !== 'number' || body.exp < now) return null;
        return { ...body, l: LOCALES.has(body.l) ? body.l : 'en' };
    } catch {
        return null;
    }
}

export function authUrl(state: string): string {
    const q = new URLSearchParams({
        client_id: CLIENT_ID(),
        redirect_uri: CALLBACK(),
        response_type: 'code',
        state,
    });
    return `${API_URI()}/v3/connect/auth?${q.toString()}`;
}

async function post<T>(path: string, body: unknown, method = 'POST'): Promise<{ ok: boolean; status: number; data: T | null }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${API_URI()}${path}`, {
            method,
            signal: ctrl.signal,
            headers: { Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const data = (await res.json().catch(() => null)) as T | null;
        return { ok: res.ok, status: res.status, data };
    } catch {
        return { ok: false, status: 0, data: null };
    } finally {
        clearTimeout(timer);
    }
}

/** Code gegen Grant. `email` ist die Adresse des verbundenen Kontos — sie
 *  dient als Kalender-ID (Primaerkalender) fuer Free/Busy und Termine. */
export async function exchangeCode(code: string): Promise<{ grantId: string; email: string } | null> {
    const out = await post<{ grant_id?: string; email?: string }>('/v3/connect/token', {
        client_id: CLIENT_ID(),
        client_secret: API_KEY(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK(),
    });
    const grantId = out.data?.grant_id;
    const email = out.data?.email;
    if (!out.ok || typeof grantId !== 'string' || !grantId || typeof email !== 'string' || !email) {
        structuredLog('error', 'Nylas code exchange failed', { correlationId: 'nylas-auth', route: '/api/v1/nylas/callback', severity: 'error', errorCode: 'ERR_NYLAS_EXCHANGE' });
        return null;
    }
    return { grantId, email };
}

/** Grant bei Nylas widerrufen. Best effort: scheitert es, wird lokal trotzdem
 *  getrennt — der Anbieter hat „trennen" gesagt. */
export async function revokeGrant(grantId: string): Promise<boolean> {
    const out = await post(`/v3/grants/${encodeURIComponent(grantId)}`, undefined, 'DELETE');
    return out.ok;
}

/** Wohin der Rueckweg fuehrt: die Einstellungen, mit Ergebnis als Parameter. */
export function settingsUrl(locale: string, result: 'connected' | 'failed'): string {
    const app = (process.env.PUBLIC_APP_URL || 'https://staging.complihub360.com').replace(/\/$/, '');
    const l = LOCALES.has(locale) ? locale : 'en';
    return `${app}/${l}/partner-dashboard/settings?calendar=${result}`;
}
