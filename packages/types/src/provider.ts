/**
 * Das Anbieter-Datenmodell.
 *
 * Gegenstueck zu supabase/migrations/20260920000000_provider_data_model.sql.
 * Grundlage ist die "Provider Verification and Dashboard Implementation
 * Specification" v1.0 vom 20.09.2026.
 *
 * Der Kern in einem Satz: drei Statusachsen, und "matchbar" ist keine davon.
 * Ob ein Anbieter in einem Markt erscheint, entscheidet die UND-Kette in
 * `MatchableProviderService` — nicht ein gespeichertes Flag, das jemand
 * konsistent halten muesste.
 */

/**
 * Kontostatus (Spec §3). Sperrt oder erlaubt das Konto als Ganzes.
 *
 * Zwei Werte waren in der Spec Fragen statt Zustaende und sind hier
 * beantwortet:
 *  - `limited` — das Konto blockiert nicht mehr, die Entscheidung faellt
 *    allein auf Coverage-Ebene.
 *  - `reverification_due` — matchbar, solange `reverification_grace_until`
 *    in der Zukunft liegt. NULL heisst sofort raus.
 */
export type ProviderLifecycleStatus =
    | 'draft'
    | 'submitted'
    | 'more_info_required'
    | 'under_verification'
    | 'approved_pending_activation'
    | 'active'
    | 'limited'
    | 'reverification_due'
    | 'paused'
    | 'suspended'
    | 'terminated';

/** Status einer einzelnen Leistung (Spec §19). Neu angelegt startet sie in `pending_verification`. */
export type ProviderServiceStatus =
    | 'draft'
    | 'pending_verification'
    | 'approved'
    | 'limited'
    | 'paused'
    | 'retired';

/** Freigabe einer Leistung in einem Markt (Spec §4). Die kleinste Einheit, ueber die ein Reviewer entscheidet. */
export type CoverageStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'limited'
    | 'suspended'
    | 'expired';

/**
 * Sichtbarkeitsklasse eines Feldes (Spec §13).
 *
 * Ein Feld ohne Eintrag im Register gilt als `internal` und erscheint in
 * keiner Antwort — Standard zu, nicht Standard auf.
 */
export type VisibilityClass =
    | 'anonymous'    // vor der Buchung sichtbar
    | 'revealed'     // erst nach Buchung
    | 'internal'     // Matching und autorisierte Mitarbeit
    | 'confidential' // Verifikation, Identitaet, Eigentum
    | 'billing';

/** Gruende aus dem Billing-Gate (Spec §21.1). Sperren die Buchung, NICHT das Matching. */
export type BillingBlockReason =
    | 'no_payment_method'
    | 'incomplete_billing_info'
    | 'inactive_subscription'
    | 'withdrawn_authorization'
    | 'overdue_invoice'
    | 'account_paused';

/** Ergebnis einer Nachweispruefung (Spec §7). */
export type EvidenceResult =
    | 'received'
    | 'reviewed'
    | 'independently_verified'
    | 'rejected'
    | 'expired';

/** Meldefrist einer Aenderung (Spec §18). Haengt an der Schwere, nicht am Feld. */
export type ChangeDeadlineClass =
    | 'immediate_24h'
    | 'within_3_business_days'
    | 'before_effective_date';

export interface ServiceCategory {
    code: string;
    parent_code: string | null;   // null = Bereich, sonst Unterkategorie
    label_en: string;
    active: boolean;
    sort_order: number;
}

/**
 * Eine Zeile je Leistung, die ein Anbieter gematcht haben will (Spec §10).
 *
 * Ersetzt `Provider.categories` als Matching-Eingang. Ein Bereichs-Slug sagt
 * nichts ueber Preis, Dauer, Ausschluesse und fachliche Verantwortung — die
 * Anonymous Match Card (§15) verlangt aber genau das, und zwar je Leistung.
 */
export interface ProviderService {
    id: string;
    provider_key: string;
    service_code: string;

    service_name: string;
    /** Vorschlaege des Anbieters. Gehen NICHT ins Matching (Spec §11.1). */
    provider_keywords: string[];
    /** Von CompliHub360 geprueft. Nur diese matchen. */
    approved_synonyms: string[];

    description: string | null;
    deliverables: string[];
    /** Was die Leistung ausdruecklich nicht abdeckt. Steht auf der Match-Karte. */
    exclusions: string[];
    prerequisites: string[];
    required_user_documents: string[];

    business_models: string[];
    industries: string[];
    company_size_bands: string[];

    pricing_model: 'fixed' | 'hourly' | 'retainer' | 'project' | 'mixed' | null;
    /** Waehrung und Basis sind Pflicht, sobald eine Spanne steht (Spec §27). */
    price_min: number | null;
    price_max: number | null;
    currency: string | null;
    pricing_basis: string | null;
    min_engagement: string | null;
    additional_costs: string | null;

    response_time_hours: number | null;
    completion_days_estimate: number | null;
    capacity_status: 'open' | 'limited' | 'full';

