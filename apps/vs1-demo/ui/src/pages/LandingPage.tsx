import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Lock,
  CheckCircle,
  Zap,
  Layers,
  ArrowRight,
  Package,
  Building2,
  Scale,
  Megaphone,
  Database,
  Globe,
  FileText,
  Clock,
  LayoutDashboard,
  Mail,
  Check,
  CircleDot,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';
import { Input } from '../components/ui/Input';
import { HeroSection } from '../components/layout/HeroSection';
import { RiskSnapshotTeaser } from '../components/feedback/RiskSnapshotTeaser';
import { ComplianceStepper } from '../components/feedback/ComplianceStepper';
import { ServicesAccordion } from '../components/layout/ServicesAccordion';
import { BackgroundDepth } from '../components/layout/BackgroundDepth';
import { RiskResolutionZone } from '../components/feedback/RiskResolutionZone';
import { TestimonialTicker } from '../components/feedback/TestimonialTicker';
// ─── Types ────────────────────────────────────────────────────────────────────

interface TrustBadge {
  icon: LucideIcon;
  text: string;
}

interface PartnerLogo {
  name: string;
}

interface UspItem {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
  cardCls: string;
  iconCls: string;
  bulletCls: string;
}

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  tagCls: string;
  iconBgCls: string;
}

interface AiStat {
  label: string;
  numericEnd?: number;
  suffix?: string;
  staticValue?: string;
}

interface AiStep {
  step: string;
  icon: LucideIcon;
  title: string;
  body: string;
  stepLabelCls: string;
  iconBgCls: string;
  cardCls: string;
  dotActiveCls: string;
  panelCls: string;
  stats: AiStat[];
}

interface TierFeature {
  text: string;
  available: boolean;
}

interface Tier {
  badgeLabel: string;
  badgeCls: string;
  title: string;
  description: string;
  features: TierFeature[];
  cta: string;
  highlighted: boolean;
}

interface Testimonial {
  persona: string;
  name: string;
  role: string;
  quote: string;
  result: string;
  resultIcon: LucideIcon;
  resultCls: string;
  tag: string;
}

interface GroundedSource {
  title: string;
  ref: string;
  type: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const HEADER_MENU = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { title: 'The AI Engine', desc: 'Secure data extraction & mapping', path: '/platform#engine' },
      { title: 'Partner Matching', desc: 'From risk to local execution', path: '/platform#matching' },
      { title: 'Global Coverage', desc: 'UK, EU, Germany & US', path: '/platform#coverage' },
      { title: 'For Partner Firms', desc: 'Lead generation for advisors', path: '/platform#partners' },
    ]
  },
  {
    id: 'solutions',
    label: 'Solutions',
    items: [
      { title: 'Founders & CEOs', desc: 'Minimise risk & scale faster', path: '/solutions#founders' },
      { title: 'Operations Teams', desc: 'Automate daily compliance', path: '/solutions#operations' },
      { title: 'In-House Counsel', desc: 'Cut research time by 90%', path: '/solutions#counsel' },
    ]
  },
  {
    id: 'areas',
    label: 'Compliance Areas',
    path: '/compliance',
    items: []
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      { title: 'Customer Stories', desc: 'See real compliance outcomes', path: '/resources#stories' },
      { title: 'Guides & Whitepapers', desc: 'In-depth market deep-dives', path: '/resources#guides' },
    ]
  }
];

const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, text: 'Privacy-first architecture' },
  { icon: Lock,        text: 'No PII stored without consent' },
  { icon: Scale,       text: 'Grounded regulatory sources' },
];

const PARTNERS: PartnerLogo[] = [
  { name: 'Deloitte' },
  { name: 'KPMG' },
  { name: 'Baker McKenzie' },
  { name: 'DLA Piper' },
  { name: 'Grant Thornton' },
  { name: 'BDO' },
];

