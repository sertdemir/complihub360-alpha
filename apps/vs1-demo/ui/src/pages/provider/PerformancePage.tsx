import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { LoadFailedState } from '../../components/provider/WorkspaceStates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { Textarea } from '../../components/ui/Textarea';
import { FieldError, errorAria } from '../../components/ui/FieldError';
import { SectionHead } from '../../components/ui/SectionHead';
import { Segment } from '../../components/compliance-areas';
import { KpiRing, TrendDelta, StepMeter, StackedBars, UnitGrid, unitsPer, useCountUp, useEntered, type StackedGroup } from '../../components/ui/Stats';
import { useWorkspaceData } from '../../lib/useWorkspaceData';
import { useRequestContext } from '../../lib/requestContext';
import { countTrend, previousOf, rateTrend, ratingTrend, signed, type Trend } from '../../lib/performanceTrend';
import {
  fetchPerformance, fetchPerformanceCsv, appealEnforcement, countedLabel,
  type PerformanceFacts, type PerformanceTrendRow, type ProviderEnforcement, type ProviderPerformanceResponse,
} from '../../api/performance';

// ─── Provider /performance · Cockpit ─────────────────────────────────────────
// Phase 6 (ADR-0009 Nr. 1 und 4) brachte die Fakten aus Buchungen; der
// Angleich an das User-Dashboard (Nutzer-Wahl 16.10.2026) bringt ihre FORM:
// ein Cockpit mit Ringen, Zaehlern und Trendpfeilen statt sechs Faktenkarten.
// Figma: Screens-Datei, Seite „Provider · Performance-Cockpit (Fr 16.10.)",
// Light 3749:3, Dark 3758:234, Zustaende 3758:156.
//
//   Reihe A · drei Ringe (dieselbe KpiRing-Form wie Dashboard und Sitzungen
//             des Users): Stattgefunden, Bewertung, Wuerden wieder buchen —
//             je mit Basis, Zeitraum und Trendpfeil gegen die 90 Tage davor.
//   Reihe B · drei Zaehler mit kleiner Anzeige: Nutzer nicht erschienen als
//             Einheiten-Kaestchen, eigene No-Shows als Vorfall-Meter (Hinweis
//             ab 2, Buchungspause ab 3), Absagen.
//   Verlauf · Workspace-Karte mit Abschnittskopf, Umschalter Bereich · Land ·
//             Monat (ab Growth) und gestapelten Balken; CSV ab Global.
//
// Was sich NICHT aendert (ADR-0009): kein Score, kein Rang, keine Note; eine
// Quote steht erst ab rate_min_bookings, darunter „—" mit der Stichprobe;
// fehlende Daten zaehlen im Ranking neutral. Die Trendpfeile vergleichen mit
// dem Vorfenster (`previous` der API); fehlt es oder traegt eine Seite keine
// Quote, steht kein Pfeil, sondern der Grund.

type T = (k: string, o?: Record<string, unknown>) => string;
type TrendKey = 'area' | 'country' | 'month';

const EYEBROW = 'text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand';
const NUMBER = 'font-serif text-[30px] font-bold leading-none tabular-nums text-fg';
const DONE_CLS = 'bg-unit-done ring-1 ring-inset ring-unit-done-line';

export function PerformancePage() {
  const { t: tRaw, i18n } = useTranslation('providerws');
  const t = tRaw as unknown as T;
  const locale = i18n.resolvedLanguage || 'en';
  const { data, state, error, reload } = useWorkspaceData(fetchPerformance);
  const entered = useEntered();

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px]">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <Trans t={tRaw} i18nKey="performance.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
          </h1>
          <p className="mt-1.5 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('performance.subtitle')}</p>
        </div>

        {state === 'loading' && <div aria-busy="true" className="mt-6 h-40 animate-pulse rounded-xl bg-surface-secondary/60 motion-reduce:animate-none" />}
        {state === 'error' && <div className="mt-6"><LoadFailedState surface="performance" error={error} onRetry={reload} section /></div>}
        {data && <Cockpit data={data} t={t} locale={locale} entered={entered} onChanged={reload} />}
      </div>
    </ProviderShell>
  );
}

