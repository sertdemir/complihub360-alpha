import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { DOMAIN_I18N_KEY, DOMAIN_BY_SLUG } from '../lib/domains';
import { getMarketProfile, isMarketCode, listMarkets } from '../lib/marketProfiles';

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
            {markets.map((m) => (
              <StaggerItem key={m.code}>
                <Link
                  to={`/${locale ?? 'en'}/markets/${m.code.toLowerCase()}`}
                  className="group flex h-full flex-col rounded-2xl border border-stroke-subtle bg-surface p-6 transition-colors hover:border-stroke-brand"
                >
                  <span className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                    {m.code}
                  </span>
                  <p className="mt-2 font-serif text-[1.375rem] font-bold leading-snug text-fg">
                    {t(`markets.countries.${m.code}`)}
                  </p>
                  <p className="mt-3 text-body-sm text-fg-secondary">
                    {t('markets.index.obligations', { count: m.obligationCount })}
                  </p>
                  <p className="mt-1 text-body-2xs text-fg-tertiary">
                    {t('markets.index.enforcement', { value: m.enforcementIntensity })}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-fg-brand">
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
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
                  <div className="flex h-full flex-col rounded-2xl border border-stroke-subtle bg-surface p-6">
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
                        <li key={f} className="rounded-full border border-stroke-subtle px-2.5 py-1 text-body-2xs text-fg-secondary">
                          {f}
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
  const { t } = useTranslation('common');
  const { locale, code } = useParams();
  const navigate = useNavigate();
  const domainLabel = useDomainLabel();

  const upper = (code ?? '').toUpperCase();
  const known = isMarketCode(upper);
  const profile = known ? getMarketProfile(upper as Parameters<typeof getMarketProfile>[0]) : null;
  const country = known ? t(`markets.countries.${upper}`) : upper;


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

  const maxWeight = Math.max(...profile.weights.map((w) => w.weight));

  return (
    <main className="bg-surface">
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-16 pt-32 lg:pb-20 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <Link
              to={`/${locale ?? 'en'}/markets`}
              className="inline-flex items-center gap-1.5 text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand"
            >
              <ArrowLeft size={14} /> {t('markets.country.backToMarkets')}
            </Link>
            <SectionEyebrow tone="brand">{t('markets.country.eyebrow')} · {profile.code}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('markets.country.title', { country })}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">
              {t('markets.country.lead', {
                enforcement: profile.enforcementIntensity,
                strictness: profile.strictnessScore,
              })}
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Weights — a relative picture, so the bars are scaled to this market's
          own maximum rather than to 10. The number stays visible next to it. */}
      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[820px]">
            <h2 className="font-serif text-[1.75rem] font-semibold text-fg">{t('markets.country.weightsTitle')}</h2>
            <p className="mt-2 text-body text-fg-secondary">{t('markets.country.weightsLead')}</p>
            <ul className="mt-8 space-y-3">
              {profile.weights.map((w) => (
                <li key={w.domainSlug} className="grid grid-cols-[minmax(0,200px)_1fr_auto] items-center gap-4">
                  <span className="truncate text-body-sm font-semibold text-fg">{domainLabel(w.domainSlug)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${Math.round((w.weight / maxWeight) * 100)}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-body-xs text-fg-tertiary">{w.weight}/10</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section className="bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[820px]">
            <h2 className="font-serif text-[1.75rem] font-semibold text-fg">{t('markets.country.obligationsTitle')}</h2>
            <p className="mt-2 text-body text-fg-secondary">{t('markets.country.obligationsLead')}</p>

            <div className="mt-8 space-y-8">
              {profile.byDomain.map((group) => (
                <div key={group.domainSlug}>
                  <p className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                    {domainLabel(group.domainSlug)}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {group.items.map((o) => (
                      <li key={o.subdomainId} className="rounded-xl border border-stroke-subtle bg-surface p-5">
                        {/* The engine's label is the English fallback; the statute
                            in `source` below stays in its original form either
                            way — a law's name is a proper noun. */}
                        <p className="text-body-md font-bold text-fg">
                          {t(`markets.obligations.${o.subdomainId}`, { defaultValue: o.label })}
                        </p>
                        <p className="mt-1.5 text-body-xs leading-relaxed text-fg-secondary">
                          <span className="text-fg-tertiary">{t('markets.country.sourceLabel')}: </span>
                          {o.source}
                          {o.eurLexUrl && (
                            <>
                              {' '}
                              <a
                                href={o.eurLexUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-fg-brand underline decoration-dotted underline-offset-2 hover:decoration-solid"
                              >
                                EUR-Lex <ExternalLink size={11} />
                              </a>
                            </>
                          )}
                        </p>
                        <p className="mt-1 text-body-2xs text-fg-tertiary">
                          {t('markets.country.dueLabel')}: {t(`markets.cadence.${o.due}`, { defaultValue: o.due })}
                          {o.dueDays != null && <> · {t('markets.country.leadTime', { days: o.dueDays })}</>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Honest about the gap rather than implying completeness. */}
            <p className="mt-8 text-body-sm leading-relaxed text-fg-tertiary">
              {t('markets.country.coverageNote', { country, count: profile.obligations.length })}
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-[1.75rem] font-semibold leading-tight text-fg">
              {t('markets.cta.title')}
            </h2>
            <p className="text-body leading-relaxed text-fg-secondary">{t('markets.cta.lead')}</p>
            <Button
              size="lg"
              variant="primary"
              className="mt-2"
              onClick={() => navigate(`/${locale ?? 'en'}/wizard`)}
            >
              {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
              <ArrowRight size={17} className="ml-1.5" />
            </Button>
          </Reveal>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
