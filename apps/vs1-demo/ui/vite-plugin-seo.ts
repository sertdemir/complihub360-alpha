import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Plugin } from 'vite';
import { PUBLIC_ROUTES, SEO_LOCALES, DEFAULT_LOCALE, absoluteUrl } from './src/lib/publicRoutes';

// ─── vite-plugin-seo ──────────────────────────────────────────────────────────
// The half of the head that a crawler sees WITHOUT running JavaScript.
//
// The app ships as a single-page bundle: before this plugin, every one of the
// ~88 public URLs returned the identical 2 kB shell — same <title>, no
// description, no canonical, no hreflang, and <html lang="en"> even on /de.
// Measured on staging and locally, byte-identical by MD5.
//
// This does NOT prerender the body. It writes one HTML file per route with the
// head filled in, so title, description, canonical, hreflang, Open Graph and
// the lang attribute are correct in the FIRST response. The body still hydrates
// client-side. That is the cheap 90 %: search engines run JS, but social
// scrapers and the initial-parse signals do not.
//
// The route list and the copy come from the same places the runtime uses
// (src/lib/publicRoutes.ts, public/locales/<lng>/common.json), so the static and
// runtime heads cannot disagree.
//
// Runs only when VITE_SITE_ORIGIN is set. Without an origin every canonical
// would be a guess, and a wrong canonical is worse than none.

interface SeoEntry { title: string; description: string }

function loadCopy(root: string, lng: string) {
  const p = resolve(root, 'public/locales', lng, 'common.json');
  const json = JSON.parse(readFileSync(p, 'utf8'));
  return {
    seo: (json.seo ?? {}) as Record<string, SeoEntry>,
    countries: (json.markets?.countries ?? {}) as Record<string, string>,
    // compliance.<slug>.title — the eight area pages name themselves the way
    // the market pages name their country.
    areas: (json.compliance ?? {}) as Record<string, { title?: string }>,
  };
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function seoPlugin(): Plugin {
  let root = '';
  let outDir = 'dist';
  let origin = '';

  return {
    name: 'complihub-seo',
    apply: 'build',
    configResolved(cfg) {
      root = cfg.root;
      outDir = cfg.build.outDir;
      origin = (cfg.env.VITE_SITE_ORIGIN as string | undefined)?.replace(/\/+$/, '') ?? '';
    },
    closeBundle() {
      if (!origin) {
        this.warn('VITE_SITE_ORIGIN not set — skipping sitemap, robots.txt and per-route HTML.');
        return;
      }
      const dist = resolve(root, outDir);
      const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
      const copy = Object.fromEntries(SEO_LOCALES.map((l) => [l, loadCopy(root, l)]));

      const urls: { loc: string; priority: number }[] = [];
      let written = 0;

      for (const locale of SEO_LOCALES) {
        const { seo, countries, areas } = copy[locale];
        for (const route of PUBLIC_ROUTES) {
          const entry = seo[route.seoKey];
          if (!entry) {
            this.warn(`seo.${route.seoKey} missing in ${locale} — route left on the template head.`);
            continue;
          }
          const code = route.seoKey === 'marketCountry' ? route.path.split('/')[1]?.toUpperCase() : '';
          const country = code ? (countries[code] ?? code) : '';

          // The runtime head (hooks/useSeo) interpolates {{area}} as well. If
          // only one of the two did, a crawler that runs no JavaScript would
          // read a raw placeholder while everyone else saw the area's name —
          // the exact drift these two halves share a manifest to avoid.
          const slug = route.seoKey === 'complianceArea' ? route.path.split('/')[1] : '';
          const area = slug ? (areas[slug]?.title ?? slug) : '';

          const fill = (s: string) =>
            s.replace(/\{\{country\}\}/g, country).replace(/\{\{area\}\}/g, area);
          const title = fill(entry.title);
          const description = fill(entry.description);
          const canonical = absoluteUrl(origin, locale, route.path);

          const alternates = [
            ...SEO_LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${absoluteUrl(origin, l, route.path)}" />`),
            `<link rel="alternate" hreflang="x-default" href="${absoluteUrl(origin, DEFAULT_LOCALE, route.path)}" />`,
          ].join('\n    ');

          const head = [
            `<meta name="description" content="${esc(description)}" />`,
            `<link rel="canonical" href="${canonical}" />`,
            alternates,
            `<meta property="og:type" content="website" />`,
            `<meta property="og:site_name" content="CompliHub360" />`,
            `<meta property="og:title" content="${esc(title)}" />`,
            `<meta property="og:description" content="${esc(description)}" />`,
            `<meta property="og:url" content="${canonical}" />`,
            `<meta property="og:locale" content="${locale}" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
          ].join('\n    ');

          const html = template
            .replace('<html lang="en">', `<html lang="${locale}">`)
            .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>\n    ${head}`);

          const file = resolve(dist, locale, route.path, 'index.html');
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, html, 'utf8');
          written++;
          urls.push({ loc: canonical, priority: route.priority });
        }
      }

      const sitemap =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        urls
          .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority.toFixed(1)}</priority>\n  </url>`)
          .join('\n') +
        `\n</urlset>\n`;
      writeFileSync(resolve(dist, 'sitemap.xml'), sitemap, 'utf8');

      // Staging overwrites this with Disallow:/ after the build (see
      // scripts/deploy-staging.sh) — deliberately, so a crawler that gets past
      // the proxy auth still finds nothing to index there.
      writeFileSync(
        resolve(dist, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
        'utf8',
      );

      this.info?.(`seo: ${written} route files, ${urls.length} sitemap entries, robots.txt`);
    },
  };
}
