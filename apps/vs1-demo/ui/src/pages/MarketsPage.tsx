import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, ScrollText } from 'lucide-react';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Container } from '../components/ui/Container';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { Typography } from '../components/ui/Typography';
import { Section } from '../components/ui/Section';
import {
  HowOrchestrationWorks,
  MarketCalendar,
  MarketCoverage,
  MarketProfileCard,
  MarketWeights,
  RelatedMarkets,
} from '../components/compliance-areas';
import { DOMAIN_I18N_KEY, DOMAIN_BY_SLUG } from '../lib/domains';
import { getMarketProfile, isMarketCode, listMarkets } from '../lib/marketProfiles';
import { Badge } from '../components/ui/Badge';
import { useInViewOnce } from '../lib/useInViewOnce';

// ─── /markets and /markets/:code · Brand Map Stufe 6b ────────────────────────
// The country knowledge base. Every fact on these pages is derived in
// lib/marketProfiles from the compliance engine — the risk matrix and the
// obligation enrichment map, whose entries were checked against the national
// statutes when they were written. Nothing is authored here; the copy in
// common.json → markets.* only frames what the data says.
//
// That is deliberate and it is the reason these pages could be built at all:
// the open question about a content source for the seven domains outside
// VAT & Tax is a question about NEW editorial content. Surfacing what we have
// already verified needs no new source.
//
// The visible consequence is uneven coverage — DE carries nine market-specific
// duties, TR four. The coverage note says so instead of padding it.

function useDomainLabel() {
  const { t } = useTranslation('userws');
  return (slug: string) => {
    const def = DOMAIN_BY_SLUG[slug];
    const key = def ? DOMAIN_I18N_KEY[def.label] : undefined;
    return key ? t(`domain.${key}`, { defaultValue: def!.label }) : slug;
  };
}

// Region cards merged in from /countries. The tier is a key, not a label — it
// also drives which wording appears, and comparing translated text would break
// in every non-English locale.
const REGION_KEYS = ['eu', 'uk', 'us', 'au'] as const;
const REGION_TIER: Record<(typeof REGION_KEYS)[number], 'full' | 'expanding' | 'core'> = {
  eu: 'full', uk: 'full', us: 'expanding', au: 'core',
};

