import React from 'react';
import { cn } from '../../lib/utils';

// ─── Input ────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Text Input" (597:2). Size SM/MD/LG (h36/44/52, radius
// 6/8/8), Style outlined / filled, States default·focus·error·disabled, optional
// left/right icons. Mode-aware tokens (border-stroke / bg-surface / text-fg) →
// light + dark; statics get dark: variants. Forwards the ref to the inner <input>.

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outlined' | 'filled';

const SIZE: Record<InputSize, string> = {
  sm: 'h-9 rounded-[6px] px-3 gap-1.5 text-[13px]',
  md: 'h-11 rounded-lg px-3.5 gap-2 text-[14px]',
  lg: 'h-[52px] rounded-lg px-4 gap-2.5 text-[15px]',
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  variant?: InputVariant;
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', variant = 'outlined', error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex w-full items-center border transition-colors',
          SIZE[inputSize],
          variant === 'filled' ? 'bg-surface-secondary' : 'bg-surface',
          error
            ? 'border-error-500 bg-error-bg focus-within:ring-2 focus-within:ring-inset focus-within:ring-error-500/40 dark:bg-red-500/10'
            : 'border-stroke focus-within:border-stroke-focus focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500/35 dark:focus-within:ring-emerald-500/40',
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
          className,
        )}
      >
        {leftIcon && <span className={cn('shrink-0', error ? 'text-error-500' : 'text-fg-tertiary')}>{leftIcon}</span>}
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={error || undefined}
          className="h-full w-full bg-transparent text-fg placeholder:text-fg-tertiary focus:outline-none disabled:cursor-not-allowed"
          {...props}
        />
        {rightIcon && <span className={cn('shrink-0', error ? 'text-error-500' : 'text-fg-tertiary')}>{rightIcon}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
