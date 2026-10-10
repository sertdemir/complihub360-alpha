import { supabaseApi } from "./supabase.js";

// ─── Phase 5: Anwesenheit, No-Show, Neubuchung, Guthaben — die Regeln ────────
//
// Spec B "Booking attendance, cancellation and credits", ADR-0007, Nutzer-
// Entscheidungen 2026-10-10. Alles hier ist rein: Eingabe → Ergebnis, kein
// Netz, keine Uhr (die Zeit kommt als Argument). Die Zahlen kommen aus
// `attendance_policy` (loadAttendancePolicy unten); nichts ist im Code
// festgeschrieben, weil Spec B genau das verlangt: "configurable rather than
// hard-coded".
//
// Warum rein: die Zehn-Minuten-Regel wird heute noch nicht aus Zeitstempeln
// entschieden (kein Meeting-Anbieter, offene Entscheidung Nr. 4), sondern aus
// der Selbstauskunft beider Seiten. Wenn die Zeitstempel kommen, aendert sich
// nur, wer `classifyAttendance` aufruft — nicht die Regel.

export interface AttendancePolicy {
    version: number;
    providerWaitMinutes: number;
    rebookDays: number;
    creditPct: number;
    disputeHours: number;
    sameUserWindowDays: number;
    rescheduleLimit: number;
    /** Minuten vor dem Termin, absteigend (z. B. [1440, 60]). */
    reminderOffsetsMin: number[];
    /** Tage nach dem No-Show, aufsteigend (z. B. [1, 5, 10]). */
    rebookReminderDays: number[];
}

/** Spec B v1 — gilt, wenn die Tabelle leer ist (Test, frische Umgebung). */
export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
    version: 0, providerWaitMinutes: 10, rebookDays: 14, creditPct: 30, disputeHours: 48,
    sameUserWindowDays: 30, rescheduleLimit: 2, reminderOffsetsMin: [1440, 60], rebookReminderDays: [1, 5, 10],
};

export function policyFromRow(row: Record<string, unknown> | null | undefined): AttendancePolicy {
    if (!row) return DEFAULT_ATTENDANCE_POLICY;
    const num = (k: string, d: number) => (typeof row[k] === 'number' ? (row[k] as number) : d);
    const arr = (k: string, d: number[]) => (Array.isArray(row[k]) ? (row[k] as unknown[]).map(Number).filter((n) => Number.isFinite(n)) : d);
    return {
        version: num('version', 0),
        providerWaitMinutes: num('provider_wait_minutes', 10),
        rebookDays: num('rebook_days', 14),
        creditPct: num('credit_pct', 30),
        disputeHours: num('dispute_hours', 48),
        sameUserWindowDays: num('same_user_window_days', 30),
        rescheduleLimit: num('reschedule_limit', 2),
        reminderOffsetsMin: arr('reminder_offsets_min', [1440, 60]).sort((a, b) => b - a),
        rebookReminderDays: arr('rebook_reminder_days', [1, 5, 10]).sort((a, b) => a - b),
    };
}

/** Die juengste Fassung, die heute gilt. */
export async function loadAttendancePolicy(today = new Date().toISOString().slice(0, 10)): Promise<AttendancePolicy> {
    const rows = (await supabaseApi.select('attendance_policy', {}, { limit: 50 })) as Array<Record<string, unknown>>;
    const live = rows.filter((r) => String(r.effective_from) <= today).sort((a, b) => Number(b.version) - Number(a.version));
    return policyFromRow(live[0]);
}

// ─── Zehn Minuten ────────────────────────────────────────────────────────────

export type AttendanceOutcome = 'attended' | 'user_no_show' | 'provider_no_show' | 'unverifiable';

/**
 * Spec B: "The provider must join on time and remain available for ten
 * complete minutes before the user may be classified as a no-show. A provider
 * who arrives late cannot classify an on-time user as a no-show."
 *
 * Alle Zeiten ISO; fehlende Zeitstempel heissen „nicht verifizierbar", nie
 * „schuldig". Puenktlich heisst: beigetreten spaetestens zum Slot-Beginn.
 */
