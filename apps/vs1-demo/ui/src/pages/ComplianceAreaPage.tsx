import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Typography } from '../components/ui/Typography';
import { RiskBadge } from '../components/ui/RiskBadge';
import { SiteFooter } from '../components/home';
import { SectionEyebrow } from '../components/providers/SectionHeading';
import { DOMAIN_BY_SLUG } from '../lib/domains';
import { getAreaObligations, getAreaProfile, isAreaSlug } from '../lib/areaProfiles';
import { useInViewOnce } from '../lib/useInViewOnce';
import {
  AreaEnforcement,
  AreaMetrics,
  AreaRiskCard,
  AreaSectionHeading,
  AreaMarketHeatmap,
  AreaSwitcher,
  HowOrchestrationWorks,
  AreaTimeline,
  ObligationsExplorer,
  RelatedAreas,
  SEVERITY_FALLBACK,
  SEVERITY_STYLE,
  severityKey,
  useAreaEyebrows,
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

// The reveal renders its children at opacity 0 until it is told otherwise, so
// it uses useInViewOnce rather than framer-motion's useInView: that hook is
// guaranteed to reach `true` on every path, including the one where the
// observer never calls back. A reveal that can stick at 0 does not degrade to
// "no animation" — it degrades to "the section is not on the page".
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [ref, inView] = useInViewOnce<HTMLElement>('-80px');
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
  const { t, i18n } = useTranslation('common');
  const eyebrows = useAreaEyebrows();
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

  // Dieselbe Liste, die der Explorer weiter unten rendert — die Zeile im Hero
  // kann also nicht von dem abweichen, was die Seite danach zeigt.
  const heroObligations = getAreaObligations(area, selectedCountry);
  const heroLater = heroObligations.filter(
    o => o.appliesFrom && new Date(o.appliesFrom) > new Date(),
  ).length;
  const heroNational = heroObligations.filter(o => o.marketSpecific).length;
  const heroFacts = [
    heroObligations.length > 0
      ? t('compliance.area.facts.duties', { defaultValue: '{{count}} duties', count: heroObligations.length })
      : '',
    selectedCountry === 'EU'
      ? t('compliance.area.facts.allEu', 'all on an EU-level source')
      : t('compliance.area.facts.national', {
          defaultValue: '{{count}} on a national legal basis',
          count: heroNational,
        }),
    heroLater > 0
      ? t('compliance.area.facts.later', {
          defaultValue: '{{count}} apply only from a later date',
          count: heroLater,
        })
      : '',
  ].filter(Boolean);

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

      {/* ── 1 · Hero on the full-bleed Gradient ───────────────────────────── */}
      {/* (canvas "Bereichsseiten-Hero" · Variante C "Schwebende Kennzahlen-
          Karte", 2026-08-28): the Gradient carries copy and the risk dossier
          card; the metric card floats over the bottom edge right after. */}
      {/* The badge no longer carries the risk claim on its own: the panel on the
          right shows the three numbers it is computed from, so "high" is
          checkable rather than asserted. */}
      {/* The site header is FIXED and the area switcher is sticky underneath it,
          so the switcher's flow slot sits far above where it is painted. The
          top padding clears both: the fixed header (81px at lg) plus the bar's
          own height. The bottom padding buys the room the floating metric card
          pulls itself into (-mt-14). */}
      <section className="bg-gradient-stage pb-24 pt-[7.2rem] desktop-s:pb-28 desktop-s:pt-[9.6rem]">
        <Container size="xl">
          <div className="grid gap-10 desktop-s:grid-cols-12 desktop-s:gap-14">
            <div className="desktop-s:col-span-7">
              {/* No back link here: the sticky switcher above carries one, and
                  the canvas hero opens on the eyebrow. */}
              <div>
                <SectionEyebrow tone="brand">
                  {t('compliance.heroOverline', 'Compliance Areas')}
                </SectionEyebrow>
              </div>

              <h1 className="mt-4 font-serif text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-fg lg:text-[3.5rem]">
                {title}
              </h1>
              {(headline || description) && (
                <Typography variant="body" className="mt-5 max-w-xl text-lg leading-relaxed text-fg-secondary">
                  {headline || description}
                </Typography>
              )}

              {/* The canvas states the area's size in the lead sentence. It is
                  a LIST of derived facts rather than the mockup's prose: the
                  clauses are conditional (a market with no national source, an
                  area with nothing deferred) and stitching conditional prose
                  together in four languages is where grammar breaks. Same
                  facts, same place, sentences that cannot come out wrong. */}
              {heroFacts.length > 0 && (
                <p className="mt-4 text-body-sm text-fg-tertiary tabular-nums">
                  {heroFacts.join(' · ')}
                </p>
              )}

              {/* The "Ask a question" outline that stood here moved out on
                  2026-08-28: the gold band below is the page's one invitation
                  to ask, and the hero keeps the one move it opens with. */}
              <div className="mt-8">
                <Button size="lg" variant="primary" onClick={startAssessment}>
                  {t('compliance.area.startShort', 'Start the assessment')}
                  <ArrowRight size={17} className="ml-1.5" />
                </Button>
              </div>

              <p className="mt-7 flex items-start gap-2.5 text-body-sm text-fg-tertiary">
                <Check size={15} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
                {t(
                  'compliance.area.sourcePromise',
                  'Every duty traces back to a named legal basis — no assessment without a source.',
                )}
              </p>
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

      {/* ── 2 · The metric card, floating over the Gradient's edge ────────── */}
      {/* The component carries its own Container and -mt offset, and renders
          nothing at all when the engine has no figures — so the offset never
          fires on an empty card. */}
      <AreaMetrics slug={area} selectedCountry={selectedCountry} />

      {/* ── 3 · Who this affects ──────────────────────────────────────────── */}
      {/* Two columns, as the canvas draws it: the heading holds a narrow left
          rail and the prose runs beside it, not under it. The single 820px
          column this replaced put a 30px serif headline directly above its own
          body text, so the two read as one block and the section had no way to
          be skimmed. The rail is fixed at 300px and the prose capped at 720 —
          both from the canvas — so the measure stays readable however wide the
          page gets. Below desktop-s the rail simply becomes the first row. */}
      {(affected || description) && (
        <Section className="py-16 desktop-s:py-20">
          <Container size="xl">
            <div className="flex flex-col gap-8 desktop-s:flex-row desktop-s:gap-24">
              <AreaSectionHeading
                className="desktop-s:w-[300px] desktop-s:shrink-0"
                eyebrow={eyebrows.affected}
                title={t('compliance.whoAffected', 'Who is affected')}
              />
              <div className="max-w-[720px] desktop-s:grow">
                {/* The lead is a size up and in full foreground; the paragraph
                    under it is body size and secondary. The canvas separates
                    them that way and it is what makes the first sentence read
                    as the answer to the heading rather than as more prose. */}
                {affected && (
                  <Typography variant="body" className="text-body-lg leading-relaxed text-fg">
                    {affected}
                  </Typography>
                )}
                {description && headline && (
                  <Typography
                    variant="body"
                    className={`leading-relaxed text-fg-secondary ${affected ? 'mt-4' : ''}`}
                  >
                    {description}
                  </Typography>
                )}
                {profile.businessModels.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {profile.businessModels.map(m => (
                      <span
                        key={m}
                        className="rounded-lg border border-stroke bg-surface-secondary px-3.5 py-[0.4375rem] text-body-xs font-semibold text-fg-secondary"
                      >
                        {t(`compliance.businessModel.${m}`, m)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
          {/* Full container width: the section is a heading rail beside a
              table now, and capping it at 900 squeezed the bars into a column
              narrower than the labels beside them. */}
          <AreaMarketHeatmap slug={area} selectedCountry={selectedCountry} />
        </Container>
      </Section>

      {/* ── 8 · How CompliHub360 gets there ───────────────────────────────── */}
      {/* Three numbered cards, which is the canvas's shape and a better fit for
          this content than the checklist it replaces: each item is a step in
          how the engine reaches an answer, and a tick implies a feature that
          is simply present. HowOrchestrationWorks came out with the checklist —
          the canvas has no four-step funnel here, and that block already sits
          on the areas hub one level up, where generic product messaging
          belongs. Repeating it under every area page was the same argument
          made eight times. */}
      {coverage.length > 0 && (
        <Section className="py-16 desktop-s:py-20">
          <Container size="xl">
            <AreaSectionHeading
              className="max-w-[620px]"
              eyebrow={eyebrows.process}
              title={t('compliance.area.coversTitle', 'How CompliHub360 gets there')}
            />
            <ol className="mt-10 grid gap-6 tablet:grid-cols-3">
              {coverage.map((c, i) => {
                // The engine's copy is one sentence per step. Where it carries
                // its own break — a dash or a colon — the first clause is the
                // step's name and the rest explains it, which is how the canvas
                // sets these. Where it does not, the sentence is the name and
                // the card simply has no second line. Nothing is invented to
                // fill one.
                const m = c.match(/^(.{3,60}?)\s*(?:[–—]|:)\s+(.+)$/);
                // The clause after the dash starts mid-sentence in the source
                // string ("… assistant – assesses trading role"). Standing on
                // its own line it is a sentence, so it gets a capital.
                const [name, body] = m
                  ? [m[1], m[2].charAt(0).toLocaleUpperCase(i18n.language) + m[2].slice(1)]
                  : [c, null];
                return (
                  <li
                    key={c}
                    className="rounded-xl border border-stroke-subtle p-7"
                  >
                    <span className="font-serif text-h3 font-semibold tabular-nums text-fg-brand">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-3.5 text-body font-bold leading-snug text-fg">{name}</p>
                    {body && (
                      <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{body}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Container>
        </Section>
      )}

      {/* ── 9 · Ask · the page's only gold, and its only input ────────────── */}
      {/* This was a specialists band, and every claim in it was false. The
          count came from a literal in areas.ts — 8 for this area, 12 for tax,
          numbers nobody derived from a registry, because the app has no
          provider registry. "Verified" verified nothing. And the button
          carried ?domain= to /search, which reads only ?q=, so it promised a
          filtered specialist list and delivered a free-text box.

          Specialists belong after sign-up and anonymised, which is later than
          this page. What is true here and now is the free-text box itself —
          the one thing an area page offers besides reading, and the fast lane
          past the wizard. So the band offers that, and the gold stays because
          it still marks the page's single invitation to act.

          The funnel is intact and nothing in it is claimed early: a question
          now, the assessment in the closing band, specialists once there is
          something to introduce. */}
      <Section className="pb-16 desktop-s:pb-20">
        <Container size="xl">
          <div className="flex flex-col gap-8 rounded-xl border border-stroke-subtle border-l-[3px] border-l-accent-500 bg-surface-secondary px-10 py-9 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-12">
            <div className="max-w-[640px]">
              <Typography variant="h3" as="h2" weight="bold" className="text-fg">
                {t('compliance.area.askTitle', {
                  defaultValue: 'A specific question about {{area}}?',
                  area: title,
                })}
              </Typography>
              <Typography variant="body" className="mt-2.5 leading-relaxed text-fg-secondary">
                {t('compliance.area.askLead', {
                  defaultValue:
                    'Ask it in your own words and get an answer with its sources named. The assessment below is the longer way round — it maps the whole area to your business instead of answering one question.',
                })}
              </Typography>
            </div>
            <Link
              to={`${localePrefix}/search`}
              className="inline-flex h-[3rem] shrink-0 items-center gap-2 self-start rounded-lg bg-primary-700 px-6 text-body-md font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus desktop-s:self-auto"
            >
              {t('compliance.area.askQuestion', 'Ask a question')}
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </Container>
      </Section>

      {/* ── 10 · Related areas ────────────────────────────────────────────── */}
      <Section className="py-16 desktop-s:py-20">
        <Container size="xl">
          <RelatedAreas slug={area} />
        </Container>
      </Section>

      {/* ── 11 · The close · orchestration and the assessment, one band ───── */}
      {/* One petrol band, not two closing sections. The four steps and the
          assessment CTA were the same move said twice — how you get from "this
          applies to me" to a specialist who has answered, and the button that
          starts it — with the steps in a tinted card directly above the band
          that repeated their conclusion. Merged, the band explains the path
          and then offers it, and the page keeps exactly one dark close.

          The steps come last because they are not about this area: they are
          how any area gets there, so they belong after the area is finished
          being explained. */}
      <section className="bg-primary-700 py-16 desktop-s:py-20">
        <Container size="xl">
          <HowOrchestrationWorks tone="inverse" />

          <div className="mt-[3.5rem] border-t border-white/[0.14] pt-[2.5rem]">
            <div className="flex flex-col gap-6 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-12">
              <div className="max-w-[560px]">
                {/* h3, not the display size it used to carry: the band already
                    has a headline, and two competing ones read as two
                    sections that failed to separate. */}
                <Typography variant="h3" as="h2" weight="bold" className="text-white">
                  {t('compliance.area.ctaTitle', 'Ready to see what applies to you?')}
                </Typography>
                <Typography variant="body" className="mt-2 leading-relaxed text-primary-100">
                  {t('compliance.area.ctaBody', {
                    defaultValue:
                      'The assessment narrows this area to your business, your markets and your product — in under five minutes.',
                  })}
                </Typography>
              </div>
              <Button
                variant="inverse"
                size="xl"
                shape="soft"
                className="shrink-0 self-start desktop-s:self-auto"
                onClick={startAssessment}
              >
                {t('compliance.startAssessment', 'Start {{title}} Assessment', { title })}
                <ArrowRight size={17} className="ml-1.5" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
