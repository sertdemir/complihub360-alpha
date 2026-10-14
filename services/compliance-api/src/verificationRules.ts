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

/**
 * Braucht dieser Bereich eine Zulassung je Land? Die eine Stelle, an der das
 * entschieden wird — Checkliste, Queue-Risiko und Zell-Freigabe fragen hier.
 * Nimmt auch einen Leistungs-Code ('tax-vat.returns').
 */
export function isRegulatedArea(areaOrServiceCode: string): boolean {
    return REGULATED_AREAS.has(areaCodeOf(areaOrServiceCode));
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
        if (!isRegulatedArea(area)) continue;
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

// ─── Zulassung je Zelle (Leistung × Land) ────────────────────────────────────
//
// Das Gegenstueck zur Ausnahme in activationGate: dort sperrt eine offene
// Zulassung das Konto nicht, weil sie die ZELLE sperrt. Hier steht, was das
// heisst. Eine Zelle in einem regulierten Bereich ist erst freigebbar, wenn
// eine gepruefte, nicht abgelaufene Zulassung fuer genau diesen Bereich und
// dieses Land vorliegt. Eine DE-Zulassung deckt AT nicht.

export type LicenceState = 'not_required' | 'reviewed' | 'missing' | 'expired';

export interface CellLicence {
    required: boolean;
    state: LicenceState;
    /** Die Zulassung, an der die Zelle haengt (bei 'reviewed') bzw. die zuletzt abgelaufene (bei 'expired'). */
    evidenceId?: string;
    /** Ablauf dieser Zulassung; null = kein Ablaufdatum. */
    expiresAt?: string | null;
}

/** Ablauf als Tag: am Ablaufdatum gilt der Nachweis nicht mehr — wie im Ablauf-Watcher (exp <= heute). */
const dayOf = (v: string | null | undefined): string | null => (v ? String(v).slice(0, 10) : null);

/** Spaeteres Ablaufdatum zuerst; kein Ablaufdatum ist das beste. */
function laterExpiry(a: string | null | undefined, b: string | null | undefined): number {
    const da = dayOf(a), db = dayOf(b);
    if (da === db) return 0;
    if (da === null) return -1;
    if (db === null) return 1;
    return da > db ? -1 : 1;
}

/**
 * Welche Zulassung traegt diese Zelle? Rein, ohne Datenbank — Zell-Aktion und
 * Dossier fragen beide hier.
 *
 * Brauchbar ist eine `professional_licence` mit Ergebnis reviewed oder
 * independently_verified, die fuer Bereich UND Land gilt (evidenceMatches:
 * leere supports_*-Listen gelten ueberall) und nicht abgelaufen ist. Gibt es
 * mehrere, zaehlt die unabhaengig gepruefte vor der geprueften, dann die mit
 * dem spaetesten Ablauf. 'expired' heisst: es gab passende, aber keine gilt
 * mehr — der Reviewer soll "abgelaufen" sehen, nicht "fehlt".
 */
export function licenceForCell(input: { serviceCode: string; countryCode: string; evidence: EvidenceLike[]; now?: Date }): CellLicence {
    const area = areaCodeOf(input.serviceCode);
    if (!isRegulatedArea(area)) return { required: false, state: 'not_required' };
    const today = (input.now ?? new Date()).toISOString().slice(0, 10);
    const req: RequiredEvidence = { type: 'professional_licence', source: 'document', service_code: area, country_code: input.countryCode, required_for_submit: false };
    const matching = input.evidence.filter((e) => evidenceMatches(req, e));
    const checked = (e: EvidenceLike) => e.result === 'reviewed' || e.result === 'independently_verified';
    const lapsed = (e: EvidenceLike) => { const d = dayOf(e.expires_at); return d !== null && d <= today; };

    const usable = matching.filter((e) => checked(e) && !lapsed(e)).sort((a, b) =>
        Number(b.result === 'independently_verified') - Number(a.result === 'independently_verified') || laterExpiry(a.expires_at, b.expires_at));
    if (usable.length) return { required: true, state: 'reviewed', evidenceId: usable[0].id, expiresAt: usable[0].expires_at ?? null };

    const expired = matching.filter((e) => e.result === 'expired' || (checked(e) && lapsed(e))).sort((a, b) => laterExpiry(a.expires_at, b.expires_at));
    if (expired.length) return { required: true, state: 'expired', evidenceId: expired[0].id, expiresAt: expired[0].expires_at ?? null };
    return { required: true, state: 'missing' };
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

/**
 * Die Annahmen in zwei Stufen (Canvas 4C, Nutzer-Entscheidung 2026-09-27) —
 * weil an den beiden Stufen zwei verschiedene Dinge haengen.
 *
 * SUBMIT_AGREEMENTS regeln, unter welchen Bedingungen wir die Angaben
 * ueberhaupt entgegennehmen und pruefen duerfen. Ohne sie gibt es keinen
 * Antrag.
 *
 * ACTIVATION_AGREEMENTS fuegen die Abrechnungsermaechtigung hinzu. Sie wird
 * gebraucht, bevor Geld fliesst — nicht, bevor jemand sich bewerben darf. Wer
 * sie schon zum Einreichen verlangt, laesst einen Anbieter ein Zahlungsmandat
 * erteilen, bevor er weiss, ob er ueberhaupt angenommen wird.
 *
 * Spec A §4 listet die Annahmen aller drei Dokumente VOR dem Review; die
 * Trennung weicht davon bewusst ab (Nachweis im Ticket). §23 regelt nur, WAS
 * festgehalten wird — Fassung, Sprache, Zeitstempel, Vertretung — und sagt zum
 * Zeitpunkt nichts; die Forderung stand nie dort. `commercial_terms` steht in keiner der beiden
 * Listen: die kommerziellen Bedingungen haengen am Tarif und koennen nicht
 * angenommen werden, solange keiner gewaehlt ist.
 */
export const SUBMIT_AGREEMENTS = ['provider_agreement', 'privacy_notice'] as const;
export const ACTIVATION_AGREEMENTS = ['provider_agreement', 'privacy_notice', 'billing_authorization'] as const;

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
 * Darf der Antrag eingereicht werden (4C)? Die Liste `missing` ist die
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
    for (const a of SUBMIT_AGREEMENTS) {
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
    /**
     * Ergebnis der Kontingentpruefung gegen den Plan (billing.ts). null = kein
     * Abo. Dann sperrt hier NICHTS mehr: seit 2026-10-01 sperrt die
     * Zahlungsbereitschaft das Aktivieren nicht, also faengt das Gate den Fall
     * "kein Abo" auch nicht mehr ueber `billing_ready`. Siehe TKT-PROV-05.
     */
    allowance: { ok: boolean; over: string[] } | null;
    lifecycle_status: string;
}

export interface GateVerdict extends Verdict {
    /** 'active', wenn jede eingetragene Leistung in jedem Land frei ist; sonst 'limited'. */
    target: 'active' | 'limited';
    approved_cells: number;
    total_cells: number;
    /**
     * Gemeldet, NICHT sperrend (Spec A §21.1). Fehlt die Zahlungsbereitschaft,
     * wird der Anbieter aktiv und matchbar — nur eine gebuehrenpflichtige
     * Buchung geht nicht. Der Reviewer soll es sehen, nicht daran scheitern.
     */
    billing: { ready: boolean; blocks_chargeable_booking: string[] };
}

/**
 * Das Aktivierungs-Gate (Spec A §4, §21.1; Canvas 8A Gate-Leiste). Lebt hier
 * und nicht in einem Trigger, weil es sagen muss, WAS fehlt — in Punkten, die
 * ein Reviewer liest und ein Anbieter nachvollziehen kann.
 *
 * Bedingungen, jede einzeln benannt:
 *   · jeder Pflichtnachweis geprueft (nicht nur hochgeladen)
 *   · mindestens eine Leistung in mindestens einem Land freigegeben
 *   · die Annahmen liegen vor, hier einschliesslich der Abrechnungsermaechtigung
 *   · das Kategorie-Kontingent des Plans ist eingehalten
 *   · das Konto ist nicht beendet
 *
 * Was hier BEWUSST NICHT sperrt (Nutzer-Entscheidung 2026-10-01, Ticket
 * TKT-PROV-05): die Zahlungsbereitschaft. §21.1 heisst "Billing readiness
 * gate", und alle sechs Zeilen darunter lauten "Block chargeable booking
 * eligibility when: ..." — sie sperren die gebuehrenpflichtige BUCHUNG, nicht
 * den Status. Das Datenmodell wusste das schon: der Kommentar an
 * `matchable_provider_services` (20260920000000) nennt `billing_ready`
 * ausdruecklich "absichtlich KEIN Filter — sonst entschiede der Zahlungsstatus
 * ueber die Sichtbarkeit, was §14 verbietet". Da der View ueber
 * `lifecycle_status IN ('active','limited')` filtert, tat das Gate genau das:
 * ueber Billing zu sperren hiess, ueber die Sichtbarkeit zu entscheiden.
 *
 * Die Buchung ist weiterhin gesperrt, an der richtigen Stelle: `/scheduling`
 * prueft `bookable_chargeable` und antwortet 409 BILLING_NOT_READY. Das Gate
 * MELDET die Lage nur noch (`billing` im Verdikt).
 */
export function activationGate(input: GateInput): GateVerdict {
    const missing: string[] = [];
    for (const item of input.checklist) {
        if (item.state === 'reviewed') continue;
        // Zulassungen zaehlen nur fuer Zellen, die freigegeben werden sollen;
        // eine offene Zulassung sperrt die Zelle (Reviewer), nicht das Konto.
        // Durchgesetzt in der Zell-Aktion (providerReview.ts) ueber licenceForCell.
        if (item.type === 'professional_licence') continue;
        missing.push(`evidence.${item.type}`);
    }
    const live = input.services.filter((s) => s.status !== 'retired');
    const cells = input.coverage.filter((c) => live.some((s) => s.id === c.service_id));
    const approved = cells.filter((c) => c.status === 'approved' || c.status === 'limited');
    if (!approved.length) missing.push('coverage.none_approved');
    for (const a of ACTIVATION_AGREEMENTS) {
        if (!input.agreements.includes(a)) missing.push(`agreements.${a}`);
    }
    if (input.allowance && !input.allowance.ok) missing.push('plan.category_allowance');
    if (input.lifecycle_status === 'terminated') missing.push('lifecycle.terminated');

    return {
        ok: missing.length === 0,
        missing,
        target: approved.length === cells.length && cells.length > 0 ? 'active' : 'limited',
        approved_cells: approved.length,
        total_cells: cells.length,
        billing: {
            ready: input.billing_ready,
            blocks_chargeable_booking: input.billing_ready ? [] : ['not_ready', ...input.billing_block_reasons],
        },
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
