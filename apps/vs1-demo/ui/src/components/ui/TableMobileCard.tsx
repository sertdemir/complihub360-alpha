import React from 'react';
import { cn } from '../../lib/utils';

// ─── TableMobileCard ────────────────────────────────────────────────────────────
// Compass "Table Mobile Card" (804:504). DOCTRINE: on mobile there is NO
// horizontal-scroll table — every audit row collapses into a stacked card. A bold
// title line, then a definition-list of label→value pairs (label tertiary/left,
// value fg/right-aligned). Risk renders as a RiskBadge in the value slot. Selected
// = petrol border + ring + brand-light tint (multi-select for bulk actions). Pairs
// with MobileSortBar above the list. Light + dark.

export interface TableMobileCardField {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface TableMobileCardProps {
  /** Stacked label→value pairs (definition list). */
  fields: TableMobileCardField[];
  /** Prominent first line (e.g. the audit / obligation name). */
  title?: React.ReactNode;
  /** Selected (bulk-select) state — petrol border + brand-light tint. */
  selected?: boolean;
  /** Render a leading checkbox in the title row. */
  selectable?: boolean;
  /** Fires when the leading checkbox changes. */
  onSelect?: (selected: boolean) => void;
  /** Makes the whole card clickable (row drill-in). */
  onClick?: () => void;
  className?: string;
}

export function TableMobileCard({
  fields,
  title,
  selected = false,
  selectable = false,
  onSelect,
  onClick,
  className,
}: TableMobileCardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-pressed={interactive ? selected : undefined}
      className={cn(
        'rounded-xl border bg-surface p-4 transition-colors',
        selected
          ? 'border-stroke-brand ring-1 ring-stroke-brand bg-brand-light'
          : 'border-stroke',
        interactive && 'cursor-pointer hover:border-stroke-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-brand',
        className,
      )}
    >
      {/* Title row */}
      {(title || selectable) && (
        <div className="mb-3 flex items-start gap-2.5">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onSelect?.(e.target.checked)}
              aria-label="Select row"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-bg-brand)]"
            />
          )}
          {title && (
            <div className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-fg">
              {title}
            </div>
          )}
        </div>
      )}

      {/* Definition list of label → value pairs */}
      <dl className="space-y-2.5">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-xs text-fg-tertiary">{f.label}</dt>
            <dd className="min-w-0 text-right text-sm text-fg">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
