import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// ─── Abschnittskopf einer Workspace-Karte ────────────────────────────────────
// Titel 15 px fett, der Zaehler in Petrol daneben, rechts EIN Weg ("Alle
// anzeigen"). Seit 2026-09-05 das Muster des User-Dashboards (dort lokal in
// UserHomePage), seit dem Angleich 2026-10-16 geteilt: Provider-Karten nutzen
// denselben Kopf. Die Beschriftung des Links kommt vom Aufrufer, weil User
// (userws) und Provider (providerws) eigene Namensraeume haben.

export interface SectionHeadProps {
  title: string;
  /** Die Zahl, die man sucht — nur, wenn es etwas zu zaehlen gibt. */
  count?: string | number;
  /** Zwischen Zaehler und Link: Umschalter, Tags. */
  extra?: ReactNode;
  /** Der eine Weg rechts: Link-Ziel oder Klick. */
  action?: { label: string; to?: string; onClick?: () => void };
  /** Rechts aussen, ohne Link-Semantik (z. B. Knopf). */
  trailing?: ReactNode;
  className?: string;
}

export function SectionHead({ title, count, extra, action, trailing, className = '' }: SectionHeadProps) {
  return (
    <div className={'mb-3 flex flex-wrap items-baseline gap-2 ' + className}>
      <h2 className="text-body-md font-bold text-fg">{title}</h2>
      {count !== undefined && count !== '' && <span className="text-body-xs font-bold text-fg-brand">{count}</span>}
      {extra}
      {action && (action.to ? (
        <Link to={action.to} className="ml-auto text-body-2xs text-fg-secondary underline-offset-2 hover:underline">{action.label}</Link>
      ) : (
        <button type="button" onClick={action.onClick} className="ml-auto text-body-2xs text-fg-secondary underline-offset-2 hover:underline">{action.label}</button>
      ))}
      {trailing && <span className={action ? '' : 'ml-auto'}>{trailing}</span>}
    </div>
  );
}
