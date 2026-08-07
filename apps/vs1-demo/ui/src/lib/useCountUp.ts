import { useEffect, useRef, useState } from 'react';

// ─── useCountUp ───────────────────────────────────────────────────────────────
// Animates a number from its previous value to `target` with an easeOutCubic
// ramp over `ms`. Used by the animated KPI surfaces (CircleProgress arc label,
// KPICircleCard value). Respects prefers-reduced-motion by snapping instantly.
export function useCountUp(target: number, ms = 900): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || ms <= 0) { fromRef.current = target; setVal(target); return; }

    let raf = 0;
    const start = performance.now();
    const from = fromRef.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (target - from) * eased;
      fromRef.current = cur;
      setVal(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return val;
}
