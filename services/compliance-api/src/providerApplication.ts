import type { IncomingMessage, ServerResponse } from 'http';
import { createHash } from 'node:crypto';
import { structuredLog } from '@complihub360/types';
import { supabaseApi } from './supabase.js';
import type { Caller } from './providerAuth.js';
import { categoryAllowanceCheck, getActiveSubscription, loadPricingConfig } from './billing.js';
import { checkVatId } from './vies.js';
import {
    EVIDENCE_ALLOWED_MIME, EVIDENCE_BUCKET, EVIDENCE_MAX_BYTES, evidenceObjectPath, objectInfo, signedUploadUrl,
} from './storage.js';
import {
    areaCodeOf, evidenceChecklist, requiredEvidence, submitValidation, REQUIRED_AGREEMENTS,
    type ChecklistItem, type EvidenceType,
} from './verificationRules.js';

// ─── Die Bewerbungsstrecke des Anbieters ─────────────────────────────────────
//
// Phase 2 des Provider-Plans, Anbieterseite. Alle Routen liegen unter
// /api/v1/provider/:key/… und damit hinter dem Ownership-Guard in index.ts
// (providerAuth.ts): hier wird nicht mehr geprueft, WER fragt, nur noch, ob
// die Eingabe stimmt.
//
// Canvas-Entscheidungen, die diese Datei umsetzt:
//   1B  Dossier mit Kapiteln — GET /application liefert je Kapitel einen
//       Status und die fehlenden Punkte, nicht nur Rohdaten.
//   2B  Leistung als Stamm, Laender als Zeilen — /services und
//       /services/:id/coverage.
//   3A  Checkliste je Nachweistyp — abgeleitet (verificationRules.ts), nie
//       vom Anbieter gewaehlt.
//   4A  Zusammenfassung → Annahme je Dokument → Einreichen — /agreements
//       schreibt append-only mit Version, /submit prueft und setzt den Status.
//   5B  Freigabematrix — GET /verification.
//
// Was hier bewusst NICHT passiert: Statuswechsel ausser draft → submitted.
// Freigaben, Ablehnungen und die Aktivierung sind Sache des Reviewers
// (providerReview.ts) und laufen durch das Gate.

function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
}

export function readJson(req: IncomingMessage, maxBytes = 256 * 1024): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', (chunk: any) => {
            size += chunk.length;
            if (size > maxBytes) { reject(new Error('payload too large')); req.destroy(); return; }
            body += chunk.toString();
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('invalid json')); }
        });
        req.on('error', reject);
    });
}

const str = (v: unknown, max = 500): string | undefined =>
    typeof v === 'string' ? v.trim().slice(0, max) : undefined;
const strList = (v: unknown, max = 50): string[] | undefined =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 200)).filter(Boolean).slice(0, max) : undefined;
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const isCountry = (v: unknown): v is string => typeof v === 'string' && /^[A-Z]{2}$/.test(v);

/** Ein Eintrag im Entscheidungsprotokoll. Nie ueber den Vorgang hinaus werfen — das Protokoll ist Beiwerk. */
export async function reviewLog(entry: {
    providerKey: string; subject: 'evidence' | 'coverage' | 'service' | 'lifecycle' | 'request' | 'application';
    subjectId?: string | null; action: string; from?: string | null; to?: string | null; reason?: string | null;
    actorId?: string | null; actorKind: 'reviewer' | 'provider' | 'system';
}): Promise<void> {
    try {
        await supabaseApi.insert('provider_review_log', {
            provider_key: entry.providerKey, subject: entry.subject, subject_id: entry.subjectId ?? null,
            action: entry.action, from_value: entry.from ?? null, to_value: entry.to ?? null,
            reason: entry.reason ?? null, actor_id: entry.actorId ?? null, actor_kind: entry.actorKind,
        });
    } catch {
        structuredLog('warn', 'Review log not written', { correlationId: 'review-log', route: entry.action, severity: 'warning', errorCode: 'ERR_REVIEW_LOG' });
    }
}

// ─── Das Dossier laden ───────────────────────────────────────────────────────

export interface Dossier {
    provider: any;
    confidential: any | null;
    services: any[];
    coverage: any[];
    evidence: any[];
    agreements: any[];          // nur die gueltigen (superseded_at IS NULL)
    requests: any[];            // offene Nachfragen
    checklist: ChecklistItem[];
}

export async function loadDossier(providerKey: string): Promise<Dossier | null> {
    const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    if (!providers[0]) return null;
    const [conf, services, evidence, agreementsAll, requests] = await Promise.all([
        supabaseApi.select('provider_confidential', { provider_key: providerKey }, { limit: 1 }) as Promise<any[]>,
        supabaseApi.select('provider_services', { provider_key: providerKey }, { order: 'created_at.asc', limit: 200 }) as Promise<any[]>,
        supabaseApi.select('provider_evidence', { provider_key: providerKey }, { order: 'received_at.desc', limit: 200 }) as Promise<any[]>,
        supabaseApi.select('provider_agreement_acceptance', { provider_key: providerKey }, { order: 'accepted_at.desc', limit: 100 }) as Promise<any[]>,
        supabaseApi.select('provider_evidence_requests', { provider_key: providerKey, status: 'open' }, { order: 'requested_at.asc', limit: 100 }) as Promise<any[]>,
    ]);
    const coverage = (await Promise.all(
        services.map((s) => supabaseApi.select('provider_service_coverage', { service_id: s.id }, { order: 'country_code.asc', limit: 200 }) as Promise<any[]>),
    )).flat();
    const agreements = agreementsAll.filter((a) => !a.superseded_at);
    const checklist = evidenceChecklist(requiredEvidence(services, coverage), evidence);
    return { provider: providers[0], confidential: conf[0] ?? null, services, coverage, evidence, agreements, requests, checklist };
}

