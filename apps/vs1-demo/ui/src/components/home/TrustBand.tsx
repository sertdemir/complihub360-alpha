import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Photo } from '../ui/Photo';
import { TermTip } from '../ui/TermTip';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';

// ─── S5 — The trust band (canvas "Warum diese Lücke" · Variante A, 2026-08-25) ─
// Replaces TwoReflexes ON THE HOMEPAGE ONLY — TwoReflexes stays in the tree.
// The two big image cards and the double headline became redundant once the
// showcases started SHOWING the map and the network; what survives are the six
// trust proofs that stand nowhere else (source-linked entries, freshness,
// plain language, vetted partners, shared responsibility) under one short
// claim. Half a screen instead of two.
//
// The six points reuse twoReflexes.row1.* / row2.* verbatim — only the
// heading is new (trustBand.*). Hairlines between the cells carry the rhythm,
// same language as the hero's proof strip.
//
// Photo to the page edge (canvas "Marketing-Fotos · Look B" · Trust-D,
// 2026-10-24; Trust-A was dropped, the photo was too small for the copy): two
// people at one screen — "on your side", shown rather than claimed. On lg the
// photo fills the left column from the viewport edge and is exactly as tall as
// the copy; the right padding lines the copy up with the 1200px container
// edge of every other section. Below lg it runs full width above the copy.

// row-major cell order: the four map proofs, then the two network proofs.
const POINT_KEYS = ['row1.0', 'row1.1', 'row1.2', 'row1.3', 'row2.0', 'row2.1'] as const;
// Handover 1.0 §8: drei Begriffe mit Erklaerung, je am Punkt, der sie traegt.
const POINT_TIPS: Partial<Record<(typeof POINT_KEYS)[number], 'priority' | 'officialSource' | 'verifiedProvider'>> = {
  'row1.0': 'priority',
  'row1.1': 'officialSource',
  'row2.0': 'verifiedProvider',
};

export function TrustBand() {
  const { t } = useTranslation('home');

  return (
    <section id="why-both" className="bg-surface lg:grid lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
      <Reveal className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[40rem]">
        {/* The column is ~46vw wide and as tall as the copy (~900px): the
            near-square photo then renders ~950px wide under object-cover. */}
        <Photo
          slug="side-by-side"
          sizes="(min-width: 1024px) 960px, 100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </Reveal>

      <div className="px-4 py-16 md:px-10 lg:py-24 lg:pl-[4.5rem] lg:pr-[max(5rem,calc((100vw-75rem)/2+5rem))]">
        <Reveal className="mx-auto flex max-w-[780px] flex-col items-center gap-3.5 text-center lg:mx-0 lg:items-start lg:text-left">
          <SectionEyebrow tone="brand">{t('trustBand.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[1.75rem] font-semibold leading-[1.3] tracking-tight text-fg lg:text-[1.875rem]">
            {t('trustBand.title.line1')}
            <br className="hidden sm:block" />{' '}
            {t('trustBand.title.pre')}
            <GoldWord>{t('trustBand.title.gold')}</GoldWord>
            {t('trustBand.title.post')}
          </h2>
          {/* Handover 1.0 §8: ein Satz unter der Ueberschrift. */}
          {t('trustBand.body') && (
            <p className="max-w-[62ch] text-body-md leading-relaxed text-fg-secondary">{t('trustBand.body')}</p>
          )}
        </Reveal>

        <Stagger stagger={0.08} className="mx-auto mt-9 grid sm:grid-cols-2">
          {POINT_KEYS.map((key, i) => (
            <StaggerItem
              key={key}
              className={`border-stroke-subtle py-5 lg:pr-7 ${i % 2 === 0 ? 'lg:mr-7 lg:border-r' : ''} ${i < 4 ? 'lg:border-b' : ''}`}
            >
              <p className="flex items-start gap-2 text-body-md font-bold text-fg">
                <Check size={15} strokeWidth={2.5} className="mt-1 shrink-0 text-fg-brand" />
                {t(`twoReflexes.${key}.title`)}
              </p>
              <p className="ml-[23px] mt-1.5 text-body-xs leading-relaxed text-fg-secondary">
                {t(`twoReflexes.${key}.desc`)}
              </p>
              {POINT_TIPS[key] && (
                <span className="ml-[23px] mt-2.5 inline-flex">
                  <TermTip variant="chip" tip={t(`tips.${POINT_TIPS[key]}`)}>
                    {t(`tips.terms.${POINT_TIPS[key]}`)}
                  </TermTip>
                </span>
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
