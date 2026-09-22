import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useWizardDrawer } from '../../components/user/WizardDrawer';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { KpiRing, useEntered } from '../../components/ui/Stats';
import { SessionTile, type SessionSeverity } from '../../components/user/SessionTile';
import { SessionActionsDrawer, type SessionActionsTarget } from '../../components/user/SessionActionsDrawer';
import { AnswersDrawer } from '../../components/user/AnswersDrawer';
import { EmptyState } from '../../components/user/EmptyState';
import { fetchSessions, patchSession, type SessionRowData } from '../../api/sessions';
import { fetchDashboard, type DashboardData } from '../../api/dashboard';
import type { SearchProfile } from '../../components/wizard/WizardContext';
import { generateRiskMapPdf } from '../../lib/riskMapPdf';
import { liveObligations, riskMapStats, pdfObligations } from '../ResultsRiskMap';
import { runSearch } from '../../api/search';
import { Banner } from '../../components/ui/Banner';
import { DOMAINS } from '../../lib/domains';
import { SLUG_TO_I18N } from './AnfragenTab';

// ─── User Dashboard · Sessions v4 ────────────────────────────────────────────
// Canvas "Sitzungen als Kacheln", Nutzer-Wahl 2026-09-09 (1B · 2C · 3B · 4B · 5B),
// Vorgaben vom 2026-09-05: nur Kacheln, keine Listenansicht, kein "Als
// Variante kopieren" auf dieser Seite.
//   1B  Kopf mit LAGE-SATZ wie auf dem Dashboard: "3 Sitzungen · 2 mit hohem
//       Risiko · 26 offene Pflichten · 1 seit 3 Monaten nicht geprueft".
//       Darunter die Kennzahl-Ringe (gesetzt, unveraendert).
//   2C  GRUPPEN statt Filter: "Braucht Aufmerksamkeit" (hohes Risiko oder
//       veraltet), "Aktuell", "Archiviert" eingeklappt. Die Seite sortiert
//       selbst, was zuerst gelesen werden soll; nach Bereich filtern faellt weg.
//   3B  Dieselbe Kachel wie auf dem Dashboard (SessionTile): Titel + Risiko-Tag,
//       Bereichs-/Land-Chips, Balken mit "13 offen · von 14 Pflichten".
//   4B  ···-Menue in der Kachel (PDF exportieren · Umbenennen · Archivieren),
//       rechts "Oeffnen" als Knopf. Kopieren gibt es nur noch IN der Sitzung.
//   5B  Kein Warnband mehr. Die veraltete Kachel traegt die Marke
//       "Auffrischung noetig" und die Aktion "Antworten pruefen" — sie oeffnet
//       die Antworten-Schublade DIESER Sitzung statt eine neue anzulegen.
//
// Was die Seite vorher trug und jetzt nicht mehr: Listen/Kacheln-Umschalter,
// Bereichs-Chips, Verlauf-Rail, gelbes Alters-Band, "Erneut pruefen" (legte
// eine NEUE Sitzung an), "Als Variante kopieren" auf der Kachel.
//
// Daten: /sessions (alle Sitzungen, auch archivierte, mit Antworten) und
// /dashboard (Pflicht-Zahlen je aktiver Sitzung, serverseitig durch die
// Engine gerechnet). Fehlt das Dashboard — Gast, Aufruf gescheitert — zeigen
// die Kacheln keinen Balken und der Lage-Satz keine Pflichten; nichts wird
// erfunden.
//
// VERALTUNG: die Marke spricht ueber das ALTER der Sitzung — das weiss das
// System aus updated_at. Sie behauptet NICHT, dass sich Regeln geaendert
// haben; das koennte erst der Monitoring-Layer wissen (Doku: "Live News").
const STALE_DAYS = 90; // Annahme bis das Produkt eine eigene Frist setzt.

type Row = {
  id: string;
  label: string | null;
  cc: string | null;
  categories: string[];
  marketCount: number;
  severity: SessionSeverity;
  status: 'active' | 'archived';
  open: number | null;
  total: number | null;
  daysAgo: number;
  profile: Partial<SearchProfile>;
};

