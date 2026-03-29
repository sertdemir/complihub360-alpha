import { ComplianceDomain, DomainTemplateLibrary, ComplianceSubdomainTemplate } from './domain-schema.js';
import { CountryCode, CountryRiskProfile, getCountryRiskProfile } from './country-profile.js';
import { calculateBusinessModifier, IndustryType, BusinessModel } from './business-modifier.js';

export interface GeneratorContext {
    countries: CountryCode[];
    industry?: IndustryType;
    businessModel?: BusinessModel;
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
        [ComplianceDomain.ONGOING_MONITORING]: 0
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

export function generateRelevantSubdomains(context: GeneratorContext): { id: string; label: string; description: string }[] {
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

    // 5) Take top 4 domains
    const topDomains = domainScores.slice(0, 4).map(ds => ds.domain);

    // 6) Select subdomains based on domain + businessModel + threshold
    // A minimum strictness threshold could apply before including subdomains with high risk.
    // For simplicity and determinism, we extract all templates from the top domains that 
    // match the business model (if defined), falling back to trigger tags.
    const results: { id: string; label: string; description: string }[] = [];

    for (const domain of topDomains) {
        const templates = DomainTemplateLibrary[domain];
        if (!templates) continue;

        for (const template of templates) {
            // Filter by business model if one is specified
            if (context.businessModel && !template.applicableBusinessModels.includes(context.businessModel)) {
                continue;
            }
            results.push({
                id: template.id,
                label: template.label,
                description: template.description
            });
        }
    }

    return results;
}
