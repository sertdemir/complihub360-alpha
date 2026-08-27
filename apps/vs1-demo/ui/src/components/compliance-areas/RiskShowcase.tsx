import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Tabs, TabList, Tab } from '../ui/Tabs';
import { RiskBadge } from '../ui/RiskBadge';
import { SectionEyebrow, Reveal } from '../providers/SectionHeading';
import { DOMAIN_BY_SLUG, type DomainSlug } from '../../lib/domains';
import { getAreaObligations, getAreaProfile, rankAreasForMarket } from '../../lib/areaProfiles';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { AREAS } from './areas';
import { SEVERITY_STYLE, SEVERITY_FALLBACK, severityKey } from './severity';
import type { CountryCode } from './types';

interface Props {
  selectedCountry: CountryCode;
}

// ─── Risk showcase (canvas "Risiko und Vergleich" · Variante B, 2026-08-27) ──
// Replaces RiskComparisonGrid + ComparisonMatrix, which stood as two plain
// white panels. ONE text-image split instead: copy standing on the white
// surface left, the Gradient panel right holding a white card that carries
// both views — the ranked risk bars and the side-by-side table — behind a
// Compass filled tab (the FAQ's tab anatomy). The panel plays itself through
// like the homepage atlas: after a few seconds it crossfades to the other
// view; a click on a tab takes over and stops the auto-run. The bars fill one
// after another once the panel scrolls into view (user ask 2026-08-27).
// Severity colors stayed on the bars by design — a petrol-only version washed
// out against the Gradient panel (user decision 2026-08-27).
//
// Everything shown is derived: order and bar length from rankAreasForMarket,
// table cells from the area profiles — nothing risk-related is authored here.
// Copy: compliance.riskPanel.* + the card strings the old panels already had.

const CYCLE_MS = 7000;

function RankingView({ selectedCountry, run }: Props & { run: boolean }) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const reduced = useReducedMotion();
  const localePrefix = locale ? `/${locale}` : '';
  const ranked = rankAreasForMarket(selectedCountry);

  return (
    <div className="space-y-4">
      {ranked.map((r, i) => {
        const def = DOMAIN_BY_SLUG[r.slug];
        const title = t(`compliance.${r.slug}.title`, def?.label ?? r.slug);
        const severity = severityFromRiskWeight(r.weight);
        const style = SEVERITY_STYLE[severity];
        return (
          <motion.div
            key={r.slug}
            initial={reduced ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.1 }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Link
                to={`${localePrefix}/compliance/${r.slug}`}
                className="text-body-xs font-bold text-fg transition-colors hover:text-fg-brand"
              >
                {title}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-body-3xs tabular-nums text-fg-tertiary">{r.weight.toFixed(1)}/10</span>
                <RiskBadge level={severity} size="sm">
                  {t(severityKey(severity), SEVERITY_FALLBACK[severity])}
                </RiskBadge>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
              {/* The fills run one after another — each bar waits for the one
                  above it, which is the whole animation (user ask). */}
              <motion.div
                initial={reduced ? false : { width: 0 }}
                animate={run || reduced ? { width: `${(r.weight / 10) * 100}%` } : { width: 0 }}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.14, ease: 'easeOut' }}
                className={`h-full rounded-full ${style.bar}`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TableView({ selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const reduced = useReducedMotion();
  const localePrefix = locale ? `/${locale}` : '';

  const rows = useMemo(
    () =>
      AREAS.map(({ slug }) => {
        const profile = getAreaProfile(slug);
        const obligations = getAreaObligations(slug, selectedCountry);
        const weight =
          selectedCountry === 'EU'
            ? profile.marketWeights.reduce((s, m) => s + m.weight, 0) / profile.marketWeights.length
            : (profile.marketWeights.find(m => m.code === selectedCountry)?.weight ?? profile.baselineWeight);
        const leadDays = obligations.reduce<number | null>(
          (min, o) => (o.dueDays == null ? min : min == null ? o.dueDays : Math.min(min, o.dueDays)),
          null,
        );
        return {
          slug,
          weight,
          severity: severityFromRiskWeight(weight),
          leadDays,
          exposure: obligations.reduce((sum, o) => sum + (o.penaltyMaxEur ?? 0), 0),
        };
      }).sort((a, b) => b.weight - a.weight),
    [selectedCountry],
  );

  const money = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(v);

  const title = (slug: DomainSlug) => t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug]?.label ?? slug);

  return (
    <div>
      <div className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-x-3 border-b border-stroke-subtle pb-2 text-body-4xs font-bold uppercase tracking-[0.08em] text-fg-tertiary sm:grid-cols-[1.5fr_0.7fr_1fr_0.9fr]">
        <span>{t('compliance.matrix.area', 'Compliance Area')}</span>
        <span>{t('compliance.matrix.col.risk', 'Risk')}</span>
        <span>{t('compliance.matrix.col.time', 'Time to Act')}</span>
        <span className="hidden sm:block">{t('compliance.matrix.col.fine', 'Typical Exposure')}</span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.slug}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className={`grid grid-cols-[1.5fr_0.8fr_1fr] items-center gap-x-3 py-2.5 sm:grid-cols-[1.5fr_0.7fr_1fr_0.9fr] ${
            i < rows.length - 1 ? 'border-b border-stroke-subtle' : ''
          }`}
        >
          <Link
            to={`${localePrefix}/compliance/${row.slug}`}
            className="truncate text-body-2xs font-bold text-fg transition-colors hover:text-fg-brand"
          >
            {title(row.slug)}
          </Link>
          <span>
            <RiskBadge level={row.severity} size="sm">
              {t(severityKey(row.severity), SEVERITY_FALLBACK[row.severity])}
            </RiskBadge>
          </span>
          <span className="text-body-2xs text-fg-secondary">
            {row.leadDays == null ? '—' : t('markets.country.leadTime', { days: row.leadDays })}
          </span>
          <span className="hidden text-body-2xs text-fg-secondary sm:block">
            {row.exposure > 0
              ? t('compliance.matrix.upTo', { defaultValue: 'up to {{sum}}', sum: money(row.exposure) })
              : '—'}
          </span>
        </motion.div>
      ))}
      <p className="mt-3 text-body-4xs leading-relaxed text-fg-tertiary">
        {t(
          'compliance.matrix.disclaimer',
          'Indicative ranges based on public regulatory references. Final exposure depends on your specific case — assess via the wizard for accurate guidance.',
        )}
      </p>
    </div>
  );
}

