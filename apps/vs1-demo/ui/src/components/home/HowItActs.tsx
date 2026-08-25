import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../providers/SectionHeading';

// ─── S5 — How CompliHub360 Acts (canvas "Ein Mandat von innen" · C, 2026-08-25) ─
// "What happens between the match and the resolution." Restyled in place from
// the grey landscape rows to the reviewed Band variant: ONE full-bleed
// Gradient band (CLAUDE.md) carrying the centred heading and three column
// cards — gold serif index, title, copy, and the detail exhibit (cost / SLA /
// trail) anchored at the card's bottom. Same id ("engagement", the header's
// Pricing anchor), same howItActs.* copy — the stage changed, not the content.
// Cards stagger in left-to-right on scroll; reduced motion shows them in place.

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-body-4xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{children}</p>;
}

function Card({ n, panel, title, desc }: { n: string; panel: React.ReactNode; title: string; desc: string }) {
  return (
    <StaggerItem className="flex">
      <div className="flex w-full flex-col rounded-xl bg-surface p-7 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] lg:p-8">
        <p className="font-serif text-[21px] font-bold leading-none text-fg-accent-emphasis">{n}</p>
        <p className="mt-3.5 font-serif text-[21px] font-bold leading-snug text-fg">{title}</p>
        <p className="mb-5 mt-2.5 text-body-sm leading-relaxed text-fg-secondary">{desc}</p>
        <div className="mt-auto rounded-[10px] bg-surface-secondary p-5">{panel}</div>
      </div>
    </StaggerItem>
  );
}

// Timeline copy lives in howItActs.panel3.timeline.<index>.* ('home' ns).
const TIMELINE_COUNT = 4;

export function HowItActs() {
  const { t } = useTranslation('home');
  return (
    <section id="engagement" className="bg-surface">
      {/* ONE block (user decision 2026-08-25): the heading lives INSIDE the
          full-bleed Gradient band, above the three cards — nothing of this
          section sits outside the tinted container any more. */}
      <div className="bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] px-4 py-16 md:px-6 lg:px-10 lg:py-20">
        <Reveal className="mx-auto flex max-w-[820px] flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('howItActs.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('howItActs.title.pre')}<GoldWord>{t('howItActs.title.gold')}</GoldWord>{t('howItActs.title.post')}
          </h2>
          <p className="max-w-[62ch] text-body leading-relaxed text-fg-secondary">{t('howItActs.subtitle')}</p>
        </Reveal>

        <div className="mt-12 lg:mt-14">
        <Stagger stagger={0.14} className="mx-auto grid max-w-[1320px] gap-5 md:grid-cols-3">
          <Card
            n="01"
            title={t('howItActs.cards.0.title')}
            desc={t('howItActs.cards.0.desc')}
            panel={
              <div className="divide-y divide-stroke">
                <div className="pb-3">
                  <Label>{t('howItActs.panel1.estCost')}</Label>
                  <p className="mt-1 text-body-md font-semibold text-fg">{t('howItActs.panel1.estValue')}</p>
                </div>
                <div className="py-3">
                  <Label>{t('howItActs.panel1.scope')}</Label>
                  <p className="mt-1 text-body-sm font-medium text-fg">{t('howItActs.panel1.scopeValue')}</p>
                </div>
                <div className="pt-3">
                  <Label>{t('howItActs.panel1.approval')}</Label>
                  <p className="mt-1 text-body-sm font-medium text-fg">{t('howItActs.panel1.approvalValue')}</p>
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
                <p className="mt-3 text-body-xs leading-relaxed text-fg-secondary">
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
                    <li key={i} className="flex items-center gap-3 text-body-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="w-12 shrink-0 font-semibold text-fg">{t(`howItActs.panel3.timeline.${i}.date`)}</span>
                      <span className="text-fg-secondary">{t(`howItActs.panel3.timeline.${i}.label`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-1.5 border-t border-stroke pt-3 text-body-3xs font-semibold uppercase tracking-[0.08em] text-fg-brand">
                  {t('howItActs.panel3.export')} <Download size={12} /> <span className="text-fg-tertiary">PDF · CSV · API</span>
                </p>
              </div>
            }
          />
        </Stagger>
        </div>
      </div>
    </section>
  );
}
