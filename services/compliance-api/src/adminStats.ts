// ─── Control Center · Kennzahlen aus den lebenden Quellen (20.10.2026) ──────
//
// Bis hierher las GET /api/v1/admin/stats Quellen, in die niemand mehr
// schreibt: `engagement_requests` (altes Anfragemodell, letzter Eintrag am
// 01.09.), `documents` (eine Zeile vom Juli) und Event-Typen, die der Code nie
// erzeugt (`document_ai_blocked`, gesperrte Magic-Links). Die Seite zeigte
// Nullen und 0 %, die wie "alles im Plan" aussahen.
//
// Jetzt:
//   - Buchungen aus `scheduling` (sofort bestaetigt; Bestaetigungs- und
//     Antwortrate des alten Modells gibt es dort nicht mehr)
//   - Privacy aus den Grenzuebertritten, die es wirklich gibt: Assistent → KI
//     (bereinigt, `assistant_chat`), Offenlegung an den Anbieter
//     (`lead.revealed`; Neubuchungen von vor dem 23.10. tragen `booking_rebooked`),
//     Nachweise im geschuetzten Speicher
//   - was nicht gemessen wird, kommt als null, nie als 0. Kunden-Uploads gibt
//     es im Produkt nicht (Pipeline nicht live) — `customerUploads: null`.
//   - jede Quelle, deren Lesegrenze erreicht ist, steht in `truncated` — die
//     Zahlen sind dann eine Untergrenze, und die Seite sagt das.
//
// Rein: keine Datenbank, keine Uhr von aussen ausser `now`. index.ts liest
// (Zeitfenster und Shadow-Filter serverseitig, siehe `windowStart`).

export type BookingRow = {
    id: string;
    provider_key: string;
    status: string;
    slot_start: string;
    created_at: string;
    updated_at?: string | null;
    cancelled_at?: string | null;
    reminder_24h_sent?: boolean | null;
    acknowledgement_version?: string | null;
    /** Freigabe der Nutzerdaten an den Anbieter (disclosure.ts). */
    shared_released_at?: string | null;
    dispute_status?: string | null;
    no_show_reported_at?: string | null;
};
export type EventRow = { type: string; payload?: Record<string, unknown> | null; timestamp?: string | null; created_at?: string | null };
export type EvidenceRow = { upload_confirmed?: boolean | null; reviewed_at?: string | null };

export type WatchFlag = 'dispute' | 'reminder_missing' | 'soon' | 'upcoming';
export type Source = 'scheduling' | 'event_log' | 'provider_evidence';

export interface AdminStats {
    generatedAt: string;
    /** Quellen, deren Lesegrenze erreicht ist — Zahlen daraus sind eine Untergrenze. */
    truncated: Source[];
    bookings: {
        today: number;
        last7: number;
        total: number;
        upcoming7: number;
        cancelled7: number;
        noShows7: number;
        disputesOpen: number;
        /** Vergangene Termine ohne Meldung (noch `confirmed`). */
        unreported: number;
        /** wahrgenommen / (wahrgenommen + No-Show); null ohne gemeldeten Termin. */
        heldRate: number | null;
        /** Anteil der Buchungen mit Audit-Spur der Offenlegung, seit es den Bestaetigungstext gibt. */
        disclosureAuditedRate: number | null;
        /** Anteil vergangener Termine mit 24-h-Erinnerung, wo sie moeglich war; null, solange Erinnerungen nicht laufen. */
        reminderRate: number | null;
    };
    watchlist: Array<{ id: string; provider_key: string; slot_start: string; flag: WatchFlag; msUntil: number }>;
    privacy: {
        aiRequests7: number;
        aiRedacted7: number;
        reveals7: number;
        evidenceStored: number;
        evidenceToReview: number;
        /** Die Upload-Pipeline fuer Kundendokumente ist im Produkt nicht live. */
        customerUploads: null;
    };
    security: { rateLimitPerMinute: number; accessEvents7: number; errorEvents7: number };
    events: Array<{ type: string; payload: Record<string, unknown>; created_at: string | null }>;
    series: { dates: string[]; bookings: number[]; cancelled: number[]; noShows: number[]; aiRequests: number[]; aiRedacted: number[]; reveals: number[] };
}

