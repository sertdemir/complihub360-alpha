import { cn } from '../../lib/utils';

// ─── RiskBadge ────────────────────────────────────────────────────────────────
// Compass "⚠️ Risk Badge" (Figma node 726:2). The brand-critical component.
// DOCTRINE: risk is shown in PETROL, never red. Escalation happens through
// lightness on a single petrol hue — low (lightest) → critical (deepest) — so
// the system reads as calm and controllable even at critical severity.
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
// Solid text: dark on the light Low fill, white on the darker Medium/High/Critical fills.
const SOLID_TEXT: Record<RiskLevel, string> = {
  low: 'text-[#0f172a]',
  medium: 'text-white',
  high: 'text-white',
  critical: 'text-white',
};
const SOFT_BG: Record<RiskLevel, string> = {
  low: 'bg-risk-low-bg',
  medium: 'bg-risk-medium-bg',
  high: 'bg-risk-high-bg',
  critical: 'bg-risk-critical-bg',
};
// Soft / Outline / Dot text + border + dot all use the level colour itself —
// intentionally subtle at Low, strong at Critical (the lightness escalation).
const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: 'text-risk-low',
  medium: 'text-risk-medium',
  high: 'text-risk-high',
  critical: 'text-risk-critical',
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
      ? cn(s.box, SOLID_BG[level], SOLID_TEXT[level])
      : styleVariant === 'soft'
        ? cn(s.box, SOFT_BG[level], LEVEL_TEXT[level])
        : cn(s.box, 'border bg-transparent', LEVEL_BORDER[level], LEVEL_TEXT[level]); // outline

  return <span className={cn(base, treatment, className)}>{children}</span>;
}

// ─── RiskDot ──────────────────────────────────────────────────────────────────
// The minimal indicator — a single petrol dot for very dense tables / status
// strips. Critical keeps a petrol outer halo for extra attention (never red).
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
        level === 'critical' && 'shadow-[0_0_0_3px_rgb(var(--color-risk-low-bg))]',
        className,
      )}
      style={{ height: size, width: size }}
      {...rest}
    />
  );
}
