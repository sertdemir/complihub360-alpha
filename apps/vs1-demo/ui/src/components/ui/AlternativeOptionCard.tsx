import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { Avatar } from './Avatar';

// ─── Alternative Option Card ──────────────────────────────────────────────────
// The lighter "also consider" row on the wizard RESULT screen. Sits in a list
// under the RecommendedSolutionCard hero. Interactive (hover + click): provider
// identity (Avatar + name + meta) on the left, match% + chevron on the right,
// with an optional trailing badge slot. Composes Card + Avatar. Light + dark.

export interface AlternativeProvider {
  name: string;
  avatar?: React.ReactNode;
  initials?: string;
}

export interface AlternativeOptionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  provider: AlternativeProvider;
  /** Match percentage (0–100). */
  matchRate: number;
  /** 1-line summary, e.g. "Tax & VAT · DE · responds in 4h". */
  meta?: string;
  /** Optional badge node (e.g. a PartnerStatusBadge or Tag). */
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const AlternativeOptionCard = React.forwardRef<HTMLDivElement, AlternativeOptionCardProps>(
  ({ provider, matchRate, meta, badge, onClick, className, ...rest }, ref) => (
    <Card
      ref={ref}
      interactive
      onClick={onClick}
      className={cn('shadow-none', className)}
      {...rest}
    >
      <div className="flex items-center gap-3 p-4">
        {provider.avatar ?? <Avatar size="md" initials={provider.initials} />}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-body font-semibold text-fg">{provider.name}</span>
            {badge}
          </div>
          {meta && <p className="mt-0.5 truncate text-body-sm text-fg-tertiary">{meta}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="font-sans text-body font-bold tabular-nums text-fg-brand">{matchRate}%</span>
          <ChevronRight size={18} strokeWidth={2.25} className="text-fg-tertiary" />
        </div>
      </div>
    </Card>
  ),
);
AlternativeOptionCard.displayName = 'AlternativeOptionCard';
