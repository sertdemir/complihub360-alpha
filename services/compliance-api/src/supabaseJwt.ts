// Signature verification for Supabase access tokens.
//
// Two schemes, matching what Supabase actually issues:
//  - HS256 with SUPABASE_JWT_SECRET — legacy projects, local dev, tests.
//  - ES256 against the project's public JWKS — projects migrated to the
//    asymmetric "JWT signing keys" (staging is one of them; the kid in the
//    token header selects the key).
// Anything else (alg:none, RS*, missing kid) is rejected.
//
// Returns the decoded payload ONLY when the signature checks out; claim
// checks (exp/nbf/role) stay with the caller so the auth gate keeps one
// single place that decides who counts as authenticated.

import crypto from 'node:crypto';
import { structuredLog } from '@complihub360/types';

type Jwk = crypto.JsonWebKey & { kid?: string };

// JWKS cache: refreshed lazily, kept on fetch failure so a Supabase blip
// doesn't log everyone out. A forced refresh (unknown kid → possible key
// rotation) is rate-limited so a flood of bogus tokens can't hammer the
// endpoint.
let jwksKeys = new Map<string, crypto.KeyObject>();
let jwksFetchedAt = 0;
let jwksLastAttempt = 0;
const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_MIN_INTERVAL_MS = 30 * 1000;

function jwksUrl(): string | null {
    const base = process.env.SUPABASE_URL;
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;
}

// Ein laufender Abruf wird geteilt. Bis 20.10.2026 sahen parallele Aufrufe
// waehrend des ersten Abrufs "gerade versucht" und bekamen die leere Karte:
// Nach jedem API-Neustart scheiterten die ersten Anfragen eines frisch
// angemeldeten Nutzers mit es256_unknown_kid, knownKeys 0, und die App
// meldete ihn sofort wieder ab (Beta-Klicktest).
let jwksInflight: Promise<Map<string, crypto.KeyObject>> | null = null;

async function loadJwks(forceFresh: boolean): Promise<Map<string, crypto.KeyObject>> {
    const now = Date.now();
    const fresh = now - jwksFetchedAt < JWKS_TTL_MS;
    if (fresh && !forceFresh) return jwksKeys;
    if (jwksInflight) return jwksInflight;
    // Die Bremse gilt nur, solange Schluessel da sind: Sie schuetzt vor einer
    // Flut erfundener kids, darf aber einen leeren Cache nicht festhalten.
    const attemptedRecently = now - jwksLastAttempt < JWKS_MIN_INTERVAL_MS;
    if (attemptedRecently && jwksKeys.size > 0) return jwksKeys;

    const url = jwksUrl();
    if (!url) return jwksKeys;
    jwksLastAttempt = now;
    jwksInflight = (async () => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`jwks http ${res.status}`);
            const body = (await res.json()) as { keys?: Jwk[] };
            const next = new Map<string, crypto.KeyObject>();
            for (const jwk of body.keys ?? []) {
                if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.kid) continue;
                try {
                    next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
                } catch { /* skip malformed key, keep the rest */ }
            }
            jwksKeys = next;
            jwksFetchedAt = Date.now();
        } catch (err) {
            // Stale Schluessel bleiben; der Fehler wird aber nicht mehr verschluckt.
            structuredLog('warn', 'JWKS fetch failed', {
                correlationId: 'jwks', errorCode: 'ERR_JWKS_FETCH', severity: 'warn', route: 'auth/jwks',
                knownKeys: jwksKeys.size, error: err instanceof Error ? err.message : String(err),
            });
        } finally {
            jwksInflight = null;
        }
        return jwksKeys;
    })();
    return jwksInflight;
}

/** Why a token was rejected — logged by the auth gate, never the token itself. */
export type JwtRejectReason =
    | 'malformed' | 'hs256_no_secret' | 'hs256_bad_signature'
    | 'es256_unknown_kid' | 'es256_bad_signature' | 'unsupported_alg';

export interface JwtCheck {
    payload: Record<string, any> | null;
    reason: JwtRejectReason | null;
    alg?: string;
    kid?: string;
    /** Wie viele Schluessel der JWKS-Cache gerade kennt (0 = Abruf gescheitert oder leer). */
    knownKeys?: number;
}

/** Verify signature + decode, with the reason on failure. */
export async function checkSupabaseJwt(token: string): Promise<JwtCheck> {
    const parts = token.split('.');
    if (parts.length !== 3) return { payload: null, reason: 'malformed' };
    const [headerB64, payloadB64, signatureB64] = parts;

    let header: any;
    try {
        header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch { return { payload: null, reason: 'malformed' }; }
    const alg = typeof header.alg === 'string' ? header.alg : undefined;
    const kid = typeof header.kid === 'string' ? header.kid : undefined;
    const fail = (reason: JwtRejectReason, knownKeys?: number): JwtCheck => ({ payload: null, reason, alg, kid, knownKeys });
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`);

    if (header.alg === 'HS256') {
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!jwtSecret) return fail('hs256_no_secret');
        const expectedSignature = crypto
            .createHmac('sha256', jwtSecret)
            .update(signedData)
            .digest('base64url');
        const sigBuf = Buffer.from(signatureB64);
        const expBuf = Buffer.from(expectedSignature);
        // Constant-time comparison to avoid signature timing leaks.
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return fail('hs256_bad_signature');
    } else if (header.alg === 'ES256' && typeof header.kid === 'string') {
        let sig: Buffer;
        try { sig = Buffer.from(signatureB64, 'base64url'); } catch { return fail('malformed'); }
        // JOSE ES256 signatures are raw R||S — exactly 64 bytes.
        if (sig.length !== 64) return fail('es256_bad_signature');
        let keys = await loadJwks(false);
        let key = keys.get(header.kid);
        if (!key) { keys = await loadJwks(true); key = keys.get(header.kid); }
        if (!key) return fail('es256_unknown_kid', keys.size);
        const ok = crypto.verify('sha256', signedData, { key, dsaEncoding: 'ieee-p1363' }, sig);
        if (!ok) return fail('es256_bad_signature', keys.size);
    } else {
        // Pin the algorithms — reject alg:none and RS/ES "confusion" tokens.
        return fail('unsupported_alg');
    }

    try {
        return { payload: JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')), reason: null, alg, kid };
    } catch { return fail('malformed'); }
}

/** Verify signature + decode. Returns the payload object, or null. */
export async function verifySupabaseJwt(token: string): Promise<Record<string, any> | null> {
    return (await checkSupabaseJwt(token)).payload;
}

/** Test hook: forget cached JWKS so the next verify refetches. */
export function resetJwksCacheForTests(): void {
    jwksKeys = new Map();
    jwksFetchedAt = 0;
    jwksLastAttempt = 0;
    jwksInflight = null;
}
