import { useEffect, useRef, useState, type RefObject } from 'react';

// ─── useInViewOnce ────────────────────────────────────────────────────────────
// Flips to true the first time the element enters the viewport and never flips
// back. Bars and meters use it to grow from 0 to their value at the moment the
// reader can actually watch it happen, instead of arriving already finished.
//
// Two cases start out true instead of waiting for a scroll:
//
// · prefers-reduced-motion — the value has to be readable, and the way to show
//   it without motion is to render it at full length from the first frame.
// · no IntersectionObserver — happy-dom in the unit tests, or a server render.
//   Failing open keeps the data on screen; failing closed would leave every bar
//   pinned at width 0 with no way to ever release it.
export function useInViewOnce<T extends Element>(
  rootMargin = '-40px',
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    // The observer reports the current state right after observe(), so an
    // element that is already on screen at mount animates immediately rather
    // than waiting for a scroll that may never come.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setInView(true);
        io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return [ref as RefObject<T>, inView];
}
