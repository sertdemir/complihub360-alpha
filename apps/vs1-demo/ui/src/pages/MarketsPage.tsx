import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { severityFromRiskWeight } from '@complihub/compliance-engine';
import { Container } from '../components/ui/Container';
import { RiskBadge } from '../components/ui/RiskBadge';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { Typography } from '../components/ui/Typography';
import { Section } from '../components/ui/Section';
import {
  AreaSectionHeading,
  COUNTRY_OPTIONS,
  HowOrchestrationWorks,
  MarketCalendar,
  MarketCoverage,
  MarketProfileCard,
  MarketWeights,
  RelatedMarkets,
} from '../components/compliance-areas';
import { getMarketProfile, isMarketCode, listMarkets } from '../lib/marketProfiles';
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

// Region rows merged in from /countries. The tier is a key, not a label — it
// also drives which color the kicker takes, and comparing translated text
// would break in every non-English locale.
const REGION_KEYS = ['eu', 'uk', 'us', 'au'] as const;
const REGION_TIER: Record<(typeof REGION_KEYS)[number], 'full' | 'expanding' | 'core'> = {
  eu: 'full', uk: 'full', us: 'expanding', au: 'core',
};

// Flags are presentation, sourced from the market picker's own list — the one
// sanctioned emoji exception, so the cards and the picker can never disagree.
const FLAG_BY_CODE = new Map(COUNTRY_OPTIONS.map((o) => [o.code as string, o.flag]));

// A serif value counting up in view — the KPIStrip's move, with the formatter
// injected because the third cell is a locale-formatted decimal, not an int.
function CountUp({ to, run, format }: { to: number; run: boolean; format: (v: number) => string }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      setV(p * to);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return <>{format(run || reduced ? v : 0)}</>;
}