function Cockpit({ data, t, locale, entered, onChanged }: { data: ProviderPerformanceResponse; t: T; locale: string; entered: boolean; onChanged: () => void }) {
  const f = data.performance;
  const prev = previousOf(data);
  const days = f.window_days;
  const need = f.rate_min_bookings;
  const of = t('performance.of');

  // Trendzeile: Pfeil nur mit Vergleich; sonst der Grund in derselben Zeile.
  const fmtDelta = (tr: Trend) => tr.kind === 'pp' ? t('performance.trend.pp', { value: signed(tr.delta) })
    : tr.kind === 'rating' ? signed(tr.delta, 1, locale) : signed(tr.delta);
  // Ohne Vergleich kein Pfeil und keine Zahl — nur der Grund, in derselben Zeile.
  const trendLine = (tr: Trend | null) => tr
    ? <TrendDelta direction={tr.direction} tone={tr.tone} delta={fmtDelta(tr)} compare={tr.delta === 0 ? t('performance.trend.same', { days }) : t('performance.trend.vsPrevious', { days })} />
    : <p className="text-body-2xs text-fg-tertiary">{prev ? t('performance.insufficientShort') : t('performance.trend.noPrevious')}</p>;

  const pct = (n: number) => `${n} %`;
  const attendedPending = f.attended.rate == null;
  const ratingPending = f.rating.average == null;
  const rebookPending = f.would_use_again.rate == null;
  const rate100 = (r: number | null) => (r == null ? 0 : Math.round(r * 100));

  return (
    <>
      {data.enforcement && <div className="mt-6"><EnforcementCard e={data.enforcement} t={t} locale={locale} onChanged={onChanged} /></div>}

      <p className={EYEBROW + ' mt-6'}>
        {t('performance.range', { days, bookings: f.bookings })} · {t('performance.policy', { version: f.policy_version })}
        {prev && <> · {t('performance.compareNote', { days })}</>}
      </p>

      {/* Reihe A · Quoten als Ringe */}
      <div className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3" data-facts>
        <KpiRing
          on={entered} ringSide="left"
          title={t('performance.fact.attended')}
          value={rate100(f.attended.rate)} format={(n) => (attendedPending ? '—' : pct(n))}
          segs={[{ frac: f.attended.rate ?? 0, cls: 'text-brand' }]}
          basis={countedLabel(f.attended, of)}
          sub={attendedPending ? t('performance.insufficient', { have: f.bookings, need }) : `${t('performance.attendedSub', { days })} · ${t('performance.rateFrom', { need })}`}
          trend={trendLine(rateTrend(f.attended, prev?.attended, true))}
          pending={attendedPending} data-fact={t('performance.fact.attended')} data-pending={attendedPending}
        />
        <KpiRing
          on={entered} ringSide="left"
          title={t('performance.fact.rating')}
          value={f.rating.average == null ? 0 : Math.round(f.rating.average * 10)}
          format={(n) => (ratingPending ? '—' : (n / 10).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))}
          segs={[{ frac: (f.rating.average ?? 0) / 5, cls: 'text-brand' }]}
          basis={ratingPending ? t('performance.insufficientShort') : t('performance.ratingBasis', { count: f.rating.count })}
          sub={ratingPending ? t('performance.ratingInsufficient', { have: f.rating.count, need: f.rating.min_count }) : t('performance.ratingAfterBooking')}
          trend={trendLine(ratingTrend(f.rating, prev?.rating))}
          pending={ratingPending} data-fact={t('performance.fact.rating')} data-pending={ratingPending}
        />
        <KpiRing
          on={entered} ringSide="left"
          title={t('performance.fact.wouldRebook')}
          value={rate100(f.would_use_again.rate)} format={(n) => (rebookPending ? '—' : pct(n))}
          segs={[{ frac: f.would_use_again.rate ?? 0, cls: 'text-brand' }]}
          basis={rebookPending ? t('performance.insufficientShort') : t('performance.wouldRebookSub', { count: f.would_use_again.count, of: f.would_use_again.of })}
          sub={rebookPending ? t('performance.insufficient', { have: f.would_use_again.of, need }) : t('performance.wouldRebookAsked')}
          trend={trendLine(rateTrend(f.would_use_again, prev?.would_use_again, true))}
          pending={rebookPending} data-fact={t('performance.fact.wouldRebook')} data-pending={rebookPending}
        />
      </div>

      {/* Reihe B · Zaehler mit kleiner Anzeige */}
      <div className="mt-7 grid gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        <Counter
          title={t('performance.fact.userNoShow')} value={f.user_no_show.count} on={entered}
          sub={f.disputes_open ? t('performance.userNoShowDisputes', { count: f.disputes_open }) : t('performance.userNoShowSub')}
          trend={trendLine(countTrend(f.user_no_show.count, prev?.user_no_show.count, null))}
        >
          {f.bookings > 0 && (
            <UnitGrid
              on={entered} size={12} gap={4} perUnit={unitsPer(f.bookings, 24)}
              parts={[
                { n: f.user_no_show.count, cls: 'bg-risk-medium-mark', label: t('performance.unit.noShow') },
                { n: Math.max(0, f.bookings - f.user_no_show.count), cls: DONE_CLS, label: t('performance.unit.booking') },
              ]}
            />
          )}
        </Counter>
        <Counter
          title={t('performance.fact.providerNoShow')} value={f.provider_no_show.count} on={entered}
          sub={t('performance.providerNoShowSub', { alert: f.incidents.alert_at, pause: f.incidents.pause_at, days: f.incidents.window_days, count: f.incidents.count })}
          trend={trendLine(countTrend(f.provider_no_show.count, prev?.provider_no_show.count, false))}
        >
          <StepMeter
            on={entered}
            filled={Math.min(f.incidents.count, f.incidents.pause_at)}
            steps={[t('performance.meter.first'), t('performance.meter.alert', { n: f.incidents.alert_at }), t('performance.meter.pause', { n: f.incidents.pause_at })]}
          />
        </Counter>
        <Counter
          title={t('performance.fact.cancelled')} value={f.cancelled_by_provider.count} suffix={t('performance.bySelf')} on={entered}
          sub={t('performance.cancelledSub', { count: f.cancelled_by_user.count })}
          trend={trendLine(countTrend(f.cancelled_by_provider.count, prev?.cancelled_by_provider.count, false))}
        />
      </div>

      {f.bookings === 0 && (
        <p className="mt-6 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('performance.noBookings')}</p>
      )}

      <div className="mt-8">
        <Trends data={data} t={t} locale={locale} entered={entered} />
      </div>
      <p className="mt-4 max-w-3xl text-body-2xs leading-relaxed text-fg-tertiary">{t('performance.rankingNote')}</p>
    </>
  );
}