/** Was der Anbieter von sich selbst sieht — ohne Abrechnungsinterna und ohne Stripe-IDs. */
function providerView(p: any) {
    return {
        provider_key: p.provider_key, name: p.name, website_url: p.website_url ?? null, contact_email: p.contact_email ?? null,
        languages: p.languages ?? [], region: p.region ?? null, active_since: p.active_since ?? null,
        vat_id: p.vat_id ?? null, vat_id_status: p.vat_id_status ?? null, vat_id_checked_at: p.vat_id_checked_at ?? null,
        billing_country: p.billing_country ?? null, work_mode: p.work_mode ?? null,
        lifecycle_status: p.lifecycle_status ?? 'draft', lifecycle_status_since: p.lifecycle_status_since ?? null,
        lifecycle_status_reason: p.lifecycle_status_reason ?? null,
        billing_ready: !!p.billing_ready, billing_block_reasons: p.billing_block_reasons ?? [],
    };
}

function evidenceView(e: any) {
    // file_ref bleibt drin (der Anbieter kennt seine Datei), aber nie eine URL:
    // die stellt der Reviewer je Abruf signiert aus.
    const { reviewer_id, reviewer_notes, ...rest } = e;
    void reviewer_id; void reviewer_notes;
    return rest;
}

function chapters(d: Dossier) {
    const v = submitValidation({
        provider: d.provider, confidential: d.confidential, services: d.services, coverage: d.coverage,
        checklist: d.checklist, agreements: d.agreements.map((a) => a.agreement_type),
    });
    const by = (prefix: string) => v.missing.filter((m) => m.startsWith(prefix + '.'));
    const chapter = (prefix: string) => ({ complete: by(prefix).length === 0, missing: by(prefix) });
    return {
        account: chapter('account'),
        legal: chapter('legal'),
        services: chapter('services'),
        evidence: chapter('evidence'),
        agreements: chapter('agreements'),
        submit: { ready: v.ok, missing: v.missing },
    };
}

function dossierResponse(d: Dossier, correlationId: string) {
    return {
        ok: true,
        provider: providerView(d.provider),
        confidential: d.confidential ? {
            entity_type: d.confidential.entity_type ?? null, registration_number: d.confidential.registration_number ?? null,
            registered_address: d.confidential.registered_address ?? null, operating_address: d.confidential.operating_address ?? null,
            tax_number: d.confidential.tax_number ?? null, representative_name: d.confidential.representative_name ?? null,
            representative_title: d.confidential.representative_title ?? null,
            insurance_provider: d.confidential.insurance_provider ?? null, insurance_type: d.confidential.insurance_type ?? null,
            insurance_valid_until: d.confidential.insurance_valid_until ?? null,
        } : null,
        chapters: chapters(d),
        services: d.services.map((s) => ({ ...s, coverage: d.coverage.filter((c) => c.service_id === s.id) })),
        checklist: d.checklist,
        evidence: d.evidence.map(evidenceView),
        agreements: d.agreements.map((a) => ({ agreement_type: a.agreement_type, version: a.version, language: a.language, accepted_at: a.accepted_at, accepted_by_name: a.accepted_by_name ?? null })),
        open_requests: d.requests,
        correlationId,
    };
}

const EDITABLE_LIFECYCLE = new Set(['draft', 'more_info_required']);
const EDITABLE_AFTER_SUBMIT = new Set(['submitted', 'under_verification', 'approved_pending_activation', 'active', 'limited', 'reverification_due']);

// ─── Kapitel Konto / Rechtsform ──────────────────────────────────────────────

