import React from 'react';
import { cn } from '../../lib/utils';
import { RiskBadge, type RiskLevel } from './RiskBadge';

// ─── RiskMap ────────────────────────────────────────────────────────────────
// Wizard step 05 "Risk Map" (Organism). An at-a-glance overview of a company's
// compliance obligations, grouped & ordered by petrol-severity (critical → low).
// Reuses RiskBadge for the brand-critical risk scale (the traffic light).

export interface RiskMapItem {
  domain: string;
  obligation: string;
  risk: RiskLevel;
  jurisdiction?: string;
  deadline?: string;
}

export interface RiskMapProps {
  items: RiskMapItem[];
  /** Group obligations into severity sections (default true). When false, a flat grid. */
  groupByRisk?: boolean;
  className?: string;
}

// Critical → low — most severe first.
const ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
const LABEL: Record<RiskLevel, string> = {
  critical: 'Critical risk',
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};

function ObligationTile({ item }: { item: RiskMapItem }) {
  const meta = [item.domain, item.jurisdiction].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stroke bg-surface p-4">
      <RiskBadge level={item.risk} size="sm" className="self-start">
        {LABEL[item.risk]}
      </RiskBadge>
      <p className="font-medium text-fg">{item.obligation}</p>
      {meta && <p className="text-sm text-fg-secondary">{meta}</p>}
      {item.deadline && <p className="text-xs text-fg-tertiary">Due {item.deadline}</p>}
    </div>
  );
}

export function RiskMap({ items, groupByRisk = true, className }: RiskMapProps) {
  // Counts per severity for the summary header.
  const counts = ORDER.reduce<Record<RiskLevel, number>>(
    (acc, level) => {
      acc[level] = items.filter((i) => i.risk === level).length;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  const grid = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Summary header — counts per severity */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-fg-secondary">
          {items.length} obligation{items.length === 1 ? '' : 's'}
        </span>
        {ORDER.filter((level) => counts[level] > 0).map((level) => (
          <RiskBadge key={level} level={level} styleVariant="dot" size="sm">
            {LABEL[level]} · {counts[level]}
          </RiskBadge>
        ))}
      </div>

      {groupByRisk ? (
        <div className="flex flex-col gap-6">
          {ORDER.filter((level) => counts[level] > 0).map((level) => (
            <section key={level} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-fg-secondary">
                {LABEL[level]} · {counts[level]}
              </h3>
              <div className={grid}>
                {items
                  .filter((i) => i.risk === level)
                  .map((item, idx) => (
                    <ObligationTile key={`${level}-${idx}`} item={item} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={grid}>
          {items.map((item, idx) => (
            <ObligationTile key={idx} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
