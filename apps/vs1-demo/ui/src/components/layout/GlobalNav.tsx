import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useAuthStore } from '../../store/useAuthStore';
import {
  // The mega-menu item type stays: every entry is a flat link today, but the
  // dropdown machinery is guarded by `items.length > 0` and works the moment a
  // menu gets children again. The ten section icons went with those children.
  type LucideIcon,
  ChevronDown, ArrowRight,
  LogOut, LayoutDashboard, User
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Typography } from '../ui/Typography';
import { ThemeToggle } from '../ui/ThemeToggle';

const HIDDEN_PATHS = ['/login', '/register', '/verify-email'];

export function GlobalNav() {
  const { t, i18n } = useTranslation('common');
  const currentLang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isLoggedIn, role, userName, logout } = useAuthStore();

  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  const isHidden = HIDDEN_PATHS.includes(pathWithoutLang) || pathWithoutLang.startsWith('/wizard');

  useEffect(() => {
    const handleScroll = () => { setActiveMenu(null); setUserMenuOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('header')) setActiveMenu(null);
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
    setActiveMenu(null);
    if (path.startsWith('/')) {
      navigate(`/${currentLang}${path}`);
    } else {
      navigate(path);
    }
  };

  const HEADER_MENU: {
    id: string;
    label: string;
    path?: string;
    items: { icon: LucideIcon; anim: any; title: string; desc: string; path: string }[];
  }[] = [
    // Same five destinations as the MarketingHeader — the two headers must not
    // present different navigations. Platform and Solutions dropped out of the
    // header on 2026-08-18: §11 P5 keeps them as SEO surfaces, reachable from the
    // footer, and seven entries do not survive German labels.
    { id: 'how-it-works', label: t('header.nav.howItWorks', 'How it works'), path: '/how-it-works', items: [] },
    { id: 'areas', label: t('header.nav.complianceAreas', 'Compliance Areas'), path: '/compliance', items: [] },
    { id: 'markets', label: t('header.nav.markets', 'Markets'), path: '/markets', items: [] },
    { id: 'pricing', label: t('header.nav.pricing', 'Pricing'), path: '/pricing', items: [] },
    { id: 'resources', label: t('header.nav.resources', 'Resources'), path: '/resources', items: [] },
  ];

  if (isHidden) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">

      {/* ── Full Width Header ─────────────────────────────────── */}
      <div className="pointer-events-auto w-full bg-surface backdrop-blur-xl border-b border-stroke-subtle shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-2 md:gap-4 py-4 lg:py-6 w-full max-w-[1440px] mx-auto pl-4 pr-8">

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
          {HEADER_MENU.map((menu) => (
            <div key={menu.id} className="flex items-center">
              <button
                onClick={() => {
                  if (menu.path) navTo(menu.path);
                  else setActiveMenu(activeMenu === menu.id ? null : menu.id);
                }}
                className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeMenu === menu.id
                    ? 'text-fg-brand bg-brand-light'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-secondary'
                }`}
              >
                {menu.label}
                {menu.items.length > 0 && (
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${activeMenu === menu.id ? 'rotate-180 text-fg-brand' : 'text-fg-tertiary'}`}
                  />
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="w-px h-5 bg-stroke shrink-0 hidden md:block" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 h-10">
          <ThemeToggle size={36} />
          <LanguageSwitcher />

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

      {/* ── Floating Dropdown ───────────────────────────────────── */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' } as any}
            className="pointer-events-auto mt-2 w-full max-w-[1100px] mx-4 rounded-2xl bg-surface backdrop-blur-xl border border-stroke-subtle shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <div className="px-8 py-6">
              <div className="flex flex-nowrap justify-center gap-10">
                {HEADER_MENU.find(m => m.id === activeMenu)?.items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navTo(item.path)}
                    className="text-left group flex items-start gap-3 p-3 -m-3 rounded-xl hover:bg-surface-secondary transition-colors"
                  >
                    <motion.div
                      className="flex items-start justify-center shrink-0 pt-0.5"
                      whileHover={item.anim}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 } as any}
                    >
                      <item.icon size={32} className="text-fg-brand group-hover:opacity-75 transition-colors" strokeWidth={1.5} />
                    </motion.div>
                    <div className="mt-0.5">
                      <Typography variant="ui-small" weight="bold" className="text-fg flex items-center gap-1 mb-1 group-hover:text-fg-brand transition-colors">
                        {item.title}
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 w-0 group-hover:w-auto overflow-hidden group-hover:opacity-100 group-hover:translate-x-0 transition-all text-fg-brand" />
                      </Typography>
                      <Typography variant="caption" className="text-fg-tertiary block normal-case tracking-normal">
                        {item.desc}
                      </Typography>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
