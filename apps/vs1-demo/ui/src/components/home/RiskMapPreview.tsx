import { useTranslation } from 'react-i18next';
import { Lock, Check, Info, ArrowRight } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';

// Risk-map result preview (Figma 1694:1789) at the SAME 760×588 footprint as the
// AnimatedWizard, so the hero can cross-fade wizard → result without any reflow.
// Light window chrome · eyebrow + title · stat strip · obligation table (clipped).
// Copy lives in the 'home' namespace (riskMapPreview.*, risk.*).

const STAT_INDICES = [0, 1, 2, 3] as const;

type StateKind = 'confirmed' | 'likely' | 'action';

// Display strings come from riskMapPreview.rows.<index>.*; severity + state
// labels derive from risk.severity.* / risk.state.*.
const ROWS: { level: RiskLevel; state: StateKind }[] = [
  { level: 'critical', state: 'confirmed' },
  { level: 'critical', state: 'likely' },
  { level: 'critical', state: 'likely' },
  { level: 'high', state: 'likely' },
  { level: 'high', state: 'confirmed' },
  { level: 'medium', state: 'action' },
  { level: 'medium', state: 'action' },
];

const COLS = 'grid grid-cols-[78px_1fr_64px_72px_124px] items-center gap-2';

function StateCell({ kind }: { kind: StateKind }) {
  const { t } = useTranslation('home');
  const label = t(`risk.state.${kind}`);
  if (kind === 'action') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-body-4xs font-semibold text-fg-on-brand">
        {label} <ArrowRight size={11} />
      </span>
    );
  }
  if (kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-1 text-body-4xs font-medium text-fg-secondary">
        <Check size={11} className="text-fg-brand" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stroke px-2 py-1 text-body-4xs font-medium text-fg-secondary">
      <Info size={11} /> {label}
    </span>
  );
}

export function RiskMapPreview() {
  const { t } = useTranslation('home');
  return (
    <div className="relative flex h-[588px] w-[760px] flex-col overflow-hidden rounded-[20px] border border-stroke-subtle bg-surface">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-stroke-subtle px-7 py-3">
        <Logo lockup="horizontal" tone="on-light" href={null} markClassName="h-7" />
        <span className="flex items-center gap-1.5 text-body-4xs font-semibold uppercase tracking-wide text-fg-tertiary">
          <Lock size={12} /> {t('riskMapPreview.guestNote')}
        </span>
      </div>

      {/* Header + stats */}
      <div className="px-7 pt-5">
        <p className="text-body-4xs font-semibold uppercase tracking-[0.12em] text-fg-brand">{t('riskMapPreview.eyebrow')}</p>
        <h3 className="mt-1 font-serif text-[22px] font-bold leading-tight text-fg">{t('riskMapPreview.title')}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-1 rounded-xl bg-surface-secondary px-5 py-2.5">
          {STAT_INDICES.map((i) => (
            <span key={i} className="text-body-xs">
              <b className="font-bold text-fg">{t(`riskMapPreview.stats.${i}.value`)}</b>{' '}
              <span className="text-fg-secondary">{t(`riskMapPreview.stats.${i}.label`)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Obligation table (clipped to the window) */}
      <div className="mt-3 flex-1 overflow-hidden px-7 pb-2">
        <div className="overflow-hidden rounded-xl border border-stroke">
          <div className={`${COLS} bg-surface-secondary px-4 py-2 text-body-5xs font-semibold uppercase tracking-wide text-fg-tertiary`}>
            <span>{t('risk.table.severity')}</span>
            <span>{t('risk.table.obligation')}</span>
            <span>{t('risk.table.market')}</span>
            <span>{t('risk.table.due')}</span>
            <span>{t('risk.table.state')}</span>
          </div>
          {ROWS.map((r, i) => (
            <div key={i} className={`${COLS} border-t border-stroke px-4 py-2.5`}>
              <span>
                <RiskBadge level={r.level} size="sm">{t(`risk.severity.${r.level}`)}</RiskBadge>
              </span>
              <div className="min-w-0">
                <p className="truncate text-body-2xs font-semibold text-fg">{t(`riskMapPreview.rows.${i}.title`)}</p>
                <p className="truncate text-body-4xs text-fg-tertiary">{t(`riskMapPreview.rows.${i}.detail`)}</p>
              </div>
              <span className="text-body-3xs text-fg-secondary">{t(`riskMapPreview.rows.${i}.market`)}</span>
              <span>
                <p className="text-body-3xs font-semibold text-fg">{t(`riskMapPreview.rows.${i}.due`)}</p>
                <p className="text-body-5xs text-fg-tertiary">{t(`riskMapPreview.rows.${i}.dueSub`)}</p>
              </span>
              <StateCell kind={r.state} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
