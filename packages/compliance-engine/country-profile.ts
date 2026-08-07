import { ComplianceDomain } from './domain-schema.js';

export type CountryCode = 'DE' | 'FR' | 'US' | 'UK' | 'IT' | 'ES' | 'NL' | 'TR';

export interface CountryRiskProfile {
    domainWeights: Record<ComplianceDomain, number>;
    enforcementIntensity: number; // 1-10 overall strictness
    strictnessScore: number;      // 1-10
}

export const CountryRiskMatrix: Record<CountryCode, CountryRiskProfile> = {
    DE: {
        domainWeights: {
            [ComplianceDomain.TAX]: 9,
            [ComplianceDomain.PRODUCT]: 8,
            [ComplianceDomain.MARKETING]: 7,
            [ComplianceDomain.DATA]: 10,
            [ComplianceDomain.CORPORATE]: 6,
            [ComplianceDomain.ONGOING_MONITORING]: 7,
            [ComplianceDomain.LOGISTICS]: 6,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 9,
        strictnessScore: 9
    },
    FR: {
        domainWeights: {
            [ComplianceDomain.TAX]: 8,
            [ComplianceDomain.PRODUCT]: 9,
            [ComplianceDomain.MARKETING]: 8,
            [ComplianceDomain.DATA]: 9,
            [ComplianceDomain.CORPORATE]: 7,
            [ComplianceDomain.ONGOING_MONITORING]: 6,
            [ComplianceDomain.LOGISTICS]: 6,
            [ComplianceDomain.LEGAL]: 6
        },
        enforcementIntensity: 8,
        strictnessScore: 8
    },
    US: {
        domainWeights: {
            [ComplianceDomain.TAX]: 7,
            [ComplianceDomain.PRODUCT]: 6,
            [ComplianceDomain.MARKETING]: 5,
            [ComplianceDomain.DATA]: 4,
            [ComplianceDomain.CORPORATE]: 8,
            [ComplianceDomain.ONGOING_MONITORING]: 9,
            [ComplianceDomain.LOGISTICS]: 5,
            [ComplianceDomain.LEGAL]: 6
        },
        enforcementIntensity: 7,
        strictnessScore: 6
    },
    UK: {
        domainWeights: {
            [ComplianceDomain.TAX]: 8,
            [ComplianceDomain.PRODUCT]: 7,
            [ComplianceDomain.MARKETING]: 6,
            [ComplianceDomain.DATA]: 8,
            [ComplianceDomain.CORPORATE]: 7,
            [ComplianceDomain.ONGOING_MONITORING]: 8,
            // Post-Brexit border formalities make customs a first-class risk.
            [ComplianceDomain.LOGISTICS]: 7,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 8,
        strictnessScore: 7
    },
    IT: {
        domainWeights: {
            [ComplianceDomain.TAX]: 8,
            [ComplianceDomain.PRODUCT]: 7,
            [ComplianceDomain.MARKETING]: 6,
            [ComplianceDomain.DATA]: 8,
            [ComplianceDomain.CORPORATE]: 7,
            [ComplianceDomain.ONGOING_MONITORING]: 6,
            [ComplianceDomain.LOGISTICS]: 6,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 7,
        strictnessScore: 7
    },
    ES: {
        domainWeights: {
            [ComplianceDomain.TAX]: 8,
            [ComplianceDomain.PRODUCT]: 7,
            [ComplianceDomain.MARKETING]: 6,
            [ComplianceDomain.DATA]: 8,
            [ComplianceDomain.CORPORATE]: 6,
            [ComplianceDomain.ONGOING_MONITORING]: 6,
            [ComplianceDomain.LOGISTICS]: 6,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 7,
        strictnessScore: 7
    },
    NL: {
        domainWeights: {
            [ComplianceDomain.TAX]: 7,
            [ComplianceDomain.PRODUCT]: 7,
            [ComplianceDomain.MARKETING]: 6,
            [ComplianceDomain.DATA]: 8,
            [ComplianceDomain.CORPORATE]: 6,
            [ComplianceDomain.ONGOING_MONITORING]: 7,
            // Rotterdam gateway: heavy import/forwarding exposure.
            [ComplianceDomain.LOGISTICS]: 7,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 7,
        strictnessScore: 7
    },
    TR: {
        domainWeights: {
            [ComplianceDomain.TAX]: 8,
            [ComplianceDomain.PRODUCT]: 6,
            [ComplianceDomain.MARKETING]: 5,
            [ComplianceDomain.DATA]: 7,
            [ComplianceDomain.CORPORATE]: 6,
            [ComplianceDomain.ONGOING_MONITORING]: 6,
            // EU customs-union edge cases (ATR, origin rules) dominate.
            [ComplianceDomain.LOGISTICS]: 8,
            [ComplianceDomain.LEGAL]: 5
        },
        enforcementIntensity: 6,
        strictnessScore: 6
    }
};

export function getCountryRiskProfile(code: CountryCode): CountryRiskProfile {
    const profile = CountryRiskMatrix[code];
    if (!profile) {
        throw new Error(`Country profile not found for code: ${code}`);
    }
    return profile;
}

export function isKnownCountry(code: string): code is CountryCode {
    return code in CountryRiskMatrix;
}
