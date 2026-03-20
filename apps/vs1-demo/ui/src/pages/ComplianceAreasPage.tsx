import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  CircleDot,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  LayoutDashboard,
  Receipt,
  Recycle,
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle,
  Users,
  Globe,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Typography } from '../components/ui/Typography';

// ─── Shared Nav ───────────────────────────────────────────────────────────────

const HEADER_MENU = [
  {
    id: 'platform', label: 'Platform',
    items: [
      { title: 'The AI Engine', desc: 'Secure data extraction & mapping', path: '/platform#engine' },
      { title: 'Partner Matching', desc: 'From risk to local execution', path: '/platform#matching' },
      { title: 'Global Coverage', desc: 'UK, EU, Germany & US', path: '/platform#coverage' },
      { title: 'For Partner Firms', desc: 'Lead generation for advisors', path: '/platform#partners' },
    ]
  },
  {
    id: 'solutions', label: 'Solutions',
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
    id: 'resources', label: 'Resources',
    items: [
      { title: 'Customer Stories', desc: 'See real compliance outcomes', path: '/resources#stories' },
      { title: 'Guides & Whitepapers', desc: 'In-depth market deep-dives', path: '/resources#guides' },
    ]
  }
];

// ─── Compliance Area Data ─────────────────────────────────────────────────────

const COMPLIANCE_AREAS = [
  {
    id: 'tax',
    icon: Receipt,
    title: 'Tax & VAT',
    risk: 'High',
    riskColor: 'bg-error-50 text-error-600 border-error-200',
    cardBorder: 'border-error-200',
    iconBg: 'bg-error-50',
    iconColor: 'text-error-500',
    headline: 'Cross-Border VAT, Delivery Thresholds & Digital Taxation',
    description: 'Managing cross-border VAT obligations, delivery thresholds, and digital taxation rules across international jurisdictions — including OSS and MTD frameworks.',
    affected: 'Cross-border e-commerce operators selling physical or digital products via marketplaces (Amazon) or independent shops (Shopify).',
    obligations: [
      'Monitoring international delivery thresholds',
      'Determining when local VAT registration becomes mandatory',
      'Navigating varying tax rules for physical vs. digital goods',
      'OSS registration & reporting',
    ],
    coverage: [
      'Dedicated Tax & VAT Wizard — captures sales model, legal seat, revenue, and target markets',
      'Calculates precise vat_likelihood per jurisdiction',
      'Orchestrates matching to specialized VAT consultants by case complexity',
    ],
    wizardPath: '/wizard/tax-vat',
    markets: ['🇬🇧 UK', '🇩🇪 DE', '🇪🇺 EU', '🇺🇸 US'],
  },
  {
    id: 'epr',
    icon: Recycle,
    title: 'EPR & Packaging',
    risk: 'High',
    riskColor: 'bg-warning-bg text-warning-text border-warning-text/30',
    cardBorder: 'border-warning-text/30',
    iconBg: 'bg-warning-bg',
    iconColor: 'text-warning-text',
    headline: 'Extended Producer Responsibility, VerpackG & Recycling Targets',
    description: 'Highly fragmented local environmental regulations, packaging laws (VerpackG), and recycling targets (PRN) that differ drastically by country.',
    affected: 'E-commerce merchants, manufacturers, resellers, and dropshippers selling physical goods with packaging across borders.',
    obligations: [
      'Understanding country-specific packaging & environmental laws',
      'Determining registration by product category (electronics, apparel, cosmetics)',
      'Adhering to local recycling targets to avoid fines',
      'Dropshipper responsibility assessment',
    ],
    coverage: [
      'Product & Packaging Wizard — assesses commercial role, target markets, product categories',
      'Calculates epr_required_likelihood per jurisdiction',
      'Intelligent edge-case handling: "Assume Yes" safety logic for uncertain dropshippers',
    ],
    wizardPath: '/wizard/epr',
    markets: ['🇬🇧 UK', '🇩🇪 DE', '🇫🇷 FR', '🇪🇺 EU'],
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    title: 'Data & Privacy',
    risk: 'Critical',
    riskColor: 'bg-error-100 text-error-700 border-error-300',
    cardBorder: 'border-error-300',
    iconBg: 'bg-error-100',
    iconColor: 'text-error-600',
    headline: 'GDPR, UK GDPR, Cookie Compliance & Data Transfers',
    description: 'Compliance with EU DSGVO (GDPR), UK GDPR, cookie consent management, and the strict regulations governing international data transfers.',
    affected: 'Software founders, SaaS expansion managers, and businesses collecting personal data or using tracking tools while expanding globally.',
    obligations: [
      'Implementing valid consent management',
      'Legally securing international data transfers (EU ↔ US)',
      'Managing tracking tool compliance (GA4, Meta, TikTok)',
      'Cookie banner & privacy policy requirements',
    ],
    coverage: [
      'Data & Privacy Wizard — analyzes target customers, processing locations, tracking stack',
      'Calculates privacy_risk_level based on actual tool exposure',
      'Platform itself uses a local PII Redaction Pipeline — zero raw data in AI layer',
    ],
    wizardPath: '/wizard/data-privacy',
    markets: ['🇪🇺 EU', '🇬🇧 UK', '🇺🇸 US', '🇨🇭 CH'],
  },
  {
    id: 'corporate',
    icon: Building2,
    title: 'Corporate Structure',
    risk: 'Medium',
    riskColor: 'bg-primary-50 text-primary-600 border-primary-200',
    cardBorder: 'border-primary-200',
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-600',
    headline: 'International Company Setup, Legal Form & Local Substance',
    description: 'Navigating international company setup, choosing the correct legal form, establishing local substance, and handling corporate registrations in new jurisdictions.',
    affected: 'Individuals or companies planning to register legal entities, expand teams, or establish corporate presence in foreign markets.',
    obligations: [
      'Selecting appropriate corporate structure per target country',
      'Fulfilling local registration & documentation requirements',
      'Establishing local substance and governance',
      'Team complexity assessment',
    ],
    coverage: [
      'Corporate & Structure Wizard — evaluates current status, desired markets, team complexity',
      'Determines entity_need_level per jurisdiction',
      'Intelligent routing to educational guide paths for uncertain founders',
    ],
    wizardPath: '/wizard/corporate',
    markets: ['🇬🇧 UK', '🇩🇪 DE', '🇪🇺 EU', '🇺🇸 US'],
  },
];

