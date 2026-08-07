import React, { useRef } from 'react';
import { cn } from '../../lib/utils';

// ─── Slidable Tabbar ──────────────────────────────────────────────────────────
// Compass "Mobile Slidable Tabbar" (614:261) + "Mobile Slidable Tab Item"
// (613:212) on the Tabbar page (607:2). A horizontally scrollable row of
// underline-indicator tabs — the mobile filter-pill row. Distinct from the
// desktop <Tabs> (609:2/612:344) and the fixed <BottomTabBar> (623:335).
//
// Per Compass: active tab = `text/brand` label + `border/brand` underline bar;
// default = `text/secondary`; disabled = `text/disabled`. Container carries a
// `border/default` bottom line and clips its last item to signal scrollability.
// Touch-friendly 44px min height. Light + dark via semantic tokens.
//
// Tab Item variants = Type (Label Only · Icon + Label) × State (Default · Active
// · Disabled). Type is per-tab (icon optional), state is derived from `active` /
// `disabled`.

export interface SlidableTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface SlidableTabbarProps {
  tabs: SlidableTab[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
}

export function SlidableTabbar({ tabs, active, onChange, className }: SlidableTabbarProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusableIndexes = tabs
    .map((t, i) => (t.disabled ? -1 : i))
    .filter((i) => i >= 0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tab = tabs[index];
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!tab.disabled) onChange?.(tab.key);
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();
    const pos = focusableIndexes.indexOf(index);
    let nextPos = pos;
    if (e.key === 'ArrowRight') nextPos = (pos + 1) % focusableIndexes.length;
    else if (e.key === 'ArrowLeft') nextPos = (pos - 1 + focusableIndexes.length) % focusableIndexes.length;
    else if (e.key === 'Home') nextPos = 0;
    else if (e.key === 'End') nextPos = focusableIndexes.length - 1;
    const nextIndex = focusableIndexes[nextPos];
    refs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      // Hide the scrollbar cross-browser; the clipped last tab signals scrollability.
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      className={cn(
        '-mx-4 flex items-stretch gap-1 overflow-x-auto border-b border-stroke px-4 [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.key === active;
        const isDisabled = !!tab.disabled;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !isDisabled && onChange?.(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'group relative inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[14px] font-semibold leading-none transition-colors [scroll-snap-align:start] focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus',
              isActive
                ? 'border-brand text-fg-brand'
                : isDisabled
                  ? 'cursor-not-allowed border-transparent text-fg-disabled'
                  : 'border-transparent text-fg-secondary hover:text-fg',
            )}
          >
            {tab.icon != null && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count != null && (
              <span
                className={cn(
                  'ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                  isActive
                    ? 'bg-brand text-fg-on-brand'
                    : 'bg-surface-secondary text-fg-secondary',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
