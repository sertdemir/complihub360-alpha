import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Globe,
  Lock,
  MessageSquare,
  Building2,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S4 — What CompliHub Knows · Figma 1249:439 ──────────────────────────────
// "Six domains. One coherent map." A 3×2 grid of domain cards (gold frame on
// hover) that stagger-reveal on scroll; clicking one opens the domain side-sheet
// (Figma 1650:5764) with cover/when-this-matters detail.

type Domain = {
  icon: LucideIcon;
  title: string;
  markets: string;
  desc: string;
  intro: string;
  cover: string[];
  matters: string[];
};

const DOMAINS: Domain[] = [
  {
    icon: BarChart3,
    title: 'VAT & Tax',
    markets: 'DE · UK · NL · FR · IT · ES',
    desc: 'Cross-border VAT, OSS/IOSS, intra-community supply, distance-selling thresholds.',
    intro:
      'Cross-border VAT, OSS/IOSS, intra-community supply, distance-selling thresholds. Six markets means six VAT regimes, six registration thresholds, six filing cadences. We track each.',
    cover: [
      'OSS / IOSS quarterly returns',
      'Distance-selling threshold monitoring',
      'Intra-community supply VAT',
      'Reverse-charge mechanism',
      'Per-market VAT registrations',
      'Bilateral DTA implications',
    ],
    matters: [
      'You sell B2C into another EU market for the first time',
      'You exceed €10,000 in cross-border B2C sales',
      'You change your fulfilment model (e.g., add a UK warehouse)',
    ],
  },
  {
    icon: Globe,
    title: 'EPR & Packaging',
    markets: 'DE · UK · NL · FR · AT · BE',
    desc: 'Extended Producer Responsibility, packaging registers, take-back schemes, ecomodulation.',
    intro:
      'Extended Producer Responsibility across packaging, batteries, and electronics. Each market runs its own register, fee schedule, and reporting cadence. We map who you register with and when.',
    cover: [
      'LUCID / national packaging registers',
      'Take-back & recycling obligations',
      'Ecomodulation fee tiers',
      'WEEE & battery registration',
      'Annual reporting volumes',
      'Authorised-representative requirements',
    ],
    matters: [
      'You ship physical goods into a new EU market',
      'You sell packaged products to EU consumers',
      'You add a product category (e.g., electronics)',
    ],
  },
  {
    icon: Lock,
    title: 'GDPR & Privacy',
    markets: 'EU-WIDE · POST-BREXIT UK',
    desc: 'Data Protection Impact Assessments, RoPA, processor agreements, subject-access rights.',
    intro:
      'Data protection across the EU and post-Brexit UK. From records of processing to international transfers, we surface the obligations that follow your data — not just your headquarters.',
    cover: [
      'DPIAs for high-risk processing',
      'Records of Processing (RoPA)',
      'Processor / sub-processor agreements',
      'International transfer mechanisms',
      'Subject-access & deletion handling',
      'Breach notification timelines',
    ],
    matters: [
      'You process personal data of EU/UK residents',
      'You add a new tracking or analytics tool',
      'You transfer data outside the EU/UK',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Marketing Compliance',
    markets: 'EU-WIDE · EPRIVACY',
    desc: 'Cookie banners, consent records, e-mail marketing, dark-pattern audits.',
    intro:
      'Consent and fair-marketing rules under ePrivacy and consumer law. Cookie walls, opt-ins, and dark-pattern scrutiny vary by market — we track what each regulator actually enforces.',
    cover: [
      'Cookie-consent banner validity',
      'Consent records & proof',
      'E-mail / SMS opt-in rules',
      'Dark-pattern audits',
      'Influencer & ad disclosure',
      'Unsubscribe & suppression handling',
    ],
    matters: [
      'You run paid acquisition into the EU',
      'You launch an e-mail or SMS programme',
      'You redesign your consent flow',
    ],
  },
  {
    icon: Building2,
    title: 'Corporate & Filings',
    markets: 'DE · AT · CH',
    desc: 'Annual statements, transparency register, beneficial-owner filings, intra-group contracts.',
    intro:
      'Entity-level obligations in the DACH region. Annual statements, beneficial-owner transparency, and intra-group contracts each carry their own deadlines and penalties.',
    cover: [
      'Annual financial statements',
      'Transparency / UBO register filings',
      'Beneficial-owner updates',
      'Intra-group contract documentation',
      'Local representation requirements',
      'Filing-deadline tracking',
    ],
    matters: [
      'You operate a local entity or branch',
      'Your ownership structure changes',
      'You cross a local audit threshold',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Full Compliance Coverage',
    markets: 'ALL DOMAINS · ALL MARKETS',
    desc: 'When a case crosses domains, we route to partners who close all of it — not just their slice.',
    intro:
      "Some cases don't fit one box. When an obligation spans VAT, EPR, privacy, and filings at once, we coordinate a partner team that closes all of it — with one point of accountability.",
    cover: [
      'Cross-domain case routing',
      'Single point of accountability',
      'Coordinated partner teams',
      'Sequenced obligation handling',
      'Shared deadline tracking',
      'One contractual relationship',
    ],
    matters: [
      'A single change triggers obligations in several domains',
      'You enter a new market end-to-end',
      'You need one team, not five vendors',
    ],
  },
];

function CheckList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-[15px] text-fg">
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DomainDrawer({ domain, onClose }: { domain: Domain; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-label={`${domain.title} detail`}
        className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col bg-surface shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.42 }}
      >
        <div className="flex-1 overflow-y-auto px-8 pt-8">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">Domain</p>
            <button onClick={onClose} aria-label="Close" className="text-fg-tertiary transition-colors hover:text-fg">
              <X size={22} />
            </button>
          </div>
          <h3 className="mt-3 font-serif text-[2.25rem] font-bold leading-none text-fg">{domain.title}</h3>
          <p className="mt-3 text-[14px] font-semibold text-fg-brand">
            Active in: <span className="text-fg-secondary">{domain.markets}</span>
          </p>
          <p className="mt-6 text-body leading-relaxed text-fg-secondary">{domain.intro}</p>

          <hr className="my-8 border-stroke-subtle" />
          <CheckList title="What we cover" items={domain.cover} />
          <hr className="my-8 border-stroke-subtle" />
          <CheckList title="When this matters" items={domain.matters} />
          <div className="h-8" />
        </div>

        <div className="border-t border-stroke-subtle bg-surface-secondary px-8 py-5">
          <p className="text-[13px] text-fg-tertiary">Continues in the 6-minute assessment.</p>
          <Button fullWidth className="mt-3 bg-accent-500 text-primary-900 hover:bg-accent-600">
            See if this applies to you <ArrowRight size={16} className="ml-1.5" />
          </Button>
        </div>
      </motion.aside>
    </div>
  );
}

