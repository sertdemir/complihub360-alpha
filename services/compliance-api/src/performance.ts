import { supabaseApi } from "./supabase.js";

// ─── Phase 6: Performance aus Fakten, Ranking ohne Annahmen, Verfuegbarkeit ──
//
// Spec A §17: "Do not penalize providers for metrics until there is sufficient,
// reliable data. Preserve source, calculation period, sample size." Spec B
// "Analytics and performance separation": die Tiefe darf am Tarif haengen, die
// Fakten nie. ADR-0009, Nutzer-Entscheidungen 2026-10-10.
//
// Alles hier ist rein: Zeilen rein, Zahlen raus. Wer eine Zahl auf der
// Oberflaeche sieht, kann sie auf ihre Buchungen zurueckfuehren.

export interface PerformancePolicy {
    version: number;
    /** Ab so vielen Buchungen im Fenster zeigt die Seite Quoten. */
    rateMinBookings: number;
    /** Zeitraum der Fakten in Tagen. */
    windowDays: number;
    /** Fenster, in dem Vorfaelle gezaehlt werden. */
    incidentWindowDays: number;
    incidentAlertCount: number;
    incidentPauseCount: number;
    userNoShowAlertCount: number;
}

export const DEFAULT_PERFORMANCE_POLICY: PerformancePolicy = {
    version: 0, rateMinBookings: 5, windowDays: 90, incidentWindowDays: 90, incidentAlertCount: 2, incidentPauseCount: 3, userNoShowAlertCount: 2,
};

export function performancePolicyFromRow(row: Record<string, unknown> | null | undefined): PerformancePolicy {
    if (!row) return DEFAULT_PERFORMANCE_POLICY;
    const num = (k: string, d: number) => (typeof row[k] === 'number' ? (row[k] as number) : d);
    return {
        version: num('version', 0),
        rateMinBookings: num('rate_min_bookings', 5),
        windowDays: num('window_days', 90),
        incidentWindowDays: num('incident_window_days', 90),
        incidentAlertCount: num('incident_alert_count', 2),
        incidentPauseCount: num('incident_pause_count', 3),
        userNoShowAlertCount: num('user_no_show_alert_count', 2),
    };
}

export async function loadPerformancePolicy(today = new Date().toISOString().slice(0, 10)): Promise<PerformancePolicy> {
    const rows = (await supabaseApi.select('performance_policy', {}, { limit: 50 })) as Array<Record<string, unknown>>;
    const live = rows.filter((r) => String(r.effective_from) <= today).sort((a, b) => Number(b.version) - Number(a.version));
    return performancePolicyFromRow(live[0]);
}

// ─── 1. Die Fakten ───────────────────────────────────────────────────────────

export interface BookingFact {
    id: string;
    slot_start: string;
    status: string;
    no_show_by?: string | null;
    cancelled_by?: string | null;
    dispute_status?: string | null;
    /** Aus dem Ledger der Buchung: Bereich und erstes Land. */
    area_code?: string | null;
    country?: string | null;
}
export interface IncidentFact { id: string; booking_id?: string | null; kind: string; recorded_at: string }
export interface ReviewFact { rating: number | null; categories?: string[] | null; created_at: string; from_role?: string; verified?: boolean }

/** Eine Zahl mit ihrer Basis — die Quote nur, wenn die Stichprobe reicht (§17). */
export interface Counted {
    count: number;
    /** Anteil an `of`, 0..1, oder null unter der Mindeststichprobe. */
    rate: number | null;
    of: number;
}

export interface PerformanceFacts {
    policy_version: number;
    window_days: number;
    from: string;
    to: string;
    /** Buchungen, deren Termin im Fenster lag (alle Status). */
    bookings: number;
    /** Ab so vielen Buchungen stehen Quoten. */
    rate_min_bookings: number;
    rates_shown: boolean;
    attended: Counted;
    user_no_show: Counted;
    provider_no_show: Counted;
    cancelled_by_provider: Counted;
    cancelled_by_user: Counted;
    disputes_open: number;
    /** Vorfaelle im Vorfall-Fenster (kann vom Fakten-Fenster abweichen). */
    incidents: { count: number; window_days: number; alert_at: number; pause_at: number };
    rating: { average: number | null; count: number; min_count: number };
    would_use_again: Counted;
    upcoming: number;
}

const rate = (count: number, of: number, min: number): Counted => ({ count, rate: of >= min && of > 0 ? Math.round((count / of) * 1000) / 1000 : null, of });

