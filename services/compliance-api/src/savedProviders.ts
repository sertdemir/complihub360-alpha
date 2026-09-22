import { supabaseApi } from './supabase.js';
import type { IncomingMessage, ServerResponse } from 'http';

// ─── Das Anbieter-Lesezeichen ────────────────────────────────────────────────
//
// Grundlage: Entscheidung vom 2026-09-20 (Nutzer-Wahl 1b/1c/1d), Tabelle in
// Migration 20260923010000.
//
// Zwei Ausweise, nach Rang — dieselbe Regel wie bei GET /sessions: ein
// verifizierter JWT schlaegt den `guest_key`. Der guest_key steht im
// localStorage EINES Browsers; wer sich am Telefon anmeldet, haette sonst eine
// leere Merkliste, obwohl die Lesezeichen laengst seinem Konto gehoeren.

const GUEST_KEY_RE = /^[A-Za-z0-9._-]{8,100}$/;
const PROVIDER_KEY_RE = /^[a-z0-9-]{1,80}$/;
const QUELLEN = ['risk_map', 'thread', 'provider_page'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Besitzer = { user_id: string } | { guest_key: string };

function json(res: ServerResponse, status: number, body: unknown, correlationId: string) {
    res.setHeader('x-correlation-id', correlationId);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

/**
 * Wem gehoert diese Merkliste? Angemeldet gewinnt; sonst der guest_key, wenn er
 * die Form hat. `null` heisst: der Aufrufer hat keinen Anspruch auf eine Liste.
 */
export function besitzerAus(authUserId: string | null, guestKey: string | null | undefined): Besitzer | null {
    if (authUserId) return { user_id: authUserId };
    if (typeof guestKey === 'string' && GUEST_KEY_RE.test(guestKey)) return { guest_key: guestKey };
    return null;
}

/** GET /api/v1/me/saved-providers[?guest_key=…] — die eigene Merkliste. */
export async function handleListSaved(req: IncomingMessage, res: ServerResponse, correlationId: string,
    authUserId: string | null) {
    const u = new URL(req.url || '', 'http://localhost');
    const besitzer = besitzerAus(authUserId, u.searchParams.get('guest_key'));
    if (!besitzer) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'guest_key required', correlationId }, correlationId);
        return;
    }
    const rows = (await supabaseApi.select('saved_providers', besitzer,
        { order: 'created_at.desc', limit: 200 })) as Array<Record<string, unknown>>;
    json(res, 200, { ok: true, saved: rows }, correlationId);
}

/**
 * POST /api/v1/me/saved-providers — merken.
 *
 * Bewusst idempotent: zweimal auf dasselbe Lesezeichen zu tippen ist kein
 * Fehler, den der Nutzer sehen sollte. Steht die Zeile schon, kommt sie
 * unveraendert zurueck — samt der urspruenglichen Herkunft. Das zweite Merken
 * darf `source` NICHT ueberschreiben: "woher gemerkt" meint das erste Mal.
 */
export async function handleSaveProvider(req: IncomingMessage, res: ServerResponse, correlationId: string,
    authUserId: string | null) {
    let body = '';
    req.on('data', (c: any) => body += c.toString());
    req.on('end', async () => {
        let d: Record<string, unknown>;
        try { d = JSON.parse(body || '{}'); }
        catch { json(res, 400, { errorCode: 'INVALID_JSON', message: 'Invalid JSON payload', correlationId }, correlationId); return; }

        const besitzer = besitzerAus(authUserId, typeof d.guest_key === 'string' ? d.guest_key : null);
        if (!besitzer) {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'guest_key required', correlationId }, correlationId);
            return;
        }
        const providerKey = typeof d.provider_key === 'string' ? d.provider_key.trim() : '';
        if (!PROVIDER_KEY_RE.test(providerKey)) {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'provider_key required', correlationId }, correlationId);
            return;
        }
        const source = typeof d.source === 'string' ? d.source : '';
        if (!(QUELLEN as readonly string[]).includes(source)) {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: `source must be one of ${QUELLEN.join(', ')}`, correlationId }, correlationId);
            return;
        }
        // Die Sitzung ist optional und nur bei einem Treffer aus der Risk Map
        // sinnvoll. Ein Wert in falscher Form wird still weggelassen statt die
        // ganze Anfrage abzuweisen — das Lesezeichen ist wichtiger als seine
        // Herkunft.
        const sessionId = typeof d.session_id === 'string' && UUID_RE.test(d.session_id) ? d.session_id : null;

        // Gibt es den Anbieter ueberhaupt? Sonst schluege erst der
        // Fremdschluessel zu — mit einer Meldung, die niemand lesen will.
        const vorhanden = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as unknown[];
        if (!vorhanden.length) {
            json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }, correlationId);
            return;
        }

        const schon = (await supabaseApi.select('saved_providers', { ...besitzer, provider_key: providerKey }, { limit: 1 })) as Array<Record<string, unknown>>;
        if (schon[0]) {
            json(res, 200, { ok: true, saved: schon[0], created: false }, correlationId);
            return;
        }

        const [zeile] = (await supabaseApi.insert('saved_providers', {
            ...besitzer, provider_key: providerKey, source, session_id: sessionId,
        })) as Array<Record<string, unknown>>;
        json(res, 201, { ok: true, saved: zeile, created: true }, correlationId);
    });
}

/**
 * DELETE /api/v1/me/saved-providers/:provider_key[?guest_key=…] — vergessen.
 *
 * Ebenfalls idempotent: war nichts gemerkt, ist danach nichts gemerkt. Ein 404
 * waere hier eine Fehlermeldung fuer einen Zustand, den der Nutzer gerade
 * herstellen wollte.
 */
export async function handleUnsaveProvider(req: IncomingMessage, res: ServerResponse, correlationId: string,
    authUserId: string | null, providerKey: string) {
    const u = new URL(req.url || '', 'http://localhost');
    const besitzer = besitzerAus(authUserId, u.searchParams.get('guest_key'));
    if (!besitzer) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'guest_key required', correlationId }, correlationId);
        return;
    }
    if (!PROVIDER_KEY_RE.test(providerKey)) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'provider_key required', correlationId }, correlationId);
        return;
    }
    const weg = (await supabaseApi.remove('saved_providers', { ...besitzer, provider_key: providerKey })) as unknown[];
    json(res, 200, { ok: true, removed: weg.length }, correlationId);
}

/** Liefert den provider_key, wenn die URL auf ein einzelnes Lesezeichen zeigt. */
export function savedProviderRouteKey(url: string | undefined): string | null {
    const m = /^\/api\/v1\/me\/saved-providers\/([a-z0-9-]+)(\?.*)?$/.exec(url || '');
    return m ? m[1] : null;
}
