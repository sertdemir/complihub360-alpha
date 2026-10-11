import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// ─── Enterprise-API: Schluessel, Scopes, Rate Limit, Ereignisse, Leads ───────
// Phase 7 des Provider-Plans (Spec B "Global enterprise API", ADR-0010).
// Reine Funktionen; die Routen in apiRoutes.ts und der Auth-Zweig in
// index.ts rufen sie. Nichts hier liest die Datenbank.
//
// Grundsaetze:
//   · Der Schluessel wird einmal erzeugt und einmal gezeigt; gespeichert
//     wird nur der SHA-256-Hash. Vergleich in konstanter Zeit.
//   · Scopes vergibt das Team. Ein Client ohne Scope bekommt 403, keine
//     stille Teilmenge.
//   · Das Rate Limit ist ein festes Fenster je Client und Minute, im
//     Prozess gehalten — fuer einen Server reicht das; mehrere Instanzen
//     brauchen spaeter einen gemeinsamen Zaehler.
//   · Ereignisse auf dem Draht tragen die Namen aus Spec B, nicht die
//     internen Typen des event_log.
//   · Ein Lead auf dem Draht ist eine Buchung NACH der Offenlegung —
//     nie Nutzerdaten davor (Spec B "Prohibited API access").

export const API_KEY_PREFIX = 'chk_live_';
export const API_TERMS_VERSION = 'api-terms-v1';

export const API_SCOPES = ['leads:read', 'leads:write', 'events:read', 'billing:read', 'availability:write'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/** Scopes, die der Anbieter selbst beantragen kann. availability:write nur auf eigene Freigabe. */
export const REQUESTABLE_SCOPES: ApiScope[] = ['leads:read', 'leads:write', 'events:read', 'billing:read'];

export type ApiClientStatus = 'requested' | 'approved' | 'active' | 'suspended' | 'revoked' | 'rejected';

export interface ApiClientRow {
    id: string;
    provider_key: string;
    name: string;
    status: ApiClientStatus;
    scopes: string[] | null;
    requested_scopes?: string[] | null;
    rate_limit_per_minute: number;
    key_hash: string | null;
    key_prefix: string | null;
    previous_key_hash?: string | null;
    previous_key_valid_until?: string | null;
    suspended_reason?: string | null;
    [k: string]: unknown;
}

// ─── Schluessel ──────────────────────────────────────────────────────────────

export function hashApiKey(key: string): string {
    return createHash('sha256').update(key, 'utf8').digest('hex');
}

/** Ein neuer Schluessel: Klartext (einmal zeigen), Praefix (anzeigen), Hash (speichern). */
export function generateApiKey(random: () => Buffer = () => randomBytes(24)): { key: string; prefix: string; hash: string } {
    const key = API_KEY_PREFIX + random().toString('hex');
    return { key, prefix: key.slice(0, API_KEY_PREFIX.length + 4) + '…', hash: hashApiKey(key) };
}

export function looksLikeApiKey(token: string | undefined | null): boolean {
    return typeof token === 'string' && token.startsWith(API_KEY_PREFIX) && /^[0-9a-f]{40,64}$/.test(token.slice(API_KEY_PREFIX.length));
}

/** Vergleich in konstanter Zeit — zwei Hashes gleicher Laenge. */
export function hashesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b || a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Passt der Schluessel zu diesem Client? Der aktuelle Hash immer; der vorige
 * nur bis previous_key_valid_until (Rotation mit Ueberlappung).
 */
export function keyMatchesClient(keyHash: string, client: ApiClientRow, nowIso: string): 'current' | 'previous' | null {
    if (hashesEqual(keyHash, client.key_hash)) return 'current';
    if (client.previous_key_hash && hashesEqual(keyHash, client.previous_key_hash)
        && client.previous_key_valid_until && Date.parse(client.previous_key_valid_until) > Date.parse(nowIso)) return 'previous';
    return null;
}

// ─── Scopes und Zustand ──────────────────────────────────────────────────────

export function validateScopes(input: unknown, allowed: readonly string[] = API_SCOPES): { ok: true; scopes: ApiScope[] } | { ok: false; reason: string } {
    if (!Array.isArray(input)) return { ok: false, reason: 'scopes must be an array' };
    const out: ApiScope[] = [];
    for (const s of input) {
        if (typeof s !== 'string' || !(allowed as readonly string[]).includes(s)) return { ok: false, reason: `unknown scope: ${String(s)}` };
        if (!out.includes(s as ApiScope)) out.push(s as ApiScope);
    }
    if (!out.length) return { ok: false, reason: 'at least one scope' };
    return { ok: true, scopes: out };
}

export function hasScope(client: Pick<ApiClientRow, 'scopes'>, scope: ApiScope): boolean {
    return Array.isArray(client.scopes) && client.scopes.includes(scope);
}

export type ApiAccessVerdict =
    | { ok: true }
    | { ok: false; status: 401 | 403; code: 'INVALID_API_KEY' | 'API_CLIENT_SUSPENDED' | 'API_CLIENT_REVOKED' | 'API_CLIENT_NOT_ACTIVE' | 'API_NOT_ELIGIBLE' };

/** Darf dieser Client gerade aufrufen? Reihenfolge: Zustand, dann Tarif. */
export function apiAccessVerdict(client: Pick<ApiClientRow, 'status'>, planEligible: boolean): ApiAccessVerdict {
    if (client.status === 'suspended') return { ok: false, status: 403, code: 'API_CLIENT_SUSPENDED' };
    if (client.status === 'revoked' || client.status === 'rejected') return { ok: false, status: 401, code: 'API_CLIENT_REVOKED' };
    if (client.status !== 'active') return { ok: false, status: 403, code: 'API_CLIENT_NOT_ACTIVE' };
    // Faellt das Abo unter Global, bleibt der Client gespeichert — und antwortet 403.
    if (!planEligible) return { ok: false, status: 403, code: 'API_NOT_ELIGIBLE' };
    return { ok: true };
}

// ─── Rate Limit (festes Fenster je Client und Minute) ────────────────────────

export interface RateLimitResult { allowed: boolean; limit: number; remaining: number; resetAt: number; retryAfterSec: number }

export class ClientRateLimiter {
    private readonly windows = new Map<string, { count: number; resetAt: number }>();
    constructor(private readonly windowMs = 60_000) {}

    check(clientId: string, limit: number, now = Date.now()): RateLimitResult {
        let w = this.windows.get(clientId);
        if (!w || now >= w.resetAt) { w = { count: 0, resetAt: now + this.windowMs }; this.windows.set(clientId, w); }
        w.count += 1;
        const allowed = w.count <= limit;
        return { allowed, limit, remaining: Math.max(0, limit - w.count), resetAt: w.resetAt, retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((w.resetAt - now) / 1000)) };
    }

    /** Alte Fenster vergessen — fuer lange laufende Prozesse. */
    prune(now = Date.now()): void {
        for (const [k, w] of this.windows) if (now >= w.resetAt) this.windows.delete(k);
    }
}