export function RiskShowcase({ selectedCountry }: Props) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');
  const [tab, setTab] = useState('ranking');
  const [picked, setPicked] = useState(false);

  // Self-run like the homepage atlas: once in view, the panel crossfades to
  // the other view every few seconds until the user takes over.
  useEffect(() => {
    if (!inView || reduced || picked) return;
    const id = setInterval(() => setTab(v => (v === 'ranking' ? 'table' : 'ranking')), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, reduced, picked]);

  const marketLabel =
    selectedCountry === 'EU'
      ? t('compliance.country.euOption', 'EU-wide')
      : t(`markets.countries.${selectedCountry}`, { defaultValue: selectedCountry });

  return (
    <div ref={ref} className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
      <Reveal className="shrink-0 lg:w-[400px]">
        <SectionEyebrow tone="brand">{t('compliance.riskPanel.eyebrow', 'Weighted by the engine')}</SectionEyebrow>
        <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
          {t('compliance.riskPanel.title', 'Where it burns first — computed for your market.')}
        </h2>
        <p className="mt-3.5 text-body leading-relaxed text-fg-secondary">
          {t(
            'compliance.riskPanel.lead',
            'The compliance engine weighs every area from statutes, penalty ranges and deadlines. The ranking shows what needs attention first; the comparison view puts risk, time to act and typical exposure side by side.',
          )}
        </p>
        <p className="mt-5 border-t border-stroke-subtle pt-4 text-body-2xs leading-relaxed text-fg-tertiary">
          {t('compliance.riskPanel.marketNote', {
            defaultValue: 'Weighted for {{market}} — the market selector above recalculates ranking and ranges.',
            market: marketLabel,
          })}
        </p>
      </Reveal>

      <Reveal delay={0.12} className="min-w-0 flex-1 rounded-xl bg-gradient-stage p-5 sm:p-8 lg:p-10">
        <Tabs
          variant="filled"
          size="md"
          value={tab}
          onValueChange={v => {
            setPicked(true);
            setTab(v);
          }}
        >
          <TabList className="mb-5">
            <Tab value="ranking">{t('compliance.riskPanel.tabRanking', 'Risk ranking')}</Tab>
            <Tab value="table">{t('compliance.riskPanel.tabTable', 'Side-by-side')}</Tab>
          </TabList>
        </Tabs>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="rounded-xl bg-surface p-5 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-7"
          >
            <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-stroke-subtle pb-3">
              <span className="font-serif text-[1.125rem] font-bold text-fg">
                {tab === 'ranking'
                  ? t('compliance.riskAtGlance', 'Risk at a Glance')
                  : t('compliance.matrix.title', 'Side-by-side: every area at a glance')}
              </span>
              <span className="text-right text-body-3xs font-semibold text-fg-tertiary">
                {t('compliance.risk.subtitle', 'Weighted for {{market}} by the compliance engine.', {
                  market: marketLabel,
                })}
              </span>
            </div>
            {tab === 'ranking' ? (
              <RankingView selectedCountry={selectedCountry} run={inView} />
            ) : (
              <TableView selectedCountry={selectedCountry} />
            )}
          </motion.div>
        </AnimatePresence>
      </Reveal>
    </div>
  );
}
