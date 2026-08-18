import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { DOMAINS } from '../lib/domains';
import { listMarkets } from '../lib/marketProfiles';

// ─── /resources ──────────────────────────────────────────────────────────────
// Rebuilt on 2026-08-18. The previous page presented three customer stories with
// named companies and outcomes ("NordicHealth GmbH … confirmed registration
// within 3 days"), four guides with read times and publication dates, and a
// "living knowledge base" that "automatically maintains" itself — under the
// headline "Real compliance outcomes, not marketing claims". None of it existed:
// the platform has no customers yet, no guide had a page behind it, and there is
// no content pipeline. Fabricated references are worse than an empty page, and
// the brand doctrine forbids exactly this ("avoids overpromising").
//
// So this page points at what is real and verifiable instead, and says plainly
// what is missing. The counts are derived from the same sources the pages
// themselves use — a hardcoded "8 markets" would rot the first time the engine
// gains one.
//
// Copy: common.json → resources.* (en/de/es/tr).

type EntryKey = 'markets' | 'compliance' | 'howItWorks';

const ENTRY_PATHS: Record<EntryKey, string> = {
  markets: 'markets',
  compliance: 'compliance',
  howItWorks: 'how-it-works',
};

export function ResourcesPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();
  const lng = locale ?? 'en';

  useEffect(() => {
    document.title = t('resources.meta.title');
  }, [t]);

  // Derived, not written down: the stage count comes from the copy that renders
  // the stages, so the three numbers cannot drift apart from what they describe.
  const stages = t('howItWorks.stages', { returnObjects: true });
  const counts = {
    markets: listMarkets().length,
    domains: DOMAINS.length,
    stages: Array.isArray(stages) ? stages.length : 5,
  };

  const entries: EntryKey[] = ['markets', 'compliance', 'howItWorks'];

  return (
    <main className="bg-surface">
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-20 pt-32 lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('resources.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('resources.title.pre')}
              <GoldWord>{t('resources.title.gold')}</GoldWord>
              {t('resources.title.post')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('resources.lead')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Stagger className="mx-auto grid max-w-[1040px] gap-4 md:grid-cols-3">
            {entries.map((key) => (
              <StaggerItem key={key}>
                <Link
                  to={`/${lng}/${ENTRY_PATHS[key]}`}
                  className="group flex h-full flex-col rounded-2xl border border-stroke-subtle bg-surface p-6 transition-colors hover:border-stroke-brand"
                >
                  <p className="font-serif text-[1.25rem] font-bold leading-snug text-fg">
                    {t(`resources.entries.${key}.title`)}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-tertiary">
                    {t(`resources.entries.${key}.meta`, counts)}
                  </p>
                  <p className="mt-3 flex-1 text-body-sm leading-relaxed text-fg-secondary">
                    {t(`resources.entries.${key}.desc`)}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-body-sm font-semibold text-fg-brand">
                    {t(`resources.entries.${key}.cta`)}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* Naming the gap is the point: it is what keeps the three entries above
          credible. */}
      <section className="bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[760px]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('resources.gap.kicker')}
            </span>
            <p className="mt-2 font-serif text-[1.75rem] font-bold leading-snug text-fg">
              {t('resources.gap.title')}
            </p>
            <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('resources.gap.body')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 lg:py-24">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-[1.875rem] font-semibold leading-tight text-fg">
              {t('resources.cta.title')}
            </h2>
            <p className="text-body leading-relaxed text-fg-secondary">{t('resources.cta.lead')}</p>
            <Button size="lg" variant="primary" className="mt-2" onClick={() => navigate(`/${lng}/wizard`)}>
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
