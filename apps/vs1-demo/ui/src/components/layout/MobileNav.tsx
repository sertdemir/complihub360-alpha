import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronRight, Globe, X } from 'lucide-react';
import { HEADER_NAV_LINKS } from './navLinks';
import { AREAS } from '../compliance-areas/areas';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getMarketProfile, MARKET_CODES } from '../../lib/marketProfiles';

// ─── MobileNav ───────────────────────────────────────────────────────────────
// The mobile navigation, once, for both headers — the same promise navLinks.ts
// makes for the entries themselves.
//
// It replaces the horizontally scrolling pill row both headers carried until
// 2026-09-19 (user finding: "die main navigation gibt es nicht in der mobile
// version"). The pill row came from the era when the entries were in-page
// anchors with scroll-spy; since the multipager move on 2026-08-18 it carried
// six real routes in a strip that shows two and a half of them at 390px, with
// no visible scrollbar to say the rest exist. Worse, the two mega-menu entries
// were flattened to plain links there, so the nine compliance areas and the
// eight markets — the whole second level the desktop sheets exist for — had no
// mobile representation at all.
//
// The pattern is drill-down (user choice from the variant canvas, 2026-09-19),
// picked over an inline accordion and a bottom sheet because it is the only one
// of the three that carries what the desktop sheets actually say: the area's own
// headline under its name, and the duties an engine source covers per market.
// Level 1 stays at exactly six rows, which fits a 667px viewport without
// scrolling; level 2 gets the full width and can afford two lines per row.
//
// Both sub-levels read the same sources the desktop sheets read (AREAS,
// MARKET_CODES + getMarketProfile), so mobile and desktop cannot drift.

type Level = 'root' | 'areas' | 'markets';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  /** Active locale segment, e.g. 'de'. */
  lang: string;
  /** Logo for the root-level bar. The panel is always on `bg-surface`, so pass
   *  the light-ground lockup even from an inverse header. */
  logo: React.ReactNode;
  /** Pinned to the bottom edge on every level — the thumb zone, which is why it
   *  is no longer the first thing under the bar. */
  actions: React.ReactNode;
  /** Set on the panel so the header's burger can point `aria-controls` at it. */
  id?: string;
}

const ROW = 'flex h-14 w-full items-center gap-2.5 border-b border-stroke-subtle px-5 text-left transition-colors';
const ROW_LABEL = 'flex-1 text-body font-semibold tracking-[-0.01em]';

