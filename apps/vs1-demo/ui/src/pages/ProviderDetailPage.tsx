import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { UserShell } from '../components/user/UserShell';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { KpiRing, useEntered } from '../components/ui/Stats';
import { SEVERITY_STYLE } from '../components/compliance-areas/severity';
import { ApiError } from '../api/client';
import { fetchProviderDetail, fetchProviderReviews, fetchSlots, type ProviderDetail, type ProviderReview } from '../api/bookings';
import { loadProviderContext, type ContextDuty, type ProviderContext } from '../lib/providerContext';
import { DOMAINS } from '../lib/domains';
import { SLUG_TO_I18N } from './user/AnfragenTab';

// ─── Partnerseite ────────────────────────────────────────────────────────────
// Canvas "Partnerseite", Nutzer-Wahl 2026-09-15 (1B · 2C · 3B · 4C · 5B · 6B).
//
// Die Frage, die diese Seite beantwortet, ist nicht „wer ist dieser Anbieter",
// sondern „passt der zu dem, was ich gerade offen habe". Deshalb steht sie im
// Arbeitsbereich und nicht auf einer eigenen weissen Flaeche:
//
//   1B  In der Shell, Kopf wie die Bereichsseite: Brotkrumen, Match-Zahl im
//       Kasten, Titel serif mit goldenem Ort, „Verified Partner", Lage-Satz
//       mit Bezug zur Sitzung, rechts der Rueckweg; drei Ringe (Passung ·
//       Bewertung · Bestaetigungsquote).
//   2C  Matrix Pflicht × Markt wie auf der Bereichsseite — die Maerkte, die
//       dieser Anbieter NICHT abdeckt, sind durchgestrichen und ihre Punkte
//       blass. Eine Markt-Luecke sieht man damit in einem Blick.
//   3B  Dossier in drei Karten: Leistungen · Qualifikation · Abdeckung.
//   4C  Preise als Pakete — eine Karte je Zeile der Preistabelle.
//   5B  Kennzahlen-Zeile und Zitate aus Bewertungen, die an einer Buchung
//       haengen.
//   6B  Rechte Spalte, klebt beim Scrollen: die naechsten freien Termine und
//       der Buchungs-Knopf ganz oben (Nutzer 2026-09-15: „der Bereich fuers
//       Buchen wird on top zum Sticky-Bereich").
//
// Woher der Bezug kommt: `?area=<slug>` (Bereichsseite) oder `?session=<id>`
// (Sitzungsseite), aufgeloest in lib/providerContext. Ohne Bezug faellt die
// Matrix weg und der Kopf traegt keinen Lage-Satz — die Seite erfindet keine
// Sitzung, nur damit eine Sektion gefuellt ist.
//
// Stufe 2 bleibt anonym: Name und Kontakt gibt es erst nach der Buchung
// (spec §5). Das Oeffnen ist das bezahlte Ereignis `provider_detail_opened`
// (serverseitig 1×/Nutzer/30 Tage entprellt).
//
// NICHT VERLINKT (Nutzer-Entscheidung 2026-09-15). Bereichs- und Sitzungsseite
// oeffnen einen Anbieter seither als Schublade (components/user/PartnerDrawer,
// Canvas 1C): kein Seitenwechsel, die Liste bleibt sichtbar. Diese Seite bleibt
// unter ihrer Route erreichbar und wird wieder verlinkt, sobald es eine
// Partner-UEBERSICHTSSEITE und einen Navigationspunkt „Partner" gibt — erst
// dann fuehrt aus ihr ein Weg heraus, der nicht der Zurueck-Knopf ist.

type State = { kind: 'loading' } | { kind: 'ready'; p: ProviderDetail } | { kind: 'missing' } | { kind: 'error' };

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

