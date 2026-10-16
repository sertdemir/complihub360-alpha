import React, { useEffect, useRef, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

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
// Kennzahl-Form aller Arbeitsflaechen (Dashboard, Sitzungen, Sitzungsseite,
// Bereichsseite): Text links (Titel, Unterzeile, optionaler Chip), Kreis
// rechts daneben, doppelt so gross wie die alte Kachel, die Zahl steht NUR
// im Kreis. Keine Karte — die Zeile liegt direkt auf dem Gradient.
// Text und Kreis stehen DICHT beieinander (Nutzer-Vorgabe 2026-09-13): bis
// dahin schob `justify-between` den Kreis ans Spaltenende, und bei drei
// Spalten auf 1240 px lag der Text 200 px vom Kreis entfernt — nicht mehr
// als Paar lesbar.
export const KPI_RING_SIZE = 96;
export const KPI_RING_STROKE = 12;

export function KpiRing({ title, sub, chip, value, segs, on, format, basis, trend, ringSide = 'right', pending = false, ...rest }: {
  title: string; sub: string; chip?: string;
  /** Die Zahl im Kreis — zaehlt beim Eintritt hoch. */
  value: number;
  segs: { frac: number; cls: string }[];
  on: boolean;
  /** Wie die hochgezaehlte Zahl im Ring erscheint. Ohne das kann der Ring nur
   *  ganze Zahlen zeigen (useCountUp rundet) — eine Bewertung von 4,7 oder
   *  eine Quote mit Prozentzeichen braucht deshalb eine eigene Schreibweise.
   *  Der gezaehlte Wert bleibt die ganze Zahl (47 bzw. 92), nur die Anzeige
   *  formt sie um. */
  format?: (n: number) => string;
  /** Cockpit (Provider-Performance, 2026-10-16): die Basis der Zahl in fett
   *  ("9 von 12 Buchungen") zwischen Titel und Unterzeile. */
  basis?: string;
  /** Cockpit: die Trendzeile unter dem Text (TrendDelta). */
  trend?: React.ReactNode;
  /** Cockpit: Ring links, Text rechts — die Zahl ist das Erste, was man liest. */
  ringSide?: 'left' | 'right';
  /** Zu wenig Daten: Ring ohne Segment, Zahl grau — die Zeile sagt, was fehlt. */
  pending?: boolean;
  /** Test- und Mess-Anker (Waechter-Tests lesen `[data-pending="true"]`). */
  'data-fact'?: string;
  'data-pending'?: boolean;
}) {
  const n = useCountUp(value, on);
  const ring = (
    <div className={'shrink-0 font-serif' + (pending ? ' opacity-70' : '')}>
      <Donut on={on} size={KPI_RING_SIZE} stroke={KPI_RING_STROKE} segs={pending ? [] : segs} center={format ? format(n) : String(n)} centerSize={30} centerClass={pending ? 'text-fg-tertiary' : 'text-fg'} />
    </div>
  );
  return (
    <div className="flex items-center gap-4 py-1" {...rest}>
      {ringSide === 'left' && ring}
      {/* Der Textblock waechst auf eine FESTE Breite, damit die Ringe einer
          Zeile auf derselben Linie stehen (Befund 2026-09-15: vorher sass der
          Ring am Textende, drei Ringe standen auf drei Hoehenlinien) — aber
          nur auf 180 px statt 220 (Befund 2026-09-16: die Korrektur war zu
          weit gegangen, bei kurzem Untertitel klaffte zwischen Text und Ring
          eine leere Spalte, und das Paar war nicht mehr als Paar zu lesen).
          Mit dem Ring links darf der Text die Spalte fuellen. */}
      <div className={'min-w-0 flex-1 text-left' + (ringSide === 'left' ? '' : ' max-w-[180px]')}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{title}</p>
        {basis && <p className={'mt-1 text-body-xs font-bold ' + (pending ? 'text-fg-tertiary' : 'text-fg')}>{basis}</p>}
        <p className="mt-1.5 text-body-2xs leading-snug text-fg-secondary">{sub}</p>
        {chip && (
          <span className="mt-2 inline-flex rounded-full bg-accent/15 px-2 py-[2px] text-[10px] font-bold text-fg-accent-strong">{chip}</span>
        )}
        {trend && <div className="mt-1.5">{trend}</div>}
      </div>
      {ringSide === 'right' && ring}
    </div>
  );
}

// ─── Trendzeile (Cockpit, 2026-10-16) ────────────────────────────────────────
// Pfeil = Richtung der Daten, Farbe = Bedeutung fuer den Leser (gruen besser,
// gelb schlechter, grau gleich oder ohne Wertung). Die Rechnung dazu liegt in
// lib/performanceTrend.ts; hier nur die Form. Gelb statt Rot: ein schlechterer
// Wert ist eine Beobachtung, kein Alarm (DNA).
const TREND_TONE: Record<'better' | 'worse' | 'same', string> = {
  better: 'text-success-700 dark:text-emerald-300',
  worse: 'text-warning-800 dark:text-amber-300',
  same: 'text-fg-tertiary',
};
export function TrendDelta({ direction, tone, delta, compare }: {
  direction: 'up' | 'down' | 'flat';
  tone: 'better' | 'worse' | 'same';
  /** Schon formatiert: "+8 Pp", "−1", "±0,0". */
  delta: string;
  /** "vs. 90 Tage davor" — oder der Satz, warum kein Pfeil steht. */
  compare: string;
}) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  return (
    <p className="flex items-center gap-1.5 text-body-2xs text-fg-tertiary">
      <Icon size={14} strokeWidth={2.2} className={TREND_TONE[tone]} aria-hidden="true" />
      <span className={'font-bold ' + TREND_TONE[tone]}>{delta}</span>
      <span>{compare}</span>
    </p>
  );
}

