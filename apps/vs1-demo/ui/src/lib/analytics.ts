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

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

/** Fire a custom event. Silently does nothing when analytics is not loaded. */
export function track(event: string, props?: Props) {
  try {
    window.plausible?.(event, props ? { props } : undefined);
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
 * page are not comparable.
 */
export function trackScrollDepth(path: string): () => void {
  if (typeof window === 'undefined') return () => {};

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
