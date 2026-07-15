import { useEffect, useRef, useState } from 'react';

// ─── RadialGauge ──────────────────────────────────────────────────────────────
// Animated SVG ring for live KPI values. The arc fills on mount / value change
// (stroke-dashoffset transition) and the center number counts up. Colors come in
// via props so the gauge adapts to the surrounding light/dark surface.
//
// DS-uptake candidate: promote into Compass/Polaris once the cockpit look lands.

export function useCountUp(target: number, ms = 900): number {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = fromRef.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
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

export type GaugeTone = 'brand' | 'success' | 'warning' | 'error' | 'neutral' | 'gold';

// Default ring colors per semantic tone. `color` always wins when passed, which
// is how the cockpit drives light/dark-aware colors; `tone` is the convenience
// path so casual callers get an on-brand ring without picking a hex.
const TONE_COLOR: Record<GaugeTone, string> = {
  brand: '#0e8c8c', success: '#2fa84f', warning: '#c07d10', error: '#dc3b40', neutral: '#64748b', gold: '#b8912f',
};

export interface RadialGaugeProps {
  /** Fill fraction 0..1. */
  value: number;
  /** Big center label. If omitted, renders the counted-up percent. */
  centerText?: string;
  /** Number to count up to for the center (used when centerText is omitted). */
  percent?: number;
  label: string;
  sublabel?: string;
  /** Semantic tone → default ring color. Ignored when `color` is set. */
  tone?: GaugeTone;
  /** Explicit ring color (hex or CSS var). Overrides `tone`. */
  color?: string;
  /** Track (unfilled) color. */
  track?: string;
  /** Center text color. */
  ink?: string;
  /** Muted color for label/sublabel. */
  muted?: string;
  size?: number;
  stroke?: number;
}

export function RadialGauge({
  value,
  centerText,
  percent,
  label,
  sublabel,
  tone = 'brand',
  color,
  track = 'rgba(127,127,127,0.16)',
  ink = 'currentColor',
  muted = 'rgba(127,127,127,0.9)',
  size = 132,
  stroke = 11,
}: RadialGaugeProps) {
  const ringColor = color ?? TONE_COLOR[tone];
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  const offset = c * (1 - (mounted ? clamped : 0));
  const counted = useCountUp(mounted ? (percent ?? 0) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: size * 0.26, fontWeight: 700, color: ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {centerText ?? `${Math.round(counted)}%`}
          </span>
          {sublabel && <span style={{ fontSize: 11, color: muted, marginTop: 3 }}>{sublabel}</span>}
        </div>
      </div>
      <span style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: muted, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
