import React from 'react';
import { PartnerStatusBadge } from './ProviderBadges';

// ─── VerifiedProviderBadge ─────────────────────────────────────────────────────
// A brand trust badge for verified providers (Molecule). Thin wrapper around
// PartnerStatusBadge (status="verified" → the gold mark) to avoid duplicating
// logic; adds tier-specific labels (Verified / Gold / Platinum provider).

export type ProviderTier = 'verified' | 'gold' | 'platinum';

const TIER_LABEL: Record<ProviderTier, string> = {
  verified: 'Verified provider',
  gold: 'Gold provider',
  platinum: 'Platinum provider',
};

export interface VerifiedProviderBadgeProps {
  /** Tier name — all render the gold verified style, with a tier-specific label. */
  tier?: ProviderTier;
  /** Override the label entirely. */
  label?: React.ReactNode;
  className?: string;
}

export function VerifiedProviderBadge({ tier = 'verified', label, className }: VerifiedProviderBadgeProps) {
  return <PartnerStatusBadge status="verified" label={label ?? TIER_LABEL[tier]} className={className} />;
}