export function MobileNav({ open, onClose, lang, logo, actions, id }: MobileNavProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const [level, setLevel] = useState<Level>('root');
  const panelRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  const panelId = id ?? fallbackId;

  const href = (path: string) => `/${lang}${path}`;
  const isActive = (to: string) => {
    const h = href(`/${to}`);
    return pathname === h || pathname.startsWith(`${h}/`);
  };

  // Closing and reopening starts at the top. Leaving the panel on the level the
  // last visit ended on reads as a broken back button the next time it opens.
  useEffect(() => {
    if (!open) setLevel('root');
  }, [open]);

  // The panel covers the viewport, so the page behind it must not scroll under
  // the thumb — on iOS that is what makes an overlay feel like a stuck page.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const back = useCallback(() => setLevel('root'), []);

  // Escape steps back one level before it closes — the same thing the back row
  // does, so the keyboard and the thumb agree.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (level === 'root') onClose();
        else back();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // A panel over the whole viewport that lets Tab walk into the page behind
      // it hands the keyboard to controls nobody can see.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, level, onClose, back]);

  // Focus follows the level, so a screen reader announces the sub-level's own
  // title instead of leaving the cursor on a row that is no longer on screen.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    el?.focus();
  }, [open, level]);

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={t('header.nav.closeMenu', 'Close menu')}
      className="grid h-11 w-11 place-items-center rounded-lg text-fg transition-colors hover:bg-surface-secondary"
    >
      <X size={22} aria-hidden />
    </button>
  );

  const subTitle =
    level === 'areas'
      ? t('header.nav.complianceAreas', 'Compliance areas')
      : t('header.nav.markets', 'Markets');

  // Into the body, not into the header. MarketingHeader's bar carries
  // `backdrop-blur-xl`, and a backdrop-filter makes an element the containing
  // block for its fixed descendants — `inset-0` then resolved against a 64px
  // bar and the panel came out zero pixels high, with the action row sitting
  // on top of the entries and swallowing every tap. GlobalNav's `<header>`
  // is `pointer-events-none` on top of that. A portal is out of reach of both.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-nav"
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('header.nav.menuLabel', 'Main navigation')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[60] flex flex-col bg-surface desktop-m:hidden"
        >
          {/* ── Bar ── Logo and the way out, nothing else (user, 2026-09-19).
              The theme and language controls used to sit here too, but this bar
              and the header's own are two different elements: the panel's group
              carried `-mr-2.5` and `gap-0.5` where the header had neither, so
              every icon shifted 10–22px the moment the menu opened. One control
              in the bar cannot drift; the two that could are reachable again the
              moment the panel closes. A sub-level swaps the logo for the way
              back and the title, so the panel never needs a second row. */}
          <div className="flex h-16 shrink-0 items-center gap-1 border-b border-stroke-subtle px-5">
            {level === 'root' ? (
              <>
                <Link to={`/${lang}`} onClick={onClose} aria-label="CompliHub360 Home" className="flex items-center">
                  {logo}
                </Link>
                <span className="flex-1" />
                {closeButton}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={back}
                  data-autofocus
                  tabIndex={-1}
                  aria-label={t('header.nav.back', 'Back')}
                  className="-ml-2.5 grid h-11 w-11 place-items-center rounded-lg text-fg transition-colors hover:bg-surface-secondary"
                >
                  <ArrowLeft size={22} aria-hidden />
                </button>
                <h2 className="ml-1 flex-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-fg">
                  {subTitle}
                </h2>
                {closeButton}
              </>
            )}
          </div>

          {/* ── Levels ── */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={level}
                initial={{ x: level === 'root' ? '-24%' : '24%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: level === 'root' ? '24%' : '-24%', opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col"
              >
                {level === 'root' && (
                  <nav className="flex-1 overflow-y-auto overscroll-contain" aria-label={t('header.nav.menuLabel', 'Main navigation')}>
                    {HEADER_NAV_LINKS.map((link) => {
                      const label = t(link.labelKey, link.labelDefault);
                      const active = isActive(link.to);
                      // A sheet entry keeps its children on mobile too, and a
                      // control that reveals children is a button. Everything
                      // else is a destination and stays an <a>.
                      if (link.sheet) {
                        const count =
                          link.sheet === 'areas'
                            ? t('header.nav.areasCount', { defaultValue: '{{count}} areas', count: AREAS.length })
                            : t('header.nav.marketsCount', { defaultValue: '{{count}} markets', count: MARKET_CODES.length });
                        return (
                          <button
                            key={link.to}
                            type="button"
                            onClick={() => setLevel(link.sheet === 'areas' ? 'areas' : 'markets')}
                            aria-expanded={false}
                            className={`${ROW} ${active ? 'bg-brand-light' : 'hover:bg-surface-secondary'}`}
                          >
                            <span className={`${ROW_LABEL} ${active ? 'text-fg-brand' : 'text-fg'}`}>{label}</span>
                            <span className="text-body-xs font-medium text-fg-tertiary">{count}</span>
                            <ChevronRight size={18} aria-hidden className={active ? 'text-fg-brand' : 'text-fg-tertiary'} />
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={link.to}
                          to={href(`/${link.to}`)}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={`${ROW} ${active ? 'bg-brand-light' : 'hover:bg-surface-secondary'}`}
                        >
                          <span className={`${ROW_LABEL} ${active ? 'text-fg-brand' : 'text-fg'}`}>{label}</span>
                          <ChevronRight size={18} aria-hidden className={active ? 'text-fg-brand' : 'text-fg-tertiary'} />
                        </Link>
                      );
                    })}
                  </nav>
                )}

                {level === 'areas' && (
                  <>
                    <div className="flex-1 overflow-y-auto overscroll-contain">
                    <p className="border-b border-stroke-subtle bg-surface-secondary px-5 py-3.5 text-body-xs leading-relaxed text-fg-secondary">
                      {t(
                        'header.nav.areasAsideBody',
                        'Every area lists the duties it carries, the statute behind each one, and what it costs to get wrong.',
                      )}
                    </p>
                    <nav aria-label={t('header.nav.complianceAreas', 'Compliance areas')}>
                      {AREAS.map((a) => {
                        const Icon = a.icon;
                        const to = href(`/compliance/${a.slug}`);
                        return (
                          <Link
                            key={a.slug}
                            to={to}
                            onClick={onClose}
                            aria-current={pathname === to ? 'page' : undefined}
                            className="flex items-start gap-3 border-b border-stroke-subtle px-5 py-3.5 transition-colors hover:bg-surface-secondary"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-light text-fg-brand">
                              <Icon size={20} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-sm font-semibold tracking-[-0.01em] text-fg">
                                {t(`compliance.${a.slug}.title`, DOMAIN_BY_SLUG[a.slug]?.label ?? a.slug)}
                              </span>
                              <span className="line-clamp-2 text-body-xs leading-snug text-fg-secondary">
                                {t(`compliance.${a.slug}.headline`, '')}
                              </span>
                            </span>
                            <ChevronRight size={17} aria-hidden className="mt-2 shrink-0 text-fg-tertiary" />
                          </Link>
                        );
                      })}
                    </nav>
                    </div>
                    <AllLink to={href('/compliance')} onClick={onClose}>
                      {t('header.nav.allAreas', 'All compliance areas')}
                    </AllLink>
                  </>
                )}

                {level === 'markets' && (
                  <>
                    <div className="flex-1 overflow-y-auto overscroll-contain">
                    <p className="border-b border-stroke-subtle bg-surface-secondary px-5 py-3.5 text-body-xs leading-relaxed text-fg-secondary">
                      {t(
                        'header.nav.marketsAsideBody',
                        'Every market lists what falls due there and how often, which areas weigh heaviest, and where we hold no local source yet.',
                      )}
                    </p>
                    <nav aria-label={t('header.nav.markets', 'Markets')}>
                      {MARKET_CODES.map((code) => {
                        const to = href(`/markets/${code.toLowerCase()}`);
                        const p = getMarketProfile(code);
                        return (
                          <Link
                            key={code}
                            to={to}
                            onClick={onClose}
                            aria-current={pathname === to ? 'page' : undefined}
                            className="flex items-center gap-3 border-b border-stroke-subtle px-5 py-2.5 transition-colors hover:bg-surface-secondary"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-light text-fg-brand">
                              <Globe size={20} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-sm font-semibold tracking-[-0.01em] text-fg">
                                {t(`markets.countries.${code}`, { defaultValue: code })}
                              </span>
                              <span className="text-body-xs leading-snug text-fg-secondary">
                                {t('header.nav.marketFact', {
                                  defaultValue: '{{count}} duties in {{areas}} areas',
                                  count: p.obligations.length,
                                  areas: p.byDomain.length,
                                })}
                              </span>
                            </span>
                            <ChevronRight size={17} aria-hidden className="shrink-0 text-fg-tertiary" />
                          </Link>
                        );
                      })}
                    </nav>
                    </div>
                    <AllLink to={href('/markets')} onClick={onClose}>
                      {t('header.nav.allMarkets', 'All markets')}
                    </AllLink>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Actions ── Pinned to the bottom on every level. On an 844px
              viewport the top of the panel is the worst place for the primary
              call to action; the thumb rests here. */}
          <div className="shrink-0 border-t border-stroke-subtle px-5 pb-5 pt-4">{actions}</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function AllLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex h-[60px] shrink-0 items-center gap-2 border-t border-stroke-subtle bg-surface-secondary px-5 text-body-sm font-semibold text-fg-brand"
    >
      {children}
      <ArrowRight size={17} aria-hidden />
    </Link>
  );
}
