import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';

// ─── /pricing ────────────────────────────────────────────────────────────────
// The page the marketing surface never had: the header's "Pricing" entry pointed
// at the HowItActs section (#engagement), which is about what a partner commits
// to after a match — not about what anything costs.
//
// Deliberately a USER-side page only. The provider tariff (lead fee, subscription,
// detail-open) is decided and implemented in billing.ts, but §11 P5 retired the
// provider marketing pages and the pricing decision says the subscription is set
// by an admin — "Provider werden offline/B2B verkauft, kein Self-Checkout". A
// public provider price list would contradict both, so this page answers only the
// question a visitor actually has: what does this cost me?
//
// The answer is "nothing", which is a weak page on its own — so it also names who
// pays instead, why the ranking cannot be bought, and what the specialist's own
// fee looks like. That last block is the honest part: the advice is not free.
//
// Copy: common.json → pricing.* (en/de/es/tr).

const FREE_COUNT = 3;

function Statement({ base }: { base: 'who' | 'ranking' | 'specialist' }) {
  const { t } = useTranslation('common');
  return (
    <Reveal className="border-t border-stroke-subtle py-10 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {t(`pricing.${base}.kicker`)}
      </span>
      <p className="mt-2 font-serif text-[1.75rem] font-bold leading-snug text-fg">
        {t(`pricing.${base}.title`)}
      </p>
      <p className="mt-3 max-w-[62ch] text-body leading-relaxed text-fg-secondary">
        {t(`pricing.${base}.body`)}
      </p>
    </Reveal>
  );
}

export function PricingPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();


  return (
    <main className="bg-surface">
      {/* The site header is fixed and ~113px tall at lg; each page clears it itself. */}
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-20 pt-32 lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('pricing.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('pricing.title.pre')}
              <GoldWord>{t('pricing.title.gold')}</GoldWord>
              {t('pricing.title.post')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('pricing.lead')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[980px]">
            <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('pricing.free.kicker')}
            </span>
            <h2 className="mt-2 font-serif text-[1.75rem] font-semibold text-fg">{t('pricing.free.title')}</h2>
          </Reveal>
          <Stagger className="mx-auto mt-8 grid max-w-[980px] gap-4 md:grid-cols-3">
            {Array.from({ length: FREE_COUNT }, (_, i) => (
              <StaggerItem key={i}>
                <div className="flex h-full flex-col rounded-2xl border border-stroke-subtle bg-surface p-6">
                  <p className="font-serif text-[1.125rem] font-bold leading-snug text-fg">
                    {t(`pricing.free.items.${i}.title`)}
                  </p>
                  <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                    {t(`pricing.free.items.${i}.desc`)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      <section className="bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <div className="mx-auto max-w-[820px]">
            <Statement base="who" />
            <Statement base="ranking" />
            <Statement base="specialist" />
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-24">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-[1.875rem] font-semibold leading-tight text-fg">
              {t('pricing.cta.title')}
            </h2>
            <p className="text-body leading-relaxed text-fg-secondary">{t('pricing.cta.lead')}</p>
            <Button size="lg" variant="primary" className="mt-2" onClick={() => navigate(`/${locale ?? 'en'}/wizard`)}>
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