const DAY = 24 * 3_600_000;
/** Dieselbe Lesart wie das Cockpit (cockpit.ts) — ein Fehlerbegriff fuer beide Seiten. */
export const ERROR_RE = /fail|error|blocked|invalid|breach|downgrad/i;
const ACCESS_RE = /^api_(access|key)_/;
const DISCLOSURE = new Set(['lead.revealed', 'booking_rebooked']);
/**
 * Was vom Payload eines Ereignisses in den Audit-Stream darf. Positivliste:
 * Payloads tragen auch `to` (E-Mail), `text` (Mailtext), `note` (Freitext) und
 * `userId` — nichts davon gehoert auf eine Uebersichtsseite.
 */
const FEED_KEYS = ['providerKey', 'provider_key', 'status', 'kind', 'stage', 'reason', 'redacted', 'band'] as const;

const ratio = (n: number, d: number): number | null => (d ? n / d : null);
const at = (e: EventRow): string | null => e.timestamp ?? e.created_at ?? null;

/** Ein Ereignis fuer einen Audit-Stream — nur mit den freigegebenen Payload-Schluesseln. Cockpit nutzt dasselbe. */
export function feedEvent(e: EventRow): { type: string; payload: Record<string, unknown>; created_at: string | null } {
    return {
        type: e.type,
        payload: Object.fromEntries(FEED_KEYS.filter(k => e.payload && k in e.payload).map(k => [k, e.payload![k]])),
        created_at: at(e),
    };
}

/** Beginn des 7-Tage-Fensters (UTC-Tag von vor sechs Tagen) — index.ts filtert damit serverseitig. */
export function windowStart(now: Date = new Date()): Date {
    const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
    return new Date(d.getTime() - 6 * DAY);
}

/** Ab wann die Offenlegung einen Bestaetigungstext hat — der Altbestand davor kannte den Schritt nicht. */
export function disclosureSince(bookings: BookingRow[]): string | null {
    const starts = bookings.filter(b => b.acknowledgement_version).map(b => b.created_at).sort();
    return starts[0] ?? null;
}

