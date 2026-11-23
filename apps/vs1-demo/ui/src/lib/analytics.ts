// ─── Analytics ────────────────────────────────────────────────────────────────
// A thin wrapper over the self-hosted Plausible in infra/plausible. Everything
// here is a no-op when the script is absent (dev, tests, unconfigured builds) —
// index.html only injects it when both VITE_PLAUSIBLE_* vars are set.
//
// Why scroll depth exists at all: on 2026-08-20 the question "do users even
// reach the bottom of the homepage?" could not be answered. The page measured
// 44.300 px — 56 screens — and the only usable assessment sat at 83,9 % depth
// until PR #57 moved it to 10,7 %. That move was argued from geometry, not from
// behaviour, because there was no behavioural data. This closes that gap so the
// next such decision is measured instead of reasoned.

type Props = Record<string, string | number | boolean>;
type Options = { u: string; props?: Props };

declare global {
  interface Window {
    plausible?: (event: string, options?: Options) => void;
  }
}

// ─── Addresses without identifiers ────────────────────────────────────────────
// Plausible files every event under the address it was sent with. An address
// that carries an identifier lets anyone who can read both Plausible and our
// database tie a device, a place and a day's route to one account — the "who"
// this product never measures. Found on 2026-11-20: the confirmation page
// /dashboard/booking/<booking id> wrote the booking id into every pageview and
// into the `path` of Scroll Depth.
//
// So the address is built here and handed to Plausible as `u`. index.html loads
// script.manual.js for exactly that reason: the standard script reads the
// address bar itself, with identifier, query and all.

/** Routes whose path carries an identifier, relative to the locale. `:id` marks
 *  the segment that is dropped before the path leaves the browser. A new route
 *  with an identifier in its path belongs in this list. */
const IDENTIFIER_ROUTES = [
  'dashboard/booking/:id',
  'p/:id',
  'p/:id/schedule',
  'admin/providers/:id',
].map((route) => route.split('/'));

/** Safety net for a route nobody added above: a segment that looks like a UUID
 *  or a long hex token is an identifier, whatever the route is called. */
const OPAQUE_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{12,})$/i;

/**
 * The path as analytics may see it: identifier segments removed, no trailing
 * slash. `/de/dashboard/booking/<uuid>` becomes `/de/dashboard/booking`,
 * `/de/p/<ref>/schedule` becomes `/de/p/schedule`.
 */
export function normalizePath(pathname: string): string {
  const [locale, ...rest] = pathname.split('/').filter(Boolean);
  if (locale === undefined) return '/';
  const route = IDENTIFIER_ROUTES.find(
    (r) => r.length === rest.length && r.every((segment, i) => segment === ':id' || segment === rest[i]),
  );
  const kept = rest.filter((segment, i) => route?.[i] !== ':id' && !OPAQUE_SEGMENT.test(segment));
  return `/${[locale, ...kept].join('/')}`;
}

/** The only query parameters analytics may see. Everything else — one-time
 *  tokens from mail links, session and thread ids, redirect targets — stays in
 *  the browser. */
const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

function campaignQuery(search: string): string {
  const given = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of CAMPAIGN_PARAMS) {
    const value = given.get(name);
    if (value) kept.set(name, value);
  }
  const query = kept.toString();
  return query ? `?${query}` : '';
}

/** The address an event is filed under: origin, path without identifiers,
 *  campaign parameters only, no hash. */
export function eventUrl(pathname: string = window.location.pathname, search: string = window.location.search): string {
  return window.location.origin + normalizePath(pathname) + campaignQuery(search);
}

/** Every page lives under a locale (App.tsx). A path without one — `/`, an
 *  unknown prefix — only redirects and is not a page. */
const LOCALE_PREFIX = /^\/[a-z]{2}(?:\/|$)/;

/**
 * Report a page view. Called on every route change (App.tsx) because the
 * manual script does not report page views on its own. Unlike the standard
 * script this also sees redirects done with `replace` — the login a guard
 * sends to, the Beta agreement step — which were invisible before.
 */
export function trackPageview(pathname: string = window.location.pathname) {
  if (!LOCALE_PREFIX.test(pathname)) return;
  try {
    window.plausible?.('pageview', { u: eventUrl(pathname) });
  } catch {
    /* analytics must never break the page */
  }
}

/** Fire a custom event. Silently does nothing when analytics is not loaded. */
export function track(event: string, props?: Props) {
  try {
    const u = eventUrl();
    window.plausible?.(event, props ? { u, props } : { u });
  } catch {
    /* analytics must never break the page */
  }
}

/** Depth milestones, in percent of the scrollable document. 90 rather than 100
 *  because the last screen is usually the footer and rarely fully reached. */
const MILESTONES = [25, 50, 75, 90] as const;

/**
 * Reports how far down a page the visitor actually got, once per milestone per
 * page view. Returns a cleanup function.
 *
 * `path` is sent along so depth can be read per page — the homepage and a legal
 * page are not comparable. It is normalised here, so a caller cannot hand an
 * identifier through by accident.
 */
export function trackScrollDepth(pathname: string): () => void {
  if (typeof window === 'undefined') return () => {};

  const path = normalizePath(pathname);
  const reached = new Set<number>();
  let frame = 0;

  const measure = () => {
    frame = 0;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    // A page that does not scroll has no depth to report.
    if (scrollable <= 0) return;
    const pct = ((window.scrollY || doc.scrollTop) / scrollable) * 100;
    for (const m of MILESTONES) {
      if (pct >= m && !reached.has(m)) {
        reached.add(m);
        track('Scroll Depth', { depth: `${m}%`, path });
      }
    }
  };

  const onScroll = () => {
    if (frame) return;             // one measurement per frame, not per event
    frame = requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  measure();                        // a short page may already be "at 90%"

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}
