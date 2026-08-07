import React from 'react';
import { PartnerStatusBadge } from './ProviderBadges';

// ─── VerifiedPartnerBadge ─────────────────────────────────────────────────────
// A brand trust badge for verified partners (Molecule). Thin wrapper around
// PartnerStatusBadge (status="verified" → the gold mark) to avoid duplicating
// logic; adds tier-specific labels (Verified / Gold / Platinum partner).

export type PartnerTier = 'verified' | 'gold' | 'platinum';

const TIER_LABEL: Record<PartnerTier, string> = {
  verified: 'Verified partner',
  gold: 'Gold partner',
  platinum: 'Platinum partner',
};

export interface VerifiedPartnerBadgeProps {
  /** Tier name — all render the gold verified style, with a tier-specific label. */
  tier?: PartnerTier;
  /** Override the label entirely. */
  label?: React.ReactNode;
  className?: string;
}

export function VerifiedPartnerBadge({ tier = 'verified', label, className }: VerifiedPartnerBadgeProps) {
  return <PartnerStatusBadge status="verified" label={label ?? TIER_LABEL[tier]} className={className} />;
}
