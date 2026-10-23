import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Offenlegung erst nach dem Audit (23.10.2026) ────────────────────────────
//
// Bei einer Buchung gehen die Daten, die der Nutzer im Pruefdialog bestaetigt
// hat (shared_snapshot), an den Anbieter — ein Grenzuebertritt. Die Regel
// (.agents/rules/privacy-audit-required.md, CLAUDE.md "Grenzuebertritte
// werden auditiert") verlangt dafuer einen Eintrag im Audit-Log.
//
// Bis hierher sah der Anbieter die Daten ab dem Insert (`identity_revealed`),
// und `lead.revealed` kam danach — scheiterte es, wurde es nur geloggt. Das
// Audit trug ausserdem immer die Feldliste v1, nicht die bestaetigte.
//
// Jetzt: Die Sicht des Anbieters haengt an `shared_released_at` (Migration
// 20261023000000). Es wird erst gesetzt, wenn `lead.revealed` mit den
// tatsaechlich geteilten Feldern steht. Scheitert das Audit, bleibt der Termin
// bestehen — der Nutzer verliert nichts, weil bei uns ein Protokoll klemmt —,
// und `runDisclosureAuditTick` traegt es aus der Buchungszeile nach.
// `identity_revealed` (der Nutzer sieht den Anbieter) bleibt davon unberuehrt.

export const DISCLOSURE_EVENT = "lead.revealed";

/** Die Felder der Buchung, aus denen das Audit entsteht — beim Buchen, Neubuchen und im Nachtrag. */
export interface DisclosureBooking {
    id: string;
    provider_key: string;
    user_id?: string | null;
    shared_fields?: string[] | null;
    acknowledgement_version?: string | null;
    sharing_confirmed_at?: string | null;
}

export function disclosurePayload(b: DisclosureBooking, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        bookingId: b.id,
        providerKey: b.provider_key,
        userId: b.user_id ?? null,
        sharedFields: Array.isArray(b.shared_fields) ? [...b.shared_fields] : [],
        acknowledgementVersion: b.acknowledgement_version ?? null,
        sharingConfirmedAt: b.sharing_confirmed_at ?? null,
        ...extra,
    };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Der Index event_log_lead_revealed_once: das Audit dieser Buchung steht schon. */
const isDuplicate = (err: unknown) => /23505|duplicate key|event_log_lead_revealed_once/i.test(String(err));

export interface AuditOptions { delaysMs?: number[]; timeoutMs?: number; correlationId?: string }

/**
 * Schreibt das Audit der Offenlegung, mit Wiederholung und Timeout je Versuch
 * (der Nutzer wartet auf seine Bestaetigung). `true`, wenn der Eintrag steht —
 * auch, wenn er schon vorher stand.
 */
export async function auditDisclosure(payload: Record<string, unknown>, opts: AuditOptions = {}): Promise<boolean> {
    const delays = opts.delaysMs ?? [0, 250, 1000];
    let last: unknown = null;
    for (const d of delays) {
        if (d) await wait(d);
        try {
            await supabaseApi.insert("event_log", { type: DISCLOSURE_EVENT, payload }, { timeoutMs: opts.timeoutMs ?? 3000 });
            return true;
        } catch (err) {
            if (isDuplicate(err)) return true;
            last = err;
        }
    }
    structuredLog("error", "Disclosure audit failed — disclosure held back", {
        correlationId: opts.correlationId, errorCode: "ERR_DISCLOSURE_AUDIT", severity: "error",
        bookingId: payload.bookingId, detail: String(last).slice(0, 200),
    });
    return false;
}

/**
 * Freigabe, nur wenn noch nicht freigegeben und nicht storniert — eine
 * Stornierung zwischen Lesen und Schreiben gibt so nichts frei.
 */
async function release(bookingId: string): Promise<void> {
    await supabaseApi.updateWhere("scheduling",
        { id: `eq.${bookingId}`, shared_released_at: "is.null", status: "neq.cancelled" },
        { shared_released_at: new Date().toISOString() });
}

/**
 * Audit, dann Freigabe. `true`, wenn beides lief. Scheitert ein Schritt, holt
 * der Tick ihn nach.
 */
export async function revealAfterAudit(b: DisclosureBooking, opts: AuditOptions & { extra?: Record<string, unknown> } = {}): Promise<boolean> {
    if (!(await auditDisclosure(disclosurePayload(b, opts.extra), opts))) return false;
    try {
        await release(b.id);
        return true;
    } catch (err) {
        structuredLog("error", "Disclosure audited but not released — tick will finish it", {
            correlationId: opts.correlationId, errorCode: "ERR_DISCLOSURE_RELEASE", severity: "error",
            bookingId: b.id, detail: String(err).slice(0, 200),
        });
        return false;
    }
}

export interface DisclosureTickCounts { checked: number; audited: number; released: number; errors: number }

/** Nur Buchungen, die aelter sind — eine laufende Buchung schreibt ihr Audit gerade selbst. */
export const DISCLOSURE_TICK_MIN_AGE_MS = 2 * 60 * 1000;

/**
 * Nachtrag: Buchungen mit bestaetigter Offenlegung, die noch nicht frei-
 * gegeben sind. Fehlt das Audit, wird es aus der Buchungszeile geschrieben
 * (`reconstructed: true`), dann freigegeben. Stornierte bleiben zu — ohne
 * Termin braucht der Anbieter die Daten nicht.
 *
 * Bewusst NICHT am Shadow-Schalter: der Pass fuehrt nur aus, was der Nutzer
 * bestaetigt hat und der Buchungspfad selbst getan haette, und er faellt
 * geschlossen aus. Im Shadow-Modus bliebe eine Buchung sonst dauerhaft zu —
 * der Anbieter belastet, ohne Kontakt.
 */
export async function runDisclosureAuditTick(now: Date = new Date()): Promise<DisclosureTickCounts> {
    const counts: DisclosureTickCounts = { checked: 0, audited: 0, released: 0, errors: 0 };
    const before = new Date(now.getTime() - DISCLOSURE_TICK_MIN_AGE_MS).toISOString();
    const rows = (await supabaseApi.selectWhere("scheduling", {
        select: "id,provider_key,user_id,shared_fields,acknowledgement_version,sharing_confirmed_at,status,created_at",
        shared_released_at: "is.null",
        sharing_confirmed_at: "not.is.null",
        status: "neq.cancelled",
        created_at: `lt.${before}`,
    }, { order: "created_at.asc", limit: 200 })) as Array<DisclosureBooking & { status: string }>;

    for (const b of rows) {
        counts.checked++;
        try {
            const existing = (await supabaseApi.select("event_log", { type: DISCLOSURE_EVENT, "payload->>bookingId": b.id }, { limit: 1 })) as unknown[];
            if (existing.length === 0) {
                try {
                    await supabaseApi.insert("event_log", { type: DISCLOSURE_EVENT, payload: disclosurePayload(b, { reconstructed: true }) });
                    counts.audited++;
                } catch (err) {
                    // Ein paralleler Lauf war schneller: das Audit steht.
                    if (!isDuplicate(err)) throw err;
                }
            }
            await release(b.id);
            counts.released++;
        } catch (err) {
            counts.errors++;
            structuredLog("error", "Disclosure tick failed for a booking", {
                correlationId: "watchers", errorCode: "ERR_DISCLOSURE_TICK", severity: "error",
                bookingId: b.id, detail: String(err).slice(0, 200),
            });
        }
    }
    return counts;
}
