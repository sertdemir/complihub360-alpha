import React from 'react';
import { cn } from '../../lib/utils';

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
// Compass Mobile Tabbars (607:2) — the fixed bottom navigation on app mobile
// surfaces. Icon + label, active = brand. Light + dark.

export interface BottomTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}
export interface BottomTabBarProps {
  tabs: BottomTab[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
  /** Renders within a relative parent (story) instead of fixed to viewport. */
  embedded?: boolean;
}

export function BottomTabBar({ tabs, active, onChange, className, embedded }: BottomTabBarProps) {
  return (
    <nav
      className={cn(
        'inset-x-0 bottom-0 z-30 flex items-stretch border-t border-stroke bg-surface px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1',
        embedded ? 'relative' : 'fixed',
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange?.(t.key)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-fg-brand' : 'text-fg-tertiary hover:text-fg-secondary',
            )}
          >
            <span className="relative">
              {t.icon}
              {t.badge != null && (
                <span className="absolute -right-1.5 -top-1 min-w-[15px] rounded-full bg-error-500 px-1 text-center text-[9px] font-bold leading-[15px] text-white">
                  {t.badge}
                </span>
              )}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
