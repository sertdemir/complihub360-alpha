import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarPlus, Compass } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Segment } from '../../components/compliance-areas';
import { UnitGrid, unitsPer, useCountUp, useEntered, EASE } from '../../components/ui/Stats';
import { EmptyState } from '../../components/user/EmptyState';
import { fetchDashboard, EMPTY_DASHBOARD, type DashboardData, type DashboardSession } from '../../api/dashboard';
import { anonProviderLabel, fetchUserRequests, type UserRequestRow } from '../../api/requests';
import { fetchUserBookings, markOutcome, type UserBooking } from '../../api/bookings';
import { SLUG_TO_I18N, relZeit } from './AnfragenTab';
import { useRequestContext } from '../../lib/requestContext';
import { ladeIcs } from './TerminePage';
import { DateMark } from '../../components/ui/DateMark';

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
//   5B  Rechts die Termine. "Da weitermachen" ist seit 2026-09-27 gestrichen:
//       es zeigte nur die zuletzt geaenderte Sitzung, die als erste Kachel
//       unter "Gespeicherte Sitzungen" ohnehin steht.
//       Termine seit Canvas T2 (2026-09-27): oben, was eine Antwort braucht
//       (vergangene Termine ohne Ergebnis), darunter "Als Naechstes" kompakt
//       mit Thema aus der Anfrage beim selben Anbieter.
//   6B  Sitzungen seit Canvas S3/S2 (2026-09-27) in der Hauptspalte unter den
//       Anfragen: ab md eine Liste, mobil wischbare Karten. Jede Pflicht ein
//       Kaestchen (offen nach Risiko, erledigt hell), alle Maerkte, die ganze
//       Zeile bzw. Karte klickbar, zuletzt bearbeitet zuerst. Die
//       Sitzungen-Seite behaelt vorerst ihre SessionTile.
//
// Die Zahlen kommen weiterhin aus drei Aufrufen: /api/v1/dashboard (Sitzungen
// und Pflichten, serverseitig durch die Engine gerechnet), /requests,
// /bookings. Ist nichts da, steht das da — siehe ErsterBesuch weiter unten.
// Was bewusst FEHLT: eine Kachel "Naechste Frist" — die Kadenzen der Engine
// sind redaktionelle Rhythmen, keine Termine.

const REST_CLS = 'bg-unit-rest';
const DONE_CLS = 'bg-unit-done ring-1 ring-inset ring-unit-done-line';
const SESS_GRID = 'grid grid-cols-[minmax(0,1.5fr)_104px_minmax(172px,1.3fr)_92px_auto] items-center gap-4';
const MARKT_CHIP = 'rounded-full border border-stroke px-[7px] py-[1px] text-[10.5px] font-bold text-fg';
const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';

/** Hochzaehlende Zahl (Z2) — dieselbe Kurve wie die Ringe vorher. */
function CountUp({ value, on, className }: { value: number; on: boolean; className?: string }) {
  const n = useCountUp(value, on);
  return <span className={className} aria-label={String(value)}>{n}</span>;
}

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


