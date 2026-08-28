import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BarChart3, Brain, Globe, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { Section } from '../components/ui/Section';
import { SiteFooter } from '../components/home';
import { HowOrchestrationWorks, RailDossier, type RailItem } from '../components/compliance-areas';
import { SectionEyebrow, GoldWord, Reveal } from '../components/providers/SectionHeading';

// ─── /solutions · "Für wen" ──────────────────────────────────────────────────
// Redesigned 2026-08-28 (canvas "Für wen · Redesign": W1 A, W2 A, W3 A on the
// full-bleed Gradient, W4 B, W5 A). What the page was: three sections built
// three different ways, four black panels, three separate stat rows, a sticky
// anchor bar under a header it did not fit, a dark closing band — and its OWN
// mini footer instead of the site's.
//
// What it is now: one hero that names the three roles, ONE instrument that
// carries all three (the rail and dossier of the obligations explorer, shared
// as RailDossier since 2026-08-28 — the same widget, not a lookalike), the
// four-step path on the Gradient, the numbers as one quiet gold-hairline row,
// and the site's own light close plus the real SiteFooter.
//
// Copy: common.json → solutions.* (en/de/es/tr). Nothing is authored here; the
// role dossiers read the pains, cards and benefits the page already had.

const ROLE_IDS = ['founders', 'operations', 'counsel'] as const;
type RoleId = (typeof ROLE_IDS)[number];

const ANCHOR_KEY: Record<RoleId, string> = {
  founders: 'solutions.anchorFounders',
  operations: 'solutions.anchorOperations',
  counsel: 'solutions.anchorCounsel',
};

/** Which three lines each role's dossier lists — keys the page already had. */
const ROLE_ROWS: Record<RoleId, { title: string; body: string }[]> = {
  founders: [
    { title: 'pain1Title', body: 'pain1Desc' },
    { title: 'pain2Title', body: 'pain2Desc' },
    { title: 'pain3Title', body: 'pain3Desc' },
  ],
  operations: [
    { title: 'card1Title', body: 'card1Solution' },
    { title: 'card2Title', body: 'card2Solution' },
    { title: 'card3Title', body: 'card3Solution' },
  ],
  counsel: [
    { title: 'benefit1Title', body: 'benefit1Desc' },
    { title: 'benefit2Title', body: 'benefit2Desc' },
    { title: 'benefit3Title', body: 'benefit3Desc' },
  ],
};

// The figures each dossier closes on. The values are literals — a promised SLA
// and measured shares, not engine output; the labels are the page's own keys.
const ROLE_STATS: Record<RoleId, { value: string; labelKey: string }[]> = {
  founders: [
    { value: '4–5', labelKey: 'solutions.founders.stat1Label' },
    { value: '24h', labelKey: 'solutions.founders.stat2Label' },
    { value: '48h', labelKey: 'solutions.founders.stat3Label' },
  ],
  operations: [
    { value: '100 %', labelKey: 'solutions.operations.stat1Label' },
    { value: '1', labelKey: 'solutions.operations.stat2Label' },
    { value: '∞', labelKey: 'solutions.operations.stat3Label' },
  ],
  counsel: [
    { value: '100 %', labelKey: 'solutions.counsel.stat1Label' },
    { value: '100 %', labelKey: 'solutions.counsel.stat2Label' },
  ],
};

const PATH_STEPS = [
  { icon: Globe, key: 'node1' },
  { icon: Brain, key: 'node2' },
  { icon: BarChart3, key: 'node3' },
  { icon: Users, key: 'node4' },
];

// The four figures that hold whatever the role: the SLA the watchdog enforces
// and the share the privacy gate masks.
const PAGE_STATS = [
  { value: '4–5', labelKey: 'solutions.founders.stat1Label' },
  { value: '24h', labelKey: 'solutions.founders.stat2Label' },
  { value: '48h', labelKey: 'solutions.founders.stat3Label' },
  { value: '100 %', labelKey: 'solutions.counsel.stat1Label' },
];

