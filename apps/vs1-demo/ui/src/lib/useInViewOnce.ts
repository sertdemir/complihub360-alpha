import { useEffect, useRef, useState, type RefObject } from 'react';

// How long to wait for the observer's FIRST callback before deciding it is not
// coming. IntersectionObserver delivers an initial entry for every observed
// element as soon as it can — in practice on the next frame — so a second is
// several orders of magnitude more than a working observer needs.
const OBSERVER_DEADLINE_MS = 1000;

// ─── useInViewOnce ────────────────────────────────────────────────────────────
// Flips to true the first time the element enters the viewport and never flips
// back. Bars, meters and section reveals use it to start at 0 and arrive at
// their value while the reader is watching, instead of arriving already
// finished.
//
// EVERY path out of this hook ends in `true`. That is the point of it, not a
// detail: a caller renders `opacity: 0` (or `width: 0`) until this says
// otherwise, so a hook that can get stuck on false is a hook that can hide
// content permanently — with no error, no empty state, and nothing in the
// console to find it by. Invisible-but-present is the worst failure a reveal
// can have, because it looks exactly like data that was never rendered.
//
// So three paths start or end true without a scroll ever happening:
//
// · prefers-reduced-motion — the content has to be readable, and the way to
//   show it without motion is to render it complete from the first frame.
// · no IntersectionObserver — happy-dom in the unit tests, or a server render.
// · the observer was created but never called back within OBSERVER_DEADLINE_MS.
//   A working observer reports the initial state almost immediately, so silence
//   means something ate it — a browser quirk, an extension, a paint-holding
//   condition we cannot see from here. We do not need to know which: we know
//   the reveal cannot be trusted, so we give up the animation and keep the
//   content. Once ANY callback arrives the observer has proven itself and the
//   deadline is dropped, so a section further down the page still animates on
//   arrival rather than fading in early.
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

    let io: IntersectionObserver;
    // Cleared by the first callback of any kind, intersecting or not.
    const deadline = window.setTimeout(() => {
      io?.disconnect();
      setInView(true);
    }, OBSERVER_DEADLINE_MS);

    try {
      io = new IntersectionObserver(
        (entries) => {
          window.clearTimeout(deadline);
          if (!entries.some((e) => e.isIntersecting)) return;
          setInView(true);
          io.disconnect();
        },
        { rootMargin },
      );
      io.observe(el);
    } catch {
      // Constructing or observing threw — same conclusion as silence.
      window.clearTimeout(deadline);
      setInView(true);
      return;
    }

    return () => {
      window.clearTimeout(deadline);
      io.disconnect();
    };
  }, [inView, rootMargin]);

  return [ref as RefObject<T>, inView];
}