async function patchApplication(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await readJson(req);
    const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    if (!providers[0]) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    if (providers[0].lifecycle_status === 'terminated') {
        json(res, 409, { errorCode: 'ACCOUNT_CLOSED', message: 'This account is closed', correlationId }); return;
    }

    const pub: Record<string, unknown> = {};
    const name = str(d.name, 160); if (name) pub.name = name;
    const website = str(d.website_url, 300); if (website !== undefined) pub.website_url = website || null;
    const email = str(d.contact_email, 200); if (email) pub.contact_email = email.toLowerCase();
    const langs = strList(d.languages, 20); if (langs) pub.languages = langs;
    const region = str(d.region, 80); if (region !== undefined) pub.region = region || null;
    if (Number.isInteger(d.active_since)) pub.active_since = d.active_since;
    const workMode = str(d.work_mode, 120); if (workMode !== undefined) pub.work_mode = workMode || null;
    const billingCountry = str(d.billing_country, 2); if (billingCountry && isCountry(billingCountry.toUpperCase())) pub.billing_country = billingCountry.toUpperCase();

    const conf: Record<string, unknown> = {};
    for (const k of ['entity_type', 'registration_number', 'registered_address', 'operating_address', 'tax_number',
        'representative_name', 'representative_title', 'insurance_provider', 'insurance_type'] as const) {
        const v = str(d[k], 300);
        if (v !== undefined) conf[k] = v || null;
    }
    const validUntil = str(d.insurance_valid_until, 10);
    if (validUntil !== undefined) conf.insurance_valid_until = /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null;

    if (!Object.keys(pub).length && !Object.keys(conf).length) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'No valid application fields', correlationId }); return;
    }
    const now = new Date().toISOString();
    if (Object.keys(pub).length) await supabaseApi.update('providers', { provider_key: providerKey }, { ...pub, updated_at: now });
    if (Object.keys(conf).length) await supabaseApi.upsert('provider_confidential', 'provider_key', { provider_key: providerKey, ...conf, updated_at: now });
    await supabaseApi.insert('event_log', { type: 'provider_application_updated', payload: { providerKey, fields: [...Object.keys(pub), ...Object.keys(conf)] } });
    // Nach dem Einreichen ist jede Aenderung an Rechtsform oder Vertretung
    // meldepflichtig (Spec A §18) — vorerst als Protokollzeile, das Change-
    // Control mit Fristen kommt in Phase 6.
    if (EDITABLE_AFTER_SUBMIT.has(providers[0].lifecycle_status) && Object.keys(conf).length) {
        await reviewLog({ providerKey, subject: 'application', action: 'legal_fields_changed', to: Object.keys(conf).join(','), actorId: caller.userId, actorKind: 'provider' });
    }
    json(res, 200, { ok: true, updated: [...Object.keys(pub), ...Object.keys(conf)], correlationId });
}

// ─── Leistungen (2B: Stamm) ──────────────────────────────────────────────────

const PRICING_MODELS = new Set(['fixed', 'hourly', 'retainer', 'project', 'mixed']);

function servicePatchFrom(d: any): Record<string, unknown> {
    const p: Record<string, unknown> = {};
    const name = str(d.service_name, 160); if (name) p.service_name = name;
    const desc = str(d.description, 2000); if (desc !== undefined) p.description = desc || null;
    for (const k of ['provider_keywords', 'deliverables', 'exclusions', 'prerequisites', 'required_user_documents', 'business_models', 'industries', 'company_size_bands'] as const) {
        const v = strList(d[k]); if (v) p[k] = v;
    }
    if (d.pricing_model === null || (typeof d.pricing_model === 'string' && PRICING_MODELS.has(d.pricing_model))) p.pricing_model = d.pricing_model;
    if (d.price_min === null || (typeof d.price_min === 'number' && d.price_min >= 0)) p.price_min = d.price_min;
    if (d.price_max === null || (typeof d.price_max === 'number' && d.price_max >= 0)) p.price_max = d.price_max;
    const cur = str(d.currency, 3); if (cur !== undefined) p.currency = cur ? cur.toUpperCase() : null;
    for (const k of ['pricing_basis', 'min_engagement', 'additional_costs', 'responsible_role', 'supervising_professional'] as const) {
        const v = str(d[k], 300); if (v !== undefined) p[k] = v || null;
    }
    if (d.response_time_hours === null || (Number.isInteger(d.response_time_hours) && d.response_time_hours >= 0)) p.response_time_hours = d.response_time_hours;
    if (d.completion_days_estimate === null || (Number.isInteger(d.completion_days_estimate) && d.completion_days_estimate >= 0)) p.completion_days_estimate = d.completion_days_estimate;
    if (typeof d.capacity_status === 'string' && ['open', 'limited', 'full'].includes(d.capacity_status)) p.capacity_status = d.capacity_status;
    if (typeof d.uses_subcontractors === 'boolean') p.uses_subcontractors = d.uses_subcontractors;
    return p;
}

/**
 * Das Kategorie-Kontingent (Spec B): Essential eine Hauptkategorie, Growth
 * bis fuenf, Global alle. Gemessen an den Bereichen der nicht stillgelegten
 * Leistungen plus dem neuen. Ohne Abo wird hier nicht gesperrt — dann sperrt
 * das Gate ueber billing_ready, und der Anbieter sieht dort, dass ein Plan
 * fehlt. Ein Anbieter soll sein Dossier fuellen koennen, bevor er zahlt.
 */
export async function allowanceFor(providerKey: string, services: any[], extraArea?: string): Promise<{ ok: boolean; allowance: number | null; used: number; over: string[]; plan: string | null } | null> {
    const sub = await getActiveSubscription(providerKey);
    if (!sub) return null;
    const cfg = await loadPricingConfig();
    const plan = cfg.plans.find((p) => p.code === sub.planCode) ?? null;
    const areas = services.filter((s) => s.status !== 'retired').map((s) => areaCodeOf(s.service_code));
    if (extraArea) areas.push(extraArea);
    return { ...categoryAllowanceCheck(plan, areas), plan: plan?.code ?? null };
}

