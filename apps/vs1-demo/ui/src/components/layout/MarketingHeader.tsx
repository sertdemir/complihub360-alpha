import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AreasMenuPanel } from './AreasMenuPanel';
import { MarketsMenuPanel } from './MarketsMenuPanel';
import { LanguageMenu } from './LanguageMenu';
import { MobileNav } from './MobileNav';
import { HEADER_NAV_LINKS } from './navLinks';

// ─── MarketingHeader ──────────────────────────────────────────────────────────
// The marketing navigation, responsive: desktop bar + the shared mobile
// drill-down panel (MobileNav — the same one GlobalNav opens).
// Compass: Header Marketing Desktop / Mobile.
//
// Multipager since 2026-08-18. The entries used to be in-page anchors with
// scroll-spy, which only worked on the landing page and made three finished pages
// unreachable — /markets had no entry point anywhere in the app, and "How it works"
// pointed at the short strip on the landing page rather than the full page of the
// same name. They are real routes now, and the active state comes from the URL
// instead of the scroll position.

export interface NavLink {
  /** Path below the locale, e.g. 'markets' — the locale prefix comes from userHref. */
  to: string;
  label: string;
  labelKey?: string;
  /** Render as a NavMenu sheet listing the eight compliance areas. */
  areasMenu?: boolean;
  marketsMenu?: boolean;
}

export interface MarketingHeaderProps {
  /** Navigation entries for the DESKTOP bar. Defaults to NAV_LINKS; the mobile
   *  panel always reads navLinks.ts, which is the point of that file. */
  links?: NavLink[];
  /** Locale-aware home link on the logo. */
  userHref?: string;
  loginHref?: string;
  signupHref?: string;
  /** Theme over a dark hero (white logo + nav). */
  theme?: 'light' | 'inverse';
  /** Render in normal flow (relative) instead of fixed — for showcases / embeds. */
  embedded?: boolean;
}

// The entries come from the shared source both headers read — see navLinks.ts
// for what is in the bar and why (user decision 2026-08-28: Solutions and
// Trust & Security up, Resources down into the footer). /platform stays out —
// §11 P5 keeps it as an SEO surface, reachable from the footer.
const NAV_LINKS: NavLink[] = HEADER_NAV_LINKS.map((l) => ({
  to: l.to,
  label: l.labelDefault,
  labelKey: l.labelKey,
  areasMenu: l.sheet === 'areas',
  marketsMenu: l.sheet === 'markets',
}));

