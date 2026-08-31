import type { ServerResponse } from 'http';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';

// ─── Benachrichtigungen ──────────────────────────────────────────────────────
// Quelle ist `public.notifications` (Migration 20260831000000), nicht
// `event_log`. Die Begruendung steht ausfuehrlich in der Migration; die kurze
// Fassung: das Protokoll weiss nicht, wen eine Zeile angeht, und seine
// Nutzlasten sind fuer die Fehlersuche geschrieben, nicht fuer die Anzeige.
//
// Zwei Regeln halten diese Tabelle sauber, und beide werden hier durchgesetzt,
// nicht in der Datenbank:
//
//   1. NIEMAND WIRD UEBER SICH SELBST BENACHRICHTIGT. Wer seinen eigenen
//      Termin verschiebt, bekommt keine Nachricht darueber — er war dabei.
//      `notify()` nimmt deshalb immer einen `actor`; stimmt er mit dem
//      Empfaenger ueberein, passiert nichts.
//   2. IN DIE NUTZLAST KOMMT NUR, WAS ANGEZEIGT WIRD. Kein freies Objekt:
//      `PayloadFelder` zaehlt die erlaubten Felder auf, alles andere faellt
//      weg. Genau hier waere sonst wieder eine Mailadresse gelandet.

export type NotificationType =
    | 'provider_confirmed'      // Ein Anbieter hat die Anfrage angenommen
    | 'provider_replied'        // Ein Anbieter hat geantwortet
    | 'provider_declined'       // Ein Anbieter hat abgesagt
    | 'engagement_message'      // Neue Nachricht im Verlauf einer Anfrage
    | 'engagement_expired'      // Niemand hat innerhalb der Frist reagiert
    | 'booking_rescheduled'     // Der Termin wurde verschoben
    | 'booking_cancelled';      // Der Termin wurde abgesagt

/**
 * Die erlaubten Nutzlast-Felder. Bewusst eine geschlossene Liste: alles, was
 * nicht hier steht, erreicht die Datenbank nicht — und damit auch keinen
 * fremden Bildschirm. Werte sind kurze Bezeichner oder ISO-Zeitpunkte, keine
 * Freitexte aus Nachrichten und keine Kontaktdaten.
 */
export interface PayloadFelder {
    /** Anbieter-Schluessel, damit die Oberflaeche den Namen nachschlagen kann. */
    providerKey?: string;
    /** Anzeigename des Anbieters, sofern schon aufgeloest. */
    providerName?: string;
    /** Vorheriger Termin bei einer Verschiebung (ISO). */
    from?: string;
    /** Neuer Termin bei einer Verschiebung (ISO). */
    to?: string;
    /** Selbstvergebener Titel einer Sitzung. */
    label?: string;
}

const PAYLOAD_KEYS: Array<keyof PayloadFelder> = ['providerKey', 'providerName', 'from', 'to', 'label'];

function nutzlast(roh: PayloadFelder): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of PAYLOAD_KEYS) {
        const v = roh[k];
        // Nur Zeichenketten, und gekappt: eine Nutzlast ist eine Beschriftung,
        // kein Speicherplatz.
        if (typeof v === 'string' && v) out[k] = v.slice(0, 200);
    }
    return out;
}

export interface NotifyArgs {
    /** Wer die Nachricht bekommt. Ohne Empfaenger passiert nichts. */
    to: string | null | undefined;
    /** Wer sie ausgeloest hat. Gleich dem Empfaenger → keine Nachricht. */
    actor?: string | null;
    type: NotificationType;
    subject?: 'engagement' | 'booking' | 'session';
    subjectId?: string | null;
    payload?: PayloadFelder;
    /**
     * Setzen, wenn die Schreibstelle wiederholt laufen kann (Waechter-Ticks).
     * Ohne Schluessel darf sich eine Nachricht wiederholen — eine zweite
     * Antwort im selben Verlauf ist eine zweite Nachricht.
     */
    dedupeKey?: string;
}