async function createService(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await readJson(req);
    const code = str(d.service_code, 80);
    if (!code) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'service_code required', correlationId }); return; }
    const cat = (await supabaseApi.select('service_categories', { code }, { limit: 1 })) as any[];
    if (!cat[0] || cat[0].active === false) {
        json(res, 422, { errorCode: 'UNKNOWN_SERVICE_CODE', message: 'service_code is not in the service taxonomy', correlationId }); return;
    }
    const existing = (await supabaseApi.select('provider_services', { provider_key: providerKey }, { limit: 200 })) as any[];
    if (existing.some((s) => s.service_code === code && s.status !== 'retired')) {
        json(res, 409, { errorCode: 'SERVICE_EXISTS', message: 'This service is already listed', correlationId }); return;
    }
    const allowance = await allowanceFor(providerKey, existing, areaCodeOf(code));
    if (allowance && !allowance.ok) {
        json(res, 422, {
            errorCode: 'CATEGORY_ALLOWANCE', message: 'Your plan covers fewer main categories than this would need',
            allowance: allowance.allowance, used: allowance.used, over: allowance.over, plan: allowance.plan, correlationId,
        });
        return;
    }
    const patch = servicePatchFrom(d);
    const row = {
        provider_key: providerKey, service_code: code,
        service_name: (patch.service_name as string) || cat[0].label_en,
        ...patch,
        status: 'pending_verification', status_since: new Date().toISOString(),
    };
    const inserted = (await supabaseApi.insert('provider_services', row)) as any[];
    await reviewLog({ providerKey, subject: 'service', subjectId: inserted[0]?.id, action: 'created', to: code, actorId: caller.userId, actorKind: 'provider' });
    json(res, 201, { ok: true, service: { ...inserted[0], coverage: [] }, correlationId });
}

async function ownService(providerKey: string, serviceId: string): Promise<any | null> {
    if (!isUuid(serviceId)) return null;
    const rows = (await supabaseApi.select('provider_services', { id: serviceId, provider_key: providerKey }, { limit: 1 })) as any[];
    return rows[0] ?? null;
}

async function patchService(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, serviceId: string) {
    const d = await readJson(req);
    const s = await ownService(providerKey, serviceId);
    if (!s) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Service not found', correlationId }); return; }
    if (s.status === 'retired') { json(res, 409, { errorCode: 'SERVICE_RETIRED', message: 'A retired service cannot be edited', correlationId }); return; }
    if (typeof d.service_code === 'string' && d.service_code !== s.service_code) {
        json(res, 422, { errorCode: 'SERVICE_CODE_FIXED', message: 'Retire this service and add a new one to change its category', correlationId }); return;
    }
    const patch = servicePatchFrom(d);
    if (!Object.keys(patch).length) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'No valid service fields', correlationId }); return; }
    patch.updated_at = new Date().toISOString();
    await supabaseApi.update('provider_services', { id: serviceId }, patch);
    // Eine freigegebene Leistung darf ihre Beschreibung und Preise pflegen;
    // die Freigabe haengt an Leistung × Land, nicht am Preis (Spec A §4). Was
    // meldepflichtig ist (Preis, Verantwortung), steht im Protokoll.
    await reviewLog({ providerKey, subject: 'service', subjectId: serviceId, action: 'updated', to: Object.keys(patch).filter((k) => k !== 'updated_at').join(','), actorId: caller.userId, actorKind: 'provider' });
    json(res, 200, { ok: true, updated: Object.keys(patch).filter((k) => k !== 'updated_at'), correlationId });
}

async function retireService(res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, serviceId: string) {
    const s = await ownService(providerKey, serviceId);
    if (!s) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Service not found', correlationId }); return; }
    const now = new Date().toISOString();
    if (s.status === 'draft' || s.status === 'pending_verification') {
        // Nie freigegeben: die Zeile darf verschwinden, Coverage kaskadiert.
        await supabaseApi.remove('provider_services', { id: serviceId });
        await reviewLog({ providerKey, subject: 'service', subjectId: serviceId, action: 'deleted', from: s.status, actorId: caller.userId, actorKind: 'provider' });
        json(res, 200, { ok: true, removed: true, correlationId });
        return;
    }
    // Einmal freigegeben, bleibt die Zeile: Buchungen zeigen auf sie.
    await supabaseApi.update('provider_services', { id: serviceId }, { status: 'retired', status_since: now, retired_at: now, updated_at: now });
    await reviewLog({ providerKey, subject: 'service', subjectId: serviceId, action: 'retired', from: s.status, to: 'retired', actorId: caller.userId, actorKind: 'provider' });
    json(res, 200, { ok: true, removed: false, status: 'retired', correlationId });
}

// ─── Laender je Leistung (2B: Zeilen) ────────────────────────────────────────

