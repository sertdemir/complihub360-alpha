import { supabaseApi } from './supabase.js';
import type { IncomingMessage, ServerResponse } from "http";

// ─── Wem gehoert ein Anbieter-Konto? ─────────────────────────────────────────
//
// Bis 2026-09-22 verlangte jede Route /api/v1/provider/:key/* nur einen
// gueltigen Login — irgendeinen. Wer eingeloggt war, konnte fremde Profile
// aendern, fremde Leads samt Kontaktdaten der Nutzer lesen und das
// Stripe-Portal fremder Anbieter oeffnen.
//
// Die Pruefung sitzt deshalb NICHT in den einzelnen Handlern, sondern einmal
// vor der Routen-Kette in index.ts: eine neue Route unter dem Anbieter-Pfad
// ist ab dem ersten Tag geschuetzt, ohne dass jemand daran denken muss.
//
// Grundlage ist `provider_members` (Migration 20260922000000).

// Die Routen, die einem Anbieter SELBST gehoeren. Bewusst NICHT darunter:
//   /detail, /slots, /reviews, /website — die ruft der Nutzer auf, der einen
//     Anbieter ansieht oder gebucht hat; ihre Anonymitaet regelt Phase 3.
//   /intake, /magic/*, /confirm, /reply, /decline, /confirm-email — dort ist
//     ein Einmal-Token bzw. das Intake-Secret der Ausweis.
//
// Phase 2 (Onboarding): application, services[/:id[/coverage]],
// evidence/(upload-url|registry|:id/confirm), agreements, submit, verification.
const OWN_PROVIDER_ROUTE =
    /^\/api\/v1\/provider\/([a-z0-9-]+)\/(bookings|coverage|profile|invoices|availability|billing-portal|change-email|billing\/preview|application|services(?:\/[^/?]+(?:\/coverage)?)?|evidence\/(?:upload-url|registry|[^/?]+\/confirm)|agreements|submit|verification)(\?.*)?$/;

/** Liefert den provider_key, wenn die URL eine Anbieter-eigene Route ist. */
export function ownProviderRouteKey(url: string | undefined): string | null {
    const m = OWN_PROVIDER_ROUTE.exec(url || '');
    return m ? m[1] : null;
}

export type Caller = {
    userId: string | null;
    isAdmin: boolean;
    viaApiKey: boolean;
};

/** Ist der Aufrufer Mitglied dieses Anbieters? Admin und Server-Key duerfen immer. */
export async function canAccessProvider(caller: Caller, providerKey: string): Promise<boolean> {
    if (caller.viaApiKey || caller.isAdmin) return true;
    if (!caller.userId) return false;
    const rows = (await supabaseApi.select('provider_members',
        { provider_key: providerKey, user_id: caller.userId }, { limit: 1 })) as unknown[];
    return rows.length > 0;
}

/** Der Anbieter, zu dem ein Login gehoert — oder null. Zum Launch hoechstens einer. */
export async function providerKeyForUser(userId: string): Promise<{ providerKey: string; role: string } | null> {
    const rows = (await supabaseApi.select('provider_members', { user_id: userId }, { limit: 1 })) as any[];
    return rows[0] ? { providerKey: rows[0].provider_key, role: rows[0].role ?? 'owner' } : null;
}

/**
 * Adresse -> Login-UUID. Geht ueber `auth_user_id_by_email`, weil das Schema
 * `auth` in PostgREST nicht offenliegt (und nicht offenliegen soll: dort
 * stehen Passwort-Hashes und Token). Die Funktion gibt NULL zurueck, wenn
 * keine oder mehr als eine Zeile passt.
 */
export async function authUserIdByEmail(email: string): Promise<string | null> {
    const wert = email.trim();
    if (!wert) return null;
    const roh = await supabaseApi.rpc('auth_user_id_by_email', { p_email: wert });
    // PostgREST antwortet auf eine Funktion mit Skalar-Rueckgabe mit dem Wert
    // selbst. Die Zeilenform wird trotzdem mitgelesen: sie ist das, was jede
    // andere Stelle hier von `rpc` zurueckbekommt, und eine stumme Fehlannahme
    // waere hier eine Verknuepfung, die nicht zustande kommt — ohne dass
    // jemand sieht, warum.
    const wert_aus_zeile = Array.isArray(roh)
        ? (roh[0] as Record<string, unknown> | undefined)?.auth_user_id_by_email
        : roh;
    return typeof wert_aus_zeile === 'string' && wert_aus_zeile ? wert_aus_zeile : null;
}