export function DomainsKnows() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="what-we-know" className="bg-surface py-20 lg:py-28">
      <Container size="xl">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">What we know</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            Six domains. <GoldWord>One</GoldWord> coherent map.
          </h2>
          <p className="max-w-xl text-body leading-relaxed text-fg-secondary">
            The map nobody draws — drawn. Six domains, end-to-end, with the markets they apply in and the obligations
            that come with them.
          </p>
          <div className="mt-3 flex items-center gap-3">
            {DOMAINS.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand" />
            ))}
          </div>
        </div>

        {/* Domain grid — stagger-reveal on scroll */}
        <motion.div
          className="mx-auto mt-14 grid max-w-[1080px] gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {DOMAINS.map((d, i) => (
            <motion.button
              key={d.title}
              type="button"
              onClick={() => setOpen(i)}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="group rounded-2xl border border-transparent p-6 text-left transition-colors duration-200 hover:border-accent-400 hover:bg-surface"
            >
              <d.icon size={26} strokeWidth={1.75} className="text-fg-brand" />
              <p className="mt-4 text-[18px] font-bold text-fg">{d.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">{d.desc}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{d.markets}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-brand">
                Click to see more <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </motion.div>
      </Container>

      <AnimatePresence>
        {open !== null && <DomainDrawer domain={DOMAINS[open]} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}
