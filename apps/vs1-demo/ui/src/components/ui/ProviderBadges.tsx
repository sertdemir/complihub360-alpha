import React from 'react';
import { BadgeCheck, Check, Clock, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Provider badges ────────────────────────────────────────────────────────
// Compass Provider AppShell extras: Partner Status Badge (1014:285) +
// Availability Pill (1014:294). Used on the provider/partner surfaces. Light + dark.

// Partner Status Badge — Verified = GOLD (the gold mark is the trust signal),
// Pending = neutral, Suspended = error.
export type PartnerStatus = 'verified' | 'pending' | 'suspended';
const PARTNER: Record<PartnerStatus, { cls: string; icon: React.ReactNode; label: string }> = {
  verified: {
    cls: 'bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30',
    icon: <BadgeCheck size={13} strokeWidth={2.5} />,
    label: 'Verified partner',
  },
  pending: {
    cls: 'bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:ring-white/10',
    icon: <Clock size={13} strokeWidth={2.5} />,
    label: 'Pending review',
  },
  suspended: {
    cls: 'bg-error-bg text-error-700 ring-1 ring-inset ring-error-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
    icon: <Circle size={13} strokeWidth={2.5} />,
    label: 'Suspended',
  },
};
// Solid variant — filled pill (verified = solid gold, white type), as on the
// marketing match cards.
const PARTNER_SOLID: Record<PartnerStatus, string> = {
  verified: 'bg-accent-500 text-fg-on-accent',
  pending: 'bg-neutral-500 text-white',
  suspended: 'bg-error-600 text-white',
};

export interface PartnerStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PartnerStatus;
  label?: React.ReactNode;
  /** soft = tinted pill (app surfaces) · solid = filled pill (marketing cards). */
  styleVariant?: 'soft' | 'solid';
}
export function PartnerStatusBadge({ status, label, styleVariant = 'soft', className, ...rest }: PartnerStatusBadgeProps) {
  const s = PARTNER[status];
  const solid = styleVariant === 'solid';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        solid ? PARTNER_SOLID[status] : s.cls,
        solid && 'text-[10px] uppercase tracking-[0.08em]',
        className,
      )}
      {...rest}
    >
      {solid ? <Check size={11} strokeWidth={3} /> : s.icon}
      {label ?? (solid ? status : s.label)}
    </span>
  );
}

// Availability Pill — a live status with a colored dot.
export type Availability = 'available' | 'busy' | 'offline';
const AVAIL: Record<Availability, { dot: string; label: string }> = {
  available: { dot: 'bg-emerald-500', label: 'Available' },
  busy: { dot: 'bg-amber-500', label: 'Busy' },
  offline: { dot: 'bg-neutral-400 dark:bg-neutral-500', label: 'Offline' },
};
export interface AvailabilityPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Availability;
  label?: React.ReactNode;
}
export function AvailabilityPill({ status, label, className, ...rest }: AvailabilityPillProps) {
  const s = AVAIL[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 dark:bg-white/[0.06] dark:text-neutral-200 dark:ring-white/10',
        className,
      )}
      {...rest}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {label ?? s.label}
    </span>
  );
}
