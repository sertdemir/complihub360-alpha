import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Lock, Minus } from 'lucide-react';
import { Button, outlineBrandClass } from '../ui/Button';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { useRequestContext } from '../../lib/requestContext';
import { coverageGaps, formatPriceRange } from '../../lib/matchState';
import { requestMarket } from '../../api/marketRequests';
import { fetchSlots } from '../../api/bookings';
import type { AnonProvider, PriceRange, SearchCoverage } from '../../api/search';

// ─── Treffer-Zustaende (EN-Launch Schritt 2) ─────────────────────────────────
// Figma: Section 3634:2866 — A1 3634:2867 (mehrere, mit Konto), B3 3634:2931
// (einer, Gast), C2 3634:2989 (begrenzt, mit Konto). Abgenommen 09.10.2026.
// Ueberschrift und Satz kommen woertlich aus common:states.* (Checklist v1.0).

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
  return { market, area, locale };
}

/** Die Preisspanne als Satz — oder "Pricing on request.", nie eine Zahl,
 *  die es nicht gibt. */
export function usePriceText() {
  const { t, i18n } = useTranslation(['results']);
  const locale = i18n.resolvedLanguage || 'en';
  return (range: PriceRange | null | undefined): string => {
    const f = formatPriceRange(range, locale);
    if (!f) return t('results:detail.pricingOnRequest');
    if (f.kind === 'range') return f.text;
    return t(f.kind === 'from' ? 'results:matchStates.priceFrom' : 'results:matchStates.priceUpTo', { price: f.price });
  };
}

/** A1 — Kopf der Anbieter-Spalte mit Konto. Ein Treffer: der Singular
 *  (Checklist: "One active provider returns the singular one-match state"). */
export function ProviderStateHead({ count }: { count: number }) {
  const { t } = useTranslation(['common', 'results']);
  const key = count === 1 ? 'oneProviderMatch' : 'multipleProviderMatches';
  return (
    <div className="flex flex-col gap-2 px-0.5 pb-1">
      <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {t('results:partners.eyebrow', { count })}
      </span>
      <h2 className="font-serif text-[20px] font-bold leading-[1.22] text-fg">{t(`common:states.${key}.heading`)}</h2>
      <p className="text-body-xs leading-[1.5] text-fg-secondary">{t(`common:states.${key}.message`)}</p>
    </div>
  );
}

/** C2 — begrenzte Abdeckung: Matrix Bereich × Markt, darunter die zwei
 *  abgenommenen Aktionen. Ton Brand, kein Warning: es fehlt Abdeckung, kein
 *  Risiko. "Request More Coverage" fragt je Markt die fehlenden Bereiche an
 *  (reason provider_coverage) — ohne Update-Versprechen, das gibt es dafuer
 *  nicht. */
