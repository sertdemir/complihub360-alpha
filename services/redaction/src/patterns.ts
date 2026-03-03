import { RedactionRule } from './types';

export const PATTERNS: RedactionRule[] = [
    {
        id: 'rule_email_1',
        category: 'EMAIL',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        placeholder: '[REDACTED:EMAIL]'
    },
    {
        id: 'rule_phone_1',
        category: 'PHONE',
        pattern: /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,
        placeholder: '[REDACTED:PHONE]'
    },
    {
        id: 'rule_cc_1',
        category: 'CREDIT_CARD',
        pattern: /\b(?:\d[ -]*?){13,16}\b/g, // Simplified CC pattern
        placeholder: '[REDACTED:CREDIT_CARD]'
    },
    {
        id: 'rule_iban_1',
        category: 'IBAN',
        pattern: /[A-Z]{2}\d{2}[A-Z0-9]{11,30}/gi,
        placeholder: '[REDACTED:IBAN]'
    },
    {
        id: 'rule_api_key_1',
        category: 'API_KEY',
        pattern: /(sk-[a-zA-Z0-9]{32,}|Bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*)/g,
        placeholder: '[REDACTED:API_KEY]'
    },
    {
        id: 'rule_url_token_1',
        category: 'URL_WITH_TOKEN',
        pattern: /https?:\/\/[^\s]+[\?&](token|auth|key|sig)=[a-zA-Z0-9\-\._]+/g,
        placeholder: '[REDACTED:URL_WITH_TOKEN]'
    },
    {
        id: 'rule_invoice_1',
        category: 'INVOICE_NUMBER',
        pattern: /\b(INV|RECHNUNG)[-\s]?\d{4,10}\b/gi,
        placeholder: '[REDACTED:INVOICE_NUMBER]'
    },
    {
        id: 'rule_passport_1',
        category: 'PASSPORT_ID',
        pattern: /\b[A-Z0-9]{9}\b/g, // Generic heuristic
        placeholder: '[REDACTED:PASSPORT_ID]'
    }
];

// In a real implementation Names and Addresses need NLP or more complex heuristics,
// using simple Regex here for demonstration of deterministic pipeline
export const STRICT_PATTERNS: RedactionRule[] = [
    ...PATTERNS,
    {
        id: 'rule_name_strict',
        category: 'NAME',
        pattern: /\b(Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
        placeholder: '[REDACTED:NAME]'
    }
];
