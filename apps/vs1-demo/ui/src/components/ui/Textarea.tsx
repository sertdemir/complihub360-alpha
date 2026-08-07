import React from 'react';
import { cn } from '../../lib/utils';

// ─── Textarea ─────────────────────────────────────────────────────────────────
// Mirrors the Compass "Textarea" (598:38). Size SM/MD/LG, states default·focus·
// error·disabled. Mode-aware tokens → light + dark.

export type TextareaSize = 'sm' | 'md' | 'lg';

const SIZE: Record<TextareaSize, string> = {
  sm: 'rounded-[6px] px-3 py-2 text-[13px]',
  md: 'rounded-lg px-3.5 py-2.5 text-[14px]',
  lg: 'rounded-lg px-4 py-3 text-[15px]',
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  inputSize?: TextareaSize;
  variant?: 'outlined' | 'filled';
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputSize = 'md', variant = 'outlined', error, disabled, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={error || undefined}
      className={cn(
        'w-full border text-fg transition-colors placeholder:text-fg-tertiary focus:outline-none',
        SIZE[inputSize],
        variant === 'filled' ? 'bg-surface-secondary' : 'bg-surface',
        error
          ? 'border-error-500 bg-error-bg focus:ring-2 focus:ring-inset focus:ring-error-500/40 dark:bg-red-500/10'
          : 'border-stroke focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40',
        disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
