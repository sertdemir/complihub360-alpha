import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Pagination ───────────────────────────────────────────────────────────────
// Mirrors the Compass "Pagination" (561:310). Type Numbers / Dots / Simple.
//  · numbers (default) — prev / numbered pages (with ellipsis) / next
//  · dots    — a row of dot indicators (active = brand fill)
//  · simple  — ‹ Prev / "Page X of Y" / Next ›
// Active page = petrol (brand). Light + dark.

export type PaginationType = 'numbers' | 'dots' | 'simple';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  /** Visual style of the control. */
  type?: PaginationType;
  /** Pages shown around the current one before collapsing to ellipsis. */
  siblings?: number;
  className?: string;
}

function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  type = 'numbers',
  siblings = 1,
  className,
}: PaginationProps) {
  const go = (p: number) => p >= 1 && p <= totalPages && p !== page && onPageChange?.(p);

  if (type === 'simple') {
    return (
      <nav aria-label="Pagination" className={cn('flex items-center gap-3', className)}>
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-fg-secondary transition-colors hover:bg-surface-secondary hover:text-fg disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="text-[13px] font-medium text-fg-secondary">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-fg-secondary transition-colors hover:bg-surface-secondary hover:text-fg disabled:pointer-events-none disabled:opacity-40"
        >
          Next <ChevronRight size={16} />
        </button>
      </nav>
    );
  }

  if (type === 'dots') {
    return (
      <nav aria-label="Pagination" className={cn('flex items-center gap-2', className)}>
        {range(1, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              p === page ? 'bg-brand' : 'bg-neutral-300 hover:bg-neutral-400 dark:bg-white/20 dark:hover:bg-white/30',
            )}
          />
        ))}
      </nav>
    );
  }

  const items: (number | 'dots')[] = [];
  const left = Math.max(2, page - siblings);
  const right = Math.min(totalPages - 1, page + siblings);
  items.push(1);
  if (left > 2) items.push('dots');
  for (const p of range(left, right)) if (p > 1 && p < totalPages) items.push(p);
  if (right < totalPages - 1) items.push('dots');
  if (totalPages > 1) items.push(totalPages);

  const cell = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] font-medium transition-colors';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(cell, 'text-fg-secondary hover:bg-surface-secondary hover:text-fg disabled:pointer-events-none disabled:opacity-40')}
      >
        <ChevronLeft size={16} />
      </button>
      {items.map((it, i) =>
        it === 'dots' ? (
          <span key={`d${i}`} className="grid h-9 w-9 place-items-center text-fg-tertiary">…</span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => go(it)}
            aria-current={it === page ? 'page' : undefined}
            className={cn(cell, it === page ? 'bg-brand text-fg-on-brand' : 'text-fg-secondary hover:bg-surface-secondary hover:text-fg')}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(cell, 'text-fg-secondary hover:bg-surface-secondary hover:text-fg disabled:pointer-events-none disabled:opacity-40')}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