async function putCoverage(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, serviceId: string) {
    const d = await readJson(req);
    const s = await ownService(providerKey, serviceId);
    if (!s) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Service not found', correlationId }); return; }
    if (s.status === 'retired') { json(res, 409, { errorCode: 'SERVICE_RETIRED', message: 'A retired service has no markets', correlationId }); return; }
    const wanted: Array<{ country_code: string; jurisdiction_code: string | null }> = [];
    for (const raw of Array.isArray(d.countries) ? d.countries : []) {
        const cc = typeof raw === 'string' ? raw : raw?.country_code;
        const jur = typeof raw === 'object' && raw ? str(raw.jurisdiction_code, 20) || null : null;
        if (!isCountry(cc)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: `country_code must be ISO-2 upper case: ${String(cc)}`, correlationId }); return; }
        if (!wanted.some((w) => w.country_code === cc && w.jurisdiction_code === jur)) wanted.push({ country_code: cc, jurisdiction_code: jur });
    }
    const current = (await supabaseApi.select('provider_service_coverage', { service_id: serviceId }, { limit: 200 })) as any[];
    const key = (c: { country_code: string; jurisdiction_code: string | null }) => `${c.country_code}/${c.jurisdiction_code ?? ''}`;
    const have = new Map(current.map((c) => [key(c), c]));
    const now = new Date().toISOString();
    const added: string[] = []; const removed: string[] = []; const withdrawn: string[] = [];

    for (const w of wanted) {
        if (have.has(key(w))) continue;
        await supabaseApi.insert('provider_service_coverage', { service_id: serviceId, country_code: w.country_code, jurisdiction_code: w.jurisdiction_code, status: 'pending' });
        added.push(key(w));
    }
    for (const c of current) {
        if (wanted.some((w) => key(w) === key(c))) continue;
        if (c.status === 'pending' || c.status === 'rejected') {
            await supabaseApi.remove('provider_service_coverage', { id: c.id });
            removed.push(key(c));
        } else {
            // Ein freigegebener Markt wird nicht geloescht, sondern zurueckgezogen:
            // die Freigabe bleibt nachvollziehbar, die View zeigt ihn nicht mehr.
            await supabaseApi.update('provider_service_coverage', { id: c.id }, { status: 'suspended', limitations: 'Vom Anbieter zurueckgezogen', updated_at: now });
            withdrawn.push(key(c));
        }
    }
    if (added.length || removed.length || withdrawn.length) {
        await reviewLog({ providerKey, subject: 'coverage', subjectId: serviceId, action: 'countries_set', to: wanted.map(key).join(','), reason: withdrawn.length ? `withdrawn: ${withdrawn.join(',')}` : null, actorId: caller.userId, actorKind: 'provider' });
    }
    const after = (await supabaseApi.select('provider_service_coverage', { service_id: serviceId }, { order: 'country_code.asc', limit: 200 })) as any[];
    json(res, 200, { ok: true, coverage: after, added, removed, withdrawn, correlationId });
}

// ─── Nachweise (3A) ──────────────────────────────────────────────────────────

const EVIDENCE_TYPES: ReadonlySet<string> = new Set<EvidenceType>(['incorporation', 'vat_id', 'insurance', 'representative_identity', 'professional_licence']);

async function evidenceUploadUrl(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await readJson(req);
    const type = str(d.evidence_type, 40);
    const name = str(d.original_name, 200);
    const mime = str(d.mime_type, 80);
    const size = typeof d.size_bytes === 'number' ? Math.floor(d.size_bytes) : NaN;
    if (!type || !EVIDENCE_TYPES.has(type) || type === 'vat_id') {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'evidence_type must be one of incorporation, insurance, representative_identity, professional_licence', correlationId }); return;
    }
    if (!name) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'original_name required', correlationId }); return; }
    if (!mime || !(EVIDENCE_ALLOWED_MIME as readonly string[]).includes(mime)) {
        json(res, 415, { errorCode: 'UNSUPPORTED_MEDIA_TYPE', message: 'Accepted: PDF, PNG, JPEG', allowed: EVIDENCE_ALLOWED_MIME, correlationId }); return;
    }
    if (!Number.isFinite(size) || size <= 0 || size > EVIDENCE_MAX_BYTES) {
        json(res, 413, { errorCode: 'FILE_TOO_LARGE', message: 'Files up to 20 MB', max_bytes: EVIDENCE_MAX_BYTES, correlationId }); return;
    }
    const row: Record<string, unknown> = {
        provider_key: providerKey, evidence_type: type, source: 'document', result: 'received', upload_confirmed: false,
        original_name: name, mime_type: mime, size_bytes: size,
        issuing_authority: str(d.issuing_authority, 200) ?? null, identifier: str(d.identifier, 120) ?? null,
        covered_entity: str(d.covered_entity, 200) ?? null,
        supports_service_codes: strList(d.supports_service_codes, 20) ?? [],
        supports_countries: (strList(d.supports_countries, 60) ?? []).filter(isCountry),
    };
    for (const k of ['issue_date', 'expires_at'] as const) {
        const v = str(d[k], 10); if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) row[k] = v;
    }
    if (row.issue_date && row.expires_at && String(row.issue_date) > String(row.expires_at)) {
        json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'expires_at must not be before issue_date', correlationId }); return;
    }
    const inserted = (await supabaseApi.insert('provider_evidence', row)) as any[];
    const id = inserted[0]?.id as string;
    const path = evidenceObjectPath(providerKey, id, name);
    await supabaseApi.update('provider_evidence', { id }, { file_ref: path });
    let upload;
    try {
        upload = await signedUploadUrl(EVIDENCE_BUCKET, path);
    } catch {
        await supabaseApi.remove('provider_evidence', { id });
        structuredLog('error', 'Evidence upload URL failed', { correlationId, errorCode: 'ERR_STORAGE', severity: 'error', route: 'evidence/upload-url' });
        json(res, 503, { errorCode: 'STORAGE_UNAVAILABLE', message: 'Upload is not available right now. Nothing was saved.', correlationId });
        return;
    }
    await supabaseApi.insert('event_log', { type: 'provider_evidence_upload_started', payload: { providerKey, evidenceId: id, evidenceType: type, by: caller.userId } });
    json(res, 201, {
        ok: true, evidence_id: id, file_ref: path,
        upload: { ...upload, headers: { 'Content-Type': mime, 'x-upsert': 'false' } },
        correlationId,
    });
}

