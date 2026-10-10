import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { notify } from "./notifications.js";
import { sendAppointmentReminderMail, sendRebookReminderMail, sendCreditIssuedMail } from "./mailer.js";
import { resolveLedgerStatus } from "./billing.js";
import {
    appointmentReminderDue, reminderOffsetsCovered, rebookReminderDue, rebookDeadlinePassed, creditCents,
    loadAttendancePolicy,
} from "./attendance.js";

// ─── Phase 5: die beiden Waechter ────────────────────────────────────────────
//
// 1. Terminerinnerung: T-24h und T-1h an Nutzer und Anbieter (Entscheidung 4).
//    Idempotent ueber die beiden Flags der Buchung (`reminder_24h_sent`,
//    `reminder_1h_sent` — seit 2026-08 in der Tabelle, bis heute ungenutzt).
// 2. Neubuchung: Erinnerung an Tag 1, 5, 10 der Frist an den Nutzer; laeuft die
//    Frist ohne Neubuchung ab, entsteht bei einem Nutzer-No-Show das Guthaben
//    (Spec B Schritt 5: 30 % der gezahlten Gebuehr, nie Bargeld). Beim
//    Plattformfehler kein Guthaben — Spec B sagt "rescheduling without a
//    second lead fee", mehr nicht. `credit_decided_at` schliesst die Frist
//    genau einmal.
//
// Shadow (WATCHERS_SHADOW, Standard an) schreibt nur Marker ins event_log;
// erst der Live-Lauf schreibt Flags, Guthaben und Mails.

type Row = Record<string, any>;

export interface AttendanceTickCounts {
    appointmentReminders: number;
    rebookReminders: number;
    creditsIssued: number;
    deadlinesClosed: number;
    errors: number;
}

function markerType(base: string, shadow: boolean): string { return shadow ? `${base}_shadow` : base; }

async function mark(base: string, shadow: boolean, payload: Record<string, unknown>): Promise<void> {
    await supabaseApi.insert('event_log', { type: markerType(base, shadow), payload });
}

async function providerRow(providerKey: string): Promise<Row | null> {
    const rows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Row[];
    return rows[0] ?? null;
}

async function userRow(userId: string | null): Promise<Row | null> {
    if (!userId) return null;
    const rows = (await supabaseApi.select('users', { id: userId }, { limit: 1 })) as Row[];
    return rows[0] ?? null;
}

async function membersOf(providerKey: string): Promise<string[]> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
    return rows.map((m) => m.user_id).filter(Boolean);
}

/** Welche Stufen schon gingen, aus den beiden Flags; andere Offsets gelten als offen. */
function sentOffsets(b: Row, offsets: number[]): number[] {
    const out: number[] = [];
    if (b.reminder_24h_sent && offsets.includes(1440)) out.push(1440);
    if (b.reminder_1h_sent && offsets.includes(60)) out.push(60);
    return out;
}

function flagsFor(covered: number[]): Record<string, boolean> {
    const f: Record<string, boolean> = {};
    if (covered.includes(1440)) f.reminder_24h_sent = true;
    if (covered.includes(60)) f.reminder_1h_sent = true;
    return f;
}