export function LimitedCoverageCard({ coverage, asGuest, onReviewMatch }: {
  coverage: SearchCoverage;
  asGuest: boolean;
  onReviewMatch: () => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  const names = useNames();
  const gaps = coverageGaps(coverage);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const request = async () => {
    setStatus('sending');
    try {
      for (const g of gaps) {
        await requestMarket({ market: g.market, domains: g.areas, asGuest, locale: names.locale, reason: 'provider_coverage' });
      }
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };
  const Cell = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      role="cell"
      aria-label={label}
      className={'grid h-[30px] place-items-center rounded-md border '
        + (ok ? 'border-stroke-brand-soft bg-brand-light text-fg-brand' : 'border-dashed border-stroke bg-surface-secondary text-fg-tertiary')}
    >
      {ok ? <Check size={14} strokeWidth={2.4} aria-hidden /> : <Minus size={14} aria-hidden />}
    </span>
  );
  const cols = `minmax(0,1fr) repeat(${coverage.markets.length}, 56px)`;
  return (
    <section
      aria-label={t('common:states.limitedCoverage.heading')}
      className="flex flex-col gap-3 rounded-2xl border border-stroke bg-surface px-[22px] py-5"
    >
      <h2 className="font-serif text-[19px] font-bold leading-[1.22] text-fg">{t('common:states.limitedCoverage.heading')}</h2>
      <p className="text-body-xs leading-[1.5] text-fg-secondary">{t('common:states.limitedCoverage.message')}</p>
      <div role="table" aria-label={t('results:matchStates.matrixLabel')} className="mt-1 flex flex-col gap-1.5">
        <div role="row" className="grid items-center gap-1.5" style={{ gridTemplateColumns: cols }}>
          <span role="columnheader" className="sr-only">{t('common:states.scope.areas')}</span>
          {coverage.markets.map((m) => (
            <span key={m} role="columnheader" title={names.market(m)} className="text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{m}</span>
          ))}
        </div>
        {coverage.areas.map((a) => (
          <div key={a} role="row" className="grid items-center gap-1.5" style={{ gridTemplateColumns: cols }}>
            <span role="rowheader" className="text-body-3xs font-semibold text-fg">{names.area(a)}</span>
            {coverage.markets.map((m) => {
              const ok = (coverage.covered[m] ?? []).includes(a);
              return <Cell key={m} ok={ok} label={`${names.area(a)} · ${names.market(m)}: ${t(ok ? 'results:matchStates.legendCovered' : 'results:matchStates.legendGap')}`} />;
            })}
          </div>
        ))}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-tertiary">
        <span className="inline-flex items-center gap-1.5"><Check size={12} strokeWidth={2.4} className="text-fg-brand" aria-hidden />{t('results:matchStates.legendCovered')}</span>
        <span className="inline-flex items-center gap-1.5"><Minus size={12} aria-hidden />{t('results:matchStates.legendGap')}</span>
      </p>
      <div className="mt-1 flex flex-col gap-2">
        <Button className="w-full" onClick={onReviewMatch}>{t('common:states.actions.reviewAvailableMatch')}</Button>
        {status === 'sent' ? (
          <div role="status" className="rounded-lg bg-brand-light px-3.5 py-3">
            <p className="text-body-xs font-bold text-fg">
              {t('common:states.marketRequest.sent', { markets: gaps.map((g) => names.market(g.market)).join(', ') })}
            </p>
            <p className="mt-1 text-body-3xs leading-relaxed text-fg-secondary">{t('common:states.marketRequest.sentBody')}</p>
          </div>
        ) : (
          <Button variant="outline" className={`w-full ${outlineBrandClass}`} loading={status === 'sending'} onClick={request}>
            {t('common:states.actions.requestMoreCoverage')}
          </Button>
        )}
        {status === 'failed' && (
          <span role="alert" className="text-body-3xs text-error-500">{t('common:states.marketRequest.failed')}</span>
        )}
      </div>
    </section>
  );
}

/** Der naechste freie Termin — aus derselben Quelle wie die Buchungsseite.
 *  Kommt keiner, steht er nicht da; erfunden wird keiner. */
function useNextSlot(publicRef: string) {
  const [slot, setSlot] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetchSlots(publicRef).then((s) => { if (alive) setSlot(s[0] ?? null); }).catch(() => { if (alive) setSlot(null); });
    return () => { alive = false; };
  }, [publicRef]);
  return slot;
}

/** B3 — Gast, genau ein Treffer. Fachgebiet, Abdeckung, Preisspanne und
 *  Verfuegbarkeit offen (sie verraten niemanden), Name und Kontakt nicht.
 *  "Review Match" fuehrt ins kostenlose Konto — die Zeile darunter sagt das,
 *  statt es hinter dem Knopf zu verstecken. */
