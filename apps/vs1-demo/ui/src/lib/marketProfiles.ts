import {
  ComplianceDomain,
  CountryRiskMatrix,
  DomainTemplateLibrary,
  ObligationEnrichmentMap,
  severityFromRiskWeight,
  type CountryCode,
  type ObligationEnrichment,
  type ObligationSeverity,
} from '@complihub/compliance-engine';
import { DOMAINS, type DomainSlug } from './domains';

// ─── Market profiles · derived, never authored ───────────────────────────────
// Everything a country page shows comes out of the compliance engine: the risk
// matrix for how heavily a domain weighs in that market, and the obligation
// enrichment map for the statute behind each duty, its cadence and its lead
// time. Nothing here is written by hand.
//
// That constraint is the point. A country knowledge base is only worth having
// if every line traces to something verifiable — the enrichment entries were
// checked against the national statutes and EUR-Lex when they were written, so
// rendering them is safe in a way that fresh editorial prose would not be.
//
// The consequence is honest under-coverage: a market shows the duties the
// engine actually carries for it, and no more. DE carries nine, TR four. The
// page says so rather than padding the gap.

/** The markets the engine has a risk profile for. */
export const MARKET_CODES = Object.keys(CountryRiskMatrix) as CountryCode[];

// The engine's domains and the product's eight do not line up one to one, so
// the mapping happens at two levels.
//
// Engine PRODUCT covers both packaging/EPR and product safety, which the
// product splits into two domains — so it maps to BOTH slugs, and the split is
// resolved per subdomain below. Engine ONGOING_MONITORING holds exactly one
// subdomain, KYB, whose source is the money-laundering act and the beneficial-
// owner register: that is Corporate & Structure, not Product Compliance.
const DOMAIN_TO_SLUGS: Record<ComplianceDomain, DomainSlug[]> = {
  [ComplianceDomain.TAX]: ['tax-vat'],
  [ComplianceDomain.PRODUCT]: ['product-packaging', 'product-compliance'],
  [ComplianceDomain.DATA]: ['data-privacy'],
  [ComplianceDomain.MARKETING]: ['marketing-seo'],
  [ComplianceDomain.CORPORATE]: ['corporate-structure'],
  [ComplianceDomain.ONGOING_MONITORING]: ['corporate-structure'],
  [ComplianceDomain.LOGISTICS]: ['logistics-customs'],
  [ComplianceDomain.LEGAL]: ['legal-advisory'],
};

/** Subdomains whose slug cannot be read off their engine domain. */
const SUBDOMAIN_SLUG_OVERRIDE: Record<string, DomainSlug> = {
  'prod-safety': 'product-compliance',   // CE / GPSR, not packaging
  'monitor-kyb': 'corporate-structure',  // GwG + Transparenzregister
};

function slugForSubdomain(subdomainId: string, domain: ComplianceDomain): DomainSlug {
  return SUBDOMAIN_SLUG_OVERRIDE[subdomainId] ?? DOMAIN_TO_SLUGS[domain][0];
}

/** Subdomain id → the domain it belongs to, built once from the template library. */
const SUBDOMAIN_DOMAIN: Record<string, ComplianceDomain> = (() => {
  const out: Record<string, ComplianceDomain> = {};
  for (const [domain, subs] of Object.entries(DomainTemplateLibrary)) {
    for (const sub of subs) out[sub.id] = domain as ComplianceDomain;
  }
  return out;
})();

/** Subdomain id → its English label and CELEX id, straight from the library. */
const SUBDOMAIN_META: Record<string, { label: string; celex?: string; riskWeight: number }> = (() => {
  const out: Record<string, { label: string; celex?: string; riskWeight: number }> = {};
  for (const subs of Object.values(DomainTemplateLibrary)) {
    for (const sub of subs) out[sub.id] = { label: sub.label, celex: sub.celex, riskWeight: sub.riskWeight };
  }
  return out;
})();

