import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { isKnownCountry } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { requestMarket } from '../../api/marketRequests';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { scopeOf } from './RiskMapState';

// ─── Risk Map · Markt ohne Abdeckung (Canvas-Wahl D3 · E3 · F3) ──────────────
// Figma: Screens-Datei, Seite Landingpages, Section 3390:14594 — D3 3470:2011
// (Gast), E3 3470:2129 (Gast nach der Anfrage), F3 3470:2221 (mit Konto).
// Abgenommen 27.09.2026.
//
// Erscheint statt C3, wenn die Engine KEINEN der angefragten Maerkte pruefen
// kann (Entscheidung 2026-09-27). "No immediate requirements identified" waere
// dort eine Aussage ueber eine Pruefung, die nicht stattgefunden hat. Gemischte
// Faelle (DE + BR) bleiben C3.
//
// Die Copy unter `common:states.marketRequest.*` ist am 27.09.2026 abgenommen
// und steht im Copy-Waechter (scripts/check-approved-copy.mjs). Ein Abschalten
// des Updates gibt es nicht, also verspricht die Hilfe auch keines.

type Profile = { country?: string; markets?: string[]; categories?: string[] };

/** Die angefragten Maerkte, fuer die die Engine kein Laenderprofil hat. */
export function unavailableMarketsOf(profile: Profile): string[] {
  return scopeOf(profile, 'requested').markets.filter((c) => !isKnownCountry(c));
}

/** marketUnavailable statt C3: angefragt wurde etwas, geprueft nichts. */
export function isMarketUnavailable(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return scopeOf(profile, 'checked').markets.length === 0 && unavailableMarketsOf(profile).length > 0;
}

export type MarketRequestStatus = 'idle' | 'sending' | 'sent' | 'failed';

/** Status je Markt und das Absenden. Der Aufrufer braucht den Stand, weil
 *  "Explore Other Markets" vom Kopf in die Bestaetigung wandert (D3 → E3). */
export function useMarketRequests({ areas, asGuest }: { areas: string[]; asGuest: boolean }) {
  const [status, setStatus] = useState<Record<string, MarketRequestStatus>>({});
  const send = useCallback(async (market: string, notify = false) => {
    setStatus((s) => ({ ...s, [market]: 'sending' }));
    try {
      await requestMarket({ market, domains: areas, notify: !asGuest && notify, asGuest });
      setStatus((s) => ({ ...s, [market]: 'sent' }));
    } catch {
      setStatus((s) => ({ ...s, [market]: 'failed' }));
    }
  }, [areas, asGuest]);
  return { status, send };
}

function useNames() {
  const { t, i18n } = useTranslation(['results']);
  const locale = i18n.resolvedLanguage || 'en';
  const region = (() => {
    try { return new Intl.DisplayNames([locale], { type: 'region' }); } catch { return null; }
  })();
  const market = (code: string) => {
    try { return region?.of(code) ?? code; } catch { return code; }
  };
  const area = (slug: string) => {
    const d = DOMAIN_BY_SLUG[slug];
    return d ? t(`results:domains.${d.i18nKey}`, { defaultValue: d.label }) : slug;
  };
  // Intl.ListFormat fehlt im TS-Lib-Ziel des Projekts (vor ES2021), die
  // Browser haben es; ohne faellt die Liste auf Kommas zurueck.
  const list = (items: string[]) => {
    const LF = (Intl as unknown as { ListFormat?: new (l: string, o: { type: string }) => { format(i: string[]): string } }).ListFormat;
    try { return LF ? new LF(locale, { type: 'conjunction' }).format(items) : items.join(', '); } catch { return items.join(', '); }
  };
  return { market, area, list };
}