export function OneMatchGuest({ provider: p, requestedMarkets, onReview }: {
  provider: AnonProvider;
  /** Die gewaehlten Maerkte, die die Engine kennt — fuer "1 of 2 markets". */
  requestedMarkets: string[];
  onReview: () => void;
}) {
  const { t } = useTranslation(['common', 'results']);
  const names = useNames();
  const priceText = usePriceText();
  const { beschreibung } = useRequestContext();
  const slot = useNextSlot(p.public_ref);
  const basis = p.match_basis;
  const requested = basis?.domains_requested ?? [];
  const matched = basis?.domains_matched ?? [];
  const covered = p.markets_covered ?? (basis?.country_covered && basis.country ? [basis.country] : []);
  const missing = requestedMarkets.filter((m) => !covered.includes(m));
  const coverageSub = !covered.length ? null
    : missing.length
      ? t('results:detail.lageMarketsPartial', { count: requestedMarkets.length, covered: covered.length, total: requestedMarkets.length, missing: missing.map(names.market).join(', ') })
      : t('results:detail.lageMarketsAll', { count: covered.length });
  const slotText = slot
    ? t('results:matchStates.nextSlot', {
        when: new Date(slot).toLocaleString(names.locale, { weekday: 'short', day: 'numeric', month: 'short' }),
      })
    : null;
  const Fact = ({ label, value, sub }: { label: string; value: string; sub?: string | null }) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</dt>
      <dd className="text-body-xs font-semibold text-fg">{value}</dd>
      {sub && <dd className="text-[11px] text-fg-tertiary">{sub}</dd>}
    </div>
  );
  return (
    <section aria-labelledby="one-match-heading" className="flex flex-col gap-4">
      <div className="flex max-w-[760px] flex-col gap-1.5">
        <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">{t('results:partners.eyebrow', { count: 1 })}</span>
        <h2 id="one-match-heading" className="font-serif text-[1.625rem] font-bold leading-tight text-fg">{t('common:states.oneProviderMatch.heading')}</h2>
        <p className="text-body-sm leading-relaxed text-fg-secondary">{t('common:states.oneProviderMatch.message')}</p>
      </div>
      <div
        data-testid="one-match-card"
        className="grid gap-6 rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-5 lg:grid-cols-[230px_minmax(0,1fr)_220px] lg:items-center"
      >
        <div className="flex items-center gap-3">
          <Lock size={18} className="shrink-0 text-fg-tertiary" aria-hidden />
          <div className="min-w-0">
            <p className="text-body-sm font-bold text-fg">{t('results:snapshot.verifiedPartner')}</p>
            <p className="text-body-3xs text-fg-secondary">{beschreibung({ areaCodes: p.area_codes, region: p.descriptor_region, fallback: p.descriptor })}</p>
            <p className="mt-1.5 text-body-md font-bold text-fg-brand">{t('results:partners.match', { pct: `${p.match}%` })}</p>
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact
            label={t('results:matchStates.factExpertise')}
            value={(matched.length ? matched : (p.area_codes ?? [])).map(names.area).join(' · ') || '—'}
            sub={requested.length ? t('results:matchBasis.areas', { matched: matched.length, total: requested.length }) : null}
          />
          <Fact
            label={t('results:matchStates.factCoverage')}
            value={covered.map(names.market).join(' · ') || '—'}
            sub={coverageSub}
          />
          <Fact
            label={t('results:matchStates.factPrice')}
            value={priceText(p.price_range)}
            sub={p.price_range ? `${t(`results:snapshot.billing.${p.billing_model}`)} · ${t('results:detail.pricingSub')}` : null}
          />
          <Fact
            label={t('results:matchStates.factAvailability')}
            value={slot === undefined ? '…' : slotText ?? t('results:detail.bookSub')}
            sub={slotText ? t('results:detail.bookSub') : null}
          />
        </dl>
        <div className="flex flex-col items-stretch gap-2">
          <Button size="lg" shape="soft" onClick={onReview}>
            {t('common:states.actions.reviewMatch')} <ArrowRight size={15} />
          </Button>
          <p className="text-center text-[11px] leading-snug text-fg-tertiary">{t('results:matchStates.guestCaption')}</p>
        </div>
      </div>
    </section>
  );
}
