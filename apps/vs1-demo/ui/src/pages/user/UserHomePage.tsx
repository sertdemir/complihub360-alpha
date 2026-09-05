import { useEffect, useState, type ReactNode } from 'react';
import { Play, ArrowRight, TriangleAlert, CalendarClock, Compass } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Segment } from '../../components/compliance-areas';
import { Donut, SparkBars, KpiCard, useEntered, useCountUp, EASE } from '../../components/ui/Stats';
import { EmptyState } from '../../components/user/EmptyState';
import { fetchDashboard, EMPTY_DASHBOARD, type DashboardData, type DashboardSession } from '../../api/dashboard';
import { fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { fetchUserBookings, type UserBooking } from '../../api/bookings';

// ─── User Dashboard · Home v3 (Bento) ────────────────────────────────────────
// Canvas "User-Dashboard", Gesamt · V3 auf dem Gradient (Nutzer-Wahl
// 2026-08-29). Das Kachelraster ist unveraendert; was sich am 2026-08-30
// geaendert hat, ist die HERKUNFT der Zahlen.
//
// Bis dahin standen sie fest im Code — 3 Anfragen, 12 Pflichten, 4 Sitzungen,
// zwei Termine im September. Jedes Konto sah dieselbe erfundene Lage, auch ein
// fuenf Minuten altes. Fuer die Design-Phase war das gewollt, fuer echte
// Nutzer ist es eine Falschaussage: wer darauf Rueckmeldung gibt, gibt sie zu
// einer Fiktion, und den Zustand, der ihn wirklich empfaengt — ein leeres
// Dashboard nach der ersten Anmeldung — sieht nie jemand.
//
// Jetzt kommt alles aus drei Aufrufen: /api/v1/dashboard (Sitzungen und
// Pflichten, serverseitig durch die Engine gerechnet), /requests, /bookings.
// Ist nichts da, steht das da — siehe ErsterBesuch weiter unten.
//
// Was bewusst FEHLT: die Kachel "Naechste Frist". Die Kadenzen der Engine sind
// redaktionelle Rhythmen ("jaehrlich", "quartalsweise"), keine Termine. Ein
// Datum daraus zu machen hiesse, eine Faelligkeit zu behaupten, die niemand
// geprueft hat. An ihrer Stelle steht "Hohes Risiko" — eine Zahl, die es gibt.

const RISK_TEXT = { critical: 'text-risk-critical', high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low' } as const;
const RISK_BG = { critical: 'bg-risk-critical', high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low' } as const;
type Sev = keyof typeof RISK_BG;

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

// Die Kleinst-Diagramme und die Eintritts-Animation liegen seit dem
// Sitzungen-Umbau in components/ui/Stats.tsx.

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

// ─── Daten ────────────────────────────────────────────────────────────────────
// Drei Aufrufe parallel, ein Ladezustand. Faellt einer aus, bleibt sein Teil
// leer — das Dashboard zeigt dann weniger, aber nichts Erfundenes.

interface Lage {
  dash: DashboardData;
  requests: UserRequestRow[];
  bookings: UserBooking[];
  loading: boolean;
}

function useLage(): Lage {
  const [dash, setDash] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [requests, setRequests] = useState<UserRequestRow[]>([]);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      const [d, r, b] = await Promise.all([
        fetchDashboard(),
        fetchUserRequests().catch(() => [] as UserRequestRow[]),
        fetchUserBookings().catch(() => [] as UserBooking[]),
      ]);
      if (abgebrochen) return;
      setDash(d);
      setRequests(r);
      setBookings(b);
      setLoading(false);
    })();
    return () => { abgebrochen = true; };
  }, []);

  return { dash, requests, bookings, loading };
}

/** Termine, die noch bevorstehen und nicht abgesagt sind — ein Dashboard zeigt,
 *  was ansteht, nicht was war. */