export function classifyAttendance(i: {
    slotStart: string;
    providerJoinedAt: string | null;
    providerLeftAt: string | null;
    userJoinedAt: string | null;
    waitMinutes: number;
}): AttendanceOutcome {
    const slot = Date.parse(i.slotStart);
    if (Number.isNaN(slot)) return 'unverifiable';
    const pj = i.providerJoinedAt ? Date.parse(i.providerJoinedAt) : NaN;
    const uj = i.userJoinedAt ? Date.parse(i.userJoinedAt) : NaN;
    if (!Number.isNaN(pj) && !Number.isNaN(uj)) return 'attended';
    const waitEnd = slot + i.waitMinutes * 60_000;
    if (Number.isNaN(pj)) {
        // Der Anbieter kam gar nicht. War der Nutzer da, ist das sein Vorfall;
        // war niemand da, laesst sich nichts belegen.
        return Number.isNaN(uj) ? 'unverifiable' : 'provider_no_show';
    }
    // Anbieter da, Nutzer nicht: nur ein puenktlicher Anbieter, der die volle
    // Wartezeit blieb, darf den No-Show erklaeren.
    const pl = i.providerLeftAt ? Date.parse(i.providerLeftAt) : NaN;
    const onTime = pj <= slot;
    const stayed = Number.isNaN(pl) ? true : pl >= waitEnd;
    if (onTime && stayed) return 'user_no_show';
    return 'unverifiable';
}

// ─── Frist und Guthaben ──────────────────────────────────────────────────────

