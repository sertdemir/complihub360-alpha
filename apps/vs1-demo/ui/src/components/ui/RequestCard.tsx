import React from 'react';
import { cn } from '../../lib/utils';

// ─── RequestCard ──────────────────────────────────────────────────────────────
// Mirrors the Compass "Request Card" (1444:605), Canvas-Wahl 1 V3 (2026-10-01):
// Titel + Status-Pille in einer Zeile, darunter die Kontextzeile (Bereich ·
// Markt · Eingang · ID, siehe lib/requestContext), dann das Anliegen; rechts
// Frist und Aktion. Die linke ID-Spalte und der Slug-Chip sind entfallen.
// Status drives the pill: awaiting-confirm = gold · awaiting-reply = neutral ·
// active = teal. Surface = petrol wash on dark (bg/card-translucent), white card
// in light. Used on /requests and its OOO / RESPONDED states.

export type RequestStatus = 'awaiting-confirm' | 'awaiting-reply' | 'active' | 'closed';

// The pill label is 11px, so it owes the full 4.5:1 against its own tint - not
// the 3:1 a large heading would. Both accents used to be hardcoded one stop too
// light for that: gold-700 measured 3.62 on the 10% gold wash and #1d7a67 4.39
// on the 10% petrol one. Both now read tokens that already carry the correct
// stop per theme, so DARK is unchanged (gold-500 5.72, #2cc0ad 6.37) and light
// lifts to 6.27 / 8.28.
// Seit 2026-09-27 ohne Hex: Palette gold-500/petrol-500 und stroke-brand-soft
// (Figma: color/border/brand-soft) — optisch unveraendert.
const PILL: Record<RequestStatus, string> = {
  'awaiting-confirm': 'bg-gold-500/10 border-gold-500/35 text-fg-accent-strong dark:bg-gold-500/15 dark:border-gold-500/40',
  'awaiting-reply': 'bg-surface-secondary border-stroke text-fg-secondary',
  active: 'bg-petrol-500/10 border-stroke-brand-soft/35 text-fg-brand dark:bg-petrol-500/25 dark:border-stroke-brand-soft/40',
  // Abgeschlossen (abgelehnt, zurueckgezogen): neutral — kein Teal, das nach
  // "aktiv" aussieht (Matrix-Befund 7, 2026-09-05).
  closed: 'bg-surface-secondary border-stroke text-fg-tertiary',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  'awaiting-confirm': 'Awaiting confirm',
  'awaiting-reply': 'Awaiting reply',
  active: 'Active',
  closed: 'Closed',
};

export interface RequestCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "Verpackung & EPR · Deutschland · vor 12 Min. · RQ-7C41" */
  context?: React.ReactNode;
  status?: RequestStatus;
  /** Override the pill label (defaults per status). */
  statusLabel?: React.ReactNode;
  company: React.ReactNode;
  /** Kleine Marke hinter der Pille (Nutzerseite: "PARTNER"). Nicht in Figma. */
  tag?: React.ReactNode;
  /** Anliegen unter der Kontextzeile. */
  meta?: React.ReactNode;
  slaValue?: React.ReactNode;
  slaLabel?: React.ReactNode;
  /** Trailing action (Button variant per state — accent/primary/ghost). */
  action?: React.ReactNode;
}

export function RequestCard({
  context, status = 'awaiting-confirm', statusLabel, company, tag, meta,
  slaValue, slaLabel = 'SLA Timer', action, className, ...rest
}: RequestCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-7 rounded-xl border border-stroke bg-white px-[18px] py-4',
        'dark:border-transparent dark:bg-[#001c16]/40',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="min-w-0 truncate text-[14px] font-semibold text-fg">{company}</p>
          {/* Einzeilig-Regel (Nutzer-Vorgabe 2026-09-01): die Status-Pille darf
              in KEINER Sprache umbrechen — whitespace-nowrap, und die Zeile
              darf als Ganzes umbrechen statt die Pille zu falten. */}
          <span className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-[3px] text-[11px] font-medium', PILL[status])}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel ?? STATUS_LABEL[status]}
          </span>
          {tag && <span className="shrink-0 rounded bg-[#004d40]/10 px-1.5 py-0.5 text-[10px] font-medium text-fg-secondary dark:bg-[#003b31]/50">{tag}</span>}
        </div>
        {context && <p className="mt-1 text-[12px] text-fg-tertiary">{context}</p>}
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
