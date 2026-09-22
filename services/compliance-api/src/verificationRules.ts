// ─── Die Regeln der Verifikation, ohne Datenbank ─────────────────────────────
//
// Alles hier ist eine reine Funktion: Eingabe rein, Urteil raus, kein
// Nebeneffekt. providerApplication.ts (Anbieterseite) und providerReview.ts
// (Reviewerseite) rufen dieselben Funktionen — der Anbieter sieht in seiner
// Checkliste genau das, woran der Reviewer spaeter misst. Zwei Fassungen
// derselben Regel wuerden auseinanderlaufen, und der Anbieter erfuehre es als
// Ablehnung.
//
// Grundlage: Spec A §5 (Pflichtnachweise), §7 (Evidence), §8 (Status),
// §21.1 (Billing-Readiness), §23 (Annahmen). Canvas 3A (Checkliste je Typ),
// 4A (Annahme je Dokument, dann Einreichen), 8A (Gate-Leiste).

export type EvidenceType =
    | 'incorporation'            // Registerauszug / Gruendungsurkunde
    | 'vat_id'                   // USt-IdNr., per Registerabfrage (VIES)
    | 'insurance'                // Berufshaftpflicht
    | 'representative_identity'  // Vertretungsberechtigung, per Pruefdienst
    | 'professional_licence';    // Zulassung je reguliertem Bereich und Land

export type EvidenceSource = 'document' | 'registry_check';

/** Ein Punkt der Checkliste (3A): was verlangt wird und woraus es sich belegt. */
export interface RequiredEvidence {
    type: EvidenceType;
    source: EvidenceSource;
    /** Leer = gilt fuer das Konto. Sonst die Leistung, fuer die der Nachweis gebraucht wird. */
    service_code: string | null;
    /** Leer = alle Maerkte. Sonst das Land, fuer das die Zulassung gelten muss. */
    country_code: string | null;
    /** Muss vor dem Einreichen vorliegen? Zulassungen kann der Reviewer je Zelle nachfordern. */
    required_for_submit: boolean;
}

/**
 * Bereiche, in denen eine staatliche Zulassung je Land noetig ist (Spec A
 * §5.3, §21). Nicht verhandelbar und nicht je Anbieter: wer Steuer- oder
 * Rechtsberatung anbietet, belegt die Zulassung in jedem Markt, den er
 * eintraegt. Andere Bereiche brauchen Registerauszug, Versicherung und
 * Vertretung — mehr wuerde Anbieter ohne Grund aussperren.
 */
export const REGULATED_AREAS: ReadonlySet<string> = new Set(['tax-vat', 'legal-advisory']);

/** Bereichs-Code einer Leistung: 'tax-vat.returns' → 'tax-vat'. */
export function areaCodeOf(serviceCode: string): string {
    return (serviceCode || '').split('.')[0];
}

export interface ServiceLike { id: string; service_code: string; status: string }
export interface CoverageLike { service_id: string; country_code: string; status: string }

/**
 * Welche Nachweise dieses Dossier braucht — abgeleitet aus den eingetragenen
 * Leistungen und Laendern, nie aus dem Plan. Immer gleich fuer jeden Anbieter
 * derselben Leistungen: das ist die Fairness-Regel der DNA als Code.
 */
