import { useTranslation } from 'react-i18next';
import { Check, Minus } from 'lucide-react';
import type { SearchResult } from '../../api/search';
import { Button, outlineBrandClass } from '../ui/Button';
import { DisclosureCard } from './DisclosureCard';
import { useNames } from './MarketRequest';

// ─── Anbieter ohne Passung (Wizard-Audit F2) ────────────────────────────────
// Canvas-Wahl A (23.10.2026), Figma Screens-Datei, Seite "F2 Provider ohne
// Passung", Rahmen 3894:3 (zu) und 3895:182 (auf).
//
// Erscheint nur, wenn niemand einen angefragten Bereich abdeckt — die API
// schickt `providers_outside` nur dann. Die Luecke darueber bleibt die
// Hauptaussage; dieser Block ist anfangs zu. Kein Match-Prozent, keine
// Preisspanne und kein Buchen: aus diesem Block fuehrt nur "View profile",
// und das Profil zeigt dann keine Buchungsleiste (fit=outside).

export type OutsideProvider = NonNullable<SearchResult['providers_outside']>[number];

export function OutsideFitProviders({ providers, requested, market, onViewProfile, stacked = false }: {
  providers: OutsideProvider[];
  /** Die angefragten Bereiche (Slugs) — die keiner dieser Anbieter abdeckt. */
  requested: string[];
  market: string;
  /** Ohne: kein Knopf (Gaeste — das Profil braucht ein Konto). */
  onViewProfile?: (publicRef: string) => void;
  /** Schmale Spalte (Sitzungsansicht): Karten untereinander. */
  stacked?: boolean;
}) {
  const { t } = useTranslation('results');
  const names = useNames();
  if (!providers.length) return null;
  const missing = names.list(requested.map(names.area));
  return (
    <DisclosureCard
      testId="outside-fit"
      title={t('outside.title', { market: names.market(market) })}
      count={providers.length}
      sub={t('outside.sub', { areas: missing })}
      defaultOpen={false}
    >
      <ul className={`grid border-t border-stroke-subtle px-4 py-5 ${stacked ? 'gap-3' : 'gap-5 sm:grid-cols-2 lg:px-6'}`}>
        {providers.map((p) => (
          <li key={p.public_ref} className="flex flex-col gap-3 rounded-xl border border-stroke-subtle bg-surface px-6 py-5">
            <div className="flex items-center gap-3.5">
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light font-serif text-[1.25rem] font-bold text-fg-brand">{p.letter}</span>
              <span className="min-w-0">
                <span className="block text-body-md font-semibold text-fg">{p.title}</span>
                <span className="block text-body-2xs text-fg-secondary">{p.descriptor}</span>
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 text-body-2xs">
              {(p.area_codes ?? []).map((a) => (
                <li key={a} className="flex items-center gap-2 text-fg">
                  <Check size={16} className="text-fg-brand" aria-hidden />{names.area(a)}
                </li>
              ))}
              <li className="flex items-center gap-2 text-fg-secondary">
                <Minus size={16} className="text-fg-tertiary" aria-hidden />{t('outside.notCovered', { areas: missing })}
              </li>
            </ul>
            {onViewProfile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`self-start ${outlineBrandClass}`}
                onClick={() => onViewProfile(p.public_ref)}
                aria-label={`${t('outside.viewProfile')}: ${p.title}`}
              >
                {t('outside.viewProfile')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </DisclosureCard>
  );
}
