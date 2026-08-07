import React from 'react';
import { cn } from '../../lib/utils';

// ─── Bento ────────────────────────────────────────────────────────────────────
// Compass "Bento". BentoTile (690:2: Type KPI/Stat/Visual/CTA) + BentoGrid
// (692:321: Layout Hero/Symmetric/Showcase/Cluster/Editorial). A responsive bento
// grid + spanning tiles. Tiles are surface cards; span controls width/height.
// Light + dark.

export type BentoLayout = 'custom' | 'hero' | 'symmetric' | 'showcase';

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Base columns (default 4 on lg). Used when layout is 'custom' (the default). */
  columns?: number;
  /**
   * Layout preset. 'custom' (default) keeps the manual `columns` + per-tile span
   * model. 'hero' = one large lead tile + supporting tiles. 'symmetric' = even
   * grid. 'showcase' = wide feature row. (cluster/editorial: TODO — caller-driven.)
   */
  layout?: BentoLayout;
}
// Preset grid classes. Hero/symmetric implemented; showcase = wide feature columns.
const LAYOUT: Record<BentoLayout, string> = {
  custom: 'grid-cols-2',
  hero: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  symmetric: 'grid-cols-2 lg:grid-cols-3',
  showcase: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6',
};
export function BentoGrid({ columns = 4, layout = 'custom', className, style, ...props }: BentoGridProps) {
  return (
    <div
      className={cn('grid auto-rows-[minmax(120px,auto)] gap-4', LAYOUT[layout], className)}
      style={{ ...style, ['--bento-cols' as string]: columns }}
      {...props}
    />
  );
}

export type BentoTone = 'default' | 'cta';

export interface BentoTileProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  interactive?: boolean;
  /** Tone. 'default' = surface tile · 'cta' = brand-filled call-to-action tile. */
  tone?: BentoTone;
}
const COL: Record<number, string> = { 1: '', 2: 'sm:col-span-2', 3: 'sm:col-span-2 lg:col-span-3', 4: 'sm:col-span-2 lg:col-span-4' };
const ROW: Record<number, string> = { 1: '', 2: 'row-span-2' };
const TONE: Record<BentoTone, string> = {
  default: 'border border-stroke bg-surface',
  cta: 'border border-transparent bg-brand text-fg-on-brand',
};
export function BentoTile({ colSpan = 1, rowSpan = 1, interactive, tone = 'default', className, ...props }: BentoTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl p-5',
        TONE[tone],
        COL[colSpan],
        ROW[rowSpan],
        interactive && (tone === 'cta'
          ? 'cursor-pointer transition-shadow hover:shadow-md'
          : 'cursor-pointer transition-colors hover:border-stroke-strong hover:shadow-md'),
        className,
      )}
      {...props}
    />
  );
}
