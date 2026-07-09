import React from 'react';
import { cn } from '../../lib/utils';

// ─── DomainCard ───────────────────────────────────────────────────────────────
// Mirrors the Compass "Domain Card" (1267:530): eyebrow domain tag + title +
// status meta on a teal-tinted surface (bg/brand-light + border/brand). Represents
// a single compliance domain (VAT / EPR / Data Privacy …) across Coverage,
// Dashboard, Workbench and Results. Mode-aware tokens → light + dark.

export interface DomainCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Domain code shown as the uppercase eyebrow (e.g. "VAT", "EPR", "DAT"). */
  eyebrow: React.ReactNode;
  /** Domain name. */
  title: React.ReactNode;
  /** Status line (e.g. "8 active engagements · rank #3"). */
  meta?: React.ReactNode;
  /** Clickable affordance (hover border lift). */
  interactive?: boolean;
}

export const DomainCard = React.forwardRef<HTMLDivElement, DomainCardProps>(
  ({ className, eyebrow, title, meta, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1.5 rounded-[10px] border border-stroke-brand bg-brand-light px-4 py-3.5',
        interactive && 'cursor-pointer transition-colors hover:border-fg-brand',
        className,
      )}
      {...props}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-brand">{eyebrow}</span>
      <span className="text-[15px] font-semibold leading-snug text-fg">{title}</span>
      {meta && <span className="text-body-sm text-fg-secondary">{meta}</span>}
    </div>
  ),
);
DomainCard.displayName = 'DomainCard';