const USP_ITEMS: UspItem[] = [
  {
    icon: Zap,
    title: 'Proactive, not reactive',
    body: 'Stop manually searching for regulations. CompliHub360 maps your business context to a prioritised, country-specific action plan — before you face a penalty.',
    bullets: [
      'Personalised risk profile in minutes',
      'Prioritised obligations, not a raw law dump',
      'Covers UK, EU & multi-market scenarios',
    ],
    cardCls: 'bg-surface border-neutral-200',
    iconCls: 'bg-primary-50 text-primary-500',
    bulletCls: 'bg-primary-500',
  },
  {
    icon: Lock,
    title: 'Privacy-first by architecture',
    body: 'Your sensitive corporate data — names, emails, tax IDs — never leaves your browser unstructured. Local AI models redact all PII before any analysis reaches our servers.',
    bullets: [
      'Local PII redaction before cloud processing',
      'Zero raw PII stored on our servers',
      'UK GDPR & CCPA compliant by design',
    ],
    cardCls: 'bg-primary-50 border-primary-200',
    iconCls: 'bg-primary-100 text-primary-600',
    bulletCls: 'bg-primary-500',
  },
  {
    icon: Layers,
    title: 'End-to-end orchestration',
    body: 'We manage the full compliance lifecycle — from self-assessment to vetted expert matching. Our automated SLA watchdog tracks provider responses so you are never left waiting.',
    bullets: [
      'Self-assessment to expert handoff',
      'Automated SLA watchdog & email tracking',
      'Verified local expert network',
    ],
    cardCls: 'bg-surface border-neutral-200',
    iconCls: 'bg-accent-50 text-accent-700',
    bulletCls: 'bg-accent-500',
  },
];

const SERVICE_ITEMS: ServiceItem[] = [
  {
    icon: Globe,
    title: 'Tax & VAT',
    description:
      'Cross-border VAT thresholds, mandatory registration triggers, MTD compliance, import duties and marketplace tax rules.',
    tags: ['HMRC', 'MTD', 'EU OSS', 'Import VAT'],
    tagCls: 'bg-primary-50 text-primary-600',
    iconBgCls: 'bg-primary-50 text-primary-500',
  },
  {
    icon: Package,
    title: 'Product & Packaging',
    description:
      'Extended Producer Responsibility (EPR) registration, PRN schemes, recycling targets, product labelling, and UKCA marking obligations.',
    tags: ['EPR', 'PRN', 'UKCA', 'Env. Act 2021'],
    tagCls: 'bg-primary-50 text-primary-600',
    iconBgCls: 'bg-primary-50 text-primary-500',
  },
  {
    icon: Building2,
    title: 'Corporate Structure',
    description:
      'Legal entity formation, foreign branch registration, substance requirements, director obligations, and Companies House filings.',
    tags: ['Ltd / LLP', 'Branch', 'Companies House'],
    tagCls: 'bg-primary-50 text-primary-600',
    iconBgCls: 'bg-primary-50 text-primary-500',
  },
  {
    icon: Megaphone,
    title: 'Marketing & Advertising',
    description:
      'ASA advertising standards, health claims, influencer rules, cookie consent, tracking laws, and GDPR-compliant marketing practices.',
    tags: ['ASA', 'ICO', 'Cookie Law', 'GDPR'],
    tagCls: 'bg-accent-50 text-accent-700',
    iconBgCls: 'bg-accent-50 text-accent-700',
  },
  {
    icon: Database,
    title: 'Data & Privacy',
    description:
      'UK GDPR & EU GDPR divergence mapping, DPO requirements, data transfer mechanisms, DSAR processes, and breach notification obligations.',
    tags: ['UK GDPR', 'DPA 2018', 'ICO', 'DSAR'],
    tagCls: 'bg-primary-50 text-primary-600',
    iconBgCls: 'bg-primary-50 text-primary-500',
  },
];

const AI_STEPS: AiStep[] = [
  {
    step: '01',
    icon: FileText,
    title: 'Smart Context Ingestion',
    body: 'The AI translates your unstructured business context into a validated structured schema — extracting entity type, industry, revenue bands, and market intent.',
    stepLabelCls: 'text-primary-400',
    iconBgCls: 'bg-primary-100 text-primary-600',
    cardCls: 'bg-primary-50 border-primary-200',
    dotActiveCls: 'bg-primary-500 border-primary-300 ring-primary-200',
    panelCls: 'bg-primary-50 border-primary-200',
    stats: [
      { label: 'Entity fields extracted', numericEnd: 12 },
      { label: 'Markets detected', numericEnd: 3 },
      { label: 'Processing time', staticValue: '< 2 s' },
    ],
  },
  {
    step: '02',
    icon: Lock,
    title: 'Live Validations',
    body: 'Local AI models strip all Personally Identifiable Information — names, emails, tax IDs, phone numbers — before the anonymised schema is passed to the mapping engine.',
    stepLabelCls: 'text-primary-600',
    iconBgCls: 'bg-soft-blue text-primary-700',
    cardCls: 'border border-[#97C5C4]',
    dotActiveCls: 'bg-[#97C5C4] border-[#97C5C4]/60 ring-[#97C5C4]/30',
    panelCls: 'bg-white border-[#97C5C4]',
    stats: [
      { label: 'Live validations run', numericEnd: 47 },
      { label: 'PII fields removed', numericEnd: 100, suffix: '%' },
      { label: 'Bytes stored on server', numericEnd: 0 },
    ],
  },
  {
    step: '03',
    icon: ShieldCheck,
    title: 'Dossier Generation & Matching',
    body: 'The engine cross-references your anonymised profile with live country-specific risk matrices and produces a structured dossier matched to vetted local experts.',
    stepLabelCls: 'text-success-700',
    iconBgCls: 'bg-success-bg text-success-500',
    cardCls: 'bg-success-bg border-success-500/30',
    dotActiveCls: 'bg-success-500 border-success-300 ring-success-200',
    panelCls: 'bg-success-bg border-success-500/30',
    stats: [
      { label: 'Dossier pages generated', numericEnd: 3 },
      { label: 'Expert match accuracy', numericEnd: 98, suffix: '%' },
      { label: 'Average match time', staticValue: '< 24 h' },
    ],
  },
];

