import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Check, Info, ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { Stat } from '../ui/Stat';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S2 — Risk Map example (User LP) · Figma 2470:1774 ───────────────────────
// "Here's what applies to you." — an anonymized full risk-map result inline on
// the landing: stat strip · obligation table · locked partner matches · save CTA.
// Light section; severities use the RiskBadge traffic light.
// Copy lives in the 'home' namespace (riskMap.*, risk.*).

// Compass "Stat" (1100:2): eyebrow label over a large tabular value.
const STAT_INDICES = [0, 1, 2, 3] as const;

type StateKind = 'confirmed' | 'likely' | 'action';

// Display strings come from riskMap.rows.<index>.*; severity + state labels
// derive from risk.severity.* / risk.state.*.
const ROWS: { level: RiskLevel; state: StateKind }[] = [
  { level: 'critical', state: 'confirmed' },
  { level: 'critical', state: 'likely' },
  { level: 'critical', state: 'likely' },
  { level: 'high', state: 'likely' },
  { level: 'high', state: 'confirmed' },
  { level: 'medium', state: 'action' },
  { level: 'medium', state: 'action' },
  { level: 'medium', state: 'confirmed' },
];

const MATCH_PCTS = [94, 88, 81] as const;

const COLS = 'sm:grid sm:grid-cols-[100px_1fr_92px_92px_168px] sm:items-center sm:gap-3';

function StateCell({ kind }: { kind: StateKind }) {
  const { t } = useTranslation('home');
  const label = t(`risk.state.${kind}`);
  if (kind === 'action') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-fg-on-brand">
        {label} <ArrowRight size={13} />
      </span>
    );
  }
  if (kind === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-[12px] font-medium text-fg-secondary">
        <Check size={13} className="text-fg-brand" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke px-3 py-1.5 text-[12px] font-medium text-fg-secondary">
      <Info size={13} /> {label}
    </span>
  );
}

export function RiskMapSection() {
  const { t } = useTranslation('home');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="risk-map" className="bg-surface pt-20 lg:pt-28">
      <Container size="xl">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('riskMap.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('riskMap.title.pre')}<GoldWord>{t('riskMap.title.gold')}</GoldWord>{t('riskMap.title.post')}
          </h2>
          <p className="text-body text-fg-secondary">
            {t('riskMap.subtitle')}
          </p>
        </div>

        {/* Stat strip — Compass Stat (1100:2), single line, same width as the table below */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-xl border border-stroke-subtle bg-surface-secondary px-10 py-6 shadow-[0_18px_44px_-24px_rgba(2,22,17,0.28)]">
          {STAT_INDICES.map((i) => (
            <Stat
              key={i}
              value={<span className="text-fg-accent-emphasis">{t(`riskMap.stats.${i}.value`)}</span>}
              label={t(`riskMap.stats.${i}.label`)}
              size="md"
            />
          ))}
        </div>

        {/* Obligation table */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-8 overflow-hidden rounded-xl border border-stroke bg-surface shadow-[0_50px_110px_-28px_rgba(2,22,17,0.36)]"
        >
          <div className={`hidden px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary sm:px-6 ${COLS} sm:bg-surface-secondary`}>
            <span>{t('risk.table.severity')}</span>
            <span>{t('risk.table.obligation')}</span>
            <span>{t('risk.table.market')}</span>
            <span>{t('risk.table.due')}</span>
            <span>{t('risk.table.state')}</span>
          </div>
          {ROWS.map((r, i) => (
            <div key={i} className={`border-t border-stroke px-5 py-4 first:border-t-0 sm:border-t sm:px-6 ${COLS}`}>
              <span className="mb-2 inline-block sm:mb-0">
                <RiskBadge level={r.level} size="sm">{t(`risk.severity.${r.level}`)}</RiskBadge>
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-fg">{t(`riskMap.rows.${i}.title`)}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-fg-brand">{t(`riskMap.rows.${i}.detail`)}</p>
              </div>
              <span className="mt-2 block text-[12px] text-fg-secondary sm:mt-0">{t(`riskMap.rows.${i}.market`)}</span>
              <span className="mt-1 block sm:mt-0">
                <span className="text-[13px] font-semibold text-fg">{t(`riskMap.rows.${i}.due`)}</span>{' '}
                <span className="text-[11px] text-fg-tertiary sm:block">{t(`riskMap.rows.${i}.dueSub`)}</span>
              </span>
              <span className="mt-3 block sm:mt-0">
                <StateCell kind={r.state} />
              </span>
            </div>
          ))}
        </motion.div>

        {/* Partners */}
        <div className="mt-14">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-fg-brand">{t('riskMap.partnersEyebrow')}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-serif text-[24px] font-bold tracking-tight text-fg">{t('riskMap.partnersTitle')}</h3>
            <a className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-brand">
              <Lock size={13} /> {t('riskMap.unlock')}
            </a>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {MATCH_PCTS.map((pct) => (
              <div
                key={pct}
                className="rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-8 text-center shadow-[0_24px_60px_-28px_rgba(2,22,17,0.25)]"
              >
                <Lock size={18} className="mx-auto text-fg-tertiary" />
                <div className="mx-auto mt-4 h-2.5 w-3/5 rounded bg-neutral-300/70" />
                <div className="mx-auto mt-2 h-2.5 w-2/5 rounded bg-neutral-300/70" />
                <p className="mt-4 text-[14px] font-semibold text-fg-brand">{t('risk.match', { pct })}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Save CTA band — full width */}
      <div className="mt-16 bg-surface-secondary px-6 py-14 text-center lg:py-16">
        <h3 className="font-serif text-[26px] font-bold tracking-tight text-fg">{t('riskMap.save.title')}</h3>
        <p className="mx-auto mt-2 text-[14px] text-fg-secondary">
          {t('riskMap.save.subtitle')}
        </p>
        <Button className="mt-7">
          {t('riskMap.save.cta')} <ArrowRight size={16} className="ml-1.5" />
        </Button>
      </div>
    </section>
  );
}
