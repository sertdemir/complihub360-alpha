import type { IncomingMessage, ServerResponse } from 'http';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';
import type { Caller } from './providerAuth.js';
import { notify } from './notifications.js';
import { sendVerificationMail } from './mailer.js';
import { EVIDENCE_BUCKET, signedDownloadUrl } from './storage.js';
import { allowanceFor, coverageMatrix, loadDossier, readJson, reviewLog, type Dossier } from './providerApplication.js';
import {
    activationGate, serviceStatusFromCoverage, transitionAllowed, REQUIRED_AGREEMENTS, type GateVerdict,
} from './verificationRules.js';

// ─── Der Review-Arbeitsplatz ─────────────────────────────────────────────────
//
// Phase 2 des Provider-Plans, Reviewerseite. Alle Routen unter
// /api/v1/admin/review/… und nur fuer Admin-JWT oder Server-Key.
//
// Canvas-Entscheidungen:
//   6A  Pruef-Queue als Tabelle — GET /queue mit Vorgang, Frist, Risiko.
//   7A  Split-View Angabe / Register / Dokument — GET /:key liefert das
//       Dossier samt signierter Download-URL je Nachweis (zehn Minuten).
//   8A  Matrix mit Zell-Aktionen und Gate-Leiste — POST /:key/coverage/:id
//       entscheidet EINE Zelle; POST /:key/lifecycle geht durch das Gate und
//       nennt, was fehlt, statt stumm abzulehnen.
//
// Die Regeln (Gate, Statuswechsel, Service-Status aus den Zellen) liegen in
// verificationRules.ts — ohne Datenbank, mit Tests. Hier steht nur, wie sie
// gelesen und geschrieben werden.

function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

export function isReviewer(caller: Caller): boolean {
    return caller.isAdmin || caller.viaApiKey;
}

const str = (v: unknown, max = 500): string | undefined =>
    typeof v === 'string' ? v.trim().slice(0, max) : undefined;
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const isoDate = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v : null);

/** Der Dashboard-Login eines Anbieters, damit Benachrichtigungen ankommen. */
async function providerUserId(providerKey: string): Promise<string | null> {
    const rows = (await supabaseApi.select('provider_members', { provider_key: providerKey }, { limit: 1 })) as any[];
    return rows[0]?.user_id ?? null;
}

async function tellProvider(providerKey: string, providerName: string | null, contactEmail: string | null, locale: string | undefined,
    kind: 'info_requested' | 'activated' | 'decided', actorId: string | null, correlationId: string) {
    const to = await providerUserId(providerKey);
    const type = kind === 'info_requested' ? 'verification_info_requested' : kind === 'activated' ? 'verification_activated' : 'verification_decided';
    await notify({ to, actor: actorId, type, subject: 'provider', subjectId: providerKey, payload: { providerKey, providerName: providerName ?? undefined } });
    if (kind !== 'decided') {
        await sendVerificationMail({ kind, to: contactEmail, providerKey, locale, correlationId });
    }
}

// ─── Gate-Berechnung fuer ein Dossier ────────────────────────────────────────

export async function gateFor(d: Dossier): Promise<GateVerdict & { allowance: { ok: boolean; over: string[]; allowance: number | null; plan: string | null } | null }> {
    const allowance = await allowanceFor(d.provider.provider_key, d.services).catch(() => null);
    const verdict = activationGate({
        checklist: d.checklist, services: d.services, coverage: d.coverage,
        agreements: d.agreements.map((a) => a.agreement_type),
        billing_ready: !!d.provider.billing_ready, billing_block_reasons: d.provider.billing_block_reasons ?? [],
        allowance: allowance ? { ok: allowance.ok, over: allowance.over } : null,
        lifecycle_status: d.provider.lifecycle_status ?? 'draft',
    });
    return { ...verdict, allowance: allowance ? { ok: allowance.ok, over: allowance.over, allowance: allowance.allowance, plan: allowance.plan } : null };
}

// ─── 6A Queue ────────────────────────────────────────────────────────────────

const QUEUE_STATUSES = ['submitted', 'more_info_required', 'under_verification', 'approved_pending_activation', 'reverification_due'] as const;
const EXPIRY_HORIZON_DAYS = 30;

