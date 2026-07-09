import React from 'react';
import { cn } from '../../lib/utils';

// ─── TableMobileRow ───────────────────────────────────────────────────────────
// Mirrors the Compass "Table Mobile Row" (1442:777): compact 44px list row for
// mobile — Title + Sub on the left, Value + status pill on the right. The status
// drives the pill color (translucent bg + solid stroke + dot). For richer rows
// (multi-field) use <TableMobileCard>. Light + dark.

export type MobileRowStatus = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const PILL: Record<MobileRowStatus, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-400',
  error: 'bg-red-500/10 border-red-500/40 text-red-700 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/45 text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/45 dark:text-amber-400',
  info: 'bg-sky-500/10 border-sky-500/40 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-400',
  neutral: 'bg-surface-secondary border-stroke text-fg-secondary',
};

export interface TableMobileRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Secondary line under the title (period, date, owner …). */
  sub?: React.ReactNode;
  /** Right-aligned value (amount, count …). */
  value?: React.ReactNode;
  /** Status pill label; hidden when omitted. */
  status?: React.ReactNode;
  statusTone?: MobileRowStatus;
}

export function TableMobileRow({ title, sub, value, status, statusTone = 'neutral', className, ...rest }: TableMobileRowProps) {
  return (
    <div className={cn('flex min-h-[44px] items-center justify-between gap-2.5 py-2', className)} {...rest}>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-fg">{title}</p>
        {sub && <p className="truncate text-[10px] text-fg-tertiary">{sub}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {value != null && <span className="text-[14px] font-medium text-fg">{value}</span>}
        {status != null && (
          <span className={cn('flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', PILL[statusTone])}>
            <span className="h-[5px] w-[5px] rounded-full bg-current" />
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
