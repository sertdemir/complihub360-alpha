import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { Stat, type StatTrend } from './Stat';
import { RiskBadge, type RiskLevel } from './RiskBadge';
import { Badge, type BadgeTone } from './Badge';
import { Skeleton } from './Skeleton';

// ─── Card variants ────────────────────────────────────────────────────────────
// Compass "Cards" page (663:2): KPI Card · Audit Card · Entity Card. Compositions
// over the base Card + Stat / RiskBadge / Avatar / Badge. All light + dark.

// KPI Card (Trend) — a metric tile. Trend axis: Up/Down/Neutral/Loading (668:114).
export interface KPICardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: StatTrend;
  /** Loading state — renders a skeleton placeholder instead of the value/trend. */
  loading?: boolean;
  className?: string;
}
export function KPICard({ label, value, trend, loading, className }: KPICardProps) {
  return (
    <Card className={cn('p-5', className)}>
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton variant="rect" width="40%" height={12} />
          <Skeleton variant="rect" width="60%" height={28} />
          <Skeleton variant="rect" width="50%" height={12} />
        </div>
      ) : (
        <Stat label={label} value={value} trend={trend} />
      )}
    </Card>
  );
}

// Audit Card (Risk × Status) — a compliance item.
export interface AuditCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  risk: RiskLevel;
  riskLabel?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: BadgeTone;
  date?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}
export function AuditCard({ title, description, risk, riskLabel, status, statusTone = 'neutral', date, action, className }: AuditCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <RiskBadge level={risk} size="sm">
          {riskLabel ?? risk}
        </RiskBadge>
        {status && (
          <Badge tone={statusTone} appearance="soft" size="sm">
            {status}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-snug text-fg">{title}</p>
      {description && <p className="mt-1 text-body-sm leading-relaxed text-fg-secondary">{description}</p>}
      {(date || action) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {date ? <span className="text-[12px] text-fg-tertiary">{date}</span> : <span />}
          {action}
        </div>
      )}
    </Card>
  );
}

// Entity Card — provider / company row. Type Client/Activity/Person/Notification/
// Mention × State Default/Unread (672:176). Type presets stay caller-driven via
// avatar/badge/trailing; State is the `unread` flag (petrol accent + bold title).
export interface EntityCardProps {
  avatar?: React.ReactNode;
  name: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  interactive?: boolean;
  selected?: boolean;
  /** Unread state — petrol left-accent strip + bolder title. */
  unread?: boolean;
  onClick?: () => void;
  className?: string;
}
export function EntityCard({ avatar, name, meta, badge, trailing, interactive, selected, unread, onClick, className }: EntityCardProps) {
  return (
    <Card
      interactive={interactive}
      selected={selected}
      onClick={onClick}
      className={cn('relative p-4', unread && 'pl-5', className)}
    >
      {unread && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand" />}
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('truncate text-fg', unread ? 'font-bold' : 'font-semibold')}>{name}</p>
            {badge}
          </div>
          {meta && <p className="truncate text-body-sm text-fg-secondary">{meta}</p>}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </Card>
  );
}
