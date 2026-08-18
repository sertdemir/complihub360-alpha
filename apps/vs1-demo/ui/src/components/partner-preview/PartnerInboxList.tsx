import { cn } from '../../lib/utils';
import { StructuredRequestCard } from './StructuredRequestCard';
import type { InboxLead, PartnerRequest } from './types';

// Shared partner block — the lead inbox: a header + compact lead rows, with an
// optional featured StructuredRequestCard inserted after the first row (Hero).
// Used on the LP (Hero · S2 Panel 1) and (later) the real partner dashboard.

function LeadRow({ lead, highlighted }: { lead: InboxLead; highlighted?: boolean }) {
  return (
    <div className={cn('rounded-lg p-3', highlighted ? 'border border-primary-500 bg-primary-50/40 dark:bg-primary-500/10' : 'border border-transparent')}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          {highlighted && lead.dimmed === false && (
            <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-fg-on-accent">New</span>
          )}
          {lead.title}
        </span>
        {lead.matchPct != null && <span className={cn('shrink-0 text-[12px] font-semibold', lead.dimmed ? 'text-fg-tertiary' : 'text-fg-brand')}>{lead.matchPct}%</span>}
      </div>
      <p className={cn('mt-1 text-[12px]', lead.dimmed ? 'text-fg-tertiary' : 'text-fg-secondary')}>{lead.meta}</p>
    </div>
  );
}

export interface PartnerInboxListProps {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
  leads: InboxLead[];
  /** Featured request rendered as a full card (inserted after the first lead). */
  featured?: PartnerRequest;
  featuredShowAccept?: boolean;
  className?: string;
}

export function PartnerInboxList({ title, rightSlot, leads, featured, featuredShowAccept, className }: PartnerInboxListProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-fg">{title}</span>
        {rightSlot && <span className="text-[13px] text-fg-tertiary">{rightSlot}</span>}
      </div>
      <div className="flex flex-col gap-2.5">
        {leads.map((lead, i) => (
          <div key={lead.id}>
            <LeadRow lead={lead} highlighted={!lead.dimmed} />
            {featured && i === 0 && (
              <div className="mt-2.5">
                <StructuredRequestCard request={featured} frame="brand" showAccept={featuredShowAccept} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
