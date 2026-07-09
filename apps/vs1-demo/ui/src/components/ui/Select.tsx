import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Select ───────────────────────────────────────────────────────────────────
// Mirrors the Compass "Select" (599:182). Styled like Text Input + a trailing
// chevron. Native <select> (accessible, keyboard, mobile-native dropdown). Size
// sm/md/lg, style outlined/filled, error/disabled. Light + dark.

export type SelectSize = 'sm' | 'md' | 'lg';

const SIZE: Record<SelectSize, string> = {
  sm: 'h-9 rounded-[6px] pl-3 pr-8 text-[13px]',
  md: 'h-11 rounded-lg pl-3.5 pr-9 text-[14px]',
  lg: 'h-[52px] rounded-lg pl-4 pr-10 text-[15px]',
};

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  inputSize?: SelectSize;
  variant?: 'outlined' | 'filled';
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, inputSize = 'md', variant = 'outlined', error, disabled, children, ...props }, ref) => (
    <div className={cn('relative w-full', className)}>
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(
          'w-full appearance-none border text-fg transition-colors focus:outline-none',
          SIZE[inputSize],
          variant === 'filled' ? 'bg-surface-secondary' : 'bg-surface',
          error
            ? 'border-error-500 bg-error-bg focus:ring-2 focus:ring-inset focus:ring-error-500/40 dark:bg-red-500/10'
            : 'border-stroke focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40',
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2', error ? 'text-error-500' : 'text-fg-tertiary')}
      />
    </div>
  ),
);
Select.displayName = 'Select';
