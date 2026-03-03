import { RedactionRule, RedactOptions, RedactionResult, RedactionCounts } from './types';
import { PATTERNS, STRICT_PATTERNS } from './patterns';

/**
 * [ACTIVE AGENT: Repo-Engineer]
 * Applies deterministic rule-based redaction over text.
 * No LLMs involved in this process.
 */
export function redactText(text: string, options: RedactOptions = { profile: 'standard' }): RedactionResult {
    if (options.profile === 'none') {
        return {
            sanitizedText: text,
            report: { countsByType: {}, appliedRules: [], riskScore: 0 }
        };
    }

    let rulesToApply: RedactionRule[] = [];
    if (options.profile === 'strict') {
        rulesToApply = STRICT_PATTERNS;
    } else if (options.profile === 'standard') {
        rulesToApply = PATTERNS;
    } else if (options.profile === 'minimal') {
        // Just high risk items
        rulesToApply = PATTERNS.filter(p => ['API_KEY', 'CREDIT_CARD', 'IBAN'].includes(p.category));
    }

    let sanitizedText = text;
    const countsByType: Partial<RedactionCounts> = {};
    const appliedRules = new Set<string>();

    for (const rule of rulesToApply) {
        let matchCount = 0;

        sanitizedText = sanitizedText.replace(rule.pattern, () => {
            matchCount++;
            return rule.placeholder;
        });

        if (matchCount > 0) {
            countsByType[rule.category] = (countsByType[rule.category] || 0) + matchCount;
            appliedRules.add(rule.id);
        }
    }

    const riskScore = calculateDeterministicRiskScore(countsByType);

    return {
        sanitizedText,
        report: {
            countsByType,
            appliedRules: Array.from(appliedRules),
            riskScore
        }
    };
}

/**
 * Deterministic risk scoring based on PII counts.
 */
function calculateDeterministicRiskScore(counts: Partial<RedactionCounts>): number {
    let score = 0;

    // High risk
    if (counts.API_KEY) score += counts.API_KEY * 50;
    if (counts.CREDIT_CARD) score += counts.CREDIT_CARD * 40;
    if (counts.IBAN) score += counts.IBAN * 30;
    if (counts.PASSPORT_ID) score += counts.PASSPORT_ID * 30;

    // Medium risk
    if (counts.EMAIL) score += counts.EMAIL * 10;
    if (counts.PHONE) score += counts.PHONE * 10;

    // Low risk
    if (counts.INVOICE_NUMBER) score += counts.INVOICE_NUMBER * 2;
    if (counts.URL_WITH_TOKEN) score += counts.URL_WITH_TOKEN * 5;
    if (counts.NAME) score += counts.NAME * 5;

    return Math.min(score, 100); // Normalize to 100 max
}