// ─── Stufen-Meter (Cockpit, 2026-10-16) ──────────────────────────────────────
// Eine Regel mit wenigen Stufen als Leiste: "1 Vorfall · Hinweis ab 2 ·
// Buchungspause ab 3". Jede Stufe traegt ihren Namen als Tooltip, die
// gefuellten in Petrol — eine Zustandsanzeige, kein Fortschrittsbalken.
export function StepMeter({ steps, filled, on }: { steps: string[]; filled: number; on: boolean }) {
  return (
    <div className="flex gap-1" role="img" aria-label={steps.map((s, i) => `${s}${i < filled ? ' ✓' : ''}`).join(' · ')}>
      {steps.map((s, i) => (
        <span
          key={s}
          title={s}
          className={'h-2 flex-1 rounded-full ' + (i < filled ? 'bg-brand' : DONE_CLS)}
          style={{ opacity: on ? 1 : 0, transition: `opacity 320ms ${EASE} ${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
const DONE_CLS = 'bg-unit-done ring-1 ring-inset ring-unit-done-line';

// ─── Gestapelte Balken (Cockpit, 2026-10-16) ─────────────────────────────────
// Je Gruppe (Monat, Bereich, Land) ein Balken aus Teilen; eine Skala fuer
// alle, Rasterlinien mit Zahl, Summe ueber dem Balken. Die Teile wachsen beim
// Eintritt von unten; bei reduced motion stehen sie sofort. Die Legende
// gehoert dem Aufrufer, weil sie seine Worte traegt.
export interface StackedGroup { key: string; label: string; parts: { n: number; cls: string; label: string }[] }
export function StackedBars({ groups, on, height = 150, barWidth = 56 }: { groups: StackedGroup[]; on: boolean; height?: number; barWidth?: number }) {
  const totals = groups.map((g) => g.parts.reduce((s, p) => s + p.n, 0));
  const max = Math.max(1, ...totals);
  // Rasterlinien bei "schoenen" Schritten: 1, 2, 5, 10, 20, 50 …
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const top = Math.ceil(max / step) * step;
  const px = height / top;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return (
    // 24 px Luft oben: die Summe ueber dem hoechsten Balken und die oberste
    // Rasterzahl ragen sonst aus der Karte (overflow-hidden) heraus.
    <div className="relative" style={{ height: height + 28 + 24, paddingTop: 24 }}>
      <div className="relative" style={{ height: height + 28 }}>
      {ticks.map((v) => (
        <div key={v} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: height - v * px }}>
          <span className="w-6 -translate-y-1/2 text-right text-body-3xs tabular-nums text-fg-tertiary">{v}</span>
          <span className={'h-px flex-1 ' + (v === 0 ? 'bg-stroke' : 'bg-stroke-subtle')} />
        </div>
      ))}
      <div className="absolute inset-x-8 top-0 flex items-end justify-around" style={{ height }}>
        {groups.map((g, gi) => {
          const total = totals[gi];
          return (
            <div key={g.key} className="relative flex flex-col-reverse items-center" style={{ width: barWidth, height }} title={`${g.label}: ${total}`}>
              {g.parts.filter((p) => p.n > 0).map((p, i) => (
                <span
                  key={p.label + i}
                  className={'group/seg relative block w-full ' + p.cls + (i === 0 ? ' rounded-b-[3px]' : '') }
                  style={{ height: on ? Math.max(0, p.n * px - 2) : 0, marginTop: 2, transition: `height 700ms ${EASE} ${120 + gi * 90 + i * 60}ms` }}
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11px] font-semibold leading-none text-white opacity-0 shadow-md transition-opacity duration-100 group-hover/seg:opacity-100 dark:bg-white dark:text-[#111827]">{p.label} · {p.n}</span>
                </span>
              ))}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-body-3xs font-bold tabular-nums text-fg" style={{ bottom: 'auto', top: height - total * px - 18 }}>{total}</span>
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-body-2xs text-fg-secondary">{g.label}</span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ─── UnitGrid · Einheiten-Grafik (Canvas Z2, Nutzer-Wahl 2026-09-22) ─────────
// Ersetzt auf dem Dashboard die Ringe: deren Farben erklaerte nichts, der
// Nutzer musste raten, was Gold oder Rot im Kreis bedeutet. Bei kleinen Zahlen
// ist ZAEHLEN verstaendlicher als jede Flaeche — ein Kaestchen ist ein Ding
// (eine Pflicht, eine Anfrage). Die Bedeutung traegt die Beschriftung des
// Aufrufers, die Farbe verstaerkt nur.
//
// Die Kaestchen erscheinen nacheinander (22 ms Versatz, Pop mit EASE); bei
// reduced motion stehen sie sofort. Ab `perUnit` > 1 steht ein Kaestchen fuer
// mehrere Dinge — der Aufrufer sagt das in der Beschriftung.

export interface UnitPart {
  n: number;
  /** Tailwind-Hintergrund, z. B. 'bg-risk-high'. */
  cls: string;
  /** Tooltip und Screenreader-Text je Kaestchen. */
  label: string;
}

export function UnitGrid({ parts, on, cols, perUnit = 1, size = 16, gap = 4, delayOffset = 0, fluid = false }: {
  parts: UnitPart[];
  on: boolean;
  /** Spalten; ohne Angabe fliesst die Reihe in voller Laenge. */
  cols?: number;
  perUnit?: number;
  size?: number;
  gap?: number;
  /** Versatz in Kaestchen, damit mehrere Gruppen nacheinander aufgehen. */
  delayOffset?: number;
  /** Bricht auf schmalen Flaechen um; `cols` ist dann die HOECHSTE Breite. */
  fluid?: boolean;
}) {
  const cells: { cls: string; label: string }[] = [];
  for (const p of parts) {
    const k = Math.ceil(p.n / perUnit);
    for (let i = 0; i < k; i++) cells.push({ cls: p.cls, label: p.label });
  }
  return (
    <div
      aria-hidden="true"
      className="grid"
      style={fluid
        ? { gap, gridTemplateColumns: `repeat(auto-fill, ${size}px)`, maxWidth: (cols ?? cells.length) * (size + gap) }
        : { gap, gridTemplateColumns: cols ? `repeat(${cols}, ${size}px)` : `repeat(${cells.length || 1}, ${size}px)` }}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={'group/cell relative block rounded-[4px] hover:z-10 ' + c.cls}
          style={{
            width: size, height: size,
            opacity: on ? 1 : 0,
            transform: on ? 'scale(1)' : 'scale(0.2)',
            transition: `opacity 320ms ${EASE} ${(delayOffset + i) * 22}ms, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1) ${(delayOffset + i) * 22}ms`,
          }}
        >
          {/* Sofort-Tooltip beim Hover (Nutzer 2026-09-27: "bei jedem Hover auf
              ein Kaestchen soll der Markt angezeigt werden") — das native
              title-Attribut kommt erst nach einer Sekunde. */}
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[11px] font-semibold leading-none text-white opacity-0 shadow-md transition-opacity duration-100 group-hover/cell:opacity-100 dark:bg-white dark:text-[#111827]">
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Wie viele Dinge ein Kaestchen traegt, damit das Raster lesbar bleibt. */
export function unitsPer(total: number, max = 60): number {
  if (total <= max) return 1;
  for (const s of [2, 5, 10, 25, 50, 100]) if (total / s <= max) return s;
  return Math.ceil(total / max);
}
