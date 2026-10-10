import type { IncomingMessage, ServerResponse } from "node:http";
import { structuredLog } from "@complihub360/types";
import { supabaseApi } from "./supabase.js";
import { notify } from "./notifications.js";
import { sendSerialNoShowMail } from "./mailer.js";
import { getActiveSubscription, loadPricingConfig, getDiscountCounter, cycleStartFor, resolveLedgerStatus } from "./billing.js";
import {
    loadPerformancePolicy, computePerformance, analyticsDepth, trendsBy, bookingsCsv, incidentsInWindow, userNoShowsInWindow,
    serialNoShowState, bookingOpen, type BookingFact, type IncidentFact, type ReviewFact, type PerformancePolicy,
} from "./performance.js";

// ─── Phase 6: Performance, Uebersicht, Durchsetzung ──────────────────────────
//
// ADR-0009. Alles, was hier auf den Draht geht, ist aus Zeilen gerechnet
// (performance.ts) — keine gespeicherten Kennzahlen, keine Annahmen. Geld
// (Band, Gebuehr, Guthaben) steht nur in der Uebersicht des Anbieters, nie in
// einer Antwort an den Nutzer.

type Json = Record<string, any>;

function json(res: ServerResponse, status: number, body: Json): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Json> {
    let raw = '';
    for await (const chunk of req) raw += chunk.toString();
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function membersOf(providerKey: string): Promise<string[]> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 20 })) as Array<{ user_id: string }>;
    return rows.map((m) => m.user_id).filter(Boolean);
}

/** Buchungen eines Anbieters als Fakten, mit Bereich und Land aus dem Ledger. */
export async function loadBookingFacts(providerKey: string): Promise<BookingFact[]> {
    const rows = (await supabaseApi.select('scheduling', { provider_key: providerKey }, { limit: 2000 })) as Json[];
    const ledgerIds = [...new Set(rows.map((r) => r.lead_ledger_id).filter(Boolean))];
    const ledger = ledgerIds.length ? (await supabaseApi.select('provider_lead_ledger', { provider_key: providerKey }, { limit: 2000 })) as Json[] : [];
    const byId = new Map(ledger.map((l) => [l.id, l]));
    return rows.map((r) => {
        const l = r.lead_ledger_id ? byId.get(r.lead_ledger_id) : undefined;
        return {
            id: String(r.id), slot_start: String(r.slot_start), status: String(r.status),
            no_show_by: r.no_show_by ?? null, cancelled_by: r.cancelled_by ?? null, dispute_status: r.dispute_status ?? null,
            area_code: l?.area_code ?? null, country: Array.isArray(l?.countries) && l.countries.length ? String(l.countries[0]) : null,
        };
    });
}

async function loadIncidents(providerKey: string): Promise<IncidentFact[]> {
    const rows = (await supabaseApi.select('provider_performance_incidents', { provider_key: providerKey }, { limit: 500 })) as Json[];
    return rows.map((r) => ({ id: String(r.id), booking_id: r.booking_id ?? null, kind: String(r.kind), recorded_at: String(r.recorded_at) }));
}

async function loadReviews(providerKey: string): Promise<ReviewFact[]> {
    const rows = (await supabaseApi.select('reviews', { provider_key: providerKey, from_role: 'user' }, { limit: 1000 })) as Json[];
    return rows.filter((r) => r.booking_id).map((r) => ({ rating: r.rating == null ? null : Number(r.rating), categories: r.categories ?? null, created_at: String(r.created_at), from_role: r.from_role, verified: r.verified !== false }));
}

async function analyticsLevelOf(providerKey: string): Promise<string | null> {
    const sub = await getActiveSubscription(providerKey);
    if (!sub) return null;
    const cfg = await loadPricingConfig();
    return cfg.plans.find((p) => p.code === sub.planCode)?.analyticsLevel ?? null;
}

async function openEnforcement(providerKey: string): Promise<Json | null> {
    const rows = (await supabaseApi.select('provider_enforcement_actions', { provider_key: providerKey }, { limit: 50 })) as Json[];
    const open = rows.filter((r) => !r.lifted_at).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return open[0] ?? null;
}