export function computePerformance(input: {
    bookings: BookingFact[]; incidents: IncidentFact[]; reviews: ReviewFact[]; policy: PerformancePolicy; nowIso?: string;
}): PerformanceFacts {
    const { policy } = input;
    const now = input.nowIso ? Date.parse(input.nowIso) : Date.now();
    const from = now - policy.windowDays * 86_400_000;
    const inWindow = input.bookings.filter((b) => { const t = Date.parse(b.slot_start); return t >= from && t <= now; });
    const n = inWindow.length;
    const min = policy.rateMinBookings;
    const attended = inWindow.filter((b) => b.status === 'completed').length;
    const userNoShow = inWindow.filter((b) => b.status === 'no_show' && b.no_show_by === 'user').length;
    const providerNoShow = inWindow.filter((b) => b.status === 'no_show' && (b.no_show_by === 'provider' || !b.no_show_by)).length;
    const cancelledProvider = inWindow.filter((b) => b.status === 'cancelled' && b.cancelled_by === 'provider').length;
    const cancelledUser = inWindow.filter((b) => b.status === 'cancelled' && b.cancelled_by === 'user').length;
    const disputesOpen = input.bookings.filter((b) => b.dispute_status === 'open').length;
    const incFrom = now - policy.incidentWindowDays * 86_400_000;
    const incidents = input.incidents.filter((i) => { const t = Date.parse(i.recorded_at); return t >= incFrom && t <= now; }).length;
    const verified = input.reviews.filter((r) => (r.from_role ?? 'user') === 'user' && r.verified !== false && r.rating != null);
    const avg = verified.length ? Math.round((verified.reduce((s, r) => s + Number(r.rating), 0) / verified.length) * 10) / 10 : null;
    const again = verified.filter((r) => Array.isArray(r.categories) && r.categories.includes('would_use_again')).length;
    const upcoming = input.bookings.filter((b) => b.status === 'confirmed' && Date.parse(b.slot_start) > now).length;
    return {
        policy_version: policy.version, window_days: policy.windowDays,
        from: new Date(from).toISOString(), to: new Date(now).toISOString(),
        bookings: n, rate_min_bookings: min, rates_shown: n >= min,
        attended: rate(attended, n, min),
        user_no_show: rate(userNoShow, n, min),
        provider_no_show: rate(providerNoShow, n, min),
        cancelled_by_provider: rate(cancelledProvider, n, min),
        cancelled_by_user: rate(cancelledUser, n, min),
        disputes_open: disputesOpen,
        incidents: { count: incidents, window_days: policy.incidentWindowDays, alert_at: policy.incidentAlertCount, pause_at: policy.incidentPauseCount },
        rating: { average: avg, count: verified.length, min_count: min },
        would_use_again: rate(again, verified.length, min),
        upcoming,
    };
}

// ─── 2. Der Qualitaetsfaktor des Rankings — neutral ohne Daten ───────────────
//
// Vorher: rating 4.5, confirmation 0.8, response 0.7 als Annahmen, wenn
// nichts da war. Das bevorzugte Anbieter ohne Daten gegenueber solchen mit
// ehrlichen 4.2. Jetzt: jeder Teil zaehlt nur, wenn seine Stichprobe reicht;
// sonst steht er auf 0.5 — weder Bonus noch Strafe. Die Gewichte sind
// bewusst grob und werden NICHT auf dem Draht genannt (§14 Erklaerbarkeit:
// Fakten, keine Gewichte).

export interface QualityInput {
    rating: number | null; reviews_count: number;
    completed: number; bookings: number;
    incidents: number; incident_window_days: number;
    min_sample: number;
}

export interface QualityFactor {
    /** 0..1 */
    value: number;
    /** Welche Teile neutral standen, damit `rank_basis` es nennen kann. */
    neutral: Array<'rating' | 'completion' | 'incidents'>;
}

export function qualityFactor(q: QualityInput): QualityFactor {
    const neutral: QualityFactor['neutral'] = [];
    let ratingN = 0.5;
    if (q.rating != null && q.reviews_count >= Math.min(q.min_sample, 3)) ratingN = Math.max(0, Math.min(1, q.rating / 5)); else neutral.push('rating');
    let completionN = 0.5;
    if (q.bookings >= q.min_sample) completionN = Math.max(0, Math.min(1, q.completed / q.bookings)); else neutral.push('completion');
    // Vorfaelle zaehlen ab dem ersten — ein Vorfall ist ein Fakt, kein Trend.
    // Ohne Vorfall steht der Teil auf 1 (nicht neutral): "keine Vorfaelle"
    // ist eine Beobachtung, keine fehlende Stichprobe.
    const incidentN = Math.max(0, 1 - q.incidents * 0.25);
    const value = Math.round((0.4 * ratingN + 0.35 * completionN + 0.25 * incidentN) * 1000) / 1000;
    return { value, neutral };
}

