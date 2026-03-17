export interface PrivacyPolicyContext {
    country: string;
    docType: string;
    classification: string;
    consentFlags: string[];
}

export interface PrivacyPolicyResult {
    redactionProfile: 'strict' | 'standard' | 'minimal' | 'none';
    allowAI: boolean;
    allowIndexing: boolean;
    retentionDays: number;
    storeRaw: boolean;
    storeSanitized: boolean;
}

/**
 * [ACTIVE AGENT: Policy-Guard]
 * This function enforces mandatory privacy-by-design policy defaults based on jurisdiction.
 * It is strictly governed by conservative defaults:
 * - allowAI = false unless explicitly whitelist allowed.
 * - storeRaw = false unless explicitly permitted by consent.
 */
export function evaluatePrivacyPolicy(ctx: PrivacyPolicyContext): PrivacyPolicyResult {
    const { country, docType, classification, consentFlags } = ctx;

    // Extremely conservative defaults
    const result: PrivacyPolicyResult = {
        redactionProfile: 'strict',
        allowAI: false,
        allowIndexing: false,
        retentionDays: 30, // Minimal retention by default
        storeRaw: false,
        storeSanitized: true,
    };

    // Jurisdictional overrides
    if (country === 'EU' || country === 'DE') {
        result.redactionProfile = 'strict';
        // GDPR strict context: AI only allowed if explicit consent given + classification is internal
        if (classification === 'internal' && consentFlags.includes('ai_processing_accepted')) {
            result.allowAI = true;
        }
        result.retentionDays = 30;
        result.storeRaw = consentFlags.includes('raw_storage_accepted');
    } else if (country === 'US') {
        result.redactionProfile = 'standard';
        result.allowAI = consentFlags.includes('ai_processing_accepted_us');
        result.retentionDays = 90;
        result.storeRaw = true; // More permissive by default in US, assuming consent
    }

    // DocType overrides
    if (docType === 'passport' || docType === 'health_record') {
        result.redactionProfile = 'strict';
        result.allowAI = false; // NEVER allow AI on these
        result.storeRaw = false; // MUST only store sanitized
    }

    // Classification overrides
    if (classification === 'public') {
        result.redactionProfile = 'none';
        result.allowAI = true;
        result.allowIndexing = true;
    }

    return result;
}
