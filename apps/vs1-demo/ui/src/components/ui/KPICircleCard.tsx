import React from 'react';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { CircleProgress } from './Progress';
import { useCountUp } from '../../lib/useCountUp';

// ─── KPI Circle Card ────────────────────────────────────────────────────────
// Mirrors the Compass "KPI Circle Card" set (680:415, Cards page). A circular
// progress ring carries a single KPI; an eyebrow label and a colored trend pill
// give it context. Reuses CircleProgress for the ring (color is applied via a
// className on the wrapper, since CircleProgress paints the arc with
// `currentColor` — we never modify CircleProgress itself).
//
//   Layout × Color × State:
//     Layout = Horizontal (circle left · label + trend right, compact)
//            | Centered   (label top · big circle · trend bottom — hero)
//     Color  = Brand (petrol) · Success (emerald) · Warning (amber)
//            · Error (red — the one place red is sanctioned) · Info (sky)
//     State  = Default | Disabled (muted, no trend accent)
//
// Mode-aware tokens for chrome; static color scales for the accent (opacity on
// CSS-var colors is broken, so the ring/trend accents use static emerald/amber/
// red/sky -500 in light, -400 in dark; Brand uses the petrol text-fg-brand token).

export type KPIColor = 'brand' | 'success' | 'warning' | 'error' | 'info';
export type KPILayout = 'horizontal' | 'centered';
export type KPITrendDirection = 'up' | 'down' | 'neutral';

export interface KPITrend {
  value: string;
  direction: KPITrendDirection;
}

export interface KPICircleCardProps {
  label: React.ReactNode;
  /** 0–100, drives the CircleProgress ring. */
  value: number;
  /** Centered text inside the ring, e.g. "92%". Defaults to `${value}%`. */
  valueLabel?: string;
  layout?: KPILayout;
  color?: KPIColor;
  trend?: KPITrend;
  disabled?: boolean;
  /** Animate the ring arc + count up the value on mount / value change. */
  animate?: boolean;
  className?: string;
}

// Accent = ring arc + value text + trend pill text. Static scales (mode-aware
// pair), except Brand which rides the petrol token.
// The light half used the raw 500 stops, which are tuned to sit ON a surface,
// not to be read as 12-13px text against one. Every non-brand tone missed on a
// white card - emerald 2.54, amber 2.15, red 3.76, sky 2.77 - and the dark-only
// workspace had hidden all four. They now take the DS status ramps, the same
// stops Tag uses, and read 6.24-7.58. Dark is untouched: measured on the
// workbench card the 400s clear at 5.31-8.79.
const ACCENT: Record<KPIColor, string> = {
  brand: 'text-fg-brand',
  success: 'text-success-700 dark:text-emerald-400',
  warning: 'text-warning-800 dark:text-amber-400',
  error: 'text-error-700 dark:text-red-400',
  info: 'text-info-700 dark:text-sky-400',
};

const TREND_ICON: Record<KPITrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

export function KPICircleCard({
  label,
  value,
  valueLabel,
  layout = 'horizontal',
  color = 'brand',
  trend,
  disabled,
  animate = false,
  className,
}: KPICircleCardProps) {
  const v = Math.min(100, Math.max(0, value));
  const counted = useCountUp(v);
  const display = valueLabel ?? `${Math.round(animate ? counted : v)}%`;
  const accent = disabled ? 'text-fg-tertiary' : ACCENT[color];
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  const eyebrow = (
    <span
      className={cn(
        'font-sans text-[11px] font-semibold uppercase tracking-[0.08em]',
        disabled ? 'text-fg-tertiary' : 'text-fg-secondary',
      )}
    >
      {label}
    </span>
  );

  const pill =
    trend && TrendIcon ? (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[13px] font-semibold',
          disabled ? 'text-fg-tertiary' : accent,
        )}
      >
        <TrendIcon size={14} strokeWidth={2.5} />
        {trend.value}
      </span>
    ) : null;

  if (layout === 'centered') {
    return (
      <Card
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border border-stroke bg-surface p-5 text-center',
          disabled && 'opacity-60',
          className,
        )}
        aria-disabled={disabled || undefined}
      >
        {eyebrow}
        <CircleProgress
          value={v}
          size={96}
          stroke={8}
          animate={animate}
          label={<span className={cn('text-[20px] font-bold', accent)}>{display}</span>}
          className={accent}
        />
        {pill}
      </Card>
    );
  }

  // Horizontal: circle left · label + trend right, compact.
  return (
    <Card
      className={cn(
        'flex items-center gap-4 rounded-xl border border-stroke bg-surface p-4',
        disabled && 'opacity-60',
        className,
      )}
      aria-disabled={disabled || undefined}
    >
      <CircleProgress
        value={v}
        size={56}
        stroke={6}
        animate={animate}
        label={<span className={cn('text-[12px] font-bold', accent)}>{display}</span>}
        className={cn('shrink-0', accent)}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow}
        {pill}
      </div>
    </Card>
  );
}
