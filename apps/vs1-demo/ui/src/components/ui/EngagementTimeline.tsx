import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── EngagementTimeline ─────────────────────────────────────────────────────────
// A vertical timeline of engagement / compliance events. Reuses the Stepper
// done/active/upcoming indicator language: done = brand + white check,
// current = brand + ring, upcoming = neutral outline. A vertical connector
// (border-stroke) links each item to the next; the last item has no trailing
// connector. Content sits to the right. Light + dark.

export type EngagementStatus = 'done' | 'current' | 'upcoming';

export interface EngagementTimelineItem {
  title: React.ReactNode;
  timestamp?: React.ReactNode;
  description?: React.ReactNode;
  status?: EngagementStatus;
  /** Optional custom icon, shown inside the dot in place of the default mark. */
  icon?: React.ReactNode;
}

export interface EngagementTimelineProps {
  items: EngagementTimelineItem[];
  className?: string;
}

function Dot({ status, icon }: { status: EngagementStatus; icon?: React.ReactNode }) {
  return (
    <span
      className={cn(
        'grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full transition-colors',
        status === 'done' && 'bg-brand text-fg-on-brand',
        status === 'current' && 'bg-brand text-fg-on-brand ring-4 ring-brand-light',
        status === 'upcoming' && 'border border-stroke bg-surface text-fg-tertiary',
      )}
    >
      {icon ?? (status === 'done' ? <Check size={15} strokeWidth={3} /> : null)}
    </span>
  );
}

export function EngagementTimeline({ items, className }: EngagementTimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const status: EngagementStatus = item.status ?? 'upcoming';
        const last = i === items.length - 1;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Dot status={status} icon={item.icon} />
              {!last && <span className="my-1 w-0.5 flex-1 rounded bg-stroke" />}
            </div>
            <div className={cn('pb-6', last && 'pb-0')}>
              <p className={cn('text-[14px] font-medium', status === 'upcoming' ? 'text-fg-tertiary' : 'text-fg')}>
                {item.title}
              </p>
              {item.timestamp && <p className="mt-0.5 text-xs text-fg-tertiary">{item.timestamp}</p>}
              {item.description && <p className="mt-1 text-sm text-fg-secondary">{item.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
