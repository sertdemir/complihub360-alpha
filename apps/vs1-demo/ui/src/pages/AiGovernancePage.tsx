import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Brain, Check, Eye, EyeOff, Globe, Lock, Scale, Server, ShieldCheck, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { Section } from '../components/ui/Section';
import { SiteFooter } from '../components/home';
import { HowOrchestrationWorks, RailDossier, type RailItem } from '../components/compliance-areas';
import { SectionEyebrow, GoldWord, Reveal } from '../components/providers/SectionHeading';

// ─── /ai-governance · the Trust Center ───────────────────────────────────────
// Redesigned 2026-08-28 (canvas "Trust Center · Redesign": G1 A, G2 A, G3 B,
// G4 A, G5 A). What the page was: a white hero off the shared height, boxed
// icon tiles, the behaviour promises as a plain bullet list, the active AI
// features on a DARK band in the middle of the page — the last one on the
// site — and no close at all before the footer.
//
// What it is now: the Gradient hero with the floating figure card, the
// promises as two columns of hairline rows under the principle they serve,
// the six dimensions in the shared RailDossier (hover opens, like the roles
// rail and the related-areas accordion), the features as white cards on a
// full-bleed Gradient, and the site's own light close.
//
// Copy: common.json → aiGov.* (en/de/es/tr).

const DIMENSIONS = [
  { id: 'ethics', icon: Scale },
  { id: 'transp', icon: Eye },
  { id: 'org', icon: Users },
  { id: 'tech', icon: Server },
  { id: 'reg', icon: Globe },
  { id: 'risk', icon: ShieldCheck },
];

const FEATURES = [
  { id: 'Privacy', icon: EyeOff },
  { id: 'Intent', icon: Brain },
  { id: 'Gate', icon: Lock },
];

const PROMISE_COUNT = 6;

// The three figures the hero floats. Literals, and each one is a promise the
// page below substantiates: six dimensions, three gates, no PII in the model.
const HERO_FACTS = [
  { value: '6', key: 'dimensions' },
  { value: '3', key: 'gates' },
  { value: '0', key: 'pii' },
];

