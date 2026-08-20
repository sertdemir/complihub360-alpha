import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import {
  ShieldCheck,
  Eye,
  Server,
  Scale,
  Brain,
  EyeOff,
  Lock,
  Globe,
  Users
} from 'lucide-react';
import { Typography } from '../components/ui/Typography';
import { SiteFooter } from '../components/home';

function Section({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`scroll-mt-20 ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function GovernanceHero() {
  const { t } = useTranslation('common');
  return (
    <Section id="hero" className="py-20 desktop-s:py-32 bg-background border-b border-stroke-subtle">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light border border-stroke-subtle mb-6">
          <ShieldCheck size={16} className="text-fg-brand" />
          <span className="text-sm font-bold text-fg-brand">{t('aiGov.trustCenter', 'CompliHub360 Trust Center')}</span>
        </div>
        <Typography variant="display" weight="bold" className="text-fg mb-6 leading-tight">
          {t('aiGov.heroTitle', 'AI Governance Framework')}
        </Typography>
        <Typography variant="body" className="text-fg-secondary text-xl leading-relaxed max-w-2xl mx-auto">
          {t('aiGov.heroDesc', 'We believe in responsible innovation. Our platform integrates AI strictly within the bounds of global regulations, ethics, and transparency. Discover how we implement the 6 dimensions of AI Governance.')}
        </Typography>
      </div>
    </Section>
  );
}

// ─── How our AI behaves ───────────────────────────────────────────────────────
// Added 2026-08-20 per the Developer DNA & Website Audit Addendum V2 (P0 #4).
// The addendum's verdict on this page: "Excellent foundation, but it is
// governance-focused rather than experience-focused." The six dimensions below
// describe the framework; this section describes what the framework means to
// someone actually using the product. It therefore sits BEFORE the dimensions.

function BehaviourSection() {
  const { t } = useTranslation('common');
  const raw = t('aiGov.behaviour.items', { returnObjects: true });
  const items: string[] = Array.isArray(raw) ? (raw as string[]) : [];

  return (
    <Section id="behaviour" className="py-20 bg-surface-secondary">
      <div className="max-w-3xl mx-auto px-6">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
          {t('aiGov.behaviour.kicker', 'How our AI behaves')}
        </span>
        <Typography variant="h2" weight="bold" className="text-fg mt-3 mb-4">
          {t('aiGov.behaviour.title', 'Professional first. Human always.')}
        </Typography>
        <Typography variant="body" className="text-fg-secondary leading-relaxed">
          {t('aiGov.behaviour.lead')}
        </Typography>

        <ul className="mt-8 flex flex-col gap-3">
          {items.map((line) => (
            <li key={line} className="flex items-baseline gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span className="text-body leading-relaxed text-fg">{line}</span>
            </li>
          ))}
        </ul>

        {/* The addendum names this line explicitly as required copy. */}
        <p className="mt-10 border-t border-stroke-subtle pt-6 font-serif text-[1.25rem] leading-snug text-fg-secondary">
          {t('aiGov.behaviour.principle')}
        </p>
      </div>
    </Section>
  );
}

// ─── Dimensions Section ───────────────────────────────────────────────────────

function DimensionsSection() {
  const { t } = useTranslation('common');
  const dimensions = [
    {
      id: 'ethics',
      icon: Scale,
      title: t('aiGov.dimEthicsTitle', 'Ethical Guidelines'),
      desc: t('aiGov.dimEthicsDesc', 'Our AI features respect human autonomy and are designed to augment professionals, not replace them. We prevent systemic bias through continuous monitoring.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    },
    {
      id: 'transparency',
      icon: Eye,
      title: t('aiGov.dimTranspTitle', 'Transparency & Explainability'),
      desc: t('aiGov.dimTranspDesc', 'Users deserve to know when they are interacting with AI. Every AI-generated output on CompliHub360 is clearly marked, and its data sources are traceable.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    },
    {
      id: 'organizational',
      icon: Users,
      title: t('aiGov.dimOrgTitle', 'Organizational Accountability'),
      desc: t('aiGov.dimOrgDesc', 'Clear governance pipelines dictate who can deploy, access, and audit AI features. We maintain comprehensive audit logs for all AI interactions.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    },
    {
      id: 'technical',
      icon: Server,
      title: t('aiGov.dimTechTitle', 'Technical Robustness'),
      desc: t('aiGov.dimTechDesc', 'Our infrastructure ensures zero downtime and resilient fallbacks. Dedicated Privacy Gates sanitize all inputs before they reach any LLM.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    },
    {
      id: 'regulatory',
      icon: Globe,
      title: t('aiGov.dimRegTitle', 'Regulatory Compliance'),
      desc: t('aiGov.dimRegDesc', 'Built for the EU AI Act and ISO 42001. We map global standards directly into our Code, prioritizing strict EU and UK privacy rules.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    },
    {
      id: 'risk',
      icon: ShieldCheck, // Reusing ShieldCheck or a suitable risk icon
      title: t('aiGov.dimRiskTitle', 'Risk Management'),
      desc: t('aiGov.dimRiskDesc', 'Continuous risk assessment of AI models. We classify features by risk tiers (e.g., EU AI Act High-Risk vs. Minimal-Risk) and apply proportional security controls.'),
      color: 'bg-brand-light border-stroke-subtle text-fg-brand'
    }
  ];

  return (
    <Section id="dimensions" className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Typography variant="h2" weight="bold" className="text-fg mb-4">
            {t('aiGov.dimTitle', 'The 6 Dimensions of AI Governance')}
          </Typography>
          <Typography variant="body" className="text-fg-tertiary text-lg">
            {t('aiGov.dimDesc', 'A comprehensive approach to building trustworthy AI systems for enterprise compliance.')}
          </Typography>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dimensions.map((dim, i) => (
            <motion.div
              key={dim.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-stroke p-8 hover:shadow-lg transition-shadow bg-surface-secondary"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 border ${dim.color}`}>
                <dim.icon size={28} />
              </div>
              <Typography variant="h3" weight="bold" className="text-fg mb-3">
                {dim.title}
              </Typography>
              <Typography variant="body" className="text-fg-secondary leading-relaxed">
                {dim.desc}
              </Typography>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── AI Features Section ──────────────────────────────────────────────────────

function FeaturesOverview() {
  const { t } = useTranslation('common');
  return (
    <Section id="features" className="py-20 bg-primary-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Typography variant="h2" weight="bold" className="text-white mb-4">
            {t('aiGov.featTitle', 'Active AI Features on CompliHub360')}
          </Typography>
          <Typography variant="body" className="text-primary-200 text-lg">
            {t('aiGov.featDesc', 'How we leverage AI today, wrapped in our strict governance framework.')}
          </Typography>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row gap-6 items-start bg-primary-800 border border-primary-700 p-8 rounded-2xl"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-700 flex items-center justify-center">
              <EyeOff size={24} className="text-primary-300" />
            </div>
            <div>
              <Typography variant="h3" weight="bold" className="text-white mb-2">
                {t('aiGov.featPrivacyTitle', 'Privacy Redaction Pipeline')}
              </Typography>
              <Typography variant="body" className="text-primary-200">
                {t('aiGov.featPrivacyDesc', 'Before any business context is analyzed, our local NLP models strip out all Personally Identifiable Information (PII). Emails, names, and phone numbers never leave our secure European servers.')}
              </Typography>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-6 items-start bg-primary-800 border border-primary-700 p-8 rounded-2xl"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-700 flex items-center justify-center">
              <Brain size={24} className="text-primary-300" />
            </div>
            <div>
              <Typography variant="h3" weight="bold" className="text-white mb-2">
                {t('aiGov.featIntentTitle', 'Intent Analysis Engine')}
              </Typography>
              <Typography variant="body" className="text-primary-200">
                {t('aiGov.featIntentDesc', 'Transforms unstructured client input into a structured risk profile. The AI is restricted to analyzing compliance context and cannot make binding legal decisions on its own.')}
              </Typography>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row gap-6 items-start bg-primary-800 border border-primary-700 p-8 rounded-2xl"
          >
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-700 flex items-center justify-center">
              <Lock size={24} className="text-primary-300" />
            </div>
            <div>
              <Typography variant="h3" weight="bold" className="text-white mb-2">
                {t('aiGov.featGateTitle', 'Triple AI Gate Validator')}
              </Typography>
              <Typography variant="body" className="text-primary-200">
                {t('aiGov.featGateDesc', 'Every AI action must pass three checks: Data Sanitization, Explicit Consent, and Domain Restriction. If any check fails, the workflow gracefully falls back to a deterministic, non-AI process.')}
              </Typography>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function AiGovernancePage() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-background pt-16">
      <GovernanceHero />
      <BehaviourSection />
      <DimensionsSection />
      <FeaturesOverview />
      <SiteFooter />
    </div>
  );
}
