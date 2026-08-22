import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { Container } from '../ui/Container';
import { NavMenu } from '../ui/NavMenu';
import { DOMAIN_BY_SLUG, type DomainSlug } from '../../lib/domains';
import { AREAS } from './areas';
import { CountrySelector } from './CountrySelector';
import type { CountryCode } from './types';

interface Props {
  current: DomainSlug;
  selectedCountry: CountryCode;
  onCountryChange: (next: CountryCode) => void;
}

// ─── Lateral navigation for area pages ───────────────────────────────────────
// The hub's sticky anchor bar is gone: with eight areas and German labels it
// scrolled sideways out of reach, and it pointed at accordions that no longer
// exist. What a detail page actually needs is not a table of contents for
// itself but a way sideways — this shows where you are and opens the other
// seven, and carries the market selector so the choice survives the move.
//
// The dropdown is NavMenu since 2026-08-22. What it used to be: role="menu"
// over <button role="menuitem"> that called navigate() — so the seven other
// areas were not links. No arrow keys, no Home/End, and open-in-new-tab,
// cmd-click and the screen-reader link list all missed them, on the one control
// whose entire job is pointing at eight indexable pages. Escape and
// click-outside were there and are now the component's, along with everything
// else that was not.
export function AreaSwitcher({ current, selectedCountry, onCountryChange }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const { pathname } = useLocation();
  // The site header is fixed and its height is responsive (h-16 below lg, h-20
  // above, plus its border) — 113px at desktop width, 64 on mobile. A sticky
  // bar with a hard `top-16` therefore slid under it on every viewport that is
  // not mobile, which is what the hub's old anchor bar did too and nobody
  // caught. Measuring beats guessing, and it self-corrects on resize instead of
  // pinning a magic number that drifts the next time the header changes.
  const [headerH, setHeaderH] = useState(64);

  const localePrefix = locale ? `/${locale}` : '';
  const title = (slug: DomainSlug) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug]?.label ?? slug);

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
          to={`${localePrefix}/compliance`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand"
        >
          <LayoutGrid size={14} />
          <span className="hidden tablet:inline">{t('compliance.area.allAreas', 'All areas')}</span>
        </Link>

        <NavMenu panel="popover" closeKey={pathname} className="min-w-0 flex-1">
          <NavMenu.Trigger label={title(current)} className="max-w-full text-ui-small font-bold text-fg" />
          <NavMenu.Panel>
            {AREAS.map((a) => {
              const Icon = a.icon;
              return (
                <NavMenu.Item
                  key={a.slug}
                  as={Link}
                  href={`${localePrefix}/compliance/${a.slug}`}
                  icon={<Icon size={15} />}
                  isCurrent={a.slug === current}
                >
                  {title(a.slug)}
                </NavMenu.Item>
              );
            })}
          </NavMenu.Panel>
        </NavMenu>

        <div className="hidden shrink-0 tablet:block">
          <CountrySelector value={selectedCountry} onChange={onCountryChange} size="sm" />
        </div>
      </Container>
    </div>
  );
}
