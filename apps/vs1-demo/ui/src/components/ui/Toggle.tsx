import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

// ─── Toggle (Switch) ──────────────────────────────────────────────────────────
// Mirrors the Compass "Toggle" (603:155). Track 36×20 (sm 32×18 / lg 44×24), off =
// grey track, on = petrol (bg/brand), white thumb. Native checkbox with
// role="switch" (peer pattern). Light + dark.

export type ToggleSize = 'sm' | 'md' | 'lg';
const T: Record<ToggleSize, { w: number; h: number; th: number; on: string }> = {
  sm: { w: 32, h: 18, th: 14, on: 'peer-checked:[&>.thumb]:translate-x-[14px]' },
  md: { w: 36, h: 20, th: 16, on: 'peer-checked:[&>.thumb]:translate-x-[16px]' },
  lg: { w: 44, h: 24, th: 20, on: 'peer-checked:[&>.thumb]:translate-x-[20px]' },
};
const TXT: Record<ToggleSize, string> = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[15px]' };

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: boolean;
  size?: ToggleSize;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, error, size = 'md', disabled, ...props }, ref) => {
    const t = T[size];
    return (
      <label className={cn('inline-flex items-center gap-2.5', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}>
        <input type="checkbox" role="switch" ref={ref} disabled={disabled} aria-invalid={error || undefined} className="peer sr-only" {...props} />
        <span
          style={{ width: t.w, height: t.h }}
          className={cn(
            'relative shrink-0 rounded-full transition-colors',
            error ? 'bg-error-500' : 'bg-stroke peer-checked:bg-brand',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-primary-500',
            t.on,
          )}
        >
          <span
            className="thumb absolute left-[2px] top-[2px] rounded-full bg-white shadow transition-transform"
            style={{ width: t.th, height: t.th }}
          />
        </span>
        {label && <span className={cn('select-none text-fg', TXT[size])}>{label}</span>}
      </label>
    );
  },
);
Toggle.displayName = 'Toggle';
