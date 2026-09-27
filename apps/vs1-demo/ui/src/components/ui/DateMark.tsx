// ─── Datumsmarke ─────────────────────────────────────────────────────────────
// Tag gross, Monat klein — Compass "Date Mark" (Figma 2187:13624). Vorher zwei
// Kopien (Dashboard 36px, Termine-Seite 60px); seit 2026-09-27 eine Komponente.
// aria-hidden: das volle Datum steht als Text in der Zeile daneben. Das Jahr
// faellt aus der Marke — die Zeile daneben traegt die volle Datumszeile.

export type DateMarkSize = 'sm' | 'md' | 'lg';

const BOX: Record<DateMarkSize, string> = {
  sm: 'h-9 w-9 rounded-[7px]',
  md: 'h-11 w-11 rounded-lg',
  lg: 'h-[60px] w-[60px] rounded-xl',
};
const DAY: Record<DateMarkSize, string> = { sm: 'text-[13px]', md: 'text-[16px]', lg: 'text-[22px]' };
const MONTH: Record<DateMarkSize, string> = { sm: 'text-[7.5px]', md: 'text-[8.5px]', lg: 'text-[10px]' };

export interface DateMarkProps {
  /** ISO-Zeitpunkt des Termins. */
  iso: string;
  locale: string;
  size?: DateMarkSize;
  /** Naechster Termin: Petrol-Toenung statt neutral. */
  soon?: boolean;
}

export function DateMark({ iso, locale, size = 'md', soon = false }: DateMarkProps) {
  const d = new Date(iso);
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-content-center border text-center leading-[1.1] ${BOX[size]} ${
        soon ? 'border-stroke-brand/40 bg-brand-light text-fg-brand' : 'border-stroke bg-surface text-fg'
      }`}
    >
      <span className={`font-bold ${DAY[size]}`}>{d.getDate()}</span>
      <span className={`font-bold uppercase tracking-[0.08em] ${MONTH[size]} ${soon ? '' : 'text-fg-tertiary'}`}>
        {d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
      </span>
    </div>
  );
}
