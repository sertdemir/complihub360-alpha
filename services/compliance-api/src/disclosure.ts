import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";

// ─── Offenlegung erst nach dem Audit (23.10.2026) ────────────────────────────
//
// Bei einer Buchung gehen die Daten, die der Nutzer im Pruefdialog bestaetigt
// hat (shared_snapshot), an den Anbieter — ein Grenzuebertritt. Die Regel
// (.agents/rules/privacy-audit-required.md, CLAUDE.md "Grenzuebertritte
// werden auditiert") verlangt dafuer einen Eintrag im Audit-Log.
//
// Bis hierher stand die Buchung schon mit `identity_revealed: true` in der
// Datenbank, bevor `lead.revealed` geschrieben wurde — und scheiterte das
// Schreiben, wurde es nur geloggt. Die Offenlegung lief dann ohne Spur. Das
// Audit trug ausserdem immer die Feldliste v1, nicht die, die der Nutzer
// bestaetigt hatte.
//
// Jetzt: Die Buchung entsteht mit `identity_revealed: false`. Erst wenn
// `lead.revealed` (mit den tatsaechlich geteilten Feldern) geschrieben ist,
// wird freigegeben. Scheitert das Audit, bleibt der Termin bestehen — der
// Nutzer verliert nichts, weil bei uns ein Protokoll klemmt —, aber der
// Anbieter sieht die Daten erst, wenn `runDisclosureAuditTick` das Audit aus
// der Buchungszeile nachgetragen hat.

export const DISCLOSURE_EVENT = "lead.revealed";

/** Die Felder der Buchung, aus denen das Audit entsteht — beim Buchen wie im Nachtrag. */
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

/**
 * Schreibt das Audit der Offenlegung, mit Wiederholung. `true` nur, wenn der
 * Eintrag steht. Die Pausen sind kurz: der Nutzer wartet auf seine Bestaetigung.
 */
export async function auditDisclosure(payload: Record<string, unknown>, opts: { delaysMs?: number[]; correlationId?: string } = {}): Promise<boolean> {
    const delays = opts.delaysMs ?? [0, 250, 1000];
    let last: unknown = null;
    for (const d of delays) {
        if (d) await wait(d);
        try {
            await supabaseApi.insert("event_log", { type: DISCLOSURE_EVENT, payload });
            return true;
        } catch (err) { last = err; }
    }
    structuredLog("error", "Disclosure audit failed — disclosure held back", {
        correlationId: opts.correlationId, errorCode: "ERR_DISCLOSURE_AUDIT", severity: "error",
        bookingId: payload.bookingId, detail: String(last).slice(0, 200),
    });
    return false;
}

/**
 * Audit, dann Freigabe. `true`, wenn der Anbieter die geteilten Daten jetzt
 * sieht. Scheitert einer der beiden Schritte, holt der Tick ihn nach.
 */
export async function revealAfterAudit(b: DisclosureBooking, opts: { delaysMs?: number[]; correlationId?: string } = {}): Promise<boolean> {
    if (!(await auditDisclosure(disclosurePayload(b), opts))) return false;
    try {
        await supabaseApi.update("scheduling", { id: b.id }, { identity_revealed: true });
        return true;
    } catch (err) {
        structuredLog("error", "Disclosure audited but flag not set — tick will finish it", {
            correlationId: opts.correlationId, errorCode: "ERR_DISCLOSURE_FLAG", severity: "error",
            bookingId: b.id, detail: String(err).slice(0, 200),
        });
        return false;
    }
}

export interface DisclosureTickCounts { checked: number; audited: number; revealed: number; errors: number }

/** Nur Buchungen, die aelter sind — eine laufende Buchung schreibt ihr Audit gerade selbst. */
export const DISCLOSURE_TICK_MIN_AGE_MS = 2 * 60 * 1000;

/**
 * Nachtrag: Buchungen mit bestaetigter Offenlegung, die noch nicht frei-
 * gegeben sind. Fehlt das Audit, wird es aus der Buchungszeile geschrieben
 * (`reconstructed: true`), dann freigegeben. Stornierte bleiben zu — ohne
 * Termin braucht der Anbieter die Daten nicht. Shadow schreibt nur Marker.
 */
export async function runDisclosureAuditTick(shadow: boolean, now: Date = new Date()): Promise<DisclosureTickCounts> {
    const counts: DisclosureTickCounts = { checked: 0, audited: 0, revealed: 0, errors: 0 };
    const before = new Date(now.getTime() - DISCLOSURE_TICK_MIN_AGE_MS).toISOString();
    const rows = (await supabaseApi.selectWhere("scheduling", {
        select: "id,provider_key,user_id,shared_fields,acknowledgement_version,sharing_confirmed_at,status,created_at",
        identity_revealed: "is.false",
        sharing_confirmed_at: "not.is.null",
        status: "neq.cancelled",
        created_at: `lt.${before}`,
    }, { order: "created_at.asc", limit: 200 })) as Array<DisclosureBooking & { status: string }>;

    for (const b of rows) {
        counts.checked++;
        try {
            const existing = (await supabaseApi.select("event_log", { type: DISCLOSURE_EVENT, "payload->>bookingId": b.id }, { limit: 1 })) as unknown[];
            if (shadow) {
                // Ein Marker je Buchung, nicht einer je Tick.
                const marked = (await supabaseApi.select("event_log", { type: `${DISCLOSURE_EVENT}_shadow`, "payload->>bookingId": b.id }, { limit: 1 })) as unknown[];
                if (!marked.length) await supabaseApi.insert("event_log", { type: `${DISCLOSURE_EVENT}_shadow`, payload: { bookingId: b.id, providerKey: b.provider_key, auditMissing: existing.length === 0 } });
                continue;
            }
            if (existing.length === 0) {
                await supabaseApi.insert("event_log", { type: DISCLOSURE_EVENT, payload: disclosurePayload(b, { reconstructed: true }) });
                counts.audited++;
            }
            await supabaseApi.update("scheduling", { id: b.id }, { identity_revealed: true });
            counts.revealed++;
        } catch { counts.errors++; }
    }
    return counts;
}
