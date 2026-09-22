import React from 'react';
import { PartnerStatusBadge } from './ProviderBadges';

// ─── VerifiedProviderBadge ─────────────────────────────────────────────────────
// A brand trust badge for verified providers (Molecule). Thin wrapper around
// PartnerStatusBadge (status="verified" → the gold mark) to avoid duplicating
// logic.
//
// There is exactly ONE tier. Gold and Platinum were removed on 2026-09-22
// (ADR-0003): verification is a fact, not a purchasable level, and no plan
// may look like a rank (Spec A §14, Spec B "Ranking benefit: Never").

export interface VerifiedProviderBadgeProps {
  /** Override the label entirely. */
  label?: React.ReactNode;
  className?: string;
}

export function VerifiedProviderBadge({ label, className }: VerifiedProviderBadgeProps) {
  return <PartnerStatusBadge status="verified" label={label ?? 'Verified Provider'} className={className} />;
}
