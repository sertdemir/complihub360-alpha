import React from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'info' | 'accent'
  // The two shapes the marketing dark bands repeat. Those grounds paint a fixed
  // dark hex and do NOT flip with the theme, so a token that resolves to petrol
  // in light would vanish there. These variants stay fixed on purpose.
  | 'inverse' | 'inverseOutline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
/** Corner language. `md` = 6px (app surfaces), `soft` = 12px (marketing CTAs). */
export type ButtonShape = 'md' | 'soft';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Corner radius language. Defaults to `md` (6px) so every existing app
   * surface is untouched. The marketing pages speak `soft` (12px) — that
   * difference is why they hand-built their CTAs instead of using this.
   */
  shape?: ButtonShape;
  fullWidth?: boolean;
  /** Shows a spinner, disables interaction, and preserves the button width. */
  loading?: boolean;
  /** Icon rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Icon rendered after the label. */
  iconRight?: React.ReactNode;
  /** Square icon-only button. Requires `aria-label`. */
  iconOnly?: boolean;
  /**
   * Allow the label to wrap onto several lines and let the button grow with
   * it. Off by default (single line, fixed height) so app surfaces keep their
   * rhythm. Marketing CTAs need it: translated labels are longer than the
   * English original and wrap at hero widths.
   */
  wrap?: boolean;
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
      shape = 'md',
      fullWidth = false,
      loading = false,
      iconLeft,
      iconRight,
      iconOnly = false,
      wrap = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

      const shapeClasses: Record<ButtonShape, string> = {
        md: 'rounded-md',
        soft: 'rounded-xl',
      };

    // NOTE: explicit px heights — the project's custom spacing scale maps
    // spacing['10']='64px', which would make h-8/h-10/h-12 = 40/64/96px.
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-[32px] px-3 text-body-sm', // 32px height
      md: 'h-[40px] px-4 text-body-sm', // 40px height
      lg: 'h-[48px] px-6 text-body', // 48px height
      // Marketing hero / section CTA. Measured off the hand-built originals:
      // px-8 py-4 on 16px/1.5 text renders 56px tall.
      // min-h, not h: a wrapped label must push the button taller.
      xl: 'min-h-[56px] px-8 py-4 text-body',
    };

      // Wrapping labels cannot live inside a fixed height. Same rhythm as above,
      // expressed as padding + a floor, so the box grows with the third line a
      // German or Turkish label needs.
      const wrapSizeClasses: Record<ButtonSize, string> = {
        sm: 'min-h-[32px] px-3 py-1.5 text-body-sm',
        md: 'min-h-[40px] px-4 py-2 text-body-sm',
        lg: 'min-h-[48px] px-6 py-3 text-body',
        xl: 'min-h-[56px] px-8 py-4 text-body',
      };

    // Square padding for icon-only — keep height === width.
    const iconOnlySizeClasses: Record<ButtonSize, string> = {
      sm: 'h-[32px] w-[32px] p-0 text-body-sm',
      md: 'h-[40px] w-[40px] p-0 text-body-sm',
      lg: 'h-[48px] w-[48px] p-0 text-body',
      xl: 'h-[56px] w-[56px] p-0 text-body',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      // The primary CTA follows the brand token, so it is petrol #004d40 in light
      // and teal #14a89a in dark. It used to be that teal pinned in BOTH modes,
      // which put a colour on light pages that exists in no light token — and at
      // 2.96:1 against a white page it missed the 3:1 WCAG 1.4.11 asks of a
      // control's surface. On the token it reads 9.83 light / 4.96 dark, and the
      // label follows too: white on petrol (9.83), ink on teal (6.75).
      // Grounds that do NOT flip (the auth and onboarding pages paint a dark hex
      // without a .dark class) must use bg-brand-fixed instead — this token would
      // resolve to petrol there and vanish.
      primary: 'bg-brand text-fg-on-brand hover:brightness-95 active:brightness-90 focus:ring-stroke-focus',
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
        // Inverted CTA on a dark band: white plate, petrol label.
        inverse:
          'bg-white text-primary-900 shadow-lg hover:bg-surface-tertiary focus:ring-white',
        // Its quiet sibling on the same band.
        inverseOutline:
          'border-2 border-primary-400 bg-transparent text-white hover:bg-primary-800 focus:ring-primary-400',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    const combinedClasses = cn(
      baseClasses,
      shapeClasses[shape],
      wrap ? 'text-center' : 'whitespace-nowrap',
      iconOnly ? iconOnlySizeClasses[size] : wrap ? wrapSizeClasses[size] : sizeClasses[size],
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
