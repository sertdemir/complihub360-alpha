import { cn } from '../../lib/utils';
import { Toggle } from '../ui/Toggle';
import type { CoverageSettings } from './types';

// Shared partner block — coverage & profile settings: category toggles +
// jurisdiction chips + auto-pause. Used on the LP (S2 Panel 3) and (later) the
// real partner dashboard.

export interface CoveragePanelProps {
  coverage: CoverageSettings;
  className?: string;
}

export function CoveragePanel({ coverage, className }: CoveragePanelProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <p className="mb-3 text-[15px] font-semibold text-fg">Coverage &amp; profile</p>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">
        Categories · {coverage.categoriesActive} of {coverage.categoriesTotal} active
      </p>
      <div className="mt-2 flex flex-col gap-3">
        {coverage.categories.map((c) => (
          <div key={c.label} className="flex items-center justify-between">
            <span className="text-[14px] text-fg-secondary">{c.label}</span>
            <Toggle defaultChecked={c.on} aria-label={c.label} />
          </div>
        ))}
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">
        Jurisdictions · {coverage.jurisdictionsActive.length} active
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {coverage.jurisdictionsActive.map((j) => (
          <span key={j} className="rounded-md bg-primary-50 px-2 py-1 text-[12px] font-medium text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">{j}</span>
        ))}
        {coverage.jurisdictionsInactive.map((j) => (
          <span key={j} className="rounded-md px-2 py-1 text-[12px] text-fg-tertiary">{j}</span>
        ))}
        <span className="rounded-md px-2 py-1 text-[12px] font-medium text-fg-brand">+ Add</span>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[14px] text-fg-secondary">Auto-pause when 5+ active</span>
        <Toggle defaultChecked={coverage.autoPause} aria-label="Auto-pause when 5+ active" />
      </div>
    </div>
  );
}
