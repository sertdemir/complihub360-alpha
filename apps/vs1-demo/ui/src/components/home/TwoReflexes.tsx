import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S3 — Two Reflexes Made Visible · Figma 1267:457 ─────────────────────────
// "Regulation is fragmented. Specialists are siloed. Both stay broken if you
// only fix one." Two alternating rows, each a cream visual card (topographic map
// / curated network, petrol footer band) + a lead paragraph with a checklist.

// Checklist copy lives in twoReflexes.row1.* / twoReflexes.row2.* ('home' ns).
const ROW1_COUNT = 4;
const ROW2_COUNT = 2;

function Checklist({ baseKey, count }: { baseKey: string; count: number }) {
  const { t } = useTranslation('home');
  return (
    <ul className="mt-6 space-y-5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-brand-light text-fg-brand">
            <Check size={13} strokeWidth={3} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-fg">{t(`${baseKey}.${i}.title`)}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-secondary">{t(`${baseKey}.${i}.desc`)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Card with the real exported Figma visual (3D terrain / curated network). The
// cream matches each source image so the title strip blends seamlessly into it.
function ReflexCard({
  title,
  label,
  image,
  imageW,
  imageH,
  cream,
}: {
  title: string;
  label: string;
  image: string;
  imageW: number;
  imageH: number;
  cream: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-stroke-subtle shadow-[0_40px_90px_-40px_rgba(2,22,17,0.35)]">
      <div style={{ backgroundColor: cream }}>
        <h3 className="px-7 pt-7 font-serif text-[2rem] font-bold leading-[1.2] text-fg">{title}</h3>
        <img src={image} alt="" width={imageW} height={imageH} className="mt-5 block w-full" />
      </div>
      <div
        className="flex min-h-[120px] items-center justify-center text-center text-[16px] font-semibold uppercase tracking-[0.08em] text-white"
        style={{ backgroundColor: '#426767' }}
      >
        {label}
      </div>
    </div>
  );
}

function Row({ card, body, cardSide }: { card: ReactNode; body: ReactNode; cardSide: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className={cardSide === 'right' ? 'lg:order-2' : ''}>{card}</div>
      <div className={cardSide === 'right' ? 'lg:order-1' : ''}>{body}</div>
    </motion.div>
  );
}

export function TwoReflexes() {
  const { t } = useTranslation('home');
  return (
    <section id="why-the-gap" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Title block */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('twoReflexes.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('twoReflexes.title.pre')}<GoldWord>{t('twoReflexes.title.gold')}</GoldWord>{t('twoReflexes.title.post')}
          </h2>
          <p className="max-w-2xl text-body leading-relaxed text-fg-secondary">
            {t('twoReflexes.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-16 flex max-w-[1080px] flex-col gap-16 lg:mt-20 lg:gap-24">
          <Row
            cardSide="left"
            card={
              <ReflexCard
                title={t('twoReflexes.card1.title')}
                label={t('twoReflexes.card1.label')}
                image="/img/reflex-map.png"
                imageW={418}
                imageH={293}
                cream="#F8F5EE"
              />
            }
            body={
              <div>
                <p className="text-body leading-relaxed text-fg-secondary">
                  {t('twoReflexes.row1Lead')}
                </p>
                <Checklist baseKey="twoReflexes.row1" count={ROW1_COUNT} />
              </div>
            }
          />
          <Row
            cardSide="right"
            card={
              <ReflexCard
                title={t('twoReflexes.card2.title')}
                label={t('twoReflexes.card2.label')}
                image="/img/reflex-network.png"
                imageW={418}
                imageH={299}
                cream="#F8F5EE"
              />
            }
            body={
              <div>
                <p className="text-body leading-relaxed text-fg-secondary">
                  {t('twoReflexes.row2Lead')}
                </p>
                <Checklist baseKey="twoReflexes.row2" count={ROW2_COUNT} />
              </div>
            }
          />
        </div>
      </Container>
    </section>
  );
}
