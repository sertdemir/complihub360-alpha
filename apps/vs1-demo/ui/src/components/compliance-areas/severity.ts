import type { ObligationSeverity } from '@complihub/compliance-engine';

// ─── Severity → Compass risk tokens ──────────────────────────────────────────
// One map, every consumer. The severity itself is never authored: it comes from
// severityFromRiskWeight() in the engine, so a duty's colour and its weight can
// not drift apart.
//
// The full four-step scale is used. The page previously only ever reached for
// three (medium/high/critical) because its hand-kept percentages never fell
// below 40 — the low tokens existed in Compass and went unused.

interface SeverityStyle {
  /** Badge: background + text, no border. */
  badge: string;
  /** Bar fill. */
  bar: string;
  /** Card accent border. */
  border: string;
  /** Icon tile background + glyph colour. */
  iconBg: string;
  iconColor: string;
}

export const SEVERITY_STYLE: Record<ObligationSeverity, SeverityStyle> = {
  critical: {
    badge: 'bg-risk-critical-bg text-risk-on-critical',
    bar: 'bg-risk-critical',
    border: 'border-risk-critical/30',
    iconBg: 'bg-risk-critical-bg',
    iconColor: 'text-risk-on-critical',
  },
  high: {
    badge: 'bg-risk-high-bg text-risk-on-high',
    bar: 'bg-risk-high',
    border: 'border-risk-high/30',
    iconBg: 'bg-risk-high-bg',
    iconColor: 'text-risk-on-high',
  },
  medium: {
    badge: 'bg-risk-medium-bg text-risk-on-medium',
    bar: 'bg-risk-medium',
    border: 'border-risk-medium/30',
    iconBg: 'bg-risk-medium-bg',
    iconColor: 'text-risk-on-medium',
  },
  low: {
    badge: 'bg-risk-low-bg text-risk-on-low',
    bar: 'bg-risk-low',
    border: 'border-risk-low/30',
    iconBg: 'bg-risk-low-bg',
    iconColor: 'text-risk-on-low',
  },
};

/** i18n key for a severity label, e.g. compliance.severity.high. */
export function severityKey(severity: ObligationSeverity): string {
  return `compliance.severity.${severity}`;
}

export const SEVERITY_FALLBACK: Record<ObligationSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
