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
    | 'account_paused'
    | 'payment_failed';      // Phase 4: letzte Lead-Belastung mit dem aktuellen Zahlungsmittel gescheitert

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
    /** Bereichs-Code der Leistung (Migration 20260921000000): 'tax-vat.returns' → 'tax-vat'. */
    area_code: string;
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

// ─── Phase 2: Onboarding und Verifikation (Migration 20260924000000) ─────────

/** Vertrauliche Verifikationsdaten, physisch getrennt von `providers` (Spec §1). Deny-all RLS. */
export interface ProviderConfidential {
    provider_key: string;
    registration_number: string | null;
    entity_type: string | null;
    registered_address: string | null;
    operating_address: string | null;
    tax_number: string | null;
    representative_name: string | null;
    representative_title: string | null;
    representative_verified_at: string | null;
    /** Referenz beim Pruefdienst — nie das Ausweisdokument. */
    representative_id_ref: string | null;
    beneficial_owners: unknown;
    insurance_provider: string | null;
    insurance_type: string | null;
    insurance_valid_until: string | null;
}

/** Login → Anbieter (Migration 20260922000000). Zum Launch genau ein Login je Anbieter. */
export interface ProviderMember {
    provider_key: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at: string;
}

/** Datei-Metadaten eines hochgeladenen Nachweises. `upload_confirmed` erst, wenn die API das Objekt gesehen hat. */
export interface ProviderEvidenceFile {
    original_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    uploaded_at: string | null;
    upload_confirmed: boolean;
}

/** Nachforderung eines Nachweises durch den Reviewer. Offen, bis ein bestaetigter Upload sie erfuellt. */
export interface ProviderEvidenceRequest {
    id: string;
    provider_key: string;
    evidence_type: string;
    service_id: string | null;
    country_code: string | null;
    message: string;
    status: 'open' | 'fulfilled' | 'withdrawn';
    requested_by: string | null;
    requested_at: string;
    fulfilled_at: string | null;
    fulfilled_evidence_id: string | null;
}

/** Eine Zeile des append-only Entscheidungsprotokolls (Spec §25). */
export interface ProviderReviewLogEntry {
    id: string;
    provider_key: string;
    subject: 'evidence' | 'coverage' | 'service' | 'lifecycle' | 'request' | 'application';
    subject_id: string | null;
    action: string;
    from_value: string | null;
    to_value: string | null;
    reason: string | null;
    actor_id: string | null;
    actor_kind: 'reviewer' | 'provider' | 'system';
    created_at: string;
}

/** Was das Aktivierungs-Gate antwortet (providerReview.ts / verificationRules.ts). */
export interface ActivationGateVerdict {
    ok: boolean;
    /** Schluessel je fehlendem Punkt: evidence.<typ>, coverage.none_approved, agreements.<typ>, billing.<grund>, plan.category_allowance. */
    missing: string[];
    target: 'active' | 'limited';
    approved_cells: number;
    total_cells: number;
}

// ─── Phase 3: Anonymes Matching (Migration 20260928000000, ADR-0004) ─────────

/** Opaker Anbieter-Bezeichner: zwoelf Hex-Zeichen, Zufall. Das Einzige, was ein Nutzer von einem Anbieter als Kennung sieht. */
export type PublicRef = string;

/** Der Titel vor der Buchung — vom System, nie vom Anbieter. */
export interface PublicTitle {
    /** "Verified Provider B"; der Buchstabe ist die Position in der gelieferten Liste. */
    label: string;
    letter: string;
    /** "Tax and VAT · Norditalien" — bis zu zwei freigegebene Bereiche plus Region. */
    descriptor: string;
}

export type VerificationLevel = 'independent' | 'reviewed' | 'partial' | 'none';

/** Die Fakten hinter der Reihenfolge einer Ergebnisliste. Keine Gewichte. */
export interface RankBasis {
    verification: VerificationLevel;
    verified_count: number;
    required_count: number;
    response_hours: number | null;
    confirmation_rate: number | null;
    /** Nur aus Bewertungen, die an einer Buchung haengen. */
    rating: number | null;
    reviews_count: number | null;
}

export type IdentityFindingType = 'email' | 'phone' | 'domain' | 'handle' | 'legal_form' | 'registry' | 'own_name';

/** Ein Fund des deterministischen Identitaets-Scans — die 422-Antwort `IDENTITY_IN_TEXT` nennt Feld, Typ und Stelle. */
export interface IdentityFinding {
    field: string;
    type: IdentityFindingType;
    match: string;
    index: number;
}

