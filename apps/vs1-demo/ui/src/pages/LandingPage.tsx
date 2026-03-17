import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  AlertTriangle,
  Clock,
  Users,
  Download,
  Mail,
  Check,
  CircleDot,
  Link,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';
import { Input } from '../components/ui/Input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  path: string;
}

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

interface AiStep {
  step: string;
  icon: LucideIcon;
  title: string;
  body: string;
  stepLabelCls: string;
  iconBgCls: string;
  cardCls: string;
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

const NAV_LINKS: NavLink[] = [
  { label: 'Services', path: '/services' },
  { label: 'Countries', path: '/countries' },
  { label: 'Advisory', path: '/advisory' },
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
  },
  {
    step: '02',
    icon: Lock,
    title: 'PII Redaction Pipeline',
    body: 'Local AI models strip all Personally Identifiable Information — names, emails, tax IDs, phone numbers — before the anonymised schema is passed to the mapping engine.',
    stepLabelCls: 'text-primary-600',
    iconBgCls: 'bg-soft-blue text-primary-700',
    cardCls: 'border border-[#97C5C4]',
  },
  {
    step: '03',
    icon: ShieldCheck,
    title: 'Regulatory Mapping',
    body: 'The engine cross-references your anonymised profile with live country-specific risk matrices, obligation thresholds, and deadline calendars to produce a structured dossier.',
    stepLabelCls: 'text-success-700',
    iconBgCls: 'bg-success-bg text-success-500',
    cardCls: 'bg-success-bg border-success-500/30',
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
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-surface/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0"
          aria-label="CompliHub360 Home"
        >
          <div className="w-6 h-6 bg-primary-500 rounded-sm flex items-center justify-center">
            <CircleDot size={14} className="text-white" />
          </div>
          <span className="font-sans font-bold text-neutral-900 tracking-tight">
            CompliHub<span className="text-primary-500">360</span>
          </span>
        </button>

        <nav className="hidden tablet:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 py-2 rounded-md text-ui-small font-medium transition-colors ${
                location.pathname === link.path
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            className="hidden tablet:inline-flex text-neutral-600 hover:text-neutral-900 text-ui-small font-medium px-4 py-2 rounded-md hover:bg-neutral-100 transition-colors"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
            Get Started Free
          </Button>
        </div>
      </div>
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
    <section className="bg-surface py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            Why CompliHub360?
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900">
            Built different, by design
          </Typography>
        </div>

        <div className="grid tablet:grid-cols-3 gap-6">
          {USP_ITEMS.map(({ icon: Icon, title, body, bullets, cardCls, iconCls, bulletCls }) => (
            <div
              key={title}
              className={`border rounded-xl p-7 flex flex-col ${cardCls}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 shrink-0 ${iconCls}`}>
                <Icon size={22} />
              </div>
              <Typography variant="h3" weight="bold" className="text-neutral-900 mb-3">
                {title}
              </Typography>
              <Typography variant="body" className="text-neutral-600 mb-6 flex-1">
                {body}
              </Typography>
              <ul className="space-y-2">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bulletCls}`} />
                    <Typography variant="ui-small" className="text-neutral-700">
                      {bullet}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

function AiEngineZone() {
  return (
    <section className="bg-surface py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            The AI Engine
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900 mb-4">
            From raw context to a structured<br className="hidden tablet:block" /> compliance dossier
          </Typography>
          <Typography variant="body" className="text-neutral-600 max-w-xl mx-auto">
            Our privacy-first AI pipeline has three stages — each designed to maximise output quality while minimising your data exposure.
          </Typography>
        </div>

        <div className="grid desktop-s:grid-cols-3 gap-5">
          {AI_STEPS.map(({ step, icon: Icon, title, body, stepLabelCls, iconBgCls, cardCls }, index) => (
            <div key={step} className="relative">
              {/* Connector */}
              {index < AI_STEPS.length - 1 && (
                <div className="hidden desktop-s:flex absolute -right-3 top-14 z-10 w-6 items-center justify-center">
                  <ArrowRight size={18} className="text-neutral-300" />
                </div>
              )}
              <div className={`border rounded-xl p-6 h-full flex flex-col ${cardCls}`}>
                <div className="flex items-start gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgCls}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <Typography variant="caption" className={`block mb-1 normal-case tracking-normal font-semibold ${stepLabelCls}`}>
                      Step {step}
                    </Typography>
                    <Typography variant="h3" weight="bold" className="text-neutral-900">
                      {title}
                    </Typography>
                  </div>
                </div>
                <Typography variant="ui-small" className="text-neutral-600 leading-relaxed">
                  {body}
                </Typography>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Zone 6: Value Progression ────────────────────────────────────────────────

function ValueProgressionZone() {
  const navigate = useNavigate();

  return (
    <section className="bg-background py-10 desktop-s:py-12">
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

// ─── Zone 7: Testimonials ─────────────────────────────────────────────────────

function TestimonialsZone() {
  return (
    <section className="bg-neutral-50 py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <Typography variant="caption" className="text-primary-500 mb-3 block">
            Real Results
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900">
            Trusted by founders and<br className="hidden tablet:block" /> operations teams
          </Typography>
        </div>

        <div className="grid tablet:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {TESTIMONIALS.map(({ persona, name, role, quote, result, resultIcon: ResultIcon, resultCls, tag }) => (
            <Card key={name} className="p-7 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <Typography variant="caption" className="text-neutral-400 block normal-case tracking-normal">
                  {persona}
                </Typography>
                <span className={`inline-flex items-center gap-1.5 text-caption font-bold px-3 py-1 rounded-md normal-case tracking-normal ${resultCls}`}>
                  <ResultIcon size={13} />
                  {result}
                </span>
              </div>

              <blockquote className="relative text-body text-neutral-700 leading-relaxed flex-1 pl-5 mb-7">
                <span className="absolute left-0 -top-1 text-4xl text-neutral-200 font-serif leading-none select-none">"</span>
                {quote}
              </blockquote>

              <div className="flex items-center gap-3 pt-5 border-t border-neutral-100">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <Typography variant="ui-small" weight="bold" className="text-neutral-900">
                    {name}
                  </Typography>
                  <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal truncate">
                    {role}
                  </Typography>
                </div>
                <span className="hidden desktop-s:inline-block text-caption text-neutral-400 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded-md shrink-0 normal-case tracking-normal whitespace-nowrap">
                  {tag}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Zone 8: Dossier-Export & Lead Funnel ────────────────────────────────────

function DossierExportZone() {
  const navigate = useNavigate();

  const findings = [
    { label: 'VAT Registration threshold exceeded', detail: 'Mandatory registration — HMRC threshold £85,000', level: 'error' as const },
    { label: 'EPR Packaging Producer Obligation', detail: 'PRN registration required by Q1 2025', level: 'warning' as const },
    { label: 'MTD for VAT — Digital Records Gap', detail: 'Phase 2 compliance gap in current workflow', level: 'warning' as const },
    { label: 'UK GDPR — Privacy Policy', detail: 'Meets baseline UK GDPR requirements', level: 'success' as const },
  ];

  const findingBadge: Record<'error' | 'warning' | 'success', { dot: string; badge: string; label: string }> = {
    error:   { dot: 'bg-error-500',   badge: 'bg-error-bg text-error-500',     label: 'Action Req.' },
    warning: { dot: 'bg-warning-500', badge: 'bg-warning-bg text-warning-500', label: 'Review' },
    success: { dot: 'bg-success-500', badge: 'bg-success-bg text-success-500', label: 'Compliant' },
  };

  return (
    <section className="bg-primary-900 py-10 desktop-s:py-12">
      <div className="max-w-7xl mx-auto px-6 grid desktop-s:grid-cols-2 gap-10 items-start">

        {/* Left — Risk Snapshot */}
        <div>
          <Typography variant="caption" className="text-primary-300 mb-3 block normal-case tracking-normal">
            Sample Output — Page 1 of 3
          </Typography>
          <Typography variant="h1" weight="bold" className="text-white mb-3">
            UK Compliance<br />Risk Snapshot
          </Typography>
          <Typography variant="body" className="text-primary-300 mb-7">
            You have your risk profile. Now fix it. Here is what a typical UK expansion dossier looks like — and the three paths to resolving it.
          </Typography>

          {/* Risk level bar */}
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <Typography variant="caption" className="text-primary-300 block normal-case tracking-normal">
                Overall Risk Level
              </Typography>
              <span className="flex items-center gap-2 font-bold text-error-500">
                <AlertTriangle size={18} />
                <span className="text-h3 leading-none">High</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-primary-700 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-error-500 rounded-full" />
            </div>
            <div className="flex justify-between mt-2">
              {['Low', 'Medium', 'High', 'Critical'].map((l) => (
                <Typography key={l} variant="caption" className={`block normal-case tracking-normal ${l === 'High' ? 'text-error-500 font-bold' : 'text-primary-400'}`}>
                  {l}
                </Typography>
              ))}
            </div>
          </div>

          {/* Key findings */}
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
            <Typography variant="ui-small" weight="semibold" className="text-white mb-4 block">
              Key Findings
            </Typography>
            <ul className="divide-y divide-primary-700">
              {findings.map(({ label, detail, level }) => {
                const { dot, badge, label: badgeLabel } = findingBadge[level];
                return (
                  <li key={label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <Typography variant="ui-small" weight="semibold" className="text-white block">
                        {label}
                      </Typography>
                      <Typography variant="caption" className="text-primary-300 block normal-case tracking-normal">
                        {detail}
                      </Typography>
                    </div>
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-md shrink-0 normal-case tracking-normal ${badge}`}>
                      {badgeLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right — Sources + Lead Funnel */}
        <div className="flex flex-col gap-4">
          {/* Grounded Sources */}
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link size={16} className="text-primary-300" />
              <Typography variant="ui-small" weight="semibold" className="text-white block">
                Grounded Sources
              </Typography>
            </div>
            <ul className="space-y-2">
              {GROUNDED_SOURCES.map(({ title, ref, type }) => (
                <li key={ref} className="flex items-start gap-3 bg-primary-700/50 rounded-md p-3">
                  <span className="w-1 h-1 rounded-full bg-primary-300 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Typography variant="ui-small" weight="semibold" className="text-white truncate block">
                      {title}
                    </Typography>
                    <Typography variant="caption" className="text-primary-300 block normal-case tracking-normal">
                      {ref}
                    </Typography>
                  </div>
                  <span className="text-caption text-primary-400 bg-primary-700 px-2 py-0.5 rounded-md shrink-0 normal-case tracking-normal">
                    {type}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Export CTA card */}
          <div className="bg-surface rounded-xl p-6 shadow-md">
            <Typography variant="h3" weight="bold" className="text-neutral-900 mb-1">
              You have your risk profile.
            </Typography>
            <Typography variant="ui-small" className="text-neutral-600 mb-5 block">
              Choose how you want to resolve it.
            </Typography>

            {/* Page previews */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { page: 'Page 1', label: 'Risk Snapshot', locked: false },
                { page: 'Page 2', label: 'Action Plan', locked: true },
                { page: 'Page 3', label: 'Expert Match', locked: true },
              ].map(({ page, label, locked }) => (
                <div
                  key={page}
                  className={`rounded-md border p-3 text-center ${locked ? 'bg-neutral-50 border-neutral-200' : 'bg-primary-50 border-primary-200'}`}
                >
                  {locked ? (
                    <Lock size={20} className="text-neutral-300 mx-auto mb-1" />
                  ) : (
                    <FileText size={20} className="text-primary-500 mx-auto mb-1" />
                  )}
                  <Typography variant="caption" className={`block font-bold normal-case tracking-normal ${locked ? 'text-neutral-400' : 'text-neutral-700'}`}>
                    {page}
                  </Typography>
                  <Typography variant="caption" className={`block normal-case tracking-normal ${locked ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {label}
                  </Typography>
                </div>
              ))}
            </div>

            {/* CTA 1 — Guest */}
            <Button variant="secondary" fullWidth className="mb-3 justify-center gap-2">
              <Download size={16} />
              Export PDF — Guest Preview
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-neutral-200" />
              <Typography variant="caption" className="text-neutral-400 shrink-0 normal-case tracking-normal">or unlock more</Typography>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            {/* CTA 2 — Register */}
            <Button variant="primary" fullWidth className="mb-3 justify-center" onClick={() => navigate('/register')}>
              Create Profile — Unlock Action Plan
            </Button>

            {/* CTA 3 — Expert */}
            <button
              onClick={() => navigate('/register?intent=expert')}
              className="w-full h-10 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-ui-small rounded-md transition-colors flex items-center justify-center gap-2 mb-4"
            >
              Request Expert Support
              <ArrowRight size={15} />
            </button>

            <Typography variant="caption" className="text-neutral-400 text-center block normal-case tracking-normal leading-relaxed">
              Expert Support connects you with a verified local tax or legal specialist who executes the action plan on your behalf.
            </Typography>
          </div>
        </div>
      </div>
    </section>
  );
}

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

// ─── Main Export ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="bg-background min-h-screen flex flex-col font-sans text-neutral-900 antialiased">
      <LandingNav />
      <main>
        <HeroZone />
        <SocialProofStrip />
        <UspZone />
        <ServicesZone />
        <AiEngineZone />
        <ValueProgressionZone />
        <TestimonialsZone />
        <DossierExportZone />
      </main>
      <LandingFooter />
    </div>
  );
}