// ─── Ereignisse: interne Typen → Spec-B-Namen ────────────────────────────────

/** Spec B "API events" — die zehn Namen auf dem Draht. */
export type ApiEventType =
    | 'booking.created' | 'booking.rescheduled' | 'booking.cancelled'
    | 'meeting.completed' | 'user.no_show' | 'provider.no_show'
    | 'lead.revealed' | 'lead.credit_issued' | 'verification.expiring' | 'payment.failed';

export interface EventLogRow { id: string; type: string; payload?: Record<string, unknown> | null; timestamp: string }

export interface ApiEvent {
    id: string;
    type: ApiEventType;
    at: string;
    booking_id: string | null;
    data: Record<string, unknown>;
}

/** Welche Felder der Nutzlast auf den Draht duerfen — je Ereignis, nie Kontaktdaten. */
const EVENT_FIELDS: Record<ApiEventType, string[]> = {
    'booking.created': ['slot_start', 'slot_end', 'area_code', 'country'],
    'booking.rescheduled': ['from', 'to'],
    'booking.cancelled': ['cancelled_by', 'slot_start'],
    'meeting.completed': ['slot_start'],
    'user.no_show': ['slot_start', 'rebook_until'],
    'provider.no_show': ['slot_start', 'incident_id'],
    'lead.revealed': ['shared_fields', 'acknowledgement_version'],
    'lead.credit_issued': ['amount_cents', 'currency', 'reason'],
    'verification.expiring': ['evidence_type', 'expires_at'],
    'payment.failed': ['ledger_id', 'currency'],
};

/**
 * Eine Zeile des event_log → Ereignis auf dem Draht, oder null, wenn sie
 * nicht zur API gehoert. Der Anbieter ist schon gefiltert (providerKey).
 */
export function mapEventLogRow(row: EventLogRow): ApiEvent | null {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    let type: ApiEventType | null = null;
    switch (row.type) {
        case 'scheduling_confirmed': case 'booking_created': type = 'booking.created'; break;
        case 'booking_rescheduled': type = 'booking.rescheduled'; break;
        case 'booking_cancelled': type = 'booking.cancelled'; break;
        case 'attendance_reported': {
            const outcome = String(p.outcome ?? '');
            type = outcome === 'attended' ? 'meeting.completed' : outcome === 'user_no_show' ? 'user.no_show' : outcome === 'provider_no_show' ? 'provider.no_show' : null;
            break;
        }
        case 'no_show_reported': type = 'provider.no_show'; break;
        case 'provider_performance_incident': case 'performance_incident': type = 'provider.no_show'; break;
        case 'lead.revealed': type = 'lead.revealed'; break;
        case 'lead.credit_issued': case 'credit_issued': type = 'lead.credit_issued'; break;
        case 'evidence_expiring': type = 'verification.expiring'; break;
        case 'lead_payment_failed': case 'payment_failed': type = 'payment.failed'; break;
        default: type = null;
    }
    if (!type) return null;
    const data: Record<string, unknown> = {};
    for (const f of EVENT_FIELDS[type]) {
        const v = p[f] ?? p[camel(f)];
        if (v !== undefined) data[f] = v;
    }
    const bookingId = p.bookingId ?? p.booking_id ?? p.bookingID ?? null;
    return { id: row.id, type, at: row.timestamp, booking_id: typeof bookingId === 'string' ? bookingId : null, data };
}

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Gehoert diese event_log-Zeile zu diesem Anbieter? Die Nutzlast traegt providerKey oder provider_key. */
export function eventBelongsTo(row: EventLogRow, providerKey: string): boolean {
    const p = (row.payload ?? {}) as Record<string, unknown>;
    return p.providerKey === providerKey || p.provider_key === providerKey;
}

