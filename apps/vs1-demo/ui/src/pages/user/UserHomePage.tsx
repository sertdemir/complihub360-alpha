import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, ArrowRight, TriangleAlert, CalendarClock } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { generateRiskMapPdf } from '../../lib/riskMapPdf';
import { OBLIGATIONS, STATS } from '../ResultsRiskMap';
import { UserShell } from '../../components/user/UserShell';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Segment } from '../../components/compliance-areas';
import { Donut, SparkBars, KpiCard, useEntered, useCountUp, EASE } from '../../components/ui/Stats';

// ─── User Dashboard · Home v3 (Bento) ────────────────────────────────────────
// Canvas "User-Dashboard", Gesamt · V3 auf dem Gradient (Nutzer-Wahl
// 2026-08-29, plus drei Optimierungen: prominentes Warnband, "Weitermachen"
// als Karte in der rechten Spalte, mehr Raum). Ersetzt das langgezogene
// Karten-Layout durch ein Kachelraster: KPI-Reihe mit Donuts, Hero-Karte
// "Pflichten je Markt", kompakte Anfragen-Liste, rechte Spalte mit Terminen,
// naechstem Schritt und der Weitermachen-Karte, Sitzungen als kleine Kacheln.
//
// Alle Zahlen sind weiterhin die Design-Fixture bis die API steht — aber in
// sich konsistent: 12 Pflichten = 2 hoch / 6 mittel / 4 niedrig, je Markt
// IT 5 · FR 3 · UK 3 · ES 1. Die Mini-Charts zeigen ZUSAMMENSETZUNGEN dieser
// Fixture, keine erfundenen Trends ("+12 % vs. letzte Woche" gibt es nicht,
// weil es keine Zeitreihe gibt).

const REQUESTS = [
  {
    initials: 'VS', tone: 'bg-brand-accent text-fg-on-accent',
    status: 'wait' as const, statusLabel: 'Awaiting confirmation',
    company: 'Verifizierte Steuerkanzlei', meta: 'VAT registration · Italien · vor 14 Std.',
    action: 'Send reminder',
  },
  {
    initials: 'EP', tone: 'bg-brand text-fg-on-brand',
    status: 'active' as const, statusLabel: 'Active',
    company: 'Verifizierter EPR-Spezialist', meta: 'EPR registration · Frankreich · vor 2 Tagen',
    action: 'Open thread',
  },
  {
    initials: 'DK', tone: 'bg-primary-800 text-white',
    status: 'active' as const, statusLabel: 'Active',
    company: 'Verifizierte Datenschutz-Kanzlei', meta: 'GDPR audit · UK · vor 4 Tagen',
    action: 'Open thread',
  },
];

const SESSIONS = [
  { eyebrow: 'TAX & VAT · IT', title: 'VAT registration · Italien', risk: 'high' as const, meta: 'Hohes Risiko · Schwelle erreicht', upd: 'vor 2 Std.', frac: 0.8 },
  { eyebrow: 'EPR · FR', title: 'EPR registration · Frankreich', risk: 'medium' as const, meta: 'Frist Q3 2026', upd: 'vor 1 Tag', frac: 0.55 },
  { eyebrow: 'DATEN · UK', title: 'GDPR audit & DPA review', risk: 'high' as const, meta: 'Cookie-Consent', upd: 'vor 3 Tagen', frac: 0.7 },
  { eyebrow: 'TAX & VAT · ES', title: 'VAT thresholds · Spanien', risk: 'low' as const, meta: 'nur Beobachtung', upd: 'vor 7 Tagen', frac: 0.25 },
];

// Pflichten je Markt / je Bereich — beide Sichten summieren auf die 12 des
// Snapshots, davon 2 mit hohem Risiko (IT und UK je 1).
const BY_MARKET = [
  { label: 'IT', total: 5, high: 1 },
  { label: 'FR', total: 3, high: 0 },
  { label: 'UK', total: 3, high: 1 },
  { label: 'ES', total: 1, high: 0 },
];
const BY_AREA = [
  { label: 'Tax & VAT', total: 6, high: 1 },
  { label: 'EPR', total: 3, high: 0 },
  { label: 'Daten', total: 3, high: 1 },
];

// Termine-Fixture — dieselben zwei, die die Termine-Seite traegt.
const APPOINTMENTS = [
  { day: 'Di', date: '02', title: '10:00 · Erstgespräch Steuerkanzlei', sub: 'VAT · Italien' },
  { day: 'Do', date: '04', title: '14:30 · Dossier-Review EPR', sub: 'EPR · Frankreich' },
];

