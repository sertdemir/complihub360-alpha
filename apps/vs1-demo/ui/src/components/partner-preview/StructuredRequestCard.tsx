import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import type { PartnerRequest, RequestPriority } from './types';

// Shared partner block — a structured, pre-scoped engagement request card.
// Used on the provider LP (Hero · S1 Matchmaking · S4 Channels) and (later) in
// the real partner dashboard. Compass-styled, light + dark. Risk = petrol pills.

const PILL: Record<RequestPriority, string> = {
  critical: 'bg-primary-100 text-primary-800 dark:bg-primary-500/30 dark:text-primary-100',
  high: 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200',
  medium: 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300',
  low: 'bg-neutral-50 text-neutral-500 dark:bg-white/5 dark:text-neutral-400',
};

function summarize(obligations: PartnerRequest['obligations']) {
  const n = (lvl: RequestPriority) => obligations.filter((o) => o.level === lvl).length;
  const parts: string[] = [];
  if (n('critical')) parts.push(`${n('critical')} critical`);
  if (n('high')) parts.push(`${n('high')} high priority`);
  if (n('medium')) parts.push(`${n('medium')} medium`);
  return parts.join(' · ');
}

const FRAME = {
  plain: 'border border-stroke',
  accent: 'border-2 border-accent-400/70',
  brand: 'border border-primary-500',
} as const;

export interface StructuredRequestCardProps {
  request: PartnerRequest;
  /** Border treatment. accent = gold (premium), brand = petrol, plain = neutral. */
  frame?: keyof typeof FRAME;
  /** Show the Accept action + fee note. */
  showAccept?: boolean;
  onAccept?: () => void;
  className?: string;
}

export function StructuredRequestCard({ request, frame = 'plain', showAccept, onAccept, className }: StructuredRequestCardProps) {
  return (
    <div className={cn('rounded-xl bg-surface p-5', FRAME[frame], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {request.isNew && (
            <span className="rounded bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-900">New</span>
          )}
          <span className="text-[13px] font-semibold text-fg-brand">{request.matchPct}% match</span>
        </div>
        {request.arrived && <span className="shrink-0 text-[12px] text-fg-tertiary">{request.arrived}</span>}
      </div>

      <p className="mt-3 text-[15px] font-semibold text-fg">{request.title}</p>
      <p className="mt-1 text-[13px] text-fg-secondary">{request.meta}</p>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{summarize(request.obligations)}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {request.obligations.map((o) => (
          <li key={o.text} className="flex items-center gap-2.5">
            <span className={cn('inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', PILL[o.level])}>
              {o.level}
            </span>
            <span className="text-[14px] text-fg">{o.text}</span>
          </li>
        ))}
      </ul>

      {showAccept && (
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={onAccept}>
            Accept <ArrowRight size={14} className="ml-1" />
          </Button>
          {request.feeNote && <span className="text-[12px] text-fg-tertiary">{request.feeNote}</span>}
        </div>
      )}
    </div>
  );
}
