/**
 * Regulatory Mapper - Compliance Engine
 * Maps platform features to jurisdictional requirements (EU AI Act, UK GDPR, ISO 42001).
 */

export type Jurisdiction = 'EU' | 'UK' | 'US' | 'Global';
export type AIRiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';

export interface ComplianceRequirement {
  jurisdiction: Jurisdiction;
  requiresHumanOversight: boolean;
  requiresExplicitConsent: boolean;
  maxDataRetentionDays: number;
  allowedRiskLevels: AIRiskLevel[];
}

export class RegulatoryMapper {
  /**
   * Returns the strict compliance ruleset based on the target jurisdiction.
   * EU serves as the strictest baseline (Brussels Effect) applied across the platform.
   */
  static getRuleset(jurisdiction: Jurisdiction): ComplianceRequirement {
    switch (jurisdiction) {
      case 'EU':
        // Strict EU AI Act & GDPR rules
        return {
          jurisdiction: 'EU',
          requiresHumanOversight: true,
          requiresExplicitConsent: true,
          maxDataRetentionDays: 30, // Strict minimization
          allowedRiskLevels: ['minimal', 'limited'] // High risk requires special sandbox, unacceptable is banned
        };
      case 'UK':
        // UK GDPR & AI Guidelines (Similar to EU but slightly adapted)
        return {
          jurisdiction: 'UK',
          requiresHumanOversight: true,
          requiresExplicitConsent: true,
          maxDataRetentionDays: 30,
          allowedRiskLevels: ['minimal', 'limited']
        };
      case 'US':
        // More permissible, but CompliHub360 enforces high standards globally
        return {
          jurisdiction: 'US',
          requiresHumanOversight: false, // Less strict legally, but platform might enforce it anyway
          requiresExplicitConsent: true,
          maxDataRetentionDays: 90,
          allowedRiskLevels: ['minimal', 'limited', 'high']
        };
      case 'Global':
      default:
        // Default to EU (Strictest) to ensure global compliance without overlapping code
        return this.getRuleset('EU');
    }
  }

  /**
   * Validates if a specific feature's risk level is legally allowed in the user's jurisdiction.
   */
  static isFeatureAllowed(featureRiskLevel: AIRiskLevel, userJurisdiction: Jurisdiction): boolean {
    const ruleset = this.getRuleset(userJurisdiction);
    return ruleset.allowedRiskLevels.includes(featureRiskLevel);
  }
}
