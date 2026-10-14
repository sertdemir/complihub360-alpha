import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { isKnownCountry } from '@complihub/compliance-engine';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { requestMarket } from '../../api/marketRequests';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Banner } from '../ui/Banner';
import { scopeOf } from './RiskMapState';

// ─── Risk Map · Markt ohne Abdeckung (Canvas-Wahl D3 · E3 · F3) ──────────────
// Figma: Screens-Datei, Seite Landingpages, Section 3390:14594 — D3 3470:2011
// (Gast), E3 3470:2129 (Gast nach der Anfrage), F3 3470:2221 (mit Konto).
// Abgenommen 27.09.2026.
//
// Erscheint statt C3, wenn die Engine KEINEN der angefragten Maerkte pruefen
// kann (Entscheidung 2026-09-27). "No immediate requirements identified" waere
// dort eine Aussage ueber eine Pruefung, die nicht stattgefunden hat. Gemischte
// Faelle (DE + BR) bleiben C3 und bekommen I1 · J1 · K3 (unten).
//
// Die Copy unter `common:states.marketRequest.*` ist am 27.09.2026 abgenommen
// und steht im Copy-Waechter (scripts/check-approved-copy.mjs). Ein Abschalten
// des Updates gibt es nicht, also verspricht die Hilfe auch keines.

type Profile = { country?: string; markets?: string[]; categories?: string[] };

/** Die angefragten Maerkte, fuer die die Engine kein Laenderprofil hat. */
export function unavailableMarketsOf(profile: Profile): string[] {
  return scopeOf(profile, 'requested').markets.filter((c) => !isKnownCountry(c));
}

/** Gemischte Maerkte (I1 · J1 · K3): mindestens ein Markt geprueft und
 *  mindestens einer nicht — die ungeprueften, sonst leer. */
export function partialMarketsOf(profile: Profile | null | undefined): string[] {
  if (!profile || scopeOf(profile, 'checked').markets.length === 0) return [];
  return unavailableMarketsOf(profile);
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
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [status, setStatus] = useState<Record<string, MarketRequestStatus>>({});
  const send = useCallback(async (market: string, notify = false) => {
    setStatus((s) => ({ ...s, [market]: 'sending' }));
    try {
      await requestMarket({ market, domains: areas, notify: !asGuest && notify, asGuest, locale });
      setStatus((s) => ({ ...s, [market]: 'sent' }));
    } catch {
      setStatus((s) => ({ ...s, [market]: 'failed' }));
    }
  }, [areas, asGuest, locale]);
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

/** H3 — die Anbieter-Spalte, wenn kein angefragter Markt geprueft wurde.
 *  Abgenommener Zustand noProviderMatch statt Karten von Anbietern, die den
 *  Markt nicht abdecken: die waeren ein Angebot fuer einen Bedarf, den wir
 *  nicht festgestellt haben. Der Satz "You can request this market and
 *  choose to be notified" stimmt seit dem Versand (PR #231). */
export function NoVerifiedProvider() {
  const { t } = useTranslation(['common', 'results']);
  return (
    <section
      aria-label={t('common:states.noProviderMatch.heading')}
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-stroke bg-surface px-[22px] py-5"
    >
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
        {t('results:snapshot.providersEyebrow')}
      </span>
      <h2 className="text-body font-bold leading-[1.35] text-fg">{t('common:states.noProviderMatch.heading')}</h2>
      <p className="text-body-sm leading-[1.55] text-fg-secondary">{t('common:states.noProviderMatch.message')}</p>
    </section>
  );
}

// ─── Gemischte Maerkte (Canvas-Wahl I1 · J1 · K3) ────────────────────────────
// Figma: Section 3390:14594 — I1 3546:2497 (Gast mit Pflichten), J1 3546:2657
// (Gast ohne Pflichten), K3 3546:20736 (mit Konto). Abgenommen 01.10.2026.
//
// DE + BR: die Engine prueft DE und verwirft BR still. Ohne Hinweis liest sich
// die Map als vollstaendig — fuer einen Markt, den niemand angesehen hat. Jede
// Flaeche sagt deshalb, was NICHT geprueft wurde, und bietet die Anfrage an.
// Kein Alarm: Status Brand, nicht Warning — es fehlt Abdeckung, kein Risiko.

/** I1 — je ungeprueftem Markt ein Hinweis zwischen Kennzahlen und Tabelle. */
export function PartialMarketNotice({
  market,
  status,
  onRequest,
}: {
  market: string;
  status: MarketRequestStatus;
  onRequest: () => void;
}) {
  const { t } = useTranslation(['common']);
  const names = useNames();
  const name = names.market(market);
  if (status === 'sent') {
    return (
      <Banner status="brand" icon={<Check size={18} aria-hidden />} title={t('common:states.marketRequest.sent', { markets: name })}>
        {t('common:states.marketRequest.sentBody')}
      </Banner>
    );
  }
  return (
    <Banner status="brand" title={t('common:states.marketPartial.heading', { market: name })}>
      <span className="flex flex-col items-start gap-2.5">
        <span>{t('common:states.marketPartial.message', { market: name })}</span>
        <span className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className={outlineBrand}
            loading={status === 'sending'}
            onClick={onRequest}
            aria-label={`${t('common:states.actions.requestThisMarket')}: ${name}`}
          >
            {t('common:states.actions.requestThisMarket')}
          </Button>
          {status === 'failed' && <Failed />}
        </span>
      </span>
    </Banner>
  );
}

/** J1 — die Zeile "Not checked" unten in "What we checked". */
export function NotCheckedRow({
  market,
  status,
  onRequest,
}: {
  market: string;
  status: MarketRequestStatus;
  onRequest: () => void;
}) {
  const { t } = useTranslation(['common']);
  const names = useNames();
  const name = names.market(market);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {/* Kein fester w-24 wie Markets/Areas: "Not checked" (DE "Nicht
            geprueft") ist laenger und braeche sonst um. */}
        <span className="min-w-24 shrink-0 whitespace-nowrap pr-2 text-body-sm font-semibold text-fg-secondary">{t('common:states.marketPartial.notChecked')}</span>
        <span className="text-body-sm font-semibold text-fg">{name}</span>
        <span className="text-body-xs text-fg-tertiary">· {t('common:states.marketRequest.notCovered')}</span>
      </span>
      {status === 'sent' ? (
        <span role="status" className="inline-flex shrink-0 items-center gap-2 text-body-sm font-semibold text-fg-brand">
          <Check size={16} aria-hidden /> {t('common:states.marketRequest.sent', { markets: name })}
        </span>
      ) : (
        <span className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <Button
            size="md"
            variant="outline"
            className={outlineBrand}
            loading={status === 'sending'}
            onClick={onRequest}
            aria-label={`${t('common:states.actions.requestThisMarket')}: ${name}`}
          >
            {t('common:states.actions.requestThisMarket')}
          </Button>
          {status === 'failed' && <Failed />}
        </span>
      )}
    </div>
  );
}