export function MarketingHeader({
  links,
  userHref = '/',
  loginHref = '/login',
  signupHref = '/register',
  theme = 'light',
  embedded = false,
}: MarketingHeaderProps) {
  const { t } = useTranslation('common');
  const items = links ?? NAV_LINKS;
  const { pathname } = useLocation();
  // Active when the current path IS the entry or sits below it, so /markets/de
  // keeps "Markets" lit.
  const hrefFor = (to: string) => `${userHref.replace(/\/$/, '')}/${to}`;
  const isActive = (to: string) => {
    const href = hrefFor(to);
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const inverse = theme === 'inverse';
  const lang = userHref.replace(/^\/|\/$/g, '') || 'en';

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const mobileNavId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const barTone = inverse
    ? 'bg-brand text-fg-inverse'
    : scrolled
      ? 'bg-surface shadow-md'
      : 'bg-surface/85 backdrop-blur-xl';

  return (
    <header className={`${embedded ? 'relative' : 'fixed inset-x-0 top-0'} z-50 border-b ${inverse ? 'border-stroke-brand' : 'border-stroke-subtle'} transition-all ${barTone}`}>
      {/* ── Desktop — from xl only: six entries with German labels do not
          survive 1024px (user finding on the GlobalNav twin, 2026-08-28); note
          xl is 1440 in this Tailwind scale, so the cut is desktop-m (1280). ── */}
      <div className="mx-auto hidden h-20 max-w-container-3xl items-center gap-4 px-4 desktop-m:flex">
        <div className="flex flex-1 basis-0 items-center gap-5">
          {/* Zwischen 1280 und 1440 nur die Bildmarke — dasselbe Muster, das
              GlobalNav fuer dasselbe Problem schon faehrt. Gemessen am
              gebauten Stand brauchte die Leiste bei 1280 mit vollem Lockup
              1339 px bei 1280 verfuegbaren; der Registrieren-Knopf wurde
              abgeschnitten. Das galt schon vor der Logo-Vergroesserung
              (1299 px), nur weniger deutlich. Die Wortmarke belegt 123 px —
              genau die Reserve, die hier fehlt. Ab 1440 passt beides. */}
          <span className="desktop-l:hidden">
            <Logo lockup="symbol" tone={inverse ? 'on-petrol' : undefined} href={userHref} className="h-[47px]" />
          </span>
          <span className="hidden desktop-l:block">
            <Logo tone={inverse ? 'on-petrol' : undefined} href={userHref} />
          </span>
        </div>
        {/* Anchor group sits truly centered between the two flex-1 side zones. */}
        <nav className="flex items-center justify-center gap-1.5 desktop-l:gap-3">
            {items.map((it) => {
              const itemLabel = it.labelKey ? t(it.labelKey, { defaultValue: it.label }) : it.label;
              if (it.marketsMenu) {
                return (
                  <MarketsMenuPanel
                    key={it.to}
                    label={itemLabel}
                    lang={userHref.replace(/^\/|\/$/g, '') || 'en'}
                    isActive={isActive('markets')}
                    triggerClassName={inverse ? 'text-white/85 hover:text-fg-inverse' : undefined}
                  />
                );
              }
              if (it.areasMenu) {
                return (
                  <AreasMenuPanel
                    key={it.to}
                    label={itemLabel}
                    lang={userHref.replace(/^\/|\/$/g, '') || 'en'}
                    isActive={isActive('compliance')}
                    triggerClassName={inverse ? 'text-white/85 hover:text-fg-inverse' : undefined}
                  />
                );
              }
              return (
                <Link
                  key={it.to}
                  to={hrefFor(it.to)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-2 text-body-sm font-medium transition-colors ${
                    isActive(it.to)
                      ? 'bg-brand-light text-fg-brand'
                      : inverse
                        ? 'text-white/85 hover:text-fg-inverse'
                        : 'text-fg-secondary hover:text-fg'
                  }`}
                >
                  {itemLabel}
                </Link>
              );
            })}
        </nav>
        <div className="flex flex-1 basis-0 items-center justify-end gap-5">
          <ThemeToggle inverse={inverse} size={36} />
          <LanguageMenu triggerClassName={`h-9 w-9 ${inverse ? 'text-fg-inverse hover:text-fg-inverse' : ''}`} />
          <a
            href={loginHref}
            className={`inline-flex h-[40px] items-center whitespace-nowrap rounded-md border-thin px-4 text-body-sm font-semibold ${
              inverse ? 'border-white/40 text-fg-inverse' : 'border-stroke-brand text-fg-brand'
            }`}
          >
            {t('header.login')}
          </a>
          <a
            href={signupHref}
            className={`inline-flex h-[40px] items-center whitespace-nowrap rounded-md px-4 text-body-sm font-semibold ${
              inverse ? 'bg-white text-fg' : 'bg-brand text-fg-on-brand'
            }`}
          >
            {t('nav.signup')}
          </a>
        </div>
      </div>

      {/* ── Mobile / Tablet (bar + drill-down panel until the desktop bar fits) ── */}
      <div className="desktop-m:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          {/* Mobile: mark only — wordmark + claim dropped to save width. */}
          <Logo lockup="symbol" tone={inverse ? 'on-petrol' : undefined} />
          <div className="flex items-center gap-2">
            <ThemeToggle inverse={inverse} size={40} />
            <LanguageMenu triggerClassName={`h-10 w-10 ${inverse ? 'text-fg-inverse hover:text-fg-inverse' : ''}`} />
            <button
              aria-label={t('header.nav.openMenu', 'Open menu')}
              aria-expanded={open}
              aria-controls={mobileNavId}
              onClick={() => setOpen(true)}
              className={`grid h-11 w-11 place-items-center rounded-md ${inverse ? 'text-fg-inverse' : 'text-fg'}`}
            >
              <Menu size={22} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* The panel covers the bar it opened from, so it carries its own — see
          MobileNav. The lockup is the light-ground one even under `inverse`:
          the panel itself is always on bg-surface. */}
      <MobileNav
        id={mobileNavId}
        open={open}
        onClose={() => setOpen(false)}
        lang={lang}
        logo={<Logo lockup="symbol" href={null} />}
        utilities={
          <>
            <ThemeToggle size={40} />
            <LanguageMenu triggerClassName="h-10 w-10" />
          </>
        }
        actions={
          <div className="flex items-center gap-3">
            <a
              href={loginHref}
              className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-md border-thin border-stroke-brand px-3 text-body-sm font-semibold text-fg-brand"
            >
              {t('header.login')}
            </a>
            <a
              href={signupHref}
              className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-brand px-3 text-body-sm font-semibold text-fg-on-brand"
            >
              {t('nav.signup')}
            </a>
          </div>
        }
      />
    </header>
  );
}