export function AiGovernancePage() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const { locale } = useParams();
  const startAssessment = () => navigate(`/${locale ?? 'en'}/wizard`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const promises = t('aiGov.behaviour.items', { returnObjects: true }) as string[];

  const items: RailItem[] = DIMENSIONS.map((d, i) => ({
    id: d.id,
    label: t(`aiGov.dim${d.id[0].toUpperCase()}${d.id.slice(1)}Title`),
    sub: t('aiGov.dimCounter', { num: i + 1, total: DIMENSIONS.length, defaultValue: 'Dimension {{num}} of {{total}}' }),
  }));

  return (
    <main className="bg-surface">
      {/* ── 1 · Hero on the full-bleed Gradient (G1 · Variante A) ─────────── */}
      <section className="flex flex-col justify-center bg-gradient-stage pb-24 pt-32 lg:min-h-[38.3125rem] lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('aiGov.trustCenter')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('aiGov.hero.titlePre')}
              <GoldWord>{t('aiGov.hero.titleGold')}</GoldWord>
              {t('aiGov.hero.titlePost')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('aiGov.hero.lead')}</p>
          </Reveal>
        </Container>
      </section>

      <Container size="xl" className="relative z-10 -mt-14">
        <Reveal delay={0.1} className="mx-auto max-w-[1040px]">
          <div className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-32px_rgba(2,22,17,0.35)] dark:bg-surface-secondary lg:px-8">
            <div className="grid grid-cols-1 gap-y-7 sm:grid-cols-3 sm:divide-x sm:divide-stroke-subtle">
              {HERO_FACTS.map((f) => (
                <div key={f.key} className="min-w-0 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                  <p className="font-serif text-[1.625rem] font-bold leading-none tabular-nums text-fg">
                    {f.value}
                  </p>
                  <p className="mt-2 text-body-sm font-bold text-fg">{t(`aiGov.hero.facts.${f.key}.label`)}</p>
                  <p className="mt-1 text-body-xs leading-snug text-fg-tertiary">
                    {t(`aiGov.hero.facts.${f.key}.note`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>

      {/* ── 2 · How the AI behaves (G2 · Variante A) ──────────────────────── */}
      {/* The promises were a bullet list; two columns of hairline rows give
          each one its own line without turning six sentences into six cards. */}
      <Section className="pb-16 pt-14 desktop-s:pb-20 desktop-s:pt-16" spacing="none">
        <Reveal className="max-w-[660px]">
          <SectionEyebrow tone="brand">{t('aiGov.behaviour.kicker')}</SectionEyebrow>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
            {t('aiGov.behaviour.title')}
          </h2>
          <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('aiGov.behaviour.lead')}</p>
        </Reveal>
        <div className="mt-8 grid gap-x-14 tablet:grid-cols-2">
          {Array.from({ length: PROMISE_COUNT }, (_, i) => (
            <Reveal
              key={i}
              delay={0.06 * i}
              className="flex gap-3 border-t border-stroke-subtle py-3.5"
            >
              <Check size={16} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
              <p className="text-body-sm leading-relaxed text-fg-secondary">{promises?.[i]}</p>
            </Reveal>
          ))}
        </div>
        {/* The principle closes the section between gold hairlines — the one
            sentence the six promises are derived from. */}
        <Reveal delay={0.3} className="mt-9 border-y border-accent-500/40 py-7 text-center">
          <p className="mx-auto max-w-[760px] font-serif text-[1.25rem] font-bold leading-snug text-fg">
            {t('aiGov.behaviour.principle')}
          </p>
        </Reveal>
      </Section>

      {/* ── 3 · The six dimensions (G3 · Variante B) ──────────────────────── */}
      {/* The shared rail and dossier — hover opens, exactly as on the roles
          rail and the related-areas accordion. */}
      <Section className="pb-16 pt-4 desktop-s:pb-20 desktop-s:pt-6" spacing="none">
        <Reveal className="max-w-[660px]">
          <SectionEyebrow tone="brand">{t('aiGov.dimEyebrow')}</SectionEyebrow>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
            {t('aiGov.dimTitle')}
          </h2>
          <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('aiGov.dimDesc')}</p>
        </Reveal>
        <RailDossier
          items={items}
          railWidthClass="desktop-s:w-[340px]"
          openOnHover
          renderCard={(item) => {
            const dim = DIMENSIONS.find((d) => d.id === item.id)!;
            const Icon = dim.icon;
            const cap = `${dim.id[0].toUpperCase()}${dim.id.slice(1)}`;
            const index = DIMENSIONS.indexOf(dim) + 1;
            return (
              <div className="w-full rounded-[14px] bg-surface p-6 shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.12em] text-accent-700 dark:text-fg-accent-strong">
                      {t('aiGov.dimCounter', {
                        num: index,
                        total: DIMENSIONS.length,
                        defaultValue: 'Dimension {{num}} of {{total}}',
                      })}
                    </p>
                    <h3 className="mt-3 font-serif text-[1.5rem] font-semibold leading-tight text-fg">
                      {t(`aiGov.dim${cap}Title`)}
                    </h3>
                    <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-fg-secondary">
                      {t(`aiGov.dim${cap}Desc`)}
                    </p>
                  </div>
                  {/* Pure brand icon, no tile — the site's icon convention. */}
                  <Icon
                    size={64}
                    strokeWidth={1.5}
                    aria-hidden
                    className="hidden shrink-0 text-fg-brand desktop-s:block"
                  />
                </div>
              </div>
            );
          }}
        />
      </Section>

      {/* ── 4 · The active AI features (G4 · Variante A) ──────────────────── */}
      {/* The dark band retires here — the last one on the site. White cards on
          the full-bleed Gradient, pure icons, no tiles. */}
      <section className="bg-gradient-stage py-16 desktop-s:py-20">
        <Container size="xl">
          <Reveal className="max-w-[660px]">
            <SectionEyebrow tone="brand">{t('aiGov.featEyebrow')}</SectionEyebrow>
            <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
              {t('aiGov.featTitle')}
            </h2>
            <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('aiGov.featDesc')}</p>
          </Reveal>
          <div className="mt-9 grid grid-cols-1 gap-4 tablet:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal
                  key={f.id}
                  delay={0.1 + i * 0.1}
                  className="flex flex-col rounded-xl bg-surface p-6 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary"
                >
                  <Icon size={38} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />
                  <span className="mt-3.5 font-serif text-[1.1875rem] font-bold leading-snug text-fg">
                    {t(`aiGov.feat${f.id}Title`)}
                  </span>
                  <p className="mt-2 text-body-xs leading-relaxed text-fg-secondary">
                    {t(`aiGov.feat${f.id}Desc`)}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── 5 · The close · the site's light orchestration block ──────────── */}
      <Section className="py-10 desktop-s:py-12" spacing="none">
        <HowOrchestrationWorks
          cta={
            <div className="flex flex-col gap-6 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-10">
              <div className="max-w-[560px]">
                <h3 className="font-serif text-[1.375rem] font-bold leading-snug text-fg">
                  {t('compliance.area.ctaTitle', 'Ready to see what applies to you?')}
                </h3>
                <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('aiGov.ctaBody')}</p>
              </div>
              <Button size="lg" variant="primary" className="shrink-0" onClick={startAssessment}>
                {t('solutions.cta.btnAssessment')}
                <ArrowRight size={17} className="ml-1.5" />
              </Button>
            </div>
          }
        />
      </Section>

      <SiteFooter />
    </main>
  );
}