export async function runAppointmentReminderTick(shadow: boolean, nowIso = new Date().toISOString()): Promise<AttendanceTickCounts> {
    const counts: AttendanceTickCounts = { appointmentReminders: 0, rebookReminders: 0, creditsIssued: 0, deadlinesClosed: 0, errors: 0 };
    let policy; let rows: Row[];
    try {
        policy = await loadAttendancePolicy(nowIso.slice(0, 10));
        rows = (await supabaseApi.select('scheduling', { status: 'confirmed' }, { limit: 500 })) as Row[];
    } catch { counts.errors++; return counts; }
    const horizon = Date.parse(nowIso) + (Math.max(0, ...policy.reminderOffsetsMin) + 1) * 60_000;
    const upcoming = rows.filter((b) => { const t = Date.parse(b.slot_start); return t > Date.parse(nowIso) && t <= horizon; });
    for (const b of upcoming) {
        try {
            const due = appointmentReminderDue({ slotStart: b.slot_start, nowIso, sentOffsets: sentOffsets(b, policy.reminderOffsetsMin), offsets: policy.reminderOffsetsMin });
            if (due === null) continue;
            const covered = reminderOffsetsCovered(policy.reminderOffsetsMin, due);
            if (shadow) {
                await mark('appointment_reminder', true, { bookingId: b.id, providerKey: b.provider_key, offsetMin: due });
                counts.appointmentReminders++;
                continue;
            }
            // Erst die Flags, dann der Versand: ein Absturz dazwischen kostet
            // eine Erinnerung, nie eine doppelte.
            await supabaseApi.update('scheduling', { id: b.id }, flagsFor(covered));
            const [prov, user] = await Promise.all([providerRow(b.provider_key), userRow(b.user_id ?? null)]);
            await notify({ to: b.user_id ?? null, type: 'appointment_reminder', subject: 'booking', subjectId: b.id,
                payload: { providerRef: prov?.public_ref, slot: b.slot_start, offset: String(due) }, dedupeKey: `appointment_reminder:${b.id}:${due}:user` });
            for (const m of await membersOf(b.provider_key)) {
                await notify({ to: m, type: 'appointment_reminder', subject: 'booking', subjectId: b.id,
                    payload: { providerKey: b.provider_key, slot: b.slot_start, offset: String(due) }, dedupeKey: `appointment_reminder:${b.id}:${due}:${m}` });
            }
            await sendAppointmentReminderMail({ to: user?.email ?? null, side: 'user', bookingId: b.id, providerKey: b.provider_key, slotIso: b.slot_start, offsetMin: due, locale: user?.language ?? undefined });
            await sendAppointmentReminderMail({ to: prov?.contact_email ?? null, side: 'provider', bookingId: b.id, providerKey: b.provider_key, slotIso: b.slot_start, offsetMin: due, locale: prov?.languages?.[0] });
            await mark('appointment_reminder', false, { bookingId: b.id, providerKey: b.provider_key, offsetMin: due });
            counts.appointmentReminders++;
        } catch { counts.errors++; }
    }
    return counts;
}