type Risk = 'high' | 'medium' | 'low';

export interface QueueRow {
    kind: 'application' | 'reverification' | 'change_request' | 'expiring_evidence';
    provider_key: string;
    provider_name: string;
    lifecycle_status: string;
    since: string | null;
    due_at: string | null;
    risk: Risk;
    detail: string | null;
    ref_id: string | null;
}

/** Risiko einer Zeile: hoch bei regulierten Bereichen oder entzogener Zulassung, mittel bei neuer Bewerbung, niedrig bei Ablauf. */
export function queueRisk(kind: QueueRow['kind'], areas: string[], lifecycle: string): Risk {
    if (lifecycle === 'suspended') return 'high';
    if (areas.some((a) => a === 'legal-advisory' || a === 'tax-vat')) return kind === 'expiring_evidence' ? 'medium' : 'high';
    if (kind === 'application' || kind === 'change_request') return 'medium';
    return 'low';
}

async function queue(res: ServerResponse, correlationId: string) {
    const providers = (await supabaseApi.select('providers', {}, { order: 'lifecycle_status_since.asc', limit: 500 })) as any[];
    const inQueue = providers.filter((p) => (QUEUE_STATUSES as readonly string[]).includes(p.lifecycle_status));
    const rows: QueueRow[] = [];
    const areasOf = new Map<string, string[]>();
    for (const p of inQueue) {
        const services = (await supabaseApi.select('provider_services', { provider_key: p.provider_key }, { limit: 200 })) as any[];
        const areas = Array.from(new Set(services.filter((s) => s.status !== 'retired').map((s) => String(s.service_code).split('.')[0])));
        areasOf.set(p.provider_key, areas);
        const kind: QueueRow['kind'] = p.lifecycle_status === 'reverification_due' ? 'reverification' : 'application';
        rows.push({
            kind, provider_key: p.provider_key, provider_name: p.name, lifecycle_status: p.lifecycle_status,
            since: p.lifecycle_status_since ?? null,
            due_at: kind === 'reverification' ? (p.reverification_grace_until ?? p.reverification_due_at ?? null) : null,
            risk: queueRisk(kind, areas, p.lifecycle_status), detail: areas.join(', ') || null, ref_id: null,
        });
    }
    // Offene Aenderungsmeldungen (Spec A §18) — die Tabelle existiert seit dem
    // Datenmodell, befuellt wird sie ab Phase 6; die Queue zeigt sie schon.
    const changes = (await supabaseApi.select('provider_change_requests', { status: 'submitted' }, { order: 'submitted_at.asc', limit: 200 })) as any[];
    for (const c of changes) {
        const p = providers.find((x) => x.provider_key === c.provider_key);
        if (!p) continue;
        rows.push({
            kind: 'change_request', provider_key: c.provider_key, provider_name: p.name, lifecycle_status: p.lifecycle_status,
            since: c.submitted_at ?? null, due_at: null,
            risk: c.deadline_class === 'immediate_24h' ? 'high' : 'medium', detail: c.change_type ?? null, ref_id: c.id,
        });
    }
    // Ablaufende Nachweise in den naechsten 30 Tagen.
    const horizon = new Date(Date.now() + EXPIRY_HORIZON_DAYS * 86400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const evidence = (await supabaseApi.select('provider_evidence', {}, { order: 'expires_at.asc', limit: 2000 })) as any[];
    for (const e of evidence) {
        if (!e.expires_at || e.result === 'rejected' || e.result === 'expired') continue;
        const exp = String(e.expires_at).slice(0, 10);
        if (exp < today || exp > horizon) continue;
        const p = providers.find((x) => x.provider_key === e.provider_key);
        if (!p || ['terminated', 'draft'].includes(p.lifecycle_status)) continue;
        rows.push({
            kind: 'expiring_evidence', provider_key: e.provider_key, provider_name: p.name, lifecycle_status: p.lifecycle_status,
            since: e.received_at ?? null, due_at: exp, risk: queueRisk('expiring_evidence', areasOf.get(e.provider_key) ?? [], p.lifecycle_status),
            detail: e.evidence_type, ref_id: e.id,
        });
    }
    const rank: Record<Risk, number> = { high: 0, medium: 1, low: 2 };
    rows.sort((a, b) => rank[a.risk] - rank[b.risk] || String(a.due_at ?? a.since ?? '').localeCompare(String(b.due_at ?? b.since ?? '')));
    json(res, 200, {
        ok: true, rows,
        counts: { total: rows.length, high: rows.filter((r) => r.risk === 'high').length, applications: rows.filter((r) => r.kind === 'application').length },
        correlationId,
    });
}

// ─── 7A Dossier fuer den Reviewer ────────────────────────────────────────────

async function dossier(res: ServerResponse, correlationId: string, providerKey: string) {
    const d = await loadDossier(providerKey);
    if (!d) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    const evidence = await Promise.all(d.evidence.map(async (e) => {
        let download_url: string | null = null;
        if (e.source === 'document' && e.file_ref && e.upload_confirmed) {
            download_url = await signedDownloadUrl(EVIDENCE_BUCKET, e.file_ref, 600).catch(() => null);
        }
        return { ...e, download_url, download_expires_in_sec: download_url ? 600 : null };
    }));
    const gate = await gateFor(d);
    const log = (await supabaseApi.select('provider_review_log', { provider_key: providerKey }, { order: 'created_at.desc', limit: 100 })) as any[];
    const member = await providerUserId(providerKey);
    json(res, 200, {
        ok: true,
        provider: d.provider,
        confidential: d.confidential,
        has_dashboard_user: !!member,
        services: d.services.map((s) => ({ ...s, coverage: d.coverage.filter((c) => c.service_id === s.id) })),
        matrix: coverageMatrix(d.services, d.coverage),
        checklist: d.checklist,
        evidence,
        registry: {
            vat: { vat_id: d.provider.vat_id ?? null, status: d.provider.vat_id_status ?? null, checked_at: d.provider.vat_id_checked_at ?? null },
        },
        agreements: d.agreements,
        required_agreements: REQUIRED_AGREEMENTS,
        open_requests: d.requests,
        gate,
        history: log,
        correlationId,
    });
}

// ─── Nachweis entscheiden ────────────────────────────────────────────────────

const EVIDENCE_RESULTS = new Set(['reviewed', 'independently_verified', 'rejected', 'expired']);

async function decideEvidence(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, evidenceId: string) {
    const d = await readJson(req);
    if (!isUuid(evidenceId)) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Evidence not found', correlationId }); return; }
    const rows = (await supabaseApi.select('provider_evidence', { id: evidenceId, provider_key: providerKey }, { limit: 1 })) as any[];
    const e = rows[0];
    if (!e) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Evidence not found', correlationId }); return; }
    const result = str(d.result, 40);
    if (!result || !EVIDENCE_RESULTS.has(result)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'result must be reviewed, independently_verified, rejected or expired', correlationId }); return; }
    if (e.source === 'document' && !e.upload_confirmed && result !== 'rejected') {
        json(res, 409, { errorCode: 'UPLOAD_NOT_CONFIRMED', message: 'This document has not arrived yet', correlationId }); return;
    }
    const reason = str(d.notes, 2000) ?? str(d.reason, 2000) ?? null;
    if (result === 'rejected' && !reason) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'A rejection needs a reason the provider can act on', correlationId }); return; }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { result, reviewed_at: now, reviewer_id: caller.userId, reviewer_notes: reason, updated_at: now };
    const exp = isoDate(d.expires_at); if (exp) patch.expires_at = exp;
    const nxt = isoDate(d.next_review_at); if (nxt) patch.next_review_at = nxt;
    const lim = str(d.limitations, 500); if (lim !== undefined) patch.limitations = lim || null;
    await supabaseApi.update('provider_evidence', { id: evidenceId }, patch);
    await reviewLog({ providerKey, subject: 'evidence', subjectId: evidenceId, action: 'decide', from: e.result, to: result, reason, actorId: caller.userId, actorKind: 'reviewer' });
    json(res, 200, { ok: true, evidence: { ...e, ...patch }, correlationId });
}