export function requiredEvidence(services: ServiceLike[], coverage: CoverageLike[]): RequiredEvidence[] {
    const out: RequiredEvidence[] = [
        { type: 'incorporation', source: 'document', service_code: null, country_code: null, required_for_submit: true },
        { type: 'vat_id', source: 'registry_check', service_code: null, country_code: null, required_for_submit: true },
        { type: 'insurance', source: 'document', service_code: null, country_code: null, required_for_submit: true },
        // Die Identitaet der vertretungsberechtigten Person prueft spaeter ein
        // Pruefdienst (Spec A §7: Ergebnis speichern, nie den Ausweis). Bis er
        // angebunden ist, entscheidet der Reviewer am Registerauszug — deshalb
        // nicht Pflicht fuer das Einreichen.
        { type: 'representative_identity', source: 'registry_check', service_code: null, country_code: null, required_for_submit: false },
    ];
    const seen = new Set<string>();
    for (const s of services) {
        if (s.status === 'retired') continue;
        const area = areaCodeOf(s.service_code);
        if (!REGULATED_AREAS.has(area)) continue;
        for (const c of coverage) {
            if (c.service_id !== s.id) continue;
            const key = `${area}:${c.country_code}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ type: 'professional_licence', source: 'document', service_code: area, country_code: c.country_code, required_for_submit: false });
        }
    }
    return out;
}

export interface EvidenceLike {
    id: string;
    evidence_type: string;
    source: string;
    result: string;             // received | reviewed | independently_verified | rejected | expired
    upload_confirmed?: boolean | null;
    supports_service_codes?: string[] | null;
    supports_countries?: string[] | null;
    expires_at?: string | null;
}

export type ChecklistState = 'missing' | 'uploading' | 'received' | 'reviewed' | 'rejected' | 'expired';

export interface ChecklistItem extends RequiredEvidence {
    state: ChecklistState;
    evidence_id: string | null;
}

/** Zaehlt ein Nachweis fuer diesen Checklistenpunkt? Typ muss passen, Geltung darf nicht enger sein. */
export function evidenceMatches(req: RequiredEvidence, e: EvidenceLike): boolean {
    if (e.evidence_type !== req.type) return false;
    if (req.service_code) {
        const codes = e.supports_service_codes ?? [];
        if (codes.length && !codes.some((c) => areaCodeOf(c) === req.service_code)) return false;
    }
    if (req.country_code) {
        const lands = e.supports_countries ?? [];
        if (lands.length && !lands.includes(req.country_code)) return false;
    }
    return true;
}

/** Rang eines Nachweis-Ergebnisses: der beste zaehlt fuer die Checkliste. */
const STATE_RANK: Record<ChecklistState, number> = { missing: 0, uploading: 1, rejected: 2, expired: 3, received: 4, reviewed: 5 };

export function stateOf(e: EvidenceLike): ChecklistState {
    if (e.result === 'reviewed' || e.result === 'independently_verified') return 'reviewed';
    if (e.result === 'rejected') return 'rejected';
    if (e.result === 'expired') return 'expired';
    if (e.source === 'document' && !e.upload_confirmed) return 'uploading';
    return 'received';
}

/** Die Checkliste (3A): jeder Pflichtpunkt mit dem besten vorliegenden Nachweis. */
export function evidenceChecklist(required: RequiredEvidence[], evidence: EvidenceLike[]): ChecklistItem[] {
    return required.map((req) => {
        let best: { state: ChecklistState; id: string | null } = { state: 'missing', id: null };
        for (const e of evidence) {
            if (!evidenceMatches(req, e)) continue;
            const st = stateOf(e);
            if (STATE_RANK[st] > STATE_RANK[best.state]) best = { state: st, id: e.id };
        }
        return { ...req, state: best.state, evidence_id: best.id };
    });
}

/** Die drei Annahmen, ohne die kein Antrag eingereicht wird (Spec A §23; commercial_terms kommt mit dem Plan). */
export const REQUIRED_AGREEMENTS = ['provider_agreement', 'privacy_notice', 'billing_authorization'] as const;

export interface SubmitInput {
    provider: { name?: string | null; contact_email?: string | null; website_url?: string | null; countries_supported?: string[] | null };
    confidential: { entity_type?: string | null; registration_number?: string | null; registered_address?: string | null; representative_name?: string | null } | null;
    services: ServiceLike[];
    coverage: CoverageLike[];
    checklist: ChecklistItem[];
    /** Typen der aktuell gueltigen (nicht abgeloesten) Annahmen. */
    agreements: string[];
}

export interface Verdict { ok: boolean; missing: string[] }

/**
 * Darf der Antrag eingereicht werden (4A)? Die Liste `missing` ist die
 * Sprache der Oberflaeche: ein Schluessel je fehlendem Punkt, damit die
 * Zusammenfassung sagen kann, WAS fehlt, statt nur "unvollstaendig".
 */
export function submitValidation(input: SubmitInput): Verdict {
    const missing: string[] = [];
    if (!input.provider.name?.trim()) missing.push('account.name');
    if (!input.provider.contact_email?.trim()) missing.push('account.contact_email');
    const c = input.confidential;
    if (!c?.entity_type?.trim()) missing.push('legal.entity_type');
    if (!c?.registration_number?.trim()) missing.push('legal.registration_number');
    if (!c?.registered_address?.trim()) missing.push('legal.registered_address');
    if (!c?.representative_name?.trim()) missing.push('legal.representative_name');

    const live = input.services.filter((s) => s.status !== 'retired');
    if (!live.length) missing.push('services.none');
    else if (!live.some((s) => input.coverage.some((cv) => cv.service_id === s.id))) missing.push('services.no_country');

    for (const item of input.checklist) {
        if (!item.required_for_submit) continue;
        if (item.state === 'missing' || item.state === 'uploading' || item.state === 'rejected' || item.state === 'expired') {
            missing.push(`evidence.${item.type}`);
        }
    }
    for (const a of REQUIRED_AGREEMENTS) {
        if (!input.agreements.includes(a)) missing.push(`agreements.${a}`);
    }
    return { ok: missing.length === 0, missing };
}

export interface GateInput {
    checklist: ChecklistItem[];
    services: ServiceLike[];
    coverage: CoverageLike[];
    agreements: string[];
    billing_ready: boolean;
    billing_block_reasons: string[];
    /** Ergebnis der Kontingentpruefung gegen den Plan (billing.ts). null = kein Abo, dann faellt es unter billing. */
    allowance: { ok: boolean; over: string[] } | null;
    lifecycle_status: string;
}

export interface GateVerdict extends Verdict {
    /** 'active', wenn jede eingetragene Leistung in jedem Land frei ist; sonst 'limited'. */
    target: 'active' | 'limited';
    approved_cells: number;
    total_cells: number;
}

/**
 * Das Aktivierungs-Gate (Spec A §4, §21.1; Canvas 8A Gate-Leiste). Lebt hier
 * und nicht in einem Trigger, weil es sagen muss, WAS fehlt — in Punkten, die
 * ein Reviewer liest und ein Anbieter nachvollziehen kann.
 *
 * Bedingungen, jede einzeln benannt:
 *   · jeder Pflichtnachweis geprueft (nicht nur hochgeladen)
 *   · mindestens eine Leistung in mindestens einem Land freigegeben
 *   · die drei Annahmen liegen vor
 *   · billing_ready (Spec §21.1) — auch fuer 'limited'. "Limited" heisst
 *     "nur Teile frei", nicht "ohne Abrechnung".
 *   · das Kategorie-Kontingent des Plans ist eingehalten
 *   · das Konto ist nicht beendet
 */
export function activationGate(input: GateInput): GateVerdict {
    const missing: string[] = [];
    for (const item of input.checklist) {
        if (item.state === 'reviewed') continue;
        // Zulassungen zaehlen nur fuer Zellen, die freigegeben werden sollen;
        // eine offene Zulassung sperrt die Zelle (Reviewer), nicht das Konto.
        if (item.type === 'professional_licence') continue;
        missing.push(`evidence.${item.type}`);
    }
    const live = input.services.filter((s) => s.status !== 'retired');
    const cells = input.coverage.filter((c) => live.some((s) => s.id === c.service_id));
    const approved = cells.filter((c) => c.status === 'approved' || c.status === 'limited');
    if (!approved.length) missing.push('coverage.none_approved');
    for (const a of REQUIRED_AGREEMENTS) {
        if (!input.agreements.includes(a)) missing.push(`agreements.${a}`);
    }
    if (!input.billing_ready) {
        missing.push('billing.not_ready');
        for (const r of input.billing_block_reasons) missing.push(`billing.${r}`);
    }
    if (input.allowance && !input.allowance.ok) missing.push('plan.category_allowance');
    if (input.lifecycle_status === 'terminated') missing.push('lifecycle.terminated');

    return {
        ok: missing.length === 0,
        missing,
        target: approved.length === cells.length && cells.length > 0 ? 'active' : 'limited',
        approved_cells: approved.length,
        total_cells: cells.length,
    };
}

/**
 * Zulaessige Statuswechsel durch einen Reviewer (Spec A §3). Alles andere ist
 * kein Fehler des Reviewers, sondern ein Zustand, den das System setzt
 * (submitted durch den Anbieter, reverification_due durch den Watcher).
 */
export const REVIEWER_TRANSITIONS: Record<string, readonly string[]> = {
    submitted: ['under_verification', 'more_info_required'],
    more_info_required: ['under_verification', 'terminated'],
    under_verification: ['more_info_required', 'approved_pending_activation', 'active', 'limited', 'terminated'],
    approved_pending_activation: ['active', 'limited', 'more_info_required', 'terminated'],
    active: ['limited', 'paused', 'suspended', 'reverification_due', 'terminated'],
    limited: ['active', 'paused', 'suspended', 'reverification_due', 'terminated'],
    reverification_due: ['active', 'limited', 'suspended', 'more_info_required', 'terminated'],
    paused: ['active', 'limited', 'terminated'],
    suspended: ['active', 'limited', 'terminated'],
    terminated: [],
    draft: [],
};

export function transitionAllowed(from: string, to: string): boolean {
    return (REVIEWER_TRANSITIONS[from] ?? []).includes(to);
}

/** Hebt die Leistung auf 'approved', sobald eine Zelle frei ist; zurueck auf pending, wenn keine mehr. */
export function serviceStatusFromCoverage(current: string, cells: CoverageLike[]): string {
    if (current === 'retired' || current === 'paused') return current;
    const free = cells.filter((c) => c.status === 'approved' || c.status === 'limited');
    if (!free.length) return cells.some((c) => c.status === 'pending') ? 'pending_verification' : current === 'draft' ? 'draft' : 'pending_verification';
    return free.length === cells.length ? 'approved' : 'limited';
}
