import { useState, useEffect, useRef, Fragment } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PenaltyCeiling } from '@complihub/compliance-engine';
import { describeCeiling, penaltyText } from '../lib/penaltyCeiling';
import { saveWizardSession, fetchSessions, type SessionRowData } from '../api/sessions';
import { runSearch, type AnonProvider, type SearchLaw } from '../api/search';
import { useApiData } from '../lib/useApiData';
import { referenceOf } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, Check, Info, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge';
import { FreeAccountDrawer } from '../components/home/MarketsDrawer';
import type { SearchProfile } from '../components/wizard/WizardContext';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { Badge } from '../components/ui/Badge';
import { SessionSnapshot, type SnapshotRow } from '../components/user/SessionSnapshot';
import { AnswersDrawer } from '../components/user/AnswersDrawer';
import { MatchBasis } from '../components/user/PartnerCard';
import { PartnerDrawer } from '../components/user/PartnerDrawer';
import { loadBookingsByKey, type BookingByKey } from '../components/user/DomainProviders';
import { generateRiskMapPdf, type PdfObligation } from '../lib/riskMapPdf';
import {
  RiskMapStateHero,
  IndeterminateProgress,
  RiskMapTableSkeleton,
  RiskMapScopePanel,
  TechnicalDetails,
  scopeOf,
} from '../components/results/RiskMapState';
import {
  ExploreOtherMarkets,
  MarketRequestCard,
  MarketRequestList,
  MarketRequestSent,
  isMarketUnavailable,
  NoVerifiedProvider,
  NotCheckedCard,
  NotCheckedRow,
  PartialMarketNotice,
  partialMarketsOf,
  unavailableMarketsOf,
  useMarketRequests,
} from '../components/results/MarketRequest';

// ─── Results · Risk Map · Figma 1667:215 ────────────────────────────────────
// The generated risk map shown after the wizard. A guest "map" — obligations
// table (severity · obligation · market · due · state), a locked Verified-Partner
// match strip, and a save-to-unlock CTA. Risk shown in the traffic-light tints.

type Severity = 'critical' | 'high' | 'medium' | 'low';
type State =
  | { kind: 'confirmed' }
  | { kind: 'likely' }
  | { kind: 'answer'; count: number };

type Obligation = {
  /** Engine-Template-ID ('tax-vat-registration', …). Nur auf Live-Zeilen —
   *  die Design-Fixture hat keine, ist also nicht abhakbar. */
  id?: string;
  severity: Severity;
  title: string;
  detail: string;
  market: string;
  due: string;
  dueSub: string;
  /** Tage bis zur Frist (Engine due_days) — nur auf Live-Zeilen. */
  dueDays?: number;
  state: State;
  /** Verified EU legal basis (EUR-Lex permalink) — rendered as a link so the
   *  claim is checkable instead of just asserted. Absent for purely national
   *  obligations and for the design fixture. */
  sourceLabel?: string;
  sourceUrl?: string;
  /** Adopted law whose start date is past the deadline horizon — shown under
   *  "On the radar" instead of competing with what needs doing this quarter. */
  radar?: boolean;
  /** Die Norm als Klartext. Der Snapshot zeigt sie eigenstaendig unter dem
   *  Titel; aus `detail` liesse sie sich nur raten (dort steht sie mal am
   *  Ende, mal in der Mitte). Statutennamen sind sprachneutral, deshalb
   *  keine eigene i18n-Zeile. */
  law?: string;
  /** Die Bussgeld-Zeile allein. Mobil steht sie unter der Quelle (Canvas
   *  N1); `detail` bleibt fuer das PDF die zusammengesetzte Zeile. */
  penalty?: string;
};

/** Whole days from today until an ISO date, or null once the date has passed
 *  (or is absent). Both sides are normalised to local midnight so a duty that
 *  starts the day after tomorrow reads "2 days" regardless of the clock time.
 *  Deliberately lives here and not in the engine: the enrichment map is
 *  deterministic ground truth, and only the render point knows "now". */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

/** Beyond a year out, a start date stops being a deadline and becomes a
 *  roadmap item. The PPWR 2030 tranche is ~1,200 days away: counted as a
 *  deadline it would drag the median stat to "1240 days" and render countdowns
 *  nobody can act on. Past the horizon the row still shows its date — only the
 *  countdown and the deadline stats drop out. */
const DEADLINE_HORIZON_DAYS = 365;
const withinHorizon = (iso?: string | null): number | null => {
  const d = daysUntil(iso);
  return d != null && d <= DEADLINE_HORIZON_DAYS ? d : null;
};

type RiskT = TFunction<['results', 'common']>;

// ─── Eine Abbildung, zwei Flaechen ───────────────────────────────────────────
// Die Risk-Map-Seite und der PDF-Export der Sitzungsseite rechnen mit
// denselben drei Funktionen. Bis 2026-09-22 hatte die Sitzungsseite keine
// eigene Abbildung und nahm deshalb die Design-Fixture — jede Sitzung
// exportierte dieselben acht erfundenen Pflichten.

/** Engine-Pflichten → Tabellenzeilen. Nur Pflichten mit `severity` zaehlen;
 *  die uebrigen sind Knowledge-Treffer ohne Bewertung. */
