import type { IncomingMessage, ServerResponse } from "node:http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { notify } from "./notifications.js";
import { sendNoShowMail } from "./mailer.js";
import {
    attendanceReportable, disputeOpen, loadAttendancePolicy, rebookDeadline, canReschedule,
    type AttendancePolicy,
} from "./attendance.js";

// ─── Phase 5: Routen und Schreibpfade fuer Anwesenheit ───────────────────────
//
// Spec B "Booking attendance, cancellation and credits", ADR-0007. Die
// Reihenfolge ist in jedem Pfad dieselbe: pruefen (reine Funktion) →
// schreiben (scheduling, Vorfall) → protokollieren (event_log) →
// benachrichtigen (notify, Mail; nebenlaeufig). Geld fliesst hier nie: das
// Guthaben entsteht im Waechter (attendanceWatch.ts), wenn die Frist ohne
// Neubuchung ablaeuft.
//
// Wer was melden darf:
//   Anbieter  → attended | user_no_show | platform_failure  (diese Datei)
//   Nutzer    → provider_no_show (bestehendes PATCH /scheduling/:id, status
//               no_show) und Widerspruch gegen einen user_no_show (action
//               dispute) — beide rufen die Helfer unten
//   Admin     → Widerspruch entscheiden (upheld | dismissed)

type Json = Record<string, unknown>;

function readJson(req: IncomingMessage, max = 10_000): Promise<Json> {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); if (raw.length > max) req.destroy(); });
        req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    });
}

function json(res: ServerResponse, status: number, body: Json): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function membersOf(providerKey: string): Promise<string[]> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
    return rows.map((m) => m.user_id).filter(Boolean);
}

/** Die Felder, die beide Buchungslisten seit Phase 5 tragen. Nie Geld. */
export function attendanceFields(b: Json, policy: AttendancePolicy, nowIso: string): Json {
    const reportedAt = typeof b.no_show_reported_at === 'string' ? b.no_show_reported_at : null;
    return {
        no_show_by: b.no_show_by ?? null,
        no_show_reported_at: reportedAt,
        dispute_status: b.dispute_status ?? 'none',
        rebook_deadline: b.rebook_deadline ?? null,
        rebooked_from: b.rebooked_from ?? null,
        reschedule_count: Number(b.reschedule_count ?? 0),
        reschedule_limit: policy.rescheduleLimit,
        attendance_reportable: attendanceReportable(String(b.status), String(b.slot_end ?? b.slot_start), nowIso),
        dispute_open_until: b.no_show_by === 'user' && reportedAt && b.dispute_status === 'none'
            ? new Date(Date.parse(reportedAt) + policy.disputeHours * 3_600_000).toISOString() : null,
        rebook_open: !!b.rebook_deadline && !b.credit_decided_at && nowIso.slice(0, 10) <= String(b.rebook_deadline),
    };
}

// ─── Anbieter meldet die Anwesenheit ─────────────────────────────────────────

