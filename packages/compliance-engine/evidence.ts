
// ─── Evidence: worauf eine Pflicht in der Risk Map beruht (Wizard-Audit F1) ───
// Bis 23.10.2026 hiess "confirmed": der Nutzer hat den Bereich angeklickt.
// Ein Klick auf "Product Compliance" bestaetigte so auch EPR- und PPWR-Pflichten,
// ohne dass irgendeine Angabe sie trug ("We do not create needs. We identify
// them." — KN-BRAND-001). Jetzt entscheiden Fakten aus den Antworten:
//
//   confirmed  alle Fakten, die der Ausloeser verlangt, sind bekannt und wahr,
//              und keine offene Frage entscheidet mehr
//   likely     mindestens ein Fakt spricht dafuer; ein fehlender Fakt oder die
//              offene Frage entscheidet noch
//   open       nichts in den Antworten zeigt bisher, dass die Pflicht greift
//
// Die Regeln sind deterministisch und redaktionell — kein Modell, keine
// Rechtsauskunft. Sie bestaetigen nur, was eine Angabe woertlich traegt; im
// Zweifel bleibt die Pflicht "likely" oder "open". Aenderungen an der Tabelle
// unten gehoeren in eine fachliche Pruefung, nicht in einen Nebensatz.

/** Die 27 EU-Mitgliedstaaten (ISO 3166-1). Bewusst nicht EU_MEMBER_STATES aus
 *  country-profile: das kennt nur die fuenf Laender mit Engine-Profil, ein
 *  Markt wie AT oder BE ist trotzdem ein EU-Markt. */
const EU27 = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);

/** Was die Antworten ueber das Geschaeft aussagen koennen. */
export type Fact =
  | 'consumer_sales'      // verkauft an Verbraucher
  | 'business_sales'      // verkauft an Unternehmen
  | 'online_sales'        // verkauft ueber eigene Website oder App
  | 'physical_goods'      // verkauft physische Waren
  | 'eu_market'           // mindestens ein Zielmarkt liegt in der EU
  | 'electronics'         // Elektro- oder Elektronikgeraete im Sortiment
  | 'batteries'           // Batterien, einzeln oder in Geraeten
  | 'health_claims'       // Werbeaussagen zu Gesundheit
  | 'marketplace_operator'// betreibt selbst einen Marktplatz
  | 'established_in_market'; // Unternehmen sitzt in einem der Zielmaerkte

/** Die eine Angabe, die eine "likely"-Pflicht noch entscheidet. Schluessel,
 *  keine Texte: die Oberflaeche fuehrt die Fragen in ihren Sprachdateien. */
export type DecidingQuestion =
  | 'establishment'
  | 'packaging_role'
  | 'tracking'
  | 'data_location'
  | 'intra_eu_volume'
  | 'substances'
  | 'contract_scope'
  | 'cross_border_shipping';

/** Bekannt wahr (true), bekannt falsch (false), unbekannt (fehlt). */
export type Facts = Partial<Record<Fact, boolean>>;

export type EvidenceState = 'confirmed' | 'likely' | 'open';

export interface Evidence {
  state: EvidenceState;
  /** Fakten, die bekannt und wahr sind und den Ausloeser tragen. */
  supports: Fact[];
  /** Was noch entscheidet: ein fehlender Fakt oder die offene Frage. */
  decides: Array<Fact | DecidingQuestion>;
}

interface Rule {
  /** Alle muessen bekannt und wahr sein, damit die Pflicht bestaetigt ist. */
  requires: Fact[];
  /** Eine Frage, die auch bei erfuellten Fakten noch entscheidet. */
  question?: DecidingQuestion;
}

