import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Play, ArrowRight, CalendarPlus, Compass } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Segment } from '../../components/compliance-areas';
import { Donut, useEntered, useCountUp, EASE } from '../../components/ui/Stats';
import { EmptyState } from '../../components/user/EmptyState';
import { RescheduleDrawer, type RescheduleTarget } from '../../components/user/RescheduleDrawer';
import { fetchDashboard, EMPTY_DASHBOARD, type DashboardData, type DashboardSession } from '../../api/dashboard';
import { fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { fetchUserBookings, type UserBooking } from '../../api/bookings';
import { SLUG_TO_I18N, STATUS_KEY, relZeit } from './AnfragenTab';
import { ladeIcs } from './TerminePage';

// ─── User Dashboard · Home v4 ────────────────────────────────────────────────
// Canvas "Dashboard · Arbeitsbereich", Nutzer-Wahl 2026-09-05:
//   1B  Kopf mit LAGE-SATZ statt Datum und Warnband: "Heute: 1 Anfrage wartet
//       auf Sie · 1 Ergebnisfrage offen · 15 Pflichten mit hohem Risiko".
//   2A' Vier Kennzahlen OHNE Karte auf dem Gradient: Text links (Titel,
//       Unterzeile, Chip), Kreis rechts, doppelt so gross, die Zahl steht NUR
//       im Kreis (Nutzer-Vorgabe).
//   3B  Offene Pflichten als Balken quer, sortiert, Zahl und Hoch-Anteil rechts.
//   4B  Anfragen als Posteingangs-Zeilen — dasselbe Vokabular wie die
//       Termine-Seite: lokalisierte Pille, Bereich · Markt, "Frist · Anbieter",
//       eine Aktion je Zeile, EIN "Alle anzeigen" im Kopf.
//   5B  Rechts zwei Karten: Termine mit Datumsmarke und echten Aktionen (In
//       den Kalender, Verschieben), "Da weitermachen" mit Fortsetzen. Der
//       "Naechste Schritt" und "Termin vorschlagen" (ohne Funktion) entfallen.
//   6B  Sitzungen als Kacheln mit Risiko-Tag, Bereichs-/Land-Chips, Balken
//       und "Oeffnen"-Link direkt auf die Sitzung.
//
// Die Zahlen kommen weiterhin aus drei Aufrufen: /api/v1/dashboard (Sitzungen
// und Pflichten, serverseitig durch die Engine gerechnet), /requests,
// /bookings. Ist nichts da, steht das da — siehe ErsterBesuch weiter unten.
// Was bewusst FEHLT: eine Kachel "Naechste Frist" — die Kadenzen der Engine
// sind redaktionelle Rhythmen, keine Termine.

const RISK_TEXT = { critical: 'text-risk-critical', high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low' } as const;
const RISK_BG = { critical: 'bg-risk-critical', high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low' } as const;
// Theme-feste Rezepte wie die Aufgaben-Chips der Sitzungsseite: Token-
// Opazitaet frisst im Dark Mode den Text.
const RISK_TAG = {
  critical: 'bg-[#FEE2E2] border-[rgba(143,49,16,.30)] text-[#8F3110] dark:bg-[#8F3110]/25 dark:text-[#F1A88C]',
  high: 'bg-[#FEE2E2] border-[rgba(143,49,16,.30)] text-[#8F3110] dark:bg-[#8F3110]/25 dark:text-[#F1A88C]',
  medium: 'bg-[#FEF3C7] border-[rgba(161,98,7,.35)] text-[#713F12] dark:bg-[#A16207]/25 dark:text-[#F0C86A]',
  low: 'bg-[#E7F3EE] border-[rgba(21,128,61,.35)] text-[#14532D] dark:bg-[#15803D]/20 dark:text-[#8FD3AE]',
} as const;
type Sev = keyof typeof RISK_BG;

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';
const TEXT_LINK = 'text-body-2xs font-bold text-brand underline underline-offset-[3px] transition-colors hover:text-brand-700';

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

/** Termine, die noch bevorstehen und nicht abgesagt sind. */
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

/** Datums-Blockmarke (5B) — Tag gross, Monat klein, wie auf der Termine-Seite. */
function DatumsMarke({ iso, locale }: { iso: string; locale: string }) {
  const d = new Date(iso);
  return (
    <div aria-hidden="true" className="grid h-11 w-11 shrink-0 place-content-center rounded-lg border border-stroke-brand/40 bg-brand-light text-center leading-[1.1] text-fg-brand">
      <span className="text-[16px] font-bold">{d.getDate()}</span>
      <span className="text-[8.5px] font-bold uppercase tracking-[0.08em]">{d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</span>
    </div>
  );
}

// ─── Kennzahl ohne Karte (2A nach Nutzer-Vorgabe) ────────────────────────────
// Text links, Kreis rechts, beides auf dem Gradient. Die Zahl steht nur im
// Kreis; die Unterzeile traegt die Zusammensetzung.
const KPI_SIZE = 96;
const KPI_STROKE = 12;

function Kennzahl({ title, sub, chip, value, segs, on }: {
  title: string; sub: string; chip?: string; value: number; segs: { frac: number; cls: string }[]; on: boolean;
}) {
  const n = useCountUp(value, on);
  return (
    <div className="flex flex-1 items-center justify-between gap-4 py-1">
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{title}</p>
        <p className="mt-1.5 text-body-2xs leading-snug text-fg-secondary">{sub}</p>
        {chip && (
          <span className="mt-2 inline-flex rounded-full bg-accent/15 px-2 py-[2px] text-[10px] font-bold text-fg-accent-strong">{chip}</span>
        )}
      </div>
      <div className="shrink-0 font-serif">
        <Donut on={on} size={KPI_SIZE} stroke={KPI_STROKE} segs={segs} center={String(n)} centerSize={30} />
      </div>
    </div>
  );
}

export function UserHomePage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { t, i18n } = useTranslation('userws');
  const { openWizard } = useWizardDrawer();
  const [chartView, setChartView] = useState<'markets' | 'areas'>('markets');
  const [rescheduleFor, setRescheduleFor] = useState<RescheduleTarget | null>(null);
  const [moved, setMoved] = useState<Record<string, string>>({});
  const entered = useEntered();
  const { dash, requests, bookings, loading } = useLage();
  const jetzt = Date.now();

  // Anfragen: "wartet auf Sie" = Antwort liegt vor, Frist verpasst (auch nach
  // Bestaetigung — Matrix-Befund 4) oder abgelaufen; "wartet" auf der Kachel =
  // der Anbieter hat noch nicht bestaetigt.
  const effective = requests.map((r) =>
    r.bucket === 'confirmed' && r.slaDeadline && new Date(r.slaDeadline).getTime() <= jetzt ? { ...r, bucket: 'overdue' as const } : r,
  );
  const offeneAnfragen = effective.filter((r) => r.bucket !== 'closed');
  const aufSie = offeneAnfragen.filter((r) => r.bucket === 'replied' || r.bucket === 'overdue');
  const wartend = offeneAnfragen.filter((r) => r.status === 'awaiting-confirm' && r.bucket === 'confirm').length;

  // Termine: kommend (ggf. verschoben) und offene Ergebnisfragen.
  const termine = kommende(bookings.map((b) => (moved[b.id] ? { ...b, slotStart: moved[b.id] } : b)));
  const ergebnisfragen = bookings.filter((b) => b.status === 'confirmed' && new Date(b.slotStart).getTime() < jetzt).length;

  const sev = dash.obligations.by_severity;
  const hoch = (sev.critical ?? 0) + (sev.high ?? 0);
  const mittel = sev.medium ?? 0;
  const niedrig = sev.low ?? 0;
  const offen = dash.obligations.open;

  const firstName = (useAuthStore((st) => st.userName) || '').split(/[\s._-]+/)[0];
  const domainLabel = (key: string) => t(`home.domain.${key}`, { defaultValue: key });
  const bereich = (slug?: string) => (slug && SLUG_TO_I18N[slug] ? t(`domain.${SLUG_TO_I18N[slug]}`) : slug ?? '');
  const regionName = useMemo(() => { try { return new Intl.DisplayNames([locale], { type: 'region' }); } catch { return null; } }, [locale]);
  const markt = (code?: string) => { try { return code ? (regionName?.of(code.toUpperCase()) ?? code) : ''; } catch { return code ?? ''; } };

  // Balken: Maerkte oder Bereiche, beides aus denselben offenen Pflichten.
  const quelle = chartView === 'markets'
    ? { total: dash.obligations.by_market, high: dash.obligations.by_market_high, label: (k: string) => k }
    : { total: dash.obligations.by_domain, high: dash.obligations.by_domain_high, label: domainLabel };
  const chartData = Object.entries(quelle.total)
    .map(([key, total]) => ({ key, label: quelle.label(key), total, high: quelle.high[key] ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const chartMax = Math.max(1, ...chartData.map((m) => m.total));
  const marktAnteile = Object.values(dash.obligations.by_market);
  const marktSumme = Math.max(1, marktAnteile.reduce((a, b) => a + b, 0));
  const MARKT_CLS = ['text-brand', 'text-fg-accent', 'text-risk-low', 'text-brand/60', 'text-fg-accent/60', 'text-risk-low/60'];

  const zuletzt = [...dash.sessions.items].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const nichts = !loading && dash.sessions.total === 0 && offeneAnfragen.length === 0 && termine.length === 0;

  // 1B: der Lage-Satz — nur Teile, die es gibt; sonst der ruhige Satz.
  const lageTeile: ReactNode[] = [];
  if (aufSie.length) lageTeile.push(<strong key="a" className="text-fg">{t('home.todayRequests', { count: aufSie.length })}</strong>);
  if (ergebnisfragen) lageTeile.push(<span key="e">{t('home.todayOutcomes', { count: ergebnisfragen })}</span>);
  if (hoch) lageTeile.push(<strong key="r" className="text-[#8A3B3B] dark:text-[#F1A88C]">{t('home.todayRisk', { count: hoch })}</strong>);

  const kopf = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
          {firstName
            ? <Trans t={t} i18nKey="home.title" values={{ name: firstName }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            : t('home.titleNoName')}
        </h1>
        {!loading && (
          <p className="mt-1.5 text-body-sm text-fg-secondary">
            {lageTeile.length ? (
              <>
                {t('home.todayPrefix')}{' '}
                {lageTeile.map((teil, i) => (
                  <span key={i}>{i > 0 && <span className="text-fg-tertiary"> · </span>}{teil}</span>
                ))}
              </>
            ) : t('home.todayCalm')}
          </p>
        )}
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

  const oeffneSitzung = (id: string) => navigate(`/${locale}/results?session=${id}`);
  const oeffneVerlauf = (uuid: string) => navigate(`/${locale}/dashboard/termine?thread=${uuid}`);

  // 4B: die laufende Frist als Restzeit + Balken (Vokabular der Termine-Seite).
  const frist = (r: UserRequestRow) => {
    if (r.bucket === 'overdue') return { label: t('requests.slaMissed'), tone: 'err' as const, pct: 0 };
    if (!r.slaDeadline) return null;
    const left = new Date(r.slaDeadline).getTime() - jetzt;
    if (left <= 0) return { label: t('requests.slaMissed'), tone: 'err' as const, pct: 0 };
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    return {
      label: h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`,
      tone: left <= 4 * 3_600_000 ? ('warn' as const) : ('ok' as const),
      pct: Math.max(3, Math.min(100, Math.round((left / (r.slaWindowMs ?? 24 * 3_600_000)) * 100))),
    };
  };
  const FRIST_TONE = { ok: 'text-fg-brand', warn: 'text-fg-accent-strong', err: 'text-[#8A3B3B]' };
  const BALKEN_TONE = { ok: 'bg-brand', warn: 'bg-[#d4af37]', err: 'bg-[#B55353]' };
  const PILL: Record<string, string> = {
    'awaiting-confirm': 'bg-[#d4af37]/10 border-[#d4af37]/35 text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40',
    'awaiting-reply': 'bg-surface-secondary border-stroke text-fg-secondary',
    active: 'bg-[#004d40]/10 border-[#258d78]/35 text-fg-brand dark:bg-[#004d40]/25 dark:border-[#258d78]/40',
    closed: 'bg-surface-secondary border-stroke text-fg-tertiary',
  };
  const anfragenZeilen = [...aufSie, ...offeneAnfragen.filter((r) => !aufSie.includes(r))].slice(0, 3);

  // 5B: "Heute · 09:00" / "Morgen · 09:00" / "Mo., 8. Sep. · 09:00".
  const wann = (iso: string) => {
    const d = new Date(iso);
    const tage = Math.floor((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
    const tag = tage <= 0 ? t('home.today') : tage === 1 ? t('home.tomorrow')
      : d.toLocaleDateString(i18n.resolvedLanguage || 'en', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${tag} · ${d.toLocaleTimeString(i18n.resolvedLanguage || 'en', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <UserShell>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1200px]">
          {kopf}

          {/* Kennzahlen ohne Karte, auf dem Gradient (2A nach Vorgabe) */}
          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            <Kennzahl
              on={entered}
              title={t('home.kpiRequests')}
              value={offeneAnfragen.length}
              sub={t('home.kpiRequestsSub', { waiting: wartend, active: offeneAnfragen.length - wartend })}
              chip={wartend > 0 ? t('home.kpiRequestsChip', { count: wartend }) : undefined}
              segs={offeneAnfragen.length
                ? [{ frac: wartend / offeneAnfragen.length, cls: 'text-fg-accent' },
                   { frac: (offeneAnfragen.length - wartend) / offeneAnfragen.length, cls: 'text-brand' }]
                : []}
            />
            <Kennzahl
              on={entered}
              title={t('home.kpiDuties')}
              value={offen}
              sub={t('home.kpiDutiesSub', { count: dash.sessions.total })}
              segs={offen
                ? [{ frac: hoch / offen, cls: 'text-risk-high' },
                   { frac: mittel / offen, cls: 'text-risk-medium' },
                   { frac: niedrig / offen, cls: 'text-risk-low' }]
                : []}
            />
            <Kennzahl
              on={entered}
              title={t('home.kpiSessions')}
              value={dash.sessions.total}
              sub={t('home.kpiSessionsSub', { count: marktAnteile.length })}
              segs={marktAnteile.map((n, i) => ({ frac: n / marktSumme, cls: MARKT_CLS[i % MARKT_CLS.length] }))}
            />
            <Kennzahl
              on={entered}
              title={t('home.kpiRisk')}
              value={hoch}
              sub={t('home.kpiRiskSub', { count: offen })}
              segs={offen ? [{ frac: hoch / offen, cls: 'text-risk-high' }] : []}
            />
          </div>

          <div className="mt-7 flex flex-col gap-[18px] xl:flex-row">
            {/* Hauptspalte */}
            <div className="flex min-w-0 flex-[1.9] flex-col gap-[18px]">
              {/* 3B: Offene Pflichten als Balken quer */}
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
                  <div>
                    {chartData.map((m, i) => (
                      <div key={m.key} className="grid grid-cols-[minmax(40px,auto)_1fr_150px] items-center gap-3.5 py-[9px]">
                        <span className="truncate text-body-xs font-extrabold text-fg">{m.label}</span>
                        <div className="relative h-3 overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand"
                            style={{ width: entered ? `${(m.total / chartMax) * 100}%` : 0, transition: `width 750ms ${EASE} ${140 + i * 90}ms` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-risk-high"
                            style={{ width: entered && m.high > 0 ? `${(m.high / chartMax) * 100}%` : 0, transition: `width 750ms ${EASE} ${220 + i * 90}ms` }}
                          />
                        </div>
                        <span className="text-right text-body-2xs text-fg-secondary">
                          <b className="text-fg">{t('home.dutiesCount', { count: m.total })}</b>
                          {m.high > 0 && <> · <span className="text-risk-high">{t('home.dutiesHigh', { count: m.high })}</span></>}
                        </span>
                      </div>
                    ))}
                    <p className="mt-2 text-body-3xs text-fg-tertiary">{t('home.marketsLegend')}</p>
                  </div>
                ) : (
                  <p className="py-10 text-center text-body-xs text-fg-tertiary">{t('home.noDuties')}</p>
                )}
              </div>

              {/* 4B: Anfragen als Posteingangs-Zeilen */}
              <div className={CARD + ' px-6 py-5'}>
                <SectionHead title={t('home.activeRequests')} count={String(offeneAnfragen.length)} to="dashboard/termine?tab=anfragen" />
                {anfragenZeilen.length ? (
                  <div>
                    {anfragenZeilen.map((r, i, arr) => {
                      const f = frist(r);
                      const pille = r.statusLabel ? t(`status.${STATUS_KEY[r.statusLabel] ?? ''}`, r.statusLabel) : r.statusLabel;
                      return (
                        <div key={r.uuid} className={'flex items-center gap-4 py-3 ' + (i < arr.length - 1 ? 'border-b border-stroke-subtle' : '')}>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-xs font-bold text-fg">
                              <span className="truncate">{r.company}</span>
                              <span className={'inline-flex whitespace-nowrap rounded-full border px-2.5 py-[2px] text-[10px] font-bold ' + (PILL[r.status] ?? PILL.closed)}>{pille}</span>
                            </p>
                            <p className="mt-0.5 truncate text-[10.5px] text-fg-tertiary">
                              {[bereich(r.category), markt(r.country), relZeit(r.createdAt, locale)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="hidden w-[120px] shrink-0 sm:block">
                            {f && (
                              <>
                                <p className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary">{t('requests.slaLabelProvider')}</p>
                                <p className={'text-[13px] font-medium ' + FRIST_TONE[f.tone]}>{f.label}</p>
                                <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-surface-tertiary">
                                  <span className={'block h-full rounded-full ' + BALKEN_TONE[f.tone]} style={{ width: `${f.pct}%` }} />
                                </span>
                              </>
                            )}
                          </div>
                          <Button size="sm" variant={r.bucket === 'replied' ? 'primary' : 'secondary'} className="shrink-0" onClick={() => oeffneVerlauf(r.uuid)}>
                            {r.bucket === 'replied' ? t('requests.actionRead') : t('requests.actionOpen')}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-center text-body-xs text-fg-tertiary">{t('home.noRequests')}</p>
                )}
              </div>
            </div>

            {/* Rechte Spalte (5B) */}
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              <div className={CARD + ' p-5'}>
                <SectionHead title={t('home.termine')} count={String(termine.length)} to="dashboard/termine" />
                {termine.slice(0, 2).map((a, i) => {
                  const provider = a.providerName + (a.providerRegion ? ` — ${a.providerRegion}` : '');
                  return (
                    <div key={a.id} className={i > 0 ? 'mt-3 border-t border-stroke-subtle pt-3' : ''}>
                      <div className="flex items-center gap-3 py-1">
                        <DatumsMarke iso={a.slotStart} locale={i18n.resolvedLanguage || 'en'} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-fg-brand/70">{wann(a.slotStart)}</p>
                          <p className="mt-0.5 truncate text-body-xs font-bold text-fg">{a.providerName}</p>
                          <p className="truncate text-[10px] text-fg-tertiary">{[a.providerRegion, 'Video-Call'].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        <Button size="sm" variant="outline" iconLeft={<CalendarPlus size={14} />}
                          onClick={() => ladeIcs({ id: a.id, slotStartIso: a.slotStart, slotEndIso: a.slotEnd, provider, meta: a.message || '—' })}>
                          {t('termine.addToCalendar')}
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => setRescheduleFor({
                            bookingId: a.id, providerKey: a.providerKey, providerName: provider,
                            currentLine: wann(a.slotStart),
                          })}>
                          {t('termine.reschedule')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!termine.length && <p className="py-4 text-center text-body-2xs text-fg-tertiary">{t('home.noTermine')}</p>}
              </div>

              {/* Da weitermachen — goldgerahmt, an der zuletzt bearbeiteten Sitzung. */}
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
                  <Button variant="primary" className="mt-3" onClick={() => oeffneSitzung(zuletzt.id)}>
                    {t('home.resume')} <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 6B: Gespeicherte Sitzungen als Kacheln mit Risiko-Tag und Chips */}
          {dash.sessions.items.length > 0 && (
            <div className="mt-[18px]">
              <SectionHead title={t('home.savedSessions')} count={String(dash.sessions.total)} to="dashboard/sessions" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dash.sessions.items.slice(0, 3).map((s, i) => {
                  const risiko = (s.severity ?? 'low') as Sev;
                  const frac = s.total ? (s.total - s.open) / s.total : 0;
                  return (
                    <div key={s.id} className={CARD + ' flex flex-col gap-2.5 p-4'}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-body-xs font-bold text-fg">{sitzungsTitel(s, domainLabel)}</p>
                        <span className={'inline-flex shrink-0 whitespace-nowrap rounded border px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] ' + RISK_TAG[risiko]}>
                          {t(`home.riskTag.${risiko}`)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.categories.map((c) => (
                          <span key={c} className="rounded-full bg-surface-secondary px-2 py-[2px] text-[9.5px] font-semibold text-fg-secondary">{domainLabel(c)}</span>
                        ))}
                        {s.country && <span className="rounded-full border border-stroke px-2 py-[2px] text-[9.5px] font-bold text-fg">{s.country}</span>}
                      </div>
                      <div>
                        <div className="h-[5px] overflow-hidden rounded-full bg-surface-secondary">
                          <div
                            className={`h-full rounded-full ${RISK_BG[risiko]}`}
                            style={{ width: entered ? `${frac * 100}%` : 0, transition: `width 800ms ${EASE} ${300 + i * 90}ms` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] text-fg-tertiary">
                          <b className={RISK_TEXT[risiko]}>{t('home.sessionOpen', { count: s.open })}</b>
                          {' · '}{t('home.sessionOf', { count: s.total })}
                          {' · '}{relZeit(s.updated_at, locale)}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => oeffneSitzung(s.id)} className={TEXT_LINK}>{t('shared.open')}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <RescheduleDrawer target={rescheduleFor} onClose={() => setRescheduleFor(null)} onRescheduled={(id, iso) => setMoved((m) => ({ ...m, [id]: iso }))} />
    </UserShell>
  );
}