/** K3 — mit Konto: eine gestrichelte Karte oben in der Anbieter-Spalte. Die
 *  Anbieter darunter bleiben, sie gelten fuer die geprueften Maerkte. Update-
 *  Wunsch wie F3: standardmaessig aus, nur mit bekannter Adresse. */
export function NotCheckedCard({
  market,
  email,
  status,
  onRequest,
}: {
  market: string;
  email: string | null;
  status: MarketRequestStatus;
  onRequest: (notify: boolean) => void;
}) {
  const { t } = useTranslation(['common']);
  const names = useNames();
  const [notify, setNotify] = useState(false);
  const name = names.market(market);
  return (
    <section
      aria-label={`${t('common:states.marketPartial.notChecked')}: ${name}`}
      className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-stroke bg-surface px-[22px] py-5"
    >
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
        {t('common:states.marketPartial.notChecked')}
      </span>
      <span className="text-body font-bold leading-[1.35] text-fg">{name}</span>
      {status === 'sent' ? (
        <span role="status" className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-fg-brand">
            <Check size={16} aria-hidden /> {t('common:states.marketRequest.sent', { markets: name })}
          </span>
          <span className="text-body-xs leading-[1.55] text-fg-secondary">{t('common:states.marketRequest.sentBody')}</span>
        </span>
      ) : (
        <>
          <span className="text-body-sm text-fg-secondary">{t('common:states.marketPartial.notIncluded')}</span>
          {email && (
            <Checkbox
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              disabled={status === 'sending'}
              label={<span className="text-body-xs text-fg">{t('common:states.marketRequest.notifyLabel', { market: name })}</span>}
            />
          )}
          <Button
            size="md"
            className="w-full"
            loading={status === 'sending'}
            onClick={() => onRequest(notify)}
            aria-label={`${t('common:states.actions.requestThisMarket')}: ${name}`}
          >
            {t('common:states.actions.requestThisMarket')}
          </Button>
          {status === 'failed' && <Failed />}
        </>
      )}
    </section>
  );
}

// ─── Geprüfter Markt ohne freigegebenen Anbieter (Canvas P1 · Q1) ────────────
// Figma 3693:4040 (P1, Gast) / 3693:4131 (Q1, mit Konto), abgenommen 11.10.2026.
//
// Die Engine prueft den Markt, aber /search meldet fuer keinen gewaehlten
// Bereich einen freigegebenen Anbieter (coverage). Ausgeloest aus den
// Abdeckungsdaten, nicht aus der Laenderliste der Engine (Entscheidung a).
// "Request This Market" schickt je Markt die fehlenden Bereiche als
// Abdeckungsanfrage (reason provider_coverage).

export interface CoverageGapLike { market: string; areas: string[] }