/** Reihe B: Eyebrow, Zahl (zaehlt hoch), optionale Anzeige, Satz, Trend. */
function Counter({ title, value, suffix, sub, trend, on, children }: {
  title: string; value: number; suffix?: string; sub: string; trend: React.ReactNode; on: boolean; children?: React.ReactNode;
}) {
  const n = useCountUp(value, on);
  return (
    <div data-counter={title}>
      <div className="flex items-baseline gap-3">
        <p className={EYEBROW}>{title}</p>
        <span className={NUMBER} aria-label={String(value)}>{n}</span>
        {suffix && <span className="text-body-xs text-fg-secondary">{suffix}</span>}
      </div>
      {children && <div className="mt-2.5">{children}</div>}
      <p className="mt-2 text-body-2xs leading-snug text-fg-secondary">{sub}</p>
      <div className="mt-1.5">{trend}</div>
    </div>
  );
}

function Trends({ data, t, locale, entered }: { data: ProviderPerformanceResponse; t: T; locale: string; entered: boolean }) {
  const [by, setBy] = useState<TrendKey>('area');
  const [csv, setCsv] = useState<'idle' | 'busy' | 'failed'>('idle');
  const rows: PerformanceTrendRow[] = data.trends?.[by] ?? [];
  // Bereich und Land wie ueberall im Arbeitsbereich benannt (Termine, Leads).
  const { bereich, markt } = useRequestContext();
  const label = (key: string) => by === 'month'
    ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
    : by === 'area' ? bereich(key) : markt(key);

  const download = async () => {
    setCsv('busy');
    try {
      const text = await fetchPerformanceCsv();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'complihub360-bookings.csv'; a.click();
      URL.revokeObjectURL(url);
      setCsv('idle');
    } catch { setCsv('failed'); }
  };

  const groups: StackedGroup[] = rows.map((r) => ({
    key: r.key, label: label(r.key),
    parts: [
      { n: r.attended, cls: 'bg-brand', label: t('performance.chart.took') },
      { n: r.user_no_show + r.provider_no_show, cls: 'bg-risk-medium-mark', label: t('performance.chart.noShow') },
      { n: r.cancelled, cls: 'bg-unit-rest', label: t('performance.chart.cancelled') },
    ],
  }));
  const legend = [
    { cls: 'bg-brand', label: t('performance.chart.took') },
    { cls: 'bg-risk-medium-mark', label: t('performance.chart.noShow') },
    { cls: 'bg-unit-rest', label: t('performance.chart.cancelled') },
  ];

  return (
    <Card styleVariant="workspace" className="px-6 py-5" data-section="trends">
      <SectionHead
        title={t('performance.trendsTitle')}
        extra={
          <span className="flex flex-wrap items-center gap-2">
            <Tag tone="brand">{t(`performance.level.${data.analytics.level}`)}</Tag>
            {data.analytics.trends && (
              <span className="ml-1 flex gap-1.5">
                {(['area', 'country', 'month'] as TrendKey[]).map((k) => (
                  <Segment key={k} selected={by === k} onClick={() => setBy(k)}>{t(`performance.trendsBy.${k}`)}</Segment>
                ))}
              </span>
            )}
          </span>
        }
        trailing={data.analytics.export
          ? <Button size="sm" variant="secondary" onClick={download} loading={csv === 'busy'}>{t('performance.csvExport')}</Button>
          : <Tag tone="neutral">{t('performance.csvLocked')}</Tag>}
      />
      {csv === 'failed' && <p className="mb-2 text-[12px] text-error-700 dark:text-red-300">{t('performance.csvFailed')}</p>}
      {!data.analytics.trends ? (
        <p className="text-[13px] leading-relaxed text-fg-secondary">{t('performance.trendsLocked')}</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-fg-tertiary">{t('performance.trendsEmpty')}</p>
      ) : (
        <>
          <div className="mt-2 overflow-x-auto">
            <div style={{ minWidth: Math.max(320, groups.length * 120) }}>
              <StackedBars groups={groups} on={entered} />
            </div>
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-2xs text-fg-secondary">
            {legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={'h-2.5 w-2.5 rounded-[2px] ' + l.cls} />{l.label}
              </span>
            ))}
          </p>
          <p className="mt-2 text-body-3xs text-fg-tertiary">{t('performance.trendsNote')}</p>
        </>
      )}
    </Card>
  );
}

