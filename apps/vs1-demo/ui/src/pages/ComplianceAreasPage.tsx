import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
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
import { Typography } from '../components/ui/Typography';


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

type AreaKey = 'tax' | 'epr' | 'privacy' | 'corporate';

interface AreaConfig {
  id: AreaKey;
  icon: React.ElementType;
  risk: string;
  riskColor: string;
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  wizardPath: string;
  markets: string[];
}

function ComplianceCard({ area, index, defaultOpen = false }: { area: AreaConfig; index: number; defaultOpen?: boolean }) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(defaultOpen);
  const navigate = useNavigate();
  const Icon = area.icon;

  const title = t(`compliance.${area.id}.title`, area.id);
  const risk = t(`compliance.${area.id}.risk`, area.risk);
  const headline = t(`compliance.${area.id}.headline`, '');
  const description = t(`compliance.${area.id}.description`, '');
  const affected = t(`compliance.${area.id}.affected`, '');
  const obligations = [
    t(`compliance.${area.id}.ob1`, ''),
    t(`compliance.${area.id}.ob2`, ''),
    t(`compliance.${area.id}.ob3`, ''),
    t(`compliance.${area.id}.ob4`, ''),
  ].filter(Boolean);
  const coverage = [
    t(`compliance.${area.id}.cov1`, ''),
    t(`compliance.${area.id}.cov2`, ''),
    t(`compliance.${area.id}.cov3`, ''),
  ].filter(Boolean);

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
              {title}
            </Typography>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${area.riskColor}`}>
              {risk} {t('compliance.riskLabel', 'Risk')}
            </span>
          </div>
          <Typography variant="body" className="text-neutral-600 leading-relaxed">
            {headline}
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
                    {t('compliance.whoAffected', 'Who is affected')}
                  </Typography>
                  <Typography variant="body" className="text-neutral-600 mb-5 leading-relaxed">
                    {affected}
                  </Typography>

                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    {t('compliance.keyObligations', 'Key Obligations')}
                  </Typography>
                  <ul className="space-y-2">
                    {obligations.map(o => (
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
                    {t('compliance.whatWeCover', 'What CompliHub360 Covers')}
                  </Typography>
                  <ul className="space-y-2 mb-5">
                    {coverage.map(c => (
                      <li key={c} className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-success-500 shrink-0 mt-0.5" />
                        <Typography variant="ui-small" className="text-neutral-700">{c}</Typography>
                      </li>
                    ))}
                  </ul>

                  <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                    {t('compliance.activeMarkets', 'Active Markets')}
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
                    {t('compliance.startAssessment', 'Start {{title}} Assessment', { title })}
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


// ─── Anchor Bar ───────────────────────────────────────────────────────────────

function AnchorBar() {
  const { t } = useTranslation('common');
  const [active, setActive] = useState('tax');
  const anchors = [
    { id: 'tax', label: t('compliance.anchorTax', 'Tax & VAT') },
    { id: 'epr', label: t('compliance.anchorEpr', 'EPR & Packaging') },
    { id: 'privacy', label: t('compliance.anchorPrivacy', 'Data & Privacy') },
    { id: 'corporate', label: t('compliance.anchorCorporate', 'Corporate Structure') },
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
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const risks = [
    { title: t('compliance.privacy.title', 'Data & Privacy'), level: t('compliance.privacy.risk', 'Critical'), pct: 95, color: 'bg-error-500', badge: 'bg-error-500/20 text-error-400' },
    { title: t('compliance.tax.title', 'Tax & VAT'), level: t('compliance.tax.risk', 'High'), pct: 75, color: 'bg-warning-text', badge: 'bg-warning-bg text-warning-text' },
    { title: t('compliance.epr.title', 'EPR & Packaging'), level: t('compliance.epr.risk', 'High'), pct: 70, color: 'bg-warning-text', badge: 'bg-warning-bg text-warning-text' },
    { title: t('compliance.corporate.title', 'Corporate Structure'), level: t('compliance.corporate.risk', 'Medium'), pct: 40, color: 'bg-primary-400', badge: 'bg-primary-500/20 text-primary-300' },
  ];

  return (
    <div ref={ref} className="bg-white border border-neutral-200 rounded-2xl p-8 mt-8">
      <Typography variant="h3" weight="bold" className="text-neutral-900 mb-6">
        {t('compliance.riskAtGlance', 'Risk at a Glance')}
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
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();

  const COMPLIANCE_AREAS: AreaConfig[] = [
    {
      id: 'tax',
      icon: Receipt,
      risk: 'High',
      riskColor: 'bg-error-50 text-error-600 border-error-200',
      cardBorder: 'border-error-200',
      iconBg: 'bg-error-50',
      iconColor: 'text-error-500',
      wizardPath: '/wizard/tax-vat',
      markets: ['🇬🇧 UK', '🇩🇪 DE', '🇪🇺 EU', '🇺🇸 US'],
    },
    {
      id: 'epr',
      icon: Recycle,
      risk: 'High',
      riskColor: 'bg-warning-bg text-warning-text border-warning-text/30',
      cardBorder: 'border-warning-text/30',
      iconBg: 'bg-warning-bg',
      iconColor: 'text-warning-text',
      wizardPath: '/wizard/epr',
      markets: ['🇬🇧 UK', '🇩🇪 DE', '🇫🇷 FR', '🇪🇺 EU'],
    },
    {
      id: 'privacy',
      icon: ShieldCheck,
      risk: 'Critical',
      riskColor: 'bg-error-100 text-error-700 border-error-300',
      cardBorder: 'border-error-300',
      iconBg: 'bg-error-100',
      iconColor: 'text-error-600',
      wizardPath: '/wizard/data-privacy',
      markets: ['🇪🇺 EU', '🇬🇧 UK', '🇺🇸 US', '🇨🇭 CH'],
    },
    {
      id: 'corporate',
      icon: Building2,
      risk: 'Medium',
      riskColor: 'bg-primary-50 text-primary-600 border-primary-200',
      cardBorder: 'border-primary-200',
      iconBg: 'bg-primary-50',
      iconColor: 'text-primary-600',
      wizardPath: '/wizard/corporate',
      markets: ['🇬🇧 UK', '🇩🇪 DE', '🇪🇺 EU', '🇺🇸 US'],
    },
  ];

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
      <AnchorBar />

      {/* Hero */}
      <section className="py-16 desktop-s:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              {t('compliance.heroOverline', 'Compliance Areas')}
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              {t('compliance.heroTitle', 'Find Your Regulatory Challenge. Start Here.')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
              {t('compliance.heroBody', 'Each compliance area is a gateway to your specific assessment. Identify your topic, understand the risks, and get matched with a verified specialist — all in under 5 minutes.')}
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
            {t('compliance.cta.title', 'Not sure which area applies?')}
          </Typography>
          <Typography variant="body" className="text-primary-300 mb-10 text-lg">
            {t('compliance.cta.body', 'Our Wizard asks the right questions and routes you to the correct assessment automatically.')}
          </Typography>
          <button
            onClick={() => navigate('/wizard')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
          >
            {t('compliance.cta.btn', 'Start General Assessment')}
          </button>
        </div>
      </section>

      <footer className="bg-neutral-900 py-10 text-center">
        <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
          {t('compliance.footer.copyright', '© {{year}} CompliHub360. Built in Berlin.', { year: new Date().getFullYear() })}
        </Typography>
      </footer>
    </div>
  );
}
