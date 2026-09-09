import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EASE } from '../ui/Stats';

// ─── Sitzungs-Kachel ─────────────────────────────────────────────────────────
// EINE Kachel-Form fuer Dashboard (Canvas 6B, 2026-09-05) und Sitzungen-Seite
// (Canvas 3B, 2026-09-09): Titel + Risiko-Tag, Bereichs- und Land-Chips,
// Fortschrittsbalken mit "13 offen · von 14 Pflichten · vor 2 Tagen". Was
// darunter steht — ein "Oeffnen"-Link auf dem Dashboard, ···-Menue und Knoepfe
// auf der Sitzungen-Seite — gibt der Aufrufer als `footer` mit.
//
// Die Pflicht-Zahlen kommen aus /api/v1/dashboard (die Engine rechnet sie je
// Sitzung serverseitig). Fehlen sie — Gast ohne Anmeldung, Aufruf gescheitert —
// zeigt die Kachel nur die Zeit, keinen erfundenen Balken.

export type SessionSeverity = 'critical' | 'high' | 'medium' | 'low';

const RISK_TEXT: Record<SessionSeverity, string> = {
  critical: 'text-risk-critical', high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low',
};
const RISK_BG: Record<SessionSeverity, string> = {
  critical: 'bg-risk-critical', high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low',
};
// Theme-feste Rezepte wie die Aufgaben-Chips der Sitzungsseite: Token-
// Opazitaet frisst im Dark Mode den Text.
const RISK_TAG: Record<SessionSeverity, string> = {
  critical: 'bg-[#FEE2E2] border-[rgba(143,49,16,.30)] text-[#8F3110] dark:bg-[#8F3110]/25 dark:text-[#F1A88C]',
  high: 'bg-[#FEE2E2] border-[rgba(143,49,16,.30)] text-[#8F3110] dark:bg-[#8F3110]/25 dark:text-[#F1A88C]',
  medium: 'bg-[#FEF3C7] border-[rgba(161,98,7,.35)] text-[#713F12] dark:bg-[#A16207]/25 dark:text-[#F0C86A]',
  low: 'bg-[#E7F3EE] border-[rgba(21,128,61,.35)] text-[#14532D] dark:bg-[#15803D]/20 dark:text-[#8FD3AE]',
};
// Gold-Rezept wie die Status-Pills der RequestCard — bg-warning-bg blieb im
// Dark Mode hell und frass die Schrift.
const TAG_STALE = 'inline-flex whitespace-nowrap rounded border border-[#d4af37]/35 bg-[#d4af37]/10 px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40';
const TAG_MUTED = 'inline-flex whitespace-nowrap rounded border border-stroke bg-surface-secondary px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary';

export const SESSION_TILE_CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

export interface SessionTileProps {
  title: string;
  severity: SessionSeverity;
  /** Uebersetzte Bereichsnamen, in der Reihenfolge der Sitzung. */
  domains: string[];
  country: string | null;
  /** Offene und gesamte Pflichten — null, wenn der Server sie nicht geliefert hat. */
  open: number | null;
  total: number | null;
  /** Fertige Zeitangabe ("vor 2 Tagen") — die Seiten formatieren verschieden. */
  updatedLabel: string;
  /** Marke "Auffrischung noetig" neben der Zeile (Sitzungen-Seite, 5B). */
  stale?: boolean;
  /** Marke "Archiviert" statt des Risiko-Tags; Kachel gedaempft. */
  archived?: boolean;
  /** Balken-Animation: laeuft erst, wenn die Seite steht; der Index staffelt. */
  entered: boolean;
  index: number;
  footer?: ReactNode;
  className?: string;
}

export function SessionTile({
  title, severity, domains, country, open, total, updatedLabel, stale, archived, entered, index, footer, className = '',
}: SessionTileProps) {
  const { t } = useTranslation('userws');
  const hasCounts = open !== null && total !== null && total > 0;
  const frac = hasCounts ? (total - open) / total : 0;

  return (
    <div className={`${SESSION_TILE_CARD} flex flex-col gap-2.5 p-4 ${archived ? 'opacity-70' : ''} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-body-xs font-bold text-fg">{title}</p>
        {archived ? (
          <span className={TAG_MUTED}>{t('sessions.archivedTag')}</span>
        ) : (
          <span className={'inline-flex shrink-0 whitespace-nowrap rounded border px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] ' + RISK_TAG[severity]}>
            {t(`home.riskTag.${severity}`)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {domains.map((d) => (
          <span key={d} className="rounded-full bg-surface-secondary px-2 py-[2px] text-[9.5px] font-semibold text-fg-secondary">{d}</span>
        ))}
        {country && <span className="rounded-full border border-stroke px-2 py-[2px] text-[9.5px] font-bold text-fg">{country}</span>}
      </div>
      <div>
        {hasCounts && (
          <div className="h-[5px] overflow-hidden rounded-full bg-surface-secondary">
            <div
              className={`h-full rounded-full ${RISK_BG[severity]}`}
              style={{ width: entered ? `${frac * 100}%` : 0, transition: `width 800ms ${EASE} ${300 + index * 90}ms` }}
            />
          </div>
        )}
        <p className={`flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-fg-tertiary ${hasCounts ? 'mt-1.5' : ''}`}>
          {hasCounts && (
            <>
              <b className={RISK_TEXT[severity]}>{t('home.sessionOpen', { count: open })}</b>
              <span>· {t('home.sessionOf', { count: total })}</span>
              <span>·</span>
            </>
          )}
          <span>{updatedLabel}</span>
          {stale && <span className={TAG_STALE + ' ml-1'}>{t('sessions.needsRefresh')}</span>}
        </p>
      </div>
      {/* Fuss ans Kachelende: in einer Reihe liegen alle "Oeffnen" auf einer Hoehe. */}
      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  );
}