// ─── The floating KPI card (canvas "Märkte · Hero" · Variante A, 2026-08-28) ─
// ONE white card pulled up over the Gradient's bottom edge — the hub hero's
// anatomy. All three figures are aggregates over listMarkets(), never typed
// out, so a ninth market or a new duty changes them without anyone remembering
// this card exists.
function MarketsKpiCard({ markets }: { markets: ReturnType<typeof listMarkets> }) {
  const { t, i18n } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');

  const dutiesTotal = markets.reduce((sum, m) => sum + m.obligationCount, 0);
  const avgEnforcement = markets.reduce((sum, m) => sum + m.enforcementIntensity, 0) / markets.length;
  // The market that anchors the scale — named by the data, not by hand.
  const leader = markets.reduce((max, m) => (m.enforcementIntensity > max.enforcementIntensity ? m : max), markets[0]);
  const one = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const int = (v: number) => String(Math.round(v));

  const cells = [
    {
      key: 'markets',
      value: <CountUp to={markets.length} run={inView} format={int} />,
      suffix: null as ReactNode,
      label: t('markets.index.kpi.markets', 'Markets'),
      note: t('markets.index.kpi.marketsNote', 'the EU core plus the UK, USA and Türkiye'),
    },
    {
      key: 'duties',
      value: <CountUp to={dutiesTotal} run={inView} format={int} />,
      suffix: null as ReactNode,
      label: t('markets.index.kpi.duties', 'Duties with a legal basis'),
      note: t('markets.index.kpi.dutiesNote', 'each checked against the engine'),
    },
    {
      key: 'enforcement',
      value: <CountUp to={avgEnforcement} run={inView} format={(v) => one.format(v)} />,
      suffix: (
        <span className="ml-1 text-body-sm font-semibold text-fg-tertiary">
          {t('markets.index.kpi.ofTen', '/ 10')}
        </span>
      ),
      label: t('markets.index.kpi.enforcement', 'Enforcement on average'),
      note: t('markets.index.kpi.enforcementNote', '{{market}} leads with {{value}} of 10', {
        market: t(`markets.countries.${leader.code}`),
        value: leader.enforcementIntensity,
      }),
    },
  ];

  return (
    <div
      ref={ref}
      className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-32px_rgba(2,22,17,0.35)] dark:bg-surface-secondary lg:px-8"
    >
      <div className="grid grid-cols-1 gap-y-7 sm:grid-cols-3 sm:divide-x sm:divide-stroke-subtle">
        {cells.map((c) => (
          <div key={c.key} className="min-w-0 sm:px-8 sm:first:pl-0 sm:last:pr-0">
            <p className="font-serif text-[1.625rem] font-bold leading-none tabular-nums text-fg">
              {c.value}
              {c.suffix}
            </p>
            <p className="mt-2 text-body-sm font-bold text-fg">{c.label}</p>
            <p className="mt-1 text-body-xs leading-snug text-fg-tertiary">{c.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketsIndexPage() {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const markets = listMarkets();

  return (
    <main className="bg-surface">
      {/* ── Hero on the full-bleed Gradient (canvas "Märkte · Hero" ·
          Variante A, 2026-08-28) — the hub hero's anatomy. Unlike the hub
          this page has no picker card to balance, so the copy holds the
          center and the KPI card below clamps hero and grid together. */}
      <section className="bg-gradient-stage pb-24 pt-32 lg:pb-28 lg:pt-40">
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

      <Container size="xl" className="relative z-10 -mt-14">
        <Reveal delay={0.1} className="mx-auto max-w-[1040px]">
          <MarketsKpiCard markets={markets} />
        </Reveal>
      </Container>

      {/* ── The eight markets (canvas "Märkte · Karten" · Variante A,
          2026-08-28) — hub cards, two across: flag, serif name, the
          enforcement pill, one plain sentence, and a foot that repeats the
          two figures the sentence carries so a scanner needs neither. */}
      <section className="pb-16 pt-14 lg:pb-20 desktop-s:pt-16">
        <Container size="xl">
          <Stagger className="mx-auto grid max-w-[1040px] gap-4 desktop-s:grid-cols-2">
            {markets.map((m) => {
              // The same instrument as everywhere else: severity derives from
              // the enforcement score, and the pill carries the real number.
              const severity = severityFromRiskWeight(m.enforcementIntensity);
              return (
                <StaggerItem key={m.code}>
                  <Link
                    to={`/${locale ?? 'en'}/markets/${m.code.toLowerCase()}`}
                    className="group flex h-full gap-4 rounded-xl border border-stroke-subtle bg-surface p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md tablet:p-7"
                  >
                    <span className="mt-0.5 shrink-0 text-[2.125rem] leading-none" aria-hidden>
                      {FLAG_BY_CODE.get(m.code)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-serif text-[1.25rem] font-bold leading-snug text-fg">
                          {t(`markets.countries.${m.code}`)}
                        </span>
                        <RiskBadge level={severity} size="sm" className="shrink-0 rounded-full tabular-nums">
                          {t('markets.index.enforcement', { value: m.enforcementIntensity })}
                        </RiskBadge>
                      </span>
                      <span className="mb-4 mt-1.5 text-body-sm leading-relaxed text-fg-secondary">
                        {t('markets.index.cardSub', {
                          defaultValue:
                            '{{count}} duties with a national legal basis, own sources in {{areas}} of {{total}} areas.',
                          count: m.obligationCount,
                          areas: m.areasCovered,
                          total: m.areasTotal,
                        })}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-3 border-t border-stroke-subtle pt-3">
                        <span className="text-body-3xs font-semibold text-fg-tertiary">
                          {t('markets.index.obligations', { count: m.obligationCount })}
                          {' · '}
                          {t('markets.index.areas', {
                            defaultValue: '{{count}} of {{total}} areas',
                            count: m.areasCovered,
                            total: m.areasTotal,
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-body-3xs font-bold text-fg-brand">
                          {t('markets.index.openMarket', 'Open the market')}
                          <ArrowRight
                            size={13}
                            className="transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </span>
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Container>
      </section>

      {/* ── Regions (canvas "Märkte · Regionen" · Variante C, 2026-08-28) —
          merged in from the retired /countries page (2026-08-18) and now a
          Gradient pair: the four regions as quiet rows in ONE white card on
          the tinted panel left, the copy right. The descriptions the old
          cards carried are gone — name, tier and focus statutes say it. */}
      <section className="py-16 lg:py-20">
        <Container size="xl">
          <div className="mx-auto flex max-w-[1040px] flex-col gap-10 desktop-s:flex-row-reverse desktop-s:items-center desktop-s:gap-14">
            {/* DOM order copy-first so mobile leads with the heading; the
                row-reverse stands the panel left on desktop. */}
            <Reveal className="shrink-0 desktop-s:w-[360px]">
              <AreaSectionHeading
                eyebrow={t('markets.regions.eyebrow', 'Regions')}
                title={t('markets.regions.title')}
                lead={t('markets.regions.lead')}
              />
              <Typography
                variant="caption"
                className="mt-6 block border-t border-stroke-subtle pt-4 text-body-xs normal-case leading-relaxed tracking-normal text-fg-tertiary"
              >
                {t('markets.regions.note', {
                  defaultValue:
                    'The EU and the UK are fully covered; North America is expanding and APAC starts with core coverage. More countries follow over the course of 2026.',
                })}
              </Typography>
            </Reveal>

            <Reveal delay={0.1} className="min-w-0 flex-1 rounded-xl bg-gradient-stage p-5 sm:p-7">
              <div className="rounded-xl bg-surface px-6 py-2 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:px-7">
                <Stagger className="divide-y divide-stroke-subtle">
                  {REGION_KEYS.map((key) => (
                    <StaggerItem
                      key={key}
                      className="flex flex-col gap-2 py-4 tablet:flex-row tablet:items-baseline tablet:gap-5"
                    >
                      <span className="shrink-0 tablet:w-[11.5rem]">
                        <span className="block font-serif text-body font-bold leading-snug text-fg">
                          {t(`markets.regions.items.${key}.name`)}
                        </span>
                        <span
                          className={`mt-1 block text-[0.5625rem] font-extrabold uppercase tracking-[0.1em] ${
                            REGION_TIER[key] === 'full'
                              ? 'text-fg-brand'
                              : 'text-accent-700 dark:text-fg-accent-strong'
                          }`}
                        >
                          {t(`markets.regions.tiers.${REGION_TIER[key]}`)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 text-body-xs leading-relaxed text-fg-tertiary">
                        {(t(`markets.regions.items.${key}.focus`, { returnObjects: true }) as string[]).map(
                          (f, j, arr) => (
                            <span key={f}>
                              <span className="font-semibold text-fg">{f}</span>
                              {j < arr.length - 1 && ' · '}
                            </span>
                          ),
                        )}
                      </span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </Reveal>
          </div>
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

          The padding therefore carries what the bar used to occupy. The two
          values were measured against the old 113/97px header to put the
          eyebrow 104px (desktop) / 80px (390) below it; since the site headers
          were unified on the MarketingHeader's height the fixed bar is 81/65px,
          so the eyebrow now sits ~32px lower — deliberate slack, not drift. */}
      <section className="bg-surface pb-14 pt-[10.75rem] desktop-s:pb-[4.5rem] desktop-s:pt-[13.1875rem]">
        <Container size="xl">
          <div className="flex flex-col gap-14 desktop-s:flex-row desktop-s:items-start desktop-s:gap-20">
            <div className="min-w-0 max-w-[660px] desktop-s:grow">
              <SectionEyebrow tone="brand">
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