// Je Vorlage aus DomainTemplateLibrary. Eine Vorlage ohne Eintrag ist "open".
export const EVIDENCE_RULES: Record<string, Rule> = {
  'tax-vat-registration': { requires: ['online_sales'], question: 'establishment' },
  'tax-corporate': { requires: ['established_in_market'] },
  'prod-epr': { requires: ['physical_goods', 'consumer_sales'], question: 'packaging_role' },
  'prod-packaging-conformity': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-packaging-recycled-content': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-packaging-recyclability': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-packaging-empty-space': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-packaging-format-bans': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-packaging-reuse-targets': { requires: ['physical_goods', 'eu_market'], question: 'packaging_role' },
  'prod-safety': { requires: ['physical_goods', 'consumer_sales', 'eu_market'] },
  'mktg-consent': { requires: ['online_sales'], question: 'tracking' },
  'mktg-health-claims': { requires: ['health_claims'] },
  'data-privacy': { requires: ['online_sales', 'consumer_sales', 'eu_market'] },
  'data-hosting': { requires: ['online_sales'], question: 'data_location' },
  'corp-registration': { requires: ['established_in_market'] },
  'monitor-kyb': { requires: ['marketplace_operator'] },
  'log-eori': { requires: ['physical_goods'], question: 'cross_border_shipping' },
  'log-customs-classification': { requires: ['physical_goods'], question: 'cross_border_shipping' },
  'log-intrastat': { requires: ['physical_goods', 'eu_market'], question: 'intra_eu_volume' },
  'env-weee-registration': { requires: ['electronics'] },
  'env-batteries-epr': { requires: ['batteries'] },
  'env-reach-substances': { requires: ['physical_goods'], question: 'substances' },
  'legal-consumer-terms': { requires: ['online_sales', 'consumer_sales'] },
  'legal-commercial-contracts': { requires: ['business_sales'], question: 'contract_scope' },
};

/** Fakten, die nur den Geltungsbereich abgrenzen und allein nichts belegen. */
const SCOPE_FACTS = new Set<Fact>(['eu_market']);

export function evaluateEvidence(templateId: string, facts: Facts): Evidence {
  const rule = EVIDENCE_RULES[templateId];
  if (!rule) return { state: 'open', supports: [], decides: [] };
  const supports = rule.requires.filter((f) => facts[f] === true);
  const missing = rule.requires.filter((f) => facts[f] !== true);
  const decides: Array<Fact | DecidingQuestion> = [...missing, ...(rule.question ? [rule.question] : [])];
  // Ein bekannt falscher Fakt schliesst die Pflicht nicht aus der Karte aus —
  // ausblenden waere eine Rechtsaussage, die die Regel nicht treffen kann.
  // Sie bleibt "open", damit niemand sie fuer erledigt haelt.
  if (rule.requires.some((f) => facts[f] === false)) return { state: 'open', supports, decides };
  // Ein Markt allein ist Rahmen, kein Beleg: "verkauft in die EU" macht keine
  // Verpackungs- oder Datenschutzpflicht wahrscheinlich, solange nichts ueber
  // das Geschaeft bekannt ist.
  if (!supports.some((f) => !SCOPE_FACTS.has(f))) return { state: 'open', supports, decides };
  if (missing.length === 0 && !rule.question) return { state: 'confirmed', supports, decides: [] };
  return { state: 'likely', supports, decides };
}

/** Fakten aus den Wizard-Antworten, so wie sie heute ankommen. Nur was die
 *  Karte woertlich sagt; alles andere bleibt unbekannt. Die Operations-Karten
 *  (AnimatedWizard) tragen ihre englische Kennung in `businessTypeNote`. */
export function factsFromAnswers(answers: {
  businessTypeNote?: unknown;
  markets?: unknown;
  country?: unknown;
} | null | undefined): Facts {
  const facts: Facts = {};
  if (!answers) return facts;
  const card = typeof answers.businessTypeNote === 'string' ? answers.businessTypeNote : '';
  switch (card) {
    // "Direct-to-consumer online sales"
    case 'D2C e-commerce':
      facts.consumer_sales = true;
      facts.online_sales = true;
      break;
    // "Sell to businesses or distributors"
    case 'B2B / wholesale':
      facts.business_sales = true;
      break;
    // "Software, no physical shipment"
    case 'SaaS / digital':
      facts.online_sales = true;
      facts.physical_goods = false;
      break;
    // "Mix of B2B and B2C channels"
    case 'Hybrid':
      facts.consumer_sales = true;
      facts.business_sales = true;
      break;
    // "Marketplace" ("You connect buyers + sellers") liest sich als Betreiber,
    // wird aber auch von Haendlern gewaehlt — bewusst kein Fakt (Audit S06).
    default:
      break;
  }
  const markets = [
    ...(Array.isArray(answers.markets) ? answers.markets : []),
    ...(typeof answers.country === 'string' && answers.country ? [answers.country] : []),
  ].map(String);
  if (markets.some((m) => EU27.has(m.toUpperCase()))) facts.eu_market = true;
  return facts;
}
