import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardFooter } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Tag } from './Tag';
import { Button } from './Button';
import { PartnerStatusBadge } from './ProviderBadges';

// ─── Recommended Solution Card ────────────────────────────────────────────────
// The wizard RESULT hero. After the matching wizard runs, the single best
// provider/solution is surfaced in this elevated card: a gold "RECOMMENDED"
// eyebrow, the provider identity (Avatar + name + verified badge), a large
// brand match%, domain tags, a 1–2 line rationale, a small facts row, and a
// footer with primary "Request engagement" + ghost "View profile".
// Composes Card, Avatar, Badge, Tag, Button, PartnerStatusBadge. Light + dark.

export interface RecommendedProvider {
  name: string;
  avatar?: React.ReactNode;
  initials?: string;
}

export interface RecommendedFact {
  label: string;
  value: string;
}

export interface RecommendedSolutionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  provider: RecommendedProvider;
  /** Match percentage (0–100) — rendered large in brand. */
  matchRate: number;
  verified?: boolean;
  /** Compliance domains — rendered as a Tag list. */
  domains: string[];
  /** 1–2 line "why we recommend this" copy. */
  rationale?: string;
  /** Small Stat-like facts, e.g. Response time / From price. */
  facts?: RecommendedFact[];
  onRequest?: () => void;
  onViewProfile?: () => void;
}

export const RecommendedSolutionCard = React.forwardRef<HTMLDivElement, RecommendedSolutionCardProps>(
  ({ provider, matchRate, verified, domains, rationale, facts, onRequest, onViewProfile, className, ...rest }, ref) => (
    <Card
      ref={ref}
      className={cn(
        'border-stroke-brand ring-1 ring-stroke-brand shadow-md',
        className,
      )}
      {...rest}
    >
      {/* Gold accent top strip */}
      <div className="h-1 w-full bg-accent-500" aria-hidden="true" />

      <CardContent className="space-y-5 p-6 pt-6">
        {/* Eyebrow + match% */}
        <div className="flex items-start justify-between gap-4">
          <Badge tone="accent" appearance="soft" size="md" className="uppercase tracking-[0.08em]">
            Recommended
          </Badge>
          <div className="flex flex-col items-end leading-none">
            <span className="font-sans text-[2.25rem] font-bold tracking-tight tabular-nums text-fg-brand">
              {matchRate}%
            </span>
            <span className="mt-1 text-[12px] font-medium uppercase tracking-[0.06em] text-fg-secondary">
              match
            </span>
          </div>
        </div>

        {/* Provider identity */}
        <div className="flex items-center gap-3">
          {provider.avatar ?? <Avatar size="lg" initials={provider.initials} />}
          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold leading-snug tracking-tight text-fg">
              {provider.name}
            </div>
            {verified && (
              <div className="mt-1">
                <PartnerStatusBadge status="verified" />
              </div>
            )}
          </div>
        </div>

        {/* Domain tags */}
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <Tag key={d} tone="brand">
                {d}
              </Tag>
            ))}
          </div>
        )}

        {/* Rationale */}
        {rationale && (
          <p className="text-body-sm leading-relaxed text-fg-secondary">{rationale}</p>
        )}

        {/* Facts row */}
        {facts && facts.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-stroke bg-surface-secondary px-4 py-3">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-tertiary">
                  {f.label}
                </span>
                <span className="text-body-sm font-semibold tabular-nums text-fg">{f.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-3 p-6 pt-0">
        <Button onClick={onRequest} className="flex-1 sm:flex-none">
          Request engagement
        </Button>
        <Button variant="ghost" onClick={onViewProfile}>
          View profile
        </Button>
      </CardFooter>
    </Card>
  ),
);
RecommendedSolutionCard.displayName = 'RecommendedSolutionCard';
