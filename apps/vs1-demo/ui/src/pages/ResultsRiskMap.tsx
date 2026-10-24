import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PenaltyCeiling } from '@complihub/compliance-engine';
import { describeCeiling, penaltyText } from '../lib/penaltyCeiling';
import { cadenceLabel, obligationLabel } from '../lib/obligationText';
import { saveWizardSession, fetchSessions, type SessionRowData } from '../api/sessions';
import { lawsOf, runSearch, type AnonProvider, type SearchCoverage, type SearchLaw } from '../api/search';
import { coverageGaps, isLimitedCoverage } from '../lib/matchState';
import { LimitedCoverageCard, OneMatchGuest, ProviderStateHead } from '../components/results/ProviderStates';
import { useApiData } from '../lib/useApiData';
import { referenceOf } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { FreeAccountDrawer } from '../components/home/MarketsDrawer';
import type { SearchProfile } from '../components/wizard/WizardContext';
import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { SessionSnapshot, type SnapshotRow } from '../components/user/SessionSnapshot';
import { ObligationClusters, settledByWizard, type ClusterRow } from '../components/results/ObligationClusters';
import { OutsideFitProviders, type OutsideProvider } from '../components/results/OutsideFitProviders';
import { AnswersDrawer } from '../components/user/AnswersDrawer';
import { MatchBasis } from '../components/user/PartnerCard';
import { PartnerDrawer } from '../components/user/PartnerDrawer';
import { loadBookingsByKey, type BookingByKey } from '../components/user/DomainProviders';
import { generateRiskMapPdf, type PdfObligation } from '../lib/riskMapPdf';
import {
  RiskMapStateHero,
  RiskMapDelayedCard,
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
  NoProviderMatchCard,
  NoProviderMatchGuest,
  NoVerifiedProvider,
  NotCheckedCard,
  NotCheckedRow,
  PartialMarketNotice,
  partialMarketsOf,
  unavailableMarketsOf,
  useCoverageRequest,
  useMarketRequests,
} from '../components/results/MarketRequest';
import { topMatches } from '../lib/topMatches';

/** J3: ab hier gilt das Laden als "laenger als erwartet" (Entscheidung 2026-10-09). */
const DELAYED_AFTER_MS = 8000;

// ─── Results · Risk Map · Figma 1667:215 ────────────────────────────────────
// The generated risk map shown after the wizard. A guest "map" — obligations
// table (severity · obligation · market · due · state), a locked Verified-Partner
// match strip, and a save-to-unlock CTA. Risk shown in the traffic-light tints.

