import { useTranslation } from 'react-i18next';
import type { AssessmentRecord } from '@complihub/compliance-engine';
import { countryName } from '../../lib/countries';

// ─── Lagerorte am Ergebnis (Folgeauftrag Lagerung, 20.11.2026) ────────────────
// Jeder benannte Lagerort steht mit Land, Phase (heute aktiv / geplant) und
// Bestaetigungsstand da — getrennt von den Verkaufsmaerkten. Wo die Engine
// keine fachlich gepruefte Lagerregel fuehrt, sagt die Zeile das fuer genau
// dieses Land. Sie behauptet weder eine Pflicht noch, dass dort nichts gilt
// (DNA: Unsicherheit benennen, keine Beduerfnisse erzeugen).
//
// Heute fuehrt die Engine KEINE freigegebene Lagerregel (das Register in
// storage-rules.ts ist leer). Mit Regel verweist die Zeile auf ihre Checks,
// die als eigene Zeilen in den Gruppen darunter stehen.

type Storage = AssessmentRecord['storage'];

export function StorageLocations({ storage }: { storage: Storage | undefined }) {
  const { t, i18n } = useTranslation('results');
  if (!storage) return null;
  const lang = i18n.resolvedLanguage || 'en';
  const locations = storage.locations ?? [];
  // Antworten ohne Land: je Phase ein eigener Satz. "Nicht gefragt" sagt nichts.
  const notes = [
    storage.current.status === 'none' ? t('storage.note.currentNone')
      : storage.current.status === 'unknown' ? t('storage.note.currentUnknown') : '',
    storage.planned.status === 'no-other' ? t('storage.note.plannedNoOther')
      : storage.planned.status === 'undecided' ? t('storage.note.plannedUndecided')
      : storage.planned.status === 'unknown' ? t('storage.note.plannedUnknown') : '',
  ].filter(Boolean);
  if (!locations.length && !notes.length) return null;
  return (
    <section className="mb-6 rounded-xl border border-stroke-subtle bg-surface px-4 py-5 lg:px-6" data-testid="storage-locations" aria-label={t('storage.title')}>
      <h3 className="text-body-md font-bold text-fg">{t('storage.title')}</h3>
      <p className="mt-0.5 text-body-sm text-fg-secondary">{t('storage.sub')}</p>
      {locations.length > 0 && (
        <ul className="mt-3 flex flex-col">
          {locations.map((l) => (
            <li key={`${l.phase}-${l.country}`} data-testid="storage-location" className="border-t border-stroke-subtle py-3 first:border-0 first:pt-0 last:pb-0">
              <p className="text-body-sm font-semibold text-fg">
                {countryName(l.country, lang)}
                <span className="ml-2 font-normal text-fg-secondary">
                  {t(`storage.phase.${l.phase}`)} · {t(`storage.confirmation.${l.confirmation}`)}
                  {!l.also_market && <> · {t('storage.notAMarket')}</>}
                </span>
              </p>
              <p className="mt-0.5 text-body-sm text-fg-secondary">
                {!l.assessed
                  ? t('storage.noRule', { country: countryName(l.country, lang) })
                  : l.checks.length
                    ? t('storage.assessed', { checks: l.checks.map((c) => c.title).join(', ') })
                    : t('storage.assessedNone', { country: countryName(l.country, lang) })}
                {l.confirmation !== 'confirmed' && <> {t(`storage.open.${l.phase}`)}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {notes.map((n) => <p key={n} className="mt-3 text-body-sm text-fg-secondary" data-testid="storage-note-line">{n}</p>)}
    </section>
  );
}