export function computeAdminStats(input: {
    bookings: BookingRow[];
    /** Ereignisse im 7-Tage-Fenster, ohne Shadow-Marker. */
    events7: EventRow[];
    /** `lead.revealed` + `booking_rebooked` seit `disclosureSince`. */
    disclosureEvents: EventRow[];
    /** Die juengsten Ereignisse fuer den Audit-Stream, ohne Shadow-Marker. */
    feed: EventRow[];
    evidence: EvidenceRow[];
    rateLimitPerMinute: number;
    /** Laufen 24-h-Erinnerungen laut Richtlinie (Offset 1440)? */
    reminder24h: boolean;
    limits: { bookings: number; events: number };
    now?: Date;
}): AdminStats {
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    const start = windowStart(now);
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) dayKeys.push(new Date(start.getTime() + i * DAY).toISOString().slice(0, 10));
    const idxOf = (iso?: string | null) => (iso ? dayKeys.indexOf(iso.slice(0, 10)) : -1);
    const bucket = () => new Array(7).fill(0) as number[];

    const { bookings } = input;
    const ms = (iso: string) => new Date(iso).getTime();
    const past = bookings.filter(b => ms(b.slot_start) < nowMs);
    const completed = past.filter(b => b.status === 'completed').length;
    const noShow = past.filter(b => b.status === 'no_show').length;

    // Offenlegung: Basis sind die Buchungen, deren Daten der Anbieter sieht
    // (`shared_released_at`); gezaehlt wird, ob dazu das Audit steht. Seit
    // disclosure.ts gibt nur ein Audit frei — die Quote ist ein Stolperdraht
    // fuer Pfade, die das umgehen. Stornierte, nie freigegebene Buchungen sind
    // keine Offenlegung und zaehlen nicht mit. `booking_rebooked` gilt fuer
    // Neubuchungen von vor dem 23.10.2026.
    const since = disclosureSince(bookings);
    const audited = new Set(input.disclosureEvents.filter(e => DISCLOSURE.has(e.type)).map(e => String(e.payload?.bookingId ?? '')));
    const disclosureBase = since ? bookings.filter(b => b.created_at >= since && b.shared_released_at) : [];

    // Erinnerung: erst ab dem ersten Termin, fuer den eine verschickt wurde —
    // im Shadow-Modus setzt niemand das Flag, und Altbuchungen kannten es nicht.
    const remindersSince = input.reminder24h ? bookings.filter(b => b.reminder_24h_sent).map(b => b.slot_start).sort()[0] ?? null : null;
    const reminderBase = remindersSince
        ? past.filter(b => b.status !== 'cancelled' && b.slot_start >= remindersSince && ms(b.slot_start) - ms(b.created_at) > DAY)
        : [];

    const upcoming = bookings.filter(b => b.status === 'confirmed' && ms(b.slot_start) > nowMs && ms(b.slot_start) <= nowMs + 7 * DAY);
    const flagOf = (b: BookingRow): WatchFlag => {
        const until = ms(b.slot_start) - nowMs;
        // Eine Stunde Spielraum fuer den Erinnerungs-Lauf.
        if (remindersSince && until < 23 * 3_600_000 && !b.reminder_24h_sent && ms(b.slot_start) - ms(b.created_at) > DAY) return 'reminder_missing';
        return until < DAY ? 'soon' : 'upcoming';
    };
    const watchlist = [
        ...bookings.filter(b => b.dispute_status === 'open')
            .map(b => ({ id: b.id, provider_key: b.provider_key, slot_start: b.slot_start, flag: 'dispute' as WatchFlag, msUntil: ms(b.slot_start) - nowMs })),
        ...[...upcoming].sort((a, b) => ms(a.slot_start) - ms(b.slot_start))
            .map(b => ({ id: b.id, provider_key: b.provider_key, slot_start: b.slot_start, flag: flagOf(b), msUntil: ms(b.slot_start) - nowMs })),
    ].slice(0, 10);

    const cancelledAt = (b: BookingRow) => b.cancelled_at ?? b.updated_at ?? null;
    const series = { dates: dayKeys.map(k => `${k.slice(8, 10)}.${k.slice(5, 7)}`), bookings: bucket(), cancelled: bucket(), noShows: bucket(), aiRequests: bucket(), aiRedacted: bucket(), reveals: bucket() };
    for (const b of bookings) {
        const ci = idxOf(b.created_at); if (ci >= 0) series.bookings[ci]++;
        if (b.status === 'cancelled') { const xi = idxOf(cancelledAt(b)); if (xi >= 0) series.cancelled[xi]++; }
        // Ein Plattformfehler setzt no_show_reported_at auch, ist aber storniert —
        // er zaehlt dort, nicht hier.
        if (b.status === 'no_show') { const ni = idxOf(b.no_show_reported_at); if (ni >= 0) series.noShows[ni]++; }
    }
    const seenReveal = new Set<string>();
    for (const e of input.events7) {
        const i = idxOf(at(e)); if (i < 0) continue;
        if (e.type === 'assistant_chat') { series.aiRequests[i]++; if (e.payload?.redacted === true) series.aiRedacted[i]++; }
        // Je Buchung einmal — ein rekonstruiertes Audit neben einem echten zaehlt nicht doppelt.
        if (e.type === 'lead.revealed') {
            const key = String(e.payload?.bookingId ?? '');
            if (key && seenReveal.has(key)) continue;
            if (key) seenReveal.add(key);
            series.reveals[i]++;
        }
    }
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const stored = input.evidence.filter(e => e.upload_confirmed === true);

    const truncated = new Set<Source>();
    if (bookings.length >= input.limits.bookings) truncated.add('scheduling');
    if (input.events7.length >= input.limits.events || input.disclosureEvents.length >= input.limits.events) truncated.add('event_log');
    if (input.evidence.length >= input.limits.events) truncated.add('provider_evidence');

    return {
        generatedAt: now.toISOString(),
        truncated: [...truncated],
        bookings: {
            today: bookings.filter(b => idxOf(b.created_at) === 6).length,
            last7: sum(series.bookings),
            total: bookings.length,
            upcoming7: upcoming.length,
            cancelled7: sum(series.cancelled),
            noShows7: sum(series.noShows),
            disputesOpen: bookings.filter(b => b.dispute_status === 'open').length,
            unreported: past.filter(b => b.status === 'confirmed').length,
            heldRate: ratio(completed, completed + noShow),
            disclosureAuditedRate: ratio(disclosureBase.filter(b => audited.has(b.id)).length, disclosureBase.length),
            reminderRate: ratio(reminderBase.filter(b => b.reminder_24h_sent).length, reminderBase.length),
        },
        watchlist,
        privacy: {
            aiRequests7: sum(series.aiRequests),
            aiRedacted7: sum(series.aiRedacted),
            reveals7: sum(series.reveals),
            evidenceStored: stored.length,
            evidenceToReview: stored.filter(e => !e.reviewed_at).length,
            customerUploads: null,
        },
        security: {
            rateLimitPerMinute: input.rateLimitPerMinute,
            accessEvents7: input.events7.filter(e => ACCESS_RE.test(e.type)).length,
            errorEvents7: input.events7.filter(e => ERROR_RE.test(e.type)).length,
        },
        events: input.feed.slice(0, 12).map(feedEvent),
        series,
    };
}
