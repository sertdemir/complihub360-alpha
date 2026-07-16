import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { TrendAreaChart } from './Charts';

// ─── MetricCard ───────────────────────────────────────────────────────────────
// A dashboard metric tile in the Stripe-overview idiom: eyebrow-ish label + info,
// a large value, a "vs. previous period" comparison line, a trend area chart, and
// a footer (last-updated · details link). Empty series render a dashed "no data"
// state, matching the reference.
//
// Composed from DS Card + TrendAreaChart (Charts.tsx). Token-driven → light/dark
// via the global theme. NOTE: Compass has no metric-with-chart card yet — this is
// a DS-uptake candidate (propose to Compass once the pattern settles).

export interface MetricCardProps {
  label: string;
  value?: string;
  /** Comparison line, e.g. "0,00 € vorheriger Zeitraum" or "87 total". */
  compare?: string;
  /** Time series (e.g. last 7 days). Empty/undefined → "no data" state. */
  series?: number[];
  /** X labels aligned to `series`; sparse labels are fine (only endpoints shown well). */
  xLabels?: string[];
  /** Chart line/area color (hex or CSS var). Default = Compass petrol. */
  color?: string;
  updated?: string;
  detailsLabel?: string;
  onDetails?: () => void;
  emptyLabel?: string;
  info?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  compare,
  series,
  xLabels,
  color = '#097070',
  updated,
  detailsLabel,
  onDetails,
  emptyLabel = 'Keine Daten',
  info = true,
  className,
}: MetricCardProps) {
  const hasData = Array.isArray(series) && series.length > 0 && series.some((n) => n !== 0);
  const data = (series ?? []).map((v, i) => ({ d: xLabels?.[i] ?? '', v }));

  return (
    <Card className={cn('flex flex-col gap-3 rounded-xl border border-stroke bg-surface p-5', className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-[14px] font-semibold text-fg">{label}</span>
        {info && <Info size={14} className="text-fg-tertiary" aria-hidden />}
      </div>

      {value !== undefined && (
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[26px] font-semibold leading-none tabular-nums text-fg">{value}</span>
          {compare && <span className="text-[13px] text-fg-secondary">{compare}</span>}
        </div>
      )}

      {hasData ? (
        <TrendAreaChart
          data={data}
          config={{ v: { label, color } }}
          dataKey="v"
          xKey="d"
          className="!aspect-auto h-40 w-full"
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-stroke">
          <span className="rounded-md bg-surface-secondary px-3 py-1.5 text-[13px] text-fg-tertiary">{emptyLabel}</span>
        </div>
      )}

      {(updated || detailsLabel) && (
        <div className="mt-1 flex items-center justify-between border-t border-stroke pt-3 text-[12px]">
          <span className="text-fg-tertiary">{updated}</span>
          {detailsLabel && (
            <button type="button" onClick={onDetails} className="font-medium text-fg-brand hover:underline">
              {detailsLabel}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
