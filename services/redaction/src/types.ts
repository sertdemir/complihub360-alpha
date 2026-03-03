export type RedactionRuleCategory =
    | 'EMAIL'
    | 'PHONE'
    | 'CREDIT_CARD'
    | 'IBAN'
    | 'ADDRESS'
    | 'NAME'
    | 'API_KEY'
    | 'URL_WITH_TOKEN'
    | 'INVOICE_NUMBER'
    | 'PASSPORT_ID';

export interface RedactionRule {
    id: string;
    category: RedactionRuleCategory;
    pattern: RegExp;
    placeholder: string;
}

export type RedactionCounts = Record<RedactionRuleCategory, number>;

export interface RedactionReport {
    countsByType: Partial<RedactionCounts>;
    appliedRules: string[];
    riskScore: number;
}

export interface RedactOptions {
    profile: 'strict' | 'standard' | 'minimal' | 'none';
}

export interface RedactionResult {
    sanitizedText: string;
    report: RedactionReport;
}