export function SolutionsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useParams();
  const startAssessment = () => navigate(`/${locale ?? 'en'}/wizard`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const items: RailItem[] = ROLE_IDS.map((id) => ({
    id,
    label: t(ANCHOR_KEY[id]),
    sub: t(`solutions.${id}.railSub`),
  }));

  return (
    <main className="bg-surface">
      {/* ── 1 · Hero on the full-bleed Gradient (W1 · Variante A) ─────────── */}
      <section className="flex flex-col justify-center bg-gradient-stage pb-24 pt-32 lg:min-h-[38.3125rem] lg:pb-28 lg:pt-40">
        <Container size="xl">
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow tone="brand">{t('solutions.hero.eyebrow')}</SectionEyebrow>
            <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
              {t('solutions.hero.titlePre')}
              <GoldWord>{t('solutions.hero.titleGold')}</GoldWord>
              {t('solutions.hero.titlePost')}
            </h1>
            <p className="text-body-lg leading-relaxed text-fg-secondary">{t('solutions.hero.lead')}</p>
          </Reveal>
        </Container>
      </section>

      {/* The floating role card — the hub hero's anatomy, its three cells
          naming the three roles instead of KPIs. */}
      <Container size="xl" className="relative z-10 -mt-14">
        <Reveal delay={0.1} className="mx-auto max-w-[1040px]">
          <div className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-32px_rgba(2,22,17,0.35)] dark:bg-surface-secondary lg:px-8">
            <div className="grid grid-cols-1 gap-y-7 sm:grid-cols-3 sm:divide-x sm:divide-stroke-subtle">
              {ROLE_IDS.map((id, i) => (
                <div key={id} className="min-w-0 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                  <p className="text-body-3xs font-extrabold uppercase tracking-[0.12em] tabular-nums text-accent-700 dark:text-fg-accent-strong">
                    {t('solutions.hero.roleKicker', { num: `0${i + 1}`, defaultValue: 'Role {{num}}' })}
                  </p>
                  <p className="mt-2.5 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                    {t(ANCHOR_KEY[id])}
                  </p>
                  <p className="mt-1.5 text-body-xs leading-snug text-fg-tertiary">
                    {t(`solutions.${id}.railSub`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>

      {/* ── 2 · The three roles in ONE instrument (W2 · Variante A) ───────── */}
      <Section className="pb-16 pt-14 desktop-s:pb-20 desktop-s:pt-16" spacing="none">
        <Reveal className="max-w-[620px]">
          <SectionEyebrow tone="brand">{t('solutions.roles.eyebrow')}</SectionEyebrow>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
            {t('solutions.roles.title')}
          </h2>
        </Reveal>
        <RailDossier
          items={items}
          railWidthClass="desktop-s:w-[340px]"
          // Three roles, so hovering opens — the related-areas accordion's
          // behaviour (user ask 2026-08-28): sweep the rail and read, no
          // click needed. The duty explorer keeps its click, see RailDossier.
          openOnHover
          renderCard={(item) => {
            const id = item.id as RoleId;
            return (
              <div className="w-full rounded-[14px] bg-surface p-6 shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary sm:p-8">
                <p className="text-body-3xs font-bold uppercase tracking-[0.12em] text-accent-700 dark:text-fg-accent-strong">
                  {t(`solutions.${id}.overline`)}
                </p>
                <h3 className="mt-3 font-serif text-[1.5rem] font-semibold leading-tight text-fg">
                  {t(`solutions.${id}.title`)}
                </h3>
                <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-fg-secondary">
                  {t(`solutions.${id}.body`)}
                </p>

                <div className="mt-6 divide-y divide-stroke-subtle border-y border-stroke-subtle">
                  {ROLE_ROWS[id].map((row) => (
                    <div key={row.title} className="py-3.5">
                      <p className="text-body-sm font-bold leading-snug text-fg">
                        {t(`solutions.${id}.${row.title}`)}
                      </p>
                      <p className="mt-1 text-body-2xs leading-relaxed text-fg-tertiary">
                        {t(`solutions.${id}.${row.body}`)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* The figures stand with the claim they back, not in a wall of
                    their own — the page-wide row below carries only what holds
                    for every role. */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-7 gap-y-4">
                  <div className="flex flex-wrap items-baseline gap-x-7 gap-y-3">
                    {ROLE_STATS[id].map((s) => (
                      <span key={s.labelKey} className="inline-flex items-baseline gap-2">
                        <span className="font-serif text-[1.375rem] font-bold tabular-nums text-fg">
                          {s.value}
                        </span>
                        <span className="text-body-2xs text-fg-tertiary">{t(s.labelKey)}</span>
                      </span>
                    ))}
                  </div>
                  {/* The card's own entry point is a real Button, not a text
                      link (user ask 2026-08-28) — it carries the same weight
                      as the page's closing CTA. */}
                  <Button size="sm" variant="primary" className="shrink-0" onClick={startAssessment}>
                    {t('solutions.cta.btnAssessment')}
                    <ArrowRight size={15} className="ml-1.5" />
                  </Button>
                </div>
              </div>
            );
          }}
        />
      </Section>

      {/* ── 3 · The path, on the full-bleed Gradient (W3 · Variante A) ────── */}
      {/* Pure brand icons, no tile and no frame — the site's icon convention
          since the hub's step cards. */}
      <section className="bg-gradient-stage py-16 desktop-s:py-20">
        <Container size="xl">
          <Reveal className="max-w-[660px]">
            <SectionEyebrow tone="brand">{t('solutions.path.eyebrow')}</SectionEyebrow>
            <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
              {t('solutions.path.title')}
            </h2>
            <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('solutions.path.lead')}</p>
          </Reveal>
          <div className="mt-9 grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop-s:grid-cols-4">
            {PATH_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal
                  key={step.key}
                  delay={0.1 + i * 0.1}
                  className="flex flex-col rounded-xl bg-surface p-5 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary desktop-s:p-6"
                >
                  <div className="mb-3.5 flex items-center gap-3">
                    <Icon size={38} strokeWidth={1.6} className="shrink-0 text-fg-brand" aria-hidden />
                    <span className="text-body-3xs font-bold uppercase tracking-[0.1em] tabular-nums text-fg-brand">
                      {t('compliance.howItWorks.stepLabel', 'Step {{num}}', { num: i + 1 })}
                    </span>
                  </div>
                  <span className="font-serif text-[1.1875rem] font-bold leading-snug text-fg">
                    {t(`solutions.founders.${step.key}Label`)}
                  </span>
                  <p className="mt-2 text-body-xs leading-relaxed text-fg-secondary">
                    {t(`solutions.founders.${step.key}Desc`)}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── 4 · The numbers, as one quiet row (W4 · Variante B) ───────────── */}
      <Section className="py-16 desktop-s:py-20" spacing="none">
        <Reveal className="mx-auto max-w-[900px] text-center">
          <SectionEyebrow tone="brand">{t('solutions.stats.eyebrow')}</SectionEyebrow>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
            {t('solutions.stats.title')}
          </h2>
          <div className="mt-9 grid grid-cols-2 gap-y-8 border-y border-accent-500/40 py-9 tablet:grid-cols-4 tablet:divide-x tablet:divide-stroke-subtle">
            {PAGE_STATS.map((s) => (
              <div key={s.labelKey} className="min-w-0 px-5 text-left">
                <p className="font-serif text-[2.25rem] font-bold leading-none tabular-nums text-fg">
                  {s.value}
                </p>
                <p className="mt-2.5 text-body-xs leading-snug text-fg-tertiary">{t(s.labelKey)}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-body-xs text-fg-tertiary">{t('solutions.stats.note')}</p>
        </Reveal>
      </Section>

      {/* ── 5 · The close · the site's light orchestration block ──────────── */}
      <Section className="py-10 desktop-s:py-12" spacing="none">
        <HowOrchestrationWorks
          cta={
            <div className="flex flex-col gap-6 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-10">
              <div className="max-w-[560px]">
                <h3 className="font-serif text-[1.375rem] font-bold leading-snug text-fg">
                  {t('solutions.cta.title')}
                </h3>
                <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
                  {t('solutions.cta.body')}
                </p>
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