export interface MarketObligation {
  subdomainId: string;
  /** Canonical English label from the engine — the UI translates the DOMAIN, not this. */
  label: string;
  domainSlug: DomainSlug;
  /** The national statute or instrument. A proper noun: never translated. */
  source: string;
  /** Filing cadence as the enrichment map states it, e.g. "Quarterly". */
  due: string;
  dueDays?: number;
  /** Official text on EUR-Lex, when the subdomain carries a CELEX id. */
  eurLexUrl?: string;
  /** Human penalty phrasing as the national entry states it. */
  penalty: string;
  /** Upper bound in EUR, where the entry names one. */
  penaltyMaxEur?: number;
  /** From the subdomain's riskWeight — the market page tints by it. */
  severity: ObligationSeverity;
}

/**
 * A compliance area this market has NO national source for, and what that
 * actually means. `scope: 'eu'` entries are deliberately absent: an EU
 * Regulation applies directly and identically here, so there is nothing
 * missing — calling it a gap is the misreading this type exists to prevent.
 */
export interface MarketCoverageGap {
  domainSlug: DomainSlug;
  subdomainId: string;
  label: string;
  /** The EU-level entry that stands in, or null where there is no source at all. */
  source: string | null;
  kind: 'national-pending' | 'placeholder';
}

export interface MarketWeight {
  domainSlug: DomainSlug;
  weight: number;
}

export interface MarketProfile {
  code: CountryCode;
  enforcementIntensity: number;
  strictnessScore: number;
  /** Domains sorted by how heavily this market weighs them, strongest first. */
  weights: MarketWeight[];
  /** Duties for which the engine holds a source specific to this market. */
  obligations: MarketObligation[];
  /** Obligations grouped by domain, in canonical domain order. */
  byDomain: { domainSlug: DomainSlug; items: MarketObligation[] }[];
  /**
   * Duties with no national source here that genuinely have one to hold.
   * EU Regulations are excluded by construction — see MarketCoverageGap.
   */
  gaps: MarketCoverageGap[];
  /** Obligations grouped by filing cadence, most frequent first. The market
   *  page's calendar reads this: a market is planned against a calendar, not
   *  area by area. Empty groups are absent, never rendered as a blank column. */
  byCadence: { due: string; items: MarketObligation[] }[];
  /** Sum of the stated upper bounds. A ceiling, never a forecast. */
  exposureEur: number;
  /** The single heaviest penalty here, and the duty that carries it. */
  heaviest: MarketObligation | null;
  /** The duty whose next filing falls due soonest. */
  soonest: MarketObligation | null;
}

// Most frequent first: that is the order the operational burden actually
// falls in, and the order the canvas draws. Anything the engine adds later
// that is not in this list sorts after it, alphabetically, rather than
// vanishing.
const CADENCE_ORDER = ['Monthly', 'Quarterly', 'Annual', 'Ongoing', 'One-off'];

export function isMarketCode(code: string): code is CountryCode {
  return (MARKET_CODES as string[]).includes(code.toUpperCase());
}