export function ProviderDetailPage() {
  const { key = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const entered = useEntered();

  const [state, setState] = useState<State>({ kind: 'loading' });
  const [ctx, setCtx] = useState<ProviderContext | null>(null);
  const [reviews, setReviews] = useState<{ reviews: ProviderReview[]; count: number; average: number | null } | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);

  const search = params.toString();

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    fetchProviderDetail(key)
      .then((p) => { if (alive) setState(p ? { kind: 'ready', p } : { kind: 'missing' }); })
      .catch((err) => {
        if (!alive) return;
        setState(err instanceof ApiError && err.status === 404 ? { kind: 'missing' } : { kind: 'error' });
      });
    return () => { alive = false; };
  }, [key]);

  // Bezug, Bewertungen und Termine sind Beiwerk: faellt eines aus, fehlt genau
  // diese Sektion — die Seite bleibt benutzbar.
  useEffect(() => {
    let alive = true;
    setCtx(null);
    loadProviderContext(new URLSearchParams(search), key, locale)
      .then((c) => { if (alive) setCtx(c); })
      .catch(() => { if (alive) setCtx(null); });
    return () => { alive = false; };
  }, [key, search, locale]);

  useEffect(() => {
    let alive = true;
    setReviews(null);
    fetchProviderReviews(key)
      .then((r) => { if (alive) setReviews(r); })
      .catch(() => { if (alive) setReviews({ reviews: [], count: 0, average: null }); });
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    let alive = true;
    setSlots(null);
    fetchSlots(key)
      .then((s) => { if (alive) setSlots(s); })
      .catch(() => { if (alive) setSlots([]); });
    return () => { alive = false; };
  }, [key]);

  const areaLabel = ctx?.areaSlug && SLUG_TO_I18N[ctx.areaSlug]
    ? t(`domains.${SLUG_TO_I18N[ctx.areaSlug]}`, { defaultValue: ctx.areaSlug })
    : null;
  const activeDomain = ctx?.areaSlug ? DOMAINS.find((d) => d.slug === ctx.areaSlug)?.label : undefined;

  const book = (slot?: string) =>
    navigate(`/${locale}/provider/${key}/schedule${slot ? `?slot=${encodeURIComponent(slot)}` : ''}`);

  return (
    <UserShell activeDomain={activeDomain}>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1240px]">
          {state.kind === 'loading' && <p className="text-body-sm text-fg-tertiary">{t('detail.loading')}</p>}

          {(state.kind === 'missing' || state.kind === 'error') && (
            <section className={`${CARD} p-8`}>
              <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
                {state.kind === 'missing' ? t('detail.notFoundTitle') : t('detail.errorTitle')}
              </h1>
              <p className="mt-2 max-w-[560px] text-body-sm text-fg-secondary">
                {state.kind === 'missing' ? t('detail.notFoundBody') : t('detail.errorBody')}
              </p>
              {/* Der Rueckweg ist der, ueber den der Nutzer gekommen ist —
                  „zurueck" allein landet sonst wieder auf dieser Seite, wenn
                  sie aus einer Benachrichtigung heraus geoeffnet wurde. */}
              <Button className="mt-5" type="button" onClick={() => (ctx ? navigate(ctx.backTo) : navigate(-1))}>
                {ctx ? (ctx.kind === 'area' ? t('detail.backToArea') : t('detail.backToSession')) : t('detail.back')}
              </Button>
            </section>
          )}

          {state.kind === 'ready' && (
            <Detail
              p={state.p}
              ctx={ctx}
              areaLabel={areaLabel}
              reviews={reviews}
              slots={slots}
              entered={entered}
              locale={locale}
              onBook={book}
              onBack={() => (ctx ? navigate(ctx.backTo) : navigate(-1))}
            />
          )}
        </div>
      </div>
    </UserShell>
  );
}