const VALUE_TIERS: Tier[] = [
  {
    badgeLabel: 'Guest',
    badgeCls: 'bg-neutral-100 text-neutral-500',
    title: 'Risk Snapshot',
    description:
      'Instantly see your top compliance risks without creating an account.',
    features: [
      { text: 'Basic risk profile (Page 1)', available: true },
      { text: 'Top 3 obligations flagged', available: true },
      { text: 'PDF export (watermarked)', available: true },
      { text: 'No profile saving', available: false },
      { text: 'No action plan', available: false },
    ],
    cta: 'Start for Free',
    highlighted: false,
  },
  {
    badgeLabel: 'Client',
    badgeCls: 'bg-accent-500/20 text-accent-400',
    title: 'Full Compliance Dossier',
    description:
      'Everything a Guest gets, plus a step-by-step action plan, document storage, and saved company profiles.',
    features: [
      { text: 'Full structured dossier (all 3 pages)', available: true },
      { text: 'Step-by-step action plan', available: true },
      { text: 'Saved company profiles', available: true },
      { text: 'Document storage & version control', available: true },
      { text: 'Expert match & request flow', available: true },
    ],
    cta: 'Create Free Account',
    highlighted: true,
  },
  {
    badgeLabel: 'Partner',
    badgeCls: 'bg-accent-50 text-accent-700 border border-accent-200',
    title: 'Provider Dashboard',
    description:
      'For verified tax advisors, lawyers, and compliance consultants. Receive pre-qualified, structured leads.',
    features: [
      { text: 'Qualified structured client leads', available: true },
      { text: 'Automated SLA tracking & watchdog', available: true },
      { text: 'Integrated management console', available: true },
      { text: 'Client dossier & brief pre-attached', available: true },
      { text: 'Response time & SLA enforcement', available: true },
    ],
    cta: 'Apply as a Partner',
    highlighted: false,
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    persona: 'U1 — E-Commerce Founder',
    name: 'Sarah K.',
    role: 'Founder & CEO, D2C Brand (UK Expansion)',
    quote:
      'I saved 3 weeks of legal research in under 30 minutes. CompliHub360 immediately flagged our EPR packaging obligation that our accountant had completely missed. The structured dossier was ready to hand over to our solicitor the same day.',
    result: 'Time Savings',
    resultIcon: Clock,
    resultCls: 'bg-accent-50 border border-accent-200 text-accent-700',
    tag: 'E-Commerce · EPR + VAT',
  },
  {
    persona: 'U2 — SaaS Operations Manager',
    name: 'Marcus L.',
    role: 'Head of Operations, B2B SaaS Scale-up',
    quote:
      'As a non-lawyer, navigating post-Brexit UK GDPR differences was genuinely stressful. CompliHub360 gave me a grounded, cited analysis I could defend in front of our board. I finally feel confident in our compliance stance.',
    result: 'Legal Certainty',
    resultIcon: ShieldCheck,
    resultCls: 'bg-primary-50 border border-primary-200 text-primary-600',
    tag: 'SaaS · UK GDPR',
  },
];

const GROUNDED_SOURCES: GroundedSource[] = [
  { title: 'Should I be registered for VAT?', ref: 'HMRC VAT Notice 700/1', type: 'Guidance' },
  { title: 'UK Extended Producer Responsibility', ref: 'Environment Act 2021', type: 'Legislation' },
  { title: 'Making Tax Digital — Phase 2', ref: 'HMRC MTD for VAT', type: 'Directive' },
  { title: 'Product Safety & Standards Post-Brexit', ref: 'OPSS Guidance 2024', type: 'Guidance' },
];

