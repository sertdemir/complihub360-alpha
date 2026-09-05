import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, MotionConfig, type Variants } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { UserShell } from './UserShell';
import { Button } from '../ui/Button';
import { Donut, useEntered, useCountUp, EASE } from '../ui/Stats';
import { duplicateSession } from '../../api/sessions';
import { fetchObligationStatus, setObligationStatus, type ObligationStatus } from '../../api/obligations';
import type { AnonProvider } from '../../api/search';

// ─── Sitzungs-Snapshot · Canvas "Sitzungs-Snapshot", Gesamt · G8 ─────────────
// Die Detailansicht EINER Sitzung fuer eingeloggte Nutzer. Aufbau nach der
// Nutzer-Wahl vom 2026-08-29:
//   Kopf (Brotkrumen, Titel, Meta) · PDF exportieren, Als Variante kopieren
//     und Antworten bearbeiten als Textlinks (Reihenfolge Nutzer 2026-09-05)
//   Kennzahlen mit grossen Donuts, volle Breite
//   zweispaltig: Pflichten nach Dringlichkeit gruppiert, je Zeile Geltung und
//     Bearbeitungs-Chip | rechts Fortschrittskarte und darunter die passenden
//     Anbieter gestapelt (Canvas G9 + Wahl 2C; der Verlauf ist weg)
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
  /** Engine-Template-ID ('tax-vat-registration', …) — der Schluessel, unter
   *  dem der Bearbeitungs-Stand gespeichert wird. Fehlt sie (Design-Fixture),
   *  ist die Zeile nicht abhakbar. */
  obligationId?: string;
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

// ─── Geltung ─────────────────────────────────────────────────────────────────
// Was der bisherige Chip WIRKLICH sagte: ob die Pflicht zutrifft — nicht, ob
// sie getan ist (services/compliance-api/src/index.ts:2175 setzt
// state = focus ? 'confirmed' : 'likely'). Deshalb heisst er jetzt "Pflicht"
// bzw. "Vermutlich Pflicht", und der Balken darunter zeigt die Abstufung.
//
// MOBIL faellt der Balken weg (Nutzer-Festlegung 2026-08-29) — er ist eine
// Desktop-Verstaerkung; auf schmalen Breiten braucht die Zeile den Platz.
const GELTUNG = {
  confirmed: { key: 'duty',       frac: 1,    bar: 'bg-risk-low' },
  likely:    { key: 'likelyDuty', frac: 0.6,  bar: 'bg-risk-medium' },
  answer:    { key: 'toClarify',  frac: 0.25, bar: 'bg-fg-tertiary' },
} as const;