// ─── Buchungspause (§24) mit Einspruch ───────────────────────────────────────
// Die Pause sperrt Buchungen, nie die Sichtbarkeit. Der Anbieter liest den
// Grund, die Belege (Zahl der Vorfaelle) und legt einmal Einspruch ein; der
// Admin entscheidet. Sachlich, ohne Verstoss-Sprache.
function EnforcementCard({ e, t, locale, onChanged }: { e: ProviderEnforcement; t: T; locale: string; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // V2 (11.10.2026): ein Feld — der Knopf bleibt aktiv; zu kurz heisst Satz am
  // Feld und Fokus hinein, statt eines grauen Knopfs ohne Grund.
  const [tooShort, setTooShort] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const send = async () => {
    if (busy) return;
    if (note.trim().length < 10) { setTooShort(true); noteRef.current?.focus(); return; }
    setBusy(true); setFailed(false);
    try { await appealEnforcement(e.id, note.trim()); onChanged(); }
    catch { setFailed(true); }
    setBusy(false);
  };
  return (
    <Card styleVariant="workspace" className="space-y-3 border-warning-500/40 px-6 py-5" data-enforcement={e.action}>
      <div>
        <p className="text-[14px] font-semibold text-fg">{t(`performance.enforcement.${e.action}`)}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-fg-secondary">
          {t('performance.enforcementBody', { date: date(e.created_at), count: e.incident_count ?? 0 })}
        </p>
      </div>
      {e.decision ? (
        <p className="text-[13px] text-fg">{t(`performance.appealDecided.${e.decision}`, { date: e.decided_at ? date(e.decided_at) : '' })}</p>
      ) : e.appeal_at ? (
        <p className="text-[13px] text-fg">{t('performance.appealSent', { date: date(e.appeal_at) })}</p>
      ) : (
        <div className="space-y-2">
          <label className="block text-[12px] font-medium text-fg-secondary" htmlFor="appeal-note">{t('performance.appealLabel')}</label>
          <Textarea id="appeal-note" ref={noteRef} rows={3} value={note} placeholder={t('performance.appealPlaceholder')} error={tooShort}
            onChange={(ev) => { setNote(ev.target.value); if (tooShort && ev.target.value.trim().length >= 10) setTooShort(false); }}
            {...errorAria('appeal-note', tooShort)} />
          <FieldError id="appeal-note" alert message={tooShort ? t('performance.appealTooShort') : null} />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={send} loading={busy}>{t('performance.appealSend')}</Button>
            {failed && <span role="alert" className="text-[12px] text-error-700 dark:text-red-300">{t('performance.appealFailed')}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

// Fuer Tests und den Vorfenster-Vergleich exportiert.
export type { PerformanceFacts };