// ─── 8A Zell-Aktion ──────────────────────────────────────────────────────────

const CELL_ACTIONS = new Set(['approve', 'limit', 'reject', 'pause', 'request_info', 'reopen']);

async function decideCoverage(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, coverageId: string) {
    const d = await readJson(req);
    if (!isUuid(coverageId)) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Coverage not found', correlationId }); return; }
    const cells = (await supabaseApi.select('provider_service_coverage', { id: coverageId }, { limit: 1 })) as any[];
    const cell = cells[0];
    const service = cell ? ((await supabaseApi.select('provider_services', { id: cell.service_id, provider_key: providerKey }, { limit: 1 })) as any[])[0] : null;
    if (!cell || !service) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Coverage not found', correlationId }); return; }
    const action = str(d.action, 20);
    if (!action || !CELL_ACTIONS.has(action)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'action must be approve, limit, reject, pause, request_info or reopen', correlationId }); return; }
    const reason = str(d.reason, 2000) ?? null;
    if (['reject', 'limit', 'pause', 'request_info'].includes(action) && !reason) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'This action needs a reason the provider can act on', correlationId }); return;
    }
    const now = new Date().toISOString();
    const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    const p = providers[0];

    if (action === 'request_info') {
        const evidenceType = str(d.evidence_type, 40) || 'professional_licence';
        const inserted = (await supabaseApi.insert('provider_evidence_requests', {
            provider_key: providerKey, evidence_type: evidenceType, service_id: service.id, country_code: cell.country_code,
            message: reason, status: 'open', requested_by: caller.userId, requested_at: now,
        })) as any[];
        await reviewLog({ providerKey, subject: 'request', subjectId: inserted[0]?.id, action: 'requested', to: `${evidenceType}:${cell.country_code}`, reason, actorId: caller.userId, actorKind: 'reviewer' });
        if (p && ['submitted', 'under_verification', 'approved_pending_activation'].includes(p.lifecycle_status)) {
            await supabaseApi.update('providers', { provider_key: providerKey }, { lifecycle_status: 'more_info_required', lifecycle_status_reason: reason, updated_at: now });
            await reviewLog({ providerKey, subject: 'lifecycle', action: 'request_info', from: p.lifecycle_status, to: 'more_info_required', reason, actorId: caller.userId, actorKind: 'reviewer' });
        }
        await tellProvider(providerKey, p?.name ?? null, p?.contact_email ?? null, p?.languages?.[0], 'info_requested', caller.userId, correlationId);
        json(res, 201, { ok: true, request: inserted[0], lifecycle_status: p ? (['submitted', 'under_verification', 'approved_pending_activation'].includes(p.lifecycle_status) ? 'more_info_required' : p.lifecycle_status) : null, correlationId });
        return;
    }

    const next = action === 'approve' ? 'approved' : action === 'limit' ? 'limited' : action === 'reject' ? 'rejected' : action === 'pause' ? 'suspended' : 'pending';
    const patch: Record<string, unknown> = { status: next, updated_at: now };
    if (next === 'approved' || next === 'limited') { patch.approved_at = now; patch.approved_by = caller.userId; }
    patch.limitations = next === 'limited' ? (str(d.limitations, 500) || reason) : next === 'approved' ? null : (reason ?? cell.limitations ?? null);
    const exp = isoDate(d.expires_at); patch.expires_at = exp ?? (next === 'approved' || next === 'limited' ? cell.expires_at ?? null : null);
    const nxt = isoDate(d.next_review_at); if (nxt) patch.next_review_at = nxt;
    await supabaseApi.update('provider_service_coverage', { id: coverageId }, patch);
    await reviewLog({ providerKey, subject: 'coverage', subjectId: coverageId, action, from: cell.status, to: next, reason, actorId: caller.userId, actorKind: 'reviewer' });

    // Der Leistungsstatus folgt seinen Zellen (Spec A §19): frei, sobald eine
    // Zelle frei ist; limited, wenn nicht alle; sonst zurueck in die Pruefung.
    const all = (await supabaseApi.select('provider_service_coverage', { service_id: service.id }, { limit: 200 })) as any[];
    const serviceNext = serviceStatusFromCoverage(service.status, all);
    if (serviceNext !== service.status) {
        await supabaseApi.update('provider_services', { id: service.id }, { status: serviceNext, status_since: now, updated_at: now });
        await reviewLog({ providerKey, subject: 'service', subjectId: service.id, action: 'status_from_coverage', from: service.status, to: serviceNext, actorId: caller.userId, actorKind: 'system' });
    }
    await tellProvider(providerKey, p?.name ?? null, p?.contact_email ?? null, p?.languages?.[0], 'decided', caller.userId, correlationId);
    json(res, 200, { ok: true, coverage: { ...cell, ...patch }, service_status: serviceNext, correlationId });
}

