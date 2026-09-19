import { motion } from 'framer-motion';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { type ReactNode } from 'react';
import { Typography } from '../ui/Typography';

// ─── Shared section scaffolding for the Providers landing page ───────────────
// Mirrors the Figma "Section Header" frame used across S1–S6:
// eyebrow (uppercase caption) → serif headline (one gold-highlighted word) → lead copy.

// ─── Scroll-reveal primitives (shared across all provider sections) ──────────
// `Reveal` fades + lifts a block into view once; `Stagger`/`StaggerItem` reveal a
// group of children sequentially (cards, feature columns). Tuned soft + once-only.

export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  // See the comment on useInViewOnce: a wrapper that renders its children at
  // opacity 0 must use a hook that always reaches true.
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-80px');
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className = '',
  stagger = 0.1,
  margin = '-80px',
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  margin?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: margin as never }}
    >
      {children}
    </motion.div>
  );
}

const staggerItemVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} transition={{ duration: 0.5, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

export function SectionEyebrow({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'inverse';
  className?: string;
}) {
  // The leading dot is GONE (user decision 2026-08-24): every eyebrow opens on
  // the word alone, as the area hero always did. The `dot` prop went with it —
  // an opt-out nobody can reach cannot drift back in.
  // Semantic tokens, not raw palette steps: the palette classes are fixed
  // values and do not flip with the theme, which left every eyebrow at a
  // 1.01 contrast ratio on dark surfaces — text-primary-600 (#002E26) sitting
  // on the dark hero (#1F2937). The fg-* tokens carry a dark override
  // (brand -> #2CC0AD, tertiary -> #6B7A80) and stay on the same brand colours
  // in light mode. `inverse` keeps its literal white: it is meant for photo
  // and colour-block overlays, where the surface is dark in either theme.
  const toneClass = {
    neutral: 'text-fg-tertiary',
    brand: 'text-fg-brand',
    accent: 'text-fg-accent',
    inverse: 'text-white/70',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 text-caption font-sans font-semibold uppercase tracking-[0.14em] ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Highlights exactly one word in a serif headline with the Accent-Gold treatment,
 * per the C360 "gold word-highlight" pattern.
 *
 * Der Ton ist ein semantisches Token, keine Palettenklasse: fg-accent-emphasis
 * traegt seit der Nutzer-Festlegung vom 2026-09-19 exakt das Logo-Gold der
 * Wortmarken-"360" (#C5913B) — in beiden Themes derselbe Wert, damit das
 * hervorgehobene Wort und das Logo im selben Messing stehen. Vorher lief hier
 * die Oliv-Stufe gold-700 (#96802a), rechnerisch kontrastreicher, im Blattbild
 * aber stumpf neben der Marke.
 *
 * DISPLAY-ONLY per Vertrag, und schaerfer als vorher: 2,80:1 auf Weiss liegt
 * unter der AA-large-Schwelle (3:1) — bewusst getragen, weil die Marke hier
 * vorgeht. Deshalb nur an Woertern ab ~24 px (bzw. 19 px bold) einsetzen, nie
 * an Fliesstext (dort text-fg-brand) und nie an Kleintext oder Eyebrows (dort
 * text-fg-accent-strong, #8C672A / 5,14:1).
 */
export function GoldWord({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap text-fg-accent-emphasis">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  eyebrowTone = 'neutral',
  title,
  lead,
  align = 'center',
  inverse = false,
  className = '',
}: {
  eyebrow?: React.ReactNode;
  eyebrowTone?: 'neutral' | 'brand' | 'accent' | 'inverse';
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'center' | 'left';
  inverse?: boolean;
  className?: string;
}) {
  // See the comment on useInViewOnce: a wrapper that renders its children at
  // opacity 0 must use a hook that always reaches true.
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-80px');
  const alignClass = align === 'center' ? 'items-center text-center mx-auto' : 'items-start text-left';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex flex-col ${alignClass} max-w-3xl gap-4 ${className}`}
    >
      {eyebrow && <SectionEyebrow tone={inverse ? 'inverse' : eyebrowTone}>{eyebrow}</SectionEyebrow>}
      <Typography
        variant="h2"
        weight="semibold"
        className={`!text-[2rem] leading-tight tracking-tight ${inverse ? 'text-white' : 'text-neutral-900'}`}
      >
        {title}
      </Typography>
      {lead && (
        <Typography
          variant="body"
          className={`text-lg leading-relaxed ${inverse ? 'text-white/80' : 'text-neutral-600'}`}
        >
          {lead}
        </Typography>
      )}
    </motion.div>
  );
}

/** Centered italic closing note used at the bottom of most provider sections. */
export function SectionNote({
  children,
  inverse = false,
}: {
  children: React.ReactNode;
  inverse?: boolean;
}) {
  return (
    <p
      className={`mx-auto max-w-2xl text-center text-ui-small italic leading-relaxed ${
        inverse ? 'text-white/60' : 'text-neutral-500'
      }`}
    >
      {children}
    </p>
  );
}
