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
