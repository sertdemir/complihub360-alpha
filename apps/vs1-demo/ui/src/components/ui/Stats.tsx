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
export function Donut({ segs, size = 46, stroke = 7, center, centerSize = 12, centerClass = 'text-fg', on }: {
  segs: { frac: number; cls: string }[]; size?: number; stroke?: number; center?: string;
  /** Schriftgroesse der Zahl im Ring — das Dashboard (2A, 2026-09-05) traegt
   *  seine Kennzahl NUR noch im Kreis, deshalb groesser als die 12 px der
   *  kleinen Kacheln. */
  centerSize?: number; centerClass?: string; on: boolean;
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
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="currentColor" className={centerClass} fontSize={centerSize} fontWeight="800">{center}</text>
      )}
    </svg>
  );
}

// ─── Kennzahl-Ring ohne Karte ────────────────────────────────────────────────
// Dashboard-Canvas 2A nach Nutzer-Vorgabe (2026-09-05), seitdem die EINE
// Kennzahl-Form aller Arbeitsflaechen (Dashboard, Sitzungen, Sitzungsseite):
// Text links (Titel, Unterzeile, optionaler Chip), Kreis rechts, doppelt so
// gross wie die alte Kachel, die Zahl steht NUR im Kreis. Keine Karte — die
// Zeile liegt direkt auf dem Gradient des Arbeitsbereichs.
export const KPI_RING_SIZE = 96;
export const KPI_RING_STROKE = 12;

export function KpiRing({ title, sub, chip, value, segs, on }: {
  title: string; sub: string; chip?: string;
  /** Die Zahl im Kreis — zaehlt beim Eintritt hoch. */
  value: number;
  segs: { frac: number; cls: string }[];
  on: boolean;
}) {
  const n = useCountUp(value, on);
  return (
    <div className="flex flex-1 items-center justify-between gap-4 py-1">
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{title}</p>
        <p className="mt-1.5 text-body-2xs leading-snug text-fg-secondary">{sub}</p>
        {chip && (
          <span className="mt-2 inline-flex rounded-full bg-accent/15 px-2 py-[2px] text-[10px] font-bold text-fg-accent-strong">{chip}</span>
        )}
      </div>
      <div className="shrink-0 font-serif">
        <Donut on={on} size={KPI_RING_SIZE} stroke={KPI_RING_STROKE} segs={segs} center={String(n)} centerSize={30} />
      </div>
    </div>
  );
}
