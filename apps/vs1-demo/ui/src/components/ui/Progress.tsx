import React from 'react';
import { cn } from '../../lib/utils';

// ─── Progress primitives ──────────────────────────────────────────────────────
// From the Compass "Progress" page (536:2): ProgressBar · Spinner · CircleProgress.
// Petrol (brand) fill on a neutral track. Light + dark.

// Compass ProgressBar set 538:2 — Size × Color × State (Default / Indeterminate).
// Opacity on CSS-var colors is broken in this DS, so non-brand colors use STATIC
// tailwind colors (emerald/amber/red/sky -500, dark -400).
export type ProgressColor = 'brand' | 'accent' | 'success' | 'warning' | 'error' | 'info';

const PROGRESS_FILL: Record<ProgressColor, string> = {
  brand: 'bg-brand',
  accent: 'bg-[#d4af37]',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  error: 'bg-red-500 dark:bg-red-400',
  info: 'bg-sky-500 dark:bg-sky-400',
};

// Keyframe for the indeterminate sliding bar — injected once (no tailwind config change).
const INDETERMINATE_CSS = `@keyframes ch-progress-indeterminate {
  0% { left: -40%; right: 100%; }
  60% { left: 100%; right: -40%; }
  100% { left: 100%; right: -40%; }
}`;

export interface ProgressBarProps {
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Fill color. Default = brand (petrol). */
  color?: ProgressColor;
  /** Animated sliding bar for unknown-duration work. Ignores `value`. */
  indeterminate?: boolean;
  className?: string;
}
export function ProgressBar({ value = 0, size = 'md', color = 'brand', indeterminate = false, className }: ProgressBarProps) {
  const h = { sm: 'h-1', md: 'h-2', lg: 'h-3' }[size];
  const v = Math.min(100, Math.max(0, value));
  const fill = PROGRESS_FILL[color];
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10', h, className)}
    >
      {indeterminate ? (
        <>
          <style>{INDETERMINATE_CSS}</style>
          <div
            className={cn('absolute top-0 bottom-0 rounded-full', fill)}
            style={{ animation: 'ch-progress-indeterminate 1.4s ease-in-out infinite' }}
          />
        </>
      ) : (
        <div className={cn('h-full rounded-full transition-all', fill)} style={{ width: `${v}%` }} />
      )}
    </div>
  );
}

export interface SpinnerProps {
  size?: number;
  className?: string;
  'aria-label'?: string;
}
export function Spinner({ size = 20, className, ...rest }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={rest['aria-label'] ?? 'Loading'}
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-fg-brand', className)}
      style={{ width: size, height: size }}
    />
  );
}

export interface CircleProgressProps {
  value?: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  className?: string;
}
export function CircleProgress({ value = 0, size = 64, stroke = 6, label, className }: CircleProgressProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  const off = c * (1 - v / 100);
  return (
    <div className={cn('relative inline-grid place-items-center text-fg-brand', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-[stroke-dashoffset]"
        />
      </svg>
      <span className="absolute text-[13px] font-semibold text-fg">{label ?? `${Math.round(v)}%`}</span>
    </div>
  );
}
