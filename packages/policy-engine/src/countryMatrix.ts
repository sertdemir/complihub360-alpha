export type CountryCode = 'DE' | 'EU' | 'UK' | 'US' | 'CA' | 'AU' | 'ROW';

export interface CountryPolicy {
    retentionDays: number;
    allowAI: boolean;
    requireExplicitConsent: boolean;
    dataResidencyReady: boolean;
}

export const CountryPolicyMatrix: Record<CountryCode, CountryPolicy> = {
    'DE': {
        retentionDays: 365, // GDPR strict local
        allowAI: true,
        requireExplicitConsent: true,
        dataResidencyReady: true
    },
    'EU': {
        retentionDays: 730, // standard GDPR
        allowAI: true,
        requireExplicitConsent: true,
        dataResidencyReady: true
    },
    'UK': {
        retentionDays: 730, // UK GDPR
        allowAI: true,
        requireExplicitConsent: true,
        dataResidencyReady: false
    },
    'US': {
        retentionDays: 1825, // 5 years standard
        allowAI: true,
        requireExplicitConsent: false, // Opt-out generally
        dataResidencyReady: false
    },
    'CA': {
        retentionDays: 1825, // PIPEDA
        allowAI: true,
        requireExplicitConsent: true,
        dataResidencyReady: false
    },
    'AU': {
        retentionDays: 2555, // 7 years Australian Privacy Act
        allowAI: true,
        requireExplicitConsent: true,
        dataResidencyReady: false
    },
    'ROW': {
        retentionDays: 365,
        allowAI: false, // Conservative default
        requireExplicitConsent: true,
        dataResidencyReady: false
    }
};

export function getCountryPolicy(code: string): CountryPolicy {
    const normalizedCode = code.toUpperCase() as CountryCode;
    return CountryPolicyMatrix[normalizedCode] || CountryPolicyMatrix['ROW'];
}