export function UserHomePage() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { t, i18n } = useTranslation('userws');
  const { openWizard } = useWizardDrawer();
  const [chartView, setChartView] = useState<'markets' | 'areas'>('markets');
  const [outcomes, setOutcomes] = useState<Record<string, 'completed' | 'no_show'>>({});
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

  // Termine (T2): kommende, und davor die vergangenen ohne Ergebnis — dieselbe
  // Regel wie "Braucht Ihre Antwort" auf der Termine-Seite. Beide zaehlen, so
  // steht auf der Karte dieselbe Zahl wie in der Seitenleiste.
  const termine = kommende(bookings);
  const ohneErgebnis = bookings
    .filter((b) => b.status === 'confirmed' && !outcomes[b.id] && new Date(b.slotStart).getTime() <= jetzt)
    .sort((a, b) => b.slotStart.localeCompare(a.slotStart));
  const ergebnis = (id: string, status: 'completed' | 'no_show') => {
    setOutcomes((o) => ({ ...o, [id]: status }));
    markOutcome(id, status).catch(() => {});
  };

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
  // Thema eines Termins (Phase 3): die Beschreibung, unter der der Anbieter
  // vor der Buchung stand (Bereiche · Region). Bis zum 27.09. kam das Thema
  // ueber den Anbieter-Schluessel aus den Anfragen — den traegt eine Buchung
  // nicht mehr (ADR-0004); die Beschreibung sagt dasselbe direkt.
  // 3 V3: uebersetzt aus den Bereichscodes, nicht die englische Server-Zeile.
  const { beschreibung } = useRequestContext();
  const themaVon = (b: { providerAreaCodes: string[]; providerRegion: string | null; providerDescriptor: string }) =>
    beschreibung({ areaCodes: b.providerAreaCodes, region: b.providerRegion, fallback: b.providerDescriptor });

  // Balken: Maerkte oder Bereiche, beides aus denselben offenen Pflichten.
  const quelle = chartView === 'markets'
    ? { total: dash.obligations.by_market, high: dash.obligations.by_market_high, label: (k: string) => k, to: () => 'dashboard/sessions' }
    : { total: dash.obligations.by_domain, high: dash.obligations.by_domain_high, label: domainLabel, to: (k: string) => `dashboard/workbench/${k}` };
  const chartData = Object.entries(quelle.total)
    .map(([key, total]) => ({ key, label: quelle.label(key), total, high: quelle.high[key] ?? 0, to: quelle.to(key) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const chartMax = Math.max(1, ...chartData.map((m) => m.total));
  // Eine Reihe hoechstens 30 Kaestchen breit; darueber fasst ein Kaestchen
  // mehrere Pflichten zusammen (fuer alle Reihen gleich, damit sie vergleichbar
  // bleiben), und die Zeile darunter sagt es.
  const ortProKaestchen = unitsPer(chartMax, 30);
  const ortSpalten = Math.ceil(chartMax / ortProKaestchen);
  const maerkte = Object.keys(dash.obligations.by_market);

  // Z2: Pflichten nach Risiko als Kaestchen. Mittel als FLAECHE in #D4A017 statt
  // des Text-Tons risk-medium (#A16207): der ist neben Rot kaum trennbar
  // (Palette-Pruefung 2026-09-22, dE 12,5 < 15). Seit 2026-09-27 der Token
  // risk-medium-mark (Figma: risk/medium-mark).
  const pflichtGruppen = [
    { key: 'h', n: hoch, cls: 'bg-risk-high', label: t('home.unitHigh'), tip: t('home.unitHighTip') },
    { key: 'm', n: mittel, cls: 'bg-risk-medium-mark', label: t('home.unitMedium'), tip: t('home.unitMediumTip') },
    { key: 'l', n: niedrig, cls: 'bg-risk-low', label: t('home.unitLow'), tip: t('home.unitLowTip') },
  ];
  const proKaestchen = unitsPer(offen);

  // Gespeicherte Sitzungen (S3/S2): zuletzt bearbeitet zuerst, hoechstens fuenf.
  // EIN Massstab fuer alle Zeilen, sonst waeren die Kaestchen nicht vergleichbar.
  const sitzungen = [...dash.sessions.items].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const sitzungProKaestchen = unitsPer(Math.max(0, ...sitzungen.map((x) => x.total)), 40);
  const sitzungTeile = (x: DashboardSession) => {
    const b = x.by_severity;
    const erledigt = { n: Math.max(0, x.total - x.open), cls: DONE_CLS, label: t('home.unitDoneTip') };
    // Aeltere Server liefern keine Stufen: dann offen neutral statt geraten.
    if (!b) return [{ n: x.open, cls: REST_CLS, label: t('home.unitOpenTip') }, erledigt];
    return [
      { n: (b.critical ?? 0) + (b.high ?? 0), cls: 'bg-risk-high', label: t('home.unitHighTip') },
      { n: b.medium ?? 0, cls: 'bg-risk-medium-mark', label: t('home.unitMediumTip') },
      { n: b.low ?? 0, cls: 'bg-risk-low', label: t('home.unitLowTip') },
      erledigt,
    ];
  };
  const sitzungName = (x: DashboardSession) => x.label || x.categories.map(domainLabel).join(', ') || '—';
  const sitzungUnter = (x: DashboardSession) => (x.label ? x.categories.map(domainLabel).join(' · ') : t('home.riskMapUnnamed'));
  const sitzungMaerkte = (x: DashboardSession) => (x.markets?.length ? x.markets : [x.country].filter((c): c is string => !!c));
  const sitzungHoch = (x: DashboardSession) => (x.by_severity ? (x.by_severity.critical ?? 0) + (x.by_severity.high ?? 0) : null);
  // Anfragen: wartet auf Sie (Antwort/Frist) · beim Anbieter (unbestaetigt) · laeuft.
  const laufen = Math.max(0, offeneAnfragen.length - aufSie.length - wartend);
  const anfrageTeile = [
    { n: aufSie.length, cls: 'bg-brand', label: t('home.reqYouTip'), legend: t('home.reqYou', { count: aufSie.length }) },
    { n: wartend, cls: 'bg-brand/45', label: t('home.reqProviderTip'), legend: t('home.reqProvider', { count: wartend }) },
    { n: laufen, cls: 'bg-brand/15', label: t('home.reqRunningTip'), legend: t('home.reqRunning', { count: laufen }) },
  ];

  const nichts = !loading && dash.sessions.total === 0 && offeneAnfragen.length === 0 && termine.length === 0;

  // Kopf: nur die Begruessung. Die Lage-Zeile (zuletzt als Sprungmarken, K2)
  // hat der Nutzer am 2026-09-22 wieder herausgenommen — sie wiederholte, was
  // die Kennzahlen und Karten darunter ohnehin zeigen. Die Hauptaktion sitzt
  // links in der Topbar.
  const kopf = (
    <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
      {firstName
        ? <Trans t={t} i18nKey="home.title" values={{ name: firstName }} components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
        : t('home.titleNoName')}
    </h1>
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
  // A3 (Nutzer-Wahl 2026-09-27): jede Anfrage als Strecke
  // Gesendet → Bestaetigt → Antwort → Termin. Der Zustand ergibt sich aus der
  // Position, nicht aus Pille + Frist-Label + "verpasst" (das waren bis zu drei
  // Aussagen fuer denselben Zustand). Eine verpasste Frist ist ein Versaeumnis
  // des ANBIETERS: kein Rot, sondern ein unterbrochener Schritt in Amber und
  // der Ausweg "Anderen anfragen" (DNA: always on your side).
  const STEP_POS = [0, 100 / 3, 200 / 3, 100];
  const strecke = (r: UserRequestRow) => {
    const f = frist(r);
    const warten = f && f.tone !== 'err' ? (100 - f.pct) / 100 : 0;
    if (r.bucket === 'replied') return { done: 2, now: 2, fill: STEP_POS[2], action: 'read' as const };
    if (r.bucket === 'overdue') {
      const bei = r.rawStatus === 'confirmed' ? 2 : 1;
      return { done: bei - 1, miss: bei, fill: STEP_POS[bei - 1], action: 'other' as const, missTip: bei === 2 ? t('home.reqMissedReply') : t('home.reqMissedConfirm') };
    }
    if (r.bucket === 'confirmed') return { done: 1, next: 2, fill: STEP_POS[1] + warten * (STEP_POS[2] - STEP_POS[1]), left: r.slaDeadline };
    return { done: 0, next: 1, fill: warten * STEP_POS[1], left: r.slaDeadline };
  };
  const restzeit = (iso?: string | null) => {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - jetzt;
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    return h >= 1 ? t('home.reqLeftHours', { count: h }) : t('home.reqLeftMinutes', { count: Math.max(1, Math.floor(ms / 60_000)) });
  };
  const SCHRITTE = [t('home.stepSent'), t('home.stepConfirmed'), t('home.stepReply'), t('home.stepMeeting')];
  const anfragenZeilen = [...aufSie, ...offeneAnfragen.filter((r) => !aufSie.includes(r))].slice(0, 3);

  // 5B: "Heute · 09:00" / "Morgen · 09:00" / "Mo., 8. Sep. · 09:00".
  const wann = (iso: string) => {
    const d = new Date(iso);
    const tage = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
    // Vergangene Termine (T2, Ergebnis offen) brauchen "Gestern" — vorher
    // stand fuer alles vor heute "Heute".
    const tag = tage === 0 ? t('home.today') : tage === 1 ? t('home.tomorrow') : tage === -1 ? t('home.yesterday')
      : d.toLocaleDateString(i18n.resolvedLanguage || 'en', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${tag} · ${d.toLocaleTimeString(i18n.resolvedLanguage || 'en', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <UserShell>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1200px]">
          {kopf}

          {/* Kennzahlen als Einheiten-Grafik (Canvas Z2, Nutzer-Wahl 2026-09-22).
              Drei gleichberechtigte Spalten; die Pflichten stehen als EIN Feld
              (hoch, dann mittel, dann niedrig), 8 bis 15 Spalten breit, damit
              es hoechstens vier Reihen hoch wird. Befund Staging: 52 Pflichten
              standen als zwei Saeulen von bis zu sieben Reihen, rechts klaffte
              eine Luecke.
              Die vier Ringe sind weg: ihre Farben erklaerte nichts, und "Hohes
              Risiko" war eine Teilmenge von "Offene Pflichten". Jetzt: jedes
              Kaestchen ein Ding, jede Farbe mit ihrem Wort daneben. */}
          <div className="mt-6 grid gap-x-12 gap-y-7 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-baseline gap-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('home.kpiDuties')}</p>
                <CountUp value={offen} on={entered} className="font-serif text-[30px] font-bold leading-none text-fg" />
              </div>
              {offen > 0 ? (
                <>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-2xs text-fg-secondary">
                    {pflichtGruppen.filter((g) => g.n > 0).map((g) => (
                      <span key={g.key} className="inline-flex items-center gap-1.5">
                        <span aria-hidden="true" className={'h-2.5 w-2.5 rounded-[2px] ' + g.cls} />
                        {g.label} <b className="text-fg">{g.n}</b>
                      </span>
                    ))}
                  </p>
                  <div className="mt-2.5">
                    <UnitGrid
                      on={entered} perUnit={proKaestchen}
                      cols={Math.min(15, Math.max(8, Math.ceil(Math.ceil(offen / proKaestchen) / 4)))}
                      parts={pflichtGruppen.map((g) => ({ n: g.n, cls: g.cls, label: g.tip }))}
                    />
                  </div>
                  {proKaestchen > 1 && <p className="mt-2 text-body-3xs text-fg-tertiary">{t('home.unitsPer', { count: proKaestchen })}</p>}
                </>
              ) : (
                <p className="mt-2 text-body-xs text-fg-tertiary">{t('home.noDuties')}</p>
              )}
            </div>

            <div>
                <div className="flex items-baseline gap-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('home.kpiRequests')}</p>
                  <CountUp value={offeneAnfragen.length} on={entered} className="font-serif text-[30px] font-bold leading-none text-fg" />
                </div>
                {offeneAnfragen.length > 0 && (
                  <>
                    <div className="mt-2.5">
                      <UnitGrid on={entered} perUnit={unitsPer(offeneAnfragen.length, 20)} parts={anfrageTeile} />
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-2xs text-fg-secondary">
                      {anfrageTeile.filter((p) => p.n > 0).map((p) => (
                        <span key={p.cls} className="inline-flex items-center gap-1.5">
                          <span aria-hidden="true" className={'h-2.5 w-2.5 rounded-[2px] ' + p.cls} />
                          {p.legend}
                        </span>
                      ))}
                    </p>
                  </>
                )}
            </div>
            <div>
                <div className="flex items-baseline gap-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('home.kpiRiskMaps')}</p>
                  <CountUp value={dash.sessions.total} on={entered} className="font-serif text-[30px] font-bold leading-none text-fg" />
                </div>
                {maerkte.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-body-2xs text-fg-secondary">
                    {t('home.kpiRiskMapsIn')}
                    {maerkte.map((m) => (
                      <span key={m} className="rounded-full border border-stroke bg-surface px-2 py-[1px] text-[11px] font-extrabold tracking-[0.04em] text-fg">{m}</span>
                    ))}
                  </p>
                )}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-[18px] xl:flex-row">
            {/* Hauptspalte */}
            <div className="flex min-w-0 flex-[1.9] flex-col gap-[18px]">
              {/* Offene Pflichten nach Ort (Canvas P2, Nutzer-Wahl 2026-09-27): je
                  Markt bzw. Bereich eine Reihe Kaestchen, eines je Pflicht, die
                  hohen zuerst — dieselbe Sprache wie die Kennzahlen darueber.
                  Jedes Kaestchen nennt beim Hover seinen Ort. Eine Pflicht kann
                  in mehreren MAERKTEN gelten und zaehlt dann in jedem
                  (dashboard.ts) — das steht darunter, sonst wirkt die Summe
                  falsch. Bereiche ueberschneiden sich nicht. */}
              <div className={CARD + ' p-6'}>
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="text-body-md font-bold text-fg">
                    {chartView === 'markets' ? t('home.dutiesByMarket') : t('home.dutiesByArea')}
                  </h2>
                  <span className="order-last flex basis-full gap-1.5 sm:order-none sm:ml-2 sm:basis-auto">
                    <Segment selected={chartView === 'markets'} onClick={() => setChartView('markets')}>{t('home.tabMarkets')}</Segment>
                    <Segment selected={chartView === 'areas'} onClick={() => setChartView('areas')}>{t('home.tabAreas')}</Segment>
                  </span>
                  <Link to={`/${locale}/dashboard/sessions`} className="ml-auto text-body-2xs text-fg-secondary underline-offset-2 hover:underline">
                    {t('shared.seeAll')}
                  </Link>
                </div>
                {chartData.length ? (
                  <div>
                    <p className="mb-3 flex gap-4 text-body-2xs text-fg-secondary">
                      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-risk-high" />{t('home.unitHighShort')}</span>
                      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={'h-2.5 w-2.5 rounded-[2px] ' + REST_CLS} />{t('home.unitRest')}</span>
                    </p>
                    <div className="flex flex-col gap-3">
                      {chartData.map((m, i) => (
                        <div key={m.key} className="grid grid-cols-[minmax(34px,auto)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(34px,auto)_1fr_auto_auto]">
                          <span className="truncate text-body-xs font-extrabold text-fg">{m.label}</span>
                          <div className="min-w-0 overflow-visible">
                            <UnitGrid
                              on={entered} fluid size={11} gap={3} perUnit={ortProKaestchen} delayOffset={i * 6}
                              cols={Math.min(ortSpalten, Math.ceil(m.total / ortProKaestchen)) || 1}
                              parts={[
                                { n: m.high, cls: 'bg-risk-high', label: t('home.unitTipHigh', { place: m.label }) },
                                { n: m.total - m.high, cls: REST_CLS, label: t('home.unitTipRest', { place: m.label }) },
                              ]}
                            />
                          </div>
                          <span className="whitespace-nowrap text-right text-body-2xs text-fg-secondary">
                            <b className="text-fg">{m.total}</b>
                            {m.high > 0 && <> · <span className="text-risk-high">{t('home.dutiesHigh', { count: m.high })}</span></>}
                          </span>
                          <Link to={`/${locale}/${m.to}`} className="hidden whitespace-nowrap text-body-2xs font-bold text-fg-brand hover:underline sm:inline">
                            {t('home.rowOpen')} →
                          </Link>
                        </div>
                      ))}
                    </div>
                    {(chartView === 'markets' || ortProKaestchen > 1) && (
                      <p className="mt-3 text-body-3xs text-fg-tertiary">
                        {chartView === 'markets' && t('home.marketsOverlap')}
                        {chartView === 'markets' && ortProKaestchen > 1 && ' · '}
                        {ortProKaestchen > 1 && t('home.unitsPer', { count: ortProKaestchen })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="py-10 text-center text-body-xs text-fg-tertiary">{t('home.noDuties')}</p>
                )}
              </div>

              {/* Aktive Anfragen als Strecken (Canvas A3) */}
              <div className={CARD + ' px-6 py-5'}>
                <SectionHead title={t('home.activeRequests')} count={String(offeneAnfragen.length)} to="dashboard/termine?tab=anfragen" />
                {anfragenZeilen.length ? (
                  <div>
                    <div aria-hidden="true" className="hidden grid-cols-[34%_1fr_150px] gap-3 sm:grid">
                      <span />
                      <div className="relative mx-7 h-4 text-[9.5px] font-bold uppercase tracking-[0.04em] text-fg-tertiary">
                        {SCHRITTE.map((s2, k) => (
                          <span key={k} className="absolute top-0 whitespace-nowrap" style={{ left: `${STEP_POS[k]}%`, transform: 'translateX(-50%)' }}>{s2}</span>
                        ))}
                      </div>
                      <span />
                    </div>
                    {anfragenZeilen.map((r, i, arr) => {
                      const st = strecke(r);
                      const rest = 'left' in st ? restzeit(st.left) : null;
                      return (
                        <div key={r.uuid} className={'grid grid-cols-1 items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[34%_1fr_150px] ' + (i < arr.length - 1 ? 'border-b border-stroke-subtle' : '')}>
                          <div className="min-w-0">
                            <button type="button" title={anonProviderLabel(t, r)} onClick={() => oeffneVerlauf(r.uuid)} className="block max-w-full truncate text-left text-body-xs font-bold text-fg hover:underline">{anonProviderLabel(t, r)}</button>
                            <p className="mt-0.5 truncate text-[10.5px] text-fg-tertiary">
                              {[bereich(r.category), markt(r.country), relZeit(r.createdAt, locale)].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div
                            role="img"
                            aria-label={[
                              SCHRITTE.slice(0, st.done + 1).join(' → '),
                              'miss' in st ? st.missTip : null,
                              rest,
                            ].filter(Boolean).join(' · ')}
                            className="relative mx-7 h-3"
                          >
                            <span className="absolute inset-x-0 top-[5px] h-[2px] bg-stroke" />
                            <span
                              className="absolute left-0 top-[5px] h-[2px] bg-brand"
                              style={{ width: entered ? `${st.fill}%` : 0, transition: `width 900ms ${EASE} ${120 + i * 90}ms` }}
                            />
                            {STEP_POS.map((pos, k) => {
                              const cls = k <= st.done && !('now' in st && st.now === k)
                                ? 'bg-brand'
                                : 'now' in st && st.now === k
                                  ? 'bg-surface ring-[3px] ring-inset ring-brand shadow-[0_0_0_4px_rgb(var(--petrol-500)/0.12)]'
                                  : 'miss' in st && st.miss === k
                                    ? 'bg-risk-medium-mark shadow-[0_0_0_4px_rgb(var(--color-risk-medium-mark)/0.18)]'
                                    : 'next' in st && st.next === k
                                      ? 'bg-surface ring-2 ring-inset ring-unit-rest'
                                      : 'bg-surface ring-2 ring-inset ring-stroke';
                              return (
                                <span
                                  key={k}
                                  title={'miss' in st && st.miss === k ? st.missTip : SCHRITTE[k]}
                                  className={'absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full ' + cls}
                                  style={{ left: `${pos}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-start sm:justify-end">
                            {st.action === 'read' ? (
                              <Button size="sm" variant="primary" className="shrink-0" onClick={() => oeffneVerlauf(r.uuid)}>{t('requests.actionRead')}</Button>
                            ) : st.action === 'other' ? (
                              <Button size="sm" variant="outline" className="shrink-0" onClick={() => openWizard(r.category ? { categories: [r.category] } : undefined)}>{t('home.reqAskOther')}</Button>
                            ) : (
                              <span className="whitespace-nowrap text-body-2xs text-fg-secondary">{rest ?? '—'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-center text-body-xs text-fg-tertiary">{t('home.noRequests')}</p>
                )}
              </div>

              {/* Gespeicherte Sitzungen (Canvas S3 + S2, Nutzer-Wahl 2026-09-27):
                  ab md eine Liste in der Hauptspalte, mobil Karten zum Wischen. */}
              {sitzungen.length > 0 && (
                <div className="md:rounded-xl md:border md:border-stroke-subtle md:bg-surface md:px-6 md:py-5 md:shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]">
                  <SectionHead title={t('home.savedRiskMaps')} count={String(dash.sessions.total)} to="dashboard/sessions" />

                  {/* S3: Liste */}
                  <div className="hidden md:block">
                    <div aria-hidden="true" className={SESS_GRID + ' pb-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-fg-tertiary'}>
                      <span>{t('home.colRiskMap')}</span><span>{t('home.colMarkets')}</span><span>{t('home.colDuties')}</span><span>{t('home.colEdited')}</span><span />
                    </div>
                    <ul>
                      {sitzungen.map((x, i) => (
                        <li key={x.id} className="border-t border-stroke-subtle">
                          <button type="button" onClick={() => oeffneSitzung(x.id)} className={SESS_GRID + ' group w-full py-3.5 text-left'}>
                            <span className="min-w-0">
                              <span className="block truncate text-body-xs font-bold text-fg">{sitzungName(x)}</span>
                              <span className="block truncate text-body-3xs text-fg-tertiary">{sitzungUnter(x)}</span>
                            </span>
                            <span className="flex flex-wrap gap-1">{sitzungMaerkte(x).map((m) => <span key={m} className={MARKT_CHIP}>{m}</span>)}</span>
                            <span className="min-w-0">
                              <UnitGrid parts={sitzungTeile(x)} on={entered} fluid size={9} gap={3} perUnit={sitzungProKaestchen} delayOffset={i * 4} />
                              <span className="mt-1 block text-body-3xs text-fg-tertiary">
                                <Trans t={t} i18nKey="home.riskMapDone" values={{ done: x.total - x.open, total: x.total }} components={{ b: <b className="text-fg" /> }} />
                              </span>
                            </span>
                            <span className="text-body-3xs text-fg-tertiary">{relZeit(x.updated_at, locale)}</span>
                            <span className="whitespace-nowrap text-body-2xs font-bold text-brand group-hover:underline group-hover:underline-offset-[3px]">{t('shared.open')} →</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* S2: Karten, von rechts nach links wischbar; die naechste
                      schaut an der Kante hervor, damit das Wischen sich anbietet. */}
                  <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
                    {sitzungen.map((x, i) => {
                      const hochN = sitzungHoch(x);
                      return (
                        <li key={x.id} className="w-[84%] max-w-[340px] shrink-0 snap-start">
                          <button type="button" onClick={() => oeffneSitzung(x.id)} className={CARD + ' flex h-full w-full flex-col gap-2.5 p-4 text-left'}>
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-body-xs font-bold text-fg">{sitzungName(x)}</span>
                              <span className="whitespace-nowrap text-body-2xs font-bold text-brand">{t('shared.open')} →</span>
                            </span>
                            <span className="-mt-1 text-body-3xs text-fg-tertiary">{sitzungUnter(x)}</span>
                            <span className="flex flex-wrap gap-1">{sitzungMaerkte(x).map((m) => <span key={m} className={MARKT_CHIP}>{m}</span>)}</span>
                            <UnitGrid parts={sitzungTeile(x)} on={entered} fluid size={11} gap={3} perUnit={sitzungProKaestchen} delayOffset={i * 4} />
                            <span className="mt-auto flex justify-between gap-2 text-body-3xs text-fg-tertiary">
                              <span>
                                <Trans t={t} i18nKey="home.riskMapDone" values={{ done: x.total - x.open, total: x.total }} components={{ b: <b className="text-fg" /> }} />
                                {hochN !== null && <> · {hochN > 0 ? <b className="text-risk-high">{t('home.dutiesHigh', { count: hochN })}</b> : t('home.riskMapNoHigh')}</>}
                              </span>
                              <span className="whitespace-nowrap">{relZeit(x.updated_at, locale)}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Rechte Spalte (5B): nur noch Termine */}
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              <div className={CARD + ' p-5'}>
                <SectionHead title={t('home.termine')} count={String(termine.length + ohneErgebnis.length)} to="dashboard/termine" />
                {ohneErgebnis.length > 0 && (() => {
                  const o = ohneErgebnis[0];
                  return (
                    <div className="mt-3.5 rounded-[10px] border border-warning-200 bg-warning-bg px-3.5 py-3 dark:border-amber-500/30 dark:bg-amber-500/15">
                      <p className="text-body-xs font-bold text-warning-800 dark:text-amber-300">{t('termine.outcomeQuestion')}</p>
                      <p className="mt-1.5 truncate text-body-xs font-bold text-fg">{o.providerName}</p>
                      <p className="text-body-3xs text-fg-tertiary">{wann(o.slotStart)}</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" onClick={() => ergebnis(o.id, 'completed')}>{t('home.outcomeYes')}</Button>
                        <Button size="sm" variant="outline" onClick={() => ergebnis(o.id, 'no_show')}>{t('termine.outcomeNo')}</Button>
                      </div>
                      {ohneErgebnis.length > 1 && (
                        <p className="mt-2.5 text-body-3xs text-warning-800 dark:text-amber-300">
                          {t('home.outcomeMore', { count: ohneErgebnis.length - 1 })}{' · '}
                          <Link to={`/${locale}/dashboard/termine`} className="font-bold underline underline-offset-[3px]">{t('home.outcomeMoreLink')}</Link>
                        </p>
                      )}
                    </div>
                  );
                })()}
                {termine.length > 0 && (
                  <>
                    {ohneErgebnis.length > 0 && (
                      <p className="mb-1 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-fg-tertiary">{t('home.upNext')}</p>
                    )}
                    <ul className={ohneErgebnis.length ? '' : 'mt-2'}>
                      {termine.slice(0, 3).map((a, i) => {
                        const provider = a.providerName + (a.identityRevealed && a.providerRegion ? ` — ${a.providerRegion}` : '');
                        const thema = themaVon(a);
                        return (
                          <li key={a.id} className={'flex items-center gap-3 py-2.5' + (i > 0 ? ' border-t border-stroke-subtle' : '')}>
                            <DateMark iso={a.slotStart} locale={i18n.resolvedLanguage || 'en'} size="sm" soon />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-body-xs font-bold text-fg" title={a.providerName}>{a.providerName}</p>
                              <p className="truncate text-body-3xs text-fg-tertiary">
                                {wann(a.slotStart)}
                                {thema && <> · <span className="font-semibold text-fg-secondary">{thema}</span></>}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" iconOnly aria-label={t('termine.addToCalendar')} title={t('termine.addToCalendar')}
                              onClick={() => ladeIcs({ id: a.id, slotStartIso: a.slotStart, slotEndIso: a.slotEnd, provider, meta: a.message || '—' })}>
                              <CalendarPlus size={14} />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                {!termine.length && !ohneErgebnis.length && <p className="py-4 text-center text-body-2xs text-fg-tertiary">{t('home.noTermine')}</p>}
              </div>

            </div>
          </div>

        </div>
      </div>
    </UserShell>
  );
}