// ─── 3. Serien-No-Shows ──────────────────────────────────────────────────────

export type SerialState = 'none' | 'alert' | 'pause';

/** Anbieter: Vorfaelle im Fenster gegen die Schwellen. */
export function serialNoShowState(incidentsInWindow: number, policy: PerformancePolicy): SerialState {
    if (incidentsInWindow >= policy.incidentPauseCount) return 'pause';
    if (incidentsInWindow >= policy.incidentAlertCount) return 'alert';
    return 'none';
}

/** Vorfaelle im Fenster, nach Datum. */
export function incidentsInWindow(incidents: IncidentFact[], policy: PerformancePolicy, nowIso = new Date().toISOString()): IncidentFact[] {
    const now = Date.parse(nowIso); const from = now - policy.incidentWindowDays * 86_400_000;
    return incidents.filter((i) => { const t = Date.parse(i.recorded_at); return t >= from && t <= now; });
}

/** Nutzer: gemeldete No-Shows (no_show_by user, nicht widerrufen) im Fenster. */
export function userNoShowsInWindow(bookings: BookingFact[], policy: PerformancePolicy, nowIso = new Date().toISOString()): BookingFact[] {
    const now = Date.parse(nowIso); const from = now - policy.incidentWindowDays * 86_400_000;
    return bookings.filter((b) => b.status === 'no_show' && b.no_show_by === 'user' && b.dispute_status !== 'upheld'
        && Date.parse(b.slot_start) >= from && Date.parse(b.slot_start) <= now);
}

// ─── 4. Analytics-Tiefe ──────────────────────────────────────────────────────

export type AnalyticsLevel = 'basic' | 'enhanced' | 'advanced';

export function analyticsDepth(level: string | null | undefined): { level: AnalyticsLevel; trends: boolean; export: boolean } {
    const l: AnalyticsLevel = level === 'advanced' ? 'advanced' : level === 'enhanced' ? 'enhanced' : 'basic';
    return { level: l, trends: l !== 'basic', export: l === 'advanced' };
}

export interface TrendRow { key: string; bookings: number; attended: number; user_no_show: number; provider_no_show: number; cancelled: number }

/** Verlauf je Bereich, Land oder Monat — dieselben Zaehlungen wie oben, nur gruppiert. */
export function trendsBy(bookings: BookingFact[], by: 'area' | 'country' | 'month', windowDays: number, nowIso = new Date().toISOString()): TrendRow[] {
    const now = Date.parse(nowIso); const from = now - windowDays * 86_400_000;
    const groups = new Map<string, TrendRow>();
    for (const b of bookings) {
        const t = Date.parse(b.slot_start);
        if (t < from || t > now) continue;
        const key = by === 'month' ? b.slot_start.slice(0, 7) : by === 'area' ? (b.area_code ?? 'unknown') : (b.country ?? 'unknown');
        const g = groups.get(key) ?? { key, bookings: 0, attended: 0, user_no_show: 0, provider_no_show: 0, cancelled: 0 };
        g.bookings++;
        if (b.status === 'completed') g.attended++;
        else if (b.status === 'no_show' && b.no_show_by === 'user') g.user_no_show++;
        else if (b.status === 'no_show') g.provider_no_show++;
        else if (b.status === 'cancelled') g.cancelled++;
        groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => (by === 'month' ? a.key.localeCompare(b.key) : b.bookings - a.bookings));
}

/** CSV fuer den Export (advanced): eine Zeile je Buchung, ohne Nutzerdaten. */
export function bookingsCsv(bookings: BookingFact[]): string {
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ['booking_id', 'slot_start', 'status', 'no_show_by', 'cancelled_by', 'dispute_status', 'area_code', 'country'];
    const lines = bookings.map((b) => [b.id, b.slot_start, b.status, b.no_show_by ?? '', b.cancelled_by ?? '', b.dispute_status ?? '', b.area_code ?? '', b.country ?? ''].map(esc).join(','));
    return [head.join(','), ...lines].join('\n') + '\n';
}

// ─── 5. Verfuegbarkeit → Slots ───────────────────────────────────────────────
//
// Fenster je Wochentag in der Zeitzone des Anbieters; Slots sind 30 Minuten.
// Ohne Fenster gilt die bisherige Vorgabe. Die Zeitzone wird ueber Intl
// aufgeloest, damit Sommerzeit und Laender ohne Umstellung stimmen.

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export interface HourWindow { from: string; to: string }
export type AvailabilityHours = Partial<Record<Weekday, HourWindow[]>>;

