import { useEffect, useRef, useState } from 'react';

// ─── Stats · animierte Kleinst-Diagramme fuer die Workspace-Flaechen ─────────
// Am 2026-08-29 aus UserHomePage extrahiert, als die Sitzungen-Seite dieselben
// Donuts, Balken und zaehlenden Zahlen brauchte — dieselbe Regel, der schon
// FaqList, Segment und SystemFooter folgen: EINE Komponente, mehrere Aufrufer.
//
// Alles zeigt ZUSAMMENSETZUNGEN (Risiko-Split, Anteile), keine Zeitreihen —
// erfundene Trends ("+12 % zur Vorwoche") gibt es hier nicht, weil es keine
// Historie gibt, aus der sie kaemen.
//
// Die Eintritts-Animation laeuft bei JEDEM Mount, also bei jedem Betreten der
// Seite. prefers-reduced-motion schaltet sie ab und zeigt sofort den Endwert.

export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** true einen Frame nach dem Mount — der Startpunkt aller Transitions. */
export function useEntered() {
  const [on, setOn] = useState(reducedMotion);
  useEffect(() => {
    if (on) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, [on]);
  return on;
}

/** Zaehlt mit ease-out von 0 auf target; bei reduced motion sofort target. */
export function useCountUp(target: number, on: boolean, duration = 900) {
  const [value, setValue] = useState(reducedMotion() ? target : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (!on || reducedMotion()) { setValue(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [on, target, duration]);
  return value;
}

/** Donut aus Anteilen; Farben folgen den Tokens ueber currentColor. */
export function Donut({ segs, size = 46, stroke = 7, center, on }: {
  segs: { frac: number; cls: string }[]; size?: number; stroke?: number; center?: string; on: boolean;
}) {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className="text-stroke-subtle" />
      {segs.map((s, i) => {
        const d = s.frac * c;
        const el = (
          <circle
            key={s.cls + off}
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
            stroke="currentColor" className={s.cls}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              strokeDasharray: on ? `${d} ${c - d}` : `0 ${c}`,
              transition: `stroke-dasharray 850ms ${EASE} ${90 + i * 130}ms`,
            }}
          />
        );
        off += d;
        return el;
      })}
      {center && (
        <text x="50%" y="54%" textAnchor="middle" fill="currentColor" className="text-fg" fontSize="12" fontWeight="800">{center}</text>
      )}
    </svg>
  );
}

/** Zusammensetzungs-Balken: Hoehen relativ zum Maximum, wachsen vom Boden. */
export function SparkBars({ vals, cls = 'text-brand', on }: { vals: number[]; cls?: string; on: boolean }) {
  const w = 64, h = 30, bw = w / vals.length - 4;
  const max = Math.max(...vals, 1);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className={cls}>
      {vals.map((v, i) => {
        const bh = Math.max(3, (v / max) * h);
        return (
          <rect
            key={i} x={i * (bw + 4)} y={h - bh} width={bw} height={bh} rx="2.5" fill="currentColor"
            style={{
              transform: on ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'bottom', transformBox: 'fill-box',
              transition: `transform 700ms ${EASE} ${120 + i * 90}ms`,
            }}
          />
        );
      })}
    </svg>
  );
}

/** Die Kachel, die eine Kennzahl mit ihrem Kleinst-Diagramm zeigt. */
export function KpiCard({ title, big, sub, chip, className = '', children }: {
  title: string; big: string; sub: string; chip?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={'flex-1 rounded-xl border border-stroke-subtle bg-surface p-5 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)] ' + className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{title}</p>
        {chip && <span className="rounded-md bg-warning-bg px-1.5 py-0.5 text-[10px] font-extrabold text-warning-700">{chip}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div>
          <p className="font-serif text-[24px] font-bold leading-none text-fg">{big}</p>
          <p className="mt-1.5 text-body-2xs text-fg-tertiary">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