export function liveObligations(laws: SearchLaw[], t: RiskT, lang: string, locale: string): Obligation[] {
  return laws.filter((l) => l.severity).map((l) => ({
    id: l.id,
    severity: l.severity as Severity,
    title: l.title,
    // Rechtsgrundlage zuerst, Bußgeld danach. Das DNA-Addendum V2 verlangt,
    // dass Strafhöhen nicht der primäre Untertitel jeder Pflicht sind —
    // zugänglich bleiben sie, führend sind sie nicht mehr. Der Präfix war
    // ausserdem hartkodiertes Englisch ('Penalty:') im deutschen UI.
    // Die BELEGTE Obergrenze, wo es eine gibt — sonst der redaktionelle
    // Satz. Beide standen bisher nebeneinander in der Welt, ohne dass
    // etwas sie zusammenhielt: hier stand "up to EUR 30,000 per year",
    // waehrend die Obergrenze zu derselben Pflicht 7.500 EUR JE EINHEIT
    // lautete und keinen Deckel hat. Eine Quelle, ein Satz.
    detail: [l.source_url ? null : l.source, bussgeldZeile(l, t, lang)]
      .filter(Boolean)
      .join(' · '),
    sourceLabel: l.source_url ? (l.source ?? l.celex ?? undefined) : undefined,
    sourceUrl: l.source_url ?? undefined,
    market: l.markets && l.markets.length ? l.markets.join(' · ') : t('euWide'),
    // Die Norm im Klartext, wenn es keine verlinkbare Fundstelle gibt —
    // sonst stuende unter dem Titel nur der Markt (Befund 2026-09-05).
    law: l.source_url ? undefined : (l.source ?? undefined),
    penalty: bussgeldZeile(l, t, lang) ?? undefined,
    // A duty that has not started yet must not read "Ongoing · Live" — that
    // would tell the user they are already in breach. Until its start date
    // the Due cell shows that date plus the countdown; from the day it
    // applies the row silently reverts to its normal cadence.
    due: daysUntil(l.applies_from) != null
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
          .format(new Date(`${l.applies_from}T00:00:00`))
      : l.due === 'Ongoing' ? t('ongoing') : l.due ?? '—',
    dueSub: withinHorizon(l.applies_from) != null
      ? t('appliesIn', { count: withinHorizon(l.applies_from) as number, defaultValue: `applies in ${withinHorizon(l.applies_from)} days` })
      : daysUntil(l.applies_from) != null ? ''   // far future: the date says enough
      : l.due_days != null ? t('days', { count: l.due_days }) : l.due === 'Ongoing' ? 'Live' : '',
    dueDays: l.due_days ?? undefined,
    state: { kind: l.state === 'confirmed' ? 'confirmed' : 'likely' },
    // Same horizon as the stats: a duty landing in days is "now" even
    // though it has not started; one landing in 2030 is not.
    radar: daysUntil(l.applies_from) != null && withinHorizon(l.applies_from) == null,
  }));
}

/** Near-term deadlines count inside this window. */
const SOON_DAYS = 30;

/** Kennzahlen zu Live-Pflichten. `providers` null heisst: die Engine hat keine
 *  Anbieter geliefert (laedt, Fehler) — dann steht "—" statt einer Zahl. */
export function riskMapStats(laws: SearchLaw[], rowCount: number, providers: number | null) {
  // A not-yet-applicable duty has a real, dated deadline — the day it starts
  // to apply. Counting it keeps the "near deadlines" stat honest; without it
  // a rule landing in two days would be invisible in the headline numbers.
  // Only inside the horizon, though: the 2030 tranche is a roadmap, and
  // averaging it in would report a median deadline three years out.
  const days = laws.filter((l) => l.severity).map((l) => l.due_days ?? withinHorizon(l.applies_from))
    .filter((d): d is number => d != null).sort((a, b) => a - b);
  const median = days.length ? days[Math.floor(days.length / 2)] : null;
  const soon = days.filter((d) => d <= SOON_DAYS).length;
  return [
    { value: String(rowCount), label: 'obligations identified' },
    { value: String(soon), label: `with a deadline in ${SOON_DAYS} days` },
    // Leer heisst in der Anzeige "ongoing" — richtig, wenn es Pflichten ohne
    // Frist gibt, falsch, wenn es gar keine gibt. Dann ein Strich.
    { value: median != null ? String(median) : rowCount ? '' : '—', days: median ?? undefined, label: 'median deadline' },
    { value: providers != null ? String(providers) : '—', label: 'Verified Providers ready' },
  ];
}

/** Tabellenzeilen → PDF-Zeilen. Die Zeilen stehen wortgleich — die Engine
 *  spricht Englisch; uebersetzt werden nur Zustands-Beschriftungen. */
export function pdfObligations(rows: Obligation[], t: RiskT): PdfObligation[] {
  return rows.map((o) => ({
    severity: o.severity,
    title: o.title,
    detail: o.detail,
    market: o.market,
    due: o.due,
    dueSub: o.dueSub,
    stateLabel:
      o.state.kind === 'confirmed' ? t('state.confirmed', { defaultValue: 'Confirmed' })
      : o.state.kind === 'likely' ? t('state.likely', { defaultValue: 'Likely' })
      : t('pdf.questionsOpen', { defaultValue: '{{total}} questions open', total: o.state.count, count: o.state.count }),
  }));
}

// ─── Warum 87 % 87 % sind ─────────────────────────────────────────────────────
// Das DNA-Addendum V2 (P1) verlangt sichtbare ✓/Lücken-Kriterien hinter der
// Match-Zahl. Die Zahl ist im Backend exakt zerlegbar:
//     match = 60 * Marktabdeckung + 40 * (getroffene / angefragte Bereiche)
// Deshalb wird hier NICHTS geschätzt — es wird nur ausgeschrieben, was der
// Score ohnehin ist. Fehlt match_basis (ältere Payloads), erscheint gar nichts:
// eine erfundene Begründung wäre schlechter als eine nackte Zahl.
/** U3: Unter lg steht der Ablauf-Hinweis im Seitenkopf statt in der Topbar —
 *  ruhig, und bewusst nicht neben dem Speichern-Knopf. */
function GuestExpiryNote() {
  const { t } = useTranslation('results');
  return (
    <p data-testid="guest-expiry-mobile" className="mt-3 inline-flex items-center gap-1.5 text-body-xs text-fg-secondary lg:hidden">
      <Lock size={13} aria-hidden /> {t('topbar.guestBadge')}
    </p>
  );
}

function StatePill({ state, onAnswer }: { state: State; onAnswer: () => void }) {
  const { t } = useTranslation('results');
  if (state.kind === 'confirmed') {
    return (
      <Badge shape="pill" tone="brand" appearance="soft" size="lg" >
        <Check size={13} strokeWidth={3} /> {t('state.confirmed')}
      </Badge>
    );
  }
  if (state.kind === 'likely') {
    return (
      <Badge shape="pill" tone="neutral" appearance="outline" size="lg" className="font-medium">
        <Info size={13} /> {t('state.likely')}
      </Badge>
    );
  }
  return (
    <Button
      size="sm"
      shape="soft"
      type="button"
      onClick={onAnswer}
      className="transition-transform duration-200 hover:-translate-y-0.5"
    >
      {t('state.answer', { total: state.count, count: state.count })} <ArrowRight size={14} />
    </Button>
  );
}

