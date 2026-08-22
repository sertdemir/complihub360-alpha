import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { NavMenu } from '../ui/NavMenu';
import { AREAS } from '../compliance-areas/areas';
import { DOMAIN_BY_SLUG } from '../../lib/domains';

// ─── The compliance-areas sheet ───────────────────────────────────────────────
// One component, both headers. GlobalNav serves every route below the landing
// page and MarketingHeader serves the landing page itself; GlobalNav's own
// comment already insists "the two headers must not present different
// navigations", and two copies of this panel would have drifted the first time
// an area was added.
//
// The description under each label is compliance.<slug>.headline — the same
// line the area's own page opens with, so the menu cannot promise something the
// destination does not say. Nothing new is authored for the menu.
//
// Two columns: eight single-column rows push the sheet past the fold on a
// laptop, and the eight areas are peers rather than a ranked list.

export interface AreasMenuPanelProps {
  label: string;
  /** Active locale segment, e.g. 'de'. */
  lang: string;
  isActive?: boolean;
  /** Styling for the trigger over a dark hero. */
  triggerClassName?: string;
}

export function AreasMenuPanel({ label, lang, isActive = false, triggerClassName }: AreasMenuPanelProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();

  const href = (path: string) => `/${lang}${path}`;
  const title = (slug: string) => t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug]?.label ?? slug);
  const headline = (slug: string) => t(`compliance.${slug}.headline`, '');

  return (
    <NavMenu panel="sheet" columns={2} closeKey={pathname}>
      <NavMenu.Trigger label={label} isActive={isActive} className={triggerClassName} />
      <NavMenu.Panel
        title={t('header.nav.areasPanelTitle', 'Choose a compliance area')}
        className="pointer-events-auto"
        aside={
          <div className="flex flex-col items-start gap-3">
            <NavMenu.Footer as={Link} href={href('/compliance')} className="items-baseline">
              {t('header.nav.allAreas', 'All compliance areas')}
              <ArrowRight size={14} aria-hidden />
            </NavMenu.Footer>
            <p className="text-body-xs leading-relaxed text-fg-secondary">
              {t(
                'header.nav.areasAsideBody',
                'Every area lists the duties it carries, the statute behind each one, and what it costs to get wrong.',
              )}
            </p>
          </div>
        }
      >
        {AREAS.map((a) => {
          const Icon = a.icon;
          const to = href(`/compliance/${a.slug}`);
          return (
            <NavMenu.Item
              key={a.slug}
              as={Link}
              href={to}
              icon={<Icon size={18} />}
              description={headline(a.slug)}
              isCurrent={pathname === to}
            >
              {title(a.slug)}
            </NavMenu.Item>
          );
        })}
      </NavMenu.Panel>
    </NavMenu>
  );
}