export function MarketsIndexPage() {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const markets = listMarkets();


  return (
    <main className="bg-surface">
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-16 pt-32 lg:pb-20 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('markets.index.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('markets.index.title.pre')}
              <GoldWord>{t('markets.index.title.gold')}</GoldWord>
              {t('markets.index.title.post')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('markets.index.lead')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Stagger className="mx-auto grid max-w-[1040px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {markets.map((m) => {
              // The same instrument as everywhere else: severity derives from
              // the enforcement score, and the pill carries the real number.
              const severity = severityFromRiskWeight(m.enforcementIntensity);
              return (
                <StaggerItem key={m.code}>
                  <Link
                    to={`/${locale ?? 'en'}/markets/${m.code.toLowerCase()}`}
                    className="group flex h-full flex-col rounded-xl border border-stroke-subtle bg-surface p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                        {m.code}
                      </span>
                      <RiskBadge level={severity} size="sm" className="shrink-0 rounded-full tabular-nums">
                        {t('markets.index.enforcement', { value: m.enforcementIntensity })}
                      </RiskBadge>
                    </div>
                    <p className="mb-5 mt-2 font-serif text-[1.375rem] font-bold leading-snug text-fg">
                      {t(`markets.countries.${m.code}`)}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-stroke-subtle pt-4">
                      <span className="inline-flex items-center gap-1.5 text-body-3xs font-semibold text-fg-tertiary">
                        <ScrollText size={12} />
                        {t('markets.index.obligations', { count: m.obligationCount })}
                      </span>
                      <span className="text-body-3xs font-semibold text-fg-tertiary">
                        {t('markets.index.areas', {
                          defaultValue: '{{count}} of {{total}} areas',
                          count: m.areasCovered,
                          total: m.areasTotal,
                        })}
                      </span>
                      <ArrowRight
                        size={14}
                        className="ml-auto text-fg-brand transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Container>
      </section>

      {/* Regions — merged in from the retired /countries page (2026-08-18). That
          page carried a coverage overview with no legal sources; the per-country
          duties below are the substance, so the overview became a section here
          rather than a second, thinner page competing for the same intent. */}
      <section className="border-t border-stroke-subtle bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[1040px]">
            <h2 className="font-serif text-[1.75rem] font-semibold text-fg">
              {t('markets.regions.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-body text-fg-secondary">{t('markets.regions.lead')}</p>

            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
              {REGION_KEYS.map((key) => (
                <StaggerItem key={key}>
                  <div className="flex h-full flex-col rounded-xl border border-stroke-subtle bg-surface p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-[1.125rem] font-bold leading-snug text-fg">
                        {t(`markets.regions.items.${key}.name`)}
                      </p>
                      <span className="shrink-0 text-body-3xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
                        {t(`markets.regions.tiers.${REGION_TIER[key]}`)}
                      </span>
                    </div>
                    <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                      {t(`markets.regions.items.${key}.description`)}
                    </p>
                    <p className="mt-4 text-body-3xs font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
                      {t('markets.regions.focusAreas')}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {(t(`markets.regions.items.${key}.focus`, { returnObjects: true }) as string[]).map((f) => (
                        <li key={f}>
                          {/* Badge renders a span — it has to sit INSIDE the li, not replace it. */}
                          <Badge shape="pill" tone="neutral" appearance="outline" size="md">
                            {f}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}

export function MarketPage() {
  const { t, i18n } = useTranslation('common');
  const { locale, code } = useParams();
  const navigate = useNavigate();

  const upper = (code ?? '').toUpperCase();
  const known = isMarketCode(upper);
  const profile = known ? getMarketProfile(upper as Parameters<typeof getMarketProfile>[0]) : null;
  const country = known ? t(`markets.countries.${upper}`) : upper;
  const localePrefix = locale ? `/${locale}` : '';

  if (!profile) {
    return (
      <main className="bg-surface">
        <section className="pb-20 pt-32 lg:pt-40">
          <Container size="xl">
            <div className="mx-auto max-w-[560px] text-center">
              <p className="text-body text-fg-secondary">{t('markets.country.notFound')}</p>
              <Link
                to={`/${locale ?? 'en'}/markets`}
                className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand underline decoration-dotted underline-offset-4"
              >
                <ArrowLeft size={14} /> {t('markets.country.backToMarkets')}
              </Link>
            </div>
          </Container>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const money = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    notation: profile.exposureEur >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: profile.exposureEur >= 1_000_000 ? 1 : 0,
  });

  // The hero's fact pills. Every one is derived, and every one drops out when
  // the market has nothing to put in it — the canvas draws four because
  // Germany fills four, not because four is the shape.
  const facts = [
    {
      key: 'duties',
      value: String(profile.obligations.length),
      label: t('markets.country.factDuties', 'duties'),
      tone: 'text-fg',
    },
    {
      key: 'areas',
      value: t('markets.country.ofAreasShort', '{{count}} of {{total}}', {
        count: profile.byDomain.length,
        total: profile.weights.length,
      }),
      label: t('markets.country.factAreas', 'areas'),
      tone: 'text-fg',
    },
    profile.exposureEur > 0
      ? {
          key: 'exposure',
          value: money.format(profile.exposureEur),
          label: t('markets.country.factExposure', 'exposure'),
          tone: 'text-risk-on-critical',
        }
      : null,
    profile.soonest?.dueDays != null
      ? {
          key: 'lead',
          value: t('compliance.area.metrics.days', {
            defaultValue: '{{count}} days',
            count: profile.soonest.dueDays,
          }),
          label: t('markets.country.factLead', 'to the next deadline'),
          tone: 'text-fg',
        }
      : null,
  ].filter((f): f is { key: string; value: string; label: string; tone: string } => f !== null);

  // The CTA carries the market into the wizard: this page IS the answer to the
  // wizard's first question, so the flow opens on Operations with this market
  // pre-selected instead of asking again.
  const startAssessment = () => navigate(`${localePrefix}/wizard?market=${upper}`);

  return (
    <main className="bg-surface">
      {/* ── 1 · Hero ─────────────────────────────────────────────────────── */}
      {/* No metric band. The four figures are pills here, because a full-bleed
          band of serif numbers is the AREA page's signature and a second one
          was the loudest reason both page types read as the same page.

          NO LATERAL SWITCHER either, unlike the area page. The header's own
          markets menu already opens all eight, so a second one under it was
          the same control twice — and its area menu pointed OUT of markets
          entirely, which is the one direction this page should not offer: a
          market page is where a market is planned, and the way into an area is
          the weights table further down, in context.

          The padding therefore carries what the bar used to occupy, and the
          two values are measured rather than derived: they put the eyebrow the
          same distance below the fixed header as the area page's does — 104px
          at desktop, 80 at 390 — where the header is 113px and 97px tall. The
          first guess at this was 5px out at desktop and 4px at mobile, which is
          exactly why it was measured a second time. */}
      <section className="bg-surface pb-14 pt-[10.75rem] desktop-s:pb-[4.5rem] desktop-s:pt-[13.1875rem]">
        <Container size="xl">
          <div className="flex flex-col gap-14 desktop-s:flex-row desktop-s:items-start desktop-s:gap-20">
            <div className="min-w-0 max-w-[660px] desktop-s:grow">
              <SectionEyebrow tone="brand" dot={false}>
                {t('markets.country.eyebrow', 'Market')}
              </SectionEyebrow>
              <Typography variant="display" as="h1" weight="bold" className="mt-3.5 text-fg">
                {country}
              </Typography>
              <Typography variant="body" className="mt-4 text-body-lg leading-relaxed text-fg-secondary">
                {t('markets.country.lead', {
                  defaultValue:
                    '{{count}} duties across {{areas}} areas, with a national legal basis. This page shows what comes together here and when — what a single duty requires is set out in its area.',
                  count: profile.obligations.length,
                  areas: profile.byDomain.length,
                })}
              </Typography>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {facts.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-stroke-subtle bg-surface-secondary px-3.5 py-2"
                  >
                    <span className={`text-body-sm font-bold tabular-nums ${f.tone}`}>{f.value}</span>
                    <span className="text-body-2xs text-fg-secondary">{f.label}</span>
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 tablet:flex-row">
                <Button size="lg" variant="primary" onClick={startAssessment}>
                  {t('markets.country.startAssessment', 'Start the assessment for {{market}}', {
                    market: country,
                  })}
                  <ArrowRight size={17} className="ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-surface"
                  onClick={() => navigate(`${localePrefix}/search`)}
                >
                  {t('compliance.area.askQuestion', 'Ask a question')}
                </Button>
              </div>

              <p className="mt-7 flex items-start gap-2.5 text-body-sm text-fg-tertiary">
                <Check size={15} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
                {t('markets.country.sourcePromise', {
                  defaultValue:
                    'Every duty here names its national legal basis. Where we hold none, the EU instrument stands — and it says so.',
                })}
              </p>
            </div>

            <div className="w-full shrink-0 desktop-s:w-[340px]">
              <MarketProfileCard profile={profile} />
            </div>
          </div>
        </Container>
      </section>

      {/* ── 2 · Weights · the spine into the area pages ───────────────────── */}
      <Section className="bg-surface-secondary py-16 desktop-s:py-20" spacing="none">
        <MarketWeights profile={profile} />
      </Section>

      {/* ── 3 · The calendar · the section only this page can assemble ────── */}
      <Section className="py-16 desktop-s:py-20" spacing="none">
        <MarketCalendar profile={profile} />
      </Section>

      {/* ── 4 · Coverage · renders only where there is a real gap ─────────── */}
      {profile.gaps.length > 0 && (
        <Section className="bg-surface-secondary py-16 desktop-s:py-20" spacing="none">
          <MarketCoverage profile={profile} marketLabel={country} />
        </Section>
      )}

      {/* ── 5 · Other markets ────────────────────────────────────────────── */}
      <Section className="py-16 desktop-s:py-20" spacing="none">
        <RelatedMarkets profile={profile} />
      </Section>

      {/* ── 6 · The close · same band as the area page, deliberately ─────── */}
      <section className="bg-primary-700 py-16 desktop-s:py-20">
        <Container size="xl">
          <HowOrchestrationWorks tone="inverse" />
          <div className="mt-[3.5rem] border-t border-white/[0.14] pt-[2.5rem]">
            <div className="flex flex-col gap-6 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-12">
              <div className="max-w-[560px]">
                <Typography variant="h3" as="h2" weight="bold" className="text-white">
                  {t('compliance.area.ctaTitle', 'Ready to see what applies to you?')}
                </Typography>
                <Typography variant="body" className="mt-2 leading-relaxed text-primary-100">
                  {t('markets.country.ctaBody', {
                    defaultValue:
                      'The assessment narrows this market to your business, your product and your areas — in under five minutes.',
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
                {t('markets.country.startAssessment', 'Start the assessment for {{market}}', {
                  market: country,
                })}
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