export function getMarketProfile(code: CountryCode): MarketProfile {
  const risk = CountryRiskMatrix[code];

  // Two engine domains can land on the same slug (CORPORATE and
  // ONGOING_MONITORING both mean Corporate & Structure) — take the heavier
  // rather than letting whichever key comes last silently win.
  const weightBySlug = new Map<DomainSlug, number>();
  for (const [domain, weight] of Object.entries(risk.domainWeights)) {
    for (const slug of DOMAIN_TO_SLUGS[domain as ComplianceDomain]) {
      weightBySlug.set(slug, Math.max(weightBySlug.get(slug) ?? 0, weight));
    }
  }
  const weights = [...weightBySlug.entries()]
    .map(([domainSlug, weight]) => ({ domainSlug, weight }))
    .sort((a, b) => b.weight - a.weight);

  const obligations: MarketObligation[] = [];
  for (const [subdomainId, byCountry] of Object.entries(ObligationEnrichmentMap)) {
    const entry = (byCountry as Record<string, ObligationEnrichment | undefined>)[code];
    if (!entry) continue; // no market-specific source → not claimed for this market
    const domain = SUBDOMAIN_DOMAIN[subdomainId];
    if (!domain) continue;
    const meta = SUBDOMAIN_META[subdomainId];
    obligations.push({
      subdomainId,
      label: meta?.label ?? subdomainId,
      domainSlug: slugForSubdomain(subdomainId, domain),
      source: entry.source,
      due: entry.due,
      dueDays: entry.dueDays,
      penalty: entry.penalty,
      penaltyMaxEur: entry.penaltyMaxEur,
      severity: severityFromRiskWeight(meta?.riskWeight ?? 5),
      eurLexUrl: meta?.celex
        ? `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${meta.celex}`
        : undefined,
    });
  }

  // Group in canonical domain order so every market page reads the same way.
  const byDomain = DOMAINS.map((d) => ({
    domainSlug: d.slug,
    items: obligations.filter((o) => o.domainSlug === d.slug),
  })).filter((g) => g.items.length > 0);

  // The coverage gaps. A duty counts only when the engine holds no entry for
  // this market AND the fallback says a national text exists to hold — which
  // is the whole distinction: 16 of the 21 defaults are EU Regulations that
  // apply directly, and reporting those as gaps was reporting the law itself
  // as a hole in our data.
  const gaps: MarketCoverageGap[] = [];
  for (const [subdomainId, byCountry] of Object.entries(ObligationEnrichmentMap)) {
    const map = byCountry as Record<string, ObligationEnrichment | undefined>;
    if (map[code]) continue;
    const fallback = map.default;
    const scope = fallback?.scope ?? 'eu';
    if (scope === 'eu') continue;
    const domain = SUBDOMAIN_DOMAIN[subdomainId];
    if (!domain) continue;
    const meta = SUBDOMAIN_META[subdomainId];
    gaps.push({
      domainSlug: slugForSubdomain(subdomainId, domain),
      subdomainId,
      label: meta?.label ?? subdomainId,
      // A placeholder is not a source, so it is not handed on as one.
      source: scope === 'placeholder' ? null : (fallback?.source ?? null),
      kind: scope,
    });
  }

  const byCadence = [...new Set(obligations.map((o) => o.due))]
    .sort((a, b) => {
      const ia = CADENCE_ORDER.indexOf(a);
      const ib = CADENCE_ORDER.indexOf(b);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.localeCompare(b);
    })
    .map((due) => ({ due, items: obligations.filter((o) => o.due === due) }));

  const withCap = obligations.filter((o) => (o.penaltyMaxEur ?? 0) > 0);
  const withLead = obligations.filter((o) => o.dueDays != null);

  return {
    code,
    enforcementIntensity: risk.enforcementIntensity,
    strictnessScore: risk.strictnessScore,
    weights,
    obligations,
    byDomain,
    gaps,
    byCadence,
    exposureEur: withCap.reduce((sum, o) => sum + (o.penaltyMaxEur as number), 0),
    heaviest:
      withCap.length === 0
        ? null
        : withCap.reduce((max, o) =>
            (o.penaltyMaxEur as number) > (max.penaltyMaxEur as number) ? o : max,
          ),
    soonest:
      withLead.length === 0
        ? null
        : withLead.reduce((min, o) => ((o.dueDays as number) < (min.dueDays as number) ? o : min)),
  };
}

/** Every market with its obligation count — for the index page. */
export function listMarkets(): {
  code: CountryCode;
  obligationCount: number;
  enforcementIntensity: number;
  /** Areas this market holds its own sources in, out of areasTotal. The hub
   *  card shows the pair so uneven coverage is stated, never papered over —
   *  the same rule that keeps the coverage note on the market page honest. */
  areasCovered: number;
  areasTotal: number;
}[] {
  return MARKET_CODES.map((code) => {
    const p = getMarketProfile(code);
    return {
      code,
      obligationCount: p.obligations.length,
      enforcementIntensity: p.enforcementIntensity,
      areasCovered: p.byDomain.length,
      areasTotal: p.weights.length,
    };
  }).sort((a, b) => b.obligationCount - a.obligationCount);
}
