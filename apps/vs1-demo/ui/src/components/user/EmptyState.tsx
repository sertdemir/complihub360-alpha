import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

// ─── Erstzustand ─────────────────────────────────────────────────────────────
// Eine Komponente fuer alle vier Flaechen des Arbeitsbereichs (Dashboard,
// Sitzungen, Anfragen, Termine).
//
// WARUM ES SIE GIBT: bis 2026-08-30 fielen diese Seiten bei einem leeren
// Ergebnis auf Design-Fixtures zurueck. Ein neues Konto sah vier Seiten voller
// erfundener Daten; der Zustand, der einen echten Erstbesucher empfaengt,
// wurde nie gesehen.
//
// WARUM EINE KOMPONENTE UND NICHT VIER: der Erstzustand ist der erste
// Eindruck des Produkts. Er muss auf allen vier Flaechen dieselbe Sprache
// sprechen — und wenn die Gestaltung sich aendert, an einer Stelle.
//
// GESTALTUNG: Variante B "Erster Weg" (Nutzer-Wahl 2026-08-31, Canvas
// "Erstzustaende Arbeitsbereich"). Die Karte nennt nicht nur, dass nichts da
// ist, sondern in drei nummerierten Schritten, was entsteht, wenn man anfaengt.
// Verworfen wurden A (nur Karte, Satz, Knopf — sagt nicht, was danach kommt)
// und C (echter Aufbau blass darunter — der Schleier liest sich wie ein
// Ladefehler).
//
// Kein Raster aus Nullen: vier Kacheln mit 0 sehen aus wie ein Defekt und
// sagen nichts darueber, was als Naechstes zu tun waere.

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

export interface EmptyStateStep {
  title: string;
  body: string;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Der eine naechste Schritt. Ein Erstzustand ohne Ausweg ist eine Sackgasse. */
  cta: { label: string; onClick: () => void };
  /** Was den Schritt kleiner macht — Dauer, Unverbindlichkeit. Steht neben dem
   *  Titel, nicht unter dem Knopf: dort wird es nach der Entscheidung gelesen. */
  hint?: string;
  /** Genau drei — was der Nutzer bekommt, bevor er Zeit investiert. Weniger
   *  traegt die Spalten nicht, mehr liest niemand auf einer leeren Seite. */
  steps?: [EmptyStateStep, EmptyStateStep, EmptyStateStep];
}

export function EmptyState({ icon: Icon, title, body, cta, hint, steps }: EmptyStateProps) {
  return (
    <div className={`${CARD} mx-auto mt-9 max-w-[720px] px-9 py-8`}>
      <div className="flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-light text-fg-brand">
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-[20px] font-bold leading-tight text-fg">{title}</h2>
          {hint && <p className="mt-0.5 text-body-2xs text-fg-tertiary">{hint}</p>}
        </div>
      </div>

      <p className="mt-[18px] text-body-xs leading-relaxed text-fg-secondary [text-wrap:pretty]">{body}</p>

      {steps && (
        <div className="mt-[22px] grid gap-5 border-t border-stroke-subtle pt-[22px] sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px] border-brand text-[11px] font-extrabold text-fg-brand">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-body-xs font-bold text-fg">{s.title}</p>
                <p className="mt-0.5 text-body-2xs leading-snug text-fg-tertiary">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button className="mt-6" onClick={cta.onClick}>
        {cta.label} <ArrowRight size={14} className="ml-1" />
      </Button>
    </div>
  );
}