async function evidenceConfirm(res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, evidenceId: string) {
    if (!isUuid(evidenceId)) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Evidence not found', correlationId }); return; }
    const rows = (await supabaseApi.select('provider_evidence', { id: evidenceId, provider_key: providerKey }, { limit: 1 })) as any[];
    const e = rows[0];
    if (!e) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Evidence not found', correlationId }); return; }
    if (e.source !== 'document' || !e.file_ref) { json(res, 409, { errorCode: 'NOT_A_DOCUMENT', message: 'This evidence has no file', correlationId }); return; }
    if (e.upload_confirmed) { json(res, 200, { ok: true, already: true, evidence: evidenceView(e), correlationId }); return; }
    let info;
    try {
        info = await objectInfo(EVIDENCE_BUCKET, e.file_ref);
    } catch {
        json(res, 503, { errorCode: 'STORAGE_UNAVAILABLE', message: 'Could not check the upload right now. Please try again.', correlationId }); return;
    }
    if (!info) { json(res, 409, { errorCode: 'UPLOAD_NOT_FOUND', message: 'No file has arrived for this evidence yet', correlationId }); return; }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { upload_confirmed: true, uploaded_at: now, updated_at: now };
    if (info.size !== null) patch.size_bytes = info.size;
    if (info.mimeType) patch.mime_type = info.mimeType;
    await supabaseApi.update('provider_evidence', { id: evidenceId }, patch);

    // Offene Nachfragen desselben Typs sind damit erfuellt — die des passenden
    // Landes zuerst, sonst die allgemeine.
    const open = (await supabaseApi.select('provider_evidence_requests', { provider_key: providerKey, status: 'open' }, { limit: 100 })) as any[];
    const lands: string[] = e.supports_countries ?? [];
    const fulfilled: string[] = [];
    for (const r of open) {
        if (r.evidence_type !== e.evidence_type) continue;
        if (r.country_code && lands.length && !lands.includes(r.country_code)) continue;
        await supabaseApi.update('provider_evidence_requests', { id: r.id }, { status: 'fulfilled', fulfilled_at: now, fulfilled_evidence_id: evidenceId });
        fulfilled.push(r.id);
        await reviewLog({ providerKey, subject: 'request', subjectId: r.id, action: 'fulfilled', from: 'open', to: 'fulfilled', actorId: caller.userId, actorKind: 'provider' });
    }
    await supabaseApi.insert('event_log', { type: 'provider_evidence_uploaded', payload: { providerKey, evidenceId, evidenceType: e.evidence_type, fulfilledRequests: fulfilled.length } });

    // Waren das die letzten offenen Nachfragen, geht das Konto zurueck in die
    // Pruefung — der Reviewer sieht es wieder in der Queue.
    const providers = (await supabaseApi.select('providers', { provider_key: providerKey }, { limit: 1 })) as any[];
    const p = providers[0];
    let lifecycle = p?.lifecycle_status ?? null;
    if (p?.lifecycle_status === 'more_info_required' && fulfilled.length && open.length === fulfilled.length) {
        await supabaseApi.update('providers', { provider_key: providerKey }, { lifecycle_status: 'under_verification', lifecycle_status_reason: 'Nachgeforderte Nachweise liegen vor', updated_at: now });
        await reviewLog({ providerKey, subject: 'lifecycle', action: 'requests_fulfilled', from: 'more_info_required', to: 'under_verification', actorId: caller.userId, actorKind: 'provider' });
        lifecycle = 'under_verification';
    }
    json(res, 200, { ok: true, evidence: evidenceView({ ...e, ...patch }), fulfilled_requests: fulfilled, lifecycle_status: lifecycle, correlationId });
}