// ─── Lifecycle mit Gate ──────────────────────────────────────────────────────

async function lifecycle(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d0 = await readJson(req);
    const to = str(d0.to, 40);
    const reason = str(d0.reason, 2000) ?? null;
    if (!to) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'to required', correlationId }); return; }
    const d = await loadDossier(providerKey);
    if (!d) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    const from = d.provider.lifecycle_status ?? 'draft';
    if (!transitionAllowed(from, to)) {
        json(res, 409, { errorCode: 'TRANSITION_NOT_ALLOWED', message: `Cannot move from ${from} to ${to}`, from, to, correlationId }); return;
    }
    if (['suspended', 'terminated', 'paused', 'more_info_required'].includes(to) && !reason) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'This step needs a reason the provider will read', correlationId }); return;
    }
    let gate: GateVerdict | null = null;
    if (to === 'active' || to === 'limited') {
        gate = await gateFor(d);
        if (!gate.ok) {
            // Die Gate-Leiste (8A): nicht "abgelehnt", sondern "das fehlt noch".
            json(res, 422, { errorCode: 'GATE_NOT_MET', message: 'Activation is not possible yet', gate, correlationId }); return;
        }
        if (to === 'active' && gate.target === 'limited') {
            json(res, 422, { errorCode: 'GATE_TARGET_LIMITED', message: 'Not every listed service and market is approved — activate as limited, or decide the open cells first', gate, correlationId }); return;
        }
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { lifecycle_status: to, lifecycle_status_reason: reason, updated_at: now };
    if (to === 'active' || to === 'limited') {
        patch.reverification_due_at = null; patch.reverification_grace_until = null;
        // partner_status ist veraltet, aber der Suche noch bekannt: mitziehen,
        // bis Phase 3 das Ranking umstellt. Aktiv = active, alles andere inactive.
        patch.partner_status = 'active';
    } else if (['paused', 'suspended', 'terminated'].includes(to)) {
        patch.partner_status = 'inactive';
    }
    await supabaseApi.update('providers', { provider_key: providerKey }, patch);
    await reviewLog({ providerKey, subject: 'lifecycle', action: 'transition', from, to, reason, actorId: caller.userId, actorKind: 'reviewer' });
    await supabaseApi.insert('event_log', { type: 'provider_lifecycle_changed', payload: { providerKey, from, to, by: caller.userId ?? 'api_key' } });
    if (to === 'active' || to === 'limited') {
        await tellProvider(providerKey, d.provider.name, d.provider.contact_email ?? null, d.provider.languages?.[0], 'activated', caller.userId, correlationId);
    } else if (to === 'more_info_required') {
        await tellProvider(providerKey, d.provider.name, d.provider.contact_email ?? null, d.provider.languages?.[0], 'info_requested', caller.userId, correlationId);
    } else {
        await tellProvider(providerKey, d.provider.name, d.provider.contact_email ?? null, d.provider.languages?.[0], 'decided', caller.userId, correlationId);
    }
    json(res, 200, { ok: true, from, to, gate, correlationId });
}

