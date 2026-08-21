import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';

// ─── S3 — How It Works · Brand & Marketing Map V1 §4 position 3 ──────────────
// The condensed form of the five-stage frame: Understand → Assess → Decide →
// Match → Act. Kicker and one-line title only, so the homepage stays scannable;
// the reasoning behind each stage lives on /how-it-works.
//
// It shares the copy with that page (common.json → howItWorks.*) rather than
// duplicating it, so the two can never drift apart. Only the intro and the link
// are specific to the homepage.

const STAGE_COUNT = 5;

export function HowItWorksSteps() {
  const { t } = useTranslation('common');
  const { locale } = useParams();

  return (
    <section id="the-five-steps" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        <Reveal className="mx-auto flex max-w-[720px] flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('howItWorks.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg lg:text-[2.5rem]">
            {t('howItWorks.title.pre')}
            <GoldWord>{t('howItWorks.title.gold')}</GoldWord>
            {t('howItWorks.title.post')}
          </h2>
          <p className="text-body-lg leading-relaxed text-fg-secondary">{t('howItWorks.lead')}</p>
        </Reveal>

        <Stagger className="mx-auto mt-14 grid max-w-[1080px] gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: STAGE_COUNT }, (_, i) => (
            <StaggerItem
              key={i}
              className="rounded-2xl border border-stroke-subtle bg-surface-secondary p-6"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-light text-body-sm font-bold tabular-nums text-fg-brand">
                {i + 1}
              </span>
              <p className="mt-4 text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                {t(`howItWorks.stages.${i}.kicker`)}
              </p>
              <p className="mt-1.5 text-body-md font-bold leading-snug text-fg">
                {t(`howItWorks.stages.${i}.title`)}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.15} className="mt-10 flex justify-center">
          <Link
            to={`/${locale ?? 'en'}/how-it-works`}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            {t('howItWorks.seeAll')}
            <ArrowRight size={15} />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
