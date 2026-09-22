import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AreasMenuPanel } from './AreasMenuPanel';
import { MarketsMenuPanel } from './MarketsMenuPanel';
import { LanguageMenu } from './LanguageMenu';
import { useAuthStore } from '../../store/useAuthStore';
import { AccountActions } from './AccountActions';
import { AccountMenu } from './AccountMenu';
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
  // Bis 2026-09-19 las diese Kopfzeile den Anmeldezustand GAR NICHT: auf der
  // Startseite bekam ein angemeldeter Nutzer "Anmelden" und "Kostenlos starten"
  // angeboten, und einen Weg ins Dashboard gab es hier nirgends. GlobalNav
  // wusste es laengst — dieselbe Seite, zwei Antworten.
  const { isLoggedIn } = useAuthStore();

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
          {/* Unter 1440 nur die Bildmarke — dasselbe Muster, das GlobalNav
              fuer dasselbe Problem faehrt. Diese Leiste ist der ENGSTE Fall
              der ganzen Site, enger als die Navigation.

              Alles im Browser an der rechten Kante nachgemessen, bei 1440:

                Logo-Hoehe   Lockup    rechte Kante bei 1440
                47 px        170 px    1432   (mit Claim, Stand vor 19.09.)
                47 px        230 px    1471   laeuft 31 px ueber
                38 px        186 px    passt erst ab 1520
                36 px        177 px    passt bei 1440     <- heutiger Stand

              Mit Claim blieben bei 1440 genau 8 px Luft. Das war schon vor
              dem groesseren Wortzeichen zu wenig: ein laengeres Label oder
              eine andere Locale haette denselben Ueberlauf erzeugt. Der
              Registrieren-Knopf wird dabei still abgeschnitten, ohne
              Scrollbalken — das Element ist fixed, sein Ueberlauf taucht in
              document.scrollWidth nicht auf. Wer hier etwas vergroessert,
              misst die rechte Kante der KINDER gegen innerWidth, nicht
              scrollWidth.

              Zwischenzeitlich stand hier min-[1520px], eine gemessene
              Inhaltsschwelle statt einer Grid-Stufe. Mit 36 px statt 38
              passt das Lockup wieder bei 1440, deshalb steht der
              Umschaltpunkt zurueck auf dem Token desktop-l. */}
          <span className="desktop-l:hidden">
            <Logo lockup="symbol" tone={inverse ? 'on-petrol' : undefined} href={userHref} className="h-[36px]" />
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
          {isLoggedIn ? (
            /* Bis 2026-09-22 stand hier ein gefuellter "Mein Dashboard"-Knopf,
               und sonst nichts: kein Name, kein Abmelden. Damit war Abmelden
               auf der Startseite gar nicht erreichbar — auch das Mobile-Panel
               traegt dort nur den Dashboard-Knopf. Nutzer-Entscheidung
               2026-09-22 (Variante A): dasselbe Konto-Menue wie ueberall.
               Begruendung und Messwerte in AccountMenu.tsx. */
            <AccountMenu lang={lang} inverse={inverse} closeKey={pathname} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* ── Mobile / Tablet (bar + drill-down panel until the desktop bar fits) ── */}
      <div className="desktop-m:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          {/* Mobile: mark only — wordmark + claim dropped to save width. */}
          <Logo lockup="symbol" tone={inverse ? 'on-petrol' : undefined} />
            {/* Drei gleiche Boxen (44 px) mit drei gleichen Glyphen (22 px) und
                2 px dazwischen — macht 24 px von Glyph zu Glyph, so wie der
                Nutzer es sieht (Festlegung 2026-09-19). Vorher waren es 41 px:
                nicht wegen des gap, sondern weil `h-10 w-10` am Sprachknopf in
                DIESEM Projekt 64 px ergibt — spacing['10'] ist auf 64 gemappt,
                nicht auf 40 (siehe Button.tsx). 11 ist nicht umgemappt und
                bleibt 44, also die Groesse, die auch das Tippziel verlangt. */}
          <div className="flex items-center gap-[2px]">
            <ThemeToggle inverse={inverse} size={44} iconSize={22} />
            <LanguageMenu
              iconSize={22}
              triggerClassName={`h-11 w-11 ${inverse ? 'text-fg-inverse hover:text-fg-inverse' : ''}`}
            />
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
        actions={<AccountActions lang={lang} onNavigate={() => setOpen(false)} />}
      />
    </header>
  );
}