export async function handleProviderAttendance(
    req: IncomingMessage, res: ServerResponse, correlationId: string,
    actorUserId: string | null, providerKey: string, bookingId: string,
): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const d = await readJson(req);
        const outcome = typeof d.outcome === 'string' ? d.outcome : '';
        if (!['attended', 'user_no_show', 'platform_failure'].includes(outcome)) {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'outcome must be attended|user_no_show|platform_failure', correlationId }); return;
        }
        const note = typeof d.note === 'string' ? d.note.slice(0, 500) : null;
        const rows = (await supabaseApi.select('scheduling', { id: bookingId }, { limit: 1 })) as Json[];
        const b = rows[0];
        if (!b || b.provider_key !== providerKey) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Booking not found', correlationId }); return; }
        const now = new Date();
        const nowIso = now.toISOString();
        if (!attendanceReportable(String(b.status), String(b.slot_end ?? b.slot_start), nowIso)) {
            json(res, 409, { errorCode: 'NOT_REPORTABLE', message: 'Attendance can be reported for a confirmed appointment after its end', status: b.status, correlationId }); return;
        }
        const policy = await loadAttendancePolicy(nowIso.slice(0, 10));

        if (outcome === 'attended') {
            await supabaseApi.update('scheduling', { id: bookingId }, { status: 'completed', updated_at: nowIso, attendance: { source: 'provider_report', reported_at: nowIso } });
            try {
                const provs = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Json[];
                if (provs[0]) await supabaseApi.update('providers', { provider_key: providerKey }, { completed_count: Number(provs[0].completed_count || 0) + 1 });
            } catch { /* Aggregat darf die Meldung nicht kippen */ }
            await supabaseApi.insert('event_log', { type: 'attendance_reported', payload: { bookingId, providerKey, outcome, by: actorUserId } });
            json(res, 200, { ok: true, id: bookingId, status: 'completed', correlationId });
            return;
        }

        if (outcome === 'user_no_show') {
            // Spec B: Lead bleibt aktiv, Gebuehr bleibt, 14 Tage Neubuchung,
            // danach 30 % Guthaben — das entscheidet der Waechter.
            const deadline = rebookDeadline(nowIso, policy.rebookDays);
            await supabaseApi.update('scheduling', { id: bookingId }, {
                status: 'no_show', no_show_by: 'user', no_show_reported_at: nowIso, no_show_reported_by: actorUserId,
                rebook_deadline: deadline, rebook_reminders_sent: 0, dispute_status: 'none', dispute_note: note, updated_at: nowIso,
                attendance: { source: 'provider_report', reported_at: nowIso },
            });
            await supabaseApi.insert('event_log', { type: 'booking_user_no_show', payload: { bookingId, providerKey, userId: b.user_id ?? null, deadline, by: actorUserId } });
            const userId = typeof b.user_id === 'string' ? b.user_id : null;
            (async () => {
                const refRows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Json[];
                await notify({ to: userId, actor: actorUserId, type: 'no_show_reported', subject: 'booking', subjectId: bookingId,
                    payload: { providerRef: typeof refRows[0]?.public_ref === 'string' ? refRows[0].public_ref : undefined, deadline, from: String(b.slot_start) },
                    dedupeKey: `no_show_reported:${bookingId}` });
                const users = (await supabaseApi.select('users', userId ? { id: userId } : { id: '' }, { limit: 1 })) as Array<{ email?: string | null; language?: string | null }>;
                await sendNoShowMail({ to: users[0]?.email ?? null, bookingId, providerKey, deadline, disputeHours: policy.disputeHours, locale: users[0]?.language ?? undefined, correlationId });
            })().catch(() => { /* im Mailer protokolliert */ });
            json(res, 200, { ok: true, id: bookingId, status: 'no_show', no_show_by: 'user', rebook_deadline: deadline, dispute_hours: policy.disputeHours, correlationId });
            return;
        }

        // platform_failure: Spec B "Technical platform failures must be recorded
        // separately and should lead to rescheduling without a second lead
        // fee." Kein Vorfall, kein Guthaben, die Frist laeuft wie beim No-Show.
        const deadline = rebookDeadline(nowIso, policy.rebookDays);
        await supabaseApi.update('scheduling', { id: bookingId }, {
            status: 'cancelled', cancelled_by: 'system', cancelled_at: nowIso, no_show_by: 'platform',
            no_show_reported_at: nowIso, no_show_reported_by: actorUserId, rebook_deadline: deadline, rebook_reminders_sent: 0,
            dispute_note: note, updated_at: nowIso, attendance: { source: 'provider_report', reported_at: nowIso, platform_failure: true },
        });
        await supabaseApi.insert('event_log', { type: 'booking_platform_failure', payload: { bookingId, providerKey, userId: b.user_id ?? null, deadline, by: actorUserId, note } });
        const userId = typeof b.user_id === 'string' ? b.user_id : null;
        (async () => {
            const refRows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Json[];
            await notify({ to: userId, actor: actorUserId, type: 'booking_cancelled', subject: 'booking', subjectId: bookingId,
                payload: { providerRef: typeof refRows[0]?.public_ref === 'string' ? refRows[0].public_ref : undefined, from: String(b.slot_start), deadline },
                dedupeKey: `platform_failure:${bookingId}` });
        })().catch(() => {});
        json(res, 200, { ok: true, id: bookingId, status: 'cancelled', no_show_by: 'platform', rebook_deadline: deadline, correlationId });
    } catch {
        structuredLog('error', 'Attendance report failed', { correlationId, errorCode: 'ERR_ATTENDANCE', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Attendance report failed', correlationId });
    }
}

// ─── Nutzer meldet: der Anbieter fehlte ──────────────────────────────────────

/** Nach dem Statuswechsel auf no_show durch den Nutzer: Vorfall, Anbieter informiert. Kein Guthaben (Spec B). */
export async function recordProviderNoShow(b: Json, actorUserId: string | null, correlationId: string): Promise<void> {
    const bookingId = String(b.id); const providerKey = String(b.provider_key);
    const nowIso = new Date().toISOString();
    await supabaseApi.update('scheduling', { id: bookingId }, { no_show_by: 'provider', no_show_reported_at: nowIso, no_show_reported_by: actorUserId });
    const existing = (await supabaseApi.select('provider_performance_incidents', { booking_id: bookingId }, { limit: 1 })) as Json[];
    if (!existing.length) {
        await supabaseApi.insert('provider_performance_incidents', { provider_key: providerKey, booking_id: bookingId, kind: 'no_show', source: 'user_report', recorded_at: nowIso });
    }
    await supabaseApi.insert('event_log', { type: 'provider_performance_incident', payload: { bookingId, providerKey, kind: 'no_show', source: 'user_report', by: actorUserId } });
    (async () => {
        for (const m of await membersOf(providerKey)) {
            await notify({ to: m, actor: actorUserId, type: 'performance_incident', subject: 'booking', subjectId: bookingId,
                payload: { providerKey, slot: String(b.slot_start) }, dedupeKey: `performance_incident:${bookingId}:${m}` });
        }
    })().catch(() => { void correlationId; });
}

// ─── Widerspruch ─────────────────────────────────────────────────────────────

export async function openDispute(b: Json, note: string | null, actorUserId: string | null, correlationId: string):
    Promise<{ ok: true; until: string } | { ok: false; status: number; code: string; message: string }> {
    const nowIso = new Date().toISOString();
    const policy = await loadAttendancePolicy(nowIso.slice(0, 10));
    if (b.no_show_by !== 'user') return { ok: false, status: 409, code: 'NOT_DISPUTABLE', message: 'Only a reported user no-show can be disputed' };
    if (b.dispute_status !== 'none') return { ok: false, status: 409, code: 'ALREADY_DISPUTED', message: 'This report has already been disputed' };
    const reportedAt = typeof b.no_show_reported_at === 'string' ? b.no_show_reported_at : null;
    if (!disputeOpen(reportedAt, nowIso, policy.disputeHours)) return { ok: false, status: 409, code: 'DISPUTE_WINDOW_CLOSED', message: `Objections are possible within ${policy.disputeHours} hours of the report` };
    const bookingId = String(b.id); const providerKey = String(b.provider_key);
    await supabaseApi.update('scheduling', { id: bookingId }, { dispute_status: 'open', disputed_at: nowIso, dispute_note: note, updated_at: nowIso });
    await supabaseApi.insert('event_log', { type: 'no_show_disputed', payload: { bookingId, providerKey, userId: b.user_id ?? null, by: actorUserId } });
    (async () => {
        for (const m of await membersOf(providerKey)) {
            await notify({ to: m, actor: actorUserId, type: 'dispute_opened', subject: 'booking', subjectId: bookingId, payload: { providerKey, slot: String(b.slot_start) }, dedupeKey: `dispute_opened:${bookingId}:${m}` });
        }
    })().catch(() => { void correlationId; });
    return { ok: true, until: new Date(Date.parse(reportedAt!) + policy.disputeHours * 3_600_000).toISOString() };
}

export async function handleAdminDispute(req: IncomingMessage, res: ServerResponse, correlationId: string, bookingId: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const d = await readJson(req);
        const resolution = d.resolution === 'upheld' || d.resolution === 'dismissed' ? d.resolution : '';
        if (!resolution) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'resolution must be upheld|dismissed', correlationId }); return; }
        const rows = (await supabaseApi.select('scheduling', { id: bookingId }, { limit: 1 })) as Json[];
        const b = rows[0];
        if (!b) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Booking not found', correlationId }); return; }
        if (b.dispute_status !== 'open') { json(res, 409, { errorCode: 'NO_OPEN_DISPUTE', message: 'Nothing to decide', correlationId }); return; }
        const nowIso = new Date().toISOString();
        const note = typeof d.note === 'string' ? d.note.slice(0, 500) : null;
        const providerKey = String(b.provider_key);
        if (resolution === 'upheld') {
            // Der Nutzer hatte recht: es war der Anbieter. Kein Guthaben, ein
            // Vorfall, die Neubuchungsfrist bleibt als Angebot an den Nutzer.
            await supabaseApi.update('scheduling', { id: bookingId }, { dispute_status: 'upheld', no_show_by: 'provider', credit_decided_at: nowIso, dispute_note: note ?? b.dispute_note ?? null, updated_at: nowIso });
            const existing = (await supabaseApi.select('provider_performance_incidents', { booking_id: bookingId }, { limit: 1 })) as Json[];
            if (!existing.length) await supabaseApi.insert('provider_performance_incidents', { provider_key: providerKey, booking_id: bookingId, kind: 'no_show', source: 'admin', note, recorded_at: nowIso });
        } else {
            await supabaseApi.update('scheduling', { id: bookingId }, { dispute_status: 'dismissed', dispute_note: note ?? b.dispute_note ?? null, updated_at: nowIso });
        }
        await supabaseApi.insert('event_log', { type: 'no_show_dispute_resolved', payload: { bookingId, providerKey, userId: b.user_id ?? null, resolution, note } });
        (async () => {
            const refRows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Json[];
            const providerRef = typeof refRows[0]?.public_ref === 'string' ? refRows[0].public_ref : undefined;
            await notify({ to: typeof b.user_id === 'string' ? b.user_id : null, type: 'dispute_resolved', subject: 'booking', subjectId: bookingId, payload: { providerRef, label: resolution }, dedupeKey: `dispute_resolved:${bookingId}:user` });
            for (const m of await membersOf(providerKey)) {
                await notify({ to: m, type: 'dispute_resolved', subject: 'booking', subjectId: bookingId, payload: { providerKey, label: resolution }, dedupeKey: `dispute_resolved:${bookingId}:${m}` });
            }
        })().catch(() => {});
        json(res, 200, { ok: true, id: bookingId, dispute_status: resolution, no_show_by: resolution === 'upheld' ? 'provider' : b.no_show_by, correlationId });
    } catch {
        structuredLog('error', 'Dispute resolution failed', { correlationId, errorCode: 'ERR_DISPUTE', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Dispute resolution failed', correlationId });
    }
}

// ─── Neubuchung in der Frist: neue Zeile, derselbe Lead ──────────────────────

/**
 * Spec B Schritt 4: "If the user rebooks, keep the original charge and do not
 * issue a second lead charge." Die neue Buchung erbt das Ledger, zeigt auf die
 * alte (`rebooked_from`), und die alte Frist ist damit erledigt — ohne
 * Guthaben.
 */
export async function rebookWithoutFee(b: Json, slotStartIso: string, actorUserId: string | null): Promise<Json> {
    const nowIso = new Date().toISOString();
    const slotEnd = new Date(Date.parse(slotStartIso) + 30 * 60 * 1000).toISOString();
    const inserted = (await supabaseApi.insert('scheduling', {
        provider_key: b.provider_key, user_id: b.user_id, slot_start: slotStartIso, slot_end: slotEnd, status: 'confirmed',
        message: b.message ?? null, lead_charged: false, identity_revealed: true, service_id: b.service_id ?? null,
        price_snapshot: b.price_snapshot ?? null, shared_fields: b.shared_fields ?? null, sharing_confirmed_at: b.sharing_confirmed_at ?? nowIso,
        // Schritt 4 (B1): die Neubuchung teilt dasselbe, was der Nutzer bestaetigt hat.
        shared_snapshot: b.shared_snapshot ?? null,
        acknowledgement_version: b.acknowledgement_version ?? null, lead_ledger_id: b.lead_ledger_id ?? null,
        user_discount_pct: b.user_discount_pct ?? null, user_discount_policy_version: b.user_discount_policy_version ?? null,
        rebooked_from: b.id,
    })) as Json[];
    const row = inserted[0];
    await supabaseApi.update('scheduling', { id: String(b.id) }, { credit_decided_at: nowIso, updated_at: nowIso });
    await supabaseApi.insert('event_log', { type: 'booking_rebooked', payload: { bookingId: row?.id, fromBookingId: b.id, providerKey: b.provider_key, userId: b.user_id ?? null, slotStart: slotStartIso, by: actorUserId } });
    return row;
}

export function rescheduleAllowed(b: Json, policy: AttendancePolicy): boolean {
    return canReschedule(Number(b.reschedule_count ?? 0), policy.rescheduleLimit);
}