const HIGH = new Set<SessionSeverity>(['critical', 'high']);

function relTime(daysAgo: number, t: TFunction): string {
  if (daysAgo < 1) {
    const h = Math.max(1, Math.round(daysAgo * 24));
    return t('sessions.agoHours', { count: h });
  }
  if (daysAgo < 31) return t('sessions.agoDays', { count: Math.round(daysAgo) });
  return t('sessions.agoMonths', { count: Math.round(daysAgo / 30) });
}

type DashSession = DashboardData['sessions']['items'][number];

/** Sitzung + Dashboard-Zahlen → eine Kachel. Ohne Dashboard-Eintrag traegt
 *  das Risiko die risk_summary der Sitzung, die Pflicht-Zahlen bleiben leer. */
function toRow(s: SessionRowData, dash: DashSession | undefined): Row {
  const summary = (s.risk_summary?.level ?? 'low').toLowerCase();
  const fallback: SessionSeverity = summary === 'critical' ? 'critical' : summary === 'high' ? 'high' : summary === 'medium' ? 'medium' : 'low';
  const categories = s.categories ?? [];
  return {
    id: s.id,
    label: s.label,
    cc: s.country ? s.country.toUpperCase() : null,
    categories,
    marketCount: s.markets?.length || (s.country ? 1 : 0),
    severity: dash ? (dash.severity ?? 'low') : fallback,
    status: s.status === 'archived' ? 'archived' : 'active',
    open: dash ? dash.open : null,
    total: dash ? dash.total : null,
    daysAgo: (Date.now() - new Date(s.updated_at).getTime()) / 86_400_000,
    profile: {
      country: s.country ?? '',
      markets: s.markets ?? [],
      categories: categories as SearchProfile['categories'],
      ...(s.answers ?? {}),
    },
  };
}