/** Eine Anfrage fuer alle Luecken auf einmal; ein Status fuer den Knopf. */
export function useCoverageRequest(gaps: CoverageGapLike[], asGuest: boolean) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const [status, setStatus] = useState<MarketRequestStatus>('idle');
  const send = useCallback(async (notify = false) => {
    setStatus('sending');
    try {
      for (const g of gaps) {
        await requestMarket({ market: g.market, domains: g.areas, asGuest, locale, reason: 'provider_coverage', notify: !asGuest && notify });
      }
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  }, [gaps, asGuest, locale]);
  return { status, send };
}

function GapChips({ gaps }: { gaps: CoverageGapLike[] }) {
  const names = useNames();
  const chips = gaps.flatMap((g) => g.areas.map((a) => `${names.area(a)} · ${names.market(g.market)}`));
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label={chips.join(', ')}>
      {chips.map((c) => (
        <li key={c} className="rounded-md border border-stroke-subtle bg-surface px-2.5 py-1 text-body-2xs font-semibold text-fg-secondary">{c}</li>
      ))}
    </ul>
  );
}

/** P1 — Gast: der Zustand mittig im Anbieter-Abschnitt. Gaeste bekommen kein
 *  Update (G2, 27.09.), deshalb der abgenommene Gast-Satz statt "choose to be
 *  notified". */
export function NoProviderMatchGuest({ gaps, status, onRequest }: {
  gaps: CoverageGapLike[];
  status: MarketRequestStatus;
  onRequest: () => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  if (status === 'sent') {
    return <div className="flex justify-center"><MarketRequestSent markets={gaps.map((g) => g.market)} /></div>;
  }
  return (
    <section
      aria-label={t('common:states.noProviderMatch.heading')}
      className="flex flex-col items-center gap-3 border-t border-stroke-subtle pt-8 text-center"
    >
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-brand">{t('results:snapshot.providersEyebrow')}</span>
      <h2 className="max-w-[640px] text-balance font-serif text-[1.75rem] font-bold leading-tight text-fg">{t('common:states.noProviderMatch.heading')}</h2>
      <p className="max-w-[560px] text-body-sm leading-relaxed text-fg-secondary">{t('common:states.marketRequest.guestMessage')}</p>
      <GapChips gaps={gaps} />
      <span className="flex flex-col items-center gap-1.5 pt-1">
        <Button size="lg" loading={status === 'sending'} onClick={onRequest}>
          {t('common:states.actions.requestThisMarket')}
        </Button>
        {status === 'failed' && <Failed />}
      </span>
    </section>
  );
}

/** Q1 — mit Konto: die H3-Karte in der Anbieter-Spalte, dazu Opt-in und
 *  Anfrage. Der abgenommene Satz ("choose to be notified") stimmt, seit der
 *  Watcher die Anbieter-Mail verschickt (X1). Ohne bekannte Adresse kein
 *  Opt-in — dann ist der Satz fuer diesen Nutzer nicht einloesbar, und es
 *  steht der Gast-Satz da. */
export function NoProviderMatchCard({ gaps, email, status, onRequest }: {
  gaps: CoverageGapLike[];
  email: string | null;
  status: MarketRequestStatus;
  onRequest: (notify: boolean) => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  const names = useNames();
  const [notify, setNotify] = useState(false);
  return (
    <section
      aria-label={t('common:states.noProviderMatch.heading')}
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-stroke bg-surface px-[22px] py-5"
    >
      <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-tertiary">{t('results:snapshot.providersEyebrow')}</span>
      <h2 className="text-body font-bold leading-[1.35] text-fg">{t('common:states.noProviderMatch.heading')}</h2>
      <p className="text-body-sm leading-[1.55] text-fg-secondary">
        {email ? t('common:states.noProviderMatch.message') : t('common:states.marketRequest.guestMessage')}
      </p>
      {status === 'sent' ? (
        <div role="status" className="mt-1 rounded-lg bg-brand-light px-3.5 py-3">
          <p className="text-body-xs font-bold text-fg">
            {t('common:states.marketRequest.sent', { markets: names.list([...new Set(gaps.map((g) => g.market))].map(names.market)) })}
          </p>
          <p className="mt-1 text-body-3xs leading-relaxed text-fg-secondary">{t('common:states.marketRequest.sentBody')}</p>
        </div>
      ) : (
        <>
          {email && (
            <div className="mt-1 rounded-lg bg-surface-secondary px-3 py-2.5">
              <Checkbox
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                disabled={status === 'sending'}
                className="items-start"
                label={
                  <span className="flex flex-col gap-0.5">
                    <span className="text-body-xs font-semibold text-fg">{t('results:providerCoverage.notifyLabel')}</span>
                    <span className="text-body-3xs text-fg-tertiary">{t('results:providerCoverage.notifyHelp', { email })}</span>
                  </span>
                }
              />
            </div>
          )}
          <Button className="mt-1 w-full" loading={status === 'sending'} onClick={() => onRequest(notify)}>
            {t('common:states.actions.requestThisMarket')}
          </Button>
          {status === 'failed' && <Failed />}
        </>
      )}
    </section>
  );
}
