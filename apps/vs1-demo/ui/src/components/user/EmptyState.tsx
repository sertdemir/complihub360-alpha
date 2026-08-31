import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

// ─── Erstzustand ─────────────────────────────────────────────────────────────
// Eine Komponente fuer alle vier Flaechen des Arbeitsbereichs (Dashboard,
// Sitzungen, Anfragen, Termine).
//
// WARUM ES SIE GIBT: bis 2026-08-30 fielen diese Seiten bei einem leeren
// Ergebnis auf Design-Fixtures zurueck — useApiData behielt sie ausdruecklich
// ("Empty API result → keep the fixture so demos stay meaningful"),
// SessionsPage tat dasselbe von Hand. Ein neues Konto sah damit vier Seiten
// voller erfundener Daten. Fuer die Demo-Phase war das gewollt; vor dem User
// Testing kehrt es sich um: Rueckmeldung zu einer Fiktion ist wertlos, und
// der Zustand, der einen echten Erstbesucher empfaengt, wurde nie gesehen.
//
// WARUM EINE KOMPONENTE UND NICHT VIER: der Erstzustand ist der erste
// Eindruck des Produkts. Er muss auf allen vier Flaechen dieselbe Sprache
// sprechen — und wenn die Gestaltung sich aendert, an einer Stelle.
//
// Kein Raster aus Nullen: vier Kacheln mit 0 sehen aus wie ein Defekt und
// sagen nichts darueber, was als Naechstes zu tun waere.

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Der eine naechste Schritt. Ein Erstzustand ohne Ausweg ist eine Sackgasse. */
  cta: { label: string; onClick: () => void };
  /** Was den Schritt kleiner macht — Dauer, Unverbindlichkeit. Optional. */
  hint?: string;
  /** Kompakt fuer eine Karte in der Seitenspalte, gross fuer eine ganze Seite. */
  size?: 'page' | 'panel';
}

export function EmptyState({ icon: Icon, title, body, cta, hint, size = 'page' }: EmptyStateProps) {
  const gross = size === 'page';
  return (
    <div className={`${CARD} mx-auto ${gross ? 'mt-10 max-w-[560px] p-8' : 'p-6'} text-center`}>
      <span className={`mx-auto grid place-items-center rounded-2xl bg-brand-light text-fg-brand ${gross ? 'h-12 w-12' : 'h-10 w-10'}`}>
        <Icon size={gross ? 22 : 18} strokeWidth={1.9} />
      </span>
      <h2 className={`mt-4 font-serif font-bold text-fg ${gross ? 'text-[20px]' : 'text-body-md'}`}>{title}</h2>
      <p className={`mx-auto mt-2 max-w-[420px] leading-relaxed text-fg-tertiary ${gross ? 'text-body-xs' : 'text-body-2xs'}`}>
        {body}
      </p>
      <Button className="mt-5" size={gross ? undefined : 'sm'} onClick={cta.onClick}>
        {cta.label} <ArrowRight size={14} className="ml-1" />
      </Button>
      {hint && <p className="mt-3 text-body-3xs text-fg-tertiary">{hint}</p>}
    </div>
  );
}
