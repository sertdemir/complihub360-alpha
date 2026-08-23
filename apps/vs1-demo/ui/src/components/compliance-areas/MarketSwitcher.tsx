import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Container } from '../ui/Container';
import { NavMenu } from '../ui/NavMenu';
import { MARKET_CODES } from '../../lib/marketProfiles';
import { AREAS } from './areas';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import type { CountryCode } from './types';

interface Props {
  current: CountryCode;
}

// ─── Lateral navigation for market pages ─────────────────────────────────────
// The transpose of AreaSwitcher: there the dropdown opens the other seven
// AREAS and a selector carries the market; here it opens the other seven
// MARKETS and the selector carries the area. Same component, same keyboard
// behaviour, real links either way — the eight markets are eight indexable
// pages and a menu of buttons would hide them from every one of open-in-new-
// tab, cmd-click and the screen reader's link list.
//
// The header height is MEASURED, not assumed. It is responsive — 64px on
// mobile, 113 at desktop — so a sticky bar pinned to a constant slides under
// it on every viewport but one. That is exactly what the first cut of this bar
// did with top-[4rem]: on desktop it sat behind the header and could not be
// seen at all.
export function MarketSwitcher({ current }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const { pathname } = useLocation();
  const [headerH, setHeaderH] = useState(64);

  const localePrefix = locale ? `/${locale}` : '';
  const marketName = (code: CountryCode) =>
    t(`markets.countries.${code}`, { defaultValue: code });

  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => setHeaderH(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{ top: headerH }}
      className="sticky z-40 border-b border-stroke-subtle bg-surface/85 backdrop-blur-md"
    >
      <Container gutter="flat" className="flex items-center gap-3 py-2.5">
        <Link
          to={`${localePrefix}/markets`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand"
        >
          <Globe size={14} aria-hidden />
          <span className="hidden tablet:inline">
            {t('markets.country.backToMarkets', 'All markets')}
          </span>
        </Link>

        <NavMenu panel="popover" closeKey={pathname} className="min-w-0 flex-1">
          <NavMenu.Trigger
            label={marketName(current)}
            className="max-w-full text-ui-small font-bold text-fg"
          />
          <NavMenu.Panel>
            {MARKET_CODES.map((code) => (
              <NavMenu.Item
                key={code}
                as={Link}
                href={`${localePrefix}/markets/${code.toLowerCase()}`}
                isCurrent={code === current}
              >
                {marketName(code)}
              </NavMenu.Item>
            ))}
          </NavMenu.Panel>
        </NavMenu>

        {/* The area selector, the mirror of the area page's market selector.
            It jumps to that area's page rather than filtering in place: on a
            market page an area IS a page, so filtering would be a weaker
            version of the link the weights table already offers. */}
        <div className="hidden shrink-0 tablet:block">
          <NavMenu panel="popover" closeKey={pathname}>
            <NavMenu.Trigger
              label={t('markets.country.allAreas', 'All areas')}
              className="text-body-xs font-semibold text-fg-secondary"
            />
            <NavMenu.Panel>
              {AREAS.map((a) => {
                const Icon = a.icon;
                return (
                  <NavMenu.Item
                    key={a.slug}
                    as={Link}
                    href={`${localePrefix}/compliance/${a.slug}`}
                    icon={<Icon size={15} />}
                  >
                    {t(`compliance.${a.slug}.title`, DOMAIN_BY_SLUG[a.slug]?.label ?? a.slug)}
                  </NavMenu.Item>
                );
              })}
            </NavMenu.Panel>
          </NavMenu>
        </div>
      </Container>
    </div>
  );
}
