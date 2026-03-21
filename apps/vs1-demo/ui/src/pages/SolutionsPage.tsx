import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Rocket,
  Globe,
  Brain,
  ShieldCheck,
  Zap,
  Clock,
  BarChart3,
  FileText,
  Eye,
  EyeOff,
  Search,
  CheckCircle,
  Target,
  Users,
  Scale,
  Layers,
  Download,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
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

// ─── Diagram: Founders "Expand Safely" Path ───────────────────────────────────

function ExpandSafelyPath() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const nodes = [
    { icon: Globe, label: 'Country Gate', desc: 'Select target market', color: 'bg-primary-500/20 border-primary-500/40 text-primary-300' },
    { icon: Brain, label: 'Adaptive Wizard', desc: 'Business model & context', color: 'bg-accent-500/20 border-accent-500/40 text-accent-400' },
    { icon: Target, label: 'Risk Engine', desc: 'Calculate risk level', color: 'bg-warning-bg border-warning-text/40 text-warning-text' },
    { icon: Users, label: 'Partner Match', desc: '1-Click engagement', color: 'bg-success-bg border-success-500/40 text-success-500' },
  ];

  return (
    <div ref={ref} className="bg-primary-900 rounded-2xl p-8 overflow-hidden">
      <Typography variant="ui-small" weight="bold" className="text-primary-400 uppercase tracking-widest mb-6 block text-center">
        The "Expand Safely" Path
      </Typography>
      <div className="flex flex-col tablet:flex-row items-stretch gap-4 tablet:gap-0 relative">
        {nodes.map((node, i) => (
          <motion.div
            key={node.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="flex-1 flex flex-col items-center relative"
          >
            {i < nodes.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.4, delay: i * 0.15 + 0.3 }}
                className="hidden tablet:block absolute right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-primary-600 to-primary-500 origin-left z-0"
                style={{ left: '50%', width: '100%' }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg border ${node.color}`}>
                <node.icon size={26} />
              </div>
              <Typography variant="ui-small" weight="bold" className="text-white text-center block mb-0.5">
                {node.label}
              </Typography>
              <Typography variant="caption" className="text-primary-400 text-center block normal-case tracking-normal">
                {node.desc}
              </Typography>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Diagram: Operations Dashboard Preview ────────────────────────────────────

function OpsDashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const panels = [
    {
      icon: Layers,
      title: 'Session Grid',
      desc: 'Saved risk profiles by country',
      items: ['🇬🇧 UK VAT — High Risk', '🇩🇪 DSGVO — Medium', '🇪🇺 EPR — Review'],
    },
    {
      icon: Users,
      title: 'Active Requests',
      desc: 'Provider engagement status',
      items: [
        { text: 'Draft', color: 'bg-neutral-200 text-neutral-600' },
        { text: 'Submitted', color: 'bg-warning-bg text-warning-text' },
        { text: 'Confirmed', color: 'bg-success-bg text-success-500' },
      ] as { text: string; color: string }[],
    },
    {
      icon: Download,
      title: 'Export Engine',
      desc: 'PDF reports for stakeholders',
      items: ['Risk Snapshot', 'Action Plan', 'Source Index'],
    },
  ];

  return (
    <div ref={ref} className="grid tablet:grid-cols-3 gap-5">
      {panels.map((panel, i) => (
        <motion.div
          key={panel.title}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <panel.icon size={18} className="text-primary-400" />
            </div>
            <div>
              <Typography variant="ui-small" weight="bold" className="text-white block">
                {panel.title}
              </Typography>
              <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
                {panel.desc}
              </Typography>
            </div>
          </div>
          <div className="space-y-2">
            {panel.items.map((item, j) => {
              if (typeof item === 'string') {
                return (
                  <div key={j} className="text-xs text-neutral-400 bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                    {item}
                  </div>
                );
              }
              return (
                <span key={j} className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md mr-1.5 ${item.color}`}>
                  {item.text}
                </span>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Diagram: Privacy-First AI Gate ───────────────────────────────────────────

function PrivacyGateDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const stages = [
    { icon: FileText, label: 'Document Upload', desc: 'Restricted Vault', colorIcon: 'text-neutral-400', colorBg: 'bg-neutral-700 border-neutral-600' },
    { icon: EyeOff, label: 'PII Redaction', desc: 'Local masking engine', colorIcon: 'text-error-400', colorBg: 'bg-error-500/15 border-error-500/30' },
    { icon: ShieldCheck, label: 'AI Eligibility Gate', desc: 'Policy & consent check', colorIcon: 'text-warning-text', colorBg: 'bg-warning-bg border-warning-text/30' },
    { icon: CheckCircle, label: 'Grounded Output', desc: 'Source-backed summary', colorIcon: 'text-success-400', colorBg: 'bg-success-bg border-success-500/30' },
  ];

  return (
    <div ref={ref} className="bg-neutral-900 rounded-2xl p-8 overflow-hidden">
      <Typography variant="ui-small" weight="bold" className="text-neutral-400 uppercase tracking-widest mb-6 block text-center">
        The Privacy-First AI Gate
      </Typography>
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-5">
        {stages.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.12 }}
            className="flex flex-col items-center text-center relative"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 border ${s.colorBg}`}>
              <s.icon size={24} className={s.colorIcon} />
            </div>
            <Typography variant="ui-small" weight="bold" className="text-white block mb-1">
              {s.label}
            </Typography>
            <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
              {s.desc}
            </Typography>
            {i < stages.length - 1 && (
              <ArrowRight size={16} className="hidden tablet:block absolute -right-2.5 top-6 text-neutral-600" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Redaction visual */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 bg-neutral-800 border border-neutral-700 rounded-xl p-4 font-mono text-xs"
      >
        <div className="text-neutral-500 mb-2">// Before redaction</div>
        <div className="text-neutral-300">Contract signed by <span className="bg-error-500/30 text-error-300 px-1 rounded">John Mueller</span> at <span className="bg-error-500/30 text-error-300 px-1 rounded">john@acme.de</span></div>
        <div className="text-neutral-500 mt-3 mb-2">// After redaction</div>
        <div className="text-neutral-300">Contract signed by <span className="bg-success-bg text-success-400 px-1 rounded">[NAME]</span> at <span className="bg-success-bg text-success-400 px-1 rounded">[EMAIL]</span></div>
      </motion.div>
    </div>
  );
}

// ─── Anchor Bar ───────────────────────────────────────────────────────────────

function AnchorBar() {
  const [active, setActive] = useState('founders');

  const anchors = [
    { id: 'founders', label: 'Founders & CEOs' },
    { id: 'operations', label: 'Operations Teams' },
    { id: 'counsel', label: 'In-House Counsel' },
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
                active === a.id ? 'text-primary-700 bg-primary-50' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
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

// ─── SECTION 1: FOUNDERS & CEOs ───────────────────────────────────────────────

function FoundersSection() {
  const navigate = useNavigate();

  return (
    <Section id="founders" className="py-16 desktop-s:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <div className="grid desktop-s:grid-cols-2 gap-14 items-center mb-14">
          <div>
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              For Founders & CEOs
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              From Regulatory Uncertainty<br className="hidden tablet:block" /> to Confident Expansion
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed mb-8">
              Founders need speed and clarity — not academic legal explanations. CompliHub360 translates regulatory chaos into safe, actionable business decisions so you can scale across borders without surprises.
            </Typography>

            <button
              onClick={() => navigate('/wizard')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-md hover:bg-primary-600 transition-colors"
            >
              Start Your Expansion Check
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Pain points */}
          <div className="space-y-4">
            {[
              {
                icon: AlertTriangle,
                title: 'The Cross-Border Blind Spot',
                desc: 'Expanding internationally? VAT thresholds, EPR packaging laws, and GDPR differ by country. One missed registration can mean fines.',
                color: 'bg-error-50 border-error-200 text-error-600',
              },
              {
                icon: Clock,
                title: 'The Unreliable Expert Trap',
                desc: 'Cold-emailing compliance providers and waiting weeks for vague replies is not a strategy. It\'s a liability.',
                color: 'bg-warning-bg border-warning-text/30 text-warning-text',
              },
              {
                icon: CheckCircle,
                title: 'We Fix This',
                desc: 'Our AI Wizard captures your context in 4–5 steps, maps jurisdiction-bound risks, and connects you to SLA-enforced specialists within 24–48h.',
                color: 'bg-success-bg border-success-200 text-success-500',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className={`rounded-2xl border p-6 flex items-start gap-4 ${color}`}
              >
                <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <Typography variant="ui-small" weight="bold" className="block mb-1">{title}</Typography>
                  <Typography variant="caption" className="block normal-case tracking-normal leading-relaxed opacity-80">{desc}</Typography>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* "Expand Safely" flow diagram */}
        <ExpandSafelyPath />

        {/* Outcome metrics */}
        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4 mt-10">
          <StatCard value="4–5" label="Steps to risk profile" delay={0} />
          <StatCard value="24h" label="Max confirmation time" delay={0.1} />
          <StatCard value="48h" label="Max reply window" delay={0.2} />
          <StatCard value="0" label="Regulatory surprises" delay={0.3} />
        </div>
      </div>
    </Section>
  );
}

// ─── SECTION 2: OPERATIONS TEAMS ──────────────────────────────────────────────

function OperationsSection() {
  return (
    <Section id="operations" className="py-16 desktop-s:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-14">
          <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
            For Operations Teams
          </Typography>
          <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
            Centralize, Track &<br className="hidden tablet:block" /> Master Compliance Ops
          </Typography>
          <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
            Operations managers and agency operators need structured knowledge and a unified system — not scattered government sites and chaotic email threads. CompliHub360 gives you a single control center for cross-border compliance.
          </Typography>
        </div>

        {/* Pain → Solution Grid */}
        <div className="grid tablet:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Search,
              title: 'Scattered Research',
              problem: 'Information on advertising restrictions, EPR, and tax laws is fragmented across unstructured government sites.',
              solution: 'Our Knowledge Hub aggregates source-backed laws, tutorials, and guides — all tailored to your exact search profile.',
            },
            {
              icon: Layers,
              title: 'Loss of Continuity',
              problem: 'Tracking provider requests, saved sessions, and legal updates is chaotic without a unified system.',
              solution: 'The Dashboard Control Center lets you save sessions, track engagement statuses in real-time, and monitor tasks.',
            },
            {
              icon: Download,
              title: 'Reporting Friction',
              problem: 'Summarizing regulatory exposure for stakeholders is manual, time-consuming work.',
              solution: 'One-click PDF export: Risk Snapshot, Action Plan, and Source Index — ready for internal circulation.',
            },
          ].map(({ icon: Icon, title, problem, solution }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-neutral-200 rounded-2xl p-7"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-5">
                <Icon size={22} className="text-primary-600" />
              </div>
              <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2">{title}</Typography>
              <Typography variant="caption" className="text-error-500 block normal-case tracking-normal mb-3 font-medium">
                ✗ {problem}
              </Typography>
              <Typography variant="caption" className="text-success-500 block normal-case tracking-normal font-medium">
                ✓ {solution}
              </Typography>
            </motion.div>
          ))}
        </div>

        {/* Dashboard Preview Diagram */}
        <OpsDashboardPreview />

        <div className="grid grid-cols-3 gap-4 mt-10">
          <StatCard value="100%" label="Engagement lifecycle visibility" delay={0} />
          <StatCard value="1-Click" label="PDF report export" delay={0.1} />
          <StatCard value="∞" label="Saved compliance sessions" delay={0.2} />
        </div>
      </div>
    </Section>
  );
}

// ─── SECTION 3: IN-HOUSE COUNSEL ──────────────────────────────────────────────

function CounselSection() {
  const navigate = useNavigate();

  return (
    <Section id="counsel" className="py-16 desktop-s:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid desktop-s:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              For In-House Counsel
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              Defensible Intelligence.<br />Secure Orchestration.
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed mb-8">
              Legal professionals demand strict data privacy and zero AI hallucinations. CompliHub360 is a secure, EU-AI-Act ready infrastructure layer that accelerates legal research and safely structures external mandates.
            </Typography>

            {/* Key benefits */}
            <div className="space-y-5 mb-10">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Zero Hallucinations',
                  desc: 'Every summary, risk label, and tip is directly backed by links to official, validated legal sources and authorities. No invented claims.',
                },
                {
                  icon: EyeOff,
                  title: 'Privacy-First Architecture',
                  desc: 'Documents pass through a local PII Redaction Pipeline. Names, emails, and phone numbers are masked before any AI processing.',
                },
                {
                  icon: Scale,
                  title: 'Structured Engagement Dossiers',
                  desc: 'Replace vague emails with structured compliance dossiers sent to verified local counsel — accelerating the mandate process.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <Typography variant="ui-small" weight="bold" className="text-neutral-900 mb-1 block">{title}</Typography>
                    <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal leading-relaxed">{desc}</Typography>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-md hover:bg-primary-600 transition-colors"
            >
              Try Secure Research
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Right: Privacy Gate Diagram */}
          <div>
            <PrivacyGateDiagram />

            <div className="grid grid-cols-2 gap-4 mt-8">
              <StatCard value="100%" label="PII masked before AI" delay={0} />
              <StatCard value="100%" label="Source-linked outputs" delay={0.1} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function SolutionsCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-16 desktop-s:py-24 bg-primary-900">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Typography variant="display" weight="bold" className="text-white mb-5">
          Which role fits you?
        </Typography>
        <Typography variant="body" className="text-primary-300 mb-10 text-lg">
          No matter your function — our platform adapts to your compliance reality.
        </Typography>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/wizard')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
          >
            Start Free Assessment
          </button>
          <button
            onClick={() => navigate('/platform')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-primary-400 text-white font-bold text-base hover:bg-primary-800 transition-colors"
          >
            Explore Platform
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function SolutionsFooter() {
  return (
    <footer className="bg-neutral-900 py-10 text-center">
      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
        © {new Date().getFullYear()} CompliHub360. Built in Berlin.
      </Typography>
    </footer>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function SolutionsPage() {
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
      <FoundersSection />
      <OperationsSection />
      <CounselSection />
      <SolutionsCTA />
      <SolutionsFooter />
    </div>
  );
}
