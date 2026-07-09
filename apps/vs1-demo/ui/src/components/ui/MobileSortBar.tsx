import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── MobileSortBar ──────────────────────────────────────────────────────────────
// Compass "Mobile Sort Bar" (805:508). The sorting affordance for the mobile card
// list — replaces sortable table headers. A horizontal bar of sort chips; the
// active column is rendered in petrol (brand) and carries a direction arrow
// (ArrowUp = asc / ArrowDown = desc). Tapping the active chip toggles direction;
// tapping another chip changes the sort column. Same sortability doctrine as
// desktop, mobile form. Light + dark.

export interface MobileSortOption {
  key: string;
  label: string;
}

export interface MobileSortBarProps {
  options: MobileSortOption[];
  /** Key of the currently active sort column. */
  active: string;
  direction?: 'asc' | 'desc';
  /** Fires when a non-active chip is tapped (change sort column). */
  onChange?: (key: string) => void;
  /** Fires when the active chip is tapped (toggle direction). */
  onDirectionToggle?: () => void;
  className?: string;
}

export function MobileSortBar({
  options,
  active,
  direction = 'asc',
  onChange,
  onDirectionToggle,
  className,
}: MobileSortBarProps) {
  const DirIcon = direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <div
      role="group"
      aria-label="Sort by"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {options.map((opt) => {
        const isActive = opt.key === active;
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => (isActive ? onDirectionToggle?.() : onChange?.(opt.key))}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-[13px] font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-brand focus-visible:ring-offset-2',
              isActive
                ? 'border-stroke-brand bg-brand-light text-fg-brand'
                : 'border-stroke bg-surface text-fg-secondary hover:bg-surface-secondary hover:text-fg',
            )}
          >
            {opt.label}
            {isActive && <DirIcon size={14} strokeWidth={2.5} className="text-fg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
