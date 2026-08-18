import React from 'react';
import { cn } from '../../lib/utils';

type TypographyVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'ui-small' | 'caption';
type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /** The semantic text variant matching the Figma defined scales */
  variant?: TypographyVariant;
  /** The specific weight to apply */
  weight?: TypographyWeight;
  /** The component to render as (e.g. h1, p, span). Defaults based on variant. */
  as?: React.ElementType;
  /** Custom color classes, defaults to text-neutral-900 or relative default */
  className?: string;
  children: React.ReactNode;
}

const variantMapping: Record<TypographyVariant, string> = {
  display: 'text-display font-serif',
  h1: 'text-h1 font-serif',
  h2: 'text-h2 font-serif',
  h3: 'text-h3 font-serif',
  body: 'text-body font-sans',
  'ui-small': 'text-ui-small font-sans',
  caption: 'text-caption font-sans uppercase tracking-wider',
};

const defaultComponentMapping: Record<TypographyVariant, React.ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  'ui-small': 'span',
  caption: 'span',
};

const weightMapping: Record<TypographyWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  weight = 'regular',
  as,
  className = '',
  children,
  ...props
}) => {
  const Component = as || defaultComponentMapping[variant];
  
  // Base text color default assignment
  let defaultColor = 'text-neutral-900';
  if (variant === 'body') defaultColor = 'text-neutral-900';
  else if (variant === 'caption' || variant === 'ui-small') defaultColor = 'text-neutral-600';

  // cn() (tailwind-merge) resolves conflicts by LAST-WINS, so `className`
  // reliably overrides the variant/weight/colour defaults. Plain string
  // concatenation left both classes on the element and handed the decision to
  // Tailwind's stylesheet order — which is why `className="text-error-700"`
  // used to lose against the built-in `text-neutral-600`.
  const combinedClasses = cn(variantMapping[variant], weightMapping[weight], defaultColor, className);

  return (
    <Component className={combinedClasses} {...props}>
      {children}
    </Component>
  );
};