/** Ein Anbieter in der Ergebnisliste (Stufe 1). Felder der Klasse `anonymous` plus Titel, Match und Rangfakten. */
export interface AnonProviderCard {
    public_ref: PublicRef;
    title: string;
    letter: string;
    descriptor: string;
    region: string | null;
    active_since: number | null;
    specializations: string[];
    languages: string[];
    rating: number | null;
    completed_count: number | null;
    avg_response_hours: number | null;
    billing_model: 'abo' | 'hourly' | 'project' | 'mixed';
    is_verified: true;
    match: number;
    match_tier: 'high' | 'strong' | 'moderate';
    match_basis: { country: string | null; country_covered: boolean; domains_requested: string[]; domains_matched: string[] };
    rank_basis: RankBasis;
}

/** Das anonyme Detail (Stufe 2): Karte plus Dossier-Freitexte, maskiert. Kein Buchstabe — den kennt nur die Liste. */
export interface AnonProviderDetail extends Omit<AnonProviderCard, 'title' | 'letter' | 'match' | 'match_tier' | 'match_basis'> {
    markets: string[];
    services: string[] | null;
    credentials: string[] | null;
    excluded_services: string[] | null;
    work_mode: string | null;
    pricing_table: Array<Record<string, unknown>> | null;
    availability: 'available' | 'ooo';
}

// ─── Phase 4: Buchung, Bestaetigung, Belastung (ADR-0005) ────────────────────

/** Der Text, den der Nutzer vor der Buchung bestaetigt (booking_acknowledgements). */
export interface BookingAcknowledgement {
    version: string;
    language: string;
    body: string;
    shared_fields: string[];
    user_discount: { pct: number; policy_version: number; recurring_treatment: 'undecided' | 'first_invoice_only' | 'all_invoices' } | null;
}

/** Der Pflichtrabatt fuer Nutzer (user_discount_policy), versioniert. */
export interface UserDiscountPolicy {
    version: number;
    pct: number;
    recurring_treatment: 'undecided' | 'first_invoice_only' | 'all_invoices';
    effective_from: string;
}

export type LeadLedgerPaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'n/a';

/** Was ein Lead den Anbieter gekostet hat — Spec B "standard fee, discount, final charge". */
export interface ProviderBookingLead {
    band: 1 | 2 | 3 | 4;
    standard_fee_cents: number;
    discount_pct: number;
    discount_sequence: number | null;
    final_fee_cents: number;
    currency: string;
    payment_status: LeadLedgerPaymentStatus;
    fee_enabled: boolean;
}

/** Selbstauskunft des Anbieters je Lead (lead_proposal_reports). */
export interface LeadProposalReport {
    proposal_issued: boolean;
    discount_shown: boolean;
    reported_at: string;
}

/** Zahlungsbereitschaft eines Anbieters, berechnet aus Stripe und Datenbank (Spec A §21.1). */
export interface BillingReadiness {
    ready: boolean;
    reasons: BillingBlockReason[];
    synced_at: string | null;
}

/** Body von POST /scheduling (Phase 4). */
export interface BookingCreateRequest {
    public_ref: string;
    slot_start: string;
    message?: string;
    acknowledgement_version: string;
    language?: string;
    session_id?: string;
    area_code?: string;
    countries?: string[];
    service_id?: string;
}

/** Antwort von POST /scheduling. Traegt weder Band noch Gebuehr — die sieht nur der Anbieter. */
export interface BookingCreateResponse {
    ok: true;
    booking: {
        id: string;
        public_ref: string;
        slot_start: string;
        slot_end: string;
        status: 'confirmed';
        acknowledgement_version: string;
        shared_fields: string[];
        user_discount: { pct: number; policy_version: number } | null;
    };
    provider_identity: { name: string; website_url: string | null; contact_email: string | null };
}

/** Fehlercodes der Buchung, die eine Oberflaeche unterscheiden muss. */
export type BookingErrorCode =
    | 'BILLING_NOT_READY'          // Anbieter nicht zahlungsbereit — nichts versucht
    | 'ACKNOWLEDGEMENT_OUTDATED'   // Fassung hat sich geaendert, `current_version` in der Antwort
    | 'SLOT_TAKEN'                 // Termin gerade vergeben
    | 'BOOKING_NOT_COMPLETED'      // Belastung gescheitert — keine Buchung, Grund `provider_billing`
    | 'BILLING_ERROR'              // Zahlungsdienst nicht erreichbar (502)
    | 'OPPORTUNITY_REQUIRED' | 'AREA_NOT_OFFERED' | 'SERVICE_NOT_FOUND';
