import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { SectionEyebrow, GoldWord, SectionNote, Reveal } from './SectionHeading';
import { StructuredRequestCard, demoPartnerData as d } from '../partner-preview';

// ─── S1 — Matchmaking (Provider) · Figma desktop 1789:830 · mobile 1809:838 ───
// "Leads come pre-scoped." A side-by-side contrast: chaotic cold inbound (left)
// vs. one structured, pre-scoped request (right, gold-framed = premium signal).
// Light section. Risk priority shown in petrol tints (never red).

const COLD_EMAILS = [
  {
    subject: 'Quick question about GDPR',
    from: 'founder@startup.de',
    body: '"Hi, do you do GDPR audits? Need someone urgently. When can you hop on a call to walk us through everything?"',
  },
  {
    subject: 'VAT help needed',
    from: 'ops@retailer.com',
    body: '"We’re expanding to a few EU countries. Can you tell us what we need? Also, what do you charge?"',
  },
  {
    subject: '(no subject)',
    from: 'contact-form@unknown',
    body: '"hello packaging compliance question can you help thanks"',
  },
] as const;

export function MatchmakingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="matchmaking" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading block */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">Matchmaking</SectionEyebrow>
          <Typography
            variant="h2"
            weight="semibold"
            className="!text-[2rem] leading-tight tracking-tight text-neutral-900 sm:!text-[2.5rem]"
          >
            Leads come <GoldWord>pre-scoped</GoldWord>. You see what fits.
          </Typography>
          <p className="text-lg font-medium text-primary-600">Less time explaining. More time closing.</p>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-600">
            Every request that lands in your inbox arrives with structure — country scope, business model, revenue
            band, prioritized obligations, and statutory citations. We filter by your coverage and category, rank
            Partner-tier providers first, and route only what fits your practice.
          </p>
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
              Without CompliHub · typical cold inbound
            </p>
            <div className="flex flex-col gap-6">
              {COLD_EMAILS.map((m) => (
                <div key={m.subject}>
                  <p className="text-[15px] font-semibold text-neutral-800">{m.subject}</p>
                  <p className="text-[12px] text-neutral-400">From: {m.from}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-neutral-500">{m.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — structured request (gold-framed = premium) */}
          <div>
            <p className="mb-5 text-caption font-sans font-semibold uppercase tracking-[0.12em] text-primary-600">
              With CompliHub · every request arrives structured
            </p>
            <StructuredRequestCard request={d.featuredRequest} frame="accent" />
          </div>
        </motion.div>

        <div className="mt-12">
          <SectionNote>
            Founding partners decide their own coverage scope. We never push a request outside your declared expertise.
          </SectionNote>
        </div>
      </Container>
    </section>
  );
}
