import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import {
  Receipt,
  Recycle,
  ShieldCheck,
  Megaphone,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Typography } from '../components/ui/Typography';
import {
  ComplianceCard,
  ComparisonMatrix,
  CountrySelector,
  HowOrchestrationWorks,
  JTBDOutcomeGrid,
  KPIStrip,
  ResourceTeaser,
  RiskComparisonGrid,
  useCountrySelection,
} from '../components/compliance-areas';
import type { AreaConfig } from '../components/compliance-areas/types';

// ─── Section wrapper with scroll animation ───────────────────────────────────

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`scroll-mt-28 ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ─── Anchor Bar ───────────────────────────────────────────────────────────────

const ANCHORS: { id: string; defaultLabel: string; key: string }[] = [
  { id: 'tax', defaultLabel: 'Tax & VAT', key: 'compliance.anchorTax' },
  { id: 'epr', defaultLabel: 'EPR & Packaging', key: 'compliance.anchorEpr' },
  { id: 'privacy', defaultLabel: 'Data & Privacy', key: 'compliance.anchorPrivacy' },
  { id: 'marketing', defaultLabel: 'Marketing & SEO', key: 'compliance.anchorMarketing' },
  { id: 'corporate', defaultLabel: 'Corporate Structure', key: 'compliance.anchorCorporate' },
  { id: 'fullsupport', defaultLabel: 'Full Support', key: 'compliance.anchorFullsupport' },
];

function AnchorBar() {
  const { t } = useTranslation('common');
  const [active, setActive] = useState('tax');

  useEffect(() => {
    const handleScroll = () => {
      for (const a of [...ANCHORS].reverse()) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top < 140) {
          setActive(a.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="sticky top-16 z-40 bg-white/85 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {ANCHORS.map(a => (
            <button
              key={a.id}
              onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-4 py-2 rounded-md text-ui-small font-semibold whitespace-nowrap transition-colors ${
                active === a.id
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {t(a.key, a.defaultLabel)}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function ComplianceAreasPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const [selectedCountry, setSelectedCountry] = useCountrySelection();

  // TODO: replace with verified counts from provider DB
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
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 12,
      riskBarPct: 75,
      riskBarColor: 'bg-warning-text',
      riskBarBadge: 'bg-warning-bg text-warning-text',
      personaFitKey: 'Best for: Cross-border e-commerce',
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
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'FR', label: '🇫🇷 FR' },
        { code: 'EU', label: '🇪🇺 EU' },
      ],
      specialistsCount: 8,
      riskBarPct: 70,
      riskBarColor: 'bg-warning-text',
      riskBarBadge: 'bg-warning-bg text-warning-text',
      personaFitKey: 'Best for: Manufacturers & resellers',
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
      markets: [
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'US', label: '🇺🇸 US' },
        { code: 'CH', label: '🇨🇭 CH' },
      ],
      specialistsCount: 14,
      riskBarPct: 95,
      riskBarColor: 'bg-error-500',
      riskBarBadge: 'bg-error-100 text-error-700',
      personaFitKey: 'Best for: SaaS & data-driven brands',
    },
    {
      id: 'marketing',
      icon: Megaphone,
      risk: 'Medium',
      riskColor: 'bg-warning-bg text-warning-text border-warning-text/30',
      cardBorder: 'border-warning-text/30',
      iconBg: 'bg-warning-bg',
      iconColor: 'text-warning-text',
      wizardPath: '/wizard/marketing-seo',
      markets: [
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 5,
      riskBarPct: 55,
      riskBarColor: 'bg-warning-text/80',
      riskBarBadge: 'bg-warning-bg text-warning-text',
      personaFitKey: 'Best for: Agencies & DTC brands',
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
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 6,
      riskBarPct: 40,
      riskBarColor: 'bg-primary-400',
      riskBarBadge: 'bg-primary-50 text-primary-700',
      personaFitKey: 'Best for: International expansion teams',
    },
    {
      id: 'fullsupport',
      icon: Layers,
      risk: 'Bundled',
      riskColor: 'bg-accent-100 text-accent-700 border-accent-200',
      cardBorder: 'border-accent-200',
      iconBg: 'bg-accent-100/60',
      iconColor: 'text-accent-700',
      wizardPath: '/wizard/full-support',
      markets: [
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'US', label: '🇺🇸 US' },
        { code: 'CH', label: '🇨🇭 CH' },
      ],
      specialistsCount: 4,
      riskBarPct: 60,
      riskBarColor: 'bg-accent-500',
      riskBarBadge: 'bg-accent-100 text-accent-700',
      personaFitKey: 'Best for: Cross-domain compliance',
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

  const scrollToFirstArea = () => {
    document.getElementById('tax')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <AnchorBar />

      {/* ── HERO + KPI + Country ─────────────────────────────────────── */}
      <Section className="py-14 desktop-s:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid desktop-s:grid-cols-12 gap-10 items-end mb-12">
            <div className="desktop-s:col-span-8">
              <Typography
                variant="caption"
                className="text-primary-500 mb-3 block font-semibold uppercase tracking-wider"
              >
                {t('compliance.heroOverline', 'Compliance Areas')}
              </Typography>
              <Typography
                variant="display"
                weight="bold"
                className="text-neutral-900 mb-5 leading-tight"
              >
                {t('compliance.heroTitle', 'Find Your Regulatory Challenge. Start Here.')}
              </Typography>
              <Typography
                variant="body"
                className="text-neutral-600 text-lg leading-relaxed max-w-2xl"
              >
                {t(
                  'compliance.heroBody',
                  'Each compliance area is a gateway to your specific assessment. Identify your topic, understand the risks, and get matched with a verified specialist — all in under 5 minutes.',
                )}
              </Typography>
            </div>

            <div className="desktop-s:col-span-4 desktop-s:justify-self-end">
              <CountrySelector value={selectedCountry} onChange={setSelectedCountry} />
            </div>
          </div>

          <KPIStrip />
        </div>
      </Section>

      {/* ── JTBD Outcomes ─────────────────────────────────────────────── */}
      <Section className="pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <JTBDOutcomeGrid onScrollToFirstArea={scrollToFirstArea} />
        </div>
      </Section>

      {/* ── Compliance Cards (6) ──────────────────────────────────────── */}
      <Section className="pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-4">
            {COMPLIANCE_AREAS.map((area, i) => (
              <div key={area.id} id={area.id} className="scroll-mt-28">
                <ComplianceCard
                  area={area}
                  index={i}
                  defaultOpen={i === 0}
                  selectedCountry={selectedCountry}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Risk-at-a-Glance + Comparison Matrix ──────────────────────── */}
      <Section className="pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <RiskComparisonGrid areas={COMPLIANCE_AREAS} selectedCountry={selectedCountry} />
          <ComparisonMatrix />
        </div>
      </Section>

      {/* ── How Orchestration Works ───────────────────────────────────── */}
      <Section className="pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <HowOrchestrationWorks />
        </div>
      </Section>

      {/* ── Resource Teaser ───────────────────────────────────────────── */}
      <Section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <ResourceTeaser />
        </div>
      </Section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 desktop-s:py-24 bg-primary-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Typography variant="display" weight="bold" className="text-white mb-5">
            {t('compliance.cta.title', 'Not sure which area applies?')}
          </Typography>
          <Typography variant="body" className="text-primary-100 mb-10 text-lg">
            {t(
              'compliance.cta.body',
              'Our Wizard asks the right questions and routes you to the correct assessment automatically.',
            )}
          </Typography>
          <div className="flex flex-col tablet:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`${localePrefix}/wizard`)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
            >
              {t('compliance.cta.btn', 'Start General Assessment')}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate(`${localePrefix}/wizard/full-support`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-white/40 text-white font-bold text-base hover:bg-white/10 transition-colors"
            >
              {t('compliance.cta.fullSupportBtn', 'Or talk to Full Support')}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-900 py-10 text-center">
        <Typography
          variant="caption"
          className="text-neutral-400 block normal-case tracking-normal"
        >
          {t('compliance.footer.copyright', '© {{year}} CompliHub360. Built in Berlin.', {
            year: new Date().getFullYear(),
          })}
        </Typography>
      </footer>
    </div>
  );
}