function Detail({ p, ctx, areaLabel, reviews, slots, entered, locale, onBook, onBack }: {
  p: ProviderDetail;
  ctx: ProviderContext | null;
  areaLabel: string | null;
  reviews: { reviews: ProviderReview[]; count: number; average: number | null } | null;
  slots: string[] | null;
  entered: boolean;
  locale: string;
  onBook: (slot?: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('results');

  const covered = useMemo(
    () => new Set((p.countries_supported ?? []).map((c) => c.toUpperCase())),
    [p.countries_supported],
  );
  const markets = ctx?.markets ?? [];
  const coveredCount = markets.filter((m) => covered.has(m)).length;
  const match = ctx?.self?.match ?? null;
  const basis = ctx?.self?.match_basis;
  const domainsMatched = basis ? basis.domains_matched.length : null;
  const domainsRequested = basis ? basis.domains_requested.length : null;

  // Titel: der Ort hinter dem Mittelpunkt steht in Gold — wie „Ihre
  // Compliance-Sitzungen." auf den anderen Seiten des Arbeitsbereichs.
  const [head, ...rest] = (p.pseudonym_label || '').split(' · ');
  const title = rest.length
    ? <>{head} · <span className="text-fg-accent-emphasis">{rest.join(' · ')}</span></>
    : <>{head}</>;

  // 1B · Lage-Satz — nur die Teile, die es wirklich gibt.
  const lage: ReactNode[] = [];
  if (ctx) {
    if (domainsMatched !== null && domainsRequested !== null && domainsRequested > 0) {
      // Bei genau einem angefragten Bereich waere „1 von 1 Bereichen" eine
      // Rechnung ohne Aussage — dann steht schlicht da, ob er ihn abdeckt.
      const one = domainsRequested === 1;
      lage.push(
        <span key="d">
          {one
            ? t(domainsMatched === 1 ? 'detail.lageAreaYes' : 'detail.lageAreaNo', { area: areaLabel ?? ctx.label })
            : ctx.kind === 'session'
              ? t('detail.lageAreasSession', { matched: domainsMatched, total: domainsRequested, session: ctx.label })
              : t('detail.lageAreasArea', { matched: domainsMatched, total: domainsRequested, area: areaLabel ?? '' })}
        </span>,
      );
    }
    if (markets.length) {
      const missing = markets.filter((m) => !covered.has(m));
      lage.push(
        <strong key="m" className={missing.length ? 'text-[#8A3B3B] dark:text-[#F1A88C]' : 'text-fg-accent-strong'}>
          {missing.length
            ? t('detail.lageMarketsPartial', { covered: coveredCount, total: markets.length, missing: missing.join(' · ') })
            : t('detail.lageMarketsAll', { count: markets.length })}
        </strong>,
      );
    }
  }
  if (p.avg_response_hours != null) lage.push(<span key="r">{t('snapshot.responseTime', { hours: p.avg_response_hours })}</span>);
  if (p.active_since) lage.push(<span key="a">{t('snapshot.activeSince', { year: p.active_since })}</span>);

  const pct = (n: number) => `${n} ${'%'}`;
  // Die Note kommt NUR aus Bewertungen, die an einer Buchung haengen. `p.rating`
  // ist das Aggregat derselben Quelle; steht die Liste leer, waere die Zahl eine
  // Behauptung ohne Beleg — dann faellt der Ring weg (Befund 2026-09-15: der
  // Ring zeigte 4,5, waehrend darunter „noch keine Bewertung" stand).
  const rating = reviews?.average ?? null;
  const ratingCount = reviews?.count ?? 0;
  const confirm = p.confirmation_rate != null ? Math.round(p.confirmation_rate * 100) : null;

  return (
    <>
      {/* 1B · Brotkrumen */}
      <nav className="mb-3.5 flex flex-wrap items-center gap-1.5 text-body-3xs text-fg-tertiary">
        {ctx && (
          <>
            <Link to={ctx.backTo} className="font-bold text-brand underline underline-offset-2 hover:text-brand-700">
              {ctx.kind === 'area' ? areaLabel : ctx.label}
            </Link>
            <span>›</span>
          </>
        )}
        <span>{t('detail.crumbProviders')}</span>
        <span>›</span>
        <span className="font-semibold text-fg">{p.pseudonym_label}</span>
      </nav>

      {/* 1B · Kopf */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3.5">
          {match !== null && (
            <span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[10px] bg-accent text-body-xs font-extrabold text-primary-950">
              {match}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-[23px] font-bold leading-tight text-fg">{title}</h1>
              {p.is_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/55 px-2.5 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
                  <ShieldCheck size={13} strokeWidth={2.2} aria-hidden /> {t('snapshot.verifiedPartner')}
                </span>
              )}
            </div>
            {lage.length > 0 && (
              <p className="mt-1.5 text-body-sm text-fg">
                {lage.map((part, i) => (
                  <span key={i}>{i > 0 && <span className="text-fg-tertiary"> · </span>}{part}</span>
                ))}
              </p>
            )}
          </div>
        </div>
        {ctx && (
          <div className="mt-0.5 flex shrink-0 items-center">
            <Button variant="secondary" onClick={onBack}>
              {ctx.kind === 'area' ? t('detail.backToArea') : t('detail.backToSession')}
            </Button>
          </div>
        )}
      </div>

      {/* 1B · Drei Ringe. Jeder nur, wenn seine Zahl existiert. */}
      {reviews !== null && (match !== null || rating !== null || confirm !== null) && (
        <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-3">
          {match !== null && (
            <KpiRing
              on={entered}
              title={t('detail.ringMatch')}
              value={match}
              format={pct}
              sub={domainsMatched !== null && domainsRequested !== null && domainsRequested > 1
                ? t('detail.ringMatchSub', { matched: domainsMatched, total: domainsRequested, markets: markets.join(' · ') || '—' })
                : markets.join(' · ') || '—'}
              segs={[{ frac: match / 100, cls: 'text-accent' }]}
            />
          )}
          {rating !== null && ratingCount > 0 && (
            <KpiRing
              on={entered}
              title={t('detail.ringRating')}
              value={Math.round(rating * 10)}
              format={(n) => (n / 10).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              sub={t('detail.ringRatingSub', { count: ratingCount, mandates: p.completed_count ?? 0 })}
              segs={[{ frac: rating / 5, cls: 'text-brand' }]}
            />
          )}
          {confirm !== null && (
            <KpiRing
              on={entered}
              title={t('detail.ringConfirm')}
              value={confirm}
              format={pct}
              sub={p.avg_response_hours != null ? t('snapshot.responseTime', { hours: p.avg_response_hours }) : t('detail.ringConfirmSub')}
              segs={[{ frac: confirm / 100, cls: 'text-risk-low' }]}
            />
          )}
        </div>
      )}

      <p className="mt-4 max-w-[760px] text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.anonNote')}</p>

      {/* 6B · zweispaltig, rechts klebt die Buchung */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <Matrix ctx={ctx} covered={covered} />
          <Dossier p={p} ctx={ctx} covered={covered} />
          <Packages p={p} />
          <Reviews data={reviews} p={p} confirm={confirm} locale={locale} />
        </div>
        <BookingRail p={p} slots={slots} locale={locale} onBook={onBook} ctx={ctx} />
      </div>
    </>
  );
}

// ─── 2C · Matrix Pflicht × Markt ─────────────────────────────────────────────
// Dieselbe Matrix wie auf der Bereichsseite, mit einem Unterschied: die Spalten
// der Maerkte, die dieser Anbieter nicht abdeckt, sind durchgestrichen und ihre
// Punkte blass. Was er nicht abdecken kann, faellt damit ins Auge, ohne dass
// eine Zeile verschwindet.
function Matrix({ ctx, covered }: { ctx: ProviderContext | null; covered: Set<string> }) {
  const { t } = useTranslation('results');
  if (!ctx) {
    return (
      <section>
        <h2 className="mb-3 text-body-md font-bold text-fg">{t('detail.matrixTitle')}</h2>
        <div className={`${CARD} px-[18px] py-5`}>
          <p className="text-body-xs leading-relaxed text-fg-tertiary">{t('detail.matrixNoContext')}</p>
        </div>
      </section>
    );
  }
  const { markets, duties } = ctx;
  const coveredCount = markets.filter((m) => covered.has(m)).length;
  const cols = `minmax(0,1fr) repeat(${Math.max(markets.length, 1)}, 56px) 170px`;

  return (
    <section>
      <h2 className="mb-3 text-body-md font-bold text-fg">
        {t('detail.matrixTitle')}{' '}
        <span className="text-fg-brand">{t('detail.matrixCovered', { covered: coveredCount, total: markets.length })}</span>
      </h2>
      <div className={`${CARD} overflow-x-auto px-[18px] py-3.5`}>
        <div className="min-w-[640px]">
          <div className="grid items-center gap-2 border-b border-stroke-subtle pb-2" style={{ gridTemplateColumns: cols }}>
            <span />
            {markets.map((m) => (
              <span
                key={m}
                className={'text-center text-body-4xs font-extrabold ' + (covered.has(m) ? 'text-fg-brand' : 'text-fg-tertiary line-through')}
                title={covered.has(m) ? undefined : t('detail.matrixNotCovered')}
              >
                {m}
              </span>
            ))}
            <span className="text-body-4xs font-extrabold text-fg-secondary">{t('detail.matrixSession')}</span>
          </div>
          {duties.length === 0 && <p className="py-4 text-body-xs text-fg-tertiary">{t('detail.matrixNone')}</p>}
          {duties.map((d, i) => (
            <Row key={`${d.sessionId}:${d.o.id}`} d={d} markets={markets} covered={covered} cols={cols} last={i === duties.length - 1} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.matrixFoot')}</p>
    </section>
  );
}

function Row({ d, markets, covered, cols, last }: {
  d: ContextDuty; markets: string[]; covered: Set<string>; cols: string; last: boolean;
}) {
  const { t } = useTranslation('results');
  const euWide = d.o.markets.length === 0;
  const applies = (m: string) => (euWide ? markets.includes(m) : d.o.markets.map((x) => x.toUpperCase()).includes(m));
  return (
    <div className={'grid items-center gap-2 py-2.5 ' + (last ? '' : 'border-b border-stroke-subtle')} style={{ gridTemplateColumns: cols }}>
      <span className={'min-w-0 truncate text-body-xs font-bold ' + (markets.some((m) => applies(m) && covered.has(m)) ? 'text-fg' : 'text-fg-tertiary')}>
        {d.o.label}
        {euWide && <span className="ml-1.5 text-body-4xs font-semibold text-fg-tertiary">{t('detail.matrixEuWide')}</span>}
      </span>
      {markets.map((m) => (
        <span key={m} className="grid place-items-center">
          {applies(m)
            ? <span className={`h-3 w-3 rounded-full ${SEVERITY_STYLE[d.o.severity].bar} ${covered.has(m) ? '' : 'opacity-30'}`} />
            : <span className="h-3 w-3 rounded-full border border-stroke" />}
        </span>
      ))}
      <span className="truncate text-body-3xs text-fg-secondary">{d.sessionTitle}</span>
    </div>
  );
}

// ─── 3B · Dossier in drei Karten ─────────────────────────────────────────────
function Dossier({ p, ctx, covered }: { p: ProviderDetail; ctx: ProviderContext | null; covered: Set<string> }) {
  const { t } = useTranslation('results');
  const services = p.services ?? [];
  const credentials = p.credentials ?? [];
  const mine = ctx?.markets ?? [];
  const others = (p.countries_supported ?? []).map((c) => c.toUpperCase()).filter((c) => !mine.includes(c));

  return (
    <section>
      <h2 className="mb-3 text-body-md font-bold text-fg">{t('detail.dossierTitle')}</h2>
      <div className="grid items-start gap-4 md:grid-cols-3">
        {/* Leistungen */}
        <div className={`${CARD} p-5`}>
          <h3 className="text-body-sm font-bold text-fg">{t('detail.servicesTitle')}</h3>
          {services.length > 0 ? (
            <div className="mt-3 divide-y divide-stroke-subtle">
              {services.map((s) => (
                <div key={s.title} className="py-3 first:pt-0">
                  <p className="text-body-xs font-bold text-fg">{s.title}</p>
                  {!!s.includes?.length && (
                    <p className="mt-1 text-body-3xs leading-relaxed text-fg-secondary">{s.includes.join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          ) : p.specializations.length > 0 ? (
            // Kein gepflegtes Dossier, aber die Fachgebiete stehen in der
            // Anmeldung — die zeigen wir, ohne eine Leistungsbeschreibung
            // dazuzuerfinden.
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.specializations.map((s) => (
                  <Badge key={s} shape="pill" tone="neutral" appearance="outline" size="lg">{s}</Badge>
                ))}
              </div>
              <p className="mt-3 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.servicesCoarse')}</p>
            </>
          ) : (
            <p className="mt-3 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.servicesNone')}</p>
          )}
          {!!p.excluded_services?.length && (
            <p className="mt-3 border-t border-stroke-subtle pt-3 text-body-3xs leading-relaxed text-fg-tertiary">
              {t('detail.servicesExcluded', { list: p.excluded_services.join(' · ') })}
            </p>
          )}
        </div>

        {/* Qualifikation */}
        <div className={`${CARD} p-5`}>
          <h3 className="text-body-sm font-bold text-fg">{t('detail.credentialsTitle')}</h3>
          {credentials.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {credentials.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  <span className="mt-[2px] shrink-0 text-fg-accent-strong"><ShieldCheck size={13} strokeWidth={2.2} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="block text-body-xs font-bold text-fg">{c.label}</span>
                    {c.note && <span className="mt-0.5 block text-body-3xs text-fg-tertiary">{c.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.credentialsNone')}</p>
          )}
          <p className="mt-3 border-t border-stroke-subtle pt-3 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.credentialsFoot')}</p>
        </div>

        {/* Abdeckung */}
        <div className={`${CARD} p-5`}>
          <h3 className="text-body-sm font-bold text-fg">{t('detail.coverageTitle')}</h3>
          {mine.length > 0 && (
            <>
              <p className="mt-3 text-body-4xs font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">{t('detail.coverageMine')}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {mine.map((m) => (
                  <span
                    key={m}
                    className={'inline-flex rounded-lg px-2.5 py-1.5 text-body-3xs font-bold '
                      + (covered.has(m) ? 'bg-brand-light text-fg-brand' : 'bg-surface-secondary text-fg-tertiary')}
                  >
                    {covered.has(m) ? m : t('detail.coverageNot', { market: m })}
                  </span>
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              {/* Ohne Bezug gibt es keine „Ihre Maerkte" — dann waere ein
                  zweites „Abdeckung" ueber der Karte „Abdeckung" nur Echo. */}
              {mine.length > 0 && (
                <p className="mt-3.5 text-body-4xs font-extrabold uppercase tracking-[0.06em] text-fg-tertiary">
                  {t('detail.coverageOther')}
                </p>
              )}
              <div className={(mine.length ? 'mt-1.5' : 'mt-3') + ' flex flex-wrap gap-1.5'}>
                {others.map((m) => (
                  <span key={m} className="inline-flex rounded-lg bg-brand-light px-2.5 py-1.5 text-body-3xs font-bold text-fg-brand">{m}</span>
                ))}
              </div>
            </>
          )}
          <p className="mt-3.5 text-body-xs text-fg">
            <strong>{t('detail.languages')}</strong> {p.languages.join(' · ') || '—'}
          </p>
          {p.work_mode && (
            <p className="mt-1 text-body-xs text-fg"><strong>{t('detail.workMode')}</strong> {p.work_mode}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 4C · Preise als Pakete ──────────────────────────────────────────────────
// Eine Karte je Zeile der Preistabelle. Keine „passt zu Ihrer Sitzung"-Marke:
// welches Paket passt, ergibt sich aus dem Gespraech, nicht aus einer
// Ableitung, die wir nicht belegen koennen.
function Packages({ p }: { p: ProviderDetail }) {
  const { t } = useTranslation('results');
  const rows = p.pricing_table ?? [];
  return (
    <section>
      <h2 className="mb-1 text-body-md font-bold text-fg">{t('detail.pricingTitle')}</h2>
      <p className="mb-3 text-body-3xs text-fg-tertiary">
        {t('detail.billing')}: {t(`snapshot.billing.${p.billing_model}`)} · {t('detail.pricingSub')}
      </p>
      {rows.length === 0 ? (
        <div className={`${CARD} px-[18px] py-5`}>
          <p className="text-body-xs text-fg-tertiary">{t('detail.pricingOnRequest')}</p>
        </div>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {rows.map((r) => (
            <div key={r.service} className={`${CARD} flex flex-col p-5`}>
              <p className="text-body-xs font-extrabold text-fg">{r.service}</p>
              <p className="mt-1.5 font-serif text-[20px] font-bold leading-tight text-fg-brand">{r.price}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 5B · Kennzahlen und Zitate ──────────────────────────────────────────────
function Reviews({ data, p, confirm, locale }: {
  data: { reviews: ProviderReview[]; count: number; average: number | null } | null;
  p: ProviderDetail;
  confirm: number | null;
  locale: string;
}) {
  const { t } = useTranslation('results');
  const quotes = (data?.reviews ?? []).filter((r) => r.body);
  const month = (iso: string) => new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(Math.max(0, 5 - Math.round(n)));

  const figures: Array<{ value: string; label: string }> = [];
  if (data?.average != null) figures.push({ value: `${data.average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`, label: t('detail.figureRating', { count: data.count }) });
  if (p.completed_count != null) figures.push({ value: String(p.completed_count), label: t('detail.figureMandates') });
  if (confirm != null) figures.push({ value: `${confirm} %`, label: t('detail.figureConfirm') });
  if (p.avg_response_hours != null) figures.push({ value: t('detail.figureHours', { hours: p.avg_response_hours }), label: t('detail.figureResponse') });

  return (
    <section>
      <h2 className="mb-3 text-body-md font-bold text-fg">
        {t('detail.reviewsTitle')}{' '}
        {data && data.count > 0 && <span className="text-fg-brand">{data.count}</span>}
      </h2>
      <div className={`${CARD} px-[18px] py-4`}>
        {figures.length > 0 && (
          <div className="-mx-[18px] mb-2 flex flex-wrap">
            {figures.map((f) => (
              <div key={f.label} className="flex-1 border-l border-stroke-subtle px-[18px] py-1">
                <p className="font-serif text-[20px] font-bold leading-tight text-fg">{f.value}</p>
                <p className="mt-0.5 text-body-3xs text-fg-tertiary">{f.label}</p>
              </div>
            ))}
          </div>
        )}
        {data === null ? (
          <p className="py-3 text-body-xs text-fg-tertiary">{t('detail.reviewsLoading')}</p>
        ) : quotes.length === 0 ? (
          <p className="py-3 text-body-xs leading-relaxed text-fg-tertiary">{t('detail.reviewsNone')}</p>
        ) : (
          <div className="divide-y divide-stroke-subtle">
            {quotes.slice(0, 3).map((r, i) => (
              <div key={i} className="py-3">
                <p className="text-body-xs leading-relaxed text-fg">„{r.body}“</p>
                <p className="mt-1.5 text-body-3xs text-fg-tertiary">
                  <span className="text-fg-accent-strong">{stars(r.rating)}</span>
                  {!!r.categories.length && <> · {r.categories.join(' · ')}</>}
                  {' · '}{month(r.created_at)}
                  {' · '}<span className="font-bold text-fg-brand">{t('detail.reviewsVerified')}</span>
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 border-t border-stroke-subtle pt-2.5 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.reviewsFoot')}</p>
      </div>
    </section>
  );
}

// ─── 6B · Buchung, klebend, ganz oben in der rechten Spalte ──────────────────
// Nutzer 2026-09-15: „der Bereich fuers Buchen wird on top zum Sticky-Bereich".
// Der Knopf steht deshalb ueber den Terminen und nicht unter ihnen — die
// Verfuegbarkeit begruendet ihn, sie fuehrt ihn nicht ein. Ein Klick auf einen
// Termin belegt den Slot auf der Buchungsseite vor, sonst waehlt der Nutzer
// zweimal.
function BookingRail({ p, slots, locale, onBook, ctx }: {
  p: ProviderDetail;
  slots: string[] | null;
  locale: string;
  onBook: (slot?: string) => void;
  ctx: ProviderContext | null;
}) {
  const { t } = useTranslation('results');
  const next = (slots ?? []).slice(0, 3);
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <aside className={`${CARD} sticky top-6 p-5`}>
      <h2 className="text-body-sm font-bold text-fg">{t('detail.bookTitle')}</h2>
      <p className="mt-1 text-body-3xs text-fg-tertiary">{t('detail.bookSub')}</p>
      <Button size="lg" shape="soft" fullWidth type="button" onClick={() => onBook()} className="mt-4">
        {t('detail.bookCta')} <ArrowRight size={15} />
      </Button>
      <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{t('detail.revealNote')}</p>

      <div className="mt-4 border-t border-stroke-subtle pt-4">
        <p className="text-body-4xs font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('detail.slotsTitle')}</p>
        {slots === null ? (
          <p className="mt-2 text-body-3xs text-fg-tertiary">{t('detail.slotsLoading')}</p>
        ) : next.length === 0 ? (
          <p className="mt-2 text-body-3xs leading-relaxed text-fg-tertiary">{t('detail.slotsNone')}</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {next.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onBook(s)}
                  className="inline-flex rounded-lg border border-stroke px-2.5 py-1.5 text-body-3xs font-bold text-fg transition-colors hover:border-brand hover:text-fg-brand"
                >
                  {when(s)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onBook()}
              className="mt-2 text-body-3xs font-bold text-brand underline underline-offset-2 hover:text-brand-700"
            >
              {t('detail.slotsAll')}
            </button>
          </>
        )}
      </div>

      {p.billing_model && (
        <p className="mt-4 border-t border-stroke-subtle pt-3.5 text-body-3xs text-fg-tertiary">
          {t('detail.billing')}: {t(`snapshot.billing.${p.billing_model}`)}
        </p>
      )}
      {ctx && (
        <div className="mt-3 border-t border-stroke-subtle pt-3">
          <Link to={ctx.backTo} className="text-body-3xs font-bold text-brand underline underline-offset-2 hover:text-brand-700">
            {ctx.kind === 'area' ? t('detail.backToArea') : t('detail.backToSession')}
          </Link>
        </div>
      )}
    </aside>
  );
}
