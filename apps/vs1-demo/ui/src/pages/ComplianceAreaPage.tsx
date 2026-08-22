import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Users, Sparkles } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Typography } from '../components/ui/Typography';
import { RiskBadge } from '../components/ui/RiskBadge';
import { SiteFooter } from '../components/home';
import { SectionEyebrow } from '../components/providers/SectionHeading';
import { DOMAIN_BY_SLUG } from '../lib/domains';
import { getAreaProfile, isAreaSlug } from '../lib/areaProfiles';
import {
  AreaEnforcement,
  AreaMetrics,
  AreaRiskCard,
  AreaMarketHeatmap,
  AreaSwitcher,
  AreaTimeline,
  HowOrchestrationWorks,
  ObligationsExplorer,
  RelatedAreas,
  SEVERITY_FALLBACK,
  SEVERITY_STYLE,
  severityKey,
  useCountrySelection,
  AREA_BY_SLUG,
  LEGACY_AREA_IDS,
} from '../components/compliance-areas';

// ─── /compliance/:area · Brand Map · the eight area pages ────────────────────
// The hub used to carry every area's detail inside an accordion. Detail in a
// collapsed panel cannot be linked, shared or indexed, and the footer already
// listed all eight domains with all eight pointing at that one page — the
// comment in SiteFooter said as much, calling eight honest duplicates better
// than eight dead anchors. These pages are what those links were waiting for.
//
// The page is the transpose of a market page: same engine, other axis. Sections
// 3 to 6 restate verified data in a new arrangement and author nothing, which
// is the only reason eight of them could ship at once — as MarketsPage puts it,
// surfacing what we have already verified needs no new source.

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function ComplianceAreaPage() {
  const { t } = useTranslation('common');
  const { locale, area } = useParams();
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useCountrySelection();

  const localePrefix = locale ? `/${locale}` : '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [area]);

  // Shared links from before 2026-08-21 address areas by short id
  // (/compliance#tax). They resolve to the canonical slug instead of 404-ing.
  const legacy = area ? LEGACY_AREA_IDS[area] : undefined;
  if (legacy) return <Navigate to={`${localePrefix}/compliance/${legacy}`} replace />;

  if (!area || !isAreaSlug(area)) {
    return (
      <main className="bg-surface">
        <section className="pb-20 pt-32 lg:pt-40">
          <Container size="xl">
            <div className="mx-auto max-w-[560px] text-center">
              <Typography variant="body" className="text-fg-secondary">
                {t('compliance.area.notFound', 'That compliance area does not exist.')}
              </Typography>
              <Link
                to={`${localePrefix}/compliance`}
                className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand underline decoration-dotted underline-offset-4"
              >
                <ArrowLeft size={14} /> {t('compliance.area.allAreas', 'All areas')}
              </Link>
            </div>
          </Container>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const meta = AREA_BY_SLUG[area];
  const profile = getAreaProfile(area);
  const def = DOMAIN_BY_SLUG[area];
  const Icon = meta.icon;

  const marketWeight =
    selectedCountry === 'EU'
      ? profile.marketWeights.reduce((s, m) => s + m.weight, 0) / profile.marketWeights.length
      : (profile.marketWeights.find(m => m.code === selectedCountry)?.weight ?? profile.baselineWeight);
  const severity = severityFromRiskWeight(marketWeight);
  const style = SEVERITY_STYLE[severity];

  const title = t(`compliance.${area}.title`, def?.label ?? area);
  const headline = t(`compliance.${area}.headline`, '');
  const description = t(`compliance.${area}.description`, '');
  const affected = t(`compliance.${area}.affected`, '');
  const coverage = ['cov1', 'cov2', 'cov3']
    .map(k => t(`compliance.${area}.${k}`, ''))
    .filter(Boolean);

  const startAssessment = () => {
    const search = new URLSearchParams();
    if (selectedCountry !== 'EU') search.set('country', selectedCountry);
    const qs = search.toString();
    navigate(`${localePrefix}${meta.wizardPath}${qs ? `?${qs}` : ''}`);
  };

  return (
    <main className="bg-surface">
      <AreaSwitcher
        current={area}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
      />

      {/* ── 1 · Hero ──────────────────────────────────────────────────────── */}
      {/* The badge no longer carries the risk claim on its own: the panel on the
          right shows the three numbers it is computed from, so "high" is
          checkable rather than asserted. */}
      <section className="border-b border-stroke-subtle bg-surface-secondary py-14 desktop-s:py-20">
        <Container size="xl">
          <div className="grid gap-10 desktop-s:grid-cols-12 desktop-s:gap-14">
            <div className="desktop-s:col-span-7">
              <Link
                to={`${localePrefix}/compliance`}
                className="inline-flex items-center gap-1.5 text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand"
              >
                <ArrowLeft size={14} /> {t('compliance.area.allAreas', 'All areas')}
              </Link>

              <div className="mt-5 flex items-center gap-3">
                <Icon size={32} strokeWidth={1.5} className={`shrink-0 ${style.iconColor}`} aria-hidden />
                <SectionEyebrow tone="brand">
                  {t('compliance.heroOverline', 'Compliance Areas')}
                </SectionEyebrow>
                <RiskBadge level={severity} size="sm">
                  {t('compliance.riskBadge', {
                    defaultValue: '{{level}} Risk',
                    level: t(severityKey(severity), SEVERITY_FALLBACK[severity]),
                  })}
                </RiskBadge>
              </div>

              <h1 className="mt-5 font-serif text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-fg lg:text-[3.25rem]">
                {title}
              </h1>
              {(headline || description) && (
                <Typography variant="body" className="mt-5 max-w-xl text-lg leading-relaxed text-fg-secondary">
                  {headline || description}
                </Typography>
              )}

              <div className="mt-8 flex flex-col gap-3 tablet:flex-row">
                <Button size="lg" variant="primary" onClick={startAssessment}>
                  {t('compliance.startAssessment', 'Start {{title}} Assessment', { title })}
                  <ArrowRight size={17} className="ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate(`${localePrefix}/search?domain=${area}`)}
                >
                  {t('compliance.area.findSpecialist', 'Find a specialist')}
                </Button>
              </div>
            </div>

            {/* No second country selector here: the sticky AreaSwitcher above
                already carries one, and two controls for one piece of state
                read as two pieces of state. */}
            <div className="desktop-s:col-span-5">
              <AreaRiskCard profile={profile} selectedCountry={selectedCountry} />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2 · The metric band ───────────────────────────────────────────── */}
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-14 desktop-s:pb-16">
        <Container size="xl">
          <AreaMetrics slug={area} selectedCountry={selectedCountry} />
        </Container>
      </section>

      {/* ── 2 · Who this affects ──────────────────────────────────────────── */}
      {(affected || description) && (
        <Section className="py-16 desktop-s:py-20">
          <Container size="xl">
            <div className="max-w-[820px]">
              <Typography variant="h2" as="h2" weight="bold" className="text-fg">
                {t('compliance.whoAffected', 'Who is affected')}
              </Typography>
              {affected && (
                <Typography variant="body" className="mt-3 leading-relaxed text-fg-secondary">
                  {affected}
                </Typography>
              )}
              {description && headline && (
                <Typography variant="body" className="mt-3 leading-relaxed text-fg-secondary">
                  {description}
                </Typography>
              )}
              {profile.businessModels.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.businessModels.map(m => (
                    <span
                      key={m}
                      className="rounded-lg border border-stroke bg-surface-secondary px-3 py-1 text-body-xs font-semibold text-fg-secondary"
                    >
                      {t(`compliance.businessModel.${m}`, m)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Container>
        </Section>
      )}

      {/* ── 3 · Obligations explorer ──────────────────────────────────────── */}
      {/* Full width, not the old 900px column: the explorer is a master/detail
          pair now, and a narrow column would put the pane under the list. */}
      <Section className="bg-surface-secondary py-16 desktop-s:py-20">
        <Container size="xl">
          <ObligationsExplorer slug={area} selectedCountry={selectedCountry} />
        </Container>
      </Section>

      {/* ── 4 · Enforcement · the page's one dark moment ──────────────────── */}
      <section className="bg-primary-700 py-16 desktop-s:py-20">
        <Container size="xl">
          <AreaEnforcement slug={area} selectedCountry={selectedCountry} />
        </Container>
      </section>

      {/* ── 5 · Deadlines ─────────────────────────────────────────────────── */}
      <Section className="py-16 desktop-s:py-20">
        <Container size="xl">
          <AreaTimeline slug={area} selectedCountry={selectedCountry} />
        </Container>
      </Section>

      {/* ── 6 · Market heatmap ────────────────────────────────────────────── */}
      <Section className="bg-surface-secondary py-16 desktop-s:py-20">
        <Container size="xl">
          <div className="max-w-[900px]">
            <AreaMarketHeatmap slug={area} selectedCountry={selectedCountry} />
          </div>
        </Container>
      </Section>

      {/* ── 7 · How CompliHub360 handles it ───────────────────────────────── */}
      <Section className="py-16 desktop-s:py-20">
        <Container size="xl">
          {coverage.length > 0 && (
            <div className="mb-12 max-w-[820px]">
              <Typography variant="h2" as="h2" weight="bold" className="text-fg">
                {t('compliance.area.coversTitle', 'What CompliHub360 covers')}
              </Typography>
              <ul className="mt-5 space-y-3">
                {coverage.map(c => (
                  <li key={c} className="flex items-start gap-2.5">
                    <CheckCircle
                      size={15}
                      className="mt-0.5 shrink-0 text-success-600 dark:text-success-300"
                    />
                    <Typography variant="body" className="text-fg-secondary">
                      {c}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <HowOrchestrationWorks />
        </Container>
      </Section>

      {/* ── 8 · Specialists ───────────────────────────────────────────────── */}
      <Section className="bg-surface-secondary py-16 desktop-s:py-20">
        <Container size="xl">
          <div className="max-w-[820px] rounded-xl border border-stroke-subtle bg-surface p-7">
            <Typography
              variant="caption"
              className="mb-2 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-fg-tertiary"
            >
              <Users size={12} />
              {t('compliance.specialists.label', 'Verified Specialists')}
            </Typography>
            <Typography variant="h3" weight="bold" className="text-fg">
              {t('compliance.area.specialistsTitle', 'Matched to this area, not to a directory')}
            </Typography>
            <Typography variant="body" className="mt-2 leading-relaxed text-fg-secondary">
              {t('compliance.area.specialistsLead', {
                defaultValue:
                  'Every specialist is verified for the jurisdictions they claim. Matching runs on your assessment, so you are introduced to the ones whose coverage fits your case.',
              })}
            </Typography>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-200 bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800">
                <Sparkles size={11} className="text-accent-600" />
                {t('compliance.specialists.count', '{{count}} verified specialists', {
                  count: meta.specialistsCount,
                })}
              </span>
              <Link
                to={`${localePrefix}/search?domain=${area}`}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand underline decoration-dotted underline-offset-4 hover:decoration-solid"
              >
                {t('compliance.area.browseSpecialists', 'Browse specialists for this area')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 9 · Related areas ─────────────────────────────────────────────── */}
      <Section className="py-16 desktop-s:py-20">
        <Container size="xl">
          <RelatedAreas slug={area} />
        </Container>
      </Section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-primary-700 py-16 desktop-s:py-24">
        <Container size="xl">
          <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <Typography variant="display" as="h2" weight="bold" className="text-white">
              {t('compliance.area.ctaTitle', 'Ready to see what applies to you?')}
            </Typography>
            <Typography variant="body" className="text-lg text-primary-100">
              {t('compliance.area.ctaBody', {
                defaultValue:
                  'The assessment narrows this area to your business, your markets and your product — in under five minutes.',
              })}
            </Typography>
            <Button variant="inverse" size="xl" shape="soft" className="mt-2" onClick={startAssessment}>
              {t('compliance.startAssessment', 'Start {{title}} Assessment', { title })}
              <ArrowRight size={17} className="ml-1.5" />
            </Button>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
