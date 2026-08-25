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
// the section: the reader does not have a problem, they have an unclear picture
// — which is why it stands large and upright, not as an italic afterthought
// (canvas review 2026-08-25). The four cards sit on the Gradient panel
// (CLAUDE.md), their indices in gold serif.
//
// Copy lives in home.json → problemRecognition.* (en/de/es/tr).

const CARD_COUNT = 4;

export function ProblemRecognition() {
  const { t } = useTranslation('home');

  return (
    <section id="why-this-is-hard" className="bg-surface py-20 lg:py-28">
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

        <div className="mx-auto mt-14 max-w-[1140px] rounded-xl bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] p-5 sm:p-12">
        {/* User spec 2026-08-25: the cards appear one after another, smooth —
            0.18s apart so the sequence is clearly readable, not one wave. */}
        <Stagger stagger={0.18} className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <StaggerItem
              key={i}
              className="rounded-xl border border-neutral-100 bg-surface p-7 text-left shadow-[0_24px_60px_-28px_rgba(2,22,17,0.25)]"
            >
              {/* Gold serif indices — a set, not a sequence: these happen all
                  at once, not in order. */}
              <span className="font-serif text-[1.375rem] font-bold tabular-nums text-fg-accent-emphasis">
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
        </div>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-12 max-w-2xl text-center font-serif text-[1.375rem] font-semibold leading-snug text-fg-brand">
            {t('problemRecognition.note')}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
