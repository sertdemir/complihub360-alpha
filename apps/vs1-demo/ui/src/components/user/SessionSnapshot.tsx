import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, MotionConfig, type Variants } from 'framer-motion';
import { ArrowRight, Check, Info } from 'lucide-react';
import { UserShell } from './UserShell';
import { Button } from '../ui/Button';
import { Donut, useEntered, useCountUp } from '../ui/Stats';
import { duplicateSession } from '../../api/sessions';
import type { AnonProvider } from '../../api/search';

// ─── Sitzungs-Snapshot · Canvas "Sitzungs-Snapshot", Gesamt · G8 ─────────────
// Die Detailansicht EINER Sitzung fuer eingeloggte Nutzer. Aufbau nach der
// Nutzer-Wahl vom 2026-08-29:
//   Kopf (Brotkrumen, Titel, Meta) · PDF und Antworten bearbeiten als Textlinks
//   Kennzahlen mit grossen Donuts, volle Breite
//   zweispaltig: Pflichten nach Dringlichkeit gruppiert | Verlauf, der auf die
//     volle Hoehe waechst — Versionen oben, "Als Variante kopieren" am Fuss,
//     sodass beide Spalten auf einer Kante enden
//   die passenden Anbieter darunter, je eine Karte, volle Breite
//
// Was hier bewusst NICHT steht:
// - Keine Reiterleiste. Rechtsgrundlagen, News und Gesetzesaenderungen wandern
//   in den kuenftigen Bereich "Maerkte" (Phase 2, siehe
//   docs/backlog/markets-hub-backend-needs.md); Anbieter und Verlauf sind hier
//   ohnehin schon Karten. Damit faellt auch "Uebersicht" weg.
// - Keine Links "Ansehen"/"Mit heute vergleichen" im Verlauf: die API fuehrt
//   weder results_snapshot noch version, es gaebe also nichts zu zeigen.
// - Kein Sammel-Knopf "Anbieter anfragen": eine Anfrage braucht einen
//   ausgewaehlten Anbieter (provider_key), der Weg geht ueber "Details ansehen".

type Severity = 'critical' | 'high' | 'medium' | 'low';
type State = { kind: 'confirmed' } | { kind: 'likely' } | { kind: 'answer'; count: number };

export type SnapshotRow = {
  severity: Severity;
  title: string;
  market: string;
  due: string;
  dueSub: string;
  state: State;
  sourceLabel?: string;
  sourceUrl?: string;
  /** Rechtsgrundlage im Klartext, wenn es keine verlinkbare Fundstelle gibt. */
  sourceText?: string;
};

const SOFT = [0.22, 1, 0.36, 1] as const;
const SECTION: Variants = {
  enter: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: SOFT, staggerChildren: 0.05, delayChildren: 0.05 } },
};
const ITEM: Variants = {
  enter: { opacity: 0, y: 8, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: SOFT } },
};

const CARD = 'rounded-xl border border-stroke-subtle bg-surface shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]';
const TEXT_LINK = 'text-body-2xs font-bold text-brand underline underline-offset-[3px] transition-colors hover:text-brand-700';

/** Doppelte Donut-Groesse gegenueber Dashboard und Sitzungen (Nutzer-Vorgabe). */
const DONUT_SIZE = 92;
const DONUT_STROKE = 13;

// Die Gruppen folgen der Dringlichkeit, nicht dem Bereich: "Was muss ich
// zuerst tun" ist die Frage, mit der jemand diese Seite oeffnet.
// Die Kopfleiste bleibt neutral grau (Nutzer 2026-08-29) — Farbe traegt allein
// der Punkt. Vier getoente Baender untereinander lasen sich wie vier Alarme.
const GROUPS = [
  { key: 'now', dot: 'bg-risk-critical',
    match: (r: SnapshotRow) => r.state.kind !== 'answer' && r.severity === 'critical' },
  { key: 'month', dot: 'bg-risk-high',
    match: (r: SnapshotRow) => r.state.kind !== 'answer' && r.severity === 'high' },
  { key: 'open', dot: 'bg-risk-medium',
    match: (r: SnapshotRow) => r.state.kind === 'answer' },
  { key: 'later', dot: 'bg-risk-low',
    match: (r: SnapshotRow) => r.state.kind !== 'answer' && (r.severity === 'medium' || r.severity === 'low') },
] as const;