function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

/**
 * GET /api/v1/me/provider — welches Dashboard gehoert zu diesem Login?
 * Ersetzt den fest verdrahteten Demo-Anbieter in der UI. 404 heisst ehrlich:
 * dieser Login ist (noch) keinem Anbieter zugeordnet.
 */
export async function handleMeProvider(res: ServerResponse, correlationId: string, userId: string | null) {
    res.setHeader('x-correlation-id', correlationId);
    if (!userId) {
        json(res, 401, { errorCode: 'UNAUTHORIZED', message: 'Login required', correlationId });
        return;
    }
    try {
        const member = await providerKeyForUser(userId);
        if (!member) {
            json(res, 404, { errorCode: 'NOT_A_PROVIDER', message: 'This login is not linked to a provider account', correlationId });
            return;
        }
        const rows = (await supabaseApi.select('providers', { provider_key: member.providerKey }, { limit: 1 })) as any[];
        const p = rows[0];
        json(res, 200, {
            ok: true,
            provider_key: member.providerKey,
            role: member.role,
            name: p?.name ?? null,
            lifecycle_status: p?.lifecycle_status ?? null,
            correlationId,
        });
    } catch {
        json(res, 500, { errorCode: 'INTERNAL', message: 'Provider lookup failed', correlationId });
    }
}

/**
 * POST /api/v1/admin/provider/:key/member  { email } | { user_id }
 * Verknuepft einen Login mit einem Anbieter. Nur Admin oder Server-Key.
 * Die Launch-Grenze (ein Login je Anbieter, ein Anbieter je Login) prueft
 * die Datenbank per Unique-Index; hier wird sie vorher lesbar gemeldet.
 */
export async function handleAdminLinkMember(req: IncomingMessage, res: ServerResponse, correlationId: string,
    caller: Caller, providerKey: string) {
    res.setHeader('x-correlation-id', correlationId);
    if (!caller.isAdmin && !caller.viaApiKey) {
        json(res, 403, { errorCode: 'FORBIDDEN', message: 'Admin only', correlationId });
        return;
    }
    let body = '';
    req.on('data', (chunk: any) => body += chunk.toString());
    req.on('end', async () => {
        try {
            const d = JSON.parse(body || '{}');
            let userId: string | null = typeof d.user_id === 'string' ? d.user_id : null;
            if (!userId && typeof d.email === 'string') {
                // KORREKTUR 2026-09-22: die Adresse wurde vorher in
                // `public.users` gesucht. Dort steht ein frisch angelegter
                // Login nicht — die Profilzeile entsteht erst, wenn jemand
                // eine Gast-Sitzung uebernimmt (adoption.ts). Ein Anbieter,
                // der nie den Assistenten benutzt hat, war damit per E-Mail
                // unauffindbar, obwohl sein Konto existiert und er sich
                // anmelden kann.
                //
                // Die Funktion liefert nur bei GENAU einem Treffer eine UUID
                // (Migration 20260922010000) — dieselbe Regel wie vorher, nur
                // jetzt in der Tabelle, in der die Logins wirklich liegen.
                userId = await authUserIdByEmail(d.email);
            }
            if (!userId) {
                json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'user_id or a known email required', correlationId });
                return;
            }
            const provider = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
            if (!provider.length) {
                json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId });
                return;
            }
            const taken = (await supabaseApi.select('provider_members', { provider_key: providerKey })) as any[];
            if (taken.some((m) => m.user_id !== userId)) {
                json(res, 409, { errorCode: 'PROVIDER_HAS_USER', message: 'This provider already has its dashboard user', correlationId });
                return;
            }
            const elsewhere = (await supabaseApi.select('provider_members', { user_id: userId })) as any[];
            if (elsewhere.some((m) => m.provider_key !== providerKey)) {
                json(res, 409, { errorCode: 'USER_HAS_PROVIDER', message: 'This login already belongs to another provider', correlationId });
                return;
            }
            if (!taken.length) {
                await supabaseApi.insert('provider_members', { provider_key: providerKey, user_id: userId, role: 'owner' });
                await supabaseApi.insert('event_log', { type: 'provider_member_linked', payload: { providerKey, userId, by: caller.viaApiKey ? 'api_key' : caller.userId } });
            }
            json(res, 201, { ok: true, provider_key: providerKey, user_id: userId, correlationId });
        } catch {
            json(res, 500, { errorCode: 'INTERNAL', message: 'Linking failed', correlationId });
        }
    });
}
