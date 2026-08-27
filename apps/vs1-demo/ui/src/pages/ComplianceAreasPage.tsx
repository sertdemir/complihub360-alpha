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
  KPIStrip,
  ResourceTeaser,
  RiskComparisonGrid,
  useCountrySelection,
} from '../components/compliance-areas';
import { SiteFooter } from '../components/home';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { SectionEyebrow, GoldWord, Reveal } from '../components/providers/SectionHeading';

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

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO on the full-bleed Gradient ──────────────────────────── */}
      {/* (canvas "Compliance-Hub · Hero" · Variante B "Schwebende KPI-Karte",
          2026-08-26): the Gradient carries copy left — serif headline with the
          gold closing line, the homepage hero's language — and the market
          picker as a white card right. The header is fixed and 81px tall at
          lg; pt-32/pt-40 clears it, as on /how-it-works. */}
      <section className="bg-gradient-stage pb-24 pt-32 lg:pb-28 lg:pt-40">
        <Container gutter="flat" className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-[60px]">
          <Reveal className="min-w-0 max-w-[680px]">
            <SectionEyebrow tone="brand">{t('compliance.heroOverline', 'Compliance Areas')}</SectionEyebrow>
            <h1 className="mt-3.5 font-serif text-[2.25rem] font-semibold leading-[1.14] tracking-tight text-fg lg:text-[3rem]">
              {t('compliance.heroTitlePre', 'Find Your Regulatory Challenge.')}
              <br />
              <GoldWord>{t('compliance.heroTitleGold', 'Start Here.')}</GoldWord>
            </h1>
            <p className="mt-5 max-w-[56ch] text-body-lg leading-relaxed text-fg-secondary">
              {t(
                'compliance.heroBody',
                'Each compliance area is a gateway to your specific assessment. Identify your topic, understand the risks, and get matched with a verified specialist — all in under 5 minutes.',
              )}
            </p>
          </Reveal>

          <Reveal
            delay={0.15}
            className="w-full shrink-0 rounded-xl bg-surface p-6 shadow-[0_32px_70px_-30px_rgba(2,22,17,0.38)] dark:bg-surface-secondary lg:w-[300px]"
          >
            <CountrySelector value={selectedCountry} onChange={setSelectedCountry} />
          </Reveal>
        </Container>
      </section>

      {/* Floating KPI card — ONE white card pulled up over the Gradient's
          bottom edge, clamping hero and content together. */}
      <Container gutter="flat" className="relative z-10 -mt-14">
        <Reveal delay={0.1}>
          <KPIStrip />
        </Reveal>
      </Container>

      {/* ── The eight areas ───────────────────────────────────────────── */}
      {/* Directly after the KPI card since 2026-08-26: the JTBD outcome grid
          that used to sit between them was cut without replacement — two of
          its five cards duplicated the page CTA (wizard), one scrolled to
          this very grid, one duplicated the resource teaser and one led
          logged-out visitors to the dashboard login wall. */}
      <Section id="areas" className="pb-12 pt-14 desktop-s:pt-16">
        <Container gutter="flat">
          {/* Two columns since 2026-08-27 (canvas "Die acht Bereiche" ·
              Variante B, on white): four across squeezed the long German
              titles against the icon tiles. Twice the card width gives the
              serif title, badge and headline one calm line each. */}
          <SectionEyebrow tone="brand">{t('compliance.areasEyebrow', 'Eight areas, one way in')}</SectionEyebrow>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
            {t('compliance.areasTitle', 'The eight compliance areas')}
          </h2>
          <p className="mt-3.5 max-w-2xl text-body leading-relaxed text-fg-secondary">
            {t('compliance.areasLead', {
              defaultValue:
                'Each opens a page with the duties it carries, the statute behind each one, and what it costs to get wrong.',
            })}
          </p>
          <div className="mt-9 grid gap-4 tablet:grid-cols-2">
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