async function evidenceRegistry(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await readJson(req);
    const type = str(d.evidence_type, 40) ?? 'vat_id';
    if (type !== 'vat_id') {
        json(res, 422, { errorCode: 'REGISTRY_UNSUPPORTED', message: 'Only vat_id can be checked against a registry today', correlationId }); return;
    }
    const raw = str(d.vat_id, 40);
    if (!raw) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'vat_id required', correlationId }); return; }
    const vat = await checkVatId(raw);
    // valid → unabhaengig bestaetigt; invalid → abgelehnt; unavailable und
    // unsupported → received, der Reviewer entscheidet am Dokument. Nie wird
    // ein Ausfall von VIES als Ablehnung gespeichert.
    const result = vat.status === 'valid' ? 'independently_verified' : vat.status === 'invalid' ? 'rejected' : 'received';
    const now = new Date().toISOString();
    const inserted = (await supabaseApi.insert('provider_evidence', {
        provider_key: providerKey, evidence_type: 'vat_id', source: 'registry_check', result,
        identifier: vat.vatId, issuing_authority: 'VIES', covered_entity: vat.name ?? null,
        registry_reference: `vies:${vat.countryCode}:${vat.checkedAt}`,
        reviewed_at: result === 'received' ? null : now, reviewer_notes: `VIES ${vat.status}`,
        upload_confirmed: true,
    })) as any[];
    await supabaseApi.update('providers', { provider_key: providerKey }, {
        vat_id: vat.vatId, vat_id_status: vat.status, vat_id_checked_at: vat.checkedAt, updated_at: now,
        ...(vat.status === 'valid' || vat.status === 'unsupported' ? { billing_country: vat.countryCode } : {}),
    });
    await reviewLog({ providerKey, subject: 'evidence', subjectId: inserted[0]?.id, action: 'registry_check', to: result, reason: `VIES ${vat.status}`, actorId: caller.userId, actorKind: 'provider' });
    json(res, 201, { ok: true, evidence: evidenceView(inserted[0]), vat: { status: vat.status, vat_id: vat.vatId, country_code: vat.countryCode, name: vat.name ?? null, checked_at: vat.checkedAt }, correlationId });
}

// ─── Annahmen (4A) ───────────────────────────────────────────────────────────

const AGREEMENT_TYPES = new Set(['provider_agreement', 'privacy_notice', 'billing_authorization', 'commercial_terms']);

async function acceptAgreement(req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, providerKey: string, ip: string) {
    const d = await readJson(req);
    const type = str(d.agreement_type, 40);
    const version = str(d.version, 40);
    if (!type || !AGREEMENT_TYPES.has(type)) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'agreement_type invalid', correlationId }); return; }
    if (!version) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'version required', correlationId }); return; }
    const name = str(d.accepted_by_name, 160);
    if (!name) { json(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'accepted_by_name required', correlationId }); return; }
    const language = (str(d.language, 2) || 'en').toLowerCase();
    const now = new Date().toISOString();
    // Eine neue Fassung loest die alte ab, loescht sie aber nicht: der Stand zum
    // Buchungszeitpunkt bleibt belegbar (Spec A §23).
    const prior = (await supabaseApi.select('provider_agreement_acceptance', { provider_key: providerKey, agreement_type: type }, { limit: 50 })) as any[];
    for (const p of prior) {
        if (!p.superseded_at) await supabaseApi.update('provider_agreement_acceptance', { id: p.id }, { superseded_at: now });
    }
    const auditRef = `${correlationId}:${createHash('sha256').update(ip || '').digest('hex').slice(0, 16)}`;
    const inserted = (await supabaseApi.insert('provider_agreement_acceptance', {
        provider_key: providerKey, agreement_type: type, version, language, accepted_at: now,
        accepted_by_name: name, accepted_by_title: str(d.accepted_by_title, 120) ?? null,
        accepted_by_user_id: caller.userId, audit_ref: auditRef,
    })) as any[];
    await supabaseApi.insert('event_log', { type: 'provider_agreement_accepted', payload: { providerKey, agreementType: type, version, by: caller.userId } });
    json(res, 201, { ok: true, agreement: { agreement_type: type, version, language, accepted_at: now, accepted_by_name: name, id: inserted[0]?.id }, correlationId });
}

// ─── Einreichen (4A) ─────────────────────────────────────────────────────────

async function submit(res: ServerResponse, correlationId: string, caller: Caller, providerKey: string) {
    const d = await loadDossier(providerKey);
    if (!d) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    const status = d.provider.lifecycle_status ?? 'draft';
    if (!EDITABLE_LIFECYCLE.has(status)) {
        json(res, 409, { errorCode: 'NOT_SUBMITTABLE', message: `An application in status ${status} cannot be submitted`, lifecycle_status: status, correlationId }); return;
    }
    const v = submitValidation({
        provider: d.provider, confidential: d.confidential, services: d.services, coverage: d.coverage,
        checklist: d.checklist, agreements: d.agreements.map((a) => a.agreement_type),
    });
    if (!v.ok) {
        json(res, 422, { errorCode: 'INCOMPLETE', message: 'A few things are still missing before we can review your application', missing: v.missing, chapters: chapters(d), correlationId }); return;
    }
    const now = new Date().toISOString();
    await supabaseApi.update('providers', { provider_key: providerKey }, {
        lifecycle_status: 'submitted', lifecycle_status_reason: status === 'more_info_required' ? 'Erneut eingereicht' : 'Antrag eingereicht', updated_at: now,
    });
    await reviewLog({ providerKey, subject: 'lifecycle', action: 'submitted', from: status, to: 'submitted', actorId: caller.userId, actorKind: 'provider' });
    await supabaseApi.insert('event_log', { type: 'provider_application_submitted', payload: { providerKey, services: d.services.length, countries: d.coverage.length, by: caller.userId } });
    json(res, 200, { ok: true, lifecycle_status: 'submitted', submitted_at: now, correlationId });
}

