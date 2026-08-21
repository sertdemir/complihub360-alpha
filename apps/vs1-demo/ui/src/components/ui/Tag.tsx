import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Tag ──────────────────────────────────────────────────────────────────────
// Compass "Tag" (Badge page). A pill label — like Badge but always rounded-full,
// optional leading node + removable ✕. Light + dark.

export type TagTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';
const TONE: Record<TagTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200',
  brand: 'bg-primary-50 text-primary-700 dark:bg-primary-500/25 dark:text-primary-200',
  success: 'bg-success-bg text-success-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  // warning-700 on the warning tint is 4.08 at this 12px size — the one tone in
  // this set that misses. Its siblings clear comfortably (success 5.50, error
  // 6.48, info 6.38) because yellow simply runs lighter at the same ramp stop,
  // so warning alone steps down to 800: 6.69.
  warning: 'bg-warning-bg text-warning-800 dark:bg-amber-500/15 dark:text-amber-300',
  error: 'bg-error-bg text-error-700 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-info-bg text-info-700 dark:bg-sky-500/15 dark:text-sky-300',
};

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  leading?: React.ReactNode;
  onRemove?: () => void;
}

export function Tag({ tone = 'neutral', leading, onRemove, className, children, ...rest }: TagProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', TONE[tone], className)} {...rest}>
      {leading}
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="-mr-0.5 rounded-full opacity-70 hover:opacity-100">
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
