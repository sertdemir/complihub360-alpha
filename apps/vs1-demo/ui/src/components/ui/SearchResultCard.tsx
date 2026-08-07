import React from 'react';
import { ChevronRight, ClipboardCheck, FileText, User, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── SearchResultCard ─────────────────────────────────────────────────────────
// Mirrors the Compass "Search Result Card" set (673:188). One row in a mixed
// search-results list: a petrol icon container on the left, a small petrol
// type-tag pill + inline meta, then the title and a search-excerpt snippet, with
// a chevron-right affordance on the right. The whole card is interactive (hover
// lifts the surface to bg-secondary + shadow). Mode-aware tokens → light + dark.
//
// Type drives both the tag label and the lucide glyph:
//   audit → ClipboardCheck · document → FileText · contact → User · norm → Scale

export type SearchResultType = 'audit' | 'document' | 'contact' | 'norm';

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: LucideIcon }> = {
  audit: { label: 'AUDIT', icon: ClipboardCheck },
  document: { label: 'DOCUMENT', icon: FileText },
  contact: { label: 'CONTACT', icon: User },
  norm: { label: 'NORM', icon: Scale },
};

export interface SearchResultCardProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Result kind — drives the type-tag label and the leading icon. */
  type: SearchResultType;
  /** Result headline. */
  title: React.ReactNode;
  /** Search excerpt — may contain a highlighted term. Clamped to 2 lines. */
  snippet?: React.ReactNode;
  /** Inline context line, e.g. "Tax & VAT · DE · updated 3d ago". */
  meta?: React.ReactNode;
  className?: string;
}

export const SearchResultCard = React.forwardRef<HTMLButtonElement, SearchResultCardProps>(
  ({ type, title, snippet, meta, className, ...rest }, ref) => {
    const cfg = TYPE_CONFIG[type];
    const Glyph = cfg.icon;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'group flex w-full items-start gap-4 rounded-lg border border-stroke bg-surface p-5 text-left',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2',
          'hover:bg-surface-secondary hover:shadow-md',
          className,
        )}
        {...rest}
      >
        {/* Icon container — petrol tint square */}
        <span
          className="flex shrink-0 items-center justify-center rounded-md bg-brand-light text-fg-brand"
          style={{ width: 48, height: 48 }}
          aria-hidden="true"
        >
          <Glyph size={24} strokeWidth={2} />
        </span>

        {/* Content */}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
          {/* Type tag + inline meta */}
          <span className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-[4px] bg-brand-light px-2 py-[2px] text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-fg-brand">
              {cfg.label}
            </span>
            {meta && (
              <span className="truncate text-[11px] leading-none text-fg-secondary">{meta}</span>
            )}
          </span>

          {/* Title */}
          <span className="truncate text-[15px] font-semibold leading-snug text-fg">{title}</span>

          {/* Snippet */}
          {snippet && (
            <span className="line-clamp-2 text-[13px] leading-relaxed text-fg-secondary">{snippet}</span>
          )}
        </span>

        {/* Chevron affordance */}
        <span className="flex shrink-0 items-center self-center text-fg-tertiary transition-colors group-hover:text-fg-brand" aria-hidden="true">
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      </button>
    );
  },
);
SearchResultCard.displayName = 'SearchResultCard';
