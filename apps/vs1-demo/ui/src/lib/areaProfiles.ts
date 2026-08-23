import {
  ComplianceDomain,
  CountryRiskMatrix,
  DomainTemplateLibrary,
  ObligationEnrichmentMap,
  severityFromRiskWeight,
  type CountryCode,
  type ObligationSeverity,
} from '@complihub/compliance-engine';
import { DOMAINS, type DomainSlug } from './domains';
import { MARKET_CODES } from './marketProfiles';

// ─── Area profiles · the transpose of lib/marketProfiles ─────────────────────
// marketProfiles slices the engine by COUNTRY and groups by domain: "what does
// Germany demand, across all areas". This module slices the same engine by
// DOMAIN and groups by country: "what does EPR demand, across all markets".
//
// Same source, same constraint — nothing here is authored. The area pages show
// the duties the engine actually carries, with the statute behind each one, and
// say so where a market is thin rather than padding the gap.
//
// The one deliberate difference to marketProfiles: this module DOES surface the
// enrichment map's 'default' entries. A country page skipping them is right —
// "Germany requires X" must rest on a German source. An area page skipping them
// would be wrong: most of the PPWR packaging duties carry only an EU-level
// entry, so dropping them would render the packaging area nearly empty for
// every market. They are surfaced as EU-wide and labelled as such, never
// dressed up as a national source.

/** Engine domain → product slugs. Mirrors marketProfiles; PRODUCT splits in two. */
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

/** Which engine domains feed one product slug — the inverse of DOMAIN_TO_SLUGS. */
const SLUG_TO_DOMAINS: Record<DomainSlug, ComplianceDomain[]> = (() => {
  const out = {} as Record<DomainSlug, ComplianceDomain[]>;
  for (const d of DOMAINS) out[d.slug] = [];
  for (const [domain, slugs] of Object.entries(DOMAIN_TO_SLUGS)) {
    for (const slug of slugs) out[slug].push(domain as ComplianceDomain);
  }
  return out;
})();

export interface AreaSubdomain {
  id: string;
  /** Canonical English label from the engine. A statute name, never translated. */
  label: string;
  description: string;
  /** Baseline weight 1–10, before any market or business-model modifier. */
  riskWeight: number;
  severity: ObligationSeverity;
  /** Business models the engine considers in scope for this duty. */
  businessModels: string[];
  triggerTags: string[];
  eurLexUrl?: string;
  /** The Official Journal reference the eurLexUrl is built from, when there is one. */
  celex?: string;
}

export interface AreaObligation extends AreaSubdomain {
  /** The statute or instrument. A proper noun: never translated. */
  source: string;
  /** Human penalty phrasing, e.g. 'up to €50,000'. */
  penalty: string;
  penaltyMaxEur?: number;
  /** Cadence label as the enrichment map states it, e.g. 'Quarterly'. */
  due: string;
  dueDays?: number;
  /** ISO date from which the duty actually bites; absent = applicable today. */
  appliesFrom?: string;
  /** false = the engine holds no source for this market, the EU-level one is shown. */
  marketSpecific: boolean;
  /**
   * Only set when `marketSpecific` is false — how the EU-level entry that
   * stood in relates to national law. See ObligationEnrichment.scope: 'eu'
   * means there IS no national text and this is the applicable law, so the
   * fallback is not a gap; the other two mean it is.
   */
  scope?: 'eu' | 'national-pending' | 'placeholder';
}

export interface AreaMarketWeight {
  code: CountryCode;
  weight: number;
  /** How many market-specific duties the engine carries here for this area. */
  obligationCount: number;
}

export interface AreaProfile {
  slug: DomainSlug;
  /** Every subdomain the engine files under this area, heaviest first. */
  subdomains: AreaSubdomain[];
  /** Baseline severity of the area — its heaviest duty. */
  baselineWeight: number;
  severity: ObligationSeverity;
  /** This area's weight in every market the engine profiles, heaviest first. */
  marketWeights: AreaMarketWeight[];
  /** Union of the business models any of this area's duties applies to. */
  businessModels: string[];
}

function eurLex(celex?: string): string | undefined {
  return celex ? `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}` : undefined;
}