const RISK_TEXT = { high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low' } as const;
const RISK_BG = { high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low' } as const;

const STATUS_KEY: Record<string, string> = { 'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active' };
const ACTION_KEY: Record<string, string> = { 'Send reminder': 'sendReminder', 'Open thread': 'openThread' };

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

// Die Kleinst-Diagramme und die Eintritts-Animation liegen seit dem
// Sitzungen-Umbau in components/ui/Stats.tsx — hier standen sie zuerst.

function SectionHead({ title, count, to, extra }: { title: string; count?: string; to: string; extra?: ReactNode }) {
  const { t, i18n } = useTranslation('userws');
  const base = `/${i18n.resolvedLanguage || 'en'}`;
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-body-md font-bold text-fg">{title}</h2>
      {count && <span className="text-body-xs font-bold text-fg-brand">{count}</span>}
      {extra}
      <Link to={`${base}/${to}`} className="ml-auto text-body-2xs text-fg-secondary underline-offset-2 hover:underline">
        {t('shared.seeAll')}
      </Link>
    </div>
  );
}

export function UserHomePage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { t, i18n } = useTranslation('userws');
  const { t: tResults } = useTranslation('results');
  const [chartView, setChartView] = useState<'markets' | 'areas'>('markets');
  const entered = useEntered();
  const nRequests = useCountUp(3, entered);
  const nDuties = useCountUp(12, entered);
  const nSessions = useCountUp(4, entered);
  const nDeadlinePct = useCountUp(72, entered, 1100);
  const hasProfile = !!localStorage.getItem('ch360_last_profile');
  const tStatus = (label: string) => t(`status.${STATUS_KEY[label]}`);
  const tAction = (label: string) => t(`actions.${ACTION_KEY[label]}`);
  const firstName = (useAuthStore((st) => st.userName) || 'Alex').split(/[\s._-]+/)[0];
  const today = new Date().toLocaleDateString(i18n.resolvedLanguage || 'en', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const chartData = chartView === 'markets' ? BY_MARKET : BY_AREA;
  const chartMax = Math.max(...chartData.map((m) => m.total));

  // A6: derselbe PII-freie PDF-Schnappschuss wie auf /results (jspdf laedt beim Klick).
  const exportPdf = async () => {
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('ch360_last_profile') || 'null'); } catch { /* fixture */ }
    await generateRiskMapPdf({
      profile,
      t: tResults,
      stats: STATS.map((s, i) => ({ value: s.value, label: tResults(`stats.${i}.label`, { defaultValue: s.label }) })),
      obligations: OBLIGATIONS.map((o, i) => ({
        severity: o.severity,
        title: tResults(`obligations.${i}.title`, { defaultValue: o.title }),
        detail: tResults(`obligations.${i}.detail`, { defaultValue: o.detail }),
        market: tResults(`obligations.${i}.market`, { defaultValue: o.market }),
        due: tResults(`obligations.${i}.due`, { defaultValue: o.due }),
        dueSub: tResults(`obligations.${i}.dueSub`, { defaultValue: o.dueSub }),
        stateLabel:
          o.state.kind === 'confirmed' ? tResults('state.confirmed', { defaultValue: 'Confirmed' })
          : o.state.kind === 'likely' ? tResults('state.likely', { defaultValue: 'Likely' })
          : tResults('pdf.questionsOpen', { defaultValue: '{{total}} questions open', total: o.state.count }),
      })),
    });
  };

  return (
    <UserShell>
      {/* Der Gradient liegt unter dem ganzen Main-Bereich, die Karten weiss
          darauf — die Shell selbst bleibt unangetastet (negative Raender
          heben ihr Main-Padding auf). */}
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1200px]">
          {/* Kopf: Begruessung + Datum, rechts der Primaer-CTA */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
                <Trans t={t} i18nKey="home.title" values={{ name: firstName }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
              </h1>
              <p className="mt-1 text-body-2xs text-fg-tertiary">{today} · {t('home.lastActivity')}</p>
            </div>
            <Button className="mt-0.5 shrink-0" onClick={() => navigate(`/${locale}/wizard`)}>{t('shared.startNewSearch')}</Button>
          </div>

          {/* Prominentes Warnband (Nutzer-Optimierung: faellt direkt ins Auge) */}
          <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-warning-500/45 border-l-4 border-l-risk-medium bg-warning-bg px-5 py-3.5">
            {/* Icon ohne Flaeche, dafuer in voller Groesse (Nutzer-Vorgabe) */}
            <TriangleAlert size={26} strokeWidth={1.9} className="shrink-0 text-risk-medium" />
            <div className="min-w-0 flex-1">
              <p className="text-body-xs font-extrabold text-warning-700">{t('home.alertTitle')}</p>
              <p className="mt-0.5 text-body-xs text-warning-700">{t('home.alertBody')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/${locale}/dashboard/sessions`)}
              className="shrink-0 rounded-lg bg-risk-medium px-3.5 py-2 text-body-2xs font-bold text-white transition-colors hover:bg-risk-on-medium"
            >
              {t('home.alertCta')}
            </button>
          </div>

          {/* KPI-Reihe */}
          <div className="mt-[18px] flex flex-col gap-[18px] lg:flex-row">
            <KpiCard title={t('home.kpiRequests')} big={String(nRequests)} sub={t('home.kpiRequestsSub')} chip={t('home.kpiRequestsChip')}>
              <Donut on={entered} segs={[{ frac: 1 / 3, cls: 'text-fg-accent' }, { frac: 2 / 3, cls: 'text-brand' }]} center={String(nRequests)} />
            </KpiCard>
            <KpiCard title={t('home.kpiDuties')} big={String(nDuties)} sub={t('home.kpiDutiesSub')}>
              <Donut on={entered} segs={[{ frac: 2 / 12, cls: 'text-risk-high' }, { frac: 6 / 12, cls: 'text-risk-medium' }, { frac: 4 / 12, cls: 'text-risk-low' }]} center={String(nDuties)} />
            </KpiCard>
            <KpiCard title={t('home.kpiSessions')} big={String(nSessions)} sub={t('home.kpiSessionsSub')}>
              <SparkBars on={entered} vals={BY_MARKET.map((m) => m.total)} />
            </KpiCard>
            <KpiCard title={t('home.kpiDeadline')} big={t('home.kpiDeadlineValue')} sub={t('home.kpiDeadlineSub')}>
              <Donut on={entered} segs={[{ frac: 0.72, cls: 'text-fg-accent' }]} center={`${nDeadlinePct}%`} />
            </KpiCard>
          </div>

          <div className="mt-[18px] flex flex-col gap-[18px] xl:flex-row">
            {/* Hauptspalte */}
            <div className="flex min-w-0 flex-[1.9] flex-col gap-[18px]">
              {/* Hero: Pflichten je Markt / je Bereich */}
              <div className={CARD + ' p-6'}>
                <SectionHead
                  title={t('home.marketsTitle')} count="12" to="results"
                  extra={
                    <span className="ml-3 inline-flex gap-1.5">
                      <Segment selected={chartView === 'markets'} onClick={() => setChartView('markets')}>{t('home.tabMarkets')}</Segment>
                      <Segment selected={chartView === 'areas'} onClick={() => setChartView('areas')}>{t('home.tabAreas')}</Segment>
                    </span>
                  }
                />
                <div className="flex items-end justify-center gap-7 pb-1 pt-2">
                  {chartData.map((m, i) => (
                    <div key={m.label} className="flex flex-col items-center gap-2">
                      <div className="relative h-[120px] w-[34px] overflow-hidden rounded-lg bg-surface-secondary">
                        {/* Hoehen-Transition: animiert den Eintritt UND den
                            Maerkte/Bereiche-Wechsel gleich mit. */}
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-t-lg bg-brand"
                          style={{ height: entered ? `${(m.total / chartMax) * 120}px` : 0, transition: `height 750ms ${EASE} ${140 + i * 90}ms` }}
                        />
                        <div
                          className="absolute inset-x-0 bottom-0 bg-risk-high"
                          style={{ height: entered && m.high > 0 ? `${(m.high / chartMax) * 120}px` : 0, transition: `height 750ms ${EASE} ${220 + i * 90}ms` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-fg-secondary">{m.label}</span>
                      <span className="text-[10px] text-fg-tertiary">{t('home.dutiesCount', { count: m.total })}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-body-3xs text-fg-tertiary">{t('home.marketsLegend')}</p>
              </div>

              {/* Aktive Anfragen */}
              <div className={CARD + ' p-6 pt-5'}>
                <SectionHead title={t('home.activeRequests')} count={String(REQUESTS.length)} to="dashboard/requests" />
                <div>
                  {REQUESTS.map((r, i) => (
                    <div key={r.company} className={'flex items-center gap-3 py-2.5 ' + (i < REQUESTS.length - 1 ? 'border-b border-stroke-subtle' : '')}>
                      <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${r.tone}`}>{r.initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-xs font-bold text-fg">{r.company}</p>
                        <p className="text-body-4xs text-fg-tertiary">{r.meta}</p>
                      </div>
                      {/* Dieselben theme-festen Pill-Rezepte wie RequestCard —
                          bg-warning-bg blieb im Dark Mode hell und frass den Text. */}
                      <span className={
                        'rounded-full border px-2.5 py-0.5 text-[10px] font-bold ' +
                        (r.status === 'wait'
                          ? 'bg-[#d4af37]/10 border-[#d4af37]/35 text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40'
                          : 'bg-[#004d40]/10 border-[#258d78]/35 text-fg-brand dark:bg-[#004d40]/25 dark:border-[#258d78]/40')
                      }>
                        {tStatus(r.statusLabel)}
                      </span>
                      <button type="button" className="text-body-3xs font-semibold text-brand underline underline-offset-2 transition-colors hover:text-brand-700">
                        {tAction(r.action)}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-body-3xs text-risk-on-medium">{t('home.slaNote')}</p>
              </div>
            </div>

            {/* Rechte Spalte */}
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              {/* Termine */}
              <div className={CARD + ' p-5'}>
                <SectionHead title={t('home.termine')} count={String(APPOINTMENTS.length)} to="dashboard/termine" />
                {APPOINTMENTS.map((a) => (
                  <div key={a.title} className="flex items-center gap-3 border-b border-stroke-subtle py-2.5">
                    <span className="flex h-[34px] w-[34px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-brand-light leading-none text-fg-brand">
                      <span className="text-[9px] font-extrabold">{a.day}</span>
                      <span className="mt-0.5 text-[10.5px] font-extrabold">{a.date}</span>
                    </span>
                    <div>
                      <p className="text-body-2xs font-bold text-fg">{a.title}</p>
                      <p className="text-body-4xs text-fg-tertiary">{a.sub}</p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => navigate(`/${locale}/dashboard/termine`)}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-body-3xs font-semibold text-brand underline underline-offset-2 transition-colors hover:text-brand-700"
                >
                  <CalendarClock size={12} /> {t('home.proposeSlot')}
                </button>
              </div>

              {/* Naechster Schritt */}
              <div className={CARD + ' p-5'}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('home.nextStepEyebrow')}</p>
                <p className="mt-2 text-body-xs font-bold text-fg">{t('home.nextStepTitle')}</p>
                <p className="mt-1 text-body-3xs leading-relaxed text-fg-tertiary">{t('home.nextStepBody')}</p>
                <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => navigate(`/${locale}/dashboard/sessions`)}>
                  {t('home.nextStepCta')}
                </Button>
              </div>

              {/* Weitermachen — als Karte (Nutzer-Optimierung), goldgerahmt */}
              <div className={CARD + ' border-brand-accent/50 bg-brand-accent-light/40 p-5'}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-brand-accent/15 text-fg-accent-strong">
                    <Play size={12} fill="currentColor" />
                  </span>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-accent-strong">{t('home.resumeEyebrow')}</p>
                </div>
                <p className="mt-2.5 text-body-sm font-bold text-fg">VAT registration · Italy</p>
                <p className="mt-0.5 text-body-3xs text-fg-tertiary">{t('home.resumeMeta')}</p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-accent"
                    style={{ width: entered ? '80%' : 0, transition: `width 900ms ${EASE} 250ms` }}
                  />
                </div>
                <Button variant="accent" className="mt-3 w-full" onClick={() => navigate(hasProfile ? `/${locale}/results` : `/${locale}/wizard`)}>
                  {t('home.resume')} <ArrowRight size={14} className="ml-1" />
                </Button>
                <div className="mt-2.5 flex justify-center gap-4">
                  <button type="button" onClick={() => navigate(`/${locale}/results`)} className="text-body-3xs font-semibold text-brand underline underline-offset-2">{t('home.viewResults')}</button>
                  <button type="button" onClick={exportPdf} className="text-body-3xs font-semibold text-brand underline underline-offset-2">{t('home.exportPdf')}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Gespeicherte Sitzungen als Kacheln */}
          <div className="mt-[18px]">
            <SectionHead title={t('home.savedSessions')} count={String(SESSIONS.length)} to="dashboard/sessions" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {SESSIONS.map((s, i) => (
                <Link key={s.title} to={`/${locale}/dashboard/sessions`} className={CARD + ' block p-4 transition-transform hover:-translate-y-0.5'}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{s.eyebrow}</p>
                  <p className="mt-1.5 text-body-xs font-bold text-fg">{s.title}</p>
                  <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className={`h-full rounded-full ${RISK_BG[s.risk]}`}
                      style={{ width: entered ? `${s.frac * 100}%` : 0, transition: `width 800ms ${EASE} ${300 + i * 90}ms` }}
                    />
                  </div>
                  <p className="mt-2 text-body-4xs">
                    <span className={`font-bold ${RISK_TEXT[s.risk]}`}>{s.meta}</span>
                    <span className="text-fg-tertiary"> · {s.upd}</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </UserShell>
  );
}
