import { ComplianceDomain, DomainTemplateLibrary, ComplianceSubdomainTemplate, ObligationSeverity, severityFromRiskWeight } from './domain-schema.js';
import { CountryCode, CountryRiskProfile, getCountryRiskProfile } from './country-profile.js';
import { calculateBusinessModifier, IndustryType, BusinessModel } from './business-modifier.js';
import { resolveEnrichment } from './obligation-enrichment.js';

export interface GeneratorContext {
    countries: CountryCode[];
    industry?: IndustryType;
    businessModel?: BusinessModel;
    /** Domains the user explicitly selected (wizard step 3). Always included
     *  on top of the score-ranked selection; laws from them are 'confirmed'. */
    focusDomains?: ComplianceDomain[];
}

export interface EnrichedSubdomain {
    id: string;
    label: string;
    description: string;
    domain: ComplianceDomain;
    severity: ObligationSeverity;
    riskWeight: number;
    /** Requested countries the obligation was evaluated for; empty = EU-wide. */
    markets: CountryCode[];
    /** true when the user explicitly picked this domain in the wizard. */
    focus: boolean;
    source?: string;
    penalty?: string;
    penaltyMaxEur?: number;
    due?: string;
    dueDays?: number;
    /** CELEX id of the underlying EU act (verified against EUR-Lex). */
    celex?: string;
    /** Deep link to the authoritative, always-current text on EUR-Lex. */
    sourceUrl?: string;
}

/** EUR-Lex permalink for a CELEX id. The language segment only switches the
 *  interface/translation shown — the act itself is the same document. */
export function eurLexUrl(celex: string, lang = 'EN'): string {
    return `https://eur-lex.europa.eu/legal-content/${lang.toUpperCase()}/TXT/?uri=CELEX:${celex}`;
}

export function aggregateCountryRiskProfiles(countries: CountryCode[]): CountryRiskProfile {
    if (countries.length === 0) {
        throw new Error('At least one country must be provided.');
    }

    const baseProfiles = countries.map(getCountryRiskProfile);

    const aggregatedWeights: Record<ComplianceDomain, number> = {
        [ComplianceDomain.TAX]: 0,
        [ComplianceDomain.PRODUCT]: 0,
        [ComplianceDomain.MARKETING]: 0,
        [ComplianceDomain.DATA]: 0,
        [ComplianceDomain.CORPORATE]: 0,
        [ComplianceDomain.ONGOING_MONITORING]: 0,
        [ComplianceDomain.LOGISTICS]: 0,
        [ComplianceDomain.LEGAL]: 0
    };

    let maxStrictness = 0;
    let maxEnforcement = 0;

    for (const profile of baseProfiles) {
        // Aggregation Rules: Weights are SUM, Strictness/Enforcement are MAX
        for (const domain in aggregatedWeights) {
            aggregatedWeights[domain as ComplianceDomain] += profile.domainWeights[domain as ComplianceDomain];
        }
        maxStrictness = Math.max(maxStrictness, profile.strictnessScore);
        maxEnforcement = Math.max(maxEnforcement, profile.enforcementIntensity);
    }

    return {
        domainWeights: aggregatedWeights,
        strictnessScore: maxStrictness,
        enforcementIntensity: maxEnforcement
    };
}

export function generateRelevantSubdomains(context: GeneratorContext): EnrichedSubdomain[] {
    // 1) Load/Aggregate country profiles
    const aggregatedProfile = aggregateCountryRiskProfiles(context.countries);

    // 2 & 3) Calculate weighted domain scores & apply industry modifiers
    const domainScores = Object.entries(aggregatedProfile.domainWeights).map(([domainStr, baseScore]) => {
        const domain = domainStr as ComplianceDomain;
        const modifier = calculateBusinessModifier(domain, context.industry, context.businessModel);
        return {
            domain,
            score: baseScore + modifier
        };
    });

    // 4) Sort domains by score descending, alphabetically on tie for determinism
    domainScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.domain.localeCompare(b.domain);
    });

    // 5) Domain selection: every explicitly requested focus domain, topped up
    //    with the best-scored remaining domains to at least 4 in score order.
    const focus = new Set(context.focusDomains ?? []);
    const selected: ComplianceDomain[] = domainScores
        .filter(ds => focus.has(ds.domain))
        .map(ds => ds.domain);
    for (const ds of domainScores) {
        if (selected.length >= 4) break;
        if (!focus.has(ds.domain)) selected.push(ds.domain);
    }

    // 6) Select subdomains based on domain + businessModel, enriched with the
    //    editorial legal metadata (severity, statute, penalty, deadline).
    const results: EnrichedSubdomain[] = [];

    for (const domain of selected) {
        const templates = DomainTemplateLibrary[domain];
        if (!templates) continue;

        for (const template of templates) {
            // Filter by business model if one is specified — but never filter
            // away a domain the user explicitly asked for.
            if (!focus.has(domain) && context.businessModel && !template.applicableBusinessModels.includes(context.businessModel)) {
                continue;
            }
            const enrichment = resolveEnrichment(template.id, context.countries);
            results.push({
                id: template.id,
                label: template.label,
                description: template.description,
                domain,
                severity: severityFromRiskWeight(template.riskWeight),
                riskWeight: template.riskWeight,
                markets: enrichment?.scope === 'eu' ? [] : context.countries,
                focus: focus.has(domain),
                source: enrichment?.source,
                penalty: enrichment?.penalty,
                penaltyMaxEur: enrichment?.penaltyMaxEur,
                due: enrichment?.due,
                dueDays: enrichment?.dueDays,
                celex: template.celex,
                sourceUrl: template.celex ? eurLexUrl(template.celex) : undefined,
            });
        }
    }

    // Focus-domain obligations first, then by risk weight — the table reads
    // top-down as "what you asked about, worst first".
    results.sort((a, b) => {
        if (a.focus !== b.focus) return a.focus ? -1 : 1;
        if (b.riskWeight !== a.riskWeight) return b.riskWeight - a.riskWeight;
        return a.id.localeCompare(b.id);
    });

    return results;
}
