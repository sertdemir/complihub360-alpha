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
  return (
    <Section id="hero" className="py-20 desktop-s:py-32 bg-background border-b border-neutral-100">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 mb-6">
          <ShieldCheck size={16} className="text-primary-600" />
          <span className="text-sm font-bold text-primary-700">CompliHub360 Trust Center</span>
        </div>
        <Typography variant="display" weight="bold" className="text-neutral-900 mb-6 leading-tight">
          AI Governance Framework
        </Typography>
        <Typography variant="body" className="text-neutral-600 text-xl leading-relaxed max-w-2xl mx-auto">
          We believe in responsible innovation. Our platform integrates AI strictly within the bounds of global regulations, ethics, and transparency. Discover how we implement the 5 dimensions of AI Governance.
        </Typography>
      </div>
    </Section>
  );
}

// ─── Dimensions Section ───────────────────────────────────────────────────────

function DimensionsSection() {
  const dimensions = [
    {
      id: 'ethics',
      icon: Scale,
      title: 'Ethical Guidelines',
      desc: 'Our AI features respect human autonomy and are designed to augment professionals, not replace them. We prevent systemic bias through continuous monitoring.',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-600'
    },
    {
      id: 'transparency',
      icon: Eye,
      title: 'Transparency & Explainability',
      desc: 'Users deserve to know when they are interacting with AI. Every AI-generated output on CompliHub360 is clearly marked, and its data sources are traceable.',
      color: 'bg-blue-50 border-blue-200 text-blue-600'
    },
    {
      id: 'organizational',
      icon: Users,
      title: 'Organizational Accountability',
      desc: 'Clear governance pipelines dictate who can deploy, access, and audit AI features. We maintain comprehensive audit logs for all AI interactions.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-600'
    },
    {
      id: 'technical',
      icon: Server,
      title: 'Technical Robustness',
      desc: 'Our infrastructure ensures zero downtime and resilient fallbacks. Dedicated Privacy Gates sanitize all inputs before they reach any LLM.',
      color: 'bg-amber-50 border-amber-200 text-amber-600'
    },
    {
      id: 'regulatory',
      icon: Globe,
      title: 'Regulatory Compliance',
      desc: 'Built for the EU AI Act and ISO 42001. We map global standards directly into our Code, prioritizing strict EU and UK privacy rules.',
      color: 'bg-rose-50 border-rose-200 text-rose-600'
    },
    {
      id: 'risk',
      icon: ShieldCheck, // Reusing ShieldCheck or a suitable risk icon
      title: 'Risk Management',
      desc: 'Continuous risk assessment of AI models. We classify features by risk tiers (e.g., EU AI Act High-Risk vs. Minimal-Risk) and apply proportional security controls.',
      color: 'bg-slate-50 border-slate-200 text-slate-600'
    }
  ];

  return (
    <Section id="dimensions" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Typography variant="h2" weight="bold" className="text-neutral-900 mb-4">
            The 5 Dimensions of AI Governance
          </Typography>
          <Typography variant="body" className="text-neutral-500 text-lg">
            A comprehensive approach to building trustworthy AI systems for enterprise compliance.
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
              className="rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow bg-neutral-50"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 border ${dim.color}`}>
                <dim.icon size={28} />
              </div>
              <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
                {dim.title}
              </Typography>
              <Typography variant="body" className="text-neutral-600 leading-relaxed">
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
  return (
    <Section id="features" className="py-20 bg-primary-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Typography variant="h2" weight="bold" className="text-white mb-4">
            Active AI Features on CompliHub360
          </Typography>
          <Typography variant="body" className="text-primary-200 text-lg">
            How we leverage AI today, wrapped in our strict governance framework.
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
                Privacy Redaction Pipeline
              </Typography>
              <Typography variant="body" className="text-primary-200">
                Before any business context is analyzed, our local NLP models strip out all Personally Identifiable Information (PII). Emails, names, and phone numbers never leave our secure European servers.
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
                Intent Analysis Engine
              </Typography>
              <Typography variant="body" className="text-primary-200">
                Transforms unstructured client input into a structured risk profile. The AI is restricted to analyzing compliance context and cannot make binding legal decisions on its own.
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
                Triple AI Gate Validator
              </Typography>
              <Typography variant="body" className="text-primary-200">
                Every AI action must pass three checks: Data Sanitization, Explicit Consent, and Domain Restriction. If any check fails, the workflow gracefully falls back to a deterministic, non-AI process.
              </Typography>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PageFooter() {
  const { t } = useTranslation('common');
  return (
    <footer className="bg-neutral-900 py-10 text-center border-t border-neutral-800">
      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
        {t('platform.footer.copyright', '© {{year}} CompliHub360. Trust Center.', { year: new Date().getFullYear() })}
      </Typography>
    </footer>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function AiGovernancePage() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-background pt-16">
      <GovernanceHero />
      <DimensionsSection />
      <FeaturesOverview />
      <PageFooter />
    </div>
  );
}
