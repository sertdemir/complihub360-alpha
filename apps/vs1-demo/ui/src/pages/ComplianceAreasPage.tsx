import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  AreaCard,
  AREAS,
  CountrySelector,
  HowOrchestrationWorks,
  KPIStrip,
  RiskShowcase,
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

  // The whole page answers to the market, so the picker must stay reachable
  // after the hero card scrolls away (user ask 2026-08-27): once it leaves the
  // viewport, a slim bar docks under the fixed header carrying the compact
  // picker — the AreaSwitcher's mechanics, measured, not guessed.
  const heroPickerRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  const [headerH, setHeaderH] = useState(64);

  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => setHeaderH(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = heroPickerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting), {
      rootMargin: '-90px 0px 0px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      {/* Docked market picker — slides in under the fixed header once the
          hero's picker card has scrolled away. */}
      <AnimatePresence>
        {docked && (
          <motion.div
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ top: headerH }}
            className="fixed inset-x-0 z-40 border-b border-stroke-subtle bg-surface/85 backdrop-blur-md"
          >
            <Container gutter="flat" className="flex items-center justify-end gap-3 py-2">
              <span className="hidden text-body-3xs font-semibold uppercase tracking-wider text-fg-tertiary sm:block">
                {t('compliance.country.label', 'Your primary market')}
              </span>
              <CountrySelector value={selectedCountry} onChange={setSelectedCountry} size="sm" />
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO on the full-bleed Gradient ──────────────────────────── */}
      {/* (canvas "Compliance-Hub · Hero" · Variante B "Schwebende KPI-Karte",
          2026-08-26): the Gradient carries copy left — serif headline with the
          gold closing line, the homepage hero's language — and the market
          picker as a white card right. The header is fixed and 81px tall at
          lg; pt-32/pt-40 clears it, as on /how-it-works. */}
      {/* lg:min-h pins the shared marketing-hero height (user ask 2026-08-28):
          613px is THIS hero's natural desktop height, so the floor changes
          nothing here — it makes this the reference the other pages match. */}
      <section className="flex flex-col justify-center bg-gradient-stage pb-24 pt-32 lg:min-h-[38.3125rem] lg:pb-28 lg:pt-40">
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

          {/* The plain wrapper carries the dock-observer ref — Reveal's own
              motion div does not forward one. */}
          <div ref={heroPickerRef} className="w-full shrink-0 lg:w-[300px]">
            <Reveal
              delay={0.15}
              className="rounded-xl bg-surface p-6 shadow-[0_32px_70px_-30px_rgba(2,22,17,0.38)] dark:bg-surface-secondary"
            >
              <CountrySelector value={selectedCountry} onChange={setSelectedCountry} />
            </Reveal>
          </div>
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

      {/* ── Risk showcase: ranking + side-by-side in ONE Gradient panel ── */}
      {/* (canvas "Risiko und Vergleich" · Variante B, 2026-08-27) — replaces
          the two stacked white panels. */}
      <Section className="py-10 desktop-s:py-12">
        <Container gutter="flat">
          <RiskShowcase selectedCountry={selectedCountry} />
        </Container>
      </Section>

      {/* ── How Orchestration Works ───────────────────────────────────── */}
      {/* The area pages' closing component in the hub's light dress (canvas
          "Orchestrierung im Hub" · Variante B "Ohne Gradient", 2026-08-27) —
          with the CTA row the hub never had: generic wizard entry, since no
          single area is chosen yet. */}
      <Section className="py-10 desktop-s:py-12">
        <Container gutter="flat">
          <HowOrchestrationWorks
            cta={
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                <div className="max-w-[560px]">
                  <h3 className="font-serif text-[1.375rem] font-bold leading-snug text-fg">
                    {t('compliance.howItWorks.hubCta.title', 'Ready to see what applies to you?')}
                  </h3>
                  <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
                    {t(
                      'compliance.howItWorks.hubCta.lead',
                      'The assessment narrows the eight areas down to your business, your markets and your product — in under five minutes.',
                    )}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="primary"
                  className="shrink-0"
                  onClick={() => navigate(`${localePrefix}/wizard`)}
                >
                  {t('compliance.howItWorks.hubCta.btn', 'Start an assessment')}
                  <ArrowRight size={17} className="ml-1.5" />
                </Button>
              </div>
            }
          />
        </Container>
      </Section>

      {/* ── Resource Teaser · PAUSED, not deleted ─────────────────────── */}
      {/* TODO(resources-live): the resources page carries no content yet, so
          the teaser is out of the flow for now (user decision 2026-08-27).
          Once the resources page is filled: render <ResourceTeaser /> here
          again AND cross-link the resources page from the other surfaces
          where it makes sense (the component stays exported for exactly
          that moment — do not delete it). */}

      {/* No page-own closing CTA anymore (user decision 2026-08-27): the dark
          petrol band duplicated the orchestration section's wizard CTA right
          above it. The site-wide closer — the monthly-briefing NewsletterBand
          — is anchored inside SiteFooter and ends this page like every other. */}
      <SiteFooter />
    </div>
  );
}
