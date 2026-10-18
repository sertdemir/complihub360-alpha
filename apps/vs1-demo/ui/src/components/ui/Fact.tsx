import type { ReactNode } from 'react';

// ─── Faktenzeile einer Workspace-Karte ───────────────────────────────────────
// Links die Bezeichnung in Sekundaerfarbe, rechts der Wert (plus optional eine
// leise Anmerkung). Zeilen trennen sich durch eine feine Linie, die erste hat
// keine. Bis 2026-10-18 lokal in der Konto-Karte der Provider-Uebersicht, seit
// dem Angleich der Abdeckung (Karte „Fuer das Matching") geteilt. Lebt in einer
// `<dl className="text-[13px]">`.

export function Fact({ label, note, children }: { label: string; note?: string | null; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stroke-subtle py-2.5 first:border-t-0">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        {children}
        {note && <span className="text-[11px] text-fg-tertiary">{note}</span>}
      </dd>
    </div>
  );
}
