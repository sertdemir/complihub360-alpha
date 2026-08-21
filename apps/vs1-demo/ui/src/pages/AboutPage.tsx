import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';

// ─── /about ──────────────────────────────────────────────────────────────────
// Built 2026-08-20 from the Developer DNA & Website Audit Addendum V2 (section 8,
// docs/brand/). It was the addendum's first P0: Why We Exist, Purpose, Mission
// and Vision had no home anywhere on the public site, while the footer already
// linked "Über uns" — to href="#". So the link existed and the page did not.
//
// Deliberately NOT on the homepage hero. The addendum is explicit that the four
// statements belong here and that the homepage stays simple; at most it may
// carry one short pointer to this page.
//
// The copy follows the addendum closely rather than paraphrasing it — these are
// brand statements, not marketing prose, and they are the master wording.
//
// Copy: common.json → about.* (en/de/es/tr).

type PillarKey = 'purpose' | 'mission' | 'vision';

const PILLARS: PillarKey[] = ['purpose', 'mission', 'vision'];

export function AboutPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();
  const lng = locale ?? 'en';


  const principles = t('about.behave.items', { returnObjects: true });
  const behaviours: string[] = Array.isArray(principles) ? (principles as string[]) : [];

  return (
    <main className="bg-surface">
      <section className="border-b border-stroke-subtle bg-surface-secondary pb-20 pt-32 lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('about.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('about.title.pre')}
              <GoldWord>{t('about.title.gold')}</GoldWord>
              {t('about.title.post')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('about.lead')}</p>
          </Reveal>
        </Container>
      </section>

      {/* The statement is set larger than the paragraph on purpose: it is the
          sentence the whole company is derived from. */}
      <section className="py-16 lg:py-24">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[760px]">
            <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('about.why.kicker')}
            </span>
            <p className="mt-3 font-serif text-[1.75rem] font-bold leading-snug text-fg lg:text-[2rem]">
              {t('about.why.statement')}
            </p>
            <p className="mt-5 text-body leading-relaxed text-fg-secondary">{t('about.why.body')}</p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-surface-secondary py-16 lg:py-20">
        <Container size="xl">
          <Stagger className="mx-auto grid max-w-[1040px] gap-4 md:grid-cols-3">
            {PILLARS.map((key) => (
              <StaggerItem key={key}>
                <div className="flex h-full flex-col rounded-xl border border-stroke-subtle bg-surface p-6">
                  <p className="text-body-2xs font-semibold uppercase tracking-[0.12em] text-fg-brand">
                    {t(`about.${key}.title`)}
                  </p>
                  <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                    {t(`about.${key}.body`)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container size="xl">
          <Reveal className="mx-auto max-w-[760px]">
            <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {t('about.behave.kicker')}
            </span>
            <ul className="mt-5 flex flex-col gap-3">
              {behaviours.map((line) => (
                <li key={line} className="flex items-baseline gap-3">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span className="text-body leading-relaxed text-fg">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-10 border-t border-stroke-subtle pt-6 font-serif text-[1.25rem] leading-snug text-fg-secondary">
              {t('about.close')}
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-surface-secondary py-20 lg:py-24">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-[1.875rem] font-semibold leading-tight text-fg">
              {t('about.cta.title')}
            </h2>
            <p className="text-body leading-relaxed text-fg-secondary">{t('about.cta.lead')}</p>
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