type Severity = 'critical' | 'high' | 'medium' | 'low';
type State =
  | { kind: 'confirmed' }
  | { kind: 'likely' }
  // Wizard-Audit F1: nichts in den Antworten zeigt bisher, dass die Pflicht greift.
  | { kind: 'open' }
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
  /** Die Engine fuehrt fuer diese Pflicht KEINE Norm (scope 'placeholder').
   *  `law` traegt dann "Noch keine benannte Quelle", gedaempft und kursiv
   *  wie auf den Bereichsseiten — nie den zitatfoermigen Platzhalter. */
  noSource?: boolean;
  /** Die Bussgeld-Zeile allein. Mobil steht sie unter der Quelle (Canvas
   *  N1); `detail` bleibt fuer das PDF die zusammengesetzte Zeile. */
  penalty?: string;
  /** Was die Stufe traegt und was noch entscheidet (Engine evidence, F1). */
  supports?: string[];
  decides?: string[];
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
  // Fruehere API-Staende lieferten den Platzhalter noch als `source`; die
  // Pruefung haengt deshalb am Scope, nicht daran, dass `source` leer ist.
  const keineNorm = t('common:compliance.area.fact.noNamedSource', { defaultValue: 'No named source yet' });
  return laws.filter((l) => l.severity).map((l) => ({
    id: l.id,
    noSource: l.source_scope === 'placeholder' || undefined,
    severity: l.severity as Severity,
    // Der Engine-Titel ist englisch; die Sprachdateien fuehren ihn fuer alle
    // Pflichten (markets.obligations.<id>, Waechter: obligationText.test.ts).
    title: obligationLabel(t, l.id, l.title),
    // Rechtsgrundlage zuerst, Bußgeld danach. Das DNA-Addendum V2 verlangt,
    // dass Strafhöhen nicht der primäre Untertitel jeder Pflicht sind —
    // zugänglich bleiben sie, führend sind sie nicht mehr. Der Präfix war
    // ausserdem hartkodiertes Englisch ('Penalty:') im deutschen UI.
    // Die BELEGTE Obergrenze, wo es eine gibt — sonst der redaktionelle
    // Satz. Beide standen bisher nebeneinander in der Welt, ohne dass
    // etwas sie zusammenhielt: hier stand "up to EUR 30,000 per year",
    // waehrend die Obergrenze zu derselben Pflicht 7.500 EUR JE EINHEIT
    // lautete und keinen Deckel hat. Eine Quelle, ein Satz.
    detail: [l.source_url ? null : l.source_scope === 'placeholder' ? keineNorm : l.source, bussgeldZeile(l, t, lang)]
      .filter(Boolean)
      .join(' · '),
    sourceLabel: l.source_url ? (l.source ?? l.celex ?? undefined) : undefined,
    sourceUrl: l.source_url ?? undefined,
    market: l.markets && l.markets.length ? l.markets.join(' · ') : t('euWide'),
    // Die Norm im Klartext, wenn es keine verlinkbare Fundstelle gibt —
    // sonst stuende unter dem Titel nur der Markt (Befund 2026-09-05).
    law: l.source_url ? undefined : l.source_scope === 'placeholder' ? keineNorm : (l.source ?? undefined),
    penalty: bussgeldZeile(l, t, lang) ?? undefined,
    // A duty that has not started yet must not read "Ongoing · Live" — that
    // would tell the user they are already in breach. Until its start date
    // the Due cell shows that date plus the countdown; from the day it
    // applies the row silently reverts to its normal cadence.
    due: daysUntil(l.applies_from) != null
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
          .format(new Date(`${l.applies_from}T00:00:00`))
      : l.due === 'Ongoing' ? t('ongoing') : l.due ? cadenceLabel(t, l.due) : '—',
    dueSub: withinHorizon(l.applies_from) != null
      ? t('appliesIn', { count: withinHorizon(l.applies_from) as number, defaultValue: `applies in ${withinHorizon(l.applies_from)} days` })
      : daysUntil(l.applies_from) != null ? ''   // far future: the date says enough
      : l.due_days != null ? t('days', { count: l.due_days }) : l.due === 'Ongoing' ? t('dueLive', { defaultValue: 'Live' }) : '',
    dueDays: l.due_days ?? undefined,
    // Seit F1 (23.10.2026) beruht die Stufe auf den Antworten. Aeltere
    // Antworten ohne 'open' kennen nur confirmed/likely.
    state: { kind: l.state === 'confirmed' ? 'confirmed' : l.state === 'open' ? 'open' : 'likely' },
    supports: l.evidence?.supports ?? [],
    decides: l.evidence?.decides ?? [],
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
      : o.state.kind === 'open' ? t('state.open', { defaultValue: 'Open' })
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
  const { data: searchData, source: searchSource, loading: searchLoading, error: searchError } = useApiData<{ providers: AnonProvider[]; providersOutside: OutsideProvider[]; laws: SearchLaw[]; coverage?: SearchCoverage; session: SessionRowData | null; query: Parameters<typeof runSearch>[0] | null }>(async () => {
    let query: Parameters<typeof runSearch>[0] = profile ?? {};
    let session: SessionRowData | null = null;
    if (sessionId) {
      try {
        const s = (await fetchSessions()).find((x) => x.id === sessionId);
        // Mit den Zielmaerkten: bis 2026-10-10 suchte eine gespeicherte
        // Sitzung nur im Heimatmarkt — die Matrix "Limited coverage" (C2)
        // haette dann nur eine Spalte gekannt, und Pflichten der Zielmaerkte
        // fehlten, obwohl der Gast sie fuer dasselbe Profil sieht.
        // Mit den gespeicherten Antworten (D9, 24.10.2026): die Engine leitet
        // aus ihnen die Fakten ab (Operations-Karte, Wizard-v1a-details).
        // Ohne sie stand eine Pflicht, die der Gast als "confirmed" sah,
        // beim Wiederoeffnen wieder als "likely" da. Maerkte und Bereiche
        // kommen weiter aus den Spalten — die sind massgeblich.
        if (s) { session = s; query = { ...(s.answers ?? {}), country: s.country ?? 'DE', markets: s.markets ?? [], categories: s.categories as SearchProfile['categories'] }; }
      } catch { /* handled below */ }
      // Keine Sitzung geladen → Fehlerzustand, nicht das zuletzt lokal
      // gespeicherte Profil. Das gehoerte zu einer anderen Auswertung und
      // haette unter der Adresse dieser Sitzung fremde Ergebnisse gezeigt
      // (Wizard-Audit F4).
      if (!session) throw new Error('session unavailable');
    }
    const res = await runSearch(query);
    // Engine nicht gerechnet → riskMapFailed mit Referenz, nicht "keine
    // Pflichten" und auch keine Anbieter ohne die Pflichten dazu.
    const laws = lawsOf(res);
    return { providers: res.providers, providersOutside: res.providers_outside ?? [], laws, coverage: res.coverage, session, query };
  }, { providers: [], providersOutside: [], laws: [], session: null, query: null }, [sessionId, reloadKey]);
  // Anbieter zaehlen nur, wenn die Engine sie geliefert hat. Bis 2026-09-22
  // stand hier beim Laden und bei einem API-Fehler eine Design-Fixture mit drei
  // erfundenen Anbietern (100/87/73 %); sie haette einem Nutzer ohne einen
  // einzigen passenden Anbieter drei gezeigt (Entscheidung 2026-09-22,
  // "echte Zahl"; DNA §4.5 "Never give false reassurance").
  const providersLive = searchSource === 'api';
  const anonProviders = providersLive ? searchData.providers : [];
  // F2 (Wizard-Audit, 23.10.2026): kommt nur, wenn niemand einen angefragten
  // Bereich abdeckt. Ohne Match-Prozent, getrennt unter der Luecke.
  const outsideProviders = providersLive && anonProviders.length === 0 ? searchData.providersOutside : [];

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
  // J3: nach ~8 s ohne Ergebnis wechselt der Ladezustand — aber nur, wenn die
  // Antworten nachweislich gespeichert sind. Sonst bleibt es beim Laden; ein
  // gescheitertes Laden zeigt riskMapFailed.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (pageState !== 'loading') return;
    const timer = setTimeout(() => setSlow(true), DELAYED_AFTER_MS);
    return () => clearTimeout(timer);
  }, [pageState, reloadKey]);

  // Wave A1: arriving from the wizard persists the session (the editable
  // dossier). Guest-anchored via guest_key; fire-and-forget — the page renders
  // regardless, and a failed save just means no resume anchor.
  //
  // J3 (Canvas 09.10.2026): seit 2026-10-10 wird das Speichern abgewartet und
  // sein Ausgang gemerkt — "Your answers are saved" im Zustand riskMapDelayed
  // darf nur stehen, wenn es stimmt. Die Seite rendert weiter sofort.
  const savedRef = useRef(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  useEffect(() => {
    // Eine geoeffnete Sitzung ist schon gespeichert. Ohne diese Sperre legte
    // jedes Oeffnen aus dem Workspace das alte lokale Profil als neue Sitzung
    // an (Wizard-Audit F4).
    if (!profile || savedRef.current || sessionId) return;
    savedRef.current = true;
    localStorage.setItem('ch360_last_profile', JSON.stringify(profile));
    setSaveState('saving');
    saveWizardSession(profile)
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('failed')); /* offline/demo — kein Anker, kein "saved" */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Antworten gelten als gespeichert, wenn das Speichern bestaetigt ist oder
  // die Suche aus einer gespeicherten Sitzung kommt.
  const answersSaved = saveState === 'saved' || !!sessionId;
  const delayed = pageState === 'loading' && slow && answersSaved;

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
  // Entscheidung a (11.10.2026), Canvas P1 · Q1: ein gepruefter Markt ohne
  // freigegebenen Anbieter. Ausgeloest aus den Abdeckungsdaten der Suche
  // (coverage), nicht aus der Laenderliste der Engine — die kennt den Markt
  // ja. Aeltere Antworten ohne coverage: der gepruefte Umfang aus dem Profil.
  const noProviderMatch = providersLive && (pageState === 'live' || pageState === 'none') && !marketUnavailable && anonProviders.length === 0;
  const noMatchGaps = useMemo(() => {
    if (!noProviderMatch) return [];
    const fromCoverage = coverageGaps(searchData.coverage);
    if (fromCoverage.length) return fromCoverage;
    const scope = scopeProfile ? scopeOf(scopeProfile, 'checked') : null;
    return scope && scope.areas.length ? scope.markets.map((m) => ({ market: m, areas: scope.areas })) : [];
  }, [noProviderMatch, searchData.coverage, scopeProfile]);
  const coverageRequest = useCoverageRequest(noMatchGaps, !user);
  // Der Block nennt den Markt der Suche und die angefragten Bereiche, die
  // keiner dieser Anbieter abdeckt. "View profile" nur mit Konto (das Profil
  // liegt hinter dem Login); fit=outside blendet dort die Buchung aus.
  const outsideBlock = (stacked: boolean) => outsideProviders.length > 0 && !marketUnavailable ? (
    <OutsideFitProviders
      providers={outsideProviders}
      requested={(scopeProfile?.categories ?? []) as string[]}
      market={scopeProfile?.country ?? ''}
      stacked={stacked}
      onViewProfile={user ? (ref) => {
        const q = new URLSearchParams({ fit: 'outside' });
        const need = (scopeProfile?.categories ?? []) as string[];
        if (need.length) q.set('need', need.join(','));
        if (sessionId) q.set('session', sessionId);
        navigate(`/${locale}/p/${ref}?${q.toString()}`);
      } : undefined}
    />
  ) : null;
  // Entscheidung c (11.10.2026), Canvas S1: "begrenzt" auch fuer Gaeste.
  const guestLimited = !user && providersLive && anonProviders.length > 0 && isLimitedCoverage(anonProviders.length, searchData.coverage);
  // Die Engine hat geantwortet — mit oder ohne Pflichten. Nur dann gibt es
  // eine Map, die man speichern kann, und eine Aussage "what applies to you".
  const hasResult = pageState === 'live' || pageState === 'none';
  const rows: Obligation[] = isLive ? liveObligations(liveLaws, t, i18n.language, locale) : [];
  // F1: Stufe je Pflicht aus den Antworten. Aeltere Zustaende ('answer')
  // zaehlen als offen — sie sind ebenfalls noch keine Aussage.
  const evidenceOf = (o: Obligation): 'confirmed' | 'likely' | 'open' =>
    o.state.kind === 'confirmed' ? 'confirmed' : o.state.kind === 'likely' ? 'likely' : 'open';
  const clusterRows: ClusterRow[] = rows.map((o) => ({
    title: o.title, severity: o.severity, market: o.market, due: o.due, dueSub: o.dueSub,
    sourceLabel: o.sourceLabel, sourceUrl: o.sourceUrl, law: o.law, noSource: o.noSource, penalty: o.penalty,
    radar: o.radar, evidence: evidenceOf(o), supports: o.supports ?? [], decides: o.decides ?? [],
  }));
  const evidenceCounts = {
    confirmed: clusterRows.filter((r) => r.evidence === 'confirmed').length,
    likely: clusterRows.filter((r) => r.evidence === 'likely').length,
    open: clusterRows.filter((r) => r.evidence === 'open').length,
  };

  // Reihenfolge der Engine; Gruppierung nach Beleg macht ObligationClusters.
  const indexed = rows.map((o, i) => ({ o, i }));

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
  // Checklist v1.0: "one … returns the singular" — auch in der Leiste: bis
  // 2026-10-10 stand hier "1 Verified Providers ready". Zahlwerte zaehlen,
  // "21 days" nicht.
  const statLabel = (i: number, s: { value: string | number; label: string }) => {
    const n = /^\d+$/.test(String(s.value)) ? Number(s.value) : undefined;
    return t(`stats.${i}.label`, n === undefined ? { defaultValue: s.label } : { defaultValue: s.label, count: n });
  };
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
  // 5B: Gezaehlt wird nur, was der Knopf auch erreicht — mit gespeicherter
  // Sitzung die Antworten-Schublade (ohne die Wizard-v1a-Fragen), sonst der
  // volle Wizard.
  const settles = settledByWizard(clusterRows, { fullWizard: !canReviewAnswers, profile: searchData.query });

  // Zurueck zur Marktwahl: mit gespeicherter Sitzung die Antworten-Schublade,
  // sonst der Wizard (wie "Edit answers" im Snapshot).
  const exploreOtherMarkets = () => (canReviewAnswers ? setAnswersOpen(true) : navigate(`/${locale}/wizard`));

  const stateKey = marketUnavailable ? 'marketUnavailable'
    : pageState === 'none' ? 'noRequirements'
    : pageState === 'loading' ? (delayed ? 'riskMapDelayed' : 'riskMapLoading')
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
        ) : delayed ? (
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
              {t('common:states.actions.tryAgain')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => (canReviewAnswers ? setAnswersOpen(true) : navigate(`/${locale}/wizard`))}>
              {t('common:states.actions.returnToAssessment')}
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
    // Die Sitzungsansicht fuehrt Ungeklaertes schon als eigene Gruppe
    // ("Erst zu klaeren"); eine offene Pflicht gehoert genau dorthin.
    state: o.state.kind === 'open' ? { kind: 'answer', count: Math.max(1, o.decides?.length ?? 0) } : o.state,
    sourceLabel: o.sourceLabel,
    sourceUrl: o.sourceUrl,
    sourceText: o.sourceUrl ? undefined : o.law,
  }));

  const exportPdf = async () => {
    if (!stats) return;
    await generateRiskMapPdf({
      profile: profile ?? null,
      t,
      stats: stats.map((s2, i) => ({ value: s2.value, label: statLabel(i, s2) })),
      obligations: pdfObligations(rows, t),
    });
  };

  // A1 · C2 (Canvas 09.10.2026, Figma 3634:2867 / 3634:2989): ueber den
  // Anbieter-Karten mit Konto. Begrenzt geht vor — dann sagt die Matrix, wo
  // es fehlt; sonst der Kopf im Singular oder Plural. Ohne Treffer nichts
  // (dort steht noProviderMatch bzw. partners.none).
  const shownProviders = marketUnavailable ? [] : anonProviders;
  const providerHead = !providersLive || shownProviders.length === 0 ? null
    : searchData.coverage && isLimitedCoverage(shownProviders.length, searchData.coverage) ? (
      <LimitedCoverageCard
        coverage={searchData.coverage}
        asGuest={!user}
        onReviewMatch={() => setPartnerOpen(shownProviders[0])}
      />
    ) : <ProviderStateHead count={shownProviders.length} />;

  if (isLoggedIn) {
    const notAnswer = (o: Obligation) => o.state.kind !== 'answer' && o.state.kind !== 'open';
    const critical = rows.filter((o) => notAnswer(o) && o.severity === 'critical').length;
    const high = rows.filter((o) => notAnswer(o) && o.severity === 'high').length;
    const open = rows.filter((o) => o.state.kind === 'answer' || o.state.kind === 'open').length;
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
        // Hoechstens drei Karten, volle Treffer zuerst (Nutzer 23.10.2026,
        // lib/topMatches). Die Ueberschrift zaehlt weiter alle Treffer.
        providers={marketUnavailable ? [] : topMatches(anonProviders)}
        providersEmptyState={marketUnavailable ? <NoVerifiedProvider /> : noProviderMatch && noMatchGaps.length ? (
          <>
            <NoProviderMatchCard
              gaps={noMatchGaps}
              email={user?.email ?? null}
              status={coverageRequest.status}
              onRequest={(notify) => coverageRequest.send(notify)}
            />
            {outsideBlock(true)}
          </>
        ) : outsideBlock(true) ?? undefined}
        // K3 (01.10.2026): der ungepruefte Markt steht oben in der Spalte,
        // die Anbieter fuer die geprueften Maerkte bleiben darunter.
        providersTop={partial.length > 0 || providerHead ? (
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
            {providerHead}
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
            sessionMessage={session?.label ? t('schedule.messageFromRiskMap', { riskMap: session.label }) : undefined}
            sessionLabel={session?.label ?? null}
            requestScope={scopeProfile ? scopeOf(scopeProfile, 'checked') : null}
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
      {!isLive && delayed && (
        <main className="mx-auto flex w-full max-w-container-3xl flex-col items-center px-4 pb-20 pt-12 md:px-8 lg:px-16">
          <RiskMapDelayedCard
            markets={scopeProfile ? scopeOf(scopeProfile, 'requested').markets : []}
            areas={requestAreas}
            onTryAgain={() => setReloadKey((k) => k + 1)}
            onReturn={() => navigate(`/${locale}/wizard`)}
          />
        </main>
      )}
      {!isLive && stateKey && !delayed && (
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
          {/* 3C: die Ueberschrift sagt nur, was die Antworten tragen. */}
          <h1 className="mt-3 font-serif text-[2.75rem] font-bold leading-[1.05] tracking-tight text-fg sm:text-[3.25rem]">
            {evidenceCounts.confirmed > 0
              ? [t('header.titleConfirmed', { count: evidenceCounts.confirmed }),
                 evidenceCounts.likely + evidenceCounts.open > 0 ? t('header.titleMore', { count: evidenceCounts.likely + evidenceCounts.open }) : null]
                  .filter(Boolean).join(' ')
              : t('header.titleNoneConfirmed')}
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
          {rows.length > 0 && evidenceCounts.likely + evidenceCounts.open > 0 && (
            <p className="mt-1 text-body-md leading-relaxed text-fg-secondary">
              {evidenceCounts.likely && evidenceCounts.open
                ? t('header.evidenceCounts', { likely: evidenceCounts.likely, open: evidenceCounts.open })
                : evidenceCounts.likely
                  ? t('header.evidenceOnlyLikely', { count: evidenceCounts.likely })
                  : t('header.evidenceOnlyOpen', { count: evidenceCounts.open })}
            </p>
          )}
          <GuestExpiryNote />
        </div>

        {/* Stat strip — nur, wenn die Engine geantwortet hat */}
        {stats && (
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-between gap-y-4 rounded-xl border border-stroke-subtle bg-surface px-8 py-6 shadow-[0_18px_44px_-32px_rgba(2,22,17,0.3)]">
            {/* F1: die Gesamtzahl steht nicht mehr hier — die Ueberschrift
                nennt, was feststeht, und die Cards zaehlen je Stufe. */}
            {stats.map((s, i) => i === 0 ? null : (
              <div key={s.label} className="flex items-center">
                {i > 1 && <span className="mr-8 hidden h-8 w-px bg-stroke-subtle sm:block" />}
                <span className="text-[1.5rem] font-bold text-fg">
                  {s.days != null ? t('days', { count: s.days }) : s.value || t('ongoing')}
                </span>
                <span className="ml-2 text-body-sm text-fg-secondary">{statLabel(i, s)}</span>
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

        {/* 5B (Canvas 23.10.2026): ein ruhiger Hinweis, nur wenn eine Antwort
            im heutigen Wizard wirklich etwas klaert. Fragen, die der Wizard
            noch nicht stellt, verspricht er nicht. */}
        {settles > 0 && (
          <div className="mt-10 flex flex-col gap-4 rounded-md bg-brand-light px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-md font-semibold text-fg">{t('hint.title')}</p>
              <p className="mt-0.5 text-body-sm text-fg-secondary">{t('hint.message', { count: settles })}</p>
            </div>
            <Button
              size="md"
              className="shrink-0"
              onClick={() => (canReviewAnswers ? setAnswersOpen(true) : navigate(`/${locale}/wizard?refine=1`))}
            >
              {t('hint.cta')}
            </Button>
          </div>
        )}

        {/* 4A · 1C · 2B (Canvas 23.10.2026, Figma 3881:6782): die Pflichten
            nach Beleg in drei auf- und zuklappbaren Cards. Die Stufe steht im
            Kartenkopf, nicht mehr als Spalte. */}
        <div className={`${partial.length > 0 || settles > 0 ? 'mt-5' : 'mt-12'}`}>
          <ObligationClusters rows={clusterRows} />
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
              noMatchGaps.length ? (
                // P1 (Figma 3693:4040): abgenommener Zustand statt "No provider
                // covers this area yet."
                <div className="flex flex-col gap-8">
                  <NoProviderMatchGuest gaps={noMatchGaps} status={coverageRequest.status} onRequest={() => coverageRequest.send(false)} />
                  {/* F2 (Figma 3894:3): Anbieter ohne Passung, anfangs zu. */}
                  {outsideBlock(false)}
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  <p className="text-body-sm text-fg-secondary">{t('partners.none')}</p>
                  {outsideBlock(false)}
                </div>
              )
            ) : anonProviders.length === 1 ? (
              // B3 (Canvas 09.10.2026, Figma 3634:2931): ein Treffer im
              // Singular, die Fakten offen, Name und Kontakt nicht.
              <div className="flex flex-col gap-5">
                <OneMatchGuest
                  provider={anonProviders[0]}
                  requestedMarkets={searchData.coverage?.markets ?? (scopeProfile ? scopeOf(scopeProfile, 'checked').markets : [])}
                  onReview={() => setSaveOpen(true)}
                />
                {guestLimited && searchData.coverage && (
                  <div className="lg:max-w-[360px] lg:self-end">
                    <LimitedCoverageCard coverage={searchData.coverage} asGuest onReviewMatch={() => setSaveOpen(true)} />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-[720px]">
                    <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">
                      {t('partners.eyebrow', { count: anonProviders.length })}
                    </span>
                    {/* A1 fuer Gaeste: der abgenommene Kopf ueber den gesperrten
                        Karten. Der Knopf rechts bleibt "… with a free account" —
                        er sagt ehrlich, dass ein Konto noetig ist. */}
                    <h2 className="mt-2 font-serif text-[1.75rem] font-bold leading-tight text-fg">
                      {t('common:states.multipleProviderMatches.heading')}
                    </h2>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-fg-secondary">
                      {t('common:states.multipleProviderMatches.message')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveOpen(true)}
                    className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand transition-colors hover:text-brand"
                  >
                    <Lock size={14} /> {t('partners.unlockCta')} <ArrowRight size={14} />
                  </button>
                </div>

                {/* S1 (Figma 3693:4204): begrenzte Abdeckung auch fuer Gaeste —
                    dieselbe Matrix-Karte wie mit Konto (C2), neben den Teasern. */}
                <div className={guestLimited ? 'mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]' : 'mt-6'}>
                <div className="grid gap-5 sm:grid-cols-3">
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
                {guestLimited && searchData.coverage && (
                  <LimitedCoverageCard coverage={searchData.coverage} asGuest onReviewMatch={() => setSaveOpen(true)} />
                )}
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
              // wrap (A11y-Audit 23.10.2026, Reflow 320 px): "Kostenloses Konto
              // erstellen" in xl lief 12 px ueber den Rand.
              wrap
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