export function SessionsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const { t: tResults } = useTranslation(['results', 'common']);
  const { openWizard } = useWizardDrawer();
  const locale = i18n.resolvedLanguage || 'en';
  const [live, setLive] = useState<Row[] | null>(null);
  const [openDuties, setOpenDuties] = useState<number | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<SessionActionsTarget | null>(null);
  const [answersFor, setAnswersFor] = useState<Row | null>(null);
  // Rueckmeldung zum PDF-Export einer Kachel: laeuft · nichts gefunden · gescheitert.
  const [exportNote, setExportNote] = useState<{ kind: 'busy' | 'none' | 'failed'; row: Row } | null>(null);
  const entered = useEntered();

  const domainLabel = (slug: string) => (SLUG_TO_I18N[slug] ? t(`domain.${SLUG_TO_I18N[slug]}`) : slug);
  /** Der Titel einer Sitzung: die eigene Bezeichnung, sonst Bereiche und Land. */
  const title = (r: Row) => r.label || [r.categories.map(domainLabel).join(', '), r.cc].filter(Boolean).join(' · ') || '—';

  const reload = useCallback(() => {
    const apply = (rows: SessionRowData[], dash: DashboardData) => {
      const byId = new Map(dash.sessions.items.map((d) => [d.id, d]));
      setLive(rows.map((r) => toRow(r, byId.get(r.id))));
      // Ohne Dashboard (Gast, Aufruf gescheitert) gibt es keine Pflicht-Summe.
      setOpenDuties(dash.sessions.items.length ? dash.obligations.open : null);
    };
    Promise.all([fetchSessions(), fetchDashboard()])
      .then(([rows, dash]) => apply(rows, dash))
      // Eine gescheiterte Anfrage ist ein LEERES Ergebnis, kein Dauerzustand
      // (Waechter-Test emptyState.guard: null = laedt, [] = nichts da).
      .catch(() => setLive([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const rows = live ?? [];
  const active = rows.filter((r) => r.status === 'active');
  const archived = rows.filter((r) => r.status === 'archived');
  const isStale = (r: Row) => r.daysAgo >= STALE_DAYS;
  const stale = active.filter(isStale);
  const byRisk = {
    high: active.filter((r) => HIGH.has(r.severity)).length,
    medium: active.filter((r) => r.severity === 'medium').length,
    low: active.filter((r) => r.severity === 'low').length,
  };
  const marketCount = new Set(active.map((r) => r.cc).filter(Boolean)).size;
  const staleMonths = Math.floor(STALE_DAYS / 30);

  // 2C: Gruppen. Innerhalb einer Gruppe zuletzt aktualisiert zuerst.
  const byRecent = (a: Row, b: Row) => a.daysAgo - b.daysAgo;
  const attention = active.filter((r) => HIGH.has(r.severity) || isStale(r)).sort(byRecent);
  const current = active.filter((r) => !attention.includes(r)).sort(byRecent);

  const openSession = (r: Row) => navigate(`/${locale}/results?session=${r.id}`);
  // Die PDF einer Sitzung ist die Risk Map DIESER Sitzung: dieselbe Abfrage wie
  // "Oeffnen" (/results?session=<id> fragt mit Land und Bereichen der Sitzung),
  // dieselbe Abbildung wie die Risk-Map-Seite (liveObligations & Co.).
  //
  // Bis 2026-09-22 stand hier die Design-Fixture: jede Kachel exportierte
  // dieselben acht erfundenen Pflichten und "3 Verified Providers ready", mit
  // dem Profil des letzten Wizard-Laufs aus dem localStorage als Kopfzeile —
  // ein Dokument ueber das Geschaeft des Nutzers, dessen Inhalt erfunden war.
  //
  // Antwortet die Engine nicht, gibt es keine PDF. Findet sie nichts, auch
  // nicht: eine leere Liste auf Papier liest sich als Entwarnung, und der Satz
  // "This does not mean that no obligations apply" gehoert dazu.
  const exportPdf = async (r: Row) => {
    setExportNote({ kind: 'busy', row: r });
    try {
      const res = await runSearch({ country: r.profile.country, categories: r.categories as SearchProfile['categories'] });
      const laws = (res.laws ?? []).filter((l) => l.severity);
      if (!laws.length) { setExportNote({ kind: 'none', row: r }); return; }
      const rows = liveObligations(laws, tResults, i18n.language, locale);
      await generateRiskMapPdf({
        profile: r.profile as SearchProfile,
        t: tResults,
        stats: riskMapStats(laws, rows.length, res.providers?.length ?? null)
          .map((s, i) => ({ value: s.value, label: tResults(`stats.${i}.label`, { defaultValue: s.label }) })),
        obligations: pdfObligations(rows, tResults),
      });
      setExportNote(null);
    } catch {
      setExportNote({ kind: 'failed', row: r });
    }
  };
  const restore = async (r: Row) => {
    try { await patchSession(r.id, { status: 'active' }); } catch { /* die Liste bleibt, wie sie war */ }
    reload();
  };
  const target = (r: Row, action: SessionActionsTarget['action']): SessionActionsTarget => ({
    id: r.id,
    title: title(r),
    domain: DOMAINS.find((d) => d.slug === r.categories[0])?.label ?? r.categories[0] ?? '',
    country: r.cc ?? '',
    action,
  });

  // 4B/5B: die Aktionen einer Kachel — ···-Menue links, Knoepfe rechts.
  const footer = (r: Row) => (
    <div className="mt-0.5 flex items-center justify-between gap-2">
      {r.status === 'archived' ? (
        <ActionMenu
          align="start"
          label={t('sessions.moreActions')}
          items={[{ label: t('sessions.restore'), onClick: () => { void restore(r); } }]}
        />
      ) : (
        <ActionMenu
          align="start"
          label={t('sessions.moreActions')}
          items={[
            { label: t('sessions.exportPdf'), onClick: () => { void exportPdf(r); } },
            { label: t('sessions.rename'), onClick: () => setActionsFor(target(r, 'rename')) },
            { label: t('sessions.archive'), danger: true, onClick: () => setActionsFor(target(r, 'archive')) },
          ]}
        />
      )}
      <span className="flex items-center gap-2">
        {r.status === 'active' && isStale(r) && (
          <Button size="sm" onClick={() => setAnswersFor(r)}>{t('sessions.checkAnswers')}</Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => openSession(r)}>{t('shared.open')}</Button>
      </span>
    </div>
  );

  const tile = (r: Row, i: number) => (
    <SessionTile
      key={r.id}
      title={title(r)}
      severity={r.severity}
      domains={r.categories.map(domainLabel)}
      country={r.cc}
      open={r.open}
      total={r.total}
      updatedLabel={relTime(r.daysAgo, t)}
      stale={r.status === 'active' && isStale(r)}
      archived={r.status === 'archived'}
      entered={entered}
      index={i}
      footer={footer(r)}
    />
  );

  if (live !== null && rows.length === 0) {
    return (
      <UserShell>
        <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
          <div className="mx-auto max-w-[1240px]">
            <h1 className="font-serif text-[23px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="sessions.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
            </h1>
            <EmptyState
              icon={FolderOpen}
              title={t('sessions.emptyTitle')}
              body={t('sessions.emptyBody')}
              cta={{ label: t('sessions.emptyCta'), onClick: () => openWizard() }}
              hint={t('sessions.emptyHint')}
              steps={[
                { title: t('sessions.emptyStep1Title'), body: t('sessions.emptyStep1Body') },
                { title: t('sessions.emptyStep2Title'), body: t('sessions.emptyStep2Body') },
                { title: t('sessions.emptyStep3Title'), body: t('sessions.emptyStep3Body') },
              ]}
            />
          </div>
        </div>
      </UserShell>
    );
  }

  // 1B: der Lage-Satz — nur Teile, die es gibt.
  const lage: ReactNode[] = [<span key="n">{t('sessions.lageSessions', { count: active.length })}</span>];
  if (byRisk.high > 0) lage.push(<strong key="h" className="text-[#8A3B3B] dark:text-[#F1A88C]">{t('sessions.lageHigh', { count: byRisk.high })}</strong>);
  if (openDuties !== null && openDuties > 0) lage.push(<span key="o">{t('sessions.lageOpen', { count: openDuties })}</span>);
  if (stale.length > 0) lage.push(<strong key="s" className="text-fg-accent-strong">{t('sessions.lageStale', { count: stale.length, months: staleMonths })}</strong>);

  return (
    <UserShell>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1240px]">
          {/* 1B · Kopf mit Lage-Satz */}
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-serif text-[23px] font-bold leading-tight text-fg">
                <Trans t={t} i18nKey="sessions.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
              </h1>
              <p className="mt-1.5 text-body-sm text-fg">
                {lage.map((part, i) => (
                  <span key={i}>{i > 0 && <span className="text-fg-tertiary"> · </span>}{part}</span>
                ))}
              </p>
            </div>
            <Button className="mt-0.5 shrink-0" onClick={() => openWizard()}>{t('shared.startNewSearch')}</Button>
          </div>

          {/* Kennzahl-Ringe wie auf dem Dashboard (Nutzer-Vorgabe 2026-09-05):
              ohne Karte, Zahl nur im Kreis. */}
          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-3">
            <KpiRing
              on={entered}
              title={t('sessions.kpiSaved')}
              value={active.length}
              sub={t('sessions.kpiSavedSub', { count: marketCount })}
              segs={active.length ? [
                { frac: byRisk.high / active.length, cls: 'text-risk-high' },
                { frac: byRisk.medium / active.length, cls: 'text-risk-medium' },
                { frac: byRisk.low / active.length, cls: 'text-risk-low' },
              ] : []}
            />
            <KpiRing
              on={entered}
              title={t('sessions.kpiRisk')}
              value={byRisk.high}
              sub={`${t('sessions.kpiRiskValue', { count: byRisk.high })} · ${t('sessions.kpiRiskSub', { medium: byRisk.medium, low: byRisk.low })}`}
              segs={active.length ? [{ frac: byRisk.high / active.length, cls: 'text-risk-high' }] : []}
            />
            <KpiRing
              on={entered}
              title={t('sessions.kpiStale')}
              value={stale.length}
              sub={stale.length ? t('sessions.kpiStaleSub', { count: Math.round(Math.max(...stale.map((s) => s.daysAgo)) / 30) }) : t('sessions.kpiStaleNone')}
              segs={active.length ? [{ frac: stale.length / active.length, cls: 'text-fg-accent' }] : []}
            />
          </div>

          {/* PDF-Export: abgenommene Zustands-Copy (Checklist v1.0). Alle drei
              Aussagen stimmen auf dieser Flaeche: "Try Again" wiederholt den
              Export, "Contact Support" fuehrt zur Kontaktseite, "Review My
              Answers" oeffnet die Antworten-Schublade dieser Sitzung. */}
          {exportNote && (
            <Banner
              className="mt-6"
              status={exportNote.kind === 'failed' ? 'error' : 'info'}
              title={t(`common:states.${exportNote.kind === 'busy' ? 'riskMapLoading' : exportNote.kind === 'none' ? 'noRequirements' : 'riskMapFailed'}.heading`)}
              onClose={exportNote.kind === 'busy' ? undefined : () => setExportNote(null)}
              action={
                exportNote.kind === 'failed' ? (
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { void exportPdf(exportNote.row); }}>{t('common:states.actions.tryAgain')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/${locale}/contact`)}>{t('common:states.actions.contactSupport')}</Button>
                  </span>
                ) : exportNote.kind === 'none' ? (
                  <Button size="sm" variant="secondary" onClick={() => { setAnswersFor(exportNote.row); setExportNote(null); }}>{t('common:states.actions.reviewMyAnswers')}</Button>
                ) : undefined
              }
            >
              {t(`common:states.${exportNote.kind === 'busy' ? 'riskMapLoading' : exportNote.kind === 'none' ? 'noRequirements' : 'riskMapFailed'}.message`)}
            </Banner>
          )}

          {/* 2C · Gruppen statt Filter */}
          {attention.length > 0 && (
            <section className="mt-7">
              <GroupHead label={t('sessions.groupAttention')} count={attention.length} tone="text-[#8A3B3B] dark:text-[#F1A88C]" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{attention.map(tile)}</div>
            </section>
          )}
          {current.length > 0 && (
            <section className="mt-7">
              <GroupHead label={t('sessions.groupCurrent')} count={current.length} tone="text-fg-secondary" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{current.map((r, i) => tile(r, attention.length + i))}</div>
            </section>
          )}
          {archived.length > 0 && (
            <section className="mt-7">
              <button
                type="button"
                aria-expanded={archivedOpen}
                onClick={() => setArchivedOpen((o) => !o)}
                className="mb-2.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.05em] text-fg-tertiary transition-colors hover:text-fg-secondary"
              >
                <ChevronRight size={13} strokeWidth={2.5} className={`transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
                {t('sessions.groupArchived')} · {archived.length}
              </button>
              {archivedOpen && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...archived].sort(byRecent).map((r, i) => tile(r, i))}</div>
              )}
            </section>
          )}
        </div>
      </div>
      <SessionActionsDrawer target={actionsFor} onClose={() => setActionsFor(null)} onChanged={reload} />
      {/* 5B: "Antworten pruefen" oeffnet die Antworten-Schublade DIESER Sitzung;
          nach dem Speichern laedt die Seite neu (Alter, Risiko, Zahlen). */}
      {answersFor && (
        <AnswersDrawer
          open
          onClose={() => setAnswersFor(null)}
          sessionId={answersFor.id}
          sessionLabel={title(answersFor)}
          profile={answersFor.profile}
          onSaved={reload}
        />
      )}
    </UserShell>
  );
}

function GroupHead({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <p className={`mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] ${tone}`}>
      {label} · {count}
    </p>
  );
}
