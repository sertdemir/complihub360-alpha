import { cn } from '../../lib/utils';

// ─── RiskBadge ────────────────────────────────────────────────────────────────
// Compass "⚠️ Risk Badge" (Figma node 726:2). The brand-critical component.
// Risk is a TRAFFIC LIGHT — green · yellow · orange · red — carried entirely by
// --color-risk-* so both themes flip on their own. (This replaced the earlier
// petrol-only doctrine; the tokens hold the reasoning and the measurements.)
// Colour never carries the meaning alone: every variant except RiskDot renders
// a label, and RiskDot takes an aria-label. Under deuteranopia the four accents
// separate by only ΔE 7.1 in light mode — the word is what the reader relies on.
// 48 variants = 4 Risk × 4 Style × 3 Size, plus the standalone RiskDot (4).

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskStyle = 'solid' | 'soft' | 'outline' | 'dot';
export type RiskSize = 'sm' | 'md' | 'lg';

const SIZE: Record<RiskSize, { box: string; text: string; radius: string; dot: string; gap: string }> = {
  sm: { box: 'px-[6px] py-[3px]', text: 'text-[11px]', radius: 'rounded-[4px]', dot: 'h-[6px] w-[6px]', gap: 'gap-[4px]' },
  md: { box: 'px-[8px] py-[4px]', text: 'text-[12px]', radius: 'rounded-[6px]', dot: 'h-[8px] w-[8px]', gap: 'gap-[6px]' },
  lg: { box: 'px-[10px] py-[6px]', text: 'text-[14px]', radius: 'rounded-[6px]', dot: 'h-[10px] w-[10px]', gap: 'gap-[6px]' },
};

const SOLID_BG: Record<RiskLevel, string> = {
  low: 'bg-risk-low',
  medium: 'bg-risk-medium',
  high: 'bg-risk-high',
  critical: 'bg-risk-critical',
};
// Solid text is uniform now, because the accents were chosen to make it so: in
// light mode every fill clears 4.5:1 against WHITE (4.92-10.02), in dark mode
// every fill clears it against INK (6.45-11.66). The accent's own AA requirement
// as outline text and its requirement as a solid fill are the same ratio, so one
// pair of text colours covers all four levels.
const SOLID_TEXT = 'text-white dark:text-[#0f172a]';
const SOFT_BG: Record<RiskLevel, string> = {
  low: 'bg-risk-low-bg',
  medium: 'bg-risk-medium-bg',
  high: 'bg-risk-high-bg',
  critical: 'bg-risk-critical-bg',
};
// Outline + Dot text use the level colour itself. Each accent clears 4.5:1 on
// the page in both themes (worst 4.72, medium on --color-bg-secondary).
const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
  critical: 'text-risk-critical',
};
// Soft text is NOT the level colour: the accent on its own tint is unreadable
// (a green-700 on a green-200 tint measures 1.5:1). --color-risk-text-on-*
// exists for exactly this pairing and clears >=6.92:1 in light, >=5.28:1 in dark.
const SOFT_TEXT: Record<RiskLevel, string> = {
  low: 'text-risk-on-low',
  medium: 'text-risk-on-medium',
  high: 'text-risk-on-high',
  critical: 'text-risk-on-critical',
};
const LEVEL_BORDER: Record<RiskLevel, string> = {
  low: 'border-risk-low',
  medium: 'border-risk-medium',
  high: 'border-risk-high',
  critical: 'border-risk-critical',
};
const LEVEL_DOT: Record<RiskLevel, string> = {
  low: 'bg-risk-low',
  medium: 'bg-risk-medium',
  high: 'bg-risk-high',
  critical: 'bg-risk-critical',
};

export interface RiskBadgeProps {
  level?: RiskLevel;
  styleVariant?: RiskStyle;
  size?: RiskSize;
  className?: string;
  children: React.ReactNode;
}

export function RiskBadge({
  level = 'medium',
  styleVariant = 'soft',
  size = 'md',
  className,
  children,
}: RiskBadgeProps) {
  const s = SIZE[size];
  const base = cn(
    'inline-flex items-center justify-center whitespace-nowrap font-sans font-semibold leading-none tracking-[0.02em]',
    s.text,
    s.radius,
  );

  if (styleVariant === 'dot') {
    return (
      <span className={cn(base, s.gap, 'text-fg', className)}>
        <span className={cn('shrink-0 rounded-full', s.dot, LEVEL_DOT[level])} />
        {children}
      </span>
    );
  }

  const treatment =
    styleVariant === 'solid'
      ? cn(s.box, SOLID_BG[level], SOLID_TEXT)
      : styleVariant === 'soft'
        ? cn(s.box, SOFT_BG[level], SOFT_TEXT[level])
        : cn(s.box, 'border bg-transparent', LEVEL_BORDER[level], LEVEL_TEXT[level]); // outline

  return <span className={cn(base, treatment, className)}>{children}</span>;
}

// ─── RiskDot ──────────────────────────────────────────────────────────────────
// The minimal indicator — a single dot for very dense tables / status strips.
// Critical keeps an outer halo for extra attention. The halo is drawn in
// Critical's OWN tint: it used to reach for --color-risk-low-bg, which under the
// traffic light would have ringed a red dot in green.
// This is the one variant with no label, so it requires an aria-label.
export interface RiskDotProps {
  level?: RiskLevel;
  /** Dot diameter in px (default 10). */
  size?: number;
  className?: string;
  'aria-label'?: string;
}

export function RiskDot({ level = 'medium', size = 10, className, ...rest }: RiskDotProps) {
  return (
    <span
      role="img"
      className={cn(
        'inline-block shrink-0 rounded-full',
        LEVEL_DOT[level],
        level === 'critical' && 'shadow-[0_0_0_3px_rgb(var(--color-risk-critical-bg))]',
        className,
      )}
      style={{ height: size, width: size }}
      {...rest}
    />
  );
}