function StateCell({ state, onAnswer }: { state: State; onAnswer: () => void }) {
  const { t } = useTranslation('results');
  if (state.kind === 'confirmed') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-[10.5px] font-bold text-fg-brand">
        <Check size={12} strokeWidth={3} /> {t('state.confirmed')}
      </span>
    );
  }
  if (state.kind === 'likely') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stroke bg-surface px-3 py-1 text-[10.5px] font-bold text-fg-secondary">
        <Info size={12} /> {t('state.likely')}
      </span>
    );
  }
  // Der Klaerungs-Weg ist ein Textbutton (Nutzer-Regel): gefuellte Knoepfe
  // bleiben den wenigen wirklich primaeren Handlungen vorbehalten.
  return (
    <button type="button" onClick={onAnswer} className={TEXT_LINK + ' inline-flex shrink-0 items-center gap-1 whitespace-nowrap'}>
      {t('state.answer', { total: state.count })} <ArrowRight size={13} />
    </button>
  );
}

function GroupCard({ label, sub, dot, rows, onAnswer }: {
  label: string; sub: string; dot: string; rows: SnapshotRow[]; onAnswer: () => void;
}) {
  return (
    <div className={CARD + ' overflow-hidden'}>
      <div className="flex items-center gap-2.5 border-b border-stroke-subtle bg-surface-secondary px-5 py-3.5">
        <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + dot} />
        <span className="text-body-sm font-extrabold text-fg">{label}</span>
        {/* Kein Kleingedrucktes: der Zusatz nennt Zahl und naechste Frist und
            muss auf einen Blick lesbar sein (Nutzer 2026-08-29). */}
        <span className="ml-auto text-body-2xs font-semibold text-fg-secondary">{sub}</span>
      </div>
      <div className="px-5">
        {rows.map((r, i) => (
          <div
            key={r.title}
            className={'flex items-center gap-4 py-3.5 ' + (i < rows.length - 1 ? 'border-b border-stroke-subtle' : '')}
          >
            <div className="min-w-0 flex-1">
              <p className="text-body-xs font-bold text-fg">{r.title}</p>
              <p className="mt-0.5 text-[10.5px] text-fg-tertiary">
                {r.market}
                {(r.sourceUrl || r.sourceText) && ' · '}
                {r.sourceUrl ? (
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                  >
                    {r.sourceLabel} ↗
                  </a>
                ) : (
                  /* Ohne Fundstelle bleibt die Norm Text — ein Link, der
                     nirgendwo hinfuehrt, waere schlechter als keiner. */
                  r.sourceText
                )}
              </p>
            </div>
            {/* Dreispaltig (Nutzer 2026-08-29): der Chip mittig in eigener
                Spalte, die Frist ganz rechts auf einer Kante. Vorher stand
                "Abhaengig von Tools" direkt neben dem Textlink "2 Fragen
                beantworten" und machte ihn unleserlich. */}
            <div className="flex w-[186px] shrink-0 justify-center">
              <StateCell state={r.state} onAnswer={onAnswer} />
            </div>
            <span className="hidden w-[132px] shrink-0 text-right text-[10.5px] text-fg-tertiary sm:block">
              {r.due && r.due !== '—' ? r.due : r.dueSub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionSnapshot({
  rows, providers, sessionId, title, meta, kpis, matchBasis, onExportPdf, onEditAnswers, onProviderDetails,
}: {
  rows: SnapshotRow[];
  providers: AnonProvider[];
  /** Die ✓/Lücken-Aufschluesselung hinter der Match-Zahl (DNA-Addendum V2 P1).
   *  Wird hereingereicht, weil sie im Aufrufer neben der Score-Formel wohnt. */
  matchBasis?: (p: AnonProvider) => React.ReactNode;
  sessionId: string | null;
  title: string;
  meta: string;
  kpis: { total: number; soon: number; open: number; critical: number; high: number; rest: number };
  onExportPdf: () => void;
  onEditAnswers: () => void;
  onProviderDetails: (key: string) => void;
}) {
  const { t, i18n } = useTranslation('results');
  const { t: tw } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const entered = useEntered();
  const nTotal = useCountUp(kpis.total, entered);
  const nSoon = useCountUp(kpis.soon, entered);
  const nOpen = useCountUp(kpis.open, entered);
  const [copy, setCopy] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const total = Math.max(1, kpis.total);
  const answerRow = rows.find((r) => r.state.kind === 'answer');
  const toAnswers = () => onEditAnswers();

  // Legt eine Kopie an und bestaetigt an Ort und Stelle. Ohne gespeicherte
  // Sitzung (Fixture/Gast-Profil) gibt es nichts zu duplizieren — dann bleibt
  // der Knopf inaktiv statt einen Fehler zu erzeugen.
  const duplicate = async () => {
    if (!sessionId) return;
    setCopy('busy');
    try {
      await duplicateSession(sessionId);
      setCopy('done');
    } catch {
      setCopy('error');
    }
  };

  const groups = GROUPS
    .map((g) => ({ ...g, items: rows.filter(g.match) }))
    .filter((g) => g.items.length > 0);

  return (
    <UserShell>
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
        <MotionConfig reducedMotion="user">
          <motion.div variants={SECTION} initial="enter" animate="show" className="mx-auto max-w-[1200px]">
            {/* Kopf */}
            <motion.div variants={ITEM} className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-body-3xs text-fg-tertiary">
                  <Link to={`/${locale}/dashboard/sessions`} className="font-semibold text-brand underline underline-offset-2">
                    {tw('nav.navSessions', { defaultValue: 'Sitzungen' })}
                  </Link>
                  {' › '}{title}
                </p>
                <h1 className="mt-1.5 font-serif text-[26px] font-bold leading-tight text-fg">{title}</h1>
                <p className="mt-1 text-body-2xs text-fg-tertiary">{meta}</p>
              </div>
              {/* Beide als Textlinks — auf dieser Seite gibt es keinen einzelnen
                  primaeren Knopf mehr. Sie sitzen rechtsbuendig im Kopf, auf der
                  Hoehe der Meta-Zeile unter dem Titel und buendig mit der Kachel
                  "Offene Fragen" darunter; im Spalt zwischen den Reihen
                  zerschnitten sie das Raster (Nutzer 2026-08-29). */}
              <div className="flex shrink-0 items-center gap-5 pb-0.5">
                <button type="button" onClick={onExportPdf} className={TEXT_LINK}>{t('snapshot.exportPdf')}</button>
                <button type="button" onClick={onEditAnswers} className={TEXT_LINK}>{t('snapshot.editAnswers')}</button>
              </div>
            </motion.div>

            {/* Kennzahlen */}
            <motion.div variants={ITEM} className="mt-4 grid gap-4 sm:grid-cols-3">
              <Kpi
                title={t('snapshot.kpiTotal')}
                big={String(nTotal)}
                sub={t('snapshot.kpiTotalSub', { now: kpis.critical, high: kpis.high, rest: kpis.rest })}
              >
                <Donut
                  on={entered} size={DONUT_SIZE} stroke={DONUT_STROKE}
                  segs={[
                    { frac: kpis.critical / total, cls: 'text-risk-critical' },
                    { frac: kpis.high / total, cls: 'text-risk-high' },
                    { frac: kpis.rest / total, cls: 'text-risk-medium' },
                  ]}
                />
              </Kpi>
              <Kpi title={t('snapshot.kpiSoon')} big={String(nSoon)} sub={t('snapshot.kpiSoonSub')}>
                <Donut on={entered} size={DONUT_SIZE} stroke={DONUT_STROKE} segs={[{ frac: kpis.soon / total, cls: 'text-fg-accent' }]} />
              </Kpi>
              <Kpi title={t('snapshot.kpiOpen')} big={String(nOpen)} sub={t('snapshot.kpiOpenSub', { count: kpis.open })}>
                <Donut on={entered} size={DONUT_SIZE} stroke={DONUT_STROKE} segs={[{ frac: kpis.open / total, cls: 'text-brand' }]} />
              </Kpi>
            </motion.div>

            {/* Pflichten + Verlauf, beide Spalten enden auf einer Kante */}
            <div className="mt-[18px] flex flex-col items-stretch gap-[18px] xl:flex-row">
              <motion.div variants={ITEM} className="flex min-w-0 flex-1 flex-col gap-3.5">
                {groups.map((g) => (
                  <GroupCard
                    key={g.key}
                    label={t(`snapshot.group.${g.key}`)}
                    sub={t(`snapshot.groupSub.${g.key}`, { count: g.items.length })}
                    dot={g.dot}
                    rows={g.items}
                    onAnswer={toAnswers}
                  />
                ))}
              </motion.div>

              <motion.aside variants={ITEM} className="flex w-full shrink-0 flex-col xl:w-[330px]">
                <div className={CARD + ' flex flex-1 flex-col p-5'}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{t('snapshot.historyTitle')}</p>
                  <div className="mt-3.5">
                    <HistoryEntry now label={t('snapshot.historyCurrent')} meta={meta} />
                    <HistoryEntry label={t('snapshot.historyStart')} meta={t('snapshot.historyCreated')} last />
                  </div>
                  {/* Der Knopf sitzt am Fuss, damit die Karte auf derselben
                      Kante endet wie die Pflichtenliste (Nutzer-Vorgabe). */}
                  <div className="mt-auto border-t border-stroke-subtle pt-4">
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={!sessionId || copy === 'busy' || copy === 'done'}
                      onClick={duplicate}
                    >
                      {copy === 'busy' ? '…' : copy === 'done' ? t('snapshot.copyDone') : t('snapshot.copyVariant')}
                    </Button>
                    <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-fg-tertiary">
                      {copy === 'done' ? (
                        <button type="button" onClick={() => navigate(`/${locale}/dashboard/sessions`)} className={TEXT_LINK}>
                          {t('snapshot.copyOpenList')}
                        </button>
                      ) : copy === 'error' ? (
                        <span className="text-risk-high">{t('snapshot.copyError')}</span>
                      ) : !sessionId ? (
                        t('snapshot.copyUnavailable')
                      ) : (
                        t('snapshot.copyHint')
                      )}
                    </p>
                  </div>
                </div>
              </motion.aside>
            </div>

            {/* Passende Anbieter — je eine Karte, kein Sammellink, keine
                Zwischenuebersicht (Nutzer-Entscheidung 2026-08-29). */}
            <motion.div variants={ITEM} className="mt-[18px] grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((p, i) => (
                <div key={p.provider_key} className={CARD + ' flex flex-col p-4'}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-body-xs font-extrabold '
                        + (i === 0 ? 'bg-accent text-primary-950' : 'bg-brand-light text-fg-brand')}
                    >
                      {p.match}
                    </span>
                    <div className="min-w-0 flex-1">
                      {i === 0 && (
                        <span className="inline-flex rounded-full border border-accent/55 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
                          ✓ {t('snapshot.verifiedPartner')}
                        </span>
                      )}
                      <p className={(i === 0 ? 'mt-1 ' : '') + 'text-body-xs font-bold leading-snug text-fg'}>{p.pseudonym_label}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[10.5px] text-fg-tertiary">
                    {[p.region, p.active_since ? t('snapshot.activeSince', { year: p.active_since }) : null].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-fg-tertiary">
                    {[p.avg_response_hours != null ? t('snapshot.responseTime', { hours: p.avg_response_hours }) : null,
                      t(`snapshot.billing.${p.billing_model}`)].filter(Boolean).join(' · ')}
                  </p>
                  {/* Die Zahl allein waere eine Behauptung — hier steht, woraus
                      sie besteht (DNA-Addendum V2 P1). */}
                  {matchBasis && <div className="mt-3 border-t border-stroke-subtle pt-3">{matchBasis(p)}</div>}
                  {/* Der einzige gefuellte Knopf der Seite: der Weg zum
                      einzelnen Anbieter. */}
                  <div className="mt-auto pt-3.5">
                    <Button variant="accent" className="w-full" onClick={() => onProviderDetails(p.provider_key)}>
                      {t('snapshot.providerDetails')}
                    </Button>
                  </div>
                </div>
              ))}
            </motion.div>

            {answerRow && <span className="sr-only">{t('state.answer', { total: 0 })}</span>}
          </motion.div>
        </MotionConfig>
      </div>
    </UserShell>
  );
}

/** Kennzahl-Kachel mit grossem Donut — eigener Zuschnitt, weil KpiCard aus
 *  Stats fuer die kleineren Dashboard-Kacheln gebaut ist. */
function Kpi({ title, big, sub, children }: { title: string; big: string; sub: string; children: React.ReactNode }) {
  return (
    <div className={CARD + ' px-5 py-4'}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-brand">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[26px] font-bold leading-none text-fg">{big}</p>
          <p className="mt-1.5 text-body-2xs text-fg-tertiary">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function HistoryEntry({ label, meta, now = false, last = false }: { label: string; meta: string; now?: boolean; last?: boolean }) {
  return (
    <div className={'flex gap-3 py-2.5 ' + (last ? '' : 'border-b border-stroke-subtle')}>
      <span className={'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ' + (now ? 'bg-brand' : 'box-border border-2 border-stroke')} />
      <div className="min-w-0">
        <p className={'text-body-3xs font-bold ' + (now ? 'text-fg' : 'text-fg-secondary')}>{label}</p>
        <p className="mt-0.5 text-[10.5px] text-fg-tertiary">{meta}</p>
      </div>
    </div>
  );
}
