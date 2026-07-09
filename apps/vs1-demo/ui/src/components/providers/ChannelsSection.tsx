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

const AFFILIATE_POINTS = [
  'No application or approval required',
  'Pay only for click-throughs',
  'Available immediately on sign-up',
] as const;

const ENGAGEMENT_POINTS = [
  'Pre-qualified by user-completed risk maps',
  'Pay only when you accept (not on receive)',
  'Founding-Partner badge + tier ranking included',
] as const;

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-neutral-700">
      <Check size={16} className="mt-0.5 shrink-0 text-primary-600" strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

export function ChannelsSection() {
  return (
    <section id="channels" className="bg-gradient-to-b from-[#0e4135] to-[#072a22] py-20 lg:py-28">
      <Container size="2xl">
        {/* Heading (inverse) */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="inverse">Two channels · pick what fits</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-white sm:!text-[2.5rem]">
            Two paths to leads. Both <GoldWord>transparent</GoldWord>.
          </Typography>
          <p className="max-w-2xl text-base leading-relaxed text-white/80">
            Provider monetization is layered. The affiliate channel is open to every provider — pay per click,
            list-as-found. The engagement channel is partner-tier exclusive — pay only when you accept a structured
            request. Pick one, run both, or upgrade later.
          </p>
        </Reveal>

        {/* Two cards */}
        <Stagger stagger={0.14} className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Affiliate Link */}
          <StaggerItem className="flex flex-col rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            <p className="text-caption font-sans font-semibold uppercase tracking-[0.12em] text-primary-600">Open to all providers</p>
            <Typography variant="h3" weight="semibold" className="mt-2 !text-[1.6rem] text-neutral-900">Affiliate Link</Typography>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
              Visibility-only. Drive traffic to your own site from your listing in CompliHub results.
            </p>

            {/* Listing preview — shared EntityCard */}
            <EntityCard
              className="mt-5"
              avatar={<Avatar size="sm" initials="ML" />}
              name="M. Lang Compliance"
              meta="Munich · VAT & OSS specialist"
              badge={<Badge tone="neutral" appearance="soft" size="sm">Sponsored</Badge>}
              trailing={<span className="shrink-0 text-[12px] font-semibold text-primary-600">Visit →</span>}
            />

            {/* Pricing */}
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Pricing</p>
              <p className="mt-1">
                <span className="text-[34px] font-bold text-neutral-900">$2</span>
                <span className="ml-2 text-[14px] text-neutral-500">per click on Visit website</span>
              </p>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              {AFFILIATE_POINTS.map((p) => <Bullet key={p}>{p}</Bullet>)}
            </ul>

            <div className="mt-auto pt-7">
              <Button fullWidth>Set up affiliate link <ArrowRight size={16} className="ml-1.5" /></Button>
              <p className="mt-3 text-center text-[12px] text-neutral-400">Pause or disable from your dashboard anytime · no minimum commitment</p>
            </div>
          </StaggerItem>

          {/* Engagement Requests (gold-framed, premium) */}
          <StaggerItem className="flex flex-col rounded-2xl border-2 border-accent-400/70 bg-white p-6 shadow-lg sm:p-8">
            <p className="text-caption font-sans font-semibold uppercase tracking-[0.12em] text-accent-600">Partner-tier · sign-up to unlock</p>
            <Typography variant="h3" weight="semibold" className="mt-2 !text-[1.6rem] text-neutral-900">Engagement Requests</Typography>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
              Pre-qualified, structured leads in your inbox. Risk-free until you accept.
            </p>

            {/* Structured request — shared block */}
            <div className="mt-5">
              <StructuredRequestCard request={d.featuredRequest} frame="brand" showAccept />
            </div>

            {/* Pricing */}
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Pricing</p>
              <p className="mt-1">
                <span className="text-[34px] font-bold text-neutral-900">$100</span>
                <span className="ml-2 text-[14px] text-neutral-500">per accepted request · not per inquiry</span>
              </p>
            </div>

            <ul className="mt-5 flex flex-col gap-2.5">
              {ENGAGEMENT_POINTS.map((p) => <Bullet key={p}>{p}</Bullet>)}
            </ul>

            <div className="mt-auto pt-5">
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-[12px] font-medium text-accent-700">
                <Lock size={13} /> Apply for Beta cohort to unlock this channel
              </div>
              <Button fullWidth className="bg-accent-500 text-primary-900 hover:bg-accent-600">
                Apply for Beta cohort <ArrowRight size={16} className="ml-1.5" />
              </Button>
              <p className="mt-3 text-center text-[12px] text-neutral-400">Decline freely · we only bill on accept · pause incoming anytime</p>
            </div>
          </StaggerItem>
        </Stagger>

        <div className="mt-12">
          <SectionNote inverse>
            Both channels show the same outcome: a user reaches you. The difference is who sets the friction — and who knows what they're getting.
          </SectionNote>
        </div>
      </Container>
    </section>
  );
}
