import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Badge / Chip ─────────────────────────────────────────────────────────────
// Compass "Badge" page. Small label, big meaning. Covers the non-risk badge
// families: status/label badges (tone × appearance × size), an optional leading
// dot, and the removable filter chip (trailing ✕). The interactive, toggleable
// filter chip is `FilterChip` below. The risk scale lives in its own
// brand-critical component — see RiskBadge (traffic light, own tokens).

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'error' | 'info';
export type BadgeAppearance = 'solid' | 'soft' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

const SIZE: Record<BadgeSize, { box: string; text: string; radius: string; dot: string; gap: string; close: number }> = {
  sm: { box: 'px-[6px] py-[3px]', text: 'text-[11px]', radius: 'rounded-[4px]', dot: 'h-[6px] w-[6px]', gap: 'gap-[4px]', close: 11 },
  md: { box: 'px-[8px] py-[4px]', text: 'text-[12px]', radius: 'rounded-[6px]', dot: 'h-[7px] w-[7px]', gap: 'gap-[5px]', close: 12 },
  lg: { box: 'px-[10px] py-[6px]', text: 'text-[14px]', radius: 'rounded-[6px]', dot: 'h-[8px] w-[8px]', gap: 'gap-[6px]', close: 14 },
};

const TONE: Record<BadgeTone, { solid: string; soft: string; outline: string; dot: string }> = {
  neutral: {
    solid: 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900',
    soft: 'bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200',
    outline: 'border border-neutral-300 text-neutral-700 dark:border-white/25 dark:text-neutral-200',
    dot: 'bg-neutral-500 dark:bg-neutral-300',
  },
  brand: {
    solid: 'bg-primary-500 text-white',
    soft: 'bg-primary-50 text-primary-700 dark:bg-primary-500/25 dark:text-primary-200',
    outline: 'border border-primary-500 text-primary-700 dark:border-primary-400 dark:text-primary-200',
    dot: 'bg-primary-500 dark:bg-primary-300',
  },
  accent: {
    solid: 'bg-accent-500 text-fg-on-accent',
    soft: 'bg-accent-50 text-accent-800 dark:bg-accent-500/20 dark:text-accent-200',
    outline: 'border border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-200',
    dot: 'bg-accent-500',
  },
  success: {
    solid: 'bg-success-500 text-white',
    soft: 'bg-success-bg text-success-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    outline: 'border border-success-500 text-success-700 dark:border-emerald-500/50 dark:text-emerald-300',
    dot: 'bg-success-500 dark:bg-emerald-400',
  },
  warning: {
    solid: 'bg-warning-500 text-white',
    soft: 'bg-warning-bg text-warning-700 dark:bg-amber-500/15 dark:text-amber-300',
    outline: 'border border-warning-500 text-warning-700 dark:border-amber-500/50 dark:text-amber-300',
    dot: 'bg-warning-500 dark:bg-amber-400',
  },
  error: {
    solid: 'bg-error-500 text-white',
    soft: 'bg-error-bg text-error-700 dark:bg-red-500/15 dark:text-red-300',
    outline: 'border border-error-500 text-error-700 dark:border-red-500/50 dark:text-red-300',
    dot: 'bg-error-500 dark:bg-red-400',
  },
  info: {
    solid: 'bg-info-500 text-white',
    soft: 'bg-info-bg text-info-700 dark:bg-sky-500/15 dark:text-sky-300',
    outline: 'border border-info-500 text-info-700 dark:border-sky-500/50 dark:text-sky-300',
    dot: 'bg-info-500 dark:bg-sky-400',
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  appearance?: BadgeAppearance;
  size?: BadgeSize;
  /** Show a leading status dot in the tone colour. */
  dot?: boolean;
  /** Render a trailing ✕ that calls this when clicked (removable filter chip). */
  onDismiss?: () => void;
  /** Accessible label for the ✕ button (default "Remove"). */
  dismissLabel?: string;
}

export function Badge({
  tone = 'neutral',
  appearance = 'soft',
  size = 'md',
  dot = false,
  onDismiss,
  dismissLabel = 'Remove',
  className,
  children,
  ...rest
}: BadgeProps) {
  const s = SIZE[size];
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-sans font-semibold leading-none tracking-[0.02em]',
        s.box,
        s.text,
        s.radius,
        s.gap,
        t[appearance],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('shrink-0 rounded-full', s.dot, t.dot)} aria-hidden="true" />}
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-mr-[2px] ml-[1px] inline-flex shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X size={s.close} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
// Compass "Wählen, togglen, filtern." — the interactive, toggleable pill. A real
// button with a pressed (selected) state: petrol fill when on, quiet surface when
// off. Same family as the mobile header's anchor pills.
export interface FilterChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean;
  size?: Exclude<BadgeSize, 'lg'> | 'lg';
  children: React.ReactNode;
}

const CHIP_SIZE: Record<BadgeSize, string> = {
  sm: 'px-[10px] py-[4px] text-[12px]',
  md: 'px-[12px] py-[5px] text-[13px]',
  lg: 'px-[14px] py-[7px] text-[14px]',
};

export function FilterChip({ selected = false, size = 'md', className, children, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full font-sans font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2',
        CHIP_SIZE[size],
        selected
          ? 'bg-brand text-fg-on-brand'
          : 'bg-surface-secondary text-fg hover:bg-surface-tertiary',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
