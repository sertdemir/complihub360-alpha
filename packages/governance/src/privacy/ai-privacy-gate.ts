export interface PrivacyGateResult {
  passed: boolean;
  sanitizedText: string;
  blockedReason?: string;
}

/**
 * AI Privacy Gate - Technical Dimension
 * Strips PII and blocks restricted domains before sending data to an LLM.
 */
export class AIPrivacyGate {
  /**
   * Validates and sanitizes input text to ensure no PII is transmitted to external AI providers.
   */
  static async sanitizeInput(text: string): Promise<PrivacyGateResult> {
    // 1. Mask PII (Email & Phone as base, actual platform uses deeper NER models)
    let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL-REDACTED]');
    sanitized = sanitized.replace(/(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g, '[PHONE-REDACTED]');

    // 2. Domain check (prevent prompt injection & forbidden topics)
    const restrictedKeywords = ['bypass', 'ignore previous instructions', 'system prompt'];
    for (const keyword of restrictedKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        return {
          passed: false,
          sanitizedText: '',
          blockedReason: 'Prompt injection or restricted topic detected.'
        };
      }
    }

    return {
      passed: true,
      sanitizedText: sanitized
    };
  }

  /**
   * High-Level Gate: Combines Privacy sanitation and Audit logging before execution.
   */
  static async executeWithGovernance(
    featureId: string,
    action: string,
    rawText: string,
    userId: string,
    aiCallback: (sanitized: string) => Promise<any>
  ): Promise<any> {
    const gateResult = await this.sanitizeInput(rawText);

    // Dynamic import to avoid circular dependencies
    const { AIAuditLogger } = await import('../audit/ai-audit-logger');

    // Audit Log Generation
    await AIAuditLogger.logInteraction({
      featureId,
      userId,
      action,
      contextData: { 
        originalLength: rawText.length, 
        sanitizedLength: gateResult.sanitizedText.length, 
        blockedReason: gateResult.blockedReason 
      },
      passedPrivacyGate: gateResult.passed
    });

    if (!gateResult.passed) {
      throw new Error(`Privacy Gate Blocked AI Action: ${gateResult.blockedReason}`);
    }

    return await aiCallback(gateResult.sanitizedText);
  }
}