// ─── Nachfrage ohne Zellbezug ────────────────────────────────────────────────

async function requestInfo(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await readJson(req);
    const evidenceType = str(d.evidence_type, 40);
    const message = str(d.message, 2000);
    if (!evidenceType || !message) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'evidence_type and message required', correlationId }); return; }
    const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    const p = providers[0];
    if (!p) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    const now = new Date().toISOString();
    const inserted = (await supabaseApi.insert('provider_evidence_requests', {
        provider_key: providerKey, evidence_type: evidenceType, service_id: isUuid(d.service_id) ? d.service_id : null,
        country_code: /^[A-Z]{2}$/.test(String(d.country_code ?? '')) ? d.country_code : null,
        message, status: 'open', requested_by: caller.userId, requested_at: now,
    })) as any[];
    await reviewLog({ providerKey, subject: 'request', subjectId: inserted[0]?.id, action: 'requested', to: evidenceType, reason: message, actorId: caller.userId, actorKind: 'reviewer' });
    let lifecycle = p.lifecycle_status;
    if (['submitted', 'under_verification', 'approved_pending_activation'].includes(p.lifecycle_status)) {
        await supabaseApi.update('providers', { provider_key: providerKey }, { lifecycle_status: 'more_info_required', lifecycle_status_reason: message, updated_at: now });
        await reviewLog({ providerKey, subject: 'lifecycle', action: 'request_info', from: p.lifecycle_status, to: 'more_info_required', reason: message, actorId: caller.userId, actorKind: 'reviewer' });
        lifecycle = 'more_info_required';
    }
    await tellProvider(providerKey, p.name, p.contact_email ?? null, p.languages?.[0], 'info_requested', caller.userId, correlationId);
    json(res, 201, { ok: true, request: inserted[0], lifecycle_status: lifecycle, correlationId });
}