/** "Explore Other Markets" — ein Weg zurueck zur Marktwahl. Figma: Ghost. */
export function ExploreOtherMarkets({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation(['common']);
  return (
    <Button
      variant="ghost"
      size="md"
      onClick={onClick}
      className="text-fg-brand hover:bg-brand-light dark:text-fg-brand"
    >
      {t('common:states.actions.exploreOtherMarkets')}
    </Button>
  );
}

/** Figma "Secondary": Kontur in Markenfarbe, wie "Contact Support" in B3. */
const outlineBrand = 'border-stroke-brand bg-surface text-fg-brand hover:bg-brand-light dark:border-stroke-brand dark:text-fg-brand';

function Failed() {
  const { t } = useTranslation(['common']);
  return (
    <span role="alert" className="text-body-xs text-error-500">
      {t('common:states.marketRequest.failed')}
    </span>
  );
}

/** D3 — je Markt ohne Abdeckung eine Zeile mit eigener Anfrage. Die erste
 *  Zeile traegt den Hauptknopf, weitere die Kontur. Eine angefragte Zeile
 *  bestaetigt sich an Ort und Stelle; sind alle angefragt, ersetzt der
 *  Aufrufer die Box durch <MarketRequestSent> (E3). */
export function MarketRequestList({
  label,
  markets,
  areas,
  status,
  onRequest,
}: {
  label: string;
  markets: string[];
  areas: string[];
  status: Record<string, MarketRequestStatus>;
  onRequest: (market: string) => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  const names = useNames();
  const areaText = areas.map(names.area).join(', ');
  return (
    <section
      aria-label={label}
      className="flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-secondary"
    >
      <span className="px-7 pb-3 pt-5 text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">{label}</span>
      <ul>
        {markets.map((m, i) => {
          const s = status[m] ?? 'idle';
          const lead = t(i === 0 ? 'common:states.marketRequest.notCovered' : 'common:states.marketRequest.alsoNotCovered');
          return (
            <li
              key={m}
              className="flex flex-col gap-3 border-t border-stroke-subtle px-7 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                <span className="text-body font-semibold text-fg">{names.market(m)}</span>
                <span className="text-body-sm text-fg-tertiary">{areaText ? `${lead} · ${areaText}` : lead}</span>
              </span>
              {s === 'sent' ? (
                <span role="status" className="inline-flex shrink-0 items-center gap-2 text-body-sm font-semibold text-fg-brand">
                  <Check size={16} aria-hidden /> {t('common:states.marketRequest.sent', { markets: names.market(m) })}
                </span>
              ) : (
                <span className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                  <Button
                    size="md"
                    variant={i === 0 ? 'primary' : 'outline'}
                    className={i === 0 ? undefined : outlineBrand}
                    loading={s === 'sending'}
                    onClick={() => onRequest(m)}
                    aria-label={`${t('common:states.actions.requestThisMarket')}: ${names.market(m)}`}
                  >
                    {t('common:states.actions.requestThisMarket')}
                  </Button>
                  {s === 'failed' && <Failed />}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** E3 — die Bestaetigung. Kein Konto-Hinweis: die Anfrage selbst braucht
 *  keines, und wir verkaufen es hier nicht. */
export function MarketRequestSent({ markets, onExplore }: { markets: string[]; onExplore?: () => void }) {
  const { t } = useTranslation(['common']);
  const names = useNames();
  return (
    <div
      role="status"
      className="flex w-full max-w-[720px] items-start gap-4 rounded-2xl border border-stroke-brand-soft/35 bg-brand-light dark:border-stroke-brand-soft/40 px-7 py-[22px] text-left"
    >
      <span aria-hidden className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-fg-on-brand">
        <Check size={18} strokeWidth={2.4} />
      </span>
      <span className="flex min-w-0 flex-col items-start gap-1.5">
        <span className="text-body font-bold text-fg">
          {t('common:states.marketRequest.sent', { markets: names.list(markets.map(names.market)) })}
        </span>
        <span className="text-body-sm leading-[1.55] text-fg-secondary">{t('common:states.marketRequest.sentBody')}</span>
        {onExplore && <span className="-ml-4 pt-1"><ExploreOtherMarkets onClick={onExplore} /></span>}
      </span>
    </div>
  );
}

/** F3 — mit Konto: vor dem Senden entscheidet der Nutzer, ob er ein Update
 *  moechte. Standardmaessig AUS; die Adresse steht dabei, damit klar ist,
 *  wohin es geht. Ohne bekannte Adresse kein Angebot. */
export function MarketRequestCard({
  market,
  areas,
  email,
  status,
  onRequest,
  onExplore,
}: {
  market: string;
  areas: string[];
  email: string | null;
  status: MarketRequestStatus;
  onRequest: (notify: boolean) => void;
  onExplore: () => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  const names = useNames();
  const [notify, setNotify] = useState(false);
  if (status === 'sent') return <MarketRequestSent markets={[market]} onExplore={onExplore} />;
  const name = names.market(market);
  return (
    <section
      aria-label={name}
      className="flex w-full max-w-[720px] flex-col gap-4 rounded-2xl border border-stroke-subtle bg-surface px-7 py-6 text-left shadow-[0_18px_44px_-32px_rgba(2,22,17,0.3)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-serif text-[1.5rem] font-bold leading-[1.2] text-fg">{name}</span>
        {areas.length > 0 && <span className="text-body-sm text-fg-tertiary">{areas.map(names.area).join(' · ')}</span>}
      </div>
      {email && (
        <Checkbox
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          disabled={status === 'sending'}
          className="items-start"
          label={
            <span className="flex flex-col gap-0.5">
              <span className="text-body-sm font-semibold text-fg">{t('common:states.marketRequest.notifyLabel', { market: name })}</span>
              <span className="text-body-sm text-fg-tertiary">{t('common:states.marketRequest.notifyHelp', { email })}</span>
            </span>
          }
        />
      )}
      <div className="h-px bg-stroke-subtle" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="-ml-4"><ExploreOtherMarkets onClick={onExplore} /></span>
        <span className="flex flex-col items-end gap-1.5">
          <Button size="lg" loading={status === 'sending'} onClick={() => onRequest(notify)}>
            {t('common:states.actions.requestThisMarket')}
          </Button>
          {status === 'failed' && <Failed />}
        </span>
      </div>
    </section>
  );
}
