import React from 'react';
import { cn } from '../../lib/utils';

// ─── Card ─────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Card Base" (664:50): Style Outlined/Filled/Elevated ×
// State Default/Hover/Selected/Disabled. Surface + border + radius, optional
// hover (interactive) and selected states. Mode-aware tokens → light + dark
// (white card in light, petrol card on slate in dark). Sub-parts: Header / Title /
// Description / Content / Footer.

export type CardStyleVariant = 'outlined' | 'filled' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  /** Visual style. outlined (default) = bordered surface · filled = secondary fill, no border · elevated = surface + shadow, subtle border. */
  styleVariant?: CardStyleVariant;
  /** Disabled visual — dims the card and removes hover affordances. */
  disabled?: boolean;
}

const CARD_STYLE: Record<CardStyleVariant, string> = {
  outlined: 'border border-stroke bg-surface shadow-sm',
  filled: 'border border-transparent bg-surface-secondary',
  elevated: 'border border-stroke-subtle bg-surface shadow-md',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, selected, styleVariant = 'outlined', disabled, ...props }, ref) => (
    <div
      ref={ref}
      aria-disabled={disabled || undefined}
      className={cn(
        'overflow-hidden rounded-xl',
        CARD_STYLE[styleVariant],
        interactive && !disabled && 'cursor-pointer transition-colors hover:border-stroke-strong hover:shadow-md',
        selected && !disabled && 'border-stroke-brand ring-1 ring-inset ring-stroke-brand',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />,
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn('text-[17px] font-semibold leading-snug tracking-tight text-fg', className)} {...props} />,
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn('text-body-sm text-fg-secondary', className)} {...props} />,
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />,
);
CardFooter.displayName = 'CardFooter';
