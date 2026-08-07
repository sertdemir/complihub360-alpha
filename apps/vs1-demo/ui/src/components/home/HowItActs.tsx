import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S5 — How CompliHub Acts · Figma 1247:435 ───────────────────────────────
// "What happens between the match and the resolution." Three numbered cards —
// cost, response SLA, and the engagement trail — each with a detail panel, laid
// out as wide landscape rows (number · text · panel). Cards reveal top-to-bottom
// on scroll.

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function Card({ n, panel, title, desc }: { n: string; panel: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      variants={item}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="grid gap-6 rounded-2xl bg-surface p-7 shadow-[0_30px_70px_-34px_rgba(2,22,17,0.3)] md:grid-cols-[auto_1fr_minmax(300px,400px)] md:items-center md:gap-10 md:p-9"
    >
      <p className="font-serif text-[2.5rem] font-bold leading-none text-fg-brand md:text-[3rem]">{n}</p>
      <div>
        <p className="font-serif text-[20px] font-bold text-fg md:text-[24px]">{title}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-fg-secondary md:text-[15px]">{desc}</p>
      </div>
      <div className="rounded-xl bg-surface-secondary p-5">{panel}</div>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{children}</p>;
}

// Timeline copy lives in howItActs.panel3.timeline.<index>.* ('home' ns).
const TIMELINE_COUNT = 4;

export function HowItActs() {
  const { t } = useTranslation('home');
  return (
    <section id="engagement" className="bg-surface-secondary py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Heading (left-aligned) */}
        <div className="max-w-2xl">
          <SectionEyebrow tone="brand">{t('howItActs.eyebrow')}</SectionEyebrow>
          <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
            {t('howItActs.title.pre')}<GoldWord>{t('howItActs.title.gold')}</GoldWord>{t('howItActs.title.post')}
          </h2>
          <p className="mt-5 text-body leading-relaxed text-fg-secondary">
            {t('howItActs.subtitle')}
          </p>
        </div>

        {/* Cards — landscape rows, top-to-bottom stagger reveal */}
        <motion.div
          className="mt-14 flex flex-col gap-6"
          variants={{ show: { transition: { staggerChildren: 0.14 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <Card
            n="01"
            title={t('howItActs.cards.0.title')}
            desc={t('howItActs.cards.0.desc')}
            panel={
              <div className="divide-y divide-stroke">
                <div className="pb-3">
                  <Label>{t('howItActs.panel1.estCost')}</Label>
                  <p className="mt-1 text-[15px] font-semibold text-fg">{t('howItActs.panel1.estValue')}</p>
                </div>
                <div className="py-3">
                  <Label>{t('howItActs.panel1.scope')}</Label>
                  <p className="mt-1 text-[14px] font-medium text-fg">{t('howItActs.panel1.scopeValue')}</p>
                </div>
                <div className="pt-3">
                  <Label>{t('howItActs.panel1.approval')}</Label>
                  <p className="mt-1 text-[14px] font-medium text-fg">{t('howItActs.panel1.approvalValue')}</p>
                </div>
              </div>
            }
          />
          <Card
            n="02"
            title={t('howItActs.cards.1.title')}
            desc={t('howItActs.cards.1.desc')}
            panel={
              <div>
                <Label>{t('howItActs.panel2.label')}</Label>
                <p className="mt-2 text-[2rem] font-bold leading-none text-fg-brand">&le; 48h</p>
                <p className="mt-3 text-[13px] leading-relaxed text-fg-secondary">
                  {t('howItActs.panel2.note')}
                </p>
              </div>
            }
          />
          <Card
            n="03"
            title={t('howItActs.cards.2.title')}
            desc={t('howItActs.cards.2.desc')}
            panel={
              <div>
                <ul className="space-y-2.5">
                  {Array.from({ length: TIMELINE_COUNT }, (_, i) => (
                    <li key={i} className="flex items-center gap-3 text-[13px]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="w-12 shrink-0 font-semibold text-fg">{t(`howItActs.panel3.timeline.${i}.date`)}</span>
                      <span className="text-fg-secondary">{t(`howItActs.panel3.timeline.${i}.label`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-1.5 border-t border-stroke pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-brand">
                  {t('howItActs.panel3.export')} <Download size={12} /> <span className="text-fg-tertiary">PDF · CSV · API</span>
                </p>
              </div>
            }
          />
        </motion.div>
      </div>
    </section>
  );
}
