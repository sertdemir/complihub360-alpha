import { useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Typography } from '../components/ui/Typography';
import {
  AreaCard,
  AREAS,
  ComparisonMatrix,
  CountrySelector,
  HowOrchestrationWorks,
  JTBDOutcomeGrid,
  KPIStrip,
  ResourceTeaser,
  RiskComparisonGrid,
  useCountrySelection,
} from '../components/compliance-areas';
import { SiteFooter } from '../components/home';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';

// ─── /compliance · the hub ───────────────────────────────────────────────────
// Until 2026-08-21 this page was the whole story: five areas, each one an
// accordion holding its full detail. Two things were wrong with that. The
// detail could not be linked, shared or indexed — and the product has carried
// eight canonical domains since 2026-08-04, so three of them appeared nowhere
// on the marketing surface at all.
//
// Both are fixed by making this a hub. It shows all eight, ranked for the
// selected market by the engine rather than by a hand-kept percentage, and each
// card is a doorway to /compliance/<slug> where the detail now lives. No
// content sits in two places: what left the accordions did not get copied.
//
// The sticky anchor bar left with them. It listed five short ids, it scrolled
// sideways out of reach under German labels, and every target it named is now
// its own page. Area pages carry a lateral switcher instead.

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

export function ComplianceAreasPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useParams();

  const localePrefix = locale ? `/${locale}` : '';
  const [selectedCountry, setSelectedCountry] = useCountrySelection();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  // The JTBD grid's "Find Specialist" card used to call this to scroll to the
  // first accordion, which meant a link from /compliance to /compliance. It
  // points at the area grid now — a destination, not a self-reference.
  const scrollToAreas = () => {
    document.getElementById('areas')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
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
              <Typography variant="display" weight="bold" className="text-fg mb-5 leading-tight">
                {t('compliance.heroTitle', 'Find Your Regulatory Challenge. Start Here.')}
              </Typography>
              <Typography variant="body" className="text-fg-secondary text-lg leading-relaxed max-w-2xl">
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
          <JTBDOutcomeGrid onScrollToFirstArea={scrollToAreas} />
        </Container>
      </Section>

      {/* ── The eight areas ───────────────────────────────────────────── */}
      <Section id="areas" className="pb-12">
        <Container gutter="flat">
          <Typography variant="h2" as="h2" weight="bold" className="text-fg mb-2">
            {t('compliance.areasTitle', 'The eight compliance areas')}
          </Typography>
          <Typography variant="body" className="text-fg-secondary mb-8 max-w-2xl">
            {t('compliance.areasLead', {
              defaultValue:
                'Each opens a page with the duties it carries, the statute behind each one, and what it costs to get wrong.',
            })}
          </Typography>
          <div className="grid gap-5 tablet:grid-cols-2 desktop-s:grid-cols-4">
            {AREAS.map((area, i) => (
              <AreaCard key={area.slug} area={area} index={i} selectedCountry={selectedCountry} />
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Risk-at-a-Glance + Comparison Matrix ──────────────────────── */}
      <Section className="pb-12">
        <Container gutter="flat">
          <RiskComparisonGrid selectedCountry={selectedCountry} />
          <ComparisonMatrix selectedCountry={selectedCountry} />
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