/** Tag der Frist (YYYY-MM-DD): `days` volle Tage nach dem Ereignis, UTC. */
export function rebookDeadline(fromIso: string, days: number): string {
    const d = new Date(fromIso);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Frist abgelaufen, wenn der heutige Tag NACH dem Fristtag liegt — der Fristtag selbst zaehlt noch. */
export function rebookDeadlinePassed(deadline: string | null, today: string): boolean {
    return !!deadline && today > deadline;
}

/** 30 % der gezahlten Gebuehr, kaufmaennisch gerundet; nie negativ, nie bei 0. */
export function creditCents(finalFeeCents: number, pct: number): number {
    if (!(finalFeeCents > 0) || !(pct > 0)) return 0;
    return Math.round((finalFeeCents * pct) / 100);
}

// ─── Erinnerungen ────────────────────────────────────────────────────────────

/**
 * Welche Terminerinnerung jetzt faellig ist: die groesste Stufe (Minuten vor
 * dem Termin), deren Fenster erreicht ist und die noch nicht ging. Ein
 * Watcher, der zu spaet kommt, schickt nicht alles nach — nur die naechste
 * sinnvolle Stufe, und nie nach dem Termin.
 */
export function appointmentReminderDue(i: {
    slotStart: string;
    nowIso: string;
    sentOffsets: number[];
    offsets: number[];
}): number | null {
    const slot = Date.parse(i.slotStart);
    const now = Date.parse(i.nowIso);
    if (Number.isNaN(slot) || Number.isNaN(now) || now >= slot) return null;
    const minutesLeft = (slot - now) / 60_000;
    const due = [...i.offsets].sort((a, b) => a - b).filter((o) => minutesLeft <= o && !i.sentOffsets.includes(o));
    // Die kleinste erreichte Stufe ist die aktuelle; groessere, die verpasst
    // wurden, gelten damit als erledigt (der Aufrufer schreibt alle <= Stufe).
    return due.length ? due[0] : null;
}

/** Erinnerungsstufen, die der Aufrufer nach einem Versand als erledigt markiert. */
export function reminderOffsetsCovered(offsets: number[], sentUpTo: number): number[] {
    return offsets.filter((o) => o >= sentUpTo);
}

/**
 * Welche Neubuchungs-Erinnerung jetzt faellig ist (Tag nach dem No-Show),
 * gegeben wie viele schon gingen. Nach der Frist keine mehr.
 */
export function rebookReminderDue(i: {
    noShowAtIso: string;
    deadline: string;
    sent: number;
    today: string;
    days: number[];
}): number | null {
    if (i.today > i.deadline) return null;
    const steps = [...i.days].sort((a, b) => a - b);
    if (i.sent >= steps.length) return null;
    const next = steps[i.sent];
    const since = Math.floor((Date.parse(`${i.today}T00:00:00Z`) - Date.parse(i.noShowAtIso.slice(0, 10) + 'T00:00:00Z')) / 86_400_000);
    return since >= next ? next : null;
}

// ─── Mehrfachbuchung, Umbuchung, Widerspruch ─────────────────────────────────

export interface LeadCandidate {
    id: string;
    provider_key: string;
    user_id: string | null;
    created_at?: string | null;
    /** Fallback fuer das Alter, wenn created_at fehlt (Testspeicher ohne DB-Default). */
    sharing_confirmed_at?: string | null;
    status: string;
    lead_ledger_id: string | null;
    rebooked_from?: string | null;
    rebook_deadline?: string | null;
    credit_decided_at?: string | null;
}

/**
 * Nutzer-Entscheidung 5: derselbe Nutzer beim selben Anbieter binnen
 * `windowDays` zahlt keine zweite Gebuehr — die neue Buchung haengt am
 * bestehenden Lead. Zaehlt nur Buchungen mit Ledger (also bezahlte oder
 * gebuehrenfreie Leads), nicht solche, die selbst schon angehaengt sind:
 * die Kette zeigt immer auf die Wurzel.
 */
export function findRecentLead(i: {
    bookings: LeadCandidate[];
    userId: string;
    providerKey: string;
    nowIso: string;
    windowDays: number;
}): LeadCandidate | null {
    const now = Date.parse(i.nowIso);
    const windowMs = i.windowDays * 86_400_000;
    const stamp = (b: LeadCandidate) => { const t = Date.parse(b.created_at ?? b.sharing_confirmed_at ?? ''); return Number.isNaN(t) ? now : t; };
    const own = i.bookings
        .filter((b) => b.user_id === i.userId && b.provider_key === i.providerKey && b.lead_ledger_id)
        .sort((a, b) => stamp(b) - stamp(a));
    for (const b of own) {
        const age = now - stamp(b);
        const inWindow = i.windowDays > 0 && age >= 0 && age <= windowMs;
        // Eine offene Neubuchungsfrist zaehlt immer — auch jenseits des Fensters.
        const openDeadline = !!b.rebook_deadline && !b.credit_decided_at && i.nowIso.slice(0, 10) <= b.rebook_deadline;
        if (inWindow || openDeadline) return rootOf(b, i.bookings);
    }
    return null;
}

function rootOf(b: LeadCandidate, all: LeadCandidate[]): LeadCandidate {
    let cur = b;
    const seen = new Set<string>();
    while (cur.rebooked_from && !seen.has(cur.id)) {
        seen.add(cur.id);
        const parent = all.find((x) => x.id === cur.rebooked_from);
        if (!parent) break;
        cur = parent;
    }
    return cur;
}

export function canReschedule(count: number, limit: number): boolean {
    return count < limit;
}

/** Widerspruch nur binnen `hours` nach der Meldung. */
export function disputeOpen(reportedAtIso: string | null, nowIso: string, hours: number): boolean {
    if (!reportedAtIso) return false;
    const r = Date.parse(reportedAtIso); const n = Date.parse(nowIso);
    if (Number.isNaN(r) || Number.isNaN(n)) return false;
    return n - r <= hours * 3_600_000 && n >= r;
}

/** Nur ein bestaetigter Termin, dessen Slot vorbei ist, laesst sich als Anwesenheit melden. */
export function attendanceReportable(status: string, slotEndIso: string, nowIso: string): boolean {
    return status === 'confirmed' && Date.parse(slotEndIso) <= Date.parse(nowIso);
}
