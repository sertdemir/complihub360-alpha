// ─── Change-Control fuer aktive Partner (Spec A §18–20, §28) ─────────────────
//
// Bis 2026-10-02 ging jede Aenderung eines aktiven Partners sofort live —
// Preise eingeschlossen; Rechtsform und Vertretung landeten nur im
// Protokoll. Diese Datei entscheidet je Feld, was mit einer Aenderung
// passiert:
//
//   apply             sofort uebernehmen, kein Vorgang (Sprachen, Region …)
//   apply_and_review  sofort uebernehmen UND einen Pruefvorgang anlegen —
//                     fuer Tatsachen, die schon eingetreten sind (neuer
//                     Firmenname, neue Adresse). Sie aufzuhalten, macht das
//                     Dossier nur falsch.
//   hold              NICHT uebernehmen; der neue Wert wartet im Vorgang,
//                     bis das Pruefteam freigibt. Nutzer sehen bis dahin den
//                     bisherigen Wert (§18 "Do not publish or apply until
//                     submitted and, where required, approved").
//
// Welche Wirkung ein Feld hat, haengt an der Policy (Canvas A, 2026-10-01):
//   spec          §18 woertlich
//   all_reviewed  jede Aenderung an geprueften Angaben wartet
//   direction     was fuer Nutzer ungünstiger wird, wartet; was guenstiger
//                 wird (Preis runter, Lieferzeit kuerzer), gilt sofort
// Die Wahl ist EINE Zeile: CHANGE_POLICY unten.
//
// Was hier nicht steht: wer fragen darf (providerAuth.ts) und wie ein
// Vorgang entschieden wird (providerReview.ts). Die Datei ist rein — keine
// Datenbank, kein Request —, damit jede Regel einzeln testbar ist.

export type DeadlineClass = 'immediate_24h' | 'within_3_business_days' | 'before_effective_date';
export type Effect = 'apply' | 'apply_and_review' | 'hold';
export type Policy = 'spec' | 'all_reviewed' | 'direction';
export type ChangeTable = 'providers' | 'provider_confidential' | 'provider_services';

/** Canvas A — bis zur Wahl des Nutzers die Empfehlung V3. */
export const CHANGE_POLICY: Policy = 'direction';

/** Ab diesen Kontostatus ist ein Partner "geprueft und oeffentlich" — davor
 *  laeuft jede Angabe ohnehin durch das Review der Bewerbung. */
export const CONTROLLED_LIFECYCLE = new Set(['active', 'limited', 'reverification_due', 'paused', 'suspended']);
/** Nur freigegebene Leistungen sind kontrolliert. Eine neue Leistung wird als
 *  Ganzes geprueft (§19) und braucht keinen Vorgang je Feld. */
export const CONTROLLED_SERVICE = new Set(['approved', 'limited', 'paused']);

interface Rule {
    table: ChangeTable;
    changeType: string;
    deadline: DeadlineClass;
    /** Wirkung je Policy; 'lower_is_better' gilt nur in `direction`. */
    spec: Effect;
    all_reviewed: Effect;
    direction: Effect | 'lower_is_better';
}

const r = (table: ChangeTable, changeType: string, deadline: DeadlineClass, spec: Effect, all_reviewed: Effect, direction: Rule['direction'] = spec): Rule =>
    ({ table, changeType, deadline, spec, all_reviewed, direction });
const T3 = 'within_3_business_days' as const;
const PLANNED = 'before_effective_date' as const;

