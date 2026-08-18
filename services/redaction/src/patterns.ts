import { RedactionRule } from './types';

// Rule order IS precedence: rules run top-down over the already-partially-
// redacted text, so the most SPECIFIC patterns (API keys, tokenised URLs,
// IBAN, cards) must run before the greedy generic ones (phone, passport) —
// otherwise the phone rule shreds the digit runs inside keys and IBANs.
export const PATTERNS: RedactionRule[] = [
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
        id: 'rule_iban_1',
        category: 'IBAN',
        // ISO 13616: 2-letter country code + 2 check digits + 11-30 char BBAN.
        // Two branches: the compact electronic form (NL91ABNA0417164300), which
        // stays case-insensitive, and the print form in groups of four
        // (NL91 ABNA 0417 1643 00). The spaced branch is uppercase-only on
        // purpose — case-insensitive it would swallow ordinary four-letter
        // words following anything that looks like a country code.
        pattern: /\b[A-Za-z]{2}\d{2}(?:[A-Za-z0-9]{11,30}|(?:\s[A-Z0-9]{4}){2,7}(?:\s[A-Z0-9]{1,4})?)\b/g,
        placeholder: '[REDACTED:IBAN]'
    },
    {
        id: 'rule_cc_1',
        category: 'CREDIT_CARD',
        pattern: /\b(?:\d[ -]*?){13,16}\b/g, // Simplified CC pattern
        placeholder: '[REDACTED:CREDIT_CARD]'
    },
    {
        id: 'rule_email_1',
        category: 'EMAIL',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        placeholder: '[REDACTED:EMAIL]'
    },
    {
        id: 'rule_phone_intl_1',
        category: 'PHONE',
        // E.164-style numbers with a country prefix and freely grouped digits
        // (+31 6 1234 5678, +49-30-1234567). Runs before the local rule so the
        // whole number is consumed instead of a 3-3-4 slice out of its middle.
        // The lookahead demands at least seven more digits after the country
        // code: without it "+12 34" in ordinary prose was read as a number.
        pattern: /\+\d{1,3}(?=(?:[\s-]?\d){7,})(?:[\s-]?\d{1,4}){2,6}(?!\d)/g,
        placeholder: '[REDACTED:PHONE]'
    },
    {
        id: 'rule_phone_1',
        category: 'PHONE',
        // Lookarounds pin the match to token boundaries: digit runs embedded
        // in alphanumeric identifiers (keys, IBANs) are never phone numbers.
        pattern: /(?<![A-Za-z0-9])(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g,
        placeholder: '[REDACTED:PHONE]'
    },
    {
        id: 'rule_invoice_1',
        category: 'INVOICE_NUMBER',
        // Trailing segments are part of the number: INV-2026-042 must not be
        // left as [REDACTED:INVOICE_NUMBER]-042.
        pattern: /\b(INV|RECHNUNG)[-\s]?\d{4,10}(?:-\d{1,10})*\b/gi,
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
        pattern: /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Herr|Frau)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
        placeholder: '[REDACTED:NAME]'
    },
    {
        id: 'rule_name_context_strict',
        category: 'NAME',
        // Names introduced by a salutation or a labelled field. Free-standing
        // names remain undetected — that needs NER, not a regex (see the test
        // that documents this limitation). Nl/de/fr nobiliary particles are
        // allowed between the parts.
        pattern: /(?<=\b(?:Contact|Dear|Attn\.?|Attention|Name|Kontakt|Ansprechpartner(?:in)?)[:,]?\s+)[A-Z][a-z]+(?:\s+(?:van|von|de|der|den|ter|te|da|di|la|le))*(?:\s+[A-Z][a-z]+){1,2}/g,
        placeholder: '[REDACTED:NAME]'
    }
];
