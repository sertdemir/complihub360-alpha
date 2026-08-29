import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, TriangleAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { UserShell } from '../../components/user/UserShell';
import { Button } from '../../components/ui/Button';
import { Segment } from '../../components/compliance-areas';
import { Donut, SparkBars, KpiCard, useEntered, useCountUp, EASE } from '../../components/ui/Stats';
import { SessionActionsDrawer, type SessionActionsTarget } from '../../components/user/SessionActionsDrawer';
import { fetchSessions, type SessionRowData } from '../../api/sessions';
import { generateRiskMapPdf } from '../../lib/riskMapPdf';
import { OBLIGATIONS, STATS } from '../ResultsRiskMap';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── User Dashboard · Sessions v3 ────────────────────────────────────────────
// Canvas "Sitzungen-Seite", Gesamt · G2 (Nutzer-Wahl 2026-08-29): Kopf mit
// Kennzahlen (S1-B), Alters-Band (S6-A), Zeilen links + Verlauf-Rail rechts,
// umschaltbar auf Kacheln. Gradient-Grund und weisse Karten wie das Dashboard.
//
// Was die Seite vorher trug und jetzt nicht mehr:
// - Englische Fixture-Texte mitten im deutschen UI ("Updated 2h ago",
//   "High risk · threshold reached · 1 markets") — die Zeilen bauen ihre
//   Meta-Zeile jetzt aus uebersetzten Bausteinen.
// - "1 markets": Markt- und Pflichtzahlen sind dekliniert (i18n-Plural).
// - Das langgezogene Karten-Layout mit grossen leeren Laenderkreisen.
//
// VERALTUNG (Nutzer-Entscheidung, Variante A): Das Band spricht ueber das
// ALTER der Sitzung — das weiss das System aus updated_at. Es behauptet NICHT,
// dass sich Regeln geaendert haben; das koennte erst der Monitoring-Layer
// wissen (Doku: "Live News", Phase 2, Milestone D, Quelle noch offen).
// "Erneut pruefen" fuehrt in den Assistenten, der die Antworten neu durchlaeuft.
const STALE_DAYS = 90; // Annahme bis das Produkt eine eigene Frist setzt.

// ─── Design-Fixture ──────────────────────────────────────────────────────────
// daysAgo statt fertiger Strings: daraus entstehen Zeitangabe UND Veraltung,
// sonst widerspraechen sich Band und Zeilen ("vor 2 Std." vs "3 Monate alt").
type Row = {
  id?: string;
  cc: string; domain: string; title: string;
  risk: 'high' | 'medium' | 'low'; note: string;
  markets: number; duties: number; frac: number; daysAgo: number;
};

const SESSIONS: Row[] = [
  { cc: 'IT', domain: 'Tax & VAT', title: 'VAT registration · Italien', risk: 'high', note: 'Schwelle erreicht', markets: 1, duties: 5, frac: 0.8, daysAgo: 0.08 },
  { cc: 'FR', domain: 'EPR & Packaging', title: 'EPR registration · Frankreich', risk: 'medium', note: 'Frist Q3 2026', markets: 1, duties: 3, frac: 0.55, daysAgo: 1 },
  { cc: 'UK', domain: 'Data & Privacy', title: 'GDPR audit & DPA review', risk: 'high', note: 'Cookie-Consent', markets: 1, duties: 3, frac: 0.7, daysAgo: 3 },
  { cc: 'ES', domain: 'Tax & VAT', title: 'VAT thresholds · Spanien', risk: 'low', note: 'nur Beobachtung', markets: 1, duties: 1, frac: 0.25, daysAgo: 7 },
  { cc: 'DE', domain: 'Data & Privacy', title: 'Cookie-Consent einrichten', risk: 'medium', note: 'Prüfung offen', markets: 1, duties: 2, frac: 0.5, daysAgo: 104 },
  { cc: 'DE', domain: 'Tax & VAT', title: 'USt-Fahrplan · EU-weit', risk: 'low', note: 'erfüllt', markets: 4, duties: 2, frac: 0.2, daysAgo: 131 },
];

