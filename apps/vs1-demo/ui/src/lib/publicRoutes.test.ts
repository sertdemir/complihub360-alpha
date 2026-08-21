import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_ROUTES, SEO_LOCALES, absoluteUrl } from './publicRoutes';

// ─── Sitemap / SEO manifest contract ──────────────────────────────────────────
// The manifest feeds three consumers (runtime head, sitemap, build-time HTML).
// The two ways it can go wrong are both silent:
//   · it lists a URL the app does not serve → the sitemap advertises a 404-ish
//     redirect, and the crawler learns to distrust it,
//   · a route has no copy in some locale → that page ships the template head.
// Both are pinned here.

const here = dirname(fileURLToPath(import.meta.url));
const loadCommon = (lng: string) =>
  JSON.parse(readFileSync(resolve(here, `../../public/locales/${lng}/common.json`), 'utf8'));
const appSource = readFileSync(resolve(here, '../App.tsx'), 'utf8');

describe('public route manifest', () => {
  it('covers a plausible number of routes', () => {
    expect(PUBLIC_ROUTES.length).toBeGreaterThanOrEqual(20);
  });

  it('every route is actually routed in App.tsx', () => {
    const missing = PUBLIC_ROUTES.filter((r) => {
      if (r.path === '') return !appSource.includes('<Route index');
      // markets/de … and compliance/tax-vat … are served by one dynamic route
      // each, so the manifest entry and the <Route path> cannot match verbatim.
      const routePath = r.path.startsWith('markets/')
        ? 'markets/:code'
        : r.path.startsWith('compliance/')
          ? 'compliance/:area'
          : r.path;
      return !appSource.includes(`path="${routePath}"`);
    }).map((r) => r.path);
    expect(missing, `listed but not routed: ${missing.join(', ')}`).toEqual([]);
  });

  it('never lists a stateful or auth-gated page', () => {
    // A sitemap entry for these would advertise either a per-visitor page or a
    // login wall as indexable content.
    const forbidden = ['results', 'search', 'wizard', 'dashboard', 'login', 'register', 'countries'];
    const leaked = PUBLIC_ROUTES.filter((r) => forbidden.some((f) => r.path === f || r.path.startsWith(`${f}/`)));
    expect(leaked.map((r) => r.path)).toEqual([]);
  });

  it.each(SEO_LOCALES)('every route has a title and description in %s', (lng) => {
    const seo = loadCommon(lng).seo ?? {};
    const bad = PUBLIC_ROUTES.filter((r) => {
      const e = seo[r.seoKey];
      return !e || typeof e.title !== 'string' || typeof e.description !== 'string'
        || e.title.trim() === '' || e.description.trim() === '';
    }).map((r) => `${r.path || '(index)'} → seo.${r.seoKey}`);
    expect(bad, `missing in ${lng}: ${bad.join(', ')}`).toEqual([]);
  });

  it.each(SEO_LOCALES)('descriptions stay inside what a result snippet shows in %s', (lng) => {
    const seo = loadCommon(lng).seo ?? {};
    // ~160 chars is where Google truncates. Longer is not an error, but it means
    // the tail is never read — worth failing so it is a decision, not an accident.
    const tooLong = Object.entries(seo)
      .filter(([, e]) => (e as { description: string }).description.length > 175)
      .map(([k, e]) => `${k} (${(e as { description: string }).description.length})`);
    expect(tooLong, `over-long in ${lng}: ${tooLong.join(', ')}`).toEqual([]);
  });

  it('the country routes interpolate their name', () => {
    const seo = loadCommon('de').seo;
    expect(seo.marketCountry.title).toContain('{{country}}');
    expect(seo.marketCountry.description).toContain('{{country}}');
  });

  it('builds absolute URLs without a double slash or a trailing one', () => {
    expect(absoluteUrl('https://x.test', 'de', 'pricing')).toBe('https://x.test/de/pricing');
    expect(absoluteUrl('https://x.test/', 'de', '')).toBe('https://x.test/de');
    expect(absoluteUrl('https://x.test', 'tr', 'markets/nl')).toBe('https://x.test/tr/markets/nl');
  });

  it('priorities are ordered so the index leads and legal trails', () => {
    const index = PUBLIC_ROUTES.find((r) => r.path === '')!;
    const legal = PUBLIC_ROUTES.filter((r) => ['privacy', 'terms', 'imprint', 'cookies'].includes(r.path));
    expect(index.priority).toBe(1.0);
    expect(legal.every((r) => r.priority < index.priority)).toBe(true);
  });
});
