import { IncomingMessage, ServerResponse } from "http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Signup adoption (Wave A3 / backlog "Signup-Adoption") ────────────────────
// When a guest registers or signs in with real Supabase auth, the account
// claims the sessions created anonymously under their guest_key
// (localStorage `ch360_guest_key`, a client-side random UUID):
//   1. Upsert the public.users row (id = JWT sub, email = JWT email).
//   2. Backfill sessions.user_id for all unclaimed rows with that guest_key.
// Requires a real user JWT — API-key (server-to-server) callers carry no user
// identity and are rejected with SIGNIN_REQUIRED.

export type AdoptIdentity = { userId: string | null; email: string | null };

// Guest keys are crypto.randomUUID() values, but stay lenient for legacy
// client-generated keys: URL-safe token, 8-100 chars.
const GUEST_KEY_RE = /^[A-Za-z0-9._-]{8,100}$/;

export function handleAuthAdopt(
    req: IncomingMessage,
    res: ServerResponse,
    correlationId: string,
    identity: AdoptIdentity,
): void {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); if (raw.length > 8_000) req.destroy(); });
    req.on('end', async () => {
        res.setHeader('x-correlation-id', correlationId);
        try {
            if (!identity.userId) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'SIGNIN_REQUIRED', message: 'A signed-in Supabase user is required to adopt guest sessions', correlationId }));
                return;
            }

            let body: { guest_key?: unknown };
            try {
                body = JSON.parse(raw || '{}') as { guest_key?: unknown };
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }));
                return;
            }
            const guestKey = typeof body.guest_key === 'string' ? body.guest_key.trim() : '';
            if (!GUEST_KEY_RE.test(guestKey)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'guest_key is required (8-100 URL-safe characters)', correlationId }));
                return;
            }

            // 1. Ensure the public.users row exists (id references auth.users,
            // so the verified JWT sub always satisfies the FK). Never downgrade
            // an existing role — only lift 'guest' to 'registered'.
            const existing = (await supabaseApi.select('users', { id: identity.userId }, { limit: 1 })) as
                Array<{ id: string; email: string; role: string }>;
            if (!existing.length) {
                // Concurrent adopt calls may race on the insert — the loser's
                // duplicate-key error is harmless, the row exists either way.
                await supabaseApi.insert('users', {
                    id: identity.userId,
                    email: identity.email ?? '',
                    role: 'registered',
                }).catch(() => { /* row already created by a concurrent call */ });
            } else {
                const patch: Record<string, string> = {};
                if (identity.email && identity.email !== existing[0].email) patch.email = identity.email;
                if (existing[0].role === 'guest') patch.role = 'registered';
                if (Object.keys(patch).length) {
                    await supabaseApi.update('users', { id: identity.userId }, patch);
                }
            }

            // 2. Claim all unclaimed sessions anchored to this guest_key.
            // Already-claimed rows (any user_id, including this one) are left
            // untouched so re-login or a shared device never re-assigns data.
            const rows = (await supabaseApi.select('sessions', { guest_key: guestKey })) as
                Array<{ id: string; user_id: string | null }>;
            let adopted = 0;
            for (const row of rows) {
                if (row.user_id) continue;
                const updated = (await supabaseApi.update('sessions', { id: row.id }, { user_id: identity.userId })) as unknown[];
                adopted += updated.length;
            }

            // 3. Dasselbe fuer die Anbieter-Lesezeichen (Migration 20260923010000).
            //
            // Ohne diesen Schritt verloere ein Gast seine Merkliste genau in dem
            // Moment, in dem er ein Konto anlegt — die Liste haengt danach an
            // einem guest_key, den die angemeldete Ansicht nicht mehr fragt.
            //
            // Hat das Konto denselben Anbieter schon gemerkt, bleibt die
            // Gast-Zeile liegen statt den Teil-Index zu verletzen. Sie ist
            // dann doppelt und wird beim naechsten Aufraeumen unauffaellig;
            // die Konto-Zeile gewinnt, weil sie die aeltere Absicht traegt.
            const gemerkt = (await supabaseApi.select('saved_providers', { guest_key: guestKey })) as
                Array<{ id: string; provider_key: string; user_id: string | null }>;
            const schonImKonto = new Set(((await supabaseApi.select('saved_providers',
                { user_id: identity.userId })) as Array<{ provider_key: string }>).map((r) => r.provider_key));
            let lesezeichen = 0;
            for (const row of gemerkt) {
                if (row.user_id) continue;
                if (schonImKonto.has(row.provider_key)) continue;
                const updated = (await supabaseApi.update('saved_providers', { id: row.id },
                    { user_id: identity.userId, guest_key: null })) as unknown[];
                lesezeichen += updated.length;
                schonImKonto.add(row.provider_key);
            }

            // Event log without PII: counts only, no email / keys.
            await supabaseApi.insert('event_log', {
                type: 'sessions_adopted',
                payload: { adopted, total_for_key: rows.length, saved_providers: lesezeichen },
            }).catch(() => { /* non-blocking */ });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, adopted, savedProviders: lesezeichen, correlationId }));
        } catch {
            structuredLog('error', 'Signup adoption failed', { correlationId, errorCode: 'ERR_ADOPTION', severity: 'error', route: '/api/v1/auth/adopt' });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Adoption failed', correlationId }));
        }
    });
}