function enforcementWire(e: Json | null): Json | null {
    if (!e) return null;
    return {
        id: e.id, action: e.action, source: e.source, reason: e.reason, created_at: e.created_at,
        appeal_at: e.appeal_at ?? null, decision: e.decision ?? null, decided_at: e.decided_at ?? null, lifted_at: e.lifted_at ?? null,
        incident_count: Array.isArray(e.evidence?.incident_ids) ? e.evidence.incident_ids.length : null,
    };
}

// ─── GET /provider/:key/performance ──────────────────────────────────────────

export async function handleProviderPerformance(req: IncomingMessage, res: ServerResponse, correlationId: string, providerKey: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const url = new URL(req.url || '/', 'http://x');
        const format = url.searchParams.get('format');
        const policy = await loadPerformancePolicy();
        const [bookings, incidents, reviews, level, enforcement] = await Promise.all([
            loadBookingFacts(providerKey), loadIncidents(providerKey), loadReviews(providerKey), analyticsLevelOf(providerKey), openEnforcement(providerKey),
        ]);
        const depth = analyticsDepth(level);
        if (format === 'csv') {
            if (!depth.export) { json(res, 403, { errorCode: 'ANALYTICS_LEVEL', message: 'CSV export is part of the advanced analytics level', level: depth.level, correlationId }); return; }
            const nowIso = new Date().toISOString();
            const from = Date.parse(nowIso) - policy.windowDays * 86_400_000;
            const inWindow = bookings.filter((b) => Date.parse(b.slot_start) >= from);
            res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="performance-${providerKey}-${nowIso.slice(0, 10)}.csv"` });
            res.end(bookingsCsv(inWindow));
            return;
        }
        const facts = computePerformance({ bookings, incidents, reviews, policy });
        const body: Json = { ok: true, providerKey, performance: facts, analytics: depth, enforcement: enforcementWire(enforcement), correlationId };
        if (depth.trends) {
            body.trends = { area: trendsBy(bookings, 'area', policy.windowDays), country: trendsBy(bookings, 'country', policy.windowDays), month: trendsBy(bookings, 'month', 365) };
        }
        json(res, 200, body);
    } catch {
        structuredLog('error', 'Performance fetch failed', { correlationId, errorCode: 'ERR_PERFORMANCE', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Performance fetch failed', correlationId });
    }
}

// ─── GET /provider/:key/overview ─────────────────────────────────────────────
//
// Spec B "Overview": account status, upcoming bookings, lead allowance,
// charges, credits, tasks. Alles aus vorhandenen Zeilen; keine neue Tabelle.

export async function handleProviderOverview(req: IncomingMessage, res: ServerResponse, correlationId: string, providerKey: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const nowIso = new Date().toISOString(); const now = Date.parse(nowIso);
        const [provRows, bookingsRaw, sub, cfg, enforcement, evidence] = await Promise.all([
            supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 }) as Promise<Json[]>,
            supabaseApi.select('scheduling', { provider_key: providerKey }, { limit: 2000 }) as Promise<Json[]>,
            getActiveSubscription(providerKey), loadPricingConfig(), openEnforcement(providerKey),
            supabaseApi.select('provider_evidence', { provider_key: providerKey }, { limit: 500 }) as Promise<Json[]>,
        ]);
        const p = provRows[0];
        if (!p) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
        const plan = sub ? cfg.plans.find((x) => x.code === sub.planCode) ?? null : null;
        const cycleStart = cycleStartFor(sub, new Date());
        const used = sub ? await getDiscountCounter(providerKey, cycleStart) : 0;
        const ledger = (await supabaseApi.select('provider_lead_ledger', { provider_key: providerKey }, { limit: 2000 })) as Json[];
        const events = ledger.length ? (await supabaseApi.select('provider_lead_ledger_payment_events', {}, { limit: 5000 })) as Json[] : [];
        const charges = ledger.filter((l) => l.kind === 'charge' && String(l.created_at) >= cycleStart && resolveLedgerStatus(l as any, events.filter((e) => e.ledger_id === l.id) as any) === 'captured');
        const credits = (await supabaseApi.select('provider_credits', { provider_key: providerKey }, { limit: 500 })) as Json[];
        const creditBalance = credits.reduce((s, c) => s + (c.amount_cents || 0), 0);
        const upcoming = bookingsRaw.filter((b) => b.status === 'confirmed' && Date.parse(b.slot_start) > now)
            .sort((a, b) => String(a.slot_start).localeCompare(String(b.slot_start))).slice(0, 3)
            .map((b) => ({ id: b.id, slot_start: b.slot_start, slot_end: b.slot_end ?? null, rebooked_from: b.rebooked_from ?? null }));
        const reportOpen = bookingsRaw.filter((b) => b.status === 'confirmed' && Date.parse(b.slot_end ?? b.slot_start) <= now).length;
        const disputesOpen = bookingsRaw.filter((b) => b.dispute_status === 'open').length;
        const expiring = evidence.filter((e) => e.expires_at && Date.parse(e.expires_at) > now && Date.parse(e.expires_at) - now <= 30 * 86_400_000)
            .map((e) => ({ id: e.id, evidence_type: e.evidence_type ?? null, expires_at: e.expires_at }));
        const open = bookingOpen({ availability: p.availability, booking_paused_at: p.booking_paused_at });
        const tasks: Json[] = [];
        if (reportOpen) tasks.push({ kind: 'attendance_report', count: reportOpen, to: 'termine' });
        if (disputesOpen) tasks.push({ kind: 'dispute_open', count: disputesOpen, to: 'termine' });
        for (const e of expiring) tasks.push({ kind: 'evidence_expiring', evidence_type: e.evidence_type, expires_at: e.expires_at, to: 'verification' });
        if (!p.billing_ready) tasks.push({ kind: 'billing_blocked', reasons: p.billing_block_reasons ?? [], to: 'billing' });
        if (enforcement) tasks.push({ kind: 'enforcement', action: enforcement.action, appeal_at: enforcement.appeal_at ?? null, to: 'performance' });
        json(res, 200, {
            ok: true, providerKey,
            status: {
                lifecycle: p.lifecycle_status ?? null, verified: p.lifecycle_status === 'active' || p.lifecycle_status === 'limited',
                billing_ready: !!p.billing_ready, billing_block_reasons: p.billing_block_reasons ?? [],
                availability: p.availability ?? 'available', ooo_until: p.ooo_until ?? null,
                booking_open: open.open, booking_closed_reason: open.reason,
                calendar_connected: !!p.nylas_grant_id,
            },
            plan: plan ? { code: plan.code, label: plan.label, analytics_level: plan.analyticsLevel, cadence: sub?.cadence ?? null,
                discount: { pct: plan.leadDiscountPct, count: plan.leadDiscountCount, used, remaining: Math.max(0, plan.leadDiscountCount - used), cycle_start: cycleStart } } : null,
            leads: { count: charges.length, final_cents: charges.reduce((s, l) => s + (l.final_fee_cents || 0), 0), currency: charges[0]?.currency ?? plan?.currency ?? 'USD', cycle_start: cycleStart },
            credit_balance_cents: creditBalance,
            upcoming, report_open: reportOpen, disputes_open: disputesOpen,
            expiring_evidence: expiring,
            enforcement: enforcementWire(enforcement),
            tasks, correlationId,
        });
    } catch {
        structuredLog('error', 'Overview fetch failed', { correlationId, errorCode: 'ERR_OVERVIEW', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Overview fetch failed', correlationId });
    }
}

// ─── Serien-No-Shows ─────────────────────────────────────────────────────────
//
// Wird direkt nach dem Vorfall ausgewertet (kein Waechter noetig): zaehlt
// die Vorfaelle im Fenster, schreibt Hinweis oder Buchungspause genau
// einmal je Schwelle (dedupe ueber event_log), informiert Anbieter und
// Admin-Feed. Die Pause ist eine Massnahme nach §24 mit Einspruch; die
// Sichtbarkeit bleibt — nur Slots und POST /scheduling sind zu.

export async function evaluateProviderIncidents(providerKey: string, correlationId: string): Promise<{ state: 'none' | 'alert' | 'pause'; count: number }> {
    const policy = await loadPerformancePolicy();
    const nowIso = new Date().toISOString();
    const incidents = incidentsInWindow(await loadIncidents(providerKey), policy, nowIso);
    const state = serialNoShowState(incidents.length, policy);
    if (state === 'none') return { state, count: incidents.length };
    const provRows = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as Json[];
    const p = provRows[0];
    const ids = incidents.map((i) => i.id).sort();
    const marker = `${state}:${ids.join(',')}`;
    const seen = (await supabaseApi.select('event_log', { type: 'provider_serial_no_show' }, { limit: 500 })) as Json[];
    if (seen.some((e) => e.payload?.providerKey === providerKey && e.payload?.marker === marker)) return { state, count: incidents.length };
    await supabaseApi.insert('event_log', { type: 'provider_serial_no_show', payload: { providerKey, state, count: incidents.length, windowDays: policy.incidentWindowDays, marker, incidentIds: ids } });
    await supabaseApi.insert('event_log', { type: 'admin_alert', payload: { kind: 'provider_serial_no_show', providerKey, state, count: incidents.length } });
    let actionId: string | null = null;
    if (state === 'pause' && p && !p.booking_paused_at) {
        const inserted = (await supabaseApi.insert('provider_enforcement_actions', {
            provider_key: providerKey, action: 'booking_pause', source: 'auto_no_show',
            reason: `${incidents.length} no-show incidents within ${policy.incidentWindowDays} days (policy v${policy.version})`,
            evidence: { incident_ids: ids, policy_version: policy.version },
        })) as Json[];
        actionId = inserted?.[0]?.id ?? null;
        await supabaseApi.update('providers', { provider_key: providerKey }, { booking_paused_at: nowIso, updated_at: nowIso });
        await supabaseApi.insert('event_log', { type: 'provider_booking_paused', payload: { providerKey, actionId, count: incidents.length } });
    }
    (async () => {
        for (const m of await membersOf(providerKey)) {
            await notify({ to: m, type: state === 'pause' ? 'booking_paused' : 'serial_no_show_alert', subject: 'provider', subjectId: providerKey,
                payload: { providerKey, label: String(incidents.length) }, dedupeKey: `serial_no_show:${providerKey}:${marker}:${m}` });
        }
        await sendSerialNoShowMail({ to: p?.contact_email ?? null, providerKey, state: state as 'alert' | 'pause', count: incidents.length, windowDays: policy.incidentWindowDays, locale: p?.languages?.[0], correlationId });
    })().catch(() => { /* im Mailer protokolliert */ });
    return { state, count: incidents.length };
}

/** Nutzer mit mehreren gemeldeten No-Shows: nur ein Admin-Hinweis, kein Gate (Entscheidung 3). */
export async function evaluateUserNoShows(userId: string | null): Promise<number> {
    if (!userId) return 0;
    const policy = await loadPerformancePolicy();
    const rows = (await supabaseApi.select('scheduling', { user_id: userId }, { limit: 500 })) as Json[];
    const facts: BookingFact[] = rows.map((r) => ({ id: String(r.id), slot_start: String(r.slot_start), status: String(r.status), no_show_by: r.no_show_by ?? null, dispute_status: r.dispute_status ?? null }));
    const hits = userNoShowsInWindow(facts, policy);
    if (hits.length < policy.userNoShowAlertCount) return hits.length;
    const marker = hits.map((h) => h.id).sort().join(',');
    const seen = (await supabaseApi.select('event_log', { type: 'admin_alert' }, { limit: 500 })) as Json[];
    if (!seen.some((e) => e.payload?.kind === 'user_serial_no_show' && e.payload?.marker === marker)) {
        await supabaseApi.insert('event_log', { type: 'admin_alert', payload: { kind: 'user_serial_no_show', userId, count: hits.length, windowDays: policy.incidentWindowDays, marker } });
    }
    return hits.length;
}

// ─── Einspruch und Entscheidung (§24) ────────────────────────────────────────

export async function handleEnforcementAppeal(req: IncomingMessage, res: ServerResponse, correlationId: string, actorUserId: string | null, providerKey: string, actionId: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const d = await readJson(req);
        const note = typeof d.note === 'string' ? d.note.trim().slice(0, 2000) : '';
        if (!note) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'note is required', correlationId }); return; }
        const rows = (await supabaseApi.select('provider_enforcement_actions', { id: actionId }, { limit: 1 })) as Json[];
        const a = rows[0];
        if (!a || a.provider_key !== providerKey) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Action not found', correlationId }); return; }
        if (a.lifted_at) { json(res, 409, { errorCode: 'ALREADY_LIFTED', message: 'This action is no longer in force', correlationId }); return; }
        if (a.appeal_at) { json(res, 409, { errorCode: 'ALREADY_APPEALED', message: 'An appeal has already been filed', correlationId }); return; }
        const nowIso = new Date().toISOString();
        await supabaseApi.update('provider_enforcement_actions', { id: actionId }, { appeal_note: note, appeal_at: nowIso });
        await supabaseApi.insert('event_log', { type: 'enforcement_appealed', payload: { providerKey, actionId, action: a.action, by: actorUserId } });
        await supabaseApi.insert('event_log', { type: 'admin_alert', payload: { kind: 'enforcement_appeal', providerKey, actionId, action: a.action } });
        json(res, 200, { ok: true, id: actionId, appeal_at: nowIso, correlationId });
    } catch {
        structuredLog('error', 'Appeal failed', { correlationId, errorCode: 'ERR_APPEAL', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Appeal failed', correlationId });
    }
}

export async function handleAdminEnforcement(req: IncomingMessage, res: ServerResponse, correlationId: string, providerKey: string, actionId: string): Promise<void> {
    res.setHeader('x-correlation-id', correlationId);
    try {
        const d = await readJson(req);
        const decision = d.decision === 'lifted' || d.decision === 'upheld' ? d.decision : '';
        if (!decision) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'decision must be lifted|upheld', correlationId }); return; }
        const rows = (await supabaseApi.select('provider_enforcement_actions', { id: actionId }, { limit: 1 })) as Json[];
        const a = rows[0];
        if (!a || a.provider_key !== providerKey) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Action not found', correlationId }); return; }
        if (a.lifted_at) { json(res, 409, { errorCode: 'ALREADY_LIFTED', message: 'This action is no longer in force', correlationId }); return; }
        const nowIso = new Date().toISOString();
        const note = typeof d.note === 'string' ? d.note.slice(0, 2000) : null;
        await supabaseApi.update('provider_enforcement_actions', { id: actionId }, { decision, decided_at: nowIso, decided_by: typeof d.decided_by === 'string' ? d.decided_by : null, lifted_at: decision === 'lifted' ? nowIso : null, reason: note ? `${a.reason} — ${note}` : a.reason });
        if (decision === 'lifted' && a.action === 'booking_pause') {
            await supabaseApi.update('providers', { provider_key: providerKey }, { booking_paused_at: null, updated_at: nowIso });
        }
        await supabaseApi.insert('event_log', { type: 'enforcement_decided', payload: { providerKey, actionId, action: a.action, decision, note } });
        (async () => {
            for (const m of await membersOf(providerKey)) {
                await notify({ to: m, type: 'enforcement_decided', subject: 'provider', subjectId: providerKey, payload: { providerKey, label: decision }, dedupeKey: `enforcement_decided:${actionId}:${m}` });
            }
        })().catch(() => { /* protokolliert */ });
        json(res, 200, { ok: true, id: actionId, decision, lifted: decision === 'lifted', correlationId });
    } catch {
        structuredLog('error', 'Enforcement decision failed', { correlationId, errorCode: 'ERR_ENFORCEMENT', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Enforcement decision failed', correlationId });
    }
}

export type { PerformancePolicy };
