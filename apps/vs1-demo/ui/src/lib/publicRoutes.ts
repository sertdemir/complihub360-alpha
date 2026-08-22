// ─── Public route manifest ────────────────────────────────────────────────────
// One list, three consumers: the runtime head (useSeo), the sitemap generator
// and the build-time head injection. Keeping them on a single source is the
// point — a sitemap that lists a page the app does not serve, or a page the
// sitemap forgets, is worse than none.
//
// Only INDEXABLE pages belong here. Deliberately absent:
//   /results, /search, /wizard  — per-visitor state, nothing stable to index
//   /dashboard, /partner-*, /admin, /login, /register  — behind auth
//   /countries                  — retired 2026-08-18, redirects to /markets
//
// `seoKey` addresses common.json → seo.<key>.{title,description}.

import { DOMAINS } from './domains';

export const MARKET_CODES_SEO = ['de', 'uk', 'nl', 'fr', 'it', 'es', 'us', 'tr'] as const;

// The canonical eight, imported rather than restated — a hand-copied list here
// would drift the moment a domain is added, and the drift would be silent.
export const COMPLIANCE_AREA_SLUGS = DOMAINS.map((d) => d.slug);

export interface PublicRoute {
  /** Path under /:locale, '' for the index. */
  path: string;
  seoKey: string;
  /** Relative weight in the sitemap. The index leads, legal pages trail. */
  priority: number;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '', seoKey: 'home', priority: 1.0 },
  { path: 'how-it-works', seoKey: 'howItWorks', priority: 0.9 },
  { path: 'compliance', seoKey: 'compliance', priority: 0.9 },
  { path: 'markets', seoKey: 'markets', priority: 0.9 },
  { path: 'pricing', seoKey: 'pricing', priority: 0.9 },
  { path: 'resources', seoKey: 'resources', priority: 0.8 },
  { path: 'about', seoKey: 'about', priority: 0.8 },
  { path: 'platform', seoKey: 'platform', priority: 0.7 },
  { path: 'solutions', seoKey: 'solutions', priority: 0.7 },
  { path: 'ai-governance', seoKey: 'aiGovernance', priority: 0.7 },
  { path: 'privacy', seoKey: 'privacy', priority: 0.3 },
  { path: 'terms', seoKey: 'terms', priority: 0.3 },
  { path: 'imprint', seoKey: 'imprint', priority: 0.3 },
  { path: 'cookies', seoKey: 'cookies', priority: 0.3 },
  ...COMPLIANCE_AREA_SLUGS.map((slug) => ({
    path: `compliance/${slug}`,
    seoKey: 'complianceArea',
    priority: 0.7,
  })),
  ...MARKET_CODES_SEO.map((code) => ({
    path: `markets/${code}`,
    seoKey: 'marketCountry',
    priority: 0.6,
  })),
];

export const SEO_LOCALES = ['en', 'de', 'es', 'tr'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

/** The locale served to a crawler that asks for the bare domain. */
export const DEFAULT_LOCALE: SeoLocale = 'en';

/** Absolute URL for one route in one locale. `origin` carries no trailing slash. */
export function absoluteUrl(origin: string, locale: string, path: string): string {
  const base = `${origin.replace(/\/+$/, '')}/${locale}`;
  return path ? `${base}/${path}` : base;
}
