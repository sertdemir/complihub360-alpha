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

async function loadJwks(forceFresh: boolean): Promise<Map<string, crypto.KeyObject>> {
    const now = Date.now();
    const fresh = now - jwksFetchedAt < JWKS_TTL_MS;
    const attemptedRecently = now - jwksLastAttempt < JWKS_MIN_INTERVAL_MS;
    if ((fresh && !forceFresh) || attemptedRecently) return jwksKeys;

    const url = jwksUrl();
    if (!url) return jwksKeys;
    jwksLastAttempt = now;
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
        jwksFetchedAt = now;
    } catch { /* network/parse failure → keep stale keys */ }
    return jwksKeys;
}

/** Verify signature + decode. Returns the payload object, or null. */
export async function verifySupabaseJwt(token: string): Promise<Record<string, any> | null> {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    let header: any;
    try {
        header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch { return null; }
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`);

    if (header.alg === 'HS256') {
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!jwtSecret) return null;
        const expectedSignature = crypto
            .createHmac('sha256', jwtSecret)
            .update(signedData)
            .digest('base64url');
        const sigBuf = Buffer.from(signatureB64);
        const expBuf = Buffer.from(expectedSignature);
        // Constant-time comparison to avoid signature timing leaks.
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    } else if (header.alg === 'ES256' && typeof header.kid === 'string') {
        let sig: Buffer;
        try { sig = Buffer.from(signatureB64, 'base64url'); } catch { return null; }
        // JOSE ES256 signatures are raw R||S — exactly 64 bytes.
        if (sig.length !== 64) return null;
        let key = (await loadJwks(false)).get(header.kid);
        if (!key) key = (await loadJwks(true)).get(header.kid);
        if (!key) return null;
        const ok = crypto.verify('sha256', signedData, { key, dsaEncoding: 'ieee-p1363' }, sig);
        if (!ok) return null;
    } else {
        // Pin the algorithms — reject alg:none and RS/ES "confusion" tokens.
        return null;
    }

    try {
        return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch { return null; }
}

/** Test hook: forget cached JWKS so the next verify refetches. */
export function resetJwksCacheForTests(): void {
    jwksKeys = new Map();
    jwksFetchedAt = 0;
    jwksLastAttempt = 0;
}
