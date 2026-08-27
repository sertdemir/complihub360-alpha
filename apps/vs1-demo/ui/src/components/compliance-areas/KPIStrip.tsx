import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { Globe, Layers, Timer, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Stagger, StaggerItem } from '../providers/SectionHeading';
import { DOMAINS } from '../../lib/domains';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── KPI card (canvas "Compliance-Hub · Hero" · Variante B, 2026-08-26) ──────
// ONE white card the page floats over the Gradient's bottom edge — the four
// KPIs in the homepage promise-row language: pure gold icons, serif values
// counting up in view, hairlines between the cells instead of tile boxes.
//
// The domain count is read from the canonical list, never typed out: it said
// "6" while the product had eight, because a literal cannot notice that a
// domain was added.
const ITEMS: { icon: LucideIcon; key: string; count?: number; value?: string; labelDefault: string }[] = [
  { icon: Globe, key: 'jurisdictions', count: 27, labelDefault: 'Jurisdictions Covered' },
  { icon: Layers, key: 'domains', count: DOMAINS.length, labelDefault: 'Compliance Domains' },
  { icon: Timer, key: 'time', value: '< 5 min', labelDefault: 'Guided Assessment' },
  { icon: ShieldCheck, key: 'specialists', value: '✓', labelDefault: 'Verified Specialists Network' },
];

function CountUp({ to, run }: { to: number; run: boolean }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setV(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return <>{run || reduced ? v : 0}</>;
}

export function KPIStrip() {
  const { t } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');

  return (
    <div
      ref={ref}
      className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-32px_rgba(2,22,17,0.35)] dark:bg-surface-secondary lg:px-8"
    >
      <Stagger
        stagger={0.12}
        className="grid grid-cols-1 gap-y-7 sm:grid-cols-2 desktop-s:grid-cols-4 desktop-s:divide-x desktop-s:divide-stroke-subtle"
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={item.key} className="flex items-start gap-4 desktop-s:px-6 desktop-s:first:pl-0 desktop-s:last:pr-0">
              <Icon size={34} strokeWidth={1.7} className="mt-0.5 shrink-0 text-fg-accent-emphasis" aria-hidden />
              <span className="min-w-0">
                <span className="block font-serif text-[1.625rem] font-bold leading-none tabular-nums text-fg">
                  {item.count !== undefined ? <CountUp to={item.count} run={inView} /> : item.value}
                </span>
                <span className="mt-1.5 block text-body-xs leading-snug text-fg-secondary">
                  {t(`compliance.kpi.${item.key}`, item.labelDefault)}
                </span>
              </span>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