/** Subdomain ids belonging to one product slug, with their engine metadata. */
function subdomainsFor(slug: DomainSlug): AreaSubdomain[] {
  const out: AreaSubdomain[] = [];
  for (const domain of SLUG_TO_DOMAINS[slug]) {
    for (const sub of DomainTemplateLibrary[domain]) {
      // PRODUCT feeds two slugs and ONGOING_MONITORING shares one with
      // CORPORATE, so membership is decided per subdomain, not per domain.
      if (slugForSubdomain(sub.id, domain) !== slug) continue;
      out.push({
        id: sub.id,
        label: sub.label,
        description: sub.description,
        riskWeight: sub.riskWeight,
        severity: severityFromRiskWeight(sub.riskWeight),
        businessModels: sub.applicableBusinessModels,
        triggerTags: sub.triggerTags,
        eurLexUrl: eurLex(sub.celex),
        celex: sub.celex,
      });
    }
  }
  return out.sort((a, b) => b.riskWeight - a.riskWeight);
}

export function isAreaSlug(slug: string): slug is DomainSlug {
  return DOMAINS.some((d) => d.slug === slug);
}

export function getAreaProfile(slug: DomainSlug): AreaProfile {
  const subdomains = subdomainsFor(slug);

  const marketWeights: AreaMarketWeight[] = MARKET_CODES.map((code) => {
    const domainWeights = CountryRiskMatrix[code].domainWeights;
    // A slug can be fed by two engine domains (CORPORATE + ONGOING_MONITORING);
    // take the heavier, exactly as marketProfiles does in the other direction.
    const weight = SLUG_TO_DOMAINS[slug].reduce(
      (max, domain) => Math.max(max, domainWeights[domain] ?? 0),
      0,
    );
    const obligationCount = subdomains.filter(
      (s) => ObligationEnrichmentMap[s.id]?.[code],
    ).length;
    return { code, weight, obligationCount };
  }).sort((a, b) => b.weight - a.weight || a.code.localeCompare(b.code));

  const baselineWeight = subdomains.reduce((max, s) => Math.max(max, s.riskWeight), 0);

  const businessModels = [...new Set(subdomains.flatMap((s) => s.businessModels))].sort();

  return {
    slug,
    subdomains,
    baselineWeight,
    severity: severityFromRiskWeight(baselineWeight),
    marketWeights,
    businessModels,
  };
}

/**
 * The area's duties as they read for one market. Falls back to the enrichment
 * map's EU-level 'default' entry where the engine holds no national source, and
 * flags that with `marketSpecific: false` so the UI can say which it is showing.
 * A subdomain with neither is omitted — there is nothing verifiable to state.
 */
export function getAreaObligations(slug: DomainSlug, code: CountryCode | 'EU'): AreaObligation[] {
  const out: AreaObligation[] = [];
  for (const sub of subdomainsFor(slug)) {
    const byCountry = ObligationEnrichmentMap[sub.id];
    if (!byCountry) continue;
    const national = code === 'EU' ? undefined : byCountry[code];
    const entry = national ?? byCountry.default;
    if (!entry) continue;
    out.push({
      ...sub,
      source: entry.source,
      penalty: entry.penalty,
      penaltyMaxEur: entry.penaltyMaxEur,
      due: entry.due,
      dueDays: entry.dueDays,
      appliesFrom: entry.appliesFrom,
      marketSpecific: !!national,
      // A country override is national by definition, so scope only travels
      // with the fallback. Absent on a default is read as 'eu' — the shape
      // that existed before the field was widened.
      scope: national ? undefined : (entry.scope ?? 'eu'),
    });
  }
  return out;
}

/** Areas sorted by how heavily one market weighs them — drives the hub's risk grid. */
export function rankAreasForMarket(code: CountryCode | 'EU'): { slug: DomainSlug; weight: number }[] {
  // EU has no row in the risk matrix. Averaging the profiled markets is the
  // honest reading of "EU-wide" — no single member state stands in for the bloc.
  const ranked = DOMAINS.map((d) => {
    const profile = getAreaProfile(d.slug);
    const weight =
      code === 'EU'
        ? profile.marketWeights.reduce((sum, m) => sum + m.weight, 0) / profile.marketWeights.length
        : (profile.marketWeights.find((m) => m.code === code)?.weight ?? 0);
    return { slug: d.slug, weight };
  });
  return ranked.sort((a, b) => b.weight - a.weight);
}