export const DEFAULT_AVAILABILITY: AvailabilityHours = {
    mon: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:30' }],
    tue: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:30' }],
    wed: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:30' }],
    thu: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:30' }],
    fri: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:30' }],
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutesOf = (hhmm: string) => { const m = HHMM.exec(hhmm); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

export function validTimezone(tz: unknown): tz is string {
    if (typeof tz !== 'string' || !tz) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** Prueft und normalisiert die Fenster: HH:MM, von < bis, 30-Minuten-Raster, max. 3 je Tag, keine Ueberlappung. */
export function validateAvailabilityHours(input: unknown): { ok: true; hours: AvailabilityHours } | { ok: false; message: string } {
    if (input === null) return { ok: true, hours: {} };
    if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: 'availability_hours must be an object keyed by weekday' };
    const out: AvailabilityHours = {};
    for (const [day, wins] of Object.entries(input as Record<string, unknown>)) {
        if (!WEEKDAYS.includes(day as Weekday)) return { ok: false, message: `unknown weekday ${day}` };
        if (!Array.isArray(wins)) return { ok: false, message: `${day} must be a list of windows` };
        if (wins.length > 3) return { ok: false, message: `${day}: at most 3 windows` };
        const norm: HourWindow[] = [];
        for (const w of wins) {
            const from = typeof (w as HourWindow)?.from === 'string' ? (w as HourWindow).from : '';
            const to = typeof (w as HourWindow)?.to === 'string' ? (w as HourWindow).to : '';
            const a = minutesOf(from), b = minutesOf(to);
            if (!Number.isFinite(a) || !Number.isFinite(b)) return { ok: false, message: `${day}: times must be HH:MM` };
            if (a % 30 || b % 30) return { ok: false, message: `${day}: times must be on a 30-minute grid` };
            if (b <= a) return { ok: false, message: `${day}: window end must be after its start` };
            norm.push({ from, to });
        }
        norm.sort((x, y) => minutesOf(x.from) - minutesOf(y.from));
        for (let i = 1; i < norm.length; i++) if (minutesOf(norm[i].from) < minutesOf(norm[i - 1].to)) return { ok: false, message: `${day}: windows overlap` };
        out[day as Weekday] = norm;
    }
    return { ok: true, hours: out };
}

/** Lokale Wanduhr-Zeit einer Zone als Instant: wir suchen den UTC-Zeitpunkt, der in `tz` genau `y-m-d hh:mm` zeigt. */
function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): number {
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    return guess - (shown - guess);
}

function localDateParts(ms: number, tz: string): { y: number; m: number; d: number; weekday: Weekday } {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    const wd = String(parts.weekday).toLowerCase().slice(0, 3) as Weekday;
    return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), weekday: wd };
}

/**
 * Slot-Kandidaten (ISO, UTC) ab morgen fuer `days` Tage aus den Fenstern des
 * Anbieters. Buchungen und Kalender-Belegung zieht der Aufrufer ab.
 */
export function availabilitySlots(input: {
    hours: AvailabilityHours | null | undefined; timezone: string; fromIso: string; days?: number; slotMinutes?: number; max?: number;
}): string[] {
    const hours = input.hours && Object.keys(input.hours).length ? input.hours : DEFAULT_AVAILABILITY;
    const tz = validTimezone(input.timezone) ? input.timezone : 'Europe/Berlin';
    const days = input.days ?? 14; const step = input.slotMinutes ?? 30; const max = input.max ?? 60;
    const out: string[] = [];
    const start = Date.parse(input.fromIso);
    for (let i = 1; i <= days && out.length < max; i++) {
        const dayMs = start + i * 86_400_000;
        const { y, m, d, weekday } = localDateParts(dayMs, tz);
        for (const w of hours[weekday] ?? []) {
            for (let t = minutesOf(w.from); t + step <= minutesOf(w.to) && out.length < max; t += step) {
                out.push(new Date(zonedToUtc(y, m, d, Math.floor(t / 60), t % 60, tz)).toISOString());
            }
        }
    }
    return out;
}

/** Ob der Anbieter gerade Buchungen annehmen kann: nicht abwesend, nicht pausiert. */
export function bookingOpen(p: { availability?: string | null; booking_paused_at?: string | null }): { open: boolean; reason: 'ooo' | 'paused' | null } {
    if (p.booking_paused_at) return { open: false, reason: 'paused' };
    if (p.availability === 'ooo') return { open: false, reason: 'ooo' };
    return { open: true, reason: null };
}