    responsible_role: string | null;
    supervising_professional: string | null;
    uses_subcontractors: boolean;

    status: ProviderServiceStatus;
    status_since: string;
    retired_at: string | null;

    created_at: string;
    updated_at: string;
}

/**
 * Freigabe je Leistung und Markt (Spec §4).
 *
 * Die folgenreichste Tabelle der Spec und die, die sich nicht nachruesten
 * laesst: wer provider-global freigibt und spaeter merkt, dass eine Zulassung
 * nur in einem Land gilt, muss jede Buchung und jede Match-Abfrage
 * rueckwirkend aufteilen.
 */
export interface ProviderServiceCoverage {
    id: string;
    service_id: string;
    country_code: string;
    /** null = ganzes Land. Sonst die Unterebene, etwa ein US-Bundesstaat. */
    jurisdiction_code: string | null;

    status: CoverageStatus;
    limitations: string | null;
    approved_at: string | null;
    approved_by: string | null;
    /** Abgelaufen heisst nicht matchbar — die View prueft das, ohne dass jemand den Status nachzieht. */
    expires_at: string | null;
    next_review_at: string | null;

    created_at: string;
    updated_at: string;
}

/** Nachweis-Kette (Spec §7). Jede geprüfte Aussage ueber einen Anbieter zeigt hierher. */
export interface ProviderEvidence {
    id: string;
    provider_key: string;

    evidence_type: string;
    issuing_authority: string | null;
    identifier: string | null;
    covered_entity: string | null;

    /** `registry_check`, wo eine Registerabfrage reicht: dann wird das Ergebnis gespeichert, nicht das Dokument. */
    source: 'document' | 'registry_check';
    file_ref: string | null;
    registry_reference: string | null;

    received_at: string;
    reviewed_at: string | null;
    reviewer_id: string | null;
    result: EvidenceResult;

    issue_date: string | null;
    expires_at: string | null;
    next_review_at: string | null;

    /** Leer = gilt fuer den Anbieter als Ganzes, nicht fuer eine bestimmte Leistung. */
    supports_service_codes: string[];
    supports_countries: string[];

    limitations: string | null;
    reviewer_notes: string | null;
}

/** Gemeldete Aenderung mit Vorher/Nachher (Spec §18, §27). */
export interface ProviderChangeRequest {
    id: string;
    provider_key: string;
    service_id: string | null;

    change_type: string;
    field_path: string | null;
    old_value: unknown;
    new_value: unknown;

    deadline_class: ChangeDeadlineClass;
    status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'applied' | 'withdrawn';

    requires_reverification: boolean;
    pauses_affected_services: boolean;
    user_impact: string | null;

    submitted_at: string;
    reviewed_at: string | null;
    reviewer_id: string | null;
    effective_at: string | null;
}

/** Welche Fassung wann von wem akzeptiert wurde (Spec §23). Append-only. */
export interface ProviderAgreementAcceptance {
    id: string;
    provider_key: string;
    agreement_type: 'provider_agreement' | 'privacy_notice' | 'billing_authorization' | 'commercial_terms';
    version: string;
    language: string;
    accepted_at: string;
    accepted_by_name: string | null;
    accepted_by_title: string | null;
    accepted_by_user_id: string | null;
    audit_ref: string | null;
    superseded_at: string | null;
}

/**
 * Preisstand zum Buchungszeitpunkt (Spec §20).
 *
 * Ohne diesen Schnappschuss gibt es bei jeder spaeteren Preisaenderung nur
 * noch Aussage gegen Aussage.
 */
export interface BookingPriceSnapshot {
    price_min: number | null;
    price_max: number | null;
    currency: string | null;
    pricing_basis: string | null;
    included: string[];
    terms_version: string | null;
    captured_at: string;
}

/**
 * Die UND-Kette: was ist matchbar (Spec §3 × §4 × §19).
 *
 * Bildet die View `matchable_provider_services` ab. Zwei Spalten sind
 * bewusst Meldung statt Filter:
 *
 *  - `bookable_chargeable` — das Billing-Gate (§21.1) sperrt die BUCHUNG,
 *    nicht das Matching. Wer die Abrechnung ins Matching zieht, baut genau
 *    das, was §14 verbietet.
 *  - `provider_availability` — 'ooo' halbiert im Ranking den Score, statt
 *    auszuschliessen. Diese Entscheidung gehoert dem Ranker.
 */
export interface MatchableProviderService {
    service_id: string;
    provider_key: string;
    service_code: string;
    service_name: string;
    coverage_id: string;
    country_code: string;
    jurisdiction_code: string | null;
    coverage_limitations: string | null;

    approved_synonyms: string[];
    exclusions: string[];
    price_min: number | null;
    price_max: number | null;
    currency: string | null;
    pricing_basis: string | null;
    response_time_hours: number | null;
    completion_days_estimate: number | null;
    capacity_status: 'open' | 'limited' | 'full';

    provider_availability: 'available' | 'ooo';
    bookable_chargeable: boolean;
    provider_lifecycle_status: ProviderLifecycleStatus;
}