export function ResultsRiskMap() {
  // Zwei Namensraeume: die Seite spricht 'results', die belegte Obergrenze
  // lebt in 'common' und wird von vier weiteren Flaechen genauso gelesen.
  const { t } = useTranslation(['results', 'common']);
  const location = useLocation();
  // Profile survives the magic-link roundtrip via localStorage (Wave A2):
  // router state is lost when the user returns from the e-mail.
  const stateProfile = location.state?.searchProfile as SearchProfile | undefined;
  const storedProfile = (() => {
    try { return JSON.parse(localStorage.getItem('ch360_last_profile') || 'null') as SearchProfile | null; }
    catch { return null; }
  })();
  const profile = stateProfile ?? storedProfile ?? undefined;
  const [saveOpen, setSaveOpen] = useState(false);
  // "Antworten bearbeiten" als Schublade (Canvas-Wahl 1B/2B, 2026-09-05).
  // Nach "Als Variante kopieren" landet man hier auf der Kopie mit
  // openAnswers im Router-State — die Schublade geht sofort auf.
  const [answersOpen, setAnswersOpen] = useState<boolean>(!!location.state?.openAnswers);
  // Partner oeffnen als Schublade ueber der Sitzung (Canvas 1C, 2026-09-15) —
  // wie auf der Bereichsseite. Kein Seitenwechsel, die Ergebnisse bleiben stehen.
  const [partnerOpen, setPartnerOpen] = useState<AnonProvider | null>(null);
  // Termine des Nutzers je Anbieter: wo einer liegt, traegt die Karte den
  // Klarnamen statt des Pseudonyms (Stufe 3).
  const [booked, setBooked] = useState<BookingByKey>({});

  useEffect(() => {
    let alive = true;
    loadBookingsByKey()
      .then((b) => { if (alive) setBooked(b); })
      .catch(() => { if (alive) setBooked({}); });
    return () => { alive = false; };
  }, []);
  const [reloadKey, setReloadKey] = useState(0);
  const { isLoggedIn, user } = useAuthStore();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  // Phase-3 wiring: one results surface, two entrances (funnel + dashboard).
  // ?session=<id> re-queries /search with that session's stored profile.
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  // `query` haelt fest, womit tatsaechlich gesucht wurde — der Umfang der
  // leeren Zustaende (welche Maerkte geprueft wurden) muss dieselbe Frage
  // beschreiben, nicht das lokale Profil, wenn eine Sitzung es ersetzt hat.
  const { data: searchData, source: searchSource, loading: searchLoading, error: searchError } = useApiData<{ providers: AnonProvider[]; laws: SearchLaw[]; session: SessionRowData | null; query: Parameters<typeof runSearch>[0] | null }>(async () => {
    let query: Parameters<typeof runSearch>[0] = profile ?? {};
    let session: SessionRowData | null = null;
    if (sessionId) {
      try {
        const s = (await fetchSessions()).find((x) => x.id === sessionId);
        if (s) { session = s; query = { country: s.country ?? 'DE', categories: s.categories as SearchProfile['categories'] }; }
      } catch { /* fall back to the local profile */ }
    }
    const res = await runSearch(query);
    return { providers: res.providers, laws: res.laws ?? [], session, query };
  }, { providers: [], laws: [], session: null, query: null }, [sessionId, reloadKey]);
  // Anbieter zaehlen nur, wenn die Engine sie geliefert hat. Bis 2026-09-22
  // stand hier beim Laden und bei einem API-Fehler eine Design-Fixture mit drei
  // erfundenen Anbietern (100/87/73 %); sie haette einem Nutzer ohne einen
  // einzigen passenden Anbieter drei gezeigt (Entscheidung 2026-09-22,
  // "echte Zahl"; DNA §4.5 "Never give false reassurance").
  const providersLive = searchSource === 'api';
  const anonProviders = providersLive ? searchData.providers : [];

  // Vier Zustaende, die bis 2026-09-22 einer waren. Vorher galt: was nicht
  // live ist, ist die Design-Fixture — beim Laden, bei einem API-Fehler und
  // wenn die Engine nichts fand, sah der Nutzer dieselben acht erfundenen
  // Pflichten, als haette die Engine sie gefunden.
  //
  //   live     die Engine hat bewertete Pflichten geliefert → Tabelle
  //   none     die Engine hat geantwortet und nichts gefunden → Zustand
  //   loading  die Engine rechnet noch → Zustand
  //   failed   die Engine hat nicht geantwortet → Zustand, Try Again
  //
  // Die Fixture gibt es seitdem nicht mehr. `useApiData` braucht nur noch
  // die Form; Inhalt kommt ausschliesslich aus der Engine. Live-Zeilen stehen
  // wortgleich (die Engine spricht Englisch).
  const liveLaws = searchData.laws.filter((l) => l.severity);
  const isLive = liveLaws.length > 0;
  const pageState: 'live' | 'none' | 'loading' | 'failed' = isLive
    ? 'live'
    : searchSource === 'api' ? 'none'
    : searchLoading ? 'loading' : 'failed';
  const noRequirements = pageState === 'none';

  // marketUnavailable (Canvas D3 · E3 · F3, Figma 3470:2011/2129/2221): die
  // Engine hat geantwortet, aber keinen der angefragten Maerkte pruefen
  // koennen. Dann waere C3 ("No immediate requirements identified") eine
  // Aussage ueber eine Pruefung, die es nicht gab. Gemischte Faelle (DE + BR)
  // bleiben C3 (Entscheidung 2026-09-27), mit I1 · J1 · K3 (unten).
  const scopeProfile = searchData.query ?? profile ?? null;
  const marketUnavailable = pageState === 'none' && isMarketUnavailable(scopeProfile);
  const unavailable = marketUnavailable && scopeProfile ? unavailableMarketsOf(scopeProfile) : [];
  const requestAreas = scopeProfile ? scopeOf(scopeProfile, 'requested').areas : [];
  // Gemischte Maerkte (Canvas I1 · J1 · K3, Figma 3546:2497/2657/20736): DE
  // geprueft, BR nicht. Die Map darf dann nicht vollstaendig wirken — jede
  // Flaeche nennt den ungeprueften Markt und bietet die Anfrage an.
  const partial = (pageState === 'live' || pageState === 'none') && !marketUnavailable
    ? partialMarketsOf(scopeProfile)
    : [];
  // Als Gast zaehlt, wer kein echtes Konto hat — auch ein Demo-Login: der
  // hat keinen JWT, der Server braucht dann den guest_key (sonst 400).
  const { status: requestStatus, send: sendRequest } = useMarketRequests({ areas: requestAreas, asGuest: !user });
  const allRequested = unavailable.length > 0 && unavailable.every((m) => requestStatus[m] === 'sent');
  // Die Engine hat geantwortet — mit oder ohne Pflichten. Nur dann gibt es
  // eine Map, die man speichern kann, und eine Aussage "what applies to you".
  const hasResult = pageState === 'live' || pageState === 'none';
  const rows: Obligation[] = isLive ? liveObligations(liveLaws, t, i18n.language, locale) : [];

  // Two groups, not two tables: "Now" is what the user is accountable for
  // today, "On the radar" is adopted law that only bites later. filter() is
  // stable, so order inside each group holds.
  const indexed = rows.map((o, i) => ({ o, i }));
  const nowRows = indexed.filter((x) => !x.o.radar);
  const radarRows = indexed.filter((x) => x.o.radar);
  // Headers appear only when there is something to separate; with no staged
  // obligations the table renders exactly as it did before.
  const grouped = radarRows.length
    ? [{ key: 'now', label: t('groups.now', { defaultValue: 'Now' }), items: nowRows },
       { key: 'radar', label: t('groups.radar', { defaultValue: 'On the radar' }), items: radarRows }]
        .filter((g) => g.items.length)
    : [{ key: 'now', label: '', items: indexed }];

  // Stat strip mirrors the table: count, near-term deadlines, median
  // days-to-deadline, matched partners. Fixture values until the API answers.
  //
  // Brand & Marketing Map V1 §5/§11 rules out "fear-first penalty language".
  // The strip used to lead with "€530k total exposure" — the biggest number on
  // screen was a threat. Penalties are still shown per obligation (they are
  // facts, and useful for prioritising), but the headline stat now conveys
  // URGENCY instead of DREAD: how many deadlines are actually near.
  // Kennzahlen nur, wenn die Engine geantwortet hat. Beim Laden und bei einem
  // Fehler gibt es keine — "0 obligations identified" waere dann eine
  // Behauptung ueber ein Ergebnis, das es nicht gibt.
  // Auch nicht bei marketUnavailable: die Engine hat nichts geprueft, "0"
  // waere ein Ergebnis, das es nicht gibt.
  const stats = isLive || (noRequirements && !marketUnavailable)
    ? riskMapStats(liveLaws, rows.length, providersLive ? anonProviders.length : null)
    : null;

  // Abgenommene Zustands-Copy (Checklist v1.0) fuer alles, was keine Tabelle
  // ist. Alle drei Aussagen stimmen hier:
  //   loading  "We're reviewing your answers…" — die Engine rechnet gerade.
  //            Keine Aktion, der Banner meldet den Fortschritt als role=status.
  //   failed   "Please try again. If the problem continues, contact support." —
  //            Try Again stoesst die Abfrage neu an, Contact Support fuehrt auf
  //            die Kontaktseite.
  //   none     "This does not mean that no obligations apply" — der Grund,
  //            warum eine leere Liste nicht als Entwarnung gelesen wird.
  //            "Review My Answers" nur, wo der Knopf die Antworten zeigt: bei
  //            einer gespeicherten Sitzung. Fuer einen Gast gibt es das nicht —
  //            der Wizard stellt fruehere Antworten nicht wieder her.
  // Die Schublade haengt nur in der eingeloggten Ansicht im Baum.
  // Als Banner erscheint der Zustand nur noch in der eingeloggten Ansicht
  // (SessionSnapshot, Slot emptyState — ohne Figma-Pendant). Die Gast-Seite
  // rendert ihn als ganze Seite nach Figma 3390:14594, s. u.
  const canReviewAnswers = !!(isLoggedIn && sessionId && searchData.session);

  // Zurueck zur Marktwahl: mit gespeicherter Sitzung die Antworten-Schublade,
  // sonst der Wizard (wie "Edit answers" im Snapshot).
  const exploreOtherMarkets = () => (canReviewAnswers ? setAnswersOpen(true) : navigate(`/${locale}/wizard`));

  const stateKey = marketUnavailable ? 'marketUnavailable'
    : pageState === 'none' ? 'noRequirements'
    : pageState === 'loading' ? 'riskMapLoading'
    : pageState === 'failed' ? 'riskMapFailed' : null;
  const stateBanner = stateKey && (
    <Banner
      status={pageState === 'failed' ? 'error' : 'info'}
      title={t(`common:states.${stateKey}.heading`)}
      action={
        pageState === 'failed' ? (
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
              {t('common:states.actions.tryAgain')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/${locale}/contact`)}>
              {t('common:states.actions.contactSupport')}
            </Button>
          </span>
        ) : pageState === 'none' && canReviewAnswers ? (
          <Button size="sm" variant="secondary" onClick={() => setAnswersOpen(true)}>
            {t('common:states.actions.reviewMyAnswers')}
          </Button>
        ) : undefined
      }
    >
      {t(`common:states.${stateKey}.message`)}
    </Banner>
  );
  // Mit Konto (F3): je Markt eine Karte mit Opt-in fuer das Update. Die
  // Adresse ist die des Kontos; ein Konto ohne Adresse bekommt kein Angebot.
  const stateNode = marketUnavailable ? (
    <div className="flex flex-col gap-4">
      {stateBanner}
      {unavailable.map((m) => (
        <MarketRequestCard
          key={m}
          market={m}
          areas={requestAreas}
          email={user?.email ?? null}
          status={requestStatus[m] ?? 'idle'}
          onRequest={(notify) => sendRequest(m, notify)}
          onExplore={exploreOtherMarkets}
        />
      ))}
    </div>
  ) : stateBanner;

  // Wave A1: arriving from the wizard persists the session (the editable
  // dossier). Guest-anchored via guest_key; fire-and-forget — the page renders
  // regardless, and a failed save just means no resume anchor.
  const savedRef = useRef(false);
  useEffect(() => {
    if (!profile || savedRef.current) return;
    savedRef.current = true;
    localStorage.setItem('ch360_last_profile', JSON.stringify(profile));
    saveWizardSession(profile).catch(() => { /* offline/demo — non-fatal */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Eingeloggt: der Sitzungs-Snapshot ────────────────────────────────────
  // Dieselben Daten, andere Flaeche. Das Gast-Chrome darunter (30-Minuten-
  // Karte, "Karte speichern", das Schluss-Band) lief bis 2026-08-29 auch fuer
  // eingeloggte Nutzer — es haengt jetzt tatsaechlich am Login.
  const snapshotRows: SnapshotRow[] = indexed.map(({ o, i }) => ({
    obligationId: o.id,
    severity: o.severity,
    title: o.title,
    market: o.market,
    due: o.due,
    dueSub: o.dueSub,
    dueDays: o.dueDays,
    state: o.state,
    sourceLabel: o.sourceLabel,
    sourceUrl: o.sourceUrl,
    sourceText: o.sourceUrl ? undefined : o.law,
  }));

  const exportPdf = async () => {
    if (!stats) return;
    await generateRiskMapPdf({
      profile: profile ?? null,
      t,
      stats: stats.map((s2, i) => ({ value: s2.value, label: t(`stats.${i}.label`, { defaultValue: s2.label }) })),
      obligations: pdfObligations(rows, t),
    });
  };

  if (isLoggedIn) {
    const notAnswer = (o: Obligation) => o.state.kind !== 'answer';
    const critical = rows.filter((o) => notAnswer(o) && o.severity === 'critical').length;
    const high = rows.filter((o) => notAnswer(o) && o.severity === 'high').length;
    const open = rows.filter((o) => o.state.kind === 'answer').length;
    const session = searchData.session;
    // Der Untertitel nennt nur, was wirklich bekannt ist: Markt und Bereiche.
    // Eine Versionsnummer stuende hier gern — die API fuehrt keine.
    const markets = session?.country ?? profile?.country ?? '';
    const areas = session?.categories?.length ?? profile?.categories?.length ?? 0;
    return (
      <SessionSnapshot
        rows={snapshotRows}
        // H3 (01.10.2026): kein Markt geprueft → keine Anbieter-Karten mit
        // "Does not cover your market", sondern der abgenommene Zustand.
        providers={marketUnavailable ? [] : anonProviders}
        providersEmptyState={marketUnavailable ? <NoVerifiedProvider /> : undefined}
        // K3 (01.10.2026): der ungepruefte Markt steht oben in der Spalte,
        // die Anbieter fuer die geprueften Maerkte bleiben darunter.
        providersTop={partial.length > 0 ? (
          <>
            {partial.map((m) => (
              <NotCheckedCard
                key={m}
                market={m}
                email={user?.email ?? null}
                status={requestStatus[m] ?? 'idle'}
                onRequest={(notify) => sendRequest(m, notify)}
              />
            ))}
          </>
        ) : undefined}
        sessionId={sessionId}
        title={session?.label || t('snapshot.fallbackTitle')}
        meta={[markets, areas ? t('snapshot.areas', { count: areas }) : null].filter(Boolean).join(' · ')}
        kpis={stats ? {
          total: rows.length,
          soon: Number(stats[1].value) || 0,
          open,
          critical,
          high,
          rest: Math.max(0, rows.length - critical - high),
        } : undefined}
        matchBasis={(p) => (p.match_basis ? <MatchBasis basis={p.match_basis} /> : null)}
        bookings={booked}
        onExportPdf={isLive ? exportPdf : undefined}
        emptyState={stateNode || undefined}
        // Mit gespeicherter Sitzung oeffnet sich die Schublade; ohne (Fixture,
        // Gast-Profil) bleibt der Weg zum Erst-Wizard.
        onEditAnswers={() => (sessionId && session ? setAnswersOpen(true) : navigate(`/${locale}/wizard`))}
        onProviderDetails={(ref) => setPartnerOpen(anonProviders.find((p) => p.public_ref === ref) ?? null)}
        partnerDrawer={
          <PartnerDrawer
            open={partnerOpen !== null}
            onClose={() => setPartnerOpen(null)}
            provider={partnerOpen}
            basisNode={partnerOpen?.match_basis ? <MatchBasis basis={partnerOpen.match_basis} /> : undefined}
            sessionId={sessionId}
            sessionMessage={session?.label ? t('schedule.messageFromSession', { session: session.label }) : undefined}
            booking={partnerOpen ? booked[partnerOpen.public_ref] ?? null : null}
            onBooked={(key, b) => setBooked((prev) => ({ ...prev, [key]: b }))}
          />
        }
        answersDrawer={sessionId && session ? (
          <AnswersDrawer
            open={answersOpen}
            onClose={() => setAnswersOpen(false)}
            sessionId={sessionId}
            sessionLabel={session.label || t('snapshot.fallbackTitle')}
            profile={{
              country: session.country ?? '',
              markets: session.markets ?? [],
              categories: (session.categories ?? []) as SearchProfile['categories'],
              ...(session.answers ?? {}),
            }}
            onSaved={() => setReloadKey((k) => k + 1)}
          />
        ) : null}
      />
    );
  }

  return (
    // Unter md klebt "Diese Karte speichern" unten (Canvas T3 · U3, Figma
    // 3577:2831, abgenommen 04.10.2026); der Platz darunter haelt die
    // letzte Zeile der Seite frei.
    <div className={`min-h-screen bg-surface ${hasResult ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-stroke-subtle bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-container-3xl items-center justify-between px-4 md:px-8 lg:px-16">
          <div className="flex min-w-0 items-center gap-0.5 md:gap-4">
            {/* Unter md der Ausweg als Pfeil links vom Logo (U3): vorher gab
                es auf dem Handy gar keinen. Das Logo bleibt voll (T3). */}
            <Link
              to={`/${locale}`}
              aria-label={t('topbar.backHome')}
              data-testid="back-home-mobile"
              className="-ml-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg-secondary transition-colors hover:text-fg-brand md:hidden"
            >
              <ArrowLeft size={20} />
            </Link>
            <Logo lockup="horizontal" href="/" className="h-[36px]" />
            {/* The guest map deliberately drops the site nav to stay focused, which
                left no visible way out — the logo was the only exit and nobody
                reads a logo as "back". This is that exit, spelled out. */}
            <span aria-hidden className="hidden h-5 w-px bg-stroke md:block" />
            <Link
              to={`/${locale}`}
              className="hidden items-center gap-1.5 whitespace-nowrap text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand md:inline-flex"
            >
              <ArrowLeft size={14} /> {t('topbar.backHome')}
            </Link>
          </div>
          {/* Ohne Ergebnis gibt es keine Map, die ablaeuft oder gespeichert
              werden koennte — Badge und Knopf behaupteten sonst eine. Auf
              390 px ueberdeckte der Knopf das Logo (DE 27 px, TR 18, ES 9),
              zwischen 640 und ~900 px brach "Zurueck zum Start" in den
              Badge. Darum: Knopf unter md unten, Badge erst ab lg, darunter
              steht der Hinweis im Seitenkopf. */}
          {hasResult && (
            <div className="hidden items-center gap-4 md:flex">
              <span className="hidden items-center gap-2 text-body-2xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary lg:inline-flex">
                <Lock size={13} /> {t('topbar.guestBadge')}
              </span>
              <Button
                variant="primary"
                size="md"
                shape="soft"
                type="button"
                onClick={() => setSaveOpen(true)}
                // Ohne Farbueberschreibung: die Primaer-Flaeche ist seit 2026-09-20
                // Petrol, dunkle Schrift darauf verfehlte den Kontrast (Figma C3: weiss).
                className="transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t('topbar.saveMap')} <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Leere Zustaende (A3 · B3 · C3, Figma 3390:14594) ──────────────
          Laedt, gescheitert oder nichts gefunden: der Zustand ist die Seite.
          Keine Kennzahlen, keine Anbieter, kein Schluss-Band — "0 obligations
          identified" oder Partner-Karten unter "No immediate requirements"
          wuerden einen Bedarf anbieten, den wir nicht festgestellt haben. */}
      {!isLive && stateKey && (
        <main className="mx-auto flex w-full max-w-container-3xl flex-col items-center gap-8 px-4 pb-20 pt-16 md:px-8 lg:px-16">
          <RiskMapStateHero
            heading={t(`common:states.${stateKey}.heading`)}
            // G2 (01.10.2026): Gaeste haben keine Update-Wahl — ihr Satz
            // sagt nur, was fuer sie gilt. Eingeloggt bleibt der abgenommene.
            message={t(marketUnavailable ? 'common:states.marketRequest.guestMessage' : `common:states.${stateKey}.message`)}
          >
            {pageState === 'loading' && <IndeterminateProgress />}
            {/* D3: der Weg zur Marktwahl steht unter dem Satz; nach der
                Anfrage wandert er in die Bestaetigung (E3). */}
            {marketUnavailable && !allRequested && <ExploreOtherMarkets onClick={exploreOtherMarkets} />}
            {pageState === 'none' && <GuestExpiryNote />}
            {pageState === 'failed' && (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button size="lg" onClick={() => setReloadKey((k) => k + 1)}>
                  {t('common:states.actions.tryAgain')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate(`/${locale}/contact`)}
                  className="border-stroke-brand bg-surface text-fg-brand hover:bg-brand-light dark:border-stroke-brand dark:text-fg-brand"
                >
                  {t('common:states.actions.contactSupport')}
                </Button>
              </div>
            )}
          </RiskMapStateHero>
          {pageState === 'loading' && <RiskMapTableSkeleton />}
          {/* Umfang nur mit Profil: gescheitert nennt die Anfrage, nichts
              gefunden nennt, was die Engine tatsaechlich geprueft hat. */}
          {marketUnavailable && (allRequested ? (
            <MarketRequestSent markets={unavailable} onExplore={exploreOtherMarkets} />
          ) : (
            <MarketRequestList
              label={t('common:states.scope.triedToAssess')}
              markets={unavailable}
              areas={requestAreas}
              status={requestStatus}
              onRequest={(m) => sendRequest(m)}
            />
          ))}
          {profile && pageState !== 'loading' && !marketUnavailable && (
            <RiskMapScopePanel
              label={t(`common:states.scope.${pageState === 'failed' ? 'triedToAssess' : 'checked'}`)}
              {...scopeOf(profile, pageState === 'failed' ? 'requested' : 'checked')}
            >
              {/* J1: was angefragt, aber nicht geprueft wurde. */}
              {partial.length > 0 && partial.map((m) => (
                <NotCheckedRow key={m} market={m} status={requestStatus[m] ?? 'idle'} onRequest={() => sendRequest(m)} />
              ))}
            </RiskMapScopePanel>
          )}
          {pageState === 'failed' && <TechnicalDetails reference={referenceOf(searchError)} />}
        </main>
      )}

      {isLive && (
      <main className="mx-auto w-full max-w-container-3xl px-4 pb-20 md:px-8 lg:px-16">
        {/* Header */}
        <div className="mx-auto mt-14 max-w-3xl text-center">
          <span className="text-body-2xs font-semibold uppercase tracking-[0.16em] text-fg-brand">{t('header.eyebrow')}</span>
          <h1 className="mt-3 font-serif text-[2.75rem] font-bold leading-[1.05] tracking-tight text-fg sm:text-[3.25rem]">
            {t('header.title')}
          </h1>
          {/* Nur mit Profil. Der fruehere Standard-Untertitel beschrieb ein
              erfundenes Unternehmen ("Germany · United Kingdom · Netherlands.
              D2C e-commerce, €2M—€5M revenue") — fuer jeden, der ohne Profil
              ankam, als waere es seines. */}
          {profile?.country && (
            <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">
              {/* `count`, nicht `total`: nur so waehlt i18next die Einzahl
                  ("1 Bereich im Fokus" statt "1 Bereiche"). */}
              {t('header.subtitleProfile', { count: profile.categories?.length ?? 0 })}
            </p>
          )}
          <GuestExpiryNote />
        </div>

        {/* Stat strip — nur, wenn die Engine geantwortet hat */}
        {stats && (
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-between gap-y-4 rounded-xl border border-stroke-subtle bg-surface px-8 py-6 shadow-[0_18px_44px_-32px_rgba(2,22,17,0.3)]">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <span className="mr-8 hidden h-8 w-px bg-stroke-subtle sm:block" />}
                <span className="text-[1.5rem] font-bold text-fg">
                  {s.days != null ? t('days', { count: s.days }) : s.value || t('ongoing')}
                </span>
                <span className="ml-2 text-body-sm text-fg-secondary">{t(`stats.${i}.label`, { defaultValue: s.label })}</span>
              </div>
            ))}
          </div>
        )}

        {/* I1: ungepruefte Maerkte zwischen Kennzahlen und Tabelle — die
            Pflichten darunter gelten nur fuer die geprueften. */}
        {partial.length > 0 && (
          <div className="mt-10 flex flex-col gap-3">
            {partial.map((m) => (
              <PartialMarketNotice key={m} market={m} status={requestStatus[m] ?? 'idle'} onRequest={() => sendRequest(m)} />
            ))}
          </div>
        )}

        {/* Obligations — ab lg die Tabelle, darunter je Pflicht eine Karte
            (Canvas L1 · M1 · N1, Figma 3574:17253, abgenommen 04.10.2026).
            Dieselben Knoten fuer beide: bis lg legt ein Zwei-Spalten-Grid
            Prioritaet und Status nach oben, Titel und Quelle in die Mitte,
            Markt und Frist nach unten; ab lg ordnet die Fuenf-Spalten-Zeile
            sie in DOM-Reihenfolge. So steht jede Pflicht genau einmal im
            Baum. Vorher galt das feste Fuenf-Spalten-Grid auf jeder Breite
            und brach Titel auf 390 px fast Buchstabe fuer Buchstabe um. Die
            Grenze ist lg, nicht md: auf 768 px bleiben der Pflicht-Spalte
            rund 100 px, die Titel brachen dort genauso. */}
          <div className={`${partial.length > 0 ? 'mt-5' : 'mt-12'} flex flex-col gap-3 lg:block lg:overflow-hidden lg:rounded-xl lg:border lg:border-stroke-subtle`}>
            <div className="hidden grid-cols-[100px_1fr_120px_110px_160px] gap-4 border-b border-stroke-subtle bg-surface-secondary px-6 py-3.5 text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary lg:grid">
              <span>{t('table.severity')}</span>
              <span>{t('table.obligation')}</span>
              <span>{t('table.market')}</span>
              <span>{t('table.due')}</span>
              <span className="text-right">{t('table.state')}</span>
            </div>
            {grouped.map((g) => (
              <Fragment key={g.key}>
                {g.label && (
                  <div className="flex items-baseline gap-2 pt-1 lg:border-b lg:border-stroke-subtle lg:bg-surface-secondary/40 lg:px-6 lg:py-2.5">
                    <span className="text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-secondary">{g.label}</span>
                    <span className="text-body-3xs text-fg-tertiary">{g.items.length}</span>
                  </div>
                )}
                {g.items.map(({ o }) => (
              <div
                key={o.title}
                data-testid="obligation-row"
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-2.5 rounded-xl border border-stroke-subtle bg-surface p-4 lg:grid-cols-[100px_1fr_120px_110px_160px] lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:border-b lg:px-6 lg:py-5 lg:transition-colors lg:last:border-b-0 lg:hover:bg-surface-secondary/50"
              >
                <span className="col-start-1 row-start-1 self-center lg:col-start-auto lg:row-start-auto">
                  <RiskBadge level={o.severity as RiskLevel} styleVariant="soft" size="sm">
                    {t(`severity.${o.severity}`, { defaultValue: o.severity.charAt(0).toUpperCase() + o.severity.slice(1) })}
                  </RiskBadge>
                </span>
                <span className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:row-start-auto">
                  <span className="block text-body-md font-bold text-fg">{o.title}</span>
                  {/* Source leads, penalty follows in a muted tone (Brand Map
                      §11: penalties are facts worth showing, but must not be the
                      first thing the eye lands on). Bis lg je eine Zeile (N1). */}
                  <span className="mt-1 block text-body-2xs leading-relaxed text-fg-brand lg:mt-0.5">
                    {o.sourceUrl ? (
                      <a
                        href={o.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        title={t('sourceLinkTitle', { defaultValue: 'Open the official text on EUR-Lex' })}
                      >
                        {o.sourceLabel} ↗
                      </a>
                    ) : o.law}
                    {(o.sourceUrl || o.law) && o.penalty && <span className="hidden lg:inline"> · </span>}
                    {o.penalty && <span className="mt-0.5 block text-fg-tertiary lg:mt-0 lg:inline">{o.penalty}</span>}
                  </span>
                </span>
                <span className="col-start-1 row-start-3 border-t border-stroke-subtle pt-2.5 text-body-sm text-fg-secondary lg:col-start-auto lg:row-start-auto lg:border-0 lg:pt-0">{o.market}</span>
                <span className="col-start-2 row-start-3 border-t border-stroke-subtle pt-2.5 text-right lg:col-start-auto lg:row-start-auto lg:border-0 lg:pt-0 lg:text-left">
                  <span className="text-body-sm font-semibold text-fg lg:block">{o.due}</span>
                  {o.dueSub && <span className="ml-1.5 text-body-2xs text-fg-tertiary lg:ml-0 lg:block">{o.dueSub}</span>}
                </span>
                <span className="col-start-2 row-start-1 flex justify-end lg:col-start-auto lg:row-start-auto">
                  <StatePill state={o.state} onAnswer={() => setSaveOpen(true)} />
                </span>
              </div>
                ))}
              </Fragment>
            ))}
          </div>

        {/* Partners matched — echte Treffer der Engine, sonst nichts.
            Die Karten bleiben gesperrt (Identitaet erst nach Registrierung),
            aber Anzahl und Match-Prozent sind die tatsaechlichen. Bei null
            Treffern gibt es keine Karten und keinen CTA: eine Registrierung,
            hinter der nichts wartet, ist kein Angebot (Checklist v1.0: "Zero,
            one, limited, and multiple match results use the correct singular
            or plural copy"). Solange die Engine noch nicht geantwortet hat,
            bleibt der Abschnitt leer statt etwas zu behaupten. */}
        {providersLive && (
          <div className="mt-16">
            {anonProviders.length === 0 ? (
              <p className="text-body-sm text-fg-secondary">{t('partners.none')}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">
                      {t('partners.eyebrow', { count: anonProviders.length })}
                    </span>
                    <h2 className="mt-2 font-serif text-[1.75rem] font-bold leading-tight text-fg">
                      {t('partners.title')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveOpen(true)}
                    className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand transition-colors hover:text-brand"
                  >
                    <Lock size={14} /> {t('partners.unlockCta')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  {anonProviders.slice(0, 3).map((p) => (
                    <div
                      key={p.public_ref}
                      data-testid="teaser-card"
                      className="flex flex-col items-center gap-4 rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-8"
                    >
                      <Lock size={22} className="text-fg-tertiary" />
                      <div className="w-full space-y-2">
                        <div className="mx-auto h-2.5 w-3/4 rounded-full bg-neutral-200" />
                        <div className="mx-auto h-2.5 w-1/2 rounded-full bg-neutral-200" />
                      </div>
                      <span className="text-body-md font-bold text-fg-brand">{t('partners.match', { pct: `${p.match}%` })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      )}

      {/* Save CTA band — nur mit Pflichten (s. o.) */}
      {isLive && (
        <section className="border-t border-stroke-subtle bg-surface-secondary py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <ShieldCheck size={26} className="mx-auto text-fg-brand" />
            <h2 className="mt-4 font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body-md leading-relaxed text-fg-secondary">
              {t('cta.body')}
            </p>
            <Button
              variant="primary"
              size="xl"
              shape="soft"
              type="button"
              onClick={() => setSaveOpen(true)}
              className="mt-8 shadow-[0_18px_34px_-14px_rgba(0,77,64,0.55)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              {t('cta.button')} <ArrowRight size={17} />
            </Button>
          </div>
        </section>
      )}

      {/* T3: unter md die Speichern-Leiste unten, volle Breite. Ohne den
          Ablauf-Hinweis daneben — der steht im Seitenkopf, damit aus der
          Information kein Druck am Knopf wird (DNA). */}
      {hasResult && (
        <div
          data-testid="save-bar-mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-stroke-subtle bg-surface/95 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-20px_rgba(2,22,17,0.25)] backdrop-blur-xl md:hidden"
        >
          <Button variant="primary" size="lg" shape="soft" type="button" onClick={() => setSaveOpen(true)} className="w-full">
            {t('topbar.saveMap')} <ArrowRight size={15} />
          </Button>
        </div>
      )}
      <FreeAccountDrawer open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}

/** Die Bussgeldzeile einer Pflicht auf der Risikokarte.
 *
 *  Bevorzugt die BELEGTE Obergrenze; der redaktionelle Satz ist nur noch der
 *  Rueckfall. Vorher waren es zwei unabhaengige Quellen zur selben Pflicht,
 *  und sie liefen auseinander, ohne dass es jemandem auffiel — bei der
 *  franzoesischen AGEC-Busse stand hier "up to EUR 30,000 per year", waehrend
 *  die belegte Obergrenze 7.500 EUR je Einheit ohne Deckel lautet.
 *
 *  Die Markenregel bleibt gewahrt: kein Geld in den Kopfzahlen, keine neue
 *  Stelle fuer Betraege. Es ist dieselbe Zeile wie bisher, nur belegt. */
function bussgeldZeile(
  l: { penalty?: string | null; penalty_key?: string | null; penalty_ceiling?: PenaltyCeiling | null },
  t: TFunction<['results', 'common']>,
  locale: string,
): string | null {
  const c = l.penalty_ceiling;
  if (!c) return l.penalty ? t('detail.penalty', { value: penaltyText(t, l.penalty_key, l.penalty) }) : null;

  const d = describeCeiling(c, locale);
  const wert =
    d.form === 'amount'
      ? d.amount
      : d.form === 'perUnit'
        ? t('common:compliance.area.ceiling.perUnit', {
            amount: d.amount,
            per: t(`common:compliance.area.ceiling.perKey.${d.per}`, { defaultValue: d.per }),
          })
        : d.form === 'proportional'
          ? t('common:compliance.area.ceiling.proportional', {
              percent: d.percent,
              of: t(`common:compliance.area.ceiling.ofKey.${d.of}`, { defaultValue: d.of }),
            })
          : d.form === 'turnover'
            ? d.orAmount
              ? t('common:compliance.area.ceiling.turnoverOr', { amount: d.orAmount, percent: d.percent })
              : t('common:compliance.area.ceiling.turnover', { percent: d.percent })
            : d.form === 'subnational'
              ? t('common:compliance.area.ceiling.subnational', {
                  level: t(`common:compliance.area.ceiling.levelKey.${d.level}`, { defaultValue: d.level }),
                })
              : d.form === 'delegated'
                ? t('common:compliance.area.ceiling.delegated')
                : d.form === 'none'
                  ? t('common:compliance.area.ceiling.none')
                  : t('common:compliance.area.ceiling.unlimited');
  return t('detail.penalty', { value: wert });
}
