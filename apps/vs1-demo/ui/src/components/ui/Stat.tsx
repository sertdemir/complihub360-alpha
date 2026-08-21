import React from 'react';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Stat / Metric ────────────────────────────────────────────────────────────
// A single KPI: an eyebrow label, a large tabular value, and an optional trend
// chip (▲ success / ▼ error / – neutral) with a caption. Layout-only — drop it
// into a Card for a metric tile, or in a row for a performance strip. NOTE: this
// is a neutral metric, not a risk signal — risk uses the RiskBadge scale.

export type StatSize = 'sm' | 'md' | 'lg';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatTrend {
  value: string;
  direction?: TrendDirection;
  /** Caption after the trend, e.g. "vs. last month". */
  label?: string;
}

export interface StatProps {
  value: React.ReactNode;
  label: React.ReactNode;
  /** Supporting caption shown when there is no trend. */
  hint?: React.ReactNode;
  trend?: StatTrend;
  size?: StatSize;
  className?: string;
}

const SIZE: Record<StatSize, { value: string; label: string }> = {
  sm: { value: 'text-[1.5rem]', label: 'text-[11px]' },
  md: { value: 'text-[2rem]', label: 'text-[12px]' },
  lg: { value: 'text-[2.5rem]', label: 'text-[13px]' },
};

const TREND: Record<TrendDirection, { cls: string; Icon: LucideIcon }> = {
  up: { cls: 'text-success-700 dark:text-emerald-400', Icon: TrendingUp },
  down: { cls: 'text-error-700 dark:text-red-400', Icon: TrendingDown },
  neutral: { cls: 'text-fg-secondary', Icon: Minus },
};

export function Stat({ value, label, hint, trend, size = 'md', className }: StatProps) {
  const s = SIZE[size];
  const t = trend ? TREND[trend.direction ?? 'neutral'] : null;
  const caption = trend?.label ?? hint;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className={cn('font-sans font-medium uppercase tracking-[0.06em] text-fg-secondary', s.label)}>
        {label}
      </span>
      <span className={cn('font-sans font-bold leading-none tracking-tight tabular-nums text-fg', s.value)}>
        {value}
      </span>
      {(t || caption) && (
        <div className="mt-1 flex items-center gap-2 text-body-sm">
          {t && trend && (
            <span className={cn('inline-flex items-center gap-1 font-semibold', t.cls)}>
              <t.Icon size={14} strokeWidth={2.5} />
              {trend.value}
            </span>
          )}
          {caption && <span className="text-fg-tertiary">{caption}</span>}
        </div>
      )}
    </div>
  );
}
