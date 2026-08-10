import { useTranslation } from 'react-i18next';
import { Container } from '../ui/Container';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';

// ─── S2 — Problem Recognition · Brand & Marketing Map V1 §4/§5 ───────────────
// The section the report found missing: the reader should recognise their own
// situation before we say anything about the product. Four pains, named the way
// someone would actually say them — contradictory advice, overselling, time lost
// in scoping, nothing comparable.
//
// §5 rules out fear, so there is deliberately no penalty, no deadline and no
// "you may be exposed" anywhere in here. The closing note is the whole point of
// the section: the reader does not have a problem, they have an unclear picture.
//
// Copy lives in home.json → problemRecognition.* (en/de/es/tr).

const CARD_COUNT = 4;

export function ProblemRecognition() {
  const { t } = useTranslation('home');

  return (
    <section id="why-this-is-hard" className="bg-surface-secondary py-20 lg:py-28">
      <Container size="xl">
        <Reveal className="mx-auto flex max-w-[720px] flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('problemRecognition.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg lg:text-[2.5rem]">
            {t('problemRecognition.title.pre')}
            <GoldWord>{t('problemRecognition.title.gold')}</GoldWord>
            {t('problemRecognition.title.post')}
          </h2>
          <p className="text-body-lg leading-relaxed text-fg-secondary">
            {t('problemRecognition.lead')}
          </p>
        </Reveal>

        <Stagger className="mx-auto mt-14 grid max-w-[980px] gap-5 sm:grid-cols-2">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <StaggerItem
              key={i}
              className="rounded-2xl border border-stroke-subtle bg-surface p-7 text-left"
            >
              {/* The quiet index keeps the four readable as a set without
                  implying a sequence — these happen all at once, not in order. */}
              <span className="text-[12px] font-semibold tabular-nums text-fg-tertiary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                {t(`problemRecognition.items.${i}.title`)}
              </p>
              <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
                {t(`problemRecognition.items.${i}.desc`)}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-12 max-w-2xl text-center text-body leading-relaxed text-fg-brand">
            {t('problemRecognition.note')}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
