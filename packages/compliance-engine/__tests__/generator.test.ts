import { describe, it, expect } from 'vitest';
import { generateRelevantSubdomains, aggregateCountryRiskProfiles } from '../generator';
import { IndustryType, BusinessModel } from '../business-modifier';

describe('Compliance Engine Generator', () => {
    it('1) DE + ECOMMERCE + MARKETPLACE_SELLER prioritizes VAT/EPR-like domains (TAX/PRODUCT)', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            industry: IndustryType.GENERIC_ECOMMERCE,
            businessModel: BusinessModel.MARKETPLACE_SELLER
        });

        // Check if TAX and PRODUCT IDs are in results
        const resultIds = results.map(r => r.id);
        expect(resultIds).toContain('tax-vat-registration');
        expect(resultIds).toContain('prod-epr');
    });

    it('2) US + SAAS + SAAS_SUBSCRIPTION prioritizes DATA and TAX', () => {
        const results = generateRelevantSubdomains({
            countries: ['US'],
            industry: IndustryType.SAAS,
            businessModel: BusinessModel.SAAS_SUBSCRIPTION
        });

        const resultIds = results.map(r => r.id);
        expect(resultIds).toContain('data-privacy');
        expect(resultIds).toContain('tax-vat-registration');
    });

    it('3) DE + FR aggregation surfaces EU-relevant domains based on sum-aggregation rules', () => {
        const aggregated = aggregateCountryRiskProfiles(['DE', 'FR']);
        // DE(9) + FR(8) = 17 for TAX, DE(8) + FR(9) = 17 for PRODUCT
        expect(aggregated.domainWeights.TAX).toBe(17);
        expect(aggregated.domainWeights.PRODUCT).toBe(17);

        // Compare against single country
        const deProfile = aggregateCountryRiskProfiles(['DE']);
        expect(aggregated.domainWeights.TAX).toBeGreaterThan(deProfile.domainWeights.TAX);
    });

    it('4) HEALTH industry strictly increases the weighting of MARKETING', () => {
        // Generate without health
        const noHealth = generateRelevantSubdomains({
            countries: ['US'],
            businessModel: BusinessModel.DTC
        });

        // Generate with health
        const withHealth = generateRelevantSubdomains({
            countries: ['US'],
            industry: IndustryType.HEALTH,
            businessModel: BusinessModel.DTC
        });

        // We verify Health brings in Marketing (mktg-health-claims)
        expect(noHealth.map(r => r.id)).not.toContain('mktg-health-claims');
        expect(withHealth.map(r => r.id)).toContain('mktg-health-claims');
    });

    it('5) Aggregating multiple countries asserts maximum strictness score', () => {
        // DE strictness = 9, US = 6. Max should be 9.
        const aggregated = aggregateCountryRiskProfiles(['DE', 'US']);
        expect(aggregated.strictnessScore).toBe(9);
    });
});