// ─── Zone 0: Navigation ───────────────────────────────────────────────────────

function LandingNav() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Close menu on scroll
  useEffect(() => {
    const handleScroll = () => setActiveMenu(null);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-surface/90 backdrop-blur-md"
      onMouseLeave={() => setActiveMenu(null)}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6 relative">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0 z-10"
          aria-label="CompliHub360 Home"
        >
          <div className="w-6 h-6 bg-primary-500 rounded-sm flex items-center justify-center">
            <CircleDot size={14} className="text-white" />
          </div>
          <span className="font-sans font-bold text-neutral-900 tracking-tight">
            CompliHub<span className="text-primary-500">360</span>
          </span>
        </button>

        <nav className="hidden tablet:flex items-center h-full gap-2 absolute left-1/2 -translate-x-1/2">
          {HEADER_MENU.map((menu) => (
            <div 
              key={menu.id} 
              className="h-full flex items-center"
              onMouseEnter={() => menu.items.length > 0 ? setActiveMenu(menu.id) : setActiveMenu(null)}
            >
              <button
                onClick={() => menu.path ? navigate(menu.path) : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-ui-small font-semibold transition-colors ${
                  activeMenu === menu.id
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {menu.label}
                {menu.items.length > 0 && <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === menu.id ? 'rotate-180 text-primary-600' : 'text-neutral-400'}`} />}
              </button>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <button
            className="hidden tablet:inline-flex text-neutral-600 hover:text-neutral-900 text-ui-small font-semibold px-4 py-2 rounded-md hover:bg-neutral-100 transition-colors"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
            Sign up for free
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="absolute top-16 left-0 w-full bg-white border-b border-neutral-200 shadow-xl overflow-hidden pointer-events-auto"
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {HEADER_MENU.find(m => m.id === activeMenu)?.items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => {
                      navigate(item.path);
                      setActiveMenu(null);
                    }}
                    className="text-left group flex items-start gap-4 p-3 -m-3 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100 group-hover:bg-white group-hover:border-primary-200 group-hover:shadow-sm transition-all">
                      <LayoutDashboard size={18} className="text-primary-600" />
                    </div>
                    <div className="mt-0.5">
                      <Typography variant="ui-small" weight="bold" className="text-neutral-900 flex items-center gap-1 mb-1 group-hover:text-primary-700 transition-colors">
                        {item.title}
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 w-0 group-hover:w-auto overflow-hidden group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-500" />
                      </Typography>
                      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
                        {item.desc}
                      </Typography>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Zone 1: Hero & Intent-Gate ───────────────────────────────────────────────

function HeroZone() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('uk');
  const [category, setCategory] = useState('tax-vat');

  const handleQualify = () => {
    navigate(`/wizard?category=${category}&country=${country}`);
  };

  return (
    <section className="bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 desktop-s:py-12 grid desktop-s:grid-cols-2 gap-10 items-center">

        {/* Left — Headline */}
        <div>
          <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-200 text-accent-700 text-caption font-semibold px-3 py-1 rounded-md mb-6">
            <Sparkles size={14} />
            AI-Powered Advisory System
          </div>

          <Typography variant="display" weight="bold" className="text-neutral-900 leading-tight mb-5">
            Your Compliance{' '}
            <span className="text-primary-500">Compass</span>{' '}
            for Post-Brexit UK
          </Typography>

          <Typography variant="body" className="text-neutral-600 max-w-md mb-7">
            Navigate Tax &amp; VAT obligations and EPR requirements with precision.
            Translate regulatory fragmentation into a structured Action Plan — in max.&nbsp;5&nbsp;steps.
          </Typography>

          <ul className="flex flex-wrap gap-5">
            {TRUST_BADGES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 text-ui-small text-neutral-500">
                <Icon size={14} className="text-success-500 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Intent-Gate */}
        <Card className="shadow-md p-7">
          <Typography variant="h3" weight="bold" className="text-neutral-900 mb-1">
            Start your qualification
          </Typography>
          <Typography variant="ui-small" className="text-neutral-500 mb-6">
            Select your market and category to receive a personalised compliance dossier.
          </Typography>

          <div className="space-y-4 mb-6">
            {/* Country */}
            <div>
              <label className="block text-ui-small font-semibold text-neutral-700 mb-1.5">
                Target Market
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-10 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                  aria-label="Select target market"
                >
                  <option value="uk">🇬🇧 United Kingdom (Post-Brexit)</option>
                  <option value="eu">🇪🇺 European Union</option>
                  <option value="de">🇩🇪 Germany</option>
                  <option value="us">🇺🇸 United States</option>
                  <option value="global">🌐 Global / Multi-Market</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-ui-small font-semibold text-neutral-700 mb-1.5">
                Compliance Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-10 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                  aria-label="Select compliance category"
                >
                  <option value="tax-vat">Tax &amp; VAT — Cross-border obligations</option>
                  <option value="epr">EPR / Packaging — Producer Responsibility</option>
                  <option value="data-privacy">Data &amp; Privacy — UK GDPR</option>
                  <option value="marketing-seo">Marketing &amp; Advertising Standards</option>
                  <option value="corporate">Corporate &amp; Legal Structure</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleQualify}
            className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-body rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowRight size={18} />
            Qualify in max. 5 Steps
          </button>

          <Typography variant="caption" className="text-neutral-400 text-center mt-3 block normal-case tracking-normal">
            No account required · Results in under 3 minutes
          </Typography>
        </Card>
      </div>
    </section>
  );
}

// ─── Zone 2: Social Proof Strip ───────────────────────────────────────────────

function SocialProofStrip() {
  return (
    <section className="bg-primary-50 border-y border-primary-100 py-6">
      <div className="max-w-7xl mx-auto px-6">
        <Typography variant="caption" className="text-neutral-500 text-center mb-5 block">
          Trusted by compliance teams at
        </Typography>
        <ul className="flex flex-wrap items-center justify-center gap-4 desktop-s:gap-7">
          {PARTNERS.map(({ name }) => (
            <li
              key={name}
              className="h-8 px-5 bg-surface border border-neutral-200 rounded-md flex items-center justify-center shadow-xs"
            >
              <span className="text-ui-small font-semibold text-neutral-400 tracking-tight">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Zone 3: Core USPs ────────────────────────────────────────────────────────

function UspZone() {
  return (
    <section className="bg-transparent py-16 desktop-s:py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
        >
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            Why CompliHub360?
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900">
            Built different, by design
          </Typography>
        </motion.div>

        {/* Process track + cards */}
        <div className="flex flex-col tablet:flex-row items-stretch">
          {USP_ITEMS.reduce<React.ReactNode[]>((acc, { icon: Icon, title, body, bullets, cardCls, iconCls, bulletCls }, index) => {

            acc.push(
              <motion.div
                key={title}
                className={`flex-1 border rounded-xl p-7 flex flex-col ${cardCls}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.18 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                {/* Step number */}
                <motion.span
                  className="text-[11px] font-semibold text-neutral-400 tracking-[0.18em] tabular-nums mb-3 block"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.18 + 0.25 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.span>

                {/* Icon */}
                <motion.div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 shrink-0 ${iconCls}`}
                  initial={{ scale: 0.7, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: index * 0.18 + 0.08 }}
                >
                  <Icon size={22} />
                </motion.div>

                <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
                  {title}
                </Typography>
                <Typography variant="body" className="text-neutral-600 mb-6 flex-1">
                  {body}
                </Typography>

                <ul className="space-y-2">
                  {bullets.map((bullet, bi) => (
                    <motion.li
                      key={bullet}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.18 + 0.38 + bi * 0.07 }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bulletCls}`} />
                      <Typography variant="ui-small" className="text-neutral-700">
                        {bullet}
                      </Typography>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            );

            if (index < USP_ITEMS.length - 1) {
              acc.push(
                <div
                  key={`connector-${index}`}
                  className="hidden tablet:flex flex-col items-center justify-center gap-1 px-2 shrink-0 self-center"
                >
                  <motion.div
                    className="flex items-center"
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.18 + 0.32, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  >
                    <div className="w-5 h-px bg-neutral-300" />
                    <ArrowRight size={13} className="text-neutral-400 -ml-0.5" />
                  </motion.div>
                </div>
              );
            }

            return acc;
          }, [])}
        </div>

      </div>
    </section>
  );
}

