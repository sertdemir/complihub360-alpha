import { useState, useId } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLngs } from '../../i18n/config';
import { LanguageMenu } from './LanguageMenu';
import { AreasMenuPanel } from './AreasMenuPanel';
import { MarketsMenuPanel } from './MarketsMenuPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AccountActions } from './AccountActions';
import { MobileNav } from './MobileNav';
import { AccountMenu } from './AccountMenu';
import { HEADER_NAV_LINKS } from './navLinks';

const menuItemClass = (active: boolean) =>
  `flex items-center gap-1 px-2 desktop-l:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
    active ? 'text-fg-brand bg-brand-light' : 'text-fg-secondary hover:text-fg hover:bg-surface-secondary'
  }`;

const HIDDEN_PATHS = ['/login', '/register', '/partner-apply', '/verify-email'];

export function GlobalNav() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  // From the URL, not from i18n: on /de/compliance the resolved language can
  // still read 'en' while t() already returns German, which produced German
  // labels pointing at /en/… — one click and the visitor was in the wrong
  // language. The path segment is what actually says which locale you are on.
  const pathLang = location.pathname.split('/').filter(Boolean)[0];
  const currentLang = supportedLngs.includes(pathLang) ? pathLang : i18n.resolvedLanguage || 'en';
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavId = useId();
  const { isLoggedIn } = useAuthStore();

  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  const isHidden = HIDDEN_PATHS.includes(pathWithoutLang) || pathWithoutLang.startsWith('/wizard');

  const navTo = (path: string) => {
    if (path.startsWith('/')) {
      navigate(`/${currentLang}${path}`);
    } else {
      navigate(path);
    }
  };

  // Every entry is a destination. The exceptions are the two mega-menu
  // entries, which open a sheet instead — a control that reveals children,
  // which is the only thing that legitimately stays a button. The entries
  // themselves come from the shared source both headers read (navLinks.ts) —
  // the two headers cannot present different navigations anymore.
  const HEADER_MENU = HEADER_NAV_LINKS.map((l) => ({
    id: l.to,
    label: t(l.labelKey, l.labelDefault),
    path: `/${l.to}`,
    sheet: l.sheet,
  }));

  if (isHidden) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">

      {/* ── Full Width Header ─────────────────────────────────── */}
      {/* h-16 lg:h-20 is the MarketingHeader's bar height — the two headers sit
          on the same routes' shared layout, so they must be the same height, or
          every page that clears the fixed bar with padding is wrong on half the
          site. Fixed height, not padding: the tallest child (the 40px action
          row) must never grow the bar.

          Die Zeile stand bis 2026-09-20 auf `h-10` — in diesem Projekt 64 px,
          nicht 40 (siehe Button.tsx und die spacing-Skala). Sichtbar kaputt war
          nichts, weil die Leiste `h-20` (80) traegt und 64 hineinpasst; die
          Begruendung oben rechnete aber mit 40, und mit 24 px Totraum in der
          Zeile stimmt sie nicht mehr, sobald jemand die Leistenhoehe anfasst. */}
      <div className="pointer-events-auto w-full bg-surface backdrop-blur-xl border-b border-stroke-subtle shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
        {/* ── Desktop bar — from xl only: six entries with German labels do
            not survive 1024px, they clipped behind overflow-hidden. Below
            desktop-m (1280) the burger panel takes over — note xl is 1440 in
            this Tailwind scale. ── */}
        <div className="hidden desktop-m:flex h-20 items-center justify-between gap-3 w-full max-w-container-3xl mx-auto pl-4 pr-8">

        {/* Logo — the real lockup from the design system, never a rebuilt mark.
            This used to be a CircleDot glyph in a green square plus a text
            wordmark, which carried no brand claim; since SiteHeader routes every
            non-landing page through GlobalNav, "Always on your side" reached
            only two routes. href={null} keeps the anchor out: navTo prefixes the
            active locale, which a plain href would drop. */}
        <button
          onClick={() => navTo('/')}
          className="flex shrink-0 items-center px-2"
          aria-label="CompliHub360 Home"
        >
          {/* Unter 1440 nur die Bildmarke: das volle Lockup und die sechs
              deutschen Eintraege brauchen dieselben Pixel. Bei 1440 bleiben
              mit dem 177-px-Lockup 45 px Nav-Reserve (Nav-Inhalt 806 px).

              Eine Schwelle fuer BEIDE Kopfzeilen, nicht zwei — sonst waere
              das Wortzeichen beim Wechsel von der Startseite auf eine
              Unterseite erschienen und wieder verschwunden. Der engere Fall
              ist der MarketingHeader; die Begruendung steht dort. */}
          <span className="desktop-l:hidden">
            <Logo lockup="symbol" href={null} className="h-[36px]" />
          </span>
          <span className="hidden desktop-l:block">
            <Logo lockup="horizontal" href={null} />
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-stroke shrink-0 hidden md:block" />

        {/* Nav */}
        <nav className="flex items-center justify-center flex-1 gap-1 desktop-l:gap-3 min-w-0 overflow-hidden">
          {/* A destination is an <a>, not a button. As a button it had no href:
              no new tab, no copy-link, not announced as a link — and invisible
              to crawlers, which would have quietly undone the whole point of
              making these pages reachable. Only a menu that opens children
              stays a button, because that is what it does. */}
          {HEADER_MENU.map((menu) => (
            <div key={menu.id} className="flex items-center">
              {menu.sheet === 'areas' ? (
                <AreasMenuPanel
                  label={menu.label}
                  lang={currentLang}
                  isActive={location.pathname.startsWith(`/${currentLang}/compliance`)}
                />
              ) : menu.sheet === 'markets' ? (
                <MarketsMenuPanel
                  label={menu.label}
                  lang={currentLang}
                  isActive={location.pathname.startsWith(`/${currentLang}/markets`)}
                />
              ) : (
                <Link
                  to={`/${currentLang}${menu.path}`}
                  className={menuItemClass(location.pathname.startsWith(`/${currentLang}${menu.path}`))}
                >
                  {menu.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="w-px h-5 bg-stroke shrink-0 hidden md:block" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 h-[40px]">
          <ThemeToggle size={36} />
          <LanguageMenu triggerClassName="h-9 w-9" />

          {isLoggedIn ? (
            /* Seit 2026-09-22 ein gemeinsames Bauteil beider Kopfzeilen — der
               Block, der hier stand, war die vierte handgebaute Fassung dieses
               Musters. Die Begruendung und die Messwerte stehen in
               AccountMenu.tsx. */
            <AccountMenu lang={currentLang} closeKey={location.pathname} />
          ) : (
            <>
              <button
                className="text-fg-secondary hover:text-fg text-xs font-semibold px-2 md:px-3 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors whitespace-nowrap"
                onClick={() => navTo('/login')}
              >
                {t('header.login', 'Log in')}
              </button>
              <Button variant="primary" size="sm" onClick={() => navTo('/register')}>
                {t('nav.signup', 'Sign up for free')}
              </Button>
            </>
          )}
        </div>
        </div>

        {/* ── Mobile / Tablet (burger + drill-down panel) ── */}
        {/* GlobalNav had NO mobile navigation until 2026-08-28 (user finding):
            the desktop row simply clipped its entries behind overflow-hidden.
            The pill row that answered that then only moved the clipping into
            the panel — see MobileNav for what replaced it on 2026-09-19 and
            why. Both headers now open the same panel, so the two cannot
            present different navigations on mobile either. */}
        <div className="desktop-m:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <button onClick={() => navTo('/')} className="flex items-center" aria-label="CompliHub360 Home">
              <Logo lockup="symbol" href={null} />
            </button>
              {/* Drei gleiche Boxen (44 px) mit drei gleichen Glyphen (22 px) und
                  2 px dazwischen — macht 24 px von Glyph zu Glyph, so wie der
                  Nutzer es sieht (Festlegung 2026-09-19). Vorher waren es 41 px:
                  nicht wegen des gap, sondern weil `h-10 w-10` am Sprachknopf in
                  DIESEM Projekt 64 px ergibt — spacing['10'] ist auf 64 gemappt,
                  nicht auf 40 (siehe Button.tsx). 11 ist nicht umgemappt und
                  bleibt 44, also die Groesse, die auch das Tippziel verlangt. */}
            <div className="flex items-center gap-[2px]">
              <ThemeToggle size={44} iconSize={22} />
              <LanguageMenu iconSize={22} triggerClassName="h-11 w-11" />
              <button
                aria-label={t('header.nav.openMenu', 'Open menu')}
                aria-expanded={mobileOpen}
                aria-controls={mobileNavId}
                onClick={() => setMobileOpen(true)}
                className="grid h-11 w-11 place-items-center rounded-md text-fg"
              >
                <Menu size={22} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* The account actions the desktop bar's right zone carries, full-width
          at the bottom edge where a thumb reaches them. */}
      <MobileNav
        id={mobileNavId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        lang={currentLang}
        logo={<Logo lockup="symbol" href={null} />}
        actions={<AccountActions lang={currentLang} onNavigate={() => setMobileOpen(false)} />}
      />
    </header>
  );
}
