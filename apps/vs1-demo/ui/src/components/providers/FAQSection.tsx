import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Accordion, AccordionItem } from '../ui/Accordion';
import { SectionEyebrow, GoldWord, Reveal } from './SectionHeading';

// ─── S5 — FAQ (Provider) · Figma 1800:829 ─────────────────────────────────────
// "The things you'd ask. Answered." Ghost-style accordion (divider lines), using
// the Compass Accordion primitive. Light section.

const FAQ = [
  {
    value: 'cost',
    q: 'What does it cost to participate?',
    a: 'Two channels, both transparent. Affiliate Link is €2 per click — open to all providers, no application. Engagement Requests are €92 (≈ $100) per accepted request, partner-tier only. No subscription, no monthly fee, no minimum spend. You pay only on action — clicks or accepts. Cancel or pause anytime.',
  },
  {
    value: 'prequal',
    q: 'How are leads pre-qualified?',
    a: 'Every request comes from a user who completed a structured compliance assessment — country scope, business model, revenue band, and prioritized obligations with statutory citations. We match against your declared coverage and category, then rank Partner-tier providers first.',
  },
  {
    value: 'accept',
    q: 'What happens after I accept a request?',
    a: "On Accept, we transfer the full request package to you — user profile, prioritized obligations, statutory citations, direct contact details. That's it. We don't track the engagement outcome. From there, it's your relationship in your preferred tooling. You'll see the engagement in your Active tab for your own reference. We bill the accept fee within 24h.",
  },
  {
    value: 'decline',
    q: 'Can I decline a request without penalty?',
    a: 'Yes. Decline any request with no fee and no tier impact — we only bill on accept. Declining requests outside your declared scope simply tells us to route differently next time.',
  },
  {
    value: 'partner-tier',
    q: 'How do I qualify for Partner-tier?',
    a: 'Partner-tier is currently invite + Beta-cohort based. Consistent acceptance, fast SLA response, and verified credentials move you up. Founding-Partner status is granted to the first cohort and carries a badge that travels with every request a user sees.',
  },
  {
    value: 'sla',
    q: 'What if I miss SLA?',
    a: 'We confirm in 24h, reply in 48h. Miss one and we flag it on your dashboard with a heads-up. Repeated breaches trigger a Tier-2 review — but only after a 7-day early-warning with concrete actions. No silent demotions.',
  },
  {
    value: 'team',
    q: 'Can I share access with my team?',
    a: 'Today the workspace is single-login. Team seats with role-based permissions are on the Beta roadmap, so colleagues can triage and respond under one partner account.',
  },
  {
    value: 'billing',
    q: 'When am I billed?',
    a: 'Affiliate clicks are billed monthly in arrears. Engagement accepts are billed within 24h of acceptance. No upfront cost, no subscription — you only ever pay for a click or an accept.',
  },
] as const;

export function FAQSection() {
  return (
    <section id="faq" className="bg-surface py-20 lg:py-28">
      <Container size="lg">
        <Reveal className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">Before you apply</SectionEyebrow>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]">
            The things you'd ask. <GoldWord>Answered</GoldWord>.
          </Typography>
        </Reveal>

        <Reveal delay={0.1}>
          <Accordion type="multiple" styleVariant="ghost" size="lg" defaultValue={['cost', 'accept']} className="mx-auto max-w-3xl">
            {FAQ.map((f) => (
              <AccordionItem key={f.value} value={f.value} title={f.q}>
                <p className="leading-relaxed text-neutral-600">{f.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <p className="mx-auto mt-12 max-w-2xl text-center text-ui-small text-neutral-500">
          Couldn't find it? Email{' '}
          <a href="mailto:partners@complihub360.com" className="font-medium text-primary-600 hover:text-primary-700">
            partners@complihub360.com
          </a>{' '}
          — we answer within 1 business day.
        </p>
      </Container>
    </section>
  );
}