// ─── Reusable Section ─────────────────────────────────────────────────────────

function Section({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref} id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`scroll-mt-20 ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ─── Expandable Compliance Card ───────────────────────────────────────────────

function ComplianceCard({ area, index, defaultOpen = false }: { area: typeof COMPLIANCE_AREAS[0]; index: number; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const navigate = useNavigate();
  const Icon = area.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      className={`bg-white border-2 rounded-2xl overflow-hidden transition-shadow ${area.cardBorder} ${expanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-7 flex items-start gap-5"
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${area.iconBg}`}>
          <Icon size={26} className={area.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Typography variant="h3" weight="bold" className="text-neutral-900">
              {area.title}
            </Typography>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${area.riskColor}`}>
              {area.risk} Risk
            </span>
          </div>
          <Typography variant="body" className="text-neutral-600 leading-relaxed">
            {area.headline}
          </Typography>
        </div>
        <ChevronDown
          size={20}
          className={`text-neutral-400 shrink-0 mt-2 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-7 pt-0 border-t border-neutral-100">
              <div className="grid tablet:grid-cols-2 gap-6 mt-6">
                {/* Left: context */}
                <div>
                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    Who is affected
                  </Typography>
                  <Typography variant="body" className="text-neutral-600 mb-5 leading-relaxed">
                    {area.affected}
                  </Typography>

                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    Key Obligations
                  </Typography>
                  <ul className="space-y-2">
                    {area.obligations.map(o => (
                      <li key={o} className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-warning-text shrink-0 mt-0.5" />
                        <Typography variant="ui-small" className="text-neutral-700">{o}</Typography>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: what we cover */}
                <div>
                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    What CompliHub360 Covers
                  </Typography>
                  <ul className="space-y-2 mb-5">
                    {area.coverage.map(c => (
                      <li key={c} className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-success-500 shrink-0 mt-0.5" />
                        <Typography variant="ui-small" className="text-neutral-700">{c}</Typography>
                      </li>
                    ))}
                  </ul>

                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    Active Markets
                  </Typography>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {area.markets.map(m => (
                      <span key={m} className="text-sm bg-neutral-50 border border-neutral-200 px-3 py-1 rounded-lg">
                        {m}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate(area.wizardPath)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-md hover:bg-primary-600 transition-colors"
                  >
                    Start {area.title} Assessment
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function ComplianceNav() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setActiveMenu(null);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-surface/90 backdrop-blur-md" onMouseLeave={() => setActiveMenu(null)}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6 relative">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0 z-10" aria-label="Home">
          <div className="w-6 h-6 bg-primary-500 rounded-sm flex items-center justify-center"><CircleDot size={14} className="text-white" /></div>
          <span className="font-sans font-bold text-neutral-900 tracking-tight">CompliHub<span className="text-primary-500">360</span></span>
        </button>

        <nav className="hidden tablet:flex items-center h-full gap-2 absolute left-1/2 -translate-x-1/2">
          {HEADER_MENU.map((menu) => (
            <div key={menu.id} className="h-full flex items-center" onMouseEnter={() => menu.items.length > 0 ? setActiveMenu(menu.id) : setActiveMenu(null)}>
              <button onClick={() => menu.path ? navigate(menu.path) : undefined} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-ui-small font-semibold transition-colors ${activeMenu === menu.id ? 'text-primary-700 bg-primary-50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}`}>
                {menu.label}
                {menu.items.length > 0 && <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === menu.id ? 'rotate-180 text-primary-600' : 'text-neutral-400'}`} />}
              </button>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <button className="hidden tablet:inline-flex text-neutral-600 hover:text-neutral-900 text-ui-small font-semibold px-4 py-2 rounded-md hover:bg-neutral-100 transition-colors" onClick={() => navigate('/login')}>Log in</button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>Get Started Free</Button>
        </div>
      </div>

      <AnimatePresence>
        {activeMenu && (
          <motion.div initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -5, height: 0 }} transition={{ duration: 0.15, ease: 'easeInOut' }} className="absolute top-16 left-0 w-full bg-white border-b border-neutral-200 shadow-xl overflow-hidden pointer-events-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {HEADER_MENU.find(m => m.id === activeMenu)?.items.map((item) => (
                  <button key={item.title} onClick={() => { navigate(item.path); setActiveMenu(null); }} className="text-left group flex items-start gap-4 p-3 -m-3 rounded-xl hover:bg-neutral-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 border border-primary-100 group-hover:bg-white group-hover:border-primary-200 group-hover:shadow-sm transition-all">
                      <LayoutDashboard size={18} className="text-primary-600" />
                    </div>
                    <div className="mt-0.5">
                      <Typography variant="ui-small" weight="bold" className="text-neutral-900 flex items-center gap-1 mb-1 group-hover:text-primary-700 transition-colors">
                        {item.title}
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 w-0 group-hover:w-auto overflow-hidden group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-500" />
                      </Typography>
                      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">{item.desc}</Typography>
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

// ─── Anchor Bar ───────────────────────────────────────────────────────────────

function AnchorBar() {
  const [active, setActive] = useState('tax');
  const anchors = [
    { id: 'tax', label: 'Tax & VAT' },
    { id: 'epr', label: 'EPR & Packaging' },
    { id: 'privacy', label: 'Data & Privacy' },
    { id: 'corporate', label: 'Corporate Structure' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      for (const a of [...anchors].reverse()) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top < 140) { setActive(a.id); break; }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {anchors.map(a => (
            <button key={a.id} onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-4 py-2 rounded-md text-ui-small font-semibold whitespace-nowrap transition-colors ${active === a.id ? 'text-primary-700 bg-primary-50' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
            >{a.label}</button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─── Risk Comparison Grid ─────────────────────────────────────────────────────

function RiskComparisonGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const risks = [
    { title: 'Data & Privacy', level: 'Critical', pct: 95, color: 'bg-error-500', badge: 'bg-error-500/20 text-error-400' },
    { title: 'Tax & VAT', level: 'High', pct: 75, color: 'bg-warning-text', badge: 'bg-warning-bg text-warning-text' },
    { title: 'EPR & Packaging', level: 'High', pct: 70, color: 'bg-warning-text', badge: 'bg-warning-bg text-warning-text' },
    { title: 'Corporate Structure', level: 'Medium', pct: 40, color: 'bg-primary-400', badge: 'bg-primary-500/20 text-primary-300' },
  ];

  return (
    <div ref={ref} className="bg-white border border-neutral-200 rounded-2xl p-8 mt-8">
      <Typography variant="h3" weight="bold" className="text-neutral-900 mb-6">
        Risk at a Glance
      </Typography>
      <div className="space-y-5">
        {risks.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Typography variant="ui-small" weight="bold" className="text-neutral-700">
                {r.title}
              </Typography>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${r.badge}`}>
                {r.level}
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: `${r.pct}%` } : {}}
                transition={{ duration: 0.7, delay: i * 0.12 + 0.2, ease: 'easeOut' }}
                className={`h-full rounded-full ${r.color}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function ComplianceAreasPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <ComplianceNav />

      {/* Hero */}
      <section className="py-16 desktop-s:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              Compliance Areas
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              Find Your Regulatory<br className="hidden tablet:block" /> Challenge. Start Here.
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
              Each compliance area is a gateway to your specific assessment. Identify your topic, understand the risks, and get matched with a verified specialist — all in under 5 minutes.
            </Typography>
          </div>

          {/* Expandable Cards */}
          <div className="space-y-4">
            {COMPLIANCE_AREAS.map((area, i) => (
              <div key={area.id} id={area.id} className="scroll-mt-28">
                <ComplianceCard area={area} index={i} defaultOpen={i === 0} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 desktop-s:py-24 bg-primary-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Typography variant="display" weight="bold" className="text-white mb-5">
            Not sure which area applies?
          </Typography>
          <Typography variant="body" className="text-primary-300 mb-10 text-lg">
            Our Wizard asks the right questions and routes you to the correct assessment automatically.
          </Typography>
          <button
            onClick={() => navigate('/wizard')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
          >
            Start General Assessment
          </button>
        </div>
      </section>

      <footer className="bg-neutral-900 py-10 text-center">
        <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
          © {new Date().getFullYear()} CompliHub360. Built in Berlin.
        </Typography>
      </footer>
    </div>
  );
}
