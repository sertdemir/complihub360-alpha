import React from 'react';
import { cn } from '../../lib/utils';

// ─── Skeleton ───────────────────────────────────────────────────────────────────
// Loading placeholder. Pulsing neutral fill that flips for dark surfaces
// (bg-neutral-200 → bg-white/10 — opacity on a static colour, since opacity on
// CSS-var tokens is broken). Variants: text (N stacked bars, last ~60% wide),
// rect, circle. Light + dark.

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  /** text variant only — number of stacked bars (last is ~60% width). */
  lines?: number;
  className?: string;
}

const BASE = 'animate-pulse bg-neutral-200 dark:bg-white/10';

export function Skeleton({ variant = 'text', width, height, lines = 1, className }: SkeletonProps) {
  if (variant === 'text') {
    const count = Math.max(1, lines);
    return (
      <div className={cn('flex w-full flex-col gap-2', className)} style={{ width }} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(BASE, 'h-[12px] rounded-md')}
            style={{ width: i === count - 1 && count > 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  const isCircle = variant === 'circle';
  return (
    <div
      className={cn(BASE, isCircle ? 'rounded-full' : 'rounded-md', className)}
      style={{
        width: width ?? (isCircle ? 40 : '100%'),
        height: height ?? (isCircle ? width ?? 40 : 16),
      }}
      aria-hidden="true"
    />
  );
}