async function withdrawRequest(res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, requestId: string) {
    if (!isUuid(requestId)) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Request not found', correlationId }); return; }
    const rows = (await supabaseApi.select('provider_evidence_requests', { id: requestId, provider_key: providerKey }, { limit: 1 })) as any[];
    if (!rows[0]) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Request not found', correlationId }); return; }
    if (rows[0].status !== 'open') { json(res, 409, { errorCode: 'REQUEST_CLOSED', message: 'Only open requests can be withdrawn', correlationId }); return; }
    await supabaseApi.update('provider_evidence_requests', { id: requestId }, { status: 'withdrawn' });
    await reviewLog({ providerKey, subject: 'request', subjectId: requestId, action: 'withdrawn', from: 'open', to: 'withdrawn', actorId: caller.userId, actorKind: 'reviewer' });
    json(res, 200, { ok: true, correlationId });
}

// ─── Router ──────────────────────────────────────────────────────────────────

const ROUTE = /^\/api\/v1\/admin\/review(?:\/([a-z0-9-]+))?(?:\/(evidence|coverage|lifecycle|request|gate))?(?:\/([^/?]+))?(?:\?.*)?$/;

export async function handleProviderReview(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller): Promise<boolean> {
    const m = ROUTE.exec(req.url || '');
    if (!m) return false;
    res.setHeader('x-correlation-id', correlationId);
    if (!isReviewer(caller)) { json(res, 403, { errorCode: 'FORBIDDEN', message: 'Review is admin-only', correlationId }); return true; }
    const [, key, section, id] = m;
    const method = req.method || 'GET';
    try {
        if (key === 'queue' && !section && method === 'GET') { await queue(res, correlationId); return true; }
        if (key && !section && method === 'GET') { await dossier(res, correlationId, key); return true; }
        if (key && section === 'gate' && !id && method === 'GET') {
            const d = await loadDossier(key);
            if (!d) json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId });
            else json(res, 200, { ok: true, gate: await gateFor(d), correlationId });
            return true;
        }
        if (key && section === 'evidence' && id && method === 'POST') { await decideEvidence(req, res, correlationId, caller, key, id); return true; }
        if (key && section === 'coverage' && id && method === 'POST') { await decideCoverage(req, res, correlationId, caller, key, id); return true; }
        if (key && section === 'lifecycle' && !id && method === 'POST') { await lifecycle(req, res, correlationId, caller, key); return true; }
        if (key && section === 'request' && !id && method === 'POST') { await requestInfo(req, res, correlationId, caller, key); return true; }
        if (key && section === 'request' && id && method === 'DELETE') { await withdrawRequest(res, correlationId, caller, key, id); return true; }
        json(res, 405, { errorCode: 'METHOD_NOT_ALLOWED', message: 'Not supported on this route', correlationId });
        return true;
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'invalid json' || msg === 'payload too large') {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: msg === 'invalid json' ? 'Body must be JSON' : 'Body too large', correlationId });
            return true;
        }
        structuredLog('error', 'Provider review route failed', { correlationId, errorCode: 'ERR_REVIEW', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Request failed', correlationId });
        return true;
    }
}
