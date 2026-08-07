import React from 'react';
import { cn } from '../../lib/utils';

// ─── RequestCard ──────────────────────────────────────────────────────────────
// Mirrors the Compass "Request Card" (1444:605): provider request row — ID+time,
// status pill, company + domain tag + meta, SLA timer, trailing action slot.
// Status drives the pill: awaiting-confirm = gold · awaiting-reply = neutral ·
// active = teal. Surface = petrol wash on dark (bg/card-translucent), white card
// in light. Used on /requests and its OOO / RESPONDED states.

export type RequestStatus = 'awaiting-confirm' | 'awaiting-reply' | 'active';

const PILL: Record<RequestStatus, string> = {
  'awaiting-confirm': 'bg-[#d4af37]/10 border-[#d4af37]/35 text-[#96802a] dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40 dark:text-[#d4af37]',
  'awaiting-reply': 'bg-surface-secondary border-stroke text-fg-secondary',
  active: 'bg-[#004d40]/10 border-[#258d78]/35 text-[#1d7a67] dark:bg-[#004d40]/25 dark:border-[#258d78]/40 dark:text-[#2cc0ad]',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  'awaiting-confirm': 'Awaiting confirm',
  'awaiting-reply': 'Awaiting reply',
  active: 'Active',
};

export interface RequestCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "RQ-0234 · 12 min ago" */
  idLine: React.ReactNode;
  status?: RequestStatus;
  /** Override the pill label (defaults per status). */
  statusLabel?: React.ReactNode;
  company: React.ReactNode;
  /** Domain tag, e.g. "DE · EPR". */
  tag?: React.ReactNode;
  /** Meta line under the company. */
  meta?: React.ReactNode;
  slaValue?: React.ReactNode;
  slaLabel?: React.ReactNode;
  /** Trailing action (Button variant per state — accent/primary/ghost). */
  action?: React.ReactNode;
}

export function RequestCard({
  idLine, status = 'awaiting-confirm', statusLabel, company, tag, meta,
  slaValue, slaLabel = 'SLA Timer', action, className, ...rest
}: RequestCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-stroke bg-white px-[18px] py-4',
        'dark:border-transparent dark:bg-[#001c16]/40',
        className,
      )}
      {...rest}
    >
      <div className="flex w-[150px] shrink-0 flex-col items-start gap-1.5">
        <p className="text-[11px] font-bold text-fg-tertiary">{idLine}</p>
        <span className={cn('flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-medium', PILL[status])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabel ?? STATUS_LABEL[status]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-fg">{company}</p>
          {tag && <span className="shrink-0 rounded bg-[#004d40]/10 px-1.5 py-0.5 text-[10px] font-medium text-fg-secondary dark:bg-[#003b31]/50">{tag}</span>}
        </div>
        {meta && <p className="mt-1 text-[12px] leading-relaxed text-fg-secondary">{meta}</p>}
      </div>
      {slaValue != null && (
        <div className="w-[110px] shrink-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-fg-tertiary">{slaLabel}</p>
          <p className="mt-0.5 text-[15px] font-medium text-fg-brand">{slaValue}</p>
        </div>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
