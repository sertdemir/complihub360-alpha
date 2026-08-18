import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import type { TierSummary } from './types';

// Shared partner block — performance/tier summary: gold tier banner + KPI cells +
// optional SLA heads-up. Used on the LP (S3 Performance) and (later) the real
// partner dashboard. At-risk = amber (never red).

export interface TierSummaryPanelProps {
  tier: TierSummary;
  onViewBreach?: () => void;
  className?: string;
}

export function TierSummaryPanel({ tier, onViewBreach, className }: TierSummaryPanelProps) {
  return (
    <div className={cn('rounded-2xl border border-stroke bg-surface p-5 shadow-sm sm:p-6', className)}>
      {/* Tier banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-500/30 dark:bg-accent-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-500 text-fg-on-accent">
            <Check size={22} strokeWidth={3} />
          </span>
          <div>
            <p className="text-[16px] font-semibold text-fg">{tier.tierName}</p>
            <p className="text-[13px] text-fg-secondary">{tier.note}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">{tier.windowLabel}</p>
          <p className="text-[14px] font-semibold text-primary-700 dark:text-primary-300">{tier.trend}</p>
        </div>
      </div>

      {/* KPI cells */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tier.kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-stroke p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">{k.label}</p>
            <p className="mt-2 text-[28px] font-bold leading-none tabular-nums text-fg">{k.value}</p>
            <p className="mt-2 text-[12px] text-fg-secondary">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Heads-up */}
      {tier.headsUp && (
        <div className="mt-4">
          <Banner
            status="warning"
            surface="light"
            title={tier.headsUp.title}
            action={
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={onViewBreach}>View breach detail</Button>
                <button className="text-[13px] font-medium text-fg-tertiary hover:text-fg-secondary">Acknowledge</button>
              </div>
            }
          >
            {tier.headsUp.body}
          </Banner>
        </div>
      )}
    </div>
  );
}
