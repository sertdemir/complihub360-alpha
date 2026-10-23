import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Minus } from 'lucide-react';
import { Monogram } from '../user/PartnerCard';
import { useRequestContext } from '../../lib/requestContext';
import { useNames } from './MarketRequest';
import type { OtherProvider } from '../../api/search';

// ─── F2 · Anbieter ohne Bereichs-Treffer ─────────────────────────────────────
// Entscheidung 23.10.2026 (Wizard-Audit F2), Canvas-Wahl 1B · 2B · 3A, Figma
// Seite „Risk Map F2" (3895:19024). Kommt nur, wenn niemand den angefragten
// Bereich abdeckt — dann steht darueber die Luecke (noProviderMatch), und
// dieser Block fuellt sie nicht: eingeklappt, ohne Prozent, ohne Kennzahlen,
// mit dem Satz „nicht als Empfehlung". Ansehen ja, buchen nein (Nutzer
// 23.10.2026) — die Schublade sperrt die Buchung selbst.

export function OtherProvidersBlock({ providers, onDetails }: {
  providers: OtherProvider[];
  onDetails: (p: OtherProvider) => void;
}) {
  const { t } = useTranslation('results');
  const names = useNames();
  const { beschreibung } = useRequestContext();
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (providers.length === 0) return null;
  const basis = providers[0].match_basis;
  const market = basis?.country ? names.market(basis.country) : '';
  const areas = names.list((basis?.domains_requested ?? []).map(names.area));
  return (
    <section aria-label={t('otherProviders.heading', { market })} className="flex flex-col gap-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-stroke-subtle bg-surface px-4 py-3 text-left text-body-sm font-semibold text-fg transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span>{t('otherProviders.toggle', { count: providers.length, market })}</span>
        <ChevronDown size={16} aria-hidden className={'shrink-0 text-fg-brand transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div id={listId} className="flex flex-col gap-2.5">
          <p className="text-body-sm font-semibold text-fg">{t('otherProviders.heading', { market })}</p>
          <p className="text-body-sm leading-[1.55] text-fg-secondary">{t('otherProviders.message', { areas })}</p>
          <ul className="flex flex-col gap-2.5">
            {providers.map((p) => (
              <li key={p.public_ref} className="flex flex-col gap-1.5 rounded-lg border border-stroke-subtle bg-surface p-3.5">
                <div className="flex items-center gap-2.5">
                  <Monogram letter={p.letter} size={24} />
                  <div className="min-w-0">
                    <p className="text-body-xs font-bold text-fg">{p.title}</p>
                    <p className="text-[11px] leading-snug text-fg-secondary">{beschreibung({ areaCodes: p.area_codes, region: p.descriptor_region, fallback: p.descriptor })}</p>
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-body-xs text-fg-tertiary">
                  <Minus size={12} aria-hidden className="mt-[3px] shrink-0" />
                  <span>{t('otherProviders.notCovered', { areas })}</span>
                </p>
                <button
                  type="button"
                  onClick={() => onDetails(p)}
                  className="self-start text-body-xs font-semibold text-fg-brand underline underline-offset-[3px] hover:text-primary-700"
                >
                  {t('snapshot.providerDetails')}
                  <span className="sr-only"> · {p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
