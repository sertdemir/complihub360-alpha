import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

// ─── ProviderMatchCard ────────────────────────────────────────────────────────
// Mirrors the Compass "Provider Match Card" (1530:628): anonymised provider
// listing item for the Risk-Map results page (User-Flow v2). Shows a vetted
// compliance specialist WITHOUT revealing identity — pseudonym label, verified
// badge, specializations, countries/languages, rating, avg response time,
// billing model (NOT a concrete price), and a match score. "Details" opens the
// (monetised) detail page. Match Tier colours the score pill: high = success /
// strong = info / moderate = neutral. Surface = petrol wash on dark
// (bg/card-translucent), white card in light.

export type MatchTier = 'high' | 'strong' | 'moderate';

const MATCH_PILL: Record<MatchTier, string> = {
  high: 'bg-[#3C8C7A]/12 border-[#3C8C7A]/35 text-[#2f7061] dark:bg-[#3C8C7A]/20 dark:border-[#3C8C7A]/45 dark:text-[#5fd6bd]',
  strong: 'bg-[#3b6fb0]/12 border-[#3b6fb0]/35 text-[#2f5b93] dark:bg-[#3b6fb0]/22 dark:border-[#3b6fb0]/45 dark:text-[#86b4ea]',
  moderate: 'bg-surface-secondary border-stroke text-fg-secondary',
};

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5 15 9l7 .6-5.3 4.6L18.2 21 12 17.3 5.8 21l1.5-6.8L2 9.6 9 9z" />
    </svg>
  );
}

export interface ProviderMatchCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Pseudonym label — never a real name. e.g. "Verifizierte Steuerkanzlei · Norditalien". */
  title: React.ReactNode;
  /** Region · active-since line. e.g. "Mailand · aktiv seit 2015". */
  eyebrow?: React.ReactNode;
  /** Match score pill text. e.g. "96% Match". */
  match: React.ReactNode;
  /** Colours the match pill by score band. */
  matchTier?: MatchTier;
  /** Shows the gold Verified-Partner badge (trust anchor). */
  isVerified?: boolean;
  /** Specialization tags, max ~3. */
  tags?: string[];
  /** Why this score is this score — a short ✓/gap list. The card renders it but
   *  does not compose it: only the caller knows what the user actually asked for. */
  matchBasis?: React.ReactNode;
  /** Countries / languages line. e.g. "IT · DE · EN". */
  countries?: React.ReactNode;
  /** Rating line. e.g. "4,8 · 128 Mandate". */
  rating?: React.ReactNode;
  /** Avg response time. e.g. "Ø 3 Std. Antwortzeit". */
  responseTime?: React.ReactNode;
  /** Billing model — NOT a price. e.g. "Abomodell" | "Stundenbasis" | "Projektbasiert". */
  billing: React.ReactNode;
  /** Trailing action; defaults to an accent "Details" button. */
  action?: React.ReactNode;
  onDetails?: () => void;
}

export function ProviderMatchCard({
  title, eyebrow, match, matchTier = 'high', isVerified = true,
  tags, matchBasis, countries, rating, responseTime, billing, action, onDetails,
  className, ...rest
}: ProviderMatchCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-stroke bg-white p-6',
        'dark:border-transparent dark:bg-[#001c16]/40',
        className,
      )}
      {...rest}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-[18px] font-semibold text-fg">{title}</h3>
          {eyebrow && <p className="text-[13px] text-fg-tertiary">{eyebrow}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {/* Gold-700 (#96802a) misst auf dem 10-%-Goldgrund 3.88:1 und reisst bei
              11 px die AA-Schwelle. accent-800 haelt dieselbe Goldfamilie und
              kommt ueber 4.5:1 — gleiche Korrektur wie beim Verified-Badge auf
              /compliance. Dunkel bleibt gold-500, dort ist der Grund dunkel. */}
          {isVerified && (
            <span className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-[3px] text-[11px] font-medium text-accent-800 dark:text-[#d4af37]">
              <CheckIcon /> Verified Partner
            </span>
          )}
          <span className={cn('rounded-full border px-2.5 py-1 text-[13px] font-medium', MATCH_PILL[matchTier])}>
            {match}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span key={i} className="rounded-full border border-stroke px-3 py-1 text-[13px] text-fg-secondary">{t}</span>
            ))}
          </div>
        )}
        {matchBasis}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-fg-tertiary">
          {countries && <span>{countries}</span>}
          {rating && <span className="flex items-center gap-1 text-fg"><StarIcon />{rating}</span>}
          {responseTime && <span>{responseTime}</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-stroke" />

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-fg-tertiary">Abrechnung</p>
          <p className="mt-0.5 text-[16px] font-medium text-fg">{billing}</p>
        </div>
        {action ?? (
          <Button variant="accent" size="sm" onClick={onDetails}>Details</Button>
        )}
      </div>
    </div>
  );
}
