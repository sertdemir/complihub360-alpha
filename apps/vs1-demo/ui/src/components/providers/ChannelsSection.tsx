import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Lock } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { EntityCard } from '../ui/Cards';
import { SectionEyebrow, GoldWord, SectionNote, Reveal, Stagger, StaggerItem } from './SectionHeading';
import { StructuredRequestCard, demoPartnerData as d } from '../partner-preview';

// ─── S4 — Two Channels (Affiliate + Engagement) · Figma 1799:822 ──────────────
// Marketing DARK band (petrol). Two transparent monetization paths side by side:
// Affiliate Link (open to all) vs. Engagement Requests (partner-tier, gold-framed).
// Copy lives in the 'providersLp' namespace; prices stay hardcoded ($2 / $100).

const POINT_KEYS = ['0', '1', '2'] as const;

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-neutral-700">
      <Check size={16} className="mt-0.5 shrink-0 text-primary-600" strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

export function ChannelsSection() {
  const { t } = useTranslation('providersLp');

  return (
    <section id="channels" className="bg-gradient-to-b from-[#0e4135] to-[#072a22] py-20 lg:py-28">
      <Container size="2xl">
        {/* Heading (inverse) */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="inverse">{t('channels.eyebrow')}</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-white sm:!text-[2.5rem]">
            {t('channels.title.pre')} <GoldWord>{t('channels.title.gold')}</GoldWord>
            {t('channels.title.post')}
          </Typography>
          <p className="max-w-2xl text-base leading-relaxed text-white/80">{t('channels.lead')}</p>
        </Reveal>

        {/* Two cards */}
        <Stagger stagger={0.14} className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Affiliate Link */}
          <StaggerItem className="flex flex-col rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            <p className="text-caption font-sans font-semibold uppercase tracking-[0.12em] text-primary-600">{t('channels.affiliate.tag')}</p>
            <Typography variant="h3" weight="semibold" className="mt-2 !text-[1.6rem] text-neutral-900">{t('channels.affiliate.title')}</Typography>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{t('channels.affiliate.desc')}</p>

            {/* Listing preview — shared EntityCard */}
            <EntityCard
              className="mt-5"
              avatar={<Avatar size="sm" initials="ML" />}
              name="M. Lang Compliance"
              meta={t('channels.affiliate.listingMeta')}
              badge={<Badge tone="neutral" appearance="soft" size="sm">{t('channels.affiliate.listingBadge')}</Badge>}
              trailing={<span className="shrink-0 text-[12px] font-semibold text-primary-600">{t('channels.affiliate.listingVisit')}</span>}
            />

            {/* Pricing */}
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{t('channels.pricingLabel')}</p>
              <p className="mt-1">
                <span className="text-[34px] font-bold text-neutral-900">$2</span>
                <span className="ml-2 text-[14px] text-neutral-500">{t('channels.affiliate.priceUnit')}</span>
              </p>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              {POINT_KEYS.map((k) => <Bullet key={k}>{t(`channels.affiliate.points.${k}`)}</Bullet>)}
            </ul>

            <div className="mt-auto pt-7">
              <Button fullWidth>{t('channels.affiliate.cta')} <ArrowRight size={16} className="ml-1.5" /></Button>
              <p className="mt-3 text-center text-[12px] text-neutral-500">{t('channels.affiliate.footnote')}</p>
            </div>
          </StaggerItem>

          {/* Engagement Requests (gold-framed, premium) */}
          <StaggerItem className="flex flex-col rounded-2xl border-2 border-accent-400/70 bg-white p-6 shadow-lg sm:p-8">
            <p className="text-caption font-sans font-semibold uppercase tracking-[0.12em] text-accent-600">{t('channels.engagement.tag')}</p>
            <Typography variant="h3" weight="semibold" className="mt-2 !text-[1.6rem] text-neutral-900">{t('channels.engagement.title')}</Typography>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{t('channels.engagement.desc')}</p>

            {/* Structured request — shared block */}
            <div className="mt-5">
              <StructuredRequestCard request={d.featuredRequest} frame="brand" showAccept />
            </div>

            {/* Pricing */}
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{t('channels.pricingLabel')}</p>
              <p className="mt-1">
                <span className="text-[34px] font-bold text-neutral-900">$100</span>
                <span className="ml-2 text-[14px] text-neutral-500">{t('channels.engagement.priceUnit')}</span>
              </p>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              {POINT_KEYS.map((k) => <Bullet key={k}>{t(`channels.engagement.points.${k}`)}</Bullet>)}
            </ul>

            <div className="mt-auto pt-5">
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-[12px] font-medium text-accent-700">
                <Lock size={13} /> {t('channels.engagement.lockNote')}
              </div>
              <Button fullWidth>
                {t('channels.engagement.cta')} <ArrowRight size={16} className="ml-1.5" />
              </Button>
              <p className="mt-3 text-center text-[12px] text-neutral-500">{t('channels.engagement.footnote')}</p>
            </div>
          </StaggerItem>
        </Stagger>

        <div className="mt-12">
          <SectionNote inverse>{t('channels.note')}</SectionNote>
        </div>
      </Container>
    </section>
  );
}
