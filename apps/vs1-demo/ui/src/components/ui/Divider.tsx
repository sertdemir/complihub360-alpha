import React from 'react';
import { cn } from '../../lib/utils';

// ─── Divider ──────────────────────────────────────────────────────────────────
// Mirrors the Compass "Divider" (531:2). Horizontal / vertical, solid / dashed /
// dotted, with a color axis (default / subtle / strong / brand) and an optional
// centered label. Token borders (border-stroke*) → light + dark.

export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerColor = 'default' | 'subtle' | 'strong' | 'brand';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: DividerVariant;
  color?: DividerColor;
  label?: React.ReactNode;
  className?: string;
}

const BORDER_COLOR: Record<DividerColor, string> = {
  default: 'border-stroke',
  subtle: 'border-stroke-subtle',
  strong: 'border-stroke-strong',
  brand: 'border-stroke-brand',
};

// For the solid fill-based line we map to bg-* tokens.
const BG_COLOR: Record<DividerColor, string> = {
  default: 'bg-stroke',
  subtle: 'bg-stroke-subtle',
  strong: 'bg-stroke-strong',
  brand: 'bg-stroke-brand',
};

export function Divider({
  orientation = 'horizontal',
  variant = 'solid',
  color = 'default',
  label,
  className,
}: DividerProps) {
  const dashed = variant === 'dashed';
  const dotted = variant === 'dotted';
  const isBordered = dashed || dotted;
  const borderStyle = dashed ? 'border-dashed' : dotted ? 'border-dotted' : '';

  // Horizontal line classes (used for label segments + plain horizontal).
  const hLine = isBordered
    ? cn('border-t', borderStyle, BORDER_COLOR[color])
    : BG_COLOR[color];

  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          'inline-block self-stretch',
          isBordered ? cn('border-l', borderStyle, BORDER_COLOR[color]) : cn('w-px', BG_COLOR[color]),
          className,
        )}
      />
    );
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <span className={cn('h-px flex-1', hLine)} />
        <span className="text-[12px] font-medium text-fg-tertiary">{label}</span>
        <span className={cn('h-px flex-1', hLine)} />
      </div>
    );
  }

  return <div role="separator" className={cn('h-px w-full', hLine, className)} />;
}