function kommende(bookings: UserBooking[]): UserBooking[] {
  const jetzt = Date.now();
  return bookings
    .filter((b) => b.status === 'confirmed' && new Date(b.slotStart).getTime() > jetzt)
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
}

/** Der Titel einer Sitzung: die eigene Bezeichnung, sonst Bereiche und Land. */
function sitzungsTitel(s: DashboardSession, domainLabel: (k: string) => string): string {
  if (s.label) return s.label;
  const bereiche = s.categories.map((c) => domainLabel(c)).join(', ');
  return [bereiche, s.country].filter(Boolean).join(' · ') || '—';
}

export function UserHomePage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { t, i18n } = useTranslation('userws');
  const { openWizard } = useWizardDrawer();
  const [chartView, setChartView] = useState<'markets' | 'areas'>('markets');
  const entered = useEntered();
  const { dash, requests, bookings, loading } = useLage();

  const offeneAnfragen = requests.filter((r) => r.bucket !== 'closed');
  // "Wartend" heisst: der Anbieter hat noch nicht bestaetigt. Das Vokabular
  // steht in RequestCard (RequestStatus), nicht hier.
  const wartet = (r: UserRequestRow) => r.status === 'awaiting-confirm';
  const wartend = offeneAnfragen.filter(wartet).length;
  const termine = kommende(bookings);

  const sev = dash.obligations.by_severity;
  const hoch = (sev.critical ?? 0) + (sev.high ?? 0);
  const mittel = sev.medium ?? 0;
  const niedrig = sev.low ?? 0;
  const offen = dash.obligations.open;

  const nRequests = useCountUp(offeneAnfragen.length, entered && !loading);
  const nDuties = useCountUp(offen, entered && !loading);
  const nSessions = useCountUp(dash.sessions.total, entered && !loading);
  const nHigh = useCountUp(hoch, entered && !loading);

  const firstName = (useAuthStore((st) => st.userName) || '').split(/[\s._-]+/)[0];
  const today = new Date().toLocaleDateString(i18n.resolvedLanguage || 'en', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const domainLabel = (key: string) => t(`home.domain.${key}`, { defaultValue: key });

  // Balken: Maerkte oder Bereiche, beides aus denselben offenen Pflichten.
  const quelle = chartView === 'markets'
    ? { total: dash.obligations.by_market, high: dash.obligations.by_market_high, label: (k: string) => k }
    : { total: dash.obligations.by_domain, high: dash.obligations.by_domain_high, label: domainLabel };
  const chartData = Object.entries(quelle.total)
    .map(([key, total]) => ({ key, label: quelle.label(key), total, high: quelle.high[key] ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const chartMax = Math.max(1, ...chartData.map((m) => m.total));

  // Die dringendste Sitzung traegt beide Hinweiskarten — Warnband und
  // "Naechster Schritt". Gibt es keine mit hohem Risiko, bleiben sie weg.
  const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  const dringend = [...dash.sessions.items]
    .filter((s) => s.open > 0)
    .sort((a, b) => (RANG[b.severity ?? 'low'] - RANG[a.severity ?? 'low']) || (b.open - a.open))[0];
  const zuletzt = [...dash.sessions.items]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  const nichts = !loading && dash.sessions.total === 0 && offeneAnfragen.length === 0 && termine.length === 0;

  const kopf = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
          {firstName
            ? <Trans t={t} i18nKey="home.title" values={{ name: firstName }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            : t('home.titleNoName')}
        </h1>
        <p className="mt-1 text-body-2xs text-fg-tertiary">{today}</p>
      </div>
      <Button className="mt-0.5 shrink-0" onClick={() => openWizard()}>{t('shared.startNewSearch')}</Button>
    </div>
  );

  if (loading) {
    return (
      <UserShell>
        <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
          <div className="mx-auto max-w-[1200px]">
            {kopf}
            <p className="mt-8 text-body-xs text-fg-tertiary">{t('home.loading')}</p>
          </div>
        </div>
      </UserShell>
    );
  }

  // ─── Erster Besuch ────────────────────────────────────────────────────────
  // Kein Raster aus Nullen: vier Kacheln mit 0 sehen aus wie ein Defekt und
  // sagen nichts darueber, was als Naechstes zu tun waere.
  if (nichts) {
    return (
      <UserShell>
        <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
          <div className="mx-auto max-w-[1200px]">
            {kopf}
            <EmptyState
              icon={Compass}
              title={t('home.emptyTitle')}
              body={t('home.emptyBody')}
              hint={t('home.emptyHint')}
              cta={{ label: t('home.emptyCta'), onClick: () => openWizard() }}
              steps={[
                { title: t('home.emptyStep1Title'), body: t('home.emptyStep1Body') },
                { title: t('home.emptyStep2Title'), body: t('home.emptyStep2Body') },
                { title: t('home.emptyStep3Title'), body: t('home.emptyStep3Body') },
              ]}
            />
          </div>
        </div>
      </UserShell>
    );
  }

  return (
    <UserShell>
      {/* Der Gradient liegt unter dem ganzen Main-Bereich, die Karten weiss
          darauf — die Shell selbst bleibt unangetastet. */}
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1200px]">
          {kopf}

          {/* Warnband nur, wenn es etwas zu warnen gibt. */}
          {dringend && (dringend.severity === 'high' || dringend.severity === 'critical') && (
            <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-warning-500/45 border-l-4 border-l-risk-medium bg-warning-bg px-5 py-3.5">
              <TriangleAlert size={26} strokeWidth={1.9} className="shrink-0 text-risk-medium" />
              <div className="min-w-0 flex-1">
                <p className="text-body-xs font-extrabold text-warning-700">
                  {t('home.alertTitle', { name: sitzungsTitel(dringend, domainLabel) })}
                </p>
                <p className="mt-0.5 text-body-xs text-warning-700">
                  {t('home.alertBody', { count: dringend.open })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/${locale}/dashboard/sessions`)}
                className="shrink-0 rounded-lg bg-risk-medium px-3.5 py-2 text-body-2xs font-bold text-white transition-colors hover:bg-risk-on-medium"
              >
                {t('home.alertCta')}
              </button>
            </div>
          )}

          {/* KPI-Reihe */}
          <div className="mt-[18px] flex flex-col gap-[18px] lg:flex-row">
            <KpiCard
              title={t('home.kpiRequests')} big={String(nRequests)}
              sub={t('home.kpiRequestsSub', { waiting: wartend, active: offeneAnfragen.length - wartend })}
              chip={wartend > 0 ? t('home.kpiRequestsChip', { count: wartend }) : undefined}
            >
              <Donut
                on={entered}
                segs={offeneAnfragen.length
                  ? [{ frac: wartend / offeneAnfragen.length, cls: 'text-fg-accent' },
                     { frac: (offeneAnfragen.length - wartend) / offeneAnfragen.length, cls: 'text-brand' }]
                  : []}
                center={String(nRequests)}
              />
            </KpiCard>
            <KpiCard title={t('home.kpiDuties')} big={String(nDuties)} sub={t('home.kpiDutiesSub', { count: dash.sessions.total })}>
              <Donut
                on={entered}
                segs={offen
                  ? [{ frac: hoch / offen, cls: 'text-risk-high' },
                     { frac: mittel / offen, cls: 'text-risk-medium' },
                     { frac: niedrig / offen, cls: 'text-risk-low' }]
                  : []}
                center={String(nDuties)}
              />
            </KpiCard>
            <KpiCard title={t('home.kpiSessions')} big={String(nSessions)} sub={t('home.kpiSessionsSub', { count: chartData.length })}>
              <SparkBars on={entered} vals={chartData.length ? chartData.map((m) => m.total) : [0]} />
            </KpiCard>
            <KpiCard title={t('home.kpiRisk')} big={String(nHigh)} sub={t('home.kpiRiskSub', { count: offen })}>
              <Donut on={entered} segs={offen ? [{ frac: hoch / offen, cls: 'text-risk-high' }] : []} center={String(nHigh)} />
            </KpiCard>
          </div>

          <div className="mt-[18px] flex flex-col gap-[18px] xl:flex-row">
            {/* Hauptspalte */}
            <div className="flex min-w-0 flex-[1.9] flex-col gap-[18px]">
              {/* Hero: Pflichten je Markt / je Bereich */}
              <div className={CARD + ' p-6'}>
                <SectionHead
                  title={t('home.marketsTitle')} count={String(offen)} to="dashboard/sessions"
                  extra={
                    <span className="ml-3 inline-flex gap-1.5">
                      <Segment selected={chartView === 'markets'} onClick={() => setChartView('markets')}>{t('home.tabMarkets')}</Segment>
                      <Segment selected={chartView === 'areas'} onClick={() => setChartView('areas')}>{t('home.tabAreas')}</Segment>
                    </span>
                  }
                />
                {chartData.length ? (
                  <>
                    <div className="flex items-end justify-center gap-7 pb-1 pt-2">
                      {chartData.map((m, i) => (
                        <div key={m.key} className="flex flex-col items-center gap-2">
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
                  </>
                ) : (
                  <p className="py-10 text-center text-body-xs text-fg-tertiary">{t('home.noDuties')}</p>
                )}
              </div>

              {/* Aktive Anfragen */}
              <div className={CARD + ' p-6 pt-5'}>
                <SectionHead title={t('home.activeRequests')} count={String(offeneAnfragen.length)} to="dashboard/termine?tab=anfragen" />
                {offeneAnfragen.length ? (
                  <div>
                    {offeneAnfragen.slice(0, 3).map((r, i, arr) => (
                      <div key={r.uuid} className={'flex items-center gap-3 py-2.5 ' + (i < arr.length - 1 ? 'border-b border-stroke-subtle' : '')}>
                        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-brand text-[10px] font-extrabold text-fg-on-brand">
                          {r.company.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-xs font-bold text-fg">{r.company}</p>
                          <p className="truncate text-body-4xs text-fg-tertiary">{r.meta}</p>
                        </div>
                        {/* Dieselben theme-festen Pill-Rezepte wie RequestCard —
                            bg-warning-bg blieb im Dark Mode hell und frass den Text. */}
                        <span className={
                          'shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ' +
                          (wartet(r)
                            ? 'bg-[#d4af37]/10 border-[#d4af37]/35 text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40'
                            : 'bg-[#004d40]/10 border-[#258d78]/35 text-fg-brand dark:bg-[#004d40]/25 dark:border-[#258d78]/40')
                        }>
                          {r.statusLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/${locale}/dashboard/termine?tab=anfragen`)}
                          className="shrink-0 text-body-3xs font-semibold text-brand underline underline-offset-2 transition-colors hover:text-brand-700"
                        >
                          {t('shared.seeAll')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-body-xs text-fg-tertiary">{t('home.noRequests')}</p>
                )}
              </div>
            </div>

            {/* Rechte Spalte */}
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              {/* Termine */}
              <div className={CARD + ' p-5'}>
                <SectionHead title={t('home.termine')} count={String(termine.length)} to="dashboard/termine" />
                {termine.slice(0, 3).map((a) => {
                  const d = new Date(a.slotStart);
                  return (
                    <div key={a.id} className="flex items-center gap-3 border-b border-stroke-subtle py-2.5">
                      <span className="flex h-[34px] w-[34px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-brand-light leading-none text-fg-brand">
                        <span className="text-[9px] font-extrabold">
                          {d.toLocaleDateString(i18n.resolvedLanguage || 'en', { weekday: 'short' })}
                        </span>
                        <span className="mt-0.5 text-[10.5px] font-extrabold">
                          {String(d.getDate()).padStart(2, '0')}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-body-2xs font-bold text-fg">
                          {d.toLocaleTimeString(i18n.resolvedLanguage || 'en', { hour: '2-digit', minute: '2-digit' })} · {a.providerName}
                        </p>
                        {a.providerRegion && <p className="truncate text-body-4xs text-fg-tertiary">{a.providerRegion}</p>}
                      </div>
                    </div>
                  );
                })}
                {!termine.length && <p className="py-4 text-center text-body-2xs text-fg-tertiary">{t('home.noTermine')}</p>}
                <button
                  type="button"
                  onClick={() => navigate(`/${locale}/dashboard/termine`)}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-body-3xs font-semibold text-brand underline underline-offset-2 transition-colors hover:text-brand-700"
                >
                  <CalendarClock size={12} /> {t('home.proposeSlot')}
                </button>
              </div>

              {/* Naechster Schritt — nur wenn es einen gibt. */}
              {dringend && (
                <div className={CARD + ' p-5'}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('home.nextStepEyebrow')}</p>
                  <p className="mt-2 text-body-xs font-bold text-fg">{sitzungsTitel(dringend, domainLabel)}</p>
                  <p className="mt-1 text-body-3xs leading-relaxed text-fg-tertiary">
                    {t('home.nextStepBody', { open: dringend.open, total: dringend.total })}
                  </p>
                  <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => navigate(`/${locale}/dashboard/sessions`)}>
                    {t('home.nextStepCta')}
                  </Button>
                </div>
              )}

              {/* Weitermachen — goldgerahmt, an der zuletzt bearbeiteten Sitzung. */}
              {zuletzt && (
                <div className={CARD + ' border-brand-accent/50 bg-brand-accent-light/40 p-5'}>
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-brand-accent/15 text-fg-accent-strong">
                      <Play size={12} fill="currentColor" />
                    </span>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-accent-strong">{t('home.resumeEyebrow')}</p>
                  </div>
                  <p className="mt-2.5 text-body-sm font-bold text-fg">{sitzungsTitel(zuletzt, domainLabel)}</p>
                  <p className="mt-0.5 text-body-3xs text-fg-tertiary">
                    {t('home.resumeMeta', { open: zuletzt.open, total: zuletzt.total })}
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-accent"
                      style={{
                        width: entered && zuletzt.total ? `${((zuletzt.total - zuletzt.open) / zuletzt.total) * 100}%` : 0,
                        transition: `width 900ms ${EASE} 250ms`,
                      }}
                    />
                  </div>
                  <Button variant="accent" className="mt-3 w-full" onClick={() => navigate(`/${locale}/dashboard/sessions`)}>
                    {t('home.resume')} <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Gespeicherte Sitzungen als Kacheln */}
          {dash.sessions.items.length > 0 && (
            <div className="mt-[18px]">
              <SectionHead title={t('home.savedSessions')} count={String(dash.sessions.total)} to="dashboard/sessions" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dash.sessions.items.slice(0, 4).map((s, i) => {
                  const risiko = (s.severity ?? 'low') as Sev;
                  const frac = s.total ? (s.total - s.open) / s.total : 0;
                  return (
                    <Link key={s.id} to={`/${locale}/dashboard/sessions`} className={CARD + ' block p-4 transition-transform hover:-translate-y-0.5'}>
                      <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">
                        {[s.categories.map(domainLabel).join(', '), s.country].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-1.5 truncate text-body-xs font-bold text-fg">{sitzungsTitel(s, domainLabel)}</p>
                      <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-surface-secondary">
                        <div
                          className={`h-full rounded-full ${RISK_BG[risiko]}`}
                          style={{ width: entered ? `${frac * 100}%` : 0, transition: `width 800ms ${EASE} ${300 + i * 90}ms` }}
                        />
                      </div>
                      <p className="mt-2 text-body-4xs">
                        <span className={`font-bold ${RISK_TEXT[risiko]}`}>{t('home.sessionOpen', { count: s.open })}</span>
                        <span className="text-fg-tertiary"> · {t('home.sessionOf', { count: s.total })}</span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </UserShell>
  );
}
