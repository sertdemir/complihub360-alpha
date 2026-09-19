import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard } from 'lucide-react';
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
// User, 2026-09-19: signed in it is the dashboard, signed out it is sign-in, and
// the icon on the right can go. The sign-out button went with it — a nav panel
// is for going somewhere, and signing out is neither a destination nor something
// anyone wants one thumb-width from "Dashboard". It stays where it belongs, in
// the account menu and in the workspace rail.
//
// Reading the store here rather than in each header is what keeps the answer the
// same on both surfaces.

export interface AccountActionsProps {
  /** Active locale segment, e.g. 'de'. */
  lang: string;
  /** Closes the panel the block sits in. */
  onNavigate?: () => void;
}

const BASE =
  'inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-body-sm font-semibold transition-colors';
const OUTLINE = `${BASE} flex-1 border-thin border-stroke-brand text-fg-brand hover:bg-brand-light`;
const PRIMARY = `${BASE} flex-1 bg-brand text-fg-on-brand hover:bg-brand/90`;

export function AccountActions({ lang, onNavigate }: AccountActionsProps) {
  const { t } = useTranslation('common');
  const { isLoggedIn, role } = useAuthStore();

  // Signed in: one destination, full width, filled — there is nothing to weigh
  // it against, and a lone outline button reads like a secondary choice with no
  // primary in sight.
  if (isLoggedIn) {
    const to = `/${lang}${role === 'partner' ? '/partner-dashboard' : '/dashboard'}`;
    return (
      <Link to={to} onClick={onNavigate} className={`${PRIMARY} w-full`}>
        <LayoutDashboard size={17} aria-hidden />
        {t('nav.dashboard', 'My dashboard')}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link to={`/${lang}/login`} onClick={onNavigate} className={OUTLINE}>
        {t('header.login', 'Log in')}
      </Link>
      <Link to={`/${lang}/register`} onClick={onNavigate} className={PRIMARY}>
        {t('nav.signup', 'Sign up for free')}
      </Link>
    </div>
  );
}