export async function runRebookTick(shadow: boolean, nowIso = new Date().toISOString()): Promise<AttendanceTickCounts> {
    const counts: AttendanceTickCounts = { appointmentReminders: 0, rebookReminders: 0, creditsIssued: 0, deadlinesClosed: 0, errors: 0 };
    const today = nowIso.slice(0, 10);
    let policy; let rows: Row[];
    try {
        policy = await loadAttendancePolicy(today);
        const [noShows, cancelled] = await Promise.all([
            supabaseApi.select('scheduling', { status: 'no_show' }, { limit: 500 }) as Promise<Row[]>,
            supabaseApi.select('scheduling', { status: 'cancelled' }, { limit: 500 }) as Promise<Row[]>,
        ]);
        rows = [...noShows, ...cancelled].filter((b) => b.rebook_deadline && !b.credit_decided_at && (b.no_show_by === 'user' || b.no_show_by === 'platform'));
    } catch { counts.errors++; return counts; }

    for (const b of rows) {
        try {
            const deadline = String(b.rebook_deadline);
            if (!rebookDeadlinePassed(deadline, today)) {
                // Noch in der Frist: Erinnerung faellig?
                const day = rebookReminderDue({ noShowAtIso: String(b.no_show_reported_at ?? b.updated_at ?? b.created_at), deadline, sent: Number(b.rebook_reminders_sent ?? 0), today, days: policy.rebookReminderDays });
                if (day === null) continue;
                if (b.dispute_status === 'open') continue; // solange der Admin prueft, keine Erinnerung
                if (shadow) { await mark('rebook_reminder', true, { bookingId: b.id, providerKey: b.provider_key, day }); counts.rebookReminders++; continue; }
                await supabaseApi.update('scheduling', { id: b.id }, { rebook_reminders_sent: Number(b.rebook_reminders_sent ?? 0) + 1 });
                const [prov, user] = await Promise.all([providerRow(b.provider_key), userRow(b.user_id ?? null)]);
                await notify({ to: b.user_id ?? null, type: 'rebook_reminder', subject: 'booking', subjectId: b.id,
                    payload: { providerRef: prov?.public_ref, deadline }, dedupeKey: `rebook_reminder:${b.id}:${day}` });
                await sendRebookReminderMail({ to: user?.email ?? null, bookingId: b.id, providerKey: b.provider_key, deadline, day, locale: user?.language ?? undefined });
                await mark('rebook_reminder', false, { bookingId: b.id, providerKey: b.provider_key, day });
                counts.rebookReminders++;
                continue;
            }

            // Frist abgelaufen. Offener Widerspruch haelt die Entscheidung an.
            if (b.dispute_status === 'open') continue;
            const creditable = b.no_show_by === 'user' && b.dispute_status !== 'upheld' && !!b.lead_ledger_id;
            let amount = 0; let ledger: Row | null = null;
            if (creditable) {
                const l = (await supabaseApi.select('provider_lead_ledger', { id: b.lead_ledger_id }, { limit: 1 })) as Row[];
                ledger = l[0] ?? null;
                if (ledger) {
                    const ev = (await supabaseApi.select('provider_lead_ledger_payment_events', { ledger_id: ledger.id }, { order: 'created_at.asc', limit: 20 })) as Array<{ status: string; created_at?: string }>;
                    const status = resolveLedgerStatus(ledger, ev);
                    amount = status === 'captured' ? creditCents(Number(ledger.final_fee_cents || 0), policy.creditPct) : 0;
                }
            }
            if (shadow) {
                await mark('rebook_deadline_closed', true, { bookingId: b.id, providerKey: b.provider_key, creditCents: amount });
                counts.deadlinesClosed++; if (amount > 0) counts.creditsIssued++;
                continue;
            }
            // Erst die Frist schliessen (einmalig), dann das Guthaben: der
            // Unique-Index auf provider_credits.booking_id faengt den Rest.
            await supabaseApi.update('scheduling', { id: b.id }, { credit_decided_at: nowIso, updated_at: nowIso });
            counts.deadlinesClosed++;
            if (amount > 0 && ledger) {
                await supabaseApi.insert('provider_credits', {
                    provider_key: b.provider_key, amount_cents: amount, currency: ledger.currency ?? 'USD', reason: 'user_no_rebook_30pct',
                    ledger_id: ledger.id, booking_id: b.id, note: `${policy.creditPct} % of ${ledger.final_fee_cents} · no rebooking by ${deadline}`,
                });
                // Spur im Ledger: eine credit-Zeile, die auf die Belastung zeigt (append-only, Spec B "credit history").
                await supabaseApi.insert('provider_lead_ledger', {
                    kind: 'credit', provider_key: b.provider_key, user_id: ledger.user_id ?? null, booking_id: b.id, refers_to: ledger.id,
                    area_code: ledger.area_code ?? null, subcategories: ledger.subcategories ?? [], countries: ledger.countries ?? [],
                    computed_band: ledger.computed_band, band_version: ledger.band_version ?? 1, standard_fee_cents: ledger.standard_fee_cents,
                    plan_code_at_charge: ledger.plan_code_at_charge ?? null, plan_version_at_charge: ledger.plan_version_at_charge ?? null,
                    discount_sequence: ledger.discount_sequence ?? null, discount_pct: ledger.discount_pct ?? 0, final_fee_cents: amount,
                    currency: ledger.currency ?? 'USD', payment_status: 'n/a', policy_version: ledger.policy_version,
                }).catch(() => { /* das Guthaben steht; die Ledger-Spur ist Dokumentation */ });
                await supabaseApi.insert('event_log', { type: 'lead.credit_issued', payload: { bookingId: b.id, providerKey: b.provider_key, ledgerId: ledger.id, creditCents: amount, currency: ledger.currency ?? 'USD', pct: policy.creditPct } });
                const prov = await providerRow(b.provider_key);
                for (const m of await membersOf(b.provider_key)) {
                    await notify({ to: m, type: 'credit_issued', subject: 'booking', subjectId: b.id, payload: { providerKey: b.provider_key, amount: String(amount) }, dedupeKey: `credit_issued:${b.id}:${m}` });
                }
                await sendCreditIssuedMail({ to: prov?.contact_email ?? null, providerKey: b.provider_key, bookingId: b.id, amountCents: amount, currency: ledger.currency ?? 'USD', pct: policy.creditPct, locale: prov?.languages?.[0] });
                counts.creditsIssued++;
            } else {
                await supabaseApi.insert('event_log', { type: 'rebook_deadline_closed', payload: { bookingId: b.id, providerKey: b.provider_key, noShowBy: b.no_show_by, creditCents: 0 } });
            }
        } catch {
            counts.errors++;
            structuredLog('error', 'Rebook tick failed for booking', { correlationId: 'watchers', errorCode: 'ERR_REBOOK_TICK', severity: 'error', route: 'watchers/rebook', bookingId: b.id } as Record<string, unknown>);
        }
    }
    return counts;
}