export const RULES: Record<string, Rule> = {
    // Konto — providers
    name:            r('providers', 'legal_name', T3, 'apply_and_review', 'hold'),
    website_url:     r('providers', 'website', T3, 'apply_and_review', 'hold'),
    contact_email:   r('providers', 'support', T3, 'apply_and_review', 'hold'),
    active_since:    r('providers', 'track_record', T3, 'apply_and_review', 'hold'),
    billing_country: r('providers', 'billing', T3, 'apply_and_review', 'apply_and_review'),
    languages:       r('providers', 'support', T3, 'apply', 'apply'),
    region:          r('providers', 'location', T3, 'apply', 'apply'),
    work_mode:       r('providers', 'support', T3, 'apply', 'apply'),

    // Rechtsform & Vertretung — provider_confidential
    entity_type:           r('provider_confidential', 'ownership', T3, 'apply_and_review', 'hold'),
    registration_number:   r('provider_confidential', 'ownership', T3, 'apply_and_review', 'hold'),
    registered_address:    r('provider_confidential', 'address', T3, 'apply_and_review', 'hold'),
    operating_address:     r('provider_confidential', 'address', T3, 'apply_and_review', 'hold'),
    tax_number:            r('provider_confidential', 'billing', T3, 'apply_and_review', 'hold'),
    representative_name:   r('provider_confidential', 'responsible_professional', T3, 'apply_and_review', 'hold'),
    representative_title:  r('provider_confidential', 'responsible_professional', T3, 'apply_and_review', 'hold'),
    insurance_provider:    r('provider_confidential', 'insurance', T3, 'apply_and_review', 'hold'),
    insurance_type:        r('provider_confidential', 'insurance', T3, 'apply_and_review', 'hold'),
    insurance_valid_until: r('provider_confidential', 'insurance', T3, 'apply_and_review', 'hold'),

    // Leistung — provider_services. Preis, Umfang, Lieferzeit: §18 "before
    // effective date". Freitext laesst sich nicht als "guenstiger" bewerten
    // und wartet deshalb auch in `direction`.
    price_min:                r('provider_services', 'pricing', PLANNED, 'hold', 'hold', 'lower_is_better'),
    price_max:                r('provider_services', 'pricing', PLANNED, 'hold', 'hold', 'lower_is_better'),
    pricing_model:            r('provider_services', 'pricing', PLANNED, 'hold', 'hold'),
    currency:                 r('provider_services', 'pricing', PLANNED, 'hold', 'hold'),
    pricing_basis:            r('provider_services', 'pricing', PLANNED, 'hold', 'hold'),
    min_engagement:           r('provider_services', 'pricing', PLANNED, 'hold', 'hold'),
    additional_costs:         r('provider_services', 'pricing', PLANNED, 'hold', 'hold'),
    deliverables:             r('provider_services', 'scope', PLANNED, 'hold', 'hold'),
    exclusions:               r('provider_services', 'scope', PLANNED, 'hold', 'hold'),
    prerequisites:            r('provider_services', 'scope', PLANNED, 'hold', 'hold'),
    required_user_documents:  r('provider_services', 'scope', PLANNED, 'hold', 'hold'),
    completion_days_estimate: r('provider_services', 'timeline', PLANNED, 'hold', 'hold', 'lower_is_better'),
    uses_subcontractors:      r('provider_services', 'subcontracting', PLANNED, 'hold', 'hold'),
    response_time_hours:      r('provider_services', 'support', T3, 'apply_and_review', 'hold', 'lower_is_better'),
    service_name:             r('provider_services', 'services', T3, 'apply_and_review', 'hold'),
    description:              r('provider_services', 'services', T3, 'apply_and_review', 'hold'),
    responsible_role:         r('provider_services', 'responsible_professional', T3, 'apply_and_review', 'hold'),
    supervising_professional: r('provider_services', 'responsible_professional', T3, 'apply_and_review', 'hold'),
    business_models:          r('provider_services', 'services', T3, 'apply_and_review', 'hold'),
    industries:               r('provider_services', 'services', T3, 'apply_and_review', 'hold'),
    company_size_bands:       r('provider_services', 'services', T3, 'apply_and_review', 'hold'),
    // Vorschlaege fuer die Schlagworte — freigegeben wird ueber
    // approved_synonyms (§11.1), nicht hier. Auslastung schuetzt Nutzer.
    provider_keywords:        r('provider_services', 'services', T3, 'apply', 'apply'),
    capacity_status:          r('provider_services', 'capacity', T3, 'apply', 'apply'),
};

