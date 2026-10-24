import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { DisclosureCard } from './DisclosureCard';
import { PRIORITY_EN, priorityOf } from '../../lib/priority';

// ─── Risk Map · Pflichten nach Beleg (Wizard-Audit F1) ───────────────────────
// Canvas-Wahl 1C · 2B · 3C · 4A · 5B (23.10.2026), Figma Screens-Datei,
// Seite "Risk Map Stufen F1", Rahmen 3881:6782.
//
// Drei Cards statt einer Tabelle mit Status-Spalte: die Stufe steht im
// Klartext im Kartenkopf (1C), je Pflicht erklaert "Why is this here?", was
// sie traegt und was noch entscheidet (2B). Jede Card klappt auf und zu; die
// offenen Pflichten sind anfangs zu — sie sind noch keine Aussage ueber den
// Nutzer, nur ueber den gewaehlten Bereich.

export type EvidenceState = 'confirmed' | 'likely' | 'open';

export type ClusterRow = {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  market: string;
  due: string;
  dueSub: string;
  sourceLabel?: string;
  sourceUrl?: string;
  law?: string;
  noSource?: boolean;
  penalty?: string;
  radar?: boolean;
  evidence: EvidenceState;
  supports: string[];
  decides: string[];
};

const ORDER: EvidenceState[] = ['confirmed', 'likely', 'open'];

function WhyPanel({ row, id }: { row: ClusterRow; id: string }) {
  const { t } = useTranslation('results');
  const join = (keys: string[], prefix: string) =>
    keys.map((k) => t(`${prefix}.${k}`, { defaultValue: k })).join(', ');
  return (
    <div id={id} className="mt-2 rounded-md bg-surface-secondary px-3.5 py-3 text-body-2xs leading-relaxed text-fg">
      {row.supports.filter((k) => k !== 'eu_market').length === 0 ? (
        <p>{t('why.onlyArea')}</p>
      ) : (
        <p>
          <span className="font-semibold">{t('why.supports')}</span> {join(row.supports, 'why.fact')}.
        </p>
      )}
      {row.decides.length > 0 && (
        <p className="mt-1">
          <span className="font-semibold">{t('why.decides')}</span> {join(row.decides, 'why.ask')}.
        </p>
      )}
    </div>
  );
}

