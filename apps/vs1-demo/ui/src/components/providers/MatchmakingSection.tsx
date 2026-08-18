import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal } from './SectionHeading';
import { StructuredRequestCard, demoPartnerData as d } from '../partner-preview';

// ─── S1 — Matchmaking (Provider) · Figma desktop 1789:830 · mobile 1809:838 ───
// "Leads come pre-scoped." A side-by-side contrast: chaotic cold inbound (left)
// vs. one structured, pre-scoped request (right, gold-framed = premium signal).
// Light section. Risk priority shown in petrol tints (never red).
// Copy lives in the 'providersLp' namespace; sender addresses stay as fixtures.

const COLD_EMAILS = [
  { key: '0', from: 'founder@startup.de' },
  { key: '1', from: 'ops@retailer.com' },
  { key: '2', from: 'contact-form@unknown' },
] as const;

export function MatchmakingSection() {
  const { t } = useTranslation('providersLp');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="matchmaking" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading block */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('matchmaking.eyebrow')}</SectionEyebrow>
          <Typography
            variant="h2"
            weight="semibold"
            className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]"
          >
            {t('matchmaking.title.pre')} <GoldWord>{t('matchmaking.title.gold')}</GoldWord>
            {t('matchmaking.title.post')}
          </Typography>
          <p className="text-lg font-medium text-primary-600">{t('matchmaking.tagline')}</p>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">{t('matchmaking.lead')}</p>
        </Reveal>

        {/* Comparison */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto mt-14 grid max-w-5xl gap-10 lg:grid-cols-2 lg:gap-14"
        >
          {/* LEFT — cold inbound */}
          <div>
            <p className="mb-5 text-caption font-sans font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {t('matchmaking.coldLabel')}
            </p>
            <div className="flex flex-col gap-6">
              {COLD_EMAILS.map((m) => (
                <div key={m.key}>
                  <p className="text-[15px] font-semibold text-neutral-800">{t(`matchmaking.cold.${m.key}.subject`)}</p>
                  <p className="text-[12px] text-neutral-500">{t('matchmaking.fromLabel', { email: m.from })}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">{t(`matchmaking.cold.${m.key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — structured request (gold-framed = premium) */}
          <div>
            <p className="mb-5 text-caption font-sans font-semibold uppercase tracking-[0.12em] text-primary-600">
              {t('matchmaking.structuredLabel')}
            </p>
            <StructuredRequestCard request={d.featuredRequest} frame="accent" />
          </div>
        </motion.div>

        <div className="mt-12">
          <SectionNote>{t('matchmaking.note')}</SectionNote>
        </div>
      </Container>
    </section>
  );
}
