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
    | 'booking_cancelled'       // Der Termin wurde abgesagt
    // Phase 4: an den Anbieter (provider_members).
    | 'booking_created'         // Ein Nutzer hat gebucht — der bezahlte Lead
    | 'payment_failed'          // Die Lead-Belastung scheiterte; Buchungen sind gesperrt
    // Verifikation eines Anbieterkontos (Phase 2). Empfaenger ist der
    // Dashboard-Login des Anbieters (provider_members).
    | 'verification_info_requested'  // Der Reviewer braucht einen weiteren Nachweis
    | 'verification_decided'         // Eine Zelle Leistung x Land wurde entschieden
    | 'verification_activated'       // Das Konto ist aktiv oder eingeschraenkt aktiv
    | 'evidence_expiring'            // Ein Nachweis laeuft in den naechsten 30 Tagen ab
    // Phase 5: Anwesenheit, Neubuchung, Guthaben (Spec B, ADR-0007).
    | 'appointment_reminder'    // Termin in 24 h bzw. 1 h — an beide Seiten
    | 'no_show_reported'        // Die andere Seite hat gemeldet, dass jemand fehlte
    | 'rebook_reminder'         // Neubuchung ohne zweite Gebuehr noch moeglich bis …
    | 'dispute_opened'          // Der Nutzer widerspricht der No-Show-Meldung (Admin, Anbieter)
    | 'dispute_resolved'        // Der Admin hat entschieden
    | 'credit_issued'           // 30 % Guthaben fuer den Anbieter
    // Phase 6 (ADR-0009): Serien-No-Shows und Durchsetzung — an den Anbieter.
    | 'serial_no_show_alert'    // Zwei Vorfaelle im Fenster — Hinweis
    | 'booking_paused'          // Drei Vorfaelle — Buchungspause mit Einspruch
    | 'enforcement_decided'     // Einspruch entschieden (label: lifted|upheld)
    | 'performance_incident'    // Der Anbieter fehlte — Vorfall protokolliert
    // Abo: Wechsel und Kuendigung zum Verlaengerungstermin (ADR-0006 B2/C2).
    // Zwei Zeitpunkte, zwei Nachrichten — die Vormerkung ist eine Zusage auf
    // spaeter, die Ausfuehrung ein Vorgang von heute. Eine Nachricht fuer
    // beides hiesse: entweder der Anbieter erfaehrt am Stichtag nichts, oder
    // er bekommt sofort eine Nachricht ueber etwas, das noch Wochen weg ist.
    | 'subscription_scheduled'       // Wechsel oder Kuendigung ist vorgemerkt
    | 'subscription_schedule_done'   // Der Stichtag ist erreicht, es ist geschehen
    // ADR-0008 B2a: eine Abo-Rechnung ist faellig; wir versuchen an Tag 1/3/6
    // die hinterlegte Karte. Die Frist bleibt.
    | 'invoice_retry_scheduled'
    // Phase 7 (ADR-0010): Enterprise-API — Entscheidung des Teams an den Anbieter.
    | 'api_access_decided'          // Zugang freigegeben oder abgelehnt (label: approved|rejected)
    | 'api_access_suspended';       // Zugang ausgesetzt — mit Grund

/**
 * Die erlaubten Nutzlast-Felder. Bewusst eine geschlossene Liste: alles, was
 * nicht hier steht, erreicht die Datenbank nicht — und damit auch keinen
 * fremden Bildschirm. Werte sind kurze Bezeichner oder ISO-Zeitpunkte, keine
 * Freitexte aus Nachrichten und keine Kontaktdaten.
 */
export interface PayloadFelder {
    /** Opaker Anbieter-Bezeichner (public_ref) — an Nutzer geht seit Phase 3 nie der Schluessel. */
    providerRef?: string;
    /** Anbieter-Schluessel — nur in Nachrichten an den Anbieter selbst (Watcher). */
    providerKey?: string;
    /** Anzeigename des Anbieters, sofern schon aufgeloest. */
    providerName?: string;
    /** Vorheriger Termin bei einer Verschiebung (ISO). */
    from?: string;
    /** Neuer Termin bei einer Verschiebung (ISO). */
    to?: string;
    /** Selbstvergebener Titel einer Sitzung — und der Tarif-Bezeichner bei Abo-Nachrichten. */
    label?: string;
    /**
     * Der Stichtag einer Abo-Vormerkung (ISO-Datum). Eigenes Feld, weil `to`
     * bei Terminen schon einen Zeitpunkt traegt und zwei Bedeutungen in einem
     * Feld frueher oder spaeter falsch angezeigt werden.
     */
    effectiveOn?: string;
    /** Gebuchter Termin (ISO) — Phase 4, an den Anbieter. */
    slot?: string;
    /** Frist (YYYY-MM-DD) — Phase 5, Neubuchung ohne zweite Gebuehr. */
    deadline?: string;
    /** Betrag in Cent als Zeichenkette — Phase 5, Guthaben an den Anbieter. */
    amount?: string;
    /** Erinnerungsstufe in Minuten vor dem Termin — Phase 5. */
    offset?: string;
}