/** Aendert sich mit diesen Feldern die Grundlage des Preises, ist "niedriger"
 *  kein Vergleich mehr — dann wartet auch eine scheinbare Senkung. */
const PRICE_BASIS = ['currency', 'pricing_model', 'pricing_basis'] as const;

export function same(a: unknown, b: unknown): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export interface ClassifiedField { field: string; old: unknown; new: unknown; changeType: string; deadline: DeadlineClass }
export interface Classification {
    /** sofort schreiben (apply + apply_and_review) */
    write: Record<string, unknown>;
    /** sofort geschrieben, aber pruefpflichtig */
    review: ClassifiedField[];
    /** nicht geschrieben, wartet auf Freigabe */
    held: ClassifiedField[];
}

/**
 * Teilt einen Patch auf. `current` ist die Zeile, wie sie gerade live ist;
 * unveraenderte Felder fallen heraus (ein Speichern ohne Aenderung legt
 * keinen Vorgang an). `controlled=false` heisst: alles sofort, wie bisher.
 */
export function classify(patch: Record<string, unknown>, current: Record<string, any> | null, controlled: boolean, policy: Policy = CHANGE_POLICY): Classification {
    const out: Classification = { write: {}, review: [], held: [] };
    const basisChanges = PRICE_BASIS.some((k) => k in patch && !same(patch[k], current?.[k]));
    for (const [field, value] of Object.entries(patch)) {
        const old = current?.[field] ?? null;
        if (same(value, old)) continue;
        const rule = RULES[field];
        if (!controlled || !rule) { out.write[field] = value; continue; }
        let effect = rule[policy];
        if (effect === 'lower_is_better') {
            const better = !basisChanges && typeof old === 'number' && typeof value === 'number' && value <= old;
            effect = better ? 'apply_and_review' : 'hold';
        }
        const entry: ClassifiedField = { field, old, new: value, changeType: rule.changeType, deadline: rule.deadline };
        if (effect === 'hold') out.held.push(entry);
        else {
            out.write[field] = value;
            if (effect === 'apply_and_review') out.review.push(entry);
        }
    }
    return out;
}

/** Ein Vorgang je Wirkung und Speichern — so entscheidet das Pruefteam eine
 *  Preisspanne als Ganzes und nie Untergrenze und Obergrenze getrennt. */
export function changeRow(providerKey: string, serviceId: string | null, fields: ClassifiedField[], effect: 'held' | 'applied', providerNote: string | null = null) {
    const types = Array.from(new Set(fields.map((f) => f.changeType)));
    const deadline: DeadlineClass = fields.some((f) => f.deadline === 'before_effective_date') ? 'before_effective_date' : 'within_3_business_days';
    const now = new Date().toISOString();
    return {
        provider_key: providerKey,
        service_id: serviceId,
        change_type: types.join(','),
        field_path: fields.map((f) => f.field).join(','),
        old_value: Object.fromEntries(fields.map((f) => [f.field, f.old])),
        new_value: Object.fromEntries(fields.map((f) => [f.field, f.new])),
        deadline_class: deadline,
        effect,
        status: 'submitted',
        applied_at: effect === 'applied' ? now : null,
        provider_note: providerNote,
        submitted_at: now,
    };
}

// ─── Wesentliche Ereignisse (§18, 24 Stunden) ────────────────────────────────

export const MATERIAL_EVENTS = [
    'licence_restricted', 'authority_lost', 'insurance_lost', 'security_incident',
    'insolvency_or_closure', 'booking_unfulfillable', 'integrity_concern', 'account_compromised',
] as const;
export type MaterialEvent = typeof MATERIAL_EVENTS[number];