const DOMAIN_LABEL: Record<string, string> = {
  vat: 'Tax & VAT', tax: 'Tax & VAT',
  privacy: 'Data & Privacy', gdpr: 'Data & Privacy', data: 'Data & Privacy',
  epr: 'EPR & Packaging', packaging: 'EPR & Packaging',
  'tax-vat': 'Tax & VAT', 'product-packaging': 'EPR & Packaging', 'data-privacy': 'Data & Privacy',
  'marketing-seo': 'Marketing Compliance', 'corporate-structure': 'Corporate & Structure',
  'product-compliance': 'Product Compliance', 'logistics-customs': 'Logistics & Customs',
  'legal-advisory': 'Legal Advisory',
};

const RISK_TEXT = { high: 'text-risk-high', medium: 'text-risk-medium', low: 'text-risk-low' } as const;
const RISK_BG = { high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low' } as const;

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';
const LINK = 'text-body-3xs font-bold text-brand underline underline-offset-2 transition-colors hover:text-brand-700';
const TAG = 'inline-flex rounded-md bg-brand-light px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-brand';
// Theme-festes Gold-Rezept wie die Status-Pills der RequestCard —
// bg-warning-bg blieb im Dark Mode hell und frass die Schrift.
const TAG_STALE = 'inline-flex rounded-md border border-[#d4af37]/35 bg-[#d4af37]/10 px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40';

function relTime(daysAgo: number, t: TFunction): string {
  if (daysAgo < 1) {
    const h = Math.max(1, Math.round(daysAgo * 24));
    return t('sessions.agoHours', { count: h });
  }
  if (daysAgo < 31) return t('sessions.agoDays', { count: Math.round(daysAgo) });
  return t('sessions.agoMonths', { count: Math.round(daysAgo / 30) });
}

function toRow(s: SessionRowData): Row {
  const cat = s.categories?.[0] ?? 'compliance';
  const level = (s.risk_summary?.level ?? 'low').toLowerCase();
  return {
    id: s.id,
    cc: (s.country ?? '—').toUpperCase(),
    domain: DOMAIN_LABEL[cat.toLowerCase()] ?? cat.replace(/^./, (c) => c.toUpperCase()),
    title: s.label || `${cat} · ${(s.country ?? '').toUpperCase()}`,
    risk: level === 'high' ? 'high' : level === 'medium' ? 'medium' : 'low',
    note: s.risk_summary?.note ?? '',
    markets: s.markets?.length || 1,
    duties: 0,
    frac: level === 'high' ? 0.8 : level === 'medium' ? 0.5 : 0.25,
    daysAgo: (Date.now() - new Date(s.updated_at).getTime()) / 86_400_000,
  };
}

export function SessionsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const { t: tResults } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const [live, setLive] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'list' | 'tiles'>('list');
  const [selected, setSelected] = useState(0);
  const [actionsFor, setActionsFor] = useState<SessionActionsTarget | null>(null);
  const entered = useEntered();

  const tDomain = (label: string) => (DOMAIN_I18N_KEY[label] ? t(`domain.${DOMAIN_I18N_KEY[label]}`) : label);

  const reload = useCallback(() => {
    fetchSessions()
      .then((rows) => setLive(rows.filter((r) => r.status === 'active').map(toRow)))
      .catch(() => { /* Fixture behalten */ });
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const rows = live && live.length > 0 ? live : SESSIONS;
  const stale = rows.filter((r) => r.daysAgo >= STALE_DAYS);
  const byRisk = {
    high: rows.filter((r) => r.risk === 'high').length,
    medium: rows.filter((r) => r.risk === 'medium').length,
    low: rows.filter((r) => r.risk === 'low').length,
  };
  const marketCount = new Set(rows.map((r) => r.cc)).size;

  const nSessions = useCountUp(rows.length, entered);
  const nStale = useCountUp(stale.length, entered);

  const FILTERS = useMemo(() => [
    { key: 'all', label: t('sessions.filterAll', { count: rows.length }), match: () => true },
    ...['Tax & VAT', 'Data & Privacy', 'EPR & Packaging']
      .filter((d) => rows.some((s) => s.domain === d))
      .map((d) => ({
        key: d,
        label: `${tDomain(d)} · ${rows.filter((s) => s.domain === d).length}`,
        match: (s: Row) => s.domain === d,
      })),
  ], [rows, t, i18n.resolvedLanguage]);
  const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
  const list = rows.filter(match);
  const current = list[Math.min(selected, list.length - 1)] ?? list[0];

  const openSession = (r: Row) =>
    navigate(`/${locale}/results${r.id && !r.id.startsWith('fx') ? `?session=${r.id}` : ''}`);
  // Derselbe PII-freie Schnappschuss wie auf /results und im Dashboard.
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
  // "Erneut pruefen" laeuft die gespeicherten Antworten neu durch — es gibt
  // keinen Neuberechnungs-Endpunkt, der Assistent IST der ehrliche Weg dahin.
  const recheck = () => navigate(`/${locale}/wizard`);

  const metaLine = (r: Row) => (
    <span className={`text-body-4xs font-semibold ${RISK_TEXT[r.risk]}`}>
      ● {t(`sessions.risk.${r.risk}`)}{r.note ? ` · ${r.note}` : ''} · {t('sessions.markets', { count: r.markets })}
    </span>
  );

  return (
    <UserShell>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <div className="mx-auto max-w-[1240px]">
          {/* S1-B · Kopf mit Kennzahlen */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-serif text-[23px] font-bold leading-tight text-fg">
                <Trans t={t} i18nKey="sessions.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
              </h1>
              <p className="mt-1 text-body-2xs text-fg-tertiary">
                {t('sessions.subSaved', { count: rows.length })}
                {stale.length > 0 && ` · ${t('sessions.subStale', { count: stale.length })}`}
              </p>
            </div>
            <Button className="mt-0.5 shrink-0" onClick={() => navigate(`/${locale}/wizard`)}>{t('shared.startNewSearch')}</Button>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <KpiCard title={t('sessions.kpiSaved')} big={String(nSessions)} sub={t('sessions.kpiSavedSub', { count: marketCount })}>
              <SparkBars on={entered} vals={[byRisk.high, byRisk.medium, byRisk.low]} />
            </KpiCard>
            <KpiCard title={t('sessions.kpiRisk')} big={t('sessions.kpiRiskValue', { count: byRisk.high })} sub={t('sessions.kpiRiskSub', { medium: byRisk.medium, low: byRisk.low })}>
              <Donut
                on={entered}
                center={String(rows.length)}
                segs={[
                  { frac: byRisk.high / rows.length, cls: 'text-risk-high' },
                  { frac: byRisk.medium / rows.length, cls: 'text-risk-medium' },
                  { frac: byRisk.low / rows.length, cls: 'text-risk-low' },
                ]}
              />
            </KpiCard>
            <KpiCard title={t('sessions.kpiStale')} big={String(nStale)} sub={stale.length ? t('sessions.kpiStaleSub', { count: Math.round(Math.max(...stale.map((s) => s.daysAgo)) / 30) }) : t('sessions.kpiStaleNone')}>
              <Donut on={entered} center={String(stale.length)} segs={[{ frac: stale.length / rows.length, cls: 'text-fg-accent' }]} />
            </KpiCard>
          </div>

          {/* S6-A · Alters-Band: spricht ueber das Alter, nicht ueber Regeln */}
          {stale.length > 0 && (
            <div className="mt-[18px] flex items-center gap-3.5 rounded-xl border border-warning-500/45 border-l-4 border-l-risk-medium bg-warning-bg px-5 py-3.5">
              {/* Icon ohne Flaeche, dafuer in voller Groesse (Nutzer-Vorgabe) */}
              <TriangleAlert size={26} strokeWidth={1.9} className="shrink-0 text-risk-medium" />
              <div className="min-w-0 flex-1">
                <p className="text-body-xs font-extrabold text-warning-700">
                  {t('sessions.staleTitle', { count: stale.length, months: Math.floor(STALE_DAYS / 30) })}
                </p>
                <p className="mt-0.5 text-body-xs text-warning-700">
                  {stale.map((s) => `${s.title.split(' · ').pop()} (${relTime(s.daysAgo, t)})`).join(' · ')} — {t('sessions.staleBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={recheck}
                className="shrink-0 rounded-lg bg-risk-medium px-3.5 py-2 text-body-2xs font-bold text-white transition-colors hover:bg-risk-on-medium"
              >
                {t('sessions.staleCta')}
              </button>
            </div>
          )}

          {/* S2 · Filter + Ansichts-Umschalter */}
          <div className="mt-[18px] flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <Segment key={f.key} selected={filter === f.key} onClick={() => { setFilter(f.key); setSelected(0); }}>
                {f.label}
              </Segment>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-body-3xs text-fg-tertiary">{t('shared.sortLastUpdated')}</span>
              <div className="flex overflow-hidden rounded-lg border border-stroke-subtle bg-surface">
                {(['list', 'tiles'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={'flex items-center gap-1.5 px-3 py-1.5 text-body-3xs font-bold transition-colors ' +
                      (view === v ? 'bg-fg text-surface' : 'text-fg-secondary hover:text-fg')}
                  >
                    {v === 'list' ? <List size={12} /> : <LayoutGrid size={12} />}
                    {t(v === 'list' ? 'sessions.viewList' : 'sessions.viewTiles')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ein Raster, zwei Formen: die Karten MORPHEN zwischen Zeile und
              Kachel (Framer `layout`), statt hart auszutauschen — Nutzer-Wunsch
              2026-08-29. MotionConfig reducedMotion="user" schaltet das fuer
              alle ab, die weniger Bewegung wollen. */}
          <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}>
            <LayoutGroup>
              <div className="mt-4 flex flex-col gap-4 xl:flex-row">
                <motion.div
                  layout
                  className={
                    'min-w-0 flex-1 ' +
                    (view === 'list' ? 'flex flex-col gap-2.5' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3')
                  }
                >
                  {list.map((r, i) => (
                    <SessionCard
                      key={r.id ?? r.title}
                      row={r}
                      view={view}
                      index={i}
                      entered={entered}
                      selected={view === 'list' && current === r}
                      domainLabel={tDomain(r.domain)}
                      onSelect={() => setSelected(i)}
                      onOpen={() => openSession(r)}
                      onPdf={exportPdf}
                      onCopy={() => r.id && setActionsFor({ id: r.id, title: r.title, domain: r.domain, country: r.cc })}
                    />
                  ))}
                </motion.div>

                {/* Die Rail gehoert zur Listenansicht — sie faehrt mit heraus. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {view === 'list' && current && (
                    <motion.div
                      key="rail"
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      className="w-full shrink-0 xl:w-[320px]"
                    >
                      <HistoryRail
                        row={current}
                        onDuplicate={() => current.id && setActionsFor({ id: current.id, title: current.title, domain: current.domain, country: current.cc })}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          </MotionConfig>
        </div>
      </div>
      <SessionActionsDrawer target={actionsFor} onClose={() => setActionsFor(null)} onChanged={reload} />
    </UserShell>
  );
}

// ─── SessionCard · eine Karte, zwei Formen ───────────────────────────────────
// Zeile und Kachel sind DASSELBE Element (gleicher key), nur anders angeordnet.
// Framers `layout` misst beide Zustaende und faehrt Position und Groesse
// ineinander — die Zeile entwickelt sich zur Kachel statt ausgetauscht zu
// werden (Nutzer-Wunsch 2026-08-29). Kinder tragen `layout` ebenfalls, sonst
// verzerrt der Text waehrend des Uebergangs.
function SessionCard({ row, view, index, entered, selected, domainLabel, onSelect, onOpen, onPdf, onCopy }: {
  row: Row; view: 'list' | 'tiles'; index: number; entered: boolean; selected: boolean;
  domainLabel: string; onSelect: () => void; onOpen: () => void; onPdf: () => void; onCopy: () => void;
}) {
  const { t } = useTranslation('userws');
  const isList = view === 'list';
  const stale = row.daysAgo >= STALE_DAYS;

  const meta = (
    <span className={`text-body-4xs font-semibold ${RISK_TEXT[row.risk]}`}>
      ● {t(`sessions.risk.${row.risk}`)}{row.note ? ` · ${row.note}` : ''} · {t('sessions.markets', { count: row.markets })}
    </span>
  );

  return (
    <motion.div
      layout
      onClick={isList ? onSelect : undefined}
      role={isList ? 'button' : undefined}
      tabIndex={isList ? 0 : undefined}
      onKeyDown={isList ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } } : undefined}
      className={
        CARD + ' relative overflow-hidden ' +
        (isList
          ? 'flex cursor-pointer items-center gap-3.5 px-4 py-3 ' + (selected ? 'border-brand/50 ring-1 ring-brand/25' : 'hover:border-stroke')
          : 'flex flex-col')
      }
    >
      {/* Risiko-Kante: in der Kachel oben quer, in der Zeile als schmale
          Kante links — dieselbe Flaeche, die mitwandert. */}
      <motion.span
        layout
        className={`absolute ${RISK_BG[row.risk]} ` + (isList ? 'inset-y-0 left-0 w-1' : 'inset-x-0 top-0 h-1')}
      />

      <motion.div layout className={isList ? 'flex min-w-0 flex-1 items-center gap-3.5' : 'flex-1 p-4'}>
        <motion.div layout className={isList ? 'flex items-center gap-3.5' : 'flex items-center gap-2'}>
          <motion.span
            layout
            className={
              'grid shrink-0 place-items-center rounded-[10px] bg-surface-secondary font-extrabold text-fg ' +
              (isList ? 'h-[34px] w-[34px] text-[11px] ml-1' : 'h-[30px] w-[30px] text-[10.5px]')
            }
          >
            {row.cc}
          </motion.span>
          {!isList && <motion.span layout="position" className={TAG}>{domainLabel}</motion.span>}
        </motion.div>

        <motion.div layout className={isList ? 'min-w-0 flex-1' : 'mt-2.5'}>
          {isList && (
            <motion.div layout className="flex flex-wrap items-center gap-1.5">
              <motion.span layout="position" className={TAG}>{domainLabel}</motion.span>
              {stale && <motion.span layout="position" className={TAG_STALE}>{t('sessions.needsRefresh')}</motion.span>}
            </motion.div>
          )}
          <motion.p layout="position" className={'text-body-xs font-bold text-fg ' + (isList ? 'mt-1' : '')}>{row.title}</motion.p>
          <motion.p layout="position" className={isList ? 'mt-0.5' : 'mt-1'}>{meta}</motion.p>

          {/* Nur in der Kachel: Pflichten-Balken und das Auffrischungs-Tag */}
          <AnimatePresence initial={false}>
            {!isList && (
              <motion.div
                key="tile-extras"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className={`h-full rounded-full ${RISK_BG[row.risk]}`}
                      style={{ width: entered ? `${row.frac * 100}%` : 0, transition: `width 800ms ${EASE} ${200 + index * 70}ms` }}
                    />
                  </div>
                  {row.duties > 0 && <span className="text-[10px] text-fg-tertiary">{t('sessions.duties', { count: row.duties })}</span>}
                </div>
                {stale && <span className={TAG_STALE + ' mt-3'}>{t('sessions.needsRefresh')}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {isList && (
          <motion.span layout="position" className="w-[86px] shrink-0 text-right text-body-3xs text-fg-tertiary">
            {relTime(row.daysAgo, t)}
          </motion.span>
        )}
      </motion.div>

      {/* Aktionen: in der Zeile inline (PDF, Öffnen), in der Kachel als
          eigene Leiste mit dem dritten Weg. */}
      <motion.div
        layout
        className={
          isList
            ? 'flex shrink-0 items-center gap-3 pr-1'
            : 'flex items-center gap-3 border-t border-stroke-subtle px-4 py-2.5'
        }
      >
        {!isList && <motion.button layout="position" type="button" className={LINK} onClick={onOpen}>{t('shared.open')}</motion.button>}
        <motion.button layout="position" type="button" className={LINK} onClick={(e) => { e.stopPropagation(); onPdf(); }}>{t('sessions.pdf')}</motion.button>
        {isList && <motion.button layout="position" type="button" className={LINK} onClick={(e) => { e.stopPropagation(); onOpen(); }}>{t('shared.open')}</motion.button>}
        <AnimatePresence initial={false}>
          {!isList && (
            <motion.button
              key="copy" type="button" className={LINK} onClick={onCopy}
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              {t('sessions.copyVariant')}
            </motion.button>
          )}
        </AnimatePresence>
        {!isList && <motion.span layout="position" className="ml-auto text-[10px] text-fg-tertiary">{relTime(row.daysAgo, t)}</motion.span>}
      </motion.div>
    </motion.div>
  );
}

// ─── Verlauf-Rail ────────────────────────────────────────────────────────────
// Doku §7/§8 sehen einen Versions-Verlauf je Sitzung vor (v1 → v2 → v3, mit
// Anlass). Das Backend fuehrt bis heute nur created_at/updated_at, deshalb
// zeigt die Rail bei ECHTEN Sitzungen genau diese beiden Punkte und erfindet
// keine Versionsnummern; die Design-Fixture zeigt den vollen Verlauf, damit
// die Form sichtbar ist.
// TODO(session-versions): sobald Sessions versioniert sind, hier die echte
// Historie einhaengen — und dieselbe Komponente in der geoeffneten Sitzung
// zeigen (Nutzer-Entscheidung 2026-08-29).
function HistoryRail({ row, onDuplicate }: { row: Row; onDuplicate: () => void }) {
  const { t } = useTranslation('userws');
  const isFixture = !row.id;
  const entries = isFixture
    ? [
        { label: t('sessions.historyCurrent'), meta: `${t('sessions.historyUpdated')} · ${row.note || t('sessions.historyRecalculated')}`, now: true },
        { label: t('sessions.historyVersion', { n: 2 }), meta: t('sessions.historyAnswersChanged'), now: false },
        { label: t('sessions.historyVersion', { n: 1 }), meta: t('sessions.historyCreated'), now: false },
      ]
    : [
        { label: t('sessions.historyCurrent'), meta: t('sessions.historyUpdated'), now: true },
        { label: t('sessions.historyStart'), meta: t('sessions.historyCreated'), now: false },
      ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
      <div className={CARD + ' p-5'}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('sessions.historyTitle')}</p>
        <p className="mt-2 text-body-sm font-bold text-fg">{row.title}</p>
        <p className="mt-0.5 text-body-3xs text-fg-tertiary">
          {t('sessions.markets', { count: row.markets })}
          {row.duties > 0 && ` · ${t('sessions.duties', { count: row.duties })}`}
        </p>

        <div className="mt-3.5">
          {entries.map((e, i) => (
            <div key={e.label} className={'flex gap-3 py-2.5 ' + (i < entries.length - 1 ? 'border-b border-stroke-subtle' : '')}>
              <span className={'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ' + (e.now ? 'bg-brand' : 'border-2 border-stroke box-border')} />
              <div className="min-w-0">
                <p className={'text-body-3xs font-bold ' + (e.now ? 'text-fg' : 'text-fg-secondary')}>{e.label}</p>
                <p className="mt-0.5 text-[10.5px] text-fg-tertiary">{e.meta}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Genau EINE Aktion, volle Breite (Nutzer-Entscheidung) */}
        <Button variant="accent" className="mt-3.5 w-full" onClick={onDuplicate}>{t('sessions.copyVariant')}</Button>
        <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-fg-tertiary">{t('sessions.copyVariantHint')}</p>
      </div>

      <div className={CARD + ' bg-surface-secondary p-4'}>
        <p className="text-[10.5px] leading-relaxed text-fg-tertiary">
          <Trans t={t} i18nKey="sessions.historyScope" components={{ b: <span className="font-bold text-fg-secondary" /> }} />
        </p>
      </div>
    </aside>
  );
}
