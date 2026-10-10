import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';

// ─── Abgewiesene Zugriffe protokollieren (EN-Launch Schritt 4, C1) ───────────
// Checklist v1.0, Privacy Critical Test "Authorization": "A user requests
// another user's booking or provider reveal → Access is denied and the event
// is logged." Bis 2026-10-10 wurde abgewiesen, aber fast nie protokolliert
// (eine von 13 Stellen mit 403, keine der 404).
//
// Nach aussen aendert sich nichts: 404 bleibt die Tarnung fuer fremde
// Ressourcen. Protokolliert wird nur, was tatsaechlich FREMD ist — eine
// Ressource, die es gibt und die einem anderen gehoert. Ein Tippfehler in
// einer ID ist kein Zugriffsversuch.
//
// Inhalt: Route ohne Query, Nutzer-ID, Art und ID der angefragten Ressource,
// Status. Keine E-Mail, kein Name, kein Body.

export interface AccessDenied {
    /** Methode und Pfad, ohne Query. */
    route: string;
    userId: string | null;
    /** Art der Ressource, z. B. 'booking', 'session', 'provider'. */
    resource: string;
    target: string;
    status: number;
    correlationId: string;
}

export function deniedPayload(e: AccessDenied): Record<string, unknown> {
    return {
        route: e.route.split('?')[0].slice(0, 200),
        userId: e.userId,
        resource: e.resource,
        target: String(e.target).slice(0, 120),
        status: e.status,
        correlationId: e.correlationId,
    };
}

/** Schreibt das Ereignis; ein Fehler beim Schreiben blockiert nie die Antwort,
 *  geht aber auch nicht still verloren. */
export async function logAccessDenied(e: AccessDenied): Promise<void> {
    try {
        await supabaseApi.insert('event_log', { type: 'access_denied', payload: deniedPayload(e) });
    } catch (err) {
        // Der Ersatz traegt dasselbe wie das Ereignis (nur IDs), damit es sich
        // rekonstruieren laesst.
        structuredLog('error', 'access_denied could not be logged', {
            correlationId: e.correlationId, errorCode: 'ERR_ACCESS_LOG', severity: 'error', route: e.route.split('?')[0],
            ...deniedPayload(e), error: String(err).slice(0, 200),
        });
    }
}
