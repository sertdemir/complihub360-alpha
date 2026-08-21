import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { GoldWord } from '../providers/SectionHeading';
import { Badge } from '../ui/Badge';

// ─── S7 — Beyond the Assessment · Figma 1229:157 ────────────────────────────
// "From one-time check to home base." A bento grid: a hero card (your persistent
// workspace) beside a stacked pair — live regulatory news + expert content (the
// Beta card carries the gold frame). The assessment is the door; this is the room.

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

// Copy lives in beyond.stats.<i>.* and beyond.news.<i>.* ('home' ns).
const STATS_COUNT = 4;
const NEWS_COUNT = 2;

function Pill({ children, tone }: { children: React.ReactNode; tone: 'live' | 'beta' }) {
  return tone === 'live' ? (
    <Badge shape="pill" tone="brand" appearance="soft" size="sm" className="uppercase tracking-[0.08em]">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      {children}
    </Badge>
  ) : (
    <Badge shape="pill" tone="accent" appearance="soft" size="sm" className="uppercase tracking-[0.08em] ring-1 ring-inset ring-accent-200">
      {children}
    </Badge>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <p className="font-serif text-[2.25rem] font-bold leading-none text-fg-brand">{children}</p>;
}

export function BeyondAssessment() {
  const { t } = useTranslation('home');
  return (
    <section id="beyond" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Header */}
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-brand">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {t('beyond.eyebrow')}
          </span>
          <h2 className="mt-4 font-serif text-[2rem] font-bold leading-[1.1] tracking-tight text-fg sm:text-[3rem]">
            {t('beyond.title.pre')}<GoldWord>{t('beyond.title.gold')}</GoldWord>{t('beyond.title.post')}
          </h2>
          <p className="mt-5 max-w-xl text-body leading-relaxed text-fg-secondary">
            {t('beyond.subtitle')}
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          className="mt-12 grid gap-6 lg:grid-cols-[1.55fr_1fr]"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* 01 — Workspace hero */}
          <motion.div
            variants={item}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col rounded-3xl border border-stroke-subtle bg-surface-secondary p-8 lg:p-10"
          >
            <div className="flex items-start justify-between">
              <Num>01</Num>
              <Pill tone="live">{t('beyond.pills.live')}</Pill>
            </div>

            <div className="mt-7 rounded-2xl border border-stroke-subtle bg-surface p-6">
              <ul className="space-y-4">
                {Array.from({ length: STATS_COUNT }, (_, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-body-sm text-fg-secondary">{t(`beyond.stats.${i}.label`)}</span>
                    <span className="text-body-sm font-bold text-fg">{t(`beyond.stats.${i}.value`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="mt-8 font-serif text-[26px] font-bold leading-[1.2] text-fg">
              {t('beyond.workspace.title')}
            </h3>
            <p className="mt-4 max-w-[44ch] text-body-md leading-relaxed text-fg-secondary">
              {t('beyond.workspace.desc')}
            </p>
          </motion.div>

          {/* Right column — 02 News + 03 Learn */}
          <div className="grid gap-6">
            {/* 02 — News */}
            <motion.div
              variants={item}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-3xl border border-stroke-subtle bg-surface-secondary p-7"
            >
              <Num>02</Num>
              <div className="mt-6 rounded-2xl border border-stroke-subtle bg-surface p-4">
                <ul className="space-y-3">
                  {Array.from({ length: NEWS_COUNT }, (_, i) => (
                    <li key={i} className="flex items-baseline gap-2.5 text-body-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="shrink-0 font-semibold text-fg-brand">{t(`beyond.news.${i}.tag`)}</span>
                      <span className="text-fg-secondary">{t(`beyond.news.${i}.text`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <h3 className="mt-6 font-serif text-[22px] font-bold leading-tight text-fg">{t('beyond.newsCard.title')}</h3>
              <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                {t('beyond.newsCard.desc')}
              </p>
            </motion.div>

            {/* 03 — Learn (gold frame) */}
            <motion.div
              variants={item}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-3xl border border-accent-300 bg-surface-secondary p-7"
            >
              <div className="flex items-start justify-between">
                <Num>03</Num>
                <Pill tone="beta">{t('beyond.pills.beta')}</Pill>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface p-3">
                <span className="grid h-10 w-16 shrink-0 place-items-center rounded-lg bg-brand text-fg-on-brand">
                  <Play size={16} fill="currentColor" />
                </span>
                <div className="min-w-0">
                  <p className="text-body-3xs font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('beyond.learn.meta')}</p>
                  <p className="mt-0.5 truncate text-body-sm font-bold text-fg">{t('beyond.learn.video')}</p>
                </div>
              </div>
              <h3 className="mt-6 font-serif text-[22px] font-bold leading-tight text-fg">{t('beyond.learn.title')}</h3>
              <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                {t('beyond.learn.desc')}
              </p>
            </motion.div>
          </div>
        </motion.div>

        <p className="mt-8 text-body-xs leading-relaxed text-fg-tertiary">
          {t('beyond.footnote')}
        </p>
      </div>
    </section>
  );
}
