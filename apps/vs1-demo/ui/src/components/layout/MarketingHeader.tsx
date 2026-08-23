import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AreasMenuPanel } from './AreasMenuPanel';
import { MarketsMenuPanel } from './MarketsMenuPanel';
import { LanguageMenu } from './LanguageMenu';

// ─── MarketingHeader ──────────────────────────────────────────────────────────
// The marketing navigation, responsive: desktop bar + mobile expanding pill panel.
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
  /** Navigation entries. Defaults to NAV_LINKS. */
  links?: NavLink[];
  /** Locale-aware home link on the logo. */
  userHref?: string;
  loginHref?: string;
  /** Theme over a dark hero (white logo + nav). */
  theme?: 'light' | 'inverse';
  /** Render in normal flow (relative) instead of fixed — for showcases / embeds. */
  embedded?: boolean;
}

// The five destinations that carry the story: how the model works, what we cover,
// where it applies, what it costs, and the library. /platform and /solutions stay
// out of the header on purpose — §11 P5 keeps them as SEO surfaces, reachable from
// the footer, and a seven-entry bar does not survive German labels.
const NAV_LINKS: NavLink[] = [
  { to: 'how-it-works', label: 'How it works', labelKey: 'header.nav.howItWorks' },
  { to: 'compliance', label: 'Compliance areas', labelKey: 'header.nav.complianceAreas', areasMenu: true },
  { to: 'markets', label: 'Markets', labelKey: 'header.nav.markets', marketsMenu: true },
  { to: 'pricing', label: 'Pricing', labelKey: 'header.nav.pricing' },
  { to: 'resources', label: 'Resources', labelKey: 'header.nav.resources' },
];

export function MarketingHeader({
  links,
  userHref = '/',
  loginHref = '/login',
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

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
      {/* ── Desktop ── */}
      <div className="mx-auto hidden h-20 max-w-container-2xl items-center gap-4 px-4 lg:flex">
        <div className="flex flex-1 basis-0 items-center gap-5">
          <Logo tone={inverse ? 'on-petrol' : 'on-light'} href={userHref} />
        </div>
        {/* Anchor group sits truly centered between the two flex-1 side zones. */}
        <nav className="flex items-center justify-center gap-3">
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
        </div>
      </div>

      {/* ── Mobile / Tablet (pill panel until the desktop bar fits) ── */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          {/* Mobile: mark only — wordmark + claim dropped to save width. */}
          <Logo lockup="mark" tone={inverse ? 'on-petrol' : 'on-light'} />
          <div className="flex items-center gap-2">
            <ThemeToggle inverse={inverse} size={40} />
            <LanguageMenu triggerClassName={`h-10 w-10 ${inverse ? 'text-fg-inverse hover:text-fg-inverse' : ''}`} />
            <button
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`grid h-[40px] w-[40px] place-items-center rounded-md ${inverse ? 'text-fg-inverse' : 'text-fg'}`}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden bg-surface"
            >
              {/* Button row */}
              <div className="flex items-center gap-4 px-4 pb-1 pt-4">
                <a href={loginHref} className="inline-flex h-[40px] flex-1 items-center justify-center rounded-md border-thin border-stroke-brand px-4 text-body-sm font-semibold text-fg-brand">
                  {t('header.login')}
                </a>
              </div>
              {/* Pill row (horizontal scroll) */}
              <div className="flex gap-3 overflow-x-auto px-4 pb-5 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((a) => (
                  <Link
                    key={a.to}
                    to={hrefFor(a.to)}
                    onClick={() => setOpen(false)}
                    className={`shrink-0 whitespace-nowrap rounded-pill px-3.5 py-2 text-body-sm font-semibold transition-colors ${
                      isActive(a.to) ? 'bg-brand text-fg-on-brand' : 'bg-surface-secondary text-fg'
                    }`}
                  >
                    {a.labelKey ? t(a.labelKey, { defaultValue: a.label }) : a.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
