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
import { SiteFooter } from '../components/home';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';

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
  { id: 'marketing', defaultLabel: 'Marketing Compliance', key: 'compliance.anchorMarketing' },
  { id: 'corporate', defaultLabel: 'Corporate Structure', key: 'compliance.anchorCorporate' },
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
    <div className="sticky top-16 z-40 bg-surface/85 backdrop-blur-md border-b border-stroke-subtle">
      <Container gutter="flat">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {ANCHORS.map(a => (
            <button
              key={a.id}
              onClick={() => document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-4 py-2 rounded-md text-ui-small font-semibold whitespace-nowrap transition-colors ${
                active === a.id
                  ? 'text-fg-brand bg-brand-light'
                  : 'text-fg-tertiary hover:text-fg hover:bg-surface-secondary'
              }`}
            >
              {t(a.key, a.defaultLabel)}
            </button>
          ))}
        </nav>
      </Container>
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

  // Without this the tab keeps the previous page's title — visible because this
  // page sits in the main navigation.


  // TODO: replace with verified counts from provider DB
  const COMPLIANCE_AREAS: AreaConfig[] = [
    {
      id: 'tax',
      icon: Receipt,
      risk: 'High',
      riskColor: 'bg-risk-high-bg text-risk-on-high border-risk-high/30',
      cardBorder: 'border-risk-high/30',
      iconBg: 'bg-risk-high-bg',
      iconColor: 'text-risk-on-high',
      wizardPath: '/wizard/tax-vat',
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 12,
      riskBarPct: 75,
      riskBarColor: 'bg-risk-high',
      riskBarBadge: 'bg-risk-high-bg text-risk-on-high',
      personaFitKey: 'Best for: Cross-border e-commerce',
    },
    {
      id: 'epr',
      icon: Recycle,
      risk: 'High',
      riskColor: 'bg-risk-high-bg text-risk-on-high border-risk-high/30',
      cardBorder: 'border-risk-high/30',
      iconBg: 'bg-risk-high-bg',
      iconColor: 'text-risk-on-high',
      wizardPath: '/wizard/epr',
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'FR', label: '🇫🇷 FR' },
        { code: 'EU', label: '🇪🇺 EU' },
      ],
      specialistsCount: 8,
      riskBarPct: 70,
      riskBarColor: 'bg-risk-high',
      riskBarBadge: 'bg-risk-high-bg text-risk-on-high',
      personaFitKey: 'Best for: Manufacturers & resellers',
    },
    {
      id: 'privacy',
      icon: ShieldCheck,
      risk: 'Critical',
      riskColor: 'bg-risk-critical-bg text-risk-on-critical border-risk-critical/30',
      cardBorder: 'border-risk-critical/30',
      iconBg: 'bg-risk-critical-bg',
      iconColor: 'text-risk-on-critical',
      wizardPath: '/wizard/data-privacy',
      markets: [
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'US', label: '🇺🇸 US' },
        { code: 'CH', label: '🇨🇭 CH' },
      ],
      specialistsCount: 14,
      riskBarPct: 95,
      riskBarColor: 'bg-risk-critical',
      riskBarBadge: 'bg-risk-critical-bg text-risk-on-critical',
      personaFitKey: 'Best for: SaaS & data-driven brands',
    },
    {
      id: 'marketing',
      icon: Megaphone,
      risk: 'Medium',
      riskColor: 'bg-risk-medium-bg text-risk-on-medium border-risk-medium/30',
      cardBorder: 'border-risk-medium/30',
      iconBg: 'bg-risk-medium-bg',
      iconColor: 'text-risk-on-medium',
      wizardPath: '/wizard/marketing-seo',
      markets: [
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 5,
      riskBarPct: 55,
      riskBarColor: 'bg-risk-medium',
      riskBarBadge: 'bg-risk-medium-bg text-risk-on-medium',
      personaFitKey: 'Best for: Agencies & DTC brands',
    },
    {
      id: 'corporate',
      icon: Building2,
      risk: 'Medium',
      riskColor: 'bg-risk-medium-bg text-risk-on-medium border-risk-medium/30',
      cardBorder: 'border-risk-medium/30',
      iconBg: 'bg-risk-medium-bg',
      iconColor: 'text-risk-on-medium',
      wizardPath: '/wizard/corporate',
      markets: [
        { code: 'UK', label: '🇬🇧 UK' },
        { code: 'DE', label: '🇩🇪 DE' },
        { code: 'EU', label: '🇪🇺 EU' },
        { code: 'US', label: '🇺🇸 US' },
      ],
      specialistsCount: 6,
      riskBarPct: 40,
      riskBarColor: 'bg-risk-medium',
      riskBarBadge: 'bg-risk-medium-bg text-risk-on-medium',
      personaFitKey: 'Best for: International expansion teams',
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
        <Container gutter="flat">
          <div className="grid desktop-s:grid-cols-12 gap-10 items-end mb-12">
            <div className="desktop-s:col-span-8">
              <Typography
                variant="caption"
                className="text-fg-brand mb-3 block font-semibold uppercase tracking-wider"
              >
                {t('compliance.heroOverline', 'Compliance Areas')}
              </Typography>
              <Typography
                variant="display"
                weight="bold"
                className="text-fg mb-5 leading-tight"
              >
                {t('compliance.heroTitle', 'Find Your Regulatory Challenge. Start Here.')}
              </Typography>
              <Typography
                variant="body"
                className="text-fg-secondary text-lg leading-relaxed max-w-2xl"
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
        </Container>
      </Section>

      {/* ── JTBD Outcomes ─────────────────────────────────────────────── */}
      <Section className="pb-12">
        <Container gutter="flat">
          <JTBDOutcomeGrid onScrollToFirstArea={scrollToFirstArea} />
        </Container>
      </Section>

      {/* ── Compliance Cards (6) ──────────────────────────────────────── */}
      <Section className="pb-12">
        <Container gutter="flat">
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
        </Container>
      </Section>

      {/* ── Risk-at-a-Glance + Comparison Matrix ──────────────────────── */}
      <Section className="pb-12">
        <Container gutter="flat">
          <RiskComparisonGrid areas={COMPLIANCE_AREAS} selectedCountry={selectedCountry} />
          <ComparisonMatrix />
        </Container>
      </Section>

      {/* ── How Orchestration Works ───────────────────────────────────── */}
      <Section className="pb-12">
        <Container gutter="flat">
          <HowOrchestrationWorks />
        </Container>
      </Section>

      {/* ── Resource Teaser ───────────────────────────────────────────── */}
      <Section className="pb-16">
        <Container gutter="flat">
          <ResourceTeaser />
        </Container>
      </Section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 desktop-s:py-24 bg-primary-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Typography variant="display" as="h2" weight="bold" className="text-white mb-5">
            {t('compliance.cta.title', 'Not sure which area applies?')}
          </Typography>
          <Typography variant="body" className="text-primary-100 mb-10 text-lg">
            {t(
              'compliance.cta.body',
              'Our Wizard asks the right questions and routes you to the correct assessment automatically.',
            )}
          </Typography>
          <div className="flex flex-col tablet:flex-row items-center justify-center gap-3">
            <Button
              variant="inverse"
              size="xl"
              shape="soft"
              onClick={() => navigate(`${localePrefix}/wizard`)}
              className="hover:bg-surface-tertiary transition-colors font-bold"
            >
              {t('compliance.cta.btn', 'Start General Assessment')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
