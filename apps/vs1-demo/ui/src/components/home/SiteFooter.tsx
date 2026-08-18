import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { supportedLngs } from '../../i18n/config';
import { DOMAINS } from '../../lib/domains';

// ─── S10 — Site footer · Figma 1212:11 ──────────────────────────────────────
// Light four-column footer closing the landing page: brand + positioning, the
// link columns (with BETA tags), the markets-covered line, the not-a-law-firm
// disclaimer, and the legal bottom bar. Copy lives in footer.* ('home' ns).

type Link = { key: string; href: string; beta?: boolean; fallback?: string };
type Column = { key: string; links: Link[] };

// Solutions = the canonical eight domains, membership and order straight from
// lib/domains so the column cannot drift out of sync again. Labels stay in the
// 'home' namespace (loading 'userws' here would pull 360 dashboard keys into
// every marketing page); the canonical English name is the fallback.
const SOLUTION_LINKS: Link[] = [
  // The overview page first, then the eight domains. All eight point at
  // /compliance: that page IS the domain detail, and eight dead '#' links were
  // worse than eight honest ones to the same place.
  { key: 'solutionsOverview', href: '/solutions' },
  ...DOMAINS.map((d) => ({ key: d.i18nKey, href: '/compliance', fallback: d.label })),
];

const COLUMNS: Column[] = [
  {
    key: 'platform',
    links: [
      { key: 'howItWorks', href: '/how-it-works' },
      { key: 'pricing', href: '/pricing' },
      { key: 'platformOverview', href: '/platform' },
      { key: 'startAssessment', href: '/wizard' },
      { key: 'exampleResult', href: '#' },
    ],
  },
  {
    key: 'solutions',
    links: SOLUTION_LINKS,
  },
  {
    key: 'resources',
    links: [
      { key: 'complianceNews', href: '#', beta: true },
      { key: 'knowledgeLibrary', href: '#', beta: true },
      { key: 'countryGuides', href: '/markets' },
      { key: 'aiGovernance', href: '/ai-governance' },
      { key: 'tutorials', href: '#' },
      { key: 'glossary', href: '#' },
    ],
  },
  {
    key: 'company',
    links: [
      { key: 'about', href: '#' },
      { key: 'trustSecurity', href: '#' },
      { key: 'contact', href: '#' },
      { key: 'careers', href: '#' },
    ],
  },
];

const LEGAL: Link[] = [
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
  { key: 'imprint', href: '/imprint' },
  { key: 'cookies', href: '/cookies' },
  { key: 'subProcessors', href: '#' },
];

export function SiteFooter() {
  const { t, i18n } = useTranslation('home');
  // Links carrying a canonical fallback (the domain columns) resolve to the
  // English domain name if their translation is ever missing, not the raw key.
  const linkLabel = (key: string, fallback?: string) => (fallback ? t(key, fallback) : t(key));
  const location = useLocation();
  const navigate = useNavigate();

  // Locale-prefix internal links (/privacy → /de/privacy) so legal pages open
  // in the language the visitor is browsing in.
  const locale = i18n.resolvedLanguage || 'en';
  const localize = (href: string) => (href.startsWith('/') ? `/${locale}${href}` : href);

  // Same path-rewrite mechanism as the global LanguageSwitcher: swap (or add)
  // the /:locale prefix and navigate — LocaleLayout then calls changeLanguage.
  const switchLanguage = (lng: string) => {
    const pathParts = location.pathname.split('/');
    const targetPath = (pathParts.length > 1 && supportedLngs.includes(pathParts[1]))
      ? '/' + lng + pathParts.slice(2).join('/') + location.search + location.hash
      : '/' + lng + location.pathname + location.search + location.hash;
    navigate(targetPath);
  };

  return (
    <footer className="border-t border-stroke-subtle bg-surface">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-6">
        {/* Brand + link columns */}
        <div className="grid gap-10 py-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-fg-secondary">
              {t('footer.tagline')}
            </p>
            <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold">
              {supportedLngs.map((lng, i) => (
                <span key={lng} className="flex items-center gap-2">
                  {i > 0 && <span className="text-fg-tertiary">·</span>}
                  <button
                    type="button"
                    onClick={() => switchLanguage(lng)}
                    className={lng === locale ? 'text-fg' : 'text-fg-tertiary transition-colors hover:text-fg'}
                  >
                    {lng.toUpperCase()}
                  </button>
                </span>
              ))}
            </div>
            <p className="mt-6 text-[12px] text-fg-tertiary">{t('footer.notLawFirm')}</p>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((col) => (
              <div key={col.key}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
                  {t(`footer.columns.${col.key}.title`)}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.key}>
                      <a
                        href={localize(l.href)}
                        className="inline-flex items-center gap-2 text-[14px] text-fg-secondary transition-colors hover:text-fg"
                      >
                        {linkLabel(`footer.columns.${col.key}.links.${l.key}`, l.fallback)}
                        {l.beta && (
                          <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-accent-700 ring-1 ring-inset ring-accent-200">
                            {t('footer.beta')}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Markets + legal disclaimer */}
        <div className="border-t border-stroke-subtle py-10 text-center">
          <p className="mx-auto max-w-2xl text-[14px] text-fg-secondary">
            {t('footer.markets.pre')}
            <span className="font-semibold text-fg">{t('footer.markets.list')}</span>
            {t('footer.markets.post')}
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">
            {t('footer.disclaimer')}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-stroke-subtle py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-tertiary">{t('footer.copyright')}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.key}>
                <a href={localize(l.href)} className="text-[13px] text-fg-tertiary transition-colors hover:text-fg">
                  {t(`footer.legal.${l.key}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