// ─── Verification Center (5B) ────────────────────────────────────────────────

export function coverageMatrix(services: any[], coverage: any[]) {
    return services.filter((s) => s.status !== 'retired').map((s) => ({
        service_id: s.id, service_code: s.service_code, service_name: s.service_name, status: s.status,
        cells: coverage.filter((c) => c.service_id === s.id).map((c) => ({
            coverage_id: c.id, country_code: c.country_code, jurisdiction_code: c.jurisdiction_code ?? null,
            status: c.status, limitations: c.limitations ?? null, approved_at: c.approved_at ?? null, expires_at: c.expires_at ?? null,
        })),
    }));
}

async function verification(res: ServerResponse, correlationId: string, providerKey: string) {
    const d = await loadDossier(providerKey);
    if (!d) { json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId }); return; }
    const log = (await supabaseApi.select('provider_review_log', { provider_key: providerKey }, { order: 'created_at.desc', limit: 50 })) as any[];
    json(res, 200, {
        ok: true,
        lifecycle: {
            status: d.provider.lifecycle_status ?? 'draft', since: d.provider.lifecycle_status_since ?? null,
            reason: d.provider.lifecycle_status_reason ?? null,
            reverification_due_at: d.provider.reverification_due_at ?? null, grace_until: d.provider.reverification_grace_until ?? null,
        },
        matrix: coverageMatrix(d.services, d.coverage),
        checklist: d.checklist,
        open_requests: d.requests,
        // Das Protokoll ohne Reviewer-IDs: der Anbieter sieht, WAS entschieden
        // wurde und warum, nicht wer.
        history: log.map((l) => ({ id: l.id, subject: l.subject, subject_id: l.subject_id, action: l.action, from: l.from_value, to: l.to_value, reason: l.reason, actor_kind: l.actor_kind, created_at: l.created_at })),
        correlationId,
    });
}

// ─── Router ──────────────────────────────────────────────────────────────────

const ROUTE = /^\/api\/v1\/provider\/([a-z0-9-]+)\/(application|services|evidence|agreements|submit|verification)(?:\/([^/?]+))?(?:\/([^/?]+))?(?:\?.*)?$/;

/**
 * Nimmt eine Anbieter-Route an oder gibt false zurueck, damit index.ts weiter
 * durch seine Kette laeuft. Der Ownership-Guard ist bereits gelaufen.
 */
export async function handleProviderApplication(
    req: IncomingMessage, res: ServerResponse, correlationId: string, caller: Caller, ip: string,
): Promise<boolean> {
    const m = ROUTE.exec(req.url || '');
    if (!m) return false;
    const [, providerKey, section, a, b] = m;
    res.setHeader('x-correlation-id', correlationId);
    const method = req.method || 'GET';
    try {
        if (section === 'application' && !a) {
            if (method === 'GET') {
                const d = await loadDossier(providerKey);
                if (!d) json(res, 404, { errorCode: 'NOT_FOUND', message: 'Provider not found', correlationId });
                else json(res, 200, dossierResponse(d, correlationId));
                return true;
            }
            if (method === 'PATCH') { await patchApplication(req, res, correlationId, caller, providerKey); return true; }
        }
        if (section === 'services') {
            if (!a && method === 'POST') { await createService(req, res, correlationId, caller, providerKey); return true; }
            if (a && !b && method === 'PATCH') { await patchService(req, res, correlationId, caller, providerKey, a); return true; }
            if (a && !b && method === 'DELETE') { await retireService(res, correlationId, caller, providerKey, a); return true; }
            if (a && b === 'coverage' && method === 'PUT') { await putCoverage(req, res, correlationId, caller, providerKey, a); return true; }
        }
        if (section === 'evidence') {
            if (a === 'upload-url' && !b && method === 'POST') { await evidenceUploadUrl(req, res, correlationId, caller, providerKey); return true; }
            if (a === 'registry' && !b && method === 'POST') { await evidenceRegistry(req, res, correlationId, caller, providerKey); return true; }
            if (a && b === 'confirm' && method === 'POST') { await evidenceConfirm(res, correlationId, caller, providerKey, a); return true; }
        }
        if (section === 'agreements' && !a && method === 'POST') { await acceptAgreement(req, res, correlationId, caller, providerKey, ip); return true; }
        if (section === 'submit' && !a && method === 'POST') { await submit(res, correlationId, caller, providerKey); return true; }
        if (section === 'verification' && !a && method === 'GET') { await verification(res, correlationId, providerKey); return true; }
        json(res, 405, { errorCode: 'METHOD_NOT_ALLOWED', message: 'Not supported on this route', correlationId });
        return true;
    } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'invalid json' || msg === 'payload too large') {
            json(res, 400, { errorCode: 'VALIDATION_ERROR', message: msg === 'invalid json' ? 'Body must be JSON' : 'Body too large', correlationId });
            return true;
        }
        structuredLog('error', 'Provider application route failed', { correlationId, errorCode: 'ERR_APPLICATION', severity: 'error', route: req.url });
        json(res, 500, { errorCode: 'INTERNAL', message: 'Request failed', correlationId });
        return true;
    }
}

export { REQUIRED_AGREEMENTS };
