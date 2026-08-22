import type { ObligationSeverity } from '@complihub/compliance-engine';

// ─── Severity → Compass risk tokens ──────────────────────────────────────────
// What this file does NOT do any more: the badge itself. That belongs to
// ui/RiskBadge, the brand-critical traffic-light component — four levels, four
// styles, three sizes, its own contrast measurements and a deuteranopia note
// explaining why every variant carries a word and not just a colour. This file
// briefly shipped its own copy of that pairing, which was a duplicate of a
// better-reasoned component.
//
// What remains are the surfaces RiskBadge has no opinion about: the card accent
// border, the icon tile behind an area's glyph, and the bar fill in the risk
// grid. Those are page furniture tinted by severity, not labels.
//
// The severity itself is never authored: it comes from severityFromRiskWeight()
// in the engine, so a duty's colour and its weight cannot drift apart. The
// engine's ObligationSeverity and RiskBadge's RiskLevel are the same four
// strings, so they map without a translation table.

interface SeverityStyle {
  /** Bar fill in the risk grid. */
  bar: string;
  /** Card accent border. */
  border: string;
  /** Icon tile background + glyph colour. */
  iconBg: string;
  iconColor: string;
}

export const SEVERITY_STYLE: Record<ObligationSeverity, SeverityStyle> = {
  critical: {
    bar: 'bg-risk-critical',
    border: 'border-risk-critical/30',
    iconBg: 'bg-risk-critical-bg',
    iconColor: 'text-risk-on-critical',
  },
  high: {
    bar: 'bg-risk-high',
    border: 'border-risk-high/30',
    iconBg: 'bg-risk-high-bg',
    iconColor: 'text-risk-on-high',
  },
  medium: {
    bar: 'bg-risk-medium',
    border: 'border-risk-medium/30',
    iconBg: 'bg-risk-medium-bg',
    iconColor: 'text-risk-on-medium',
  },
  low: {
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
