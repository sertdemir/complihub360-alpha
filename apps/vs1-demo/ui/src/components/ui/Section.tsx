import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Container, type ContainerSize } from './Container';

// ─── Compass Section ──────────────────────────────────────────────────────────
// Full-bleed band (tone background spans 100% viewport width) with a centered
// Container for content. Vertical rhythm follows Compass section spacing (64–96px).
// Optional scroll-reveal. Surface doctrine: marketing=default(white), dashboard=
// secondary(neutral), wizard/brand=brand(petrol), inverse=dark.

export type SectionTone = 'default' | 'secondary' | 'tertiary' | 'brand' | 'inverse';
export type SectionSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const toneMap: Record<SectionTone, string> = {
  default: 'bg-surface',
  secondary: 'bg-surface-secondary',
  tertiary: 'bg-surface-tertiary',
  brand: 'bg-brand text-fg-on-brand',
  inverse: 'bg-surface-inverse text-fg-inverse',
};

const spacingMap: Record<SectionSpacing, string> = {
  none: '',
  sm: 'py-12',
  md: 'py-16 lg:py-20',
  lg: 'py-16 lg:py-24', // Compass section spacing 64 → 96
  xl: 'py-24 lg:py-32',
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Background surface per the Compass surface doctrine. */
  tone?: SectionTone;
  /** Content max-width (passed to the inner Container). */
  size?: ContainerSize;
  /** Vertical section padding. */
  spacing?: SectionSpacing;
  /** Animate content in on scroll (default true). */
  reveal?: boolean;
  /** Render the band edge-to-edge with NO inner Container (caller adds its own). */
  bleed?: boolean;
  /** Extra classes on the inner Container. */
  containerClassName?: string;
}

export function Section({
  tone = 'default',
  size = 'xl',
  spacing = 'lg',
  reveal = true,
  bleed = false,
  className = '',
  containerClassName = '',
  children,
  ...props
}: SectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const inner = bleed ? (
    children
  ) : (
    <Container size={size} className={containerClassName}>
      {children}
    </Container>
  );

  return (
    <section className={`${toneMap[tone]} ${spacingMap[spacing]} ${className}`.trim()} {...props}>
      {reveal ? (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {inner}
        </motion.div>
      ) : (
        inner
      )}
    </section>
  );
}
