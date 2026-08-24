import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── TypeOnView ───────────────────────────────────────────────────────────────
// Types its text character by character the first time it scrolls into view.
// Built on useInViewOnce, so it inherits that hook's contract: every path ends
// with the full text visible. Reduced motion, a missing observer, or an
// observer that never calls back all render the text complete — an effect may
// be skipped, content may not.
//
// The full text is ALWAYS in the layout: an invisible copy holds the box so
// the card never grows line by line while typing (which would shove everything
// below it downward), and a screen reader gets the finished sentence rather
// than a stream of re-renders — the animated copy is aria-hidden.

export function TypeOnView({
  text,
  className = '',
  /** ms per character. */
  speed = 12,
  /** seconds before typing starts, once in view. */
  delay = 0,
}: {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>('-60px');
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setCount((n) => {
          if (n + 1 >= text.length && interval !== undefined) window.clearInterval(interval);
          return Math.min(n + 1, text.length);
        });
      }, speed);
    }, delay * 1000);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [inView, reduced, text, speed, delay]);

  const done = count >= text.length;

  return (
    <span ref={ref} className={`relative block ${className}`}>
      <span aria-hidden="true" className="invisible">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, count)}
        {!done && inView && !reduced && (
          <span className="ml-px inline-block h-[1em] w-px translate-y-[0.15em] animate-pulse bg-fg-brand align-baseline" />
        )}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
