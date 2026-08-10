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

describe('Obligations enrichment (final-8 coverage)', () => {
    it('6) IT/ES/NL/TR profiles resolve instead of throwing', () => {
        for (const c of ['IT', 'ES', 'NL', 'TR'] as const) {
            expect(() => generateRelevantSubdomains({ countries: [c] })).not.toThrow();
        }
    });

    it('7) focusDomains are always included and their laws flagged focus:true', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            businessModel: BusinessModel.SAAS_SUBSCRIPTION,
            focusDomains: ['LOGISTICS' as any, 'LEGAL' as any],
        });
        const ids = results.map(r => r.id);
        // LOGISTICS templates are physical-goods only, but an explicit focus
        // domain bypasses the business-model filter.
        expect(ids).toContain('log-eori');
        expect(ids).toContain('legal-consumer-terms');
        expect(results.find(r => r.id === 'log-eori')?.focus).toBe(true);
        // Focus laws sort before non-focus laws.
        const firstNonFocus = results.findIndex(r => !r.focus);
        expect(results.slice(0, firstNonFocus).every(r => r.focus)).toBe(true);
    });

    it('8) laws carry severity, source, penalty and cadence; country override wins', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            industry: IndustryType.GENERIC_ECOMMERCE,
            businessModel: BusinessModel.DTC,
        });
        const vat = results.find(r => r.id === 'tax-vat-registration');
        expect(vat?.severity).toBe('high');
        expect(vat?.source).toContain('UStG');
        expect(vat?.penalty).toBeTruthy();
        expect(vat?.due).toBe('Quarterly');
        // EU-scoped obligations report an empty markets list (= EU-wide).
        const privacy = results.find(r => r.id === 'data-privacy');
        expect(privacy?.markets).toEqual([]);
    });
});

describe('EU legal basis (CELEX → EUR-Lex)', () => {
    it('9) obligations resting on EU law carry a verified CELEX + permalink', () => {
        const r = generateRelevantSubdomains({ countries: ['DE'], focusDomains: ['LOGISTICS' as any] });
        const eori = r.find(x => x.id === 'log-eori');
        expect(eori?.celex).toBe('32013R0952');           // Union Customs Code
        expect(eori?.sourceUrl).toBe('https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32013R0952');
    });

    it('11) PPWR packaging conformity surfaces for physical-goods sellers, EU-wide', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            industry: IndustryType.GENERIC_ECOMMERCE,
            businessModel: BusinessModel.DTC,
        });
        const ppwr = results.find(r => r.id === 'prod-packaging-conformity');
        expect(ppwr?.severity).toBe('high');
        expect(ppwr?.celex).toBe('32025R0040');
        // A Regulation applies market-independently → no per-country markets.
        expect(ppwr?.markets).toEqual([]);
        // The start date is a structured field, not prose in the source string.
        expect(ppwr?.appliesFrom).toBe('2026-08-12');
        expect(ppwr?.source).not.toContain('2026');
        // The national registration layer stays a separate, DE-specific row.
        expect(results.find(r => r.id === 'prod-epr')?.source).toContain('VerpackG');
    });

    it('13) obligations already in force carry no appliesFrom', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            industry: IndustryType.GENERIC_ECOMMERCE,
            businessModel: BusinessModel.DTC,
        });
        // Only staged/not-yet-applicable duties set the field — everything else
        // must stay undefined so the UI never renders a bogus countdown.
        expect(results.find(r => r.id === 'tax-vat-registration')?.appliesFrom).toBeUndefined();
        expect(results.filter(r => r.appliesFrom).map(r => r.id)).toEqual(['prod-packaging-conformity']);
    });

    it('12) SaaS sellers do not get a packaging obligation', () => {
        const results = generateRelevantSubdomains({
            countries: ['DE'],
            industry: IndustryType.SAAS,
            businessModel: BusinessModel.SAAS_SUBSCRIPTION,
        });
        expect(results.map(r => r.id)).not.toContain('prod-packaging-conformity');
    });

    it('10) purely national obligations carry no CELEX rather than a fabricated one', () => {
        const r = generateRelevantSubdomains({ countries: ['DE'], focusDomains: ['CORPORATE' as any] });
        const reg = r.find(x => x.id === 'corp-registration');
        expect(reg).toBeDefined();
        expect(reg?.celex).toBeUndefined();
        expect(reg?.sourceUrl).toBeUndefined();
    });
});
