import React from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'info' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner, disables interaction, and preserves the button width. */
  loading?: boolean;
  /** Icon rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Icon rendered after the label. */
  iconRight?: React.ReactNode;
  /** Square icon-only button. Requires `aria-label`. */
  iconOnly?: boolean;
}

// Inline spinner that inherits the button's text color (currentColor) so it
// stays legible across every variant. Static stroke — no var-color opacity.
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      iconLeft,
      iconRight,
      iconOnly = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md';

    // NOTE: explicit px heights — the project's custom spacing scale maps
    // spacing['10']='64px', which would make h-8/h-10/h-12 = 40/64/96px.
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-[32px] px-3 text-body-sm', // 32px height
      md: 'h-[40px] px-4 text-body-sm', // 40px height
      lg: 'h-[48px] px-6 text-body', // 48px height
    };

    // Square padding for icon-only — keep height === width.
    const iconOnlySizeClasses: Record<ButtonSize, string> = {
      sm: 'h-[32px] w-[32px] p-0 text-body-sm',
      md: 'h-[40px] w-[40px] p-0 text-body-sm',
      lg: 'h-[48px] w-[48px] p-0 text-body',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500',
      secondary:
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300 focus:ring-neutral-500 dark:bg-white/10 dark:text-white dark:hover:bg-white/[0.16] dark:active:bg-white/20',
      outline:
        'border-medium border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 focus:ring-neutral-500 dark:border-white/25 dark:text-white dark:hover:bg-white/10',
      ghost:
        'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-500 dark:text-neutral-200 dark:hover:bg-white/10',
      danger: 'bg-error-500 text-white hover:bg-error-700 active:bg-error-800 focus:ring-error-500',
      // Static emerald — var-color opacity is broken in this project.
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500',
      // Static sky.
      info: 'bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 focus:ring-sky-500',
      // Gold CTA (Compass Button Style=Accent) — Verified-Partner / monetization
      // moments ("View ranking impact", "Explore expansion"). Dark text #101411
      // for contrast on gold; pressed = darker gold (interactive/accent-active).
      accent:
        'bg-[#d4af37] text-[#101411] hover:bg-[#e6a514] active:bg-[#96802a] focus:ring-[#d4af37] dark:hover:bg-[#e6a514] dark:active:bg-[#bca033]',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    const combinedClasses = cn(
      baseClasses,
      iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
      variantClasses[variant],
      widthClass,
      className,
    );

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={combinedClasses}
        {...props}
      >
        {loading ? (
          <>
            <ButtonSpinner />
            {!iconOnly && children != null && <span>{children}</span>}
          </>
        ) : (
          <>
            {iconLeft != null && <span className="inline-flex shrink-0">{iconLeft}</span>}
            {!iconOnly && children}
            {iconOnly && children}
            {iconRight != null && <span className="inline-flex shrink-0">{iconRight}</span>}
          </>
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';
