import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// ─── Radio ────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Radio Button" (602:137). Circle, selected = petrol border
// (bg/brand) + petrol inner dot, error/disabled. Native input (peer pattern).
// Light + dark.

export type RadioSize = 'sm' | 'md' | 'lg';
const BOX: Record<RadioSize, number> = { sm: 16, md: 20, lg: 24 };
const TXT: Record<RadioSize, string> = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[15px]' };

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: boolean;
  size?: RadioSize;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, error, size = 'md', disabled, ...props }, ref) => {
    const s = BOX[size];
    return (
      <label className={cn('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}>
        <input type="radio" ref={ref} disabled={disabled} aria-invalid={error || undefined} className="peer sr-only" {...props} />
        <span
          style={{ width: s, height: s }}
          className={cn(
            'relative grid shrink-0 place-items-center rounded-full border bg-surface transition-colors',
            '[&>.dot]:scale-0 peer-checked:[&>.dot]:scale-100',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500',
            error ? 'border-error-500' : 'border-stroke peer-checked:border-brand',
          )}
        >
          <span className="dot rounded-full bg-brand transition-transform" style={{ width: Math.round(s * 0.5), height: Math.round(s * 0.5) }} />
        </span>
        {label && <span className={cn('select-none text-fg', TXT[size])}>{label}</span>}
      </label>
    );
  },
);
Radio.displayName = 'Radio';
