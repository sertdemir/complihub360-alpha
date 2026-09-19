import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

// ─── AccountActions ──────────────────────────────────────────────────────────
// The account block at the foot of the mobile navigation panel, once, for both
// headers — the same promise navLinks.ts makes for the entries above it.
//
// Until 2026-09-19 the two headers answered the question "who is this?"
// differently, and one of them did not answer it at all:
//
//   GlobalNav        knew. Logged in it showed "Mein Dashboard" plus an
//                    icon-only sign-out button; logged out, login + signup.
//   MarketingHeader  did NOT read the auth store. On the landing page a signed-in
//                    visitor was offered "Anmelden" and "Kostenlos starten", and
//                    the mobile menu carried no way into the dashboard at all.
//
// User, 2026-09-19, over three passes:
//
//   signed in    ONE button, the filled primary with its icon in front, going
//                to the dashboard. Nothing beside it.
//   signed out   the same filled primary, "Anmelden" with its own icon — NOT
//                the quiet outline it used to be — and the signup CTA beside it
//                as the secondary.
//
// That inverts the old weighting on purpose. This block is the member area: the
// way back in comes first, and starting fresh is the alternative offered next to
// it, not the other way round.
//
// The sign-out button went in the same pass. A nav panel is for going somewhere,
// and signing out is neither a destination nor something anyone wants one
// thumb-width from "Dashboard". It stays in the account menu and in the
// workspace rail.
//
// Reading the store here rather than in each header is what keeps the answer the
// same on both surfaces.

export interface AccountActionsProps {
  /** Active locale segment, e.g. 'de'. */
  lang: string;
  /** Closes the panel the block sits in. */
  onNavigate?: () => void;
}

export function AccountActions({ lang, onNavigate }: AccountActionsProps) {
  const { t } = useTranslation('common');
  const { isLoggedIn, role } = useAuthStore();

  // h-[48px] als Pixelwert, NICHT h-12: die spacing-Skala dieses Projekts ist
  // ueberschrieben, 12 steht dort auf 96 px (siehe Button.tsx, das aus demselben
  // Grund ueberall Pixel setzt). Mit h-12 war der Knopf doppelt so hoch.
  const BASE =
    'inline-flex h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-body-sm font-semibold transition-colors';
  const PRIMARY = `${BASE} bg-brand text-fg-on-brand hover:bg-brand/90`;
  const SECONDARY = `${BASE} border-thin border-stroke-brand text-fg-brand hover:bg-brand-light`;

  if (isLoggedIn) {
    const to = `/${lang}${role === 'partner' ? '/partner-dashboard' : '/dashboard'}`;
    return (
      <Link to={to} onClick={onNavigate} className={`${PRIMARY} w-full`}>
        <LayoutDashboard size={17} aria-hidden />
        {t('nav.dashboard', 'My dashboard')}
      </Link>
    );
  }

  // Nebeneinander, solange beide passen; sonst untereinander, mit Anmelden
  // UNTEN (Nutzer 2026-09-19). Beides ohne Breakpoint:
  //
  //   flex-wrap-reverse  kehrt die Querachse um. Die erste Zeile liegt damit
  //                      unten — Anmelden steht im Markup zuerst und landet
  //                      beim Umbruch also UNTER "Kostenlos starten", waehrend
  //                      es nebeneinander LINKS steht. Eine Klasse, beide
  //                      Anordnungen, eine Reihenfolge im DOM.
  //   basis-[160px]      ist der Boden. Mit flex-1 (basis 0) wuerde nie
  //                      umgebrochen, sondern nur geschrumpft, bis der Text
  //                      bricht.
  //
  // Der Umbruchpunkt ist dadurch SPRACHABHAENGIG, und das ist gewollt: wo die
  // Beschriftung laenger ist als der Boden, hebt min-width:auto die Basis auf
  // die Inhaltsbreite an, und die Zeile bricht frueher. Im Browser gemessen,
  // Geraetebreite gegen Anordnung:
  //
  //             430   390   375   360   320   280
  //     DE/ES   neben neben STAPEL …
  //     EN/TR   neben neben neben STAPEL …
  //
  // Bis hinunter zu 280 px wird kein Text geschnitten (scrollWidth gegen
  // clientWidth geprueft, nicht nach Augenmass).
  return (
    <div className="flex flex-wrap-reverse items-center gap-3">
      <Link to={`/${lang}/login`} onClick={onNavigate} className={`${PRIMARY} grow basis-[160px]`}>
        <LogIn size={17} aria-hidden />
        {t('header.login', 'Log in')}
      </Link>
      <Link to={`/${lang}/register`} onClick={onNavigate} className={`${SECONDARY} grow basis-[160px]`}>
        {t('nav.signup', 'Sign up for free')}
      </Link>
    </div>
  );
}