const PAYLOAD_KEYS: Array<keyof PayloadFelder> = ['providerRef', 'providerKey', 'providerName', 'from', 'to', 'label', 'slot', 'deadline', 'amount', 'offset', 'effectiveOn'];

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
    subject?: 'engagement' | 'booking' | 'session' | 'provider';
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
    } catch {
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

/**
 * Partner-Glocke (Canvas-Wahl A V2, 2026-10-10): „Needs you" zeigt, was noch
 * eine Handlung braucht — und zwar solange die SACHE offen ist, nicht bis zum
 * Lesen. Rein: die Lage kommt von aussen, damit jeder Fall ohne Netz pruefbar
 * ist. Nicht-handlungsbeduerftige Arten sind nie offen.
 *
 *   payment_failed               solange `payment_failed` die Buchung sperrt
 *   invoice_retry_scheduled      solange die Rechnung offen ist
 *   verification_info_requested  solange der Status `more_info_required` ist
 *   evidence_expiring            bis gelesen (ob ein neuer Nachweis vorliegt,
 *                                weiss die Zeile nicht)
 */
export const ACTION_TYPES = new Set(['payment_failed', 'invoice_retry_scheduled', 'verification_info_requested', 'evidence_expiring']);

export function needsAction(
    row: { type: string; subject_id: string | null; payload: Record<string, string> | null; read_at: string | null },
    lage: { providers: Record<string, { billing_block_reasons?: string[] | null; lifecycle_status?: string | null }>; openInvoices: Set<string> },
): boolean {
    if (!ACTION_TYPES.has(row.type)) return false;
    const key = row.payload?.providerKey ?? row.subject_id ?? '';
    const p = lage.providers[key];
    switch (row.type) {
        case 'payment_failed': return !!p?.billing_block_reasons?.includes('payment_failed');
        case 'invoice_retry_scheduled': return lage.openInvoices.has(`${key}:${row.payload?.label ?? ''}`);
        case 'verification_info_requested': return p?.lifecycle_status === 'more_info_required';
        case 'evidence_expiring': return !row.read_at;
        default: return false;
    }
}

async function loadLage(rows: NotificationRow[]): Promise<Parameters<typeof needsAction>[1]> {
    const keys = [...new Set(rows.filter((r) => ACTION_TYPES.has(r.type)).map((r) => r.payload?.providerKey ?? r.subject_id).filter(Boolean) as string[])];
    const providers: Parameters<typeof needsAction>[1]['providers'] = {};
    const openInvoices = new Set<string>();
    for (const k of keys) {
        const [p] = (await supabaseApi.select('providers', { provider_key: k }, { limit: 1 })) as any[];
        if (p) providers[k] = { billing_block_reasons: p.billing_block_reasons ?? [], lifecycle_status: p.lifecycle_status ?? null };
        if (rows.some((r) => r.type === 'invoice_retry_scheduled')) {
            const inv = (await supabaseApi.select('invoices', { provider_key: k, status: 'open' }, { limit: 50 })) as any[];
            for (const i of inv) openInvoices.add(`${k}:${i.invoice_number}`);
        }
    }
    return { providers, openInvoices };
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
        const lage = rows.some((r) => ACTION_TYPES.has(r.type)) ? await loadLage(rows) : null;
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
                needs_action: lage ? needsAction(r, lage) : false,
            })),
            unread: rows.filter(r => !r.read_at).length,
            correlationId,
        }));
    } catch {
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
    } catch {
        structuredLog('error', 'Notification read failed', {
            correlationId, errorCode: 'ERR_NOTIFICATION_READ', severity: 'error', route: '/api/v1/notifications/read',
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errorCode: 'INTERNAL', message: 'Failed to mark read', correlationId }));
    }
}
