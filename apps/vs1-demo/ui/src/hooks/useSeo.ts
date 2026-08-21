import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PUBLIC_ROUTES, SEO_LOCALES, DEFAULT_LOCALE, absoluteUrl } from '../lib/publicRoutes';
import { DOMAIN_BY_SLUG } from '../lib/domains';

// ─── useSeo ───────────────────────────────────────────────────────────────────
// Head management for the public pages, in ONE place rather than per page.
//
// Before this, six of fifteen pages set document.title and nothing else: no
// description, no canonical, no hreflang, no Open Graph. Nine pages shared the
// title "CompliHub360", and /es and /tr had no signal at all that they are the
// same page in another language.
//
// Called once from AppContent and driven off the pathname, so a new route gets
// its head from lib/publicRoutes.ts instead of from a copied useEffect. Pages
// therefore no longer set their own title — a second writer would race this one.
//
// This is the RUNTIME half. Crawlers that do not execute JavaScript read the
// static half, which the build injects into one HTML file per route
// (vite-plugin-seo.ts). Both read the same manifest, so they cannot drift.

const ORIGIN = (import.meta.env.VITE_SITE_ORIGIN as string | undefined)?.replace(/\/+$/, '') || '';

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  const el = upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute('content', content);
}

export function useSeo() {
  const { t, i18n } = useTranslation('common');
  const { pathname } = useLocation();

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const locale = SEO_LOCALES.includes(segments[0] as never) ? segments[0] : null;
    if (!locale) return;                     // /  → redirects, nothing to describe
    const path = segments.slice(1).join('/');

    // markets/de and markets/xx both match the manifest entry; an unknown code
    // is not a page we want to describe, so it falls through to no match.
    const route = PUBLIC_ROUTES.find((r) => r.path === path);
    if (!route) return;                      // wizard, results, auth, dashboards

    const code = route.seoKey === 'marketCountry' ? path.split('/')[1]?.toUpperCase() : null;
    const country = code ? t(`markets.countries.${code}`, { defaultValue: code }) : '';

    // The eight area pages share one seoKey and differ by the area's own name,
    // exactly as the market pages differ by country. Both interpolate rather
    // than carrying eight near-identical copies of the same sentence.
    const areaSlug = route.seoKey === 'complianceArea' ? path.split('/')[1] : null;
    const area = areaSlug
      ? t(`compliance.${areaSlug}.title`, {
          defaultValue: DOMAIN_BY_SLUG[areaSlug]?.label ?? areaSlug,
        })
      : '';

    const title = t(`seo.${route.seoKey}.title`, { country, area });
    const description = t(`seo.${route.seoKey}.description`, { country, area });

    document.title = title;
    setMeta('name', 'description', description);

    // Absolute URLs need an origin. In dev there is none configured, so fall
    // back to the current one — wrong for production, but never wrong locally.
    const origin = ORIGIN || window.location.origin;
    const canonical = absoluteUrl(origin, locale, path);

    const link = upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    }) as HTMLLinkElement;
    link.href = canonical;

    // hreflang: every locale of THIS page, plus x-default. Without them /es and
    // /tr read as thin duplicates of /en rather than translations.
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    for (const lng of SEO_LOCALES) {
      const alt = document.createElement('link');
      alt.setAttribute('rel', 'alternate');
      alt.setAttribute('hreflang', lng);
      alt.setAttribute('href', absoluteUrl(origin, lng, path));
      document.head.appendChild(alt);
    }
    const xd = document.createElement('link');
    xd.setAttribute('rel', 'alternate');
    xd.setAttribute('hreflang', 'x-default');
    xd.setAttribute('href', absoluteUrl(origin, DEFAULT_LOCALE, path));
    document.head.appendChild(xd);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'CompliHub360');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:locale', locale);
    setMeta('name', 'twitter:card', 'summary_large_image');

    // <html lang> is set by LocaleLayout; keeping it there avoids two writers.
  }, [pathname, t, i18n.resolvedLanguage]);
}
