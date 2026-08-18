import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Globe, Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

// ─── MarketingHeader ──────────────────────────────────────────────────────────
// Anchor-nav header for the CompliHub360 landing page, responsive: desktop bar +
// mobile expanding pill panel. Menu items are in-page section anchors with
// scroll-spy. Compass: Header Marketing Desktop / Mobile.
//
// The second audience (provider) and the switch between the two were removed with
// the provider marketing landing on 2026-08-18 — with one audience left, a toggle
// and a cross-link had nothing to point at.

export interface Anchor { id: string; label: string; labelKey?: string }

export interface MarketingHeaderProps {
  /** Section anchors (in-page). Defaults to ANCHORS. */
  anchors?: Anchor[];
  /** Locale-aware home link on the logo. */
  userHref?: string;
  loginHref?: string;
  /** Theme over a dark hero (white logo + nav). */
  theme?: 'light' | 'inverse';
  /** Render in normal flow (relative) instead of fixed — for showcases / embeds. */
  embedded?: boolean;
}

// Anchor ids point at REAL section ids on the landing page — pricing lives in the
// HowItActs cost section (#engagement), voices in the Brand-Code section.
const ANCHORS: Anchor[] = [
  { id: 'how-it-works', label: 'How it works', labelKey: 'header.nav.howItWorks' },
  { id: 'what-we-know', label: 'What we know', labelKey: 'header.nav.whatWeKnow' },
  { id: 'brand-code', label: 'Voices', labelKey: 'header.nav.voices' },
  { id: 'engagement', label: 'Pricing', labelKey: 'header.nav.pricing' },
];



// Language menu — same four locales and URL-segment logic as
// components/common/LanguageSwitcher (GlobalNav). Navigation happens via plain
// hrefs (like every other link in this header), so the component stays
// router-free (Storybook-safe); the /:locale route in App.tsx picks up the new
// segment and calls i18n.changeLanguage.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
] as const;

function LanguageMenu({ buttonClass }: { buttonClass: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const { pathname, search, hash } = window.location;
  const parts = pathname.split('/');
  const hasLocale = parts.length > 1 && LANGUAGES.some((l) => l.code === parts[1]);
  const current = hasLocale ? parts[1] : 'en';
  const hrefFor = (lng: string) =>
    (hasLocale ? ['', lng, ...parts.slice(2)].join('/') : `/${lng}${pathname}`) + search + hash;

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Language"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
      >
        <Globe size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-full z-[100] mt-2 w-36 overflow-hidden rounded-md border-thin border-stroke-subtle bg-surface py-1 shadow-lg"
          >
            {LANGUAGES.map((lng) => (
              <a
                key={lng.code}
                role="menuitem"
                href={hrefFor(lng.code)}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-4 py-2 text-body-sm font-medium transition-colors hover:bg-surface-secondary ${
                  current === lng.code ? 'text-fg-brand' : 'text-fg-secondary'
                }`}
              >
                {lng.label}
                {current === lng.code && <Check size={14} />}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Track which section is in view (scroll-spy).
function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids.join(',')]);
  return active;
}

export function MarketingHeader({
  anchors,
  userHref = '/',
  loginHref = '/login',
  theme = 'light',
  embedded = false,
}: MarketingHeaderProps) {
  const { t } = useTranslation('common');
  const items = anchors ?? ANCHORS;
  const inverse = theme === 'inverse';

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useScrollSpy(items.map((a) => a.id));

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
            {items.map((it) => (
              <a
                key={it.id}
                href={`#${it.id}`}
                className={`whitespace-nowrap rounded-md px-2.5 py-2 text-body-sm font-medium transition-colors ${
                  active === it.id
                    ? 'bg-brand-light text-fg-brand'
                    : inverse
                      ? 'text-white/85 hover:text-fg-inverse'
                      : 'text-fg-secondary hover:text-fg'
                }`}
              >
                {it.labelKey ? t(it.labelKey, { defaultValue: it.label }) : it.label}
              </a>
            ))}
        </nav>
        <div className="flex flex-1 basis-0 items-center justify-end gap-5">
          <ThemeToggle inverse={inverse} size={36} />
          <LanguageMenu buttonClass={`grid h-9 w-9 place-items-center rounded-md ${inverse ? 'text-fg-inverse' : 'text-fg-secondary'}`} />
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
            <LanguageMenu buttonClass={`grid h-[40px] w-[40px] place-items-center rounded-md ${inverse ? 'text-fg-inverse' : 'text-fg-secondary'}`} />
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
              {/* Pill anchor row (horizontal scroll) */}
              <div className="flex gap-3 overflow-x-auto px-4 pb-5 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.map((a) => (
                  <a
                    key={a.id}
                    href={`#${a.id}`}
                    onClick={() => setOpen(false)}
                    className={`shrink-0 whitespace-nowrap rounded-pill px-3.5 py-2 text-body-sm font-semibold transition-colors ${
                      active === a.id ? 'bg-brand text-fg-on-brand' : 'bg-surface-secondary text-fg'
                    }`}
                  >
                    {a.labelKey ? t(a.labelKey, { defaultValue: a.label }) : a.label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
