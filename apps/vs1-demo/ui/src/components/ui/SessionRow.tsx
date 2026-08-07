import React from 'react';
import { cn } from '../../lib/utils';

// ─── SessionRow ───────────────────────────────────────────────────────────────
// Mirrors the Compass "Session Row" (1450:693): user session list row — country
// badge · domain pill (+ optional NEEDS-REFRESH pill) + updated · title · risk
// line · ⋯ menu · action slot. Risk drives the risk-line color (high=red,
// medium=amber, low=muted). Teal-wash surface in dark, white card in light.
// Used on Sessions list, Domains hub and the Workbenches.

export type SessionRisk = 'high' | 'medium' | 'low';

const RISK_TEXT: Record<SessionRisk, string> = {
  high: 'text-[#e0556b]',
  medium: 'text-[#e6a514]',
  low: 'text-fg-tertiary',
};

export interface SessionRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Two-letter country/market code shown in the round badge. */
  country: React.ReactNode;
  /** Domain pill label, e.g. "TAX & VAT". */
  domain: React.ReactNode;
  /** Red status pill (e.g. "NEEDS REFRESH"); hidden when omitted. */
  status?: React.ReactNode;
  /** "· Updated 2h ago" */
  updated?: React.ReactNode;
  title: React.ReactNode;
  /** "● High risk · threshold reached · 1 markets" */
  riskLine?: React.ReactNode;
  risk?: SessionRisk;
  /** Trailing action (default slot for an accent "Open" button). */
  action?: React.ReactNode;
  onMenu?: () => void;
}

export function SessionRow({
  country, domain, status, updated, title, riskLine, risk = 'low', action, onMenu, className, ...rest
}: SessionRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-[10px] border border-stroke-subtle bg-white p-4',
        'dark:border-white/10 dark:bg-[#143a3b]/40',
        className,
      )}
      {...rest}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-stroke-subtle bg-surface-secondary text-[12px] font-semibold text-fg dark:border-white/10">
        {country}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#258d78]/35 bg-[#004d40]/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.06em] text-fg-brand dark:border-[#14a89a]/35 dark:bg-[#097070]/30">
            {domain}
          </span>
          {status && (
            <span className="rounded-full border border-[#e36363]/35 bg-[#e36363]/10 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.06em] text-[#e36363] dark:bg-[#e36363]/15">
              {status}
            </span>
          )}
          {updated && <span className="truncate text-[11px] text-fg-tertiary">{updated}</span>}
        </div>
        <p className="mt-1 truncate text-[14px] font-medium text-fg">{title}</p>
        {riskLine && <p className={cn('mt-0.5 truncate text-[11px]', RISK_TEXT[risk])}>{riskLine}</p>}
      </div>
      {onMenu && (
        <button type="button" onClick={onMenu} aria-label="More" className="shrink-0 px-1 text-[14px] font-medium text-fg-secondary hover:text-fg">⋯</button>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
