import { describe, it, expect } from 'vitest';
import { redactText } from './redact';

describe('Redaction Service (Deterministic)', () => {
    it('should redact emails with default standard profile', () => {
        const text = 'Contact us at info@complihub360.com or support@test.de.';
        const result = redactText(text);

        expect(result.sanitizedText).toBe('Contact us at [REDACTED:EMAIL] or [REDACTED:EMAIL].');
        expect(result.report.countsByType.EMAIL).toBe(2);
        expect(result.report.appliedRules).toContain('rule_email_1');
        expect(result.report.riskScore).toBe(20); // 2 * 10
    });

    it('should redact API keys under standard profile (high risk)', () => {
        const text = 'Here is the key: sk-1234567890abcdef1234567890abcdef. Do not share.';
        const result = redactText(text);

        expect(result.sanitizedText).toBe('Here is the key: [REDACTED:API_KEY]. Do not share.');
        expect(result.report.countsByType.API_KEY).toBe(1);
        expect(result.report.riskScore).toBe(50); // 1 * 50
    });

    it('should redact addresses/names only in strict profile', () => {
        const text = 'Mr. John Doe sent the payment to DE12345678901234567890.';

        const standardResult = redactText(text, { profile: 'standard' });
        expect(standardResult.sanitizedText).toContain('Mr. John Doe'); // Name intact in standard
        expect(standardResult.sanitizedText).toContain('[REDACTED:IBAN]');

        const strictResult = redactText(text, { profile: 'strict' });
        expect(strictResult.sanitizedText).toContain('[REDACTED:NAME]');
        expect(strictResult.sanitizedText).toContain('[REDACTED:IBAN]');
    });

    it('should not redact anything if profile is none', () => {
        const text = 'My email is test@test.com';
        const result = redactText(text, { profile: 'none' });
        expect(result.sanitizedText).toBe(text);
        expect(result.report.riskScore).toBe(0);
    });

    it('gate test: should simulate failure if AI is called on unsanitized data', () => {
        // This represents a logic check
        const aiGate = (storageRef: string) => {
            if (storageRef.startsWith('raw://')) {
                throw new Error('SECURITY VIOLATION: Raw data sent to AI');
            }
            return true;
        };

        expect(() => aiGate('raw://doc-123')).toThrow(/Raw data sent to AI/);
        expect(aiGate('sanitized://doc-123')).toBe(true);
    });
});

// Regression suite for the July 2026 runtime finding: the greedy PHONE rule was
// shredding the digit run inside an IBAN into [REDACTED:PHONE] fragments, so the
// IBAN never got classified as an IBAN. bf4674fc fixed the precedence and pinned
// the phone regex to token boundaries; these tests lock that behaviour in and
// cover the formats the fix did not yet reach.
describe('E2E regression: IBAN vs. PHONE precedence (2026-07 runtime finding)', () => {
    const text = 'Contact Marlies Hertog at marlies@lampada.nl or +31 6 1234 5678. IBAN NL91ABNA0417164300. Invoice INV-2026-042.';

    it('should redact everything in strict profile, including context-anchored names', () => {
        const result = redactText(text, { profile: 'strict' });

        expect(result.sanitizedText).toBe(
            'Contact [REDACTED:NAME] at [REDACTED:EMAIL] or [REDACTED:PHONE]. IBAN [REDACTED:IBAN]. Invoice [REDACTED:INVOICE_NUMBER].'
        );
        expect(result.report.countsByType).toMatchObject({
            NAME: 1, EMAIL: 1, PHONE: 1, IBAN: 1, INVOICE_NUMBER: 1
        });
    });

    it('should redact the IBAN as IBAN, not as PHONE digits inside it', () => {
        const result = redactText('IBAN NL91ABNA0417164300.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('IBAN [REDACTED:IBAN].');
        expect(result.sanitizedText).not.toContain('PHONE');
        expect(result.report.countsByType.IBAN).toBe(1);
        expect(result.report.countsByType.PHONE).toBeUndefined();
    });

    it('should redact the print-formatted IBAN (groups of four)', () => {
        const result = redactText('Pay to NL91 ABNA 0417 1643 00 please.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('Pay to [REDACTED:IBAN] please.');
    });

    it('should match international phone numbers with spaced groups', () => {
        const result = redactText('Call +31 6 1234 5678 or +49-30-1234567.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('Call [REDACTED:PHONE] or [REDACTED:PHONE].');
        expect(result.report.countsByType.PHONE).toBe(2);
    });

    it('should still match local 3-3-4 phone formats', () => {
        const result = redactText('Office: (555) 123-4567.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('Office: [REDACTED:PHONE].');
    });

    it('should redact multi-segment invoice numbers fully', () => {
        const result = redactText('Invoice INV-2026-042 attached.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('Invoice [REDACTED:INVOICE_NUMBER] attached.');
    });

    it('documents the NAME heuristic limitation: free-standing names are not detected', () => {
        // Name detection is regex-heuristic (title- or context-anchored), not NER.
        const result = redactText('Marlies Hertog approved this yesterday.', { profile: 'strict' });

        expect(result.sanitizedText).toContain('Marlies Hertog');
        expect(result.report.countsByType.NAME).toBeUndefined();
    });
});

// Counterpart to the suite above: the widened patterns must not start eating
// ordinary prose. Over-redaction is the safer failure direction, but it still
// destroys the document the advisor is supposed to read.
describe('No over-redaction from the widened patterns', () => {
    it('should leave a plus sign followed by short numbers alone', () => {
        const result = redactText('Ergebnis: +12 34 statt 5.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('Ergebnis: +12 34 statt 5.');
        expect(result.report.countsByType.PHONE).toBeUndefined();
    });

    it('should not treat a country-code-like token plus words as a print IBAN', () => {
        const result = redactText('DE12 Test Wort Hier Noch Mehr folgt.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('DE12 Test Wort Hier Noch Mehr folgt.');
        expect(result.report.countsByType.IBAN).toBeUndefined();
    });

    it('should still match the compact IBAN in lower case', () => {
        const result = redactText('IBAN nl91abna0417164300.', { profile: 'standard' });

        expect(result.sanitizedText).toBe('IBAN [REDACTED:IBAN].');
    });
});