/**
 * Legt eine Benachrichtigung an. Schlaegt NIE nach aussen durch: eine
 * Benachrichtigung ist Beiwerk zu einem Vorgang, der bereits gelungen ist.
 * Scheitert sie, ist der Vorgang trotzdem gueltig — das Protokoll (`event_log`)
 * haelt ihn ohnehin fest.
 */
export async function notify(args: NotifyArgs): Promise<void> {
    const { to, actor, type, subject, subjectId, payload, dedupeKey } = args;
    if (!to) return;                 // Gast-Vorgang: es gibt niemanden zu benachrichtigen
    if (actor && actor === to) return; // Regel 1: nicht ueber sich selbst
    try {
        await supabaseApi.insert('notifications', {
            user_id: to,
            type,
            ...(subject ? { subject } : {}),
            ...(subjectId ? { subject_id: String(subjectId) } : {}),
            payload: nutzlast(payload ?? {}),
            ...(dedupeKey ? { dedupe_key: dedupeKey.slice(0, 200) } : {}),
        });
    } catch (err) {
        // Ein verletzter dedupe-Index ist der Normalfall, kein Fehler: der
        // Waechter hat dieselbe Lage ein zweites Mal gesehen.
        structuredLog('info', 'Notification not stored', {
            correlationId: 'notify', errorCode: 'ERR_NOTIFY', severity: 'info', route: `notify/${type}`,
        });
    }
}

interface NotificationRow {
    id: string;
    type: string;
    subject: string | null;
    subject_id: string | null;
    payload: Record<string, string> | null;
    created_at: string;
    read_at: string | null;
}

/** GET /api/v1/notifications — ausschliesslich die Zeilen des Aufrufers. */
export async function handleNotificationsList(
    res: ServerResponse, correlationId: string, userId: string | null,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    // Ohne angemeldetes Konto gibt es keine Benachrichtigungen — kein Fehler,
    // sondern ein leeres Fach. Ein Gast hat schlicht noch keines.
    if (!userId) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, notifications: [], unread: 0, correlationId }));
        return;
    }
    try {
        const rows = (await supabaseApi.select(
            'notifications', { user_id: userId }, { order: 'created_at.desc', limit: 50 },
        )) as NotificationRow[];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            notifications: rows.map(r => ({
                id: r.id,
                type: r.type,
                subject: r.subject,
                subject_id: r.subject_id,
                payload: r.payload ?? {},
                created_at: r.created_at,
                read_at: r.read_at,
            })),
            unread: rows.filter(r => !r.read_at).length,
            correlationId,
        }));
    } catch (err) {
        structuredLog('error', 'Notifications list failed', {
            correlationId, errorCode: 'ERR_NOTIFICATIONS', severity: 'error', route: '/api/v1/notifications',
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to load notifications', correlationId }));
    }
}

/**
 * POST /api/v1/notifications/read — `{ id }` markiert eine, `{ all: true }`
 * alle ungelesenen. Der Filter traegt IMMER die user_id mit: eine fremde id
 * zu schicken darf nichts bewirken.
 */
export async function handleNotificationsRead(
    res: ServerResponse, correlationId: string, userId: string | null, body: { id?: string; all?: boolean },
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'UNAUTHORIZED', message: 'Sign-in required', correlationId }));
        return;
    }
    if (!body.all && !body.id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'VALIDATION_ERROR', message: 'id or all required', correlationId }));
        return;
    }
    try {
        const now = new Date().toISOString();
        // Bei 'all' nur die ungelesenen anfassen: sonst wanderte der
        // Lesezeitpunkt bereits gelesener Zeilen jedes Mal nach vorn und
        // "seit wann gesehen" waere keine Auskunft mehr.
        const filter: Record<string, string> = body.all
            ? { user_id: `eq.${userId}`, read_at: 'is.null' }
            : { user_id: `eq.${userId}`, id: `eq.${body.id}` };
        const updated = (await supabaseApi.updateWhere('notifications', filter, { read_at: now })) as unknown[];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, marked: updated.length, read_at: now, correlationId }));
    } catch (err) {
        structuredLog('error', 'Notification read failed', {
            correlationId, errorCode: 'ERR_NOTIFICATION_READ', severity: 'error', route: '/api/v1/notifications/read',
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to mark read', correlationId }));
    }
}
