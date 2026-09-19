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
// User, 2026-09-19: ONE button, in both states, and both times the filled
// primary with its icon in front — signed in it goes to the dashboard, signed
// out it goes to sign-in. Nothing beside it.
//
// What that costs, stated so nobody has to rediscover it: the signup CTA
// ("Kostenlos starten") is no longer in the mobile menu. Registering runs over
// the page CTAs — hero, pricing, the area pages — which is where it was always
// the loudest anyway. The menu answers "where do I go", not "what should I buy".
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

  // One shape, two fillings. Everything that differs sits in these three lines,
  // so the two states cannot drift apart in height, weight or position.
  const to = isLoggedIn
    ? `/${lang}${role === 'partner' ? '/partner-dashboard' : '/dashboard'}`
    : `/${lang}/login`;
  const Icon = isLoggedIn ? LayoutDashboard : LogIn;
  const label = isLoggedIn ? t('nav.dashboard', 'My dashboard') : t('header.login', 'Log in');

  // h-[48px] als Pixelwert, NICHT h-12: die spacing-Skala dieses Projekts ist
  // ueberschrieben, 12 steht dort auf 96 px (siehe Button.tsx, das aus demselben
  // Grund ueberall Pixel setzt). Mit h-12 war der Knopf doppelt so hoch.
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="inline-flex h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-brand px-4 text-body-sm font-semibold text-fg-on-brand transition-colors hover:bg-brand/90"
    >
      <Icon size={17} aria-hidden />
      {label}
    </Link>
  );
}
