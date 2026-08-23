import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Globe } from 'lucide-react';
import { NavMenu } from '../ui/NavMenu';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';

// ─── The markets sheet ───────────────────────────────────────────────────────
// The counterpart to AreasMenuPanel, and for the same reason it exists at all:
// the markets are eight indexable subpages now, and a header entry that only
// links to the hub hides them. One component, both headers — GlobalNav's own
// comment insists the two must not present different navigations.
//
// The line under each market is DERIVED, not authored: how many duties the
// engine holds a national source for, in how many areas. That is the one thing
// a reader choosing between markets actually wants, and it cannot drift from
// the destination because it comes from the same profile the page renders.

export interface MarketsMenuPanelProps {
  label: string;
  /** Active locale segment, e.g. 'de'. */
  lang: string;
  isActive?: boolean;
  /** Styling for the trigger over a dark hero. */
  triggerClassName?: string;
}

export function MarketsMenuPanel({ label, lang, isActive = false, triggerClassName }: MarketsMenuPanelProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();

  const href = (path: string) => `/${lang}${path}`;

  return (
    <NavMenu panel="sheet" columns={2} closeKey={pathname}>
      <NavMenu.Trigger label={label} isActive={isActive} className={triggerClassName} />
      <NavMenu.Panel
        title={t('header.nav.marketsPanelTitle', 'Choose a market')}
        className="pointer-events-auto"
        aside={
          <div className="flex flex-col items-start gap-3">
            <NavMenu.Footer as={Link} href={href('/markets')} className="items-baseline">
              {t('header.nav.allMarkets', 'All markets')}
              <ArrowRight size={14} aria-hidden />
            </NavMenu.Footer>
            <p className="text-body-xs leading-relaxed text-fg-secondary">
              {t(
                'header.nav.marketsAsideBody',
                'Every market lists what falls due there and how often, which areas weigh heaviest, and where we hold no local source yet.',
              )}
            </p>
          </div>
        }
      >
        {MARKET_CODES.map((code) => {
          const to = href(`/markets/${code.toLowerCase()}`);
          const p = getMarketProfile(code);
          return (
            <NavMenu.Item
              key={code}
              as={Link}
              href={to}
              icon={<Globe size={18} />}
              description={t('header.nav.marketFact', {
                defaultValue: '{{count}} duties in {{areas}} areas',
                count: p.obligations.length,
                areas: p.byDomain.length,
              })}
              isCurrent={pathname === to}
            >
              {t(`markets.countries.${code}`, { defaultValue: code })}
            </NavMenu.Item>
          );
        })}
      </NavMenu.Panel>
    </NavMenu>
  );
}
