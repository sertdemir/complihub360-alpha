import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Brain,
  Eye,
  EyeOff,
  FileSearch,
  Lock,
  Zap,
  Users,
  Clock,
  Award,
  Globe,
  FileText,
  Mail,
  Link2,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Typography } from '../components/ui/Typography';


// ─── Animated Section wrapper ─────────────────────────────────────────────────

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

// ─── Reusable: Animated Pipeline Step ─────────────────────────────────────────

function PipelineStep({ step, title, desc, icon: Icon, color, delay }: {
  step: number; title: string; desc: string; icon: React.ElementType; color: string; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex items-start gap-5"
    >
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${color}`}>
          <Icon size={22} />
        </div>
        {step < 5 && <div className="w-0.5 h-10 bg-neutral-200 mt-2" />}
      </div>
      <div className="pt-1.5">
        <Typography variant="ui-small" weight="bold" className="text-neutral-900 mb-1 block">
          {title}
        </Typography>
        <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal leading-relaxed">
          {desc}
        </Typography>
      </div>
    </motion.div>
  );
}

// ─── Reusable: Stat Card ──────────────────────────────────────────────────────

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4, delay }}
      className="bg-white border border-neutral-200 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
    >
      <Typography variant="display" weight="bold" className="text-primary-600 block mb-1">
        {value}
      </Typography>
      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
        {label}
      </Typography>
    </motion.div>
  );
}

// ─── Animated Data Flow Diagram ───────────────────────────────────────────────

function DataFlowDiagram() {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const nodes = [
    { label: t('platform.engine.node1Label', 'Business Context'), sub: t('platform.engine.node1Sub', 'Wizard Input'), icon: FileSearch, x: 0 },
    { label: t('platform.engine.node2Label', 'PII Redaction'), sub: t('platform.engine.node2Sub', 'Privacy Gate'), icon: EyeOff, x: 1 },
    { label: t('platform.engine.node3Label', 'AI Analysis'), sub: t('platform.engine.node3Sub', 'Grounded RAG'), icon: Brain, x: 2 },
    { label: t('platform.engine.node4Label', 'Risk Dossier'), sub: t('platform.engine.node4Sub', 'Structured Output'), icon: FileText, x: 3 },
  ];

  return (
    <div ref={ref} className="bg-primary-900 rounded-2xl p-8 overflow-hidden relative">
      <div className="flex flex-col tablet:flex-row items-stretch gap-4 tablet:gap-0 relative">
        {nodes.map((node, i) => (
          <motion.div
            key={node.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="flex-1 flex flex-col items-center relative"
          >
            {/* Connector line */}
            {i < nodes.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.4, delay: i * 0.15 + 0.3 }}
                className="hidden tablet:block absolute right-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-primary-600 to-primary-500 origin-left z-0"
                style={{ left: '50%', width: '100%' }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg border ${
                i === 1 ? 'bg-error-500/20 border-error-500/40' :
                i === 2 ? 'bg-accent-500/20 border-accent-500/40' :
                'bg-primary-500/20 border-primary-500/40'
              }`}>
                <node.icon size={26} className={
                  i === 1 ? 'text-error-400' :
                  i === 2 ? 'text-accent-400' :
                  'text-primary-300'
                } />
              </div>
              <Typography variant="ui-small" weight="bold" className="text-white text-center block mb-0.5">
                {node.label}
              </Typography>
              <Typography variant="caption" className="text-primary-400 text-center block normal-case tracking-normal">
                {node.sub}
              </Typography>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live pulse effect */}
      <motion.div
        animate={{ x: ['0%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="hidden tablet:block absolute top-1/2 left-0 w-8 h-0.5 bg-gradient-to-r from-transparent via-accent-400 to-transparent opacity-60 rounded-full"
      />
    </div>
  );
}

// ─── Animated Funnel Diagram ──────────────────────────────────────────────────

function FunnelDiagram() {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const steps = [
    { label: t('platform.matching.funnel1Label', 'Assessment'), detail: t('platform.matching.funnel1Detail', 'Structured intent capture'), width: '100%', color: 'bg-primary-100 border-primary-300 text-primary-800' },
    { label: t('platform.matching.funnel2Label', 'Dossier'), detail: t('platform.matching.funnel2Detail', 'Anonymized risk profile'), width: '85%', color: 'bg-primary-200 border-primary-400 text-primary-900' },
    { label: t('platform.matching.funnel3Label', 'Matching'), detail: t('platform.matching.funnel3Detail', 'Jurisdiction-bound ranking'), width: '70%', color: 'bg-primary-300 border-primary-500 text-primary-900' },
    { label: t('platform.matching.funnel4Label', 'Appointment'), detail: t('platform.matching.funnel4Detail', 'SLA-enforced response'), width: '55%', color: 'bg-primary-500 border-primary-600 text-white' },
    { label: t('platform.matching.funnel5Label', 'Execution'), detail: t('platform.matching.funnel5Detail', 'Local expert delivery'), width: '40%', color: 'bg-primary-700 border-primary-800 text-white' },
  ];

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      {steps.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          style={{ width: s.width }}
          className={`rounded-xl border px-6 py-4 flex items-center justify-between ${s.color}`}
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </span>
            <span className="font-bold text-sm">{s.label}</span>
          </div>
          <span className="text-xs opacity-80 hidden sm:inline">{s.detail}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Country Coverage Map (Code-based) ────────────────────────────────────────

function CoverageGrid() {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const markets = [
    { flag: '🇬🇧', country: 'United Kingdom', status: t('platform.coverage.marketStatusLive', 'Live'), domains: ['VAT & MTD', 'EPR Packaging', 'UK GDPR', 'Corporate'], color: 'border-primary-300 bg-primary-50' },
    { flag: '🇩🇪', country: 'Germany', status: t('platform.coverage.marketStatusLive', 'Live'), domains: ['USt-VA', 'VerpackG', 'DSGVO', 'GmbH Setup'], color: 'border-primary-300 bg-primary-50' },
    { flag: '🇪🇺', country: 'European Union', status: t('platform.coverage.marketStatusLive', 'Live'), domains: ['EU VAT OSS', 'WEEE', 'GDPR', 'CSRD/ESG'], color: 'border-primary-300 bg-primary-50' },
    { flag: '🇺🇸', country: 'United States', status: 'Q3 2026', domains: ['Sales Tax', 'EPA Compliance', 'CCPA', 'LLC/Corp'], color: 'border-neutral-200 bg-neutral-50 opacity-70' },
  ];

  return (
    <div ref={ref} className="grid tablet:grid-cols-2 gap-5">
      {markets.map((m, i) => (
        <motion.div
          key={m.country}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className={`rounded-2xl border p-6 ${m.color}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{m.flag}</span>
              <Typography variant="h3" weight="bold" className="text-neutral-900">
                {m.country}
              </Typography>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
              m.status === t('platform.coverage.marketStatusLive', 'Live') ? 'bg-success-bg text-success-500' : 'bg-neutral-100 text-neutral-500'
            }`}>
              {m.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.domains.map(d => (
              <span key={d} className="text-xs font-medium bg-white border border-neutral-200 px-2.5 py-1 rounded-md text-neutral-600">
                {d}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Magic Link Workflow (Code-based Diagram) ─────────────────────────────────

function MagicLinkFlow() {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const steps = [
    { icon: FileText, label: t('platform.partners.flow1Label', 'Structured Dossier'), desc: t('platform.partners.flow1Desc', 'Pre-qualified lead arrives') },
    { icon: Mail, label: t('platform.partners.flow2Label', 'Magic Link Email'), desc: t('platform.partners.flow2Desc', 'Secure, time-bound access') },
    { icon: Link2, label: t('platform.partners.flow3Label', 'One-Click Review'), desc: t('platform.partners.flow3Desc', 'No portal. No password.') },
    { icon: CheckCircle, label: t('platform.partners.flow4Label', 'Confirm & Reply'), desc: t('platform.partners.flow4Desc', 'SLA timer stops') },
  ];

  return (
    <div ref={ref} className="bg-neutral-900 rounded-2xl p-8 relative overflow-hidden">
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.12 }}
            className="flex flex-col items-center text-center relative"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center mb-3">
              <s.icon size={24} className="text-accent-400" />
            </div>
            <Typography variant="ui-small" weight="bold" className="text-white block mb-1">
              {s.label}
            </Typography>
            <Typography variant="caption" className="text-neutral-400 block normal-case tracking-normal">
              {s.desc}
            </Typography>
            {i < steps.length - 1 && (
              <ArrowRight size={16} className="hidden tablet:block absolute -right-3 top-6 text-neutral-600" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}



// ─── Anchor Navigation Bar ────────────────────────────────────────────────────

function AnchorBar() {
  const { t } = useTranslation('common');
  const [active, setActive] = useState('engine');

  const anchors = [
    { id: 'engine', label: t('platform.anchorEngine', 'AI Engine') },
    { id: 'matching', label: t('platform.anchorMatching', 'Partner Matching') },
    { id: 'coverage', label: t('platform.anchorCoverage', 'Global Coverage') },
    { id: 'partners', label: t('platform.anchorPartners', 'For Partners') },
  ];

  useEffect(() => {
    const handleScroll = () => {
      for (const a of [...anchors].reverse()) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top < 120) {
          setActive(a.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {anchors.map(a => (
            <button
              key={a.id}
              onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-4 py-2 rounded-md text-ui-small font-semibold whitespace-nowrap transition-colors ${
                active === a.id
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─── SECTION 1: AI ENGINE ─────────────────────────────────────────────────────

function EngineSection() {
  const { t } = useTranslation('common');

  return (
    <Section id="engine" className="py-16 desktop-s:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <div className="max-w-3xl mb-14">
          <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
            {t('platform.engine.overline', 'The AI Engine')}
          </Typography>
          <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
            {t('platform.engine.title', 'From Regulatory Uncertainty to Structured Action')}
          </Typography>
          <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed max-w-2xl">
            {t('platform.engine.body', 'Compliance data is fragmented and unstructured. Our AI acts as a cognitive Advisory Layer — extracting your business intent and mapping it to concrete legal realities. No hallucinations. Every output grounded in verified sources.')}
          </Typography>
        </div>

        {/* Data Flow Diagram */}
        <DataFlowDiagram />

        {/* Feature Cards */}
        <div className="grid tablet:grid-cols-3 gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-neutral-200 rounded-2xl p-7"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-5">
              <Brain size={22} className="text-primary-600" />
            </div>
            <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
              {t('platform.engine.card1Title', 'Adaptive Intent Mapping')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 leading-relaxed">
              {t('platform.engine.card1Body', 'You don\'t need to know which laws to search for. Our Wizard captures your context in 4–5 steps and generates a structured Search Profile automatically.')}
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white border border-neutral-200 rounded-2xl p-7"
          >
            <div className="w-11 h-11 rounded-xl bg-error-50 border border-error-100 flex items-center justify-center mb-5">
              <EyeOff size={22} className="text-error-500" />
            </div>
            <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
              {t('platform.engine.card2Title', 'Privacy Redaction Pipeline')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 leading-relaxed">
              {t('platform.engine.card2Body', 'Before any document touches our AI, it passes through a local Redaction Pipeline — automatically masking PII like names, emails, and phone numbers.')}
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white border border-neutral-200 rounded-2xl p-7"
          >
            <div className="w-11 h-11 rounded-xl bg-success-50 border border-success-100 flex items-center justify-center mb-5">
              <ShieldCheck size={22} className="text-success-500" />
            </div>
            <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
              {t('platform.engine.card3Title', 'Triple AI Gate')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 leading-relaxed">
              {t('platform.engine.card3Body', 'The AI only activates if three strict conditions are met: document is sanitized, user has given explicit consent, and it\'s not classified as restricted.')}
            </Typography>
          </motion.div>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-neutral-100">
          <StatCard value="0" label={t('platform.engine.stat1Label', 'PII stored in AI layer')} delay={0} />
          <StatCard value="100%" label={t('platform.engine.stat2Label', 'Source-grounded outputs')} delay={0.1} />
          <StatCard value="<2 min" label={t('platform.engine.stat3Label', 'Full risk profile')} delay={0.2} />
        </div>
      </div>
    </Section>
  );
}

// ─── SECTION 2: PARTNER MATCHING ──────────────────────────────────────────────

function MatchingSection() {
  const { t } = useTranslation('common');

  return (
    <Section id="matching" className="py-16 desktop-s:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid desktop-s:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              {t('platform.matching.overline', 'Partner Matching')}
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              {t('platform.matching.title', 'Verified Specialists. Orchestrated Accountability.')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed mb-8">
              {t('platform.matching.body', "We're not a directory. We're an orchestrator. We don't just give you a list of names — we control the engagement to ensure accountability, from first contact to successful resolution.")}
            </Typography>

            <div className="space-y-1">
              <PipelineStep
                step={1} title={t('platform.matching.step1Title', 'Jurisdiction-Bound Matching')}
                desc={t('platform.matching.step1Desc', 'Connects you only with specialists verified for your target country and compliance category.')}
                icon={Globe} color="bg-primary-500" delay={0}
              />
              <PipelineStep
                step={2} title={t('platform.matching.step2Title', 'Structured Engagement Request')}
                desc={t('platform.matching.step2Desc', 'Your anonymized compliance dossier is sent directly to the partner — no cold emails, no blank inquiries.')}
                icon={FileText} color="bg-primary-600" delay={0.1}
              />
              <PipelineStep
                step={3} title={t('platform.matching.step3Title', 'SLA-Enforced Response')}
                desc={t('platform.matching.step3Desc', 'Partners must confirm receipt within 24h and reply within 48h. Our automated Watchdog enforces this.')}
                icon={Clock} color="bg-primary-700" delay={0.2}
              />
              <PipelineStep
                step={4} title={t('platform.matching.step4Title', 'Automated Downgrade System')}
                desc={t('platform.matching.step4Desc', 'Repeated SLA breaches trigger an automatic downgrade. You only engage with responsive, top-tier professionals.')}
                icon={AlertTriangle} color="bg-error-500" delay={0.3}
              />
              <PipelineStep
                step={5} title={t('platform.matching.step5Title', 'Priority Rewards')}
                desc={t('platform.matching.step5Desc', 'High-performing partners earn priority placement and premium badges through our Ranking Engine.')}
                icon={Award} color="bg-accent-600" delay={0.4}
              />
            </div>
          </div>

          {/* Right: Funnel Diagram */}
          <div>
            <Typography variant="ui-small" weight="bold" className="text-neutral-400 uppercase tracking-widest mb-6 block text-center">
              {t('platform.matching.funnelTitle', 'The Risk-to-Execution Funnel')}
            </Typography>
            <FunnelDiagram />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── SECTION 3: GLOBAL COVERAGE ───────────────────────────────────────────────

function CoverageSection() {
  const { t } = useTranslation('common');

  return (
    <Section id="coverage" className="py-16 desktop-s:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
            {t('platform.coverage.overline', 'Global Coverage')}
          </Typography>
          <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
            {t('platform.coverage.title', 'Localized Security for Global Expansion')}
          </Typography>
          <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
            {t('platform.coverage.body', 'Your business crosses borders — your compliance should too. Every question, risk, and matched expert is tailored to the laws of your target market.')}
          </Typography>
        </div>

        <CoverageGrid />

        {/* Country Policy Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 bg-primary-900 rounded-2xl p-8 text-center"
        >
          <Typography variant="h3" weight="bold" className="text-white mb-3">
            {t('platform.coverage.matrixTitle', 'Dynamic Country Policy Matrix')}
          </Typography>
          <Typography variant="body" className="text-primary-300 mb-6 max-w-xl mx-auto">
            {t('platform.coverage.matrixBody', 'Data privacy laws differ across borders. Our platform adapts data residency, retention, and AI eligibility rules per jurisdiction — defaulting to strict GDPR standards for European markets.')}
          </Typography>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { label: t('platform.coverage.matrix1Label', 'Data Residency'), val: t('platform.coverage.matrix1Val', 'Geo-fenced') },
              { label: t('platform.coverage.matrix2Label', 'Retention Policy'), val: t('platform.coverage.matrix2Val', 'Country-specific') },
              { label: t('platform.coverage.matrix3Label', 'AI Eligibility'), val: t('platform.coverage.matrix3Val', 'Dynamic gates') },
            ].map(r => (
              <div key={r.label} className="bg-primary-800 border border-primary-700 rounded-xl p-4">
                <Typography variant="ui-small" weight="bold" className="text-accent-400 block mb-1">
                  {r.val}
                </Typography>
                <Typography variant="caption" className="text-primary-400 block normal-case tracking-normal">
                  {r.label}
                </Typography>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

// ─── SECTION 4: FOR PARTNER FIRMS ─────────────────────────────────────────────

function PartnersSection() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <Section id="partners" className="py-16 desktop-s:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid desktop-s:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <Typography variant="caption" className="text-accent-600 mb-3 block font-semibold">
              {t('platform.partners.overline', 'For Partner Firms')}
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              {t('platform.partners.title', 'Pre-Qualified Clients. Zero Friction.')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed mb-8">
              {t('platform.partners.body', 'Stop wasting billable hours on unqualified leads and unstructured cold emails. CompliHub360 sends you highly qualified, structured business clients ready to act.')}
            </Typography>

            {/* Key benefits */}
            <div className="space-y-5 mb-10">
              {[
                { icon: FileText, title: t('platform.partners.benefit1Title', 'Structured Dossiers'), desc: t('platform.partners.benefit1Desc', 'Receive business context, target markets, and specific regulatory risks — evaluate mandates instantly.') },
                { icon: Link2, title: t('platform.partners.benefit2Title', 'Magic Link Workflow'), desc: t('platform.partners.benefit2Desc', 'Secure, time-bound one-click access. No portal to maintain, no password to remember.') },
                { icon: TrendingUp, title: t('platform.partners.benefit3Title', 'Performance-Based Growth'), desc: t('platform.partners.benefit3Desc', 'Transparent flat engagement fee. Great SLA performance earns priority placement and premium badges.') },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 border border-accent-200 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <Typography variant="ui-small" weight="bold" className="text-neutral-900 mb-1 block">
                      {title}
                    </Typography>
                    <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal leading-relaxed">
                      {desc}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="primary" onClick={() => navigate('/register?intent=partner')} className="shadow-md">
              {t('platform.partners.cta', 'Apply as Partner Firm')}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>

          {/* Right: Magic Link Flow */}
          <div>
            <Typography variant="ui-small" weight="bold" className="text-neutral-400 uppercase tracking-widest mb-6 block text-center">
              {t('platform.partners.flowTitle', 'The Magic Link Workflow')}
            </Typography>
            <MagicLinkFlow />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <StatCard value="24h" label={t('platform.partners.stat1Label', 'Max confirmation time')} delay={0} />
              <StatCard value="48h" label={t('platform.partners.stat2Label', 'Max reply window')} delay={0.1} />
              <StatCard value="€0" label={t('platform.partners.stat3Label', 'Platform subscription')} delay={0.2} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function PlatformCTA() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <section className="py-16 desktop-s:py-24 bg-primary-900">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Typography variant="display" weight="bold" className="text-white mb-5">
          {t('platform.cta.title', 'Ready to simplify compliance?')}
        </Typography>
        <Typography variant="body" className="text-primary-300 mb-10 text-lg">
          {t('platform.cta.body', 'Start your free assessment and get a structured risk profile in under 2 minutes.')}
        </Typography>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
          >
            {t('platform.cta.btnAssessment', 'Start Free Assessment')}
          </button>
          <button
            onClick={() => navigate('/register?intent=expert')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-primary-400 text-white font-bold text-base hover:bg-primary-800 transition-colors"
          >
            {t('platform.cta.btnExpert', 'Skip to Expert Match')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PlatformFooter() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-neutral-900 py-10 text-center">
      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
        {t('platform.footer.copyright', '© {{year}} CompliHub360. Built in Berlin.', { year: new Date().getFullYear() })}
      </Typography>
    </footer>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function PlatformPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <AnchorBar />
      <EngineSection />
      <MatchingSection />
      <CoverageSection />
      <PartnersSection />
      <PlatformCTA />
      <PlatformFooter />
    </div>
  );
}