// ─── Leads auf dem Draht ─────────────────────────────────────────────────────

export const EXT_STATUSES = ['new', 'contacted', 'proposal_sent', 'won', 'lost', 'closed'] as const;
export type ExtStatus = (typeof EXT_STATUSES)[number];

export interface BookingRowForApi {
    id: string;
    provider_key: string;
    status: string;
    slot_start: string;
    slot_end?: string | null;
    identity_revealed?: boolean | null;
    shared_fields?: string[] | null;
    user_email?: string | null;
    user_company?: string | null;
    message?: string | null;
    category?: string | null;
    country?: string | null;
    attendance_outcome?: string | null;
    no_show_by?: string | null;
    dispute_status?: string | null;
    ext_status?: string | null;
    ext_status_at?: string | null;
    rebooked_from?: string | null;
    created_at?: string | null;
    [k: string]: unknown;
}

export interface ApiLead {
    id: string;
    status: string;
    slot_start: string;
    slot_end: string | null;
    created_at: string | null;
    area_code: string | null;
    country: string | null;
    /** Nur die Felder, die die Buchungsbestaetigung freigegeben hat. */
    contact: { email: string | null; company: string | null; message: string | null };
    attendance: { outcome: string | null; no_show_by: string | null; dispute_status: string | null };
    ext_status: string | null;
    ext_status_at: string | null;
    rebooked_from: string | null;
}

/**
 * Buchung → Lead. Nur Buchungen mit Offenlegung erscheinen ueberhaupt; und
 * davon nur die Felder aus `shared_fields` (die Bestaetigung des Nutzers).
 * Alles andere ist null — nie ein Feld, das der Nutzer nicht freigegeben hat.
 */
export function serializeLead(b: BookingRowForApi): ApiLead | null {
    if (!b.identity_revealed) return null;
    const shared = new Set(Array.isArray(b.shared_fields) ? b.shared_fields : []);
    return {
        id: b.id,
        status: b.status,
        slot_start: b.slot_start,
        slot_end: b.slot_end ?? null,
        created_at: b.created_at ?? null,
        area_code: b.category ?? null,
        country: b.country ?? null,
        contact: {
            email: shared.has('email') ? (b.user_email ?? null) : null,
            company: shared.has('company_name') ? (b.user_company ?? null) : null,
            message: shared.has('message') ? (b.message ?? null) : null,
        },
        attendance: { outcome: b.attendance_outcome ?? null, no_show_by: b.no_show_by ?? null, dispute_status: b.dispute_status ?? null },
        ext_status: b.ext_status ?? null,
        ext_status_at: b.ext_status_at ?? null,
        rebooked_from: b.rebooked_from ?? null,
    };
}

export function isExtStatus(v: unknown): v is ExtStatus {
    return typeof v === 'string' && (EXT_STATUSES as readonly string[]).includes(v);
}

/** Obergrenze je Seite — kein Massen-Export (Spec B). */
export const PAGE_LIMIT_MAX = 100;
export function pageLimit(raw: string | null | undefined, fallback = 50): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(PAGE_LIMIT_MAX, Math.floor(n));
}

/** Was der Anbieter ueber seinen Client sieht — nie der Hash. */
export function clientView(c: ApiClientRow) {
    return {
        id: c.id, name: c.name, status: c.status,
        use_case: c.use_case ?? null, contact_name: c.contact_name ?? null, contact_email: c.contact_email ?? null,
        requested_scopes: c.requested_scopes ?? [], scopes: c.scopes ?? [],
        rate_limit_per_minute: c.rate_limit_per_minute,
        key_prefix: c.key_prefix ?? null, key_created_at: c.key_created_at ?? null,
        previous_key_valid_until: c.previous_key_valid_until ?? null,
        last_used_at: c.last_used_at ?? null,
        approved_at: c.approved_at ?? null, suspended_at: c.suspended_at ?? null, suspended_reason: c.suspended_reason ?? null,
        revoked_at: c.revoked_at ?? null, decision_note: c.decision_note ?? null, terms_version: c.terms_version ?? null,
        created_at: c.created_at ?? null,
    };
}
