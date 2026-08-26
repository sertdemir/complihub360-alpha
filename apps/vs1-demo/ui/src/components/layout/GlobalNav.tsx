import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supportedLngs } from '../../i18n/config';
import { LanguageMenu } from './LanguageMenu';
import { AreasMenuPanel } from './AreasMenuPanel';
import { MarketsMenuPanel } from './MarketsMenuPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

const menuItemClass = (active: boolean) =>
  `flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
    active ? 'text-fg-brand bg-brand-light' : 'text-fg-secondary hover:text-fg hover:bg-surface-secondary'
  }`;

const HIDDEN_PATHS = ['/login', '/register', '/verify-email'];

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isLoggedIn, role, userName, logout } = useAuthStore();

  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  const isHidden = HIDDEN_PATHS.includes(pathWithoutLang) || pathWithoutLang.startsWith('/wizard');

  useEffect(() => {
    const handleScroll = () => setUserMenuOpen(false);
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !(e.target as Element).closest('.user-menu-trigger')) setUserMenuOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const navTo = (path: string) => {
    if (path.startsWith('/')) {
      navigate(`/${currentLang}${path}`);
    } else {
      navigate(path);
    }
  };

  // Every entry is a destination. The one exception is the areas entry, which
  // opens the NavMenu sheet instead — a control that reveals children, which is
  // the only thing that legitimately stays a button.
  const HEADER_MENU: {
    id: string;
    label: string;
    path: string;
    /** Opens the eight compliance areas as a full-width sheet. */
    /** Which mega-menu this entry opens, if any. */
    sheet?: 'areas' | 'markets';
  }[] = [
    // Same five destinations as the MarketingHeader — the two headers must not
    // present different navigations. Platform and Solutions dropped out of the
    // header on 2026-08-18: §11 P5 keeps them as SEO surfaces, reachable from the
    // footer, and seven entries do not survive German labels.
    { id: 'how-it-works', label: t('header.nav.howItWorks', 'How it works'), path: '/how-it-works' },
    { id: 'areas', label: t('header.nav.complianceAreas', 'Compliance Areas'), path: '/compliance', sheet: 'areas' },
    { id: 'markets', label: t('header.nav.markets', 'Markets'), path: '/markets', sheet: 'markets' },
    { id: 'pricing', label: t('header.nav.pricing', 'Pricing'), path: '/pricing' },
    { id: 'resources', label: t('header.nav.resources', 'Resources'), path: '/resources' },
  ];

  if (isHidden) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">

      {/* ── Full Width Header ─────────────────────────────────── */}
      {/* h-16 lg:h-20 is the MarketingHeader's bar height — the two headers sit
          on the same routes' shared layout, so they must be the same height, or
          every page that clears the fixed bar with padding is wrong on half the
          site. Fixed height, not padding: the tallest child (h-10 actions) must
          never grow the bar. */}
      <div className="pointer-events-auto w-full bg-surface backdrop-blur-xl border-b border-stroke-subtle shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
        <div className="flex h-16 items-center justify-between gap-2 md:gap-4 lg:h-20 w-full max-w-[1440px] mx-auto pl-4 pr-8">

        {/* Logo — the real lockup from the design system, never a rebuilt mark.
            This used to be a CircleDot glyph in a green square plus a text
            wordmark, which carried no brand claim; since SiteHeader routes every
            non-landing page through GlobalNav, "Always on your side." reached
            only two routes. href={null} keeps the anchor out: navTo prefixes the
            active locale, which a plain href would drop. */}
        <button
          onClick={() => navTo('/')}
          className="flex shrink-0 items-center px-2"
          aria-label="CompliHub360 Home"
        >
          <Logo lockup="horizontal" tone="on-light" href={null} markClassName="h-7" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-stroke shrink-0 hidden md:block" />

        {/* Nav */}
        <nav className="flex items-center justify-center flex-1 gap-1 md:gap-4 lg:gap-6 min-w-0 overflow-hidden">
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
        <div className="flex items-center gap-1 shrink-0 h-10">
          <ThemeToggle size={36} />
          <LanguageMenu triggerClassName="h-9 w-9" />

          {isLoggedIn ? (
            <div className="relative user-menu-trigger" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-fg-on-brand text-xs font-bold">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-fg-secondary hidden md:block">
                  {userName || (role === 'partner' ? 'Partner' : 'User')}
                </span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 text-fg-tertiary ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-surface border border-stroke rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-stroke-subtle">
                      <p className="text-sm font-semibold text-fg">{userName || 'User'}</p>
                      <p className="text-xs text-fg-tertiary mt-0.5">{role === 'partner' ? 'Beratungspartner' : 'Unternehmen'}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          const dashPath = role === 'partner' ? '/partner-dashboard' : '/dashboard';
                          navTo(dashPath);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg-secondary hover:bg-surface-secondary transition-colors"
                      >
                        <LayoutDashboard size={16} className="text-fg-tertiary" />
                        Mein Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          navTo('/');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        Abmelden
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button
                className="text-fg-secondary hover:text-fg text-xs font-semibold px-2 md:px-3 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors whitespace-nowrap"
                onClick={() => navTo('/login')}
              >
                {t('nav.login', 'Log in')}
              </button>
              <Button variant="primary" size="sm" onClick={() => navTo('/register')}>
                {t('nav.signup', 'Sign up for free')}
              </Button>
            </>
          )}
        </div>
        </div>
      </div>

    </header>
  );
}