function GeltungCell({ state, entered, index }: { state: State; entered: boolean; index: number }) {
  const { t } = useTranslation('results');
  const g = GELTUNG[state.kind];
  return (
    <div className="w-[124px] shrink-0 sm:w-[136px]">
      <p className="whitespace-nowrap text-[10.5px] font-semibold text-fg-secondary">
        {t(`snapshot.geltung.${g.key}`)}
      </p>
      <div className="mt-1.5 hidden h-1 overflow-hidden rounded-full bg-stroke-subtle sm:block">
        <div
          className={'h-1 rounded-full ' + g.bar}
          style={{
            width: entered ? `${g.frac * 100}%` : 0,
            transition: `width 850ms ${EASE} ${120 + index * 60}ms`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Bearbeitung ─────────────────────────────────────────────────────────────
// Der Chip traegt die Farbe seines Zustands und ist zugleich das Menue
// (Nutzer-Festlegung 2026-08-29). Theme-feste Rezepte statt Token-Opazitaet:
// bg-warning-bg & Co. fressen im Dark Mode den Text.
const TASK_CHIP: Record<ObligationStatus, string> = {
  done: 'bg-[#E7F3EE] border-[rgba(21,128,61,.35)] text-[#14532D] dark:bg-[#15803D]/20 dark:text-[#8FD3AE]',
  in_progress: 'bg-[#FEF3C7] border-[rgba(161,98,7,.35)] text-[#713F12] dark:bg-[#A16207]/25 dark:text-[#F0C86A]',
  open: 'bg-[#FEE2E2] border-[rgba(143,49,16,.30)] text-[#8F3110] dark:bg-[#8F3110]/25 dark:text-[#F1A88C]',
  not_applicable: 'bg-surface-secondary border-stroke-subtle text-fg-tertiary',
};
const TASK_ORDER: ObligationStatus[] = ['open', 'in_progress', 'done', 'not_applicable'];

function TaskChip({ status, busy, onSet }: {
  status: ObligationStatus; busy: boolean; onSet: (s: ObligationStatus) => void;
}) {
  const { t } = useTranslation('results');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10.5px] font-bold transition-opacity disabled:opacity-60 ' + TASK_CHIP[status]}
      >
        {busy ? '…' : t(`snapshot.task.${status}`)}
        <ChevronDown size={11} className="ml-1 opacity-70" />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 z-20 mt-1.5 w-[168px] overflow-hidden rounded-lg border border-stroke-subtle bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(11,21,18,0.28)]">
          {TASK_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === status}
              onClick={() => { setOpen(false); if (s !== status) onSet(s); }}
              className={'flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-2xs transition-colors hover:bg-surface-secondary '
                + (s === status ? 'font-bold text-fg' : 'text-fg-secondary')}
            >
              {t(`snapshot.task.${s}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ label, sub, dot, rows, entered, offset, onAnswer, taskOf, onSetTask, busyId }: {
  label: string; sub: string; dot: string; rows: SnapshotRow[];
  entered: boolean; offset: number; onAnswer: () => void;
  /** null = Abhaken nicht moeglich (keine gespeicherte Sitzung). */
  taskOf: ((row: SnapshotRow) => ObligationStatus) | null;
  onSetTask: (row: SnapshotRow, status: ObligationStatus) => void;
  busyId: string | null;
}) {
  const { t } = useTranslation('results');
  return (
    // Kein overflow-hidden auf der Karte: das Zustands-Menue des Chips ragt
    // ueber die Kartenkante hinaus und wuerde sonst abgeschnitten. Die
    // Kopfzeile rundet ihre Ecken deshalb selbst.
    <div className={CARD}>
      <div className="flex items-center gap-2.5 rounded-t-xl border-b border-stroke-subtle bg-surface-secondary px-5 py-3.5">
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
            {/* Der Titel bekommt den groesseren Teil des freien Raums —
                sonst bricht "EPR-Verpackungsregistrierung" dreizeilig um,
                waehrend rechts Luft bleibt. */}
            <div className="min-w-0 flex-[2]">
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
            <GeltungCell state={r.state} entered={entered} index={offset + i} />
            {/* Freier Raum bleibt in der Mitte — Chip und Frist bilden rechts
                einen gemeinsamen Aktionsblock (Canvas-Wahl 1C, 2026-09-01):
                Zustand und Termin stehen beieinander, kurzer Blickweg beim
                Abhaken. Die Frist haelt eine feste Breite, damit die Chips
                aller Zeilen an derselben Kante enden. */}
            <div className="hidden flex-1 sm:block" />
            <div className="hidden shrink-0 items-center gap-4 sm:flex">
              {taskOf && r.obligationId && (
                <TaskChip
                  status={taskOf(r)}
                  busy={busyId === r.obligationId}
                  onSet={(next) => onSetTask(r, next)}
                />
              )}
              {/* Rechts steht, was zu tun ist: bei offenen Fragen der Weg
                  dorthin, sonst die Frist. Beide auf einer Kante. */}
              <div className="flex min-w-[86px] shrink-0 justify-end text-right">
                {r.state.kind === 'answer' ? (
                  <button type="button" onClick={onAnswer} className={TEXT_LINK + ' inline-flex items-center gap-1 whitespace-nowrap'}>
                    {t('state.answer', { total: r.state.count })} <ArrowRight size={13} />
                  </button>
                ) : (
                  <span className="text-[10.5px] text-fg-tertiary">{r.due && r.due !== '—' ? r.due : r.dueSub}</span>
                )}
              </div>
            </div>
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
  // Bearbeitungs-Stand: nur ABWEICHUNGEN kommen vom Server, alles andere ist
  // 'open'. Ohne gespeicherte Sitzung gibt es nichts abzuhaken — dann bleibt
  // die Spalte leer statt eine Attrappe zu zeigen.
  const [tasks, setTasks] = useState<Record<string, ObligationStatus>>({});
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskable, setTaskable] = useState(false);

  useEffect(() => {
    if (!sessionId) { setTaskable(false); return; }
    let alive = true;
    fetchObligationStatus(sessionId)
      .then((map) => {
        if (!alive) return;
        const next: Record<string, ObligationStatus> = {};
        for (const [id, row] of Object.entries(map)) next[id] = row.status;
        setTasks(next);
        setTaskable(true);
      })
      .catch(() => { if (alive) setTaskable(false); });
    return () => { alive = false; };
  }, [sessionId]);

  const taskOf = (row: SnapshotRow): ObligationStatus =>
    (row.obligationId && tasks[row.obligationId]) || 'open';

  // Optimistisch setzen, bei Fehler zurueckdrehen — ein Haken, der bleibt
  // obwohl er nicht gespeichert wurde, waere die schlechteste Auskunft.
  const setTask = async (row: SnapshotRow, next: ObligationStatus) => {
    if (!sessionId || !row.obligationId) return;
    const id = row.obligationId;
    const before = taskOf(row);
    setTasks((m) => ({ ...m, [id]: next }));
    setTaskBusy(id);
    try {
      await setObligationStatus(sessionId, id, next);
    } catch {
      setTasks((m) => ({ ...m, [id]: before }));
    }
    setTaskBusy(null);
  };

  // Fortschritt zaehlt nur, was ueberhaupt zu tun ist: "trifft nicht zu"
  // gehoert nicht in den Nenner.
  const withId = rows.filter((r) => r.obligationId);
  const nNa = withId.filter((r) => taskOf(r) === 'not_applicable').length;
  const nDone = withId.filter((r) => taskOf(r) === 'done').length;
  const nProg = withId.filter((r) => taskOf(r) === 'in_progress').length;
  const nRel = Math.max(1, withId.length - nNa);

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
                {/* "Als Variante kopieren" steht seit 2026-09-05 hier zwischen
                    den beiden anderen Textlinks (Nutzer-Vorgabe) — nicht mehr
                    in der Fortschrittskarte. Ohne gespeicherte Sitzung
                    (Fixture/Gast-Profil) gibt es nichts zu kopieren, dann
                    fehlt der Link ganz statt tot herumzustehen. */}
                {sessionId && (
                  copy === 'done' ? (
                    <button type="button" onClick={() => navigate(`/${locale}/dashboard/sessions`)} className={TEXT_LINK}>
                      {t('snapshot.copyOpenList')}
                    </button>
                  ) : copy === 'error' ? (
                    <span className="text-body-2xs font-bold text-risk-high">{t('snapshot.copyError')}</span>
                  ) : (
                    <button type="button" disabled={copy === 'busy'} onClick={duplicate} className={TEXT_LINK + ' disabled:opacity-60'}>
                      {copy === 'busy' ? '…' : t('snapshot.copyVariant')}
                    </button>
                  )
                )}
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
                {groups.map((g, gi) => (
                  <GroupCard
                    key={g.key}
                    label={t(`snapshot.group.${g.key}`)}
                    sub={t(`snapshot.groupSub.${g.key}`, { count: g.items.length })}
                    dot={g.dot}
                    rows={g.items}
                    entered={entered}
                    offset={groups.slice(0, gi).reduce((n, x) => n + x.items.length, 0)}
                    onAnswer={toAnswers}
                    taskOf={taskable ? taskOf : null}
                    onSetTask={setTask}
                    busyId={taskBusy}
                  />
                ))}
              </motion.div>

              <motion.aside variants={ITEM} className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[330px]">
                {/* Canvas-Wahl 2C (2026-09-01) + Nutzer-Vorgabe 2026-09-05:
                    kein Verlaufs-Kasten mehr, die Fortschrittskarte zeigt nur
                    noch den Stand, "Als Variante kopieren" sitzt im Kopf.
                    Direkt darunter kommen die Anbieter. Die kuenftige
                    Versionsliste (Verlaufs-Endpunkt, Backlog) braucht dann
                    einen neuen Ort. */}
                {taskable && (
                  <div className={CARD + ' px-5 py-4'}>
                    <p className="font-serif text-[20px] font-bold leading-none text-fg">
                      {t('snapshot.progress', { done: nDone, total: nRel })}
                    </p>
                    <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-stroke-subtle">
                      <div className="h-2 bg-risk-low" style={{ width: entered ? `${(nDone / nRel) * 100}%` : 0, transition: `width 850ms ${EASE} 150ms` }} />
                      <div className="h-2 bg-risk-medium" style={{ width: entered ? `${(nProg / nRel) * 100}%` : 0, transition: `width 850ms ${EASE} 320ms` }} />
                    </div>
                    <p className="mt-2.5 text-[10.5px] text-fg-tertiary">
                      {t('snapshot.progressSub', { prog: nProg, open: Math.max(0, nRel - nDone - nProg), na: nNa })}
                    </p>
                  </div>
                )}
                {/* Passende Anbieter — je eine Karte, gestapelt in der
                    Spalte (Canvas-Wahl 2C); kein Sammellink, keine
                    Zwischenuebersicht (Nutzer-Entscheidung 2026-08-29). */}
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
                  <div className="mt-auto pt-5">
                    <Button variant="primary" className="w-full" onClick={() => onProviderDetails(p.provider_key)}>
                      {t('snapshot.providerDetails')}
                    </Button>
                  </div>
                </div>
              ))}
              </motion.aside>
            </div>

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