function Row({ row }: { row: ClusterRow }) {
  const { t } = useTranslation('results');
  const [why, setWhy] = useState(false);
  const whyId = useId();
  return (
    <div
      data-testid="obligation-row"
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-2.5 border-t border-stroke-subtle px-4 py-4 lg:grid-cols-[100px_1fr_120px_110px] lg:items-start lg:gap-4 lg:px-6 lg:py-5"
    >
      <span className="col-start-1 row-start-1 self-center lg:col-start-auto lg:row-start-auto lg:self-start lg:pt-0.5">
        <RiskBadge level={row.severity as RiskLevel} styleVariant="soft" size="sm">
          {t(`priority.${priorityOf(row.severity)}`, { defaultValue: PRIORITY_EN[priorityOf(row.severity)] })}
        </RiskBadge>
      </span>
      <span className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:row-start-auto">
        <span className="block text-body-md font-bold text-fg">{row.title}</span>
        <span className="mt-1 block text-body-2xs leading-relaxed text-fg-brand lg:mt-0.5">
          {row.sourceUrl ? (
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
              title={t('sourceLinkTitle', { defaultValue: 'Open the official text on EUR-Lex' })}
            >
              {row.sourceLabel} ↗
            </a>
          ) : row.noSource ? <span className="italic text-fg-tertiary">{row.law}</span> : row.law}
          {(row.sourceUrl || row.law) && row.penalty && <span className="hidden lg:inline"> · </span>}
          {row.penalty && <span className="mt-0.5 block text-fg-tertiary lg:mt-0 lg:inline">{row.penalty}</span>}
        </span>
        <button
          type="button"
          aria-expanded={why}
          aria-controls={whyId}
          onClick={() => setWhy((v) => !v)}
          className="mt-1.5 inline-flex min-h-[24px] items-center gap-1 text-body-2xs font-semibold text-fg-brand transition-colors hover:text-brand"
        >
          {t('why.toggle')}
          {why ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
        </button>
        {why && <WhyPanel row={row} id={whyId} />}
      </span>
      <span className="col-start-1 row-start-3 border-t border-stroke-subtle pt-2.5 text-body-sm text-fg-secondary lg:col-start-auto lg:row-start-auto lg:border-0 lg:pt-0">{row.market}</span>
      <span className="col-start-2 row-start-3 border-t border-stroke-subtle pt-2.5 text-right lg:col-start-auto lg:row-start-auto lg:border-0 lg:pt-0 lg:text-left">
        <span className="text-body-sm font-semibold text-fg lg:block">{row.due}</span>
        {row.dueSub && <span className="ml-1.5 text-body-2xs text-fg-tertiary lg:ml-0 lg:block">{row.dueSub}</span>}
      </span>
    </div>
  );
}

function ClusterCard({ state, rows, defaultOpen }: { state: EvidenceState; rows: ClusterRow[]; defaultOpen: boolean }) {
  const { t } = useTranslation('results');
  const now = rows.filter((r) => !r.radar);
  const radar = rows.filter((r) => r.radar);
  const sections = radar.length
    ? [{ key: 'now', label: t('groups.now', { defaultValue: 'Now' }), items: now }, { key: 'radar', label: t('groups.radar', { defaultValue: 'On the radar' }), items: radar }].filter((s) => s.items.length)
    : [{ key: 'all', label: '', items: rows }];
  return (
    <DisclosureCard
      testId={`cluster-${state}`}
      title={t(`clusters.${state}.title`)}
      count={rows.length}
      sub={t(`clusters.${state}.sub`)}
      defaultOpen={defaultOpen}
    >
      <div className="hidden grid-cols-[100px_1fr_120px_110px] gap-4 border-t border-stroke-subtle bg-surface-secondary px-6 py-3 text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary lg:grid">
        <span>{t('table.priority')}</span>
        <span>{t('table.obligation')}</span>
        <span>{t('table.market')}</span>
        <span>{t('table.due')}</span>
      </div>
      {sections.map((s) => (
        <div key={s.key}>
          {s.label && (
            <div className="flex items-baseline gap-2 border-t border-stroke-subtle bg-surface-secondary/40 px-4 py-2.5 lg:px-6">
              <span className="text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-secondary">{s.label}</span>
              <span className="text-body-3xs text-fg-tertiary">{s.items.length}</span>
            </div>
          )}
          {s.items.map((r) => <Row key={r.title} row={r} />)}
        </div>
      ))}
    </DisclosureCard>
  );
}

/** Die drei Cards; eine Stufe ohne Pflichten erscheint nicht. */
export function ObligationClusters({ rows }: { rows: ClusterRow[] }) {
  // Die offene Card ist anfangs zu — ausser sie ist die einzige; sonst stuende
  // eine scheinbar leere Seite da.
  const onlyOpen = rows.every((r) => r.evidence === 'open');
  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((s) => {
        const items = rows.filter((r) => r.evidence === s);
        return items.length ? <ClusterCard key={s} state={s} rows={items} defaultOpen={s !== 'open' || onlyOpen} /> : null;
      })}
    </div>
  );
}

/** Wizard-Antworten, die eine offene Angabe klaeren (factsFromAnswers in der
 *  Engine), je Frage. Der Hinweis (5B) verspricht "one answer settles N" —
 *  gezaehlt wird deshalb die EINE Frage, die am meisten klaert, nie die Summe
 *  ueber mehrere Fragen (Nutzer-Entscheid 24.10.2026). */
export const WIZARD_ANSWERABLE = new Set(['consumer_sales', 'business_sales', 'online_sales']);

type AnswerContext = {
  /** Der Knopf erreicht die Wizard-v1a-Fragen. Seit 24.10.2026 tun das
   *  Wizard und Antworten-Schublade; false bleibt fuer einen Weg, der nur
   *  Maerkte, Taetigkeit und Bereiche kennt. */
  fullWizard?: boolean;
  /** Das Profil, mit dem gesucht wurde. */
  profile?: { categories?: string[]; details?: { establishment?: string[] } } | null;
};

function answerableQuestions({ fullWizard = false, profile }: AnswerContext): Array<Set<string>> {
  const questions = [WIZARD_ANSWERABLE];
  if (!fullWizard) return questions;
  // Angebot (S04) fragt der Wizard immer.
  questions.push(new Set(['physical_goods']));
  // Sitz (S03) nur, solange er offen ist: bei teilweiser Ueberdeckung bleibt
  // der Fakt nach der Antwort unbekannt, der Hinweis stuende fuer immer da.
  if (!profile?.details?.establishment?.length) questions.push(new Set(['established_in_market']));
  // EPR 1/2 stellt der Wizard nur mit EPR & Packaging.
  if (profile?.categories?.includes('product-packaging')) questions.push(new Set(['electronics', 'batteries']));
  return questions;
}

/** Wie viele Pflichten die eine Antwort klaeren wuerde, die am meisten klaert. */
export function settledByWizard(rows: ClusterRow[], ctx: AnswerContext = {}): number {
  const pending = rows.filter((r) => r.evidence !== 'confirmed');
  return Math.max(0, ...answerableQuestions(ctx).map((q) => pending.filter((r) => r.decides.some((k) => q.has(k))).length));
}