// ─── Zone 4: Service Offerings ────────────────────────────────────────────────

function ServicesZone() {
  const navigate = useNavigate();

  return (
    <section className="bg-neutral-50 py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col desktop-s:flex-row desktop-s:items-end justify-between mb-10 gap-4">
          <div>
            <Typography variant="caption" className="text-primary-500 mb-3 block">
              What we cover
            </Typography>
            <Typography variant="h1" weight="bold" className="text-neutral-900">
              Six compliance domains,<br className="hidden desktop-s:block" /> one platform
            </Typography>
          </div>
          <Typography variant="body" className="text-neutral-600 desktop-s:max-w-xs desktop-s:text-right">
            Each domain is mapped to country-specific requirements and updated as regulations change.
          </Typography>
        </div>

        <div className="grid tablet:grid-cols-2 desktop-s:grid-cols-3 gap-4">
          {SERVICE_ITEMS.map(({ icon: Icon, title, description, tags, tagCls, iconBgCls }) => (
            <Card key={title} className="p-7 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBgCls}`}>
                  <Icon size={20} />
                </div>
                <Typography variant="h3" weight="bold" className="text-neutral-900">
                  {title}
                </Typography>
              </div>
              <Typography variant="ui-small" className="text-neutral-600 leading-relaxed mb-5 flex-1">
                {description}
              </Typography>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-caption font-semibold px-3 py-1 rounded-pill normal-case tracking-normal ${tagCls}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}

          {/* CTA Card */}
          <div className="bg-primary-500 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <Typography variant="h3" weight="bold" className="text-white mb-3">
                Need end-to-end coverage?
              </Typography>
              <Typography variant="ui-small" className="text-primary-200 leading-relaxed mb-7">
                Our Full Support package covers all six domains with a dedicated compliance manager and a unified action plan.
              </Typography>
            </div>
            <button
              onClick={() => navigate('/wizard?category=full-support')}
              className="h-11 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-ui-small rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Explore Full Support
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Zone 5: AI Engine ────────────────────────────────────────────────────────

function CountUp({ target, suffix = '', duration = 1.1 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    setCount(0);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return <>{count}{suffix}</>;
}

function AiEngineZone() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStation, setActiveStation] = useState<number>(-1);
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);

  const displayStation = hoveredStation !== null ? hoveredStation : activeStation;
  const showPanel = displayStation >= 0;

  // Grid-based positions: 3 equal columns → centres at 1/6, 3/6, 5/6 of container
  const n = AI_STEPS.length;
  const stationPct = (i: number) => ((2 * i + 1) / (2 * n)) * 100;
  const trackStart = stationPct(0);                                          // 16.67%
  const travelPct  = activeStation >= 0 ? stationPct(activeStation) : trackStart;
  const fillPct    = Math.max(0, travelPct - trackStart);                    // 0 / 33.33 / 66.67%

  // Start auto-cycle when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHasStarted(true); },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-cycle: -1 → 0 → 1 → 2 → 0 → ...
  useEffect(() => {
    if (!hasStarted || hoveredStation !== null) return;
    timerRef.current = setTimeout(() => {
      setActiveStation(prev => prev >= AI_STEPS.length - 1 ? 0 : prev + 1);
    }, activeStation === -1 ? 600 : 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [hasStarted, activeStation, hoveredStation]);

  const handleHoverEnter = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredStation(index);
  };

  const handleHoverLeave = () => {
    setHoveredStation(null);
  };

  return (
    <section ref={sectionRef} className="bg-surface py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
        >
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            The AI Engine
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900 mb-4">
            From raw context to a structured<br className="hidden tablet:block" /> compliance dossier
          </Typography>
          <Typography variant="body" className="text-neutral-600 max-w-xl mx-auto">
            Our privacy-first AI pipeline has three stages — each designed to maximise output quality while minimising your data exposure.
          </Typography>
        </motion.div>

        {/* Pipeline — dot row isolated in h-12 so top-1/2 = exact dot centre for every element */}
        <div className="max-w-xl mx-auto mb-2 select-none">

          {/* ── Dot row (h-12 = 48px) ── all absolute elements share top-1/2 -translate-y-1/2 */}
          <div className="relative h-12">

            {/* Base track */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-px bg-neutral-200 pointer-events-none"
              style={{ left: `${trackStart}%`, right: `${100 - stationPct(n - 1)}%` }}
            />

            {/* Filled track */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-px bg-primary-300 origin-left pointer-events-none"
              style={{ left: `${trackStart}%` }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
            />

            {/* Traveling dot */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary-400 shadow-sm z-30 pointer-events-none"
              animate={{
                left: `${travelPct}%`,
                x: '-50%',
                opacity: activeStation >= 0 ? 1 : 0,
              }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
            />

            {/* Station dots */}
            {AI_STEPS.map(({ step, icon: Icon, dotActiveCls, iconBgCls }, index) => {
              const isActive = displayStation === index;
              return (
                <div
                  key={step}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer"
                  style={{ left: `${stationPct(index)}%` }}
                  onMouseEnter={() => handleHoverEnter(index)}
                  onMouseLeave={handleHoverLeave}
                >
                  <motion.div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                      isActive ? `${dotActiveCls} ring-4` : 'bg-white border-neutral-300'
                    }`}
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? iconBgCls : 'bg-neutral-100 text-neutral-400'}`}>
                      <Icon size={15} />
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* ── Label row — separate grid below the dot row ── */}
          <div className="grid grid-cols-3 mt-4">
            {AI_STEPS.map(({ step, title }, index) => {
              const isActive = displayStation === index;
              return (
                <div
                  key={step}
                  className="flex justify-center cursor-pointer"
                  onMouseEnter={() => handleHoverEnter(index)}
                  onMouseLeave={handleHoverLeave}
                >
                  <Typography
                    variant="ui-small"
                    className={`text-center font-medium transition-colors duration-300 max-w-[90px] leading-tight line-clamp-2 ${isActive ? 'text-neutral-800' : 'text-neutral-400'}`}
                  >
                    {title}
                  </Typography>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content panel — px-10 = 40px horizontal padding away from outermost dots */}
        <div className="mt-8 min-h-[160px] px-10">
          <AnimatePresence mode="wait">
            {showPanel && (
              <motion.div
                key={displayStation}
                className={`border rounded-xl p-7 ${AI_STEPS[displayStation].panelCls}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div className="flex flex-col desktop-s:flex-row gap-6 desktop-s:items-start">
                  {/* Left: label + body */}
                  <div className="flex-1">
                    <Typography
                      variant="caption"
                      className={`block mb-1 normal-case tracking-normal font-semibold ${AI_STEPS[displayStation].stepLabelCls}`}
                    >
                      Step {AI_STEPS[displayStation].step}
                    </Typography>
                    <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2">
                      {AI_STEPS[displayStation].title}
                    </Typography>
                    <Typography variant="ui-small" className="text-neutral-600 leading-relaxed max-w-md">
                      {AI_STEPS[displayStation].body}
                    </Typography>
                  </div>

                  {/* Right: stats */}
                  <div className="flex gap-8 shrink-0 desktop-s:pt-1">
                    {AI_STEPS[displayStation].stats.map((stat) => (
                      <div key={stat.label} className="flex flex-col items-center text-center">
                        <span className="text-3xl font-bold text-neutral-900 tabular-nums leading-none mb-1">
                          {stat.staticValue
                            ? stat.staticValue
                            : <CountUp target={stat.numericEnd ?? 0} suffix={stat.suffix ?? ''} />
                          }
                        </span>
                        <Typography variant="ui-small" className="text-neutral-500 max-w-[80px] leading-tight">
                          {stat.label}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

// ─── Zone 6: Value Progression ────────────────────────────────────────────────

function ValueProgressionZone() {
  const navigate = useNavigate();

  return (
    <section className="bg-transparent py-16 desktop-s:py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            Access Tiers
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900 mb-4">
            The more you share, the more<br className="hidden tablet:block" /> you unlock
          </Typography>
          <Typography variant="body" className="text-neutral-600">
            Start for free as a Guest. Register to unlock your full Action Plan. Join as a Partner to receive qualified leads.
          </Typography>
        </div>

        <div className="grid tablet:grid-cols-3 gap-5 items-stretch">
          {VALUE_TIERS.map(({ badgeLabel, badgeCls, title, description, features, cta, highlighted }) => (
            <div
              key={badgeLabel}
              className={`relative rounded-xl p-8 flex flex-col ${
                highlighted
                  ? 'bg-primary-500 shadow-lg'
                  : 'bg-surface border border-neutral-200'
              }`}
            >
              {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 rounded-pill px-4 py-1">
                  <Typography variant="caption" className="text-neutral-900 font-bold block normal-case tracking-normal">
                    Most Popular
                  </Typography>
                </div>
              )}

              <span className={`inline-flex self-start items-center gap-1.5 text-caption font-bold px-3 py-1 rounded-md mb-5 normal-case tracking-normal ${badgeCls}`}>
                {badgeLabel}
              </span>

              <Typography
                variant="h3"
                weight="bold"
                className={`mb-2 ${highlighted ? 'text-white' : 'text-neutral-900'}`}
              >
                {title}
              </Typography>
              <Typography
                variant="ui-small"
                className={`mb-6 leading-relaxed ${highlighted ? 'text-primary-200' : 'text-neutral-600'}`}
              >
                {description}
              </Typography>

              <ul className="space-y-3 flex-1 mb-7">
                {features.map(({ text, available }) => (
                  <li key={text} className="flex items-center gap-2.5">
                    {available ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? 'bg-primary-700' : 'bg-primary-50'}`}>
                        <Check size={11} className={highlighted ? 'text-accent-500' : 'text-primary-500'} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                        <Lock size={10} className="text-neutral-400" />
                      </div>
                    )}
                    <Typography
                      variant="ui-small"
                      className={available
                        ? (highlighted ? 'text-primary-100' : 'text-neutral-700')
                        : 'text-neutral-400'
                      }
                    >
                      {text}
                    </Typography>
                  </li>
                ))}
              </ul>

              {highlighted ? (
                <button
                  onClick={() => navigate('/register')}
                  className="w-full h-11 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-ui-small rounded-md transition-colors"
                >
                  {cta}
                </button>
              ) : (
                <Button
                  variant={badgeLabel === 'Partner' ? 'outline' : 'secondary'}
                  fullWidth
                  onClick={() => navigate(badgeLabel === 'Partner' ? '/register?role=partner' : '/wizard')}
                >
                  {cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Legacy Zones Removed ──────────────────────────────────────────────────────

// ─── Landing Footer ───────────────────────────────────────────────────────────

function LandingFooter() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  const footerLinks = [
    {
      heading: 'Platform',
      links: [
        { label: 'Services', path: '/services' },
        { label: 'Countries', path: '/countries' },
        { label: 'Advisory', path: '/advisory' },
        { label: 'Compliance Wizard', path: '/wizard' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', path: '#' },
        { label: 'Terms of Service', path: '#' },
        { label: 'Cookie Policy', path: '#' },
        { label: 'GDPR Compliance', path: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-primary-950 border-t border-primary-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid tablet:grid-cols-4 gap-8 mb-10">

          {/* Brand + newsletter */}
          <div className="tablet:col-span-2">
            <button
              className="flex items-center gap-2 mb-3"
              onClick={() => navigate('/')}
              aria-label="CompliHub360 Home"
            >
              <div className="w-5 h-5 bg-accent-500 rounded-sm flex items-center justify-center">
                <CircleDot size={12} className="text-primary-950" />
              </div>
              <span className="font-sans font-bold text-white">
                CompliHub<span className="text-accent-500">360</span>
              </span>
            </button>

            <Typography variant="ui-small" className="text-primary-300 max-w-xs leading-relaxed mb-5 block">
              Your intelligent compliance compass. Navigate global regulatory complexity with AI-driven precision and a privacy-first architecture.
            </Typography>

            {subscribed ? (
              <div className="flex items-center gap-2 text-success-500 text-ui-small font-medium">
                <CheckCircle size={16} />
                Subscribed to the Compliance Digest
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-primary-900 border-primary-700 text-white placeholder-primary-400 focus-visible:ring-accent-500 focus-visible:border-accent-500"
                />
                <button
                  type="submit"
                  className="h-10 px-4 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-semibold text-ui-small rounded-md transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Mail size={14} />
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {footerLinks.map(({ heading, links }) => (
            <div key={heading}>
              <Typography variant="caption" className="text-white font-bold block mb-4 normal-case tracking-normal">
                {heading}
              </Typography>
              <ul className="space-y-2">
                {links.map(({ label, path }) => (
                  <li key={label}>
                    <a
                      href={path}
                      onClick={(e) => {
                        if (path.startsWith('/')) {
                          e.preventDefault();
                          navigate(path);
                        }
                      }}
                      className="text-ui-small text-primary-300 hover:text-white transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-primary-900 flex flex-col tablet:flex-row items-center justify-between gap-3">
          <Typography variant="caption" className="text-primary-400 block normal-case tracking-normal">
            © {new Date().getFullYear()} CompliHub360. All rights reserved.
          </Typography>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-accent-500" />
            <Typography variant="caption" className="text-primary-400 block normal-case tracking-normal">
              Privacy-first · No PII stored without consent
            </Typography>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { TrustedLogosTicker } from '../components/layout/TrustedLogosTicker';

export function LandingPage() {
  return (
    <div className="bg-transparent min-h-screen flex flex-col font-sans text-neutral-900 antialiased relative z-0">
      <BackgroundDepth />
      <LandingNav />
      <main>
        <HeroSection />
        <TrustedLogosTicker />
        <RiskSnapshotTeaser />
        <UspZone />
        <AiEngineZone />
        <ServicesAccordion />
        <ComplianceStepper />
        <RiskResolutionZone />
        <TestimonialTicker />
      </main>
      <LandingFooter />
    </div>
  );
}
