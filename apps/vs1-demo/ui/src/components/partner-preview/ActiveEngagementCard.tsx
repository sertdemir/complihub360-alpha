import { cn } from '../../lib/utils';
import type { ActiveEngagement } from './types';

// Shared partner block — a post-accept active engagement: handover pack + private
// notes. Used on the LP (S2 Panel 2) and (later) the real partner dashboard.

export interface ActiveEngagementCardProps {
  engagement: ActiveEngagement;
  className?: string;
}

export function ActiveEngagementCard({ engagement, className }: ActiveEngagementCardProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-fg">Active engagement</span>
        <span className="shrink-0 text-[11px] font-semibold text-primary-700 dark:text-primary-300">{engagement.billedNote}</span>
      </div>
      <p className="text-[16px] font-semibold text-fg">{engagement.client}</p>
      <p className="mt-0.5 text-[13px] text-fg-secondary">{engagement.meta}</p>

      <div className="mt-4 rounded-lg bg-surface-secondary p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Handover pack</p>
        <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-fg">
          {engagement.handover.map((h) => (
            <li key={h}>• {h}</li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-fg-secondary">
        From here, it's your relationship — handle in your preferred tooling. We don't track outcomes.
      </p>

      <div className="mt-3 rounded-lg border border-stroke p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Private notes · only you can see</p>
        <p className="mt-1 text-[13px] italic text-fg-secondary">{engagement.privateNote}</p>
      </div>
    </div>
  );
}
