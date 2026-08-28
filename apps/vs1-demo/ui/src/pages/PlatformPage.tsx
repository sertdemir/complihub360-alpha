import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Award, CheckCircle2, Clock, FileText, Link2, Mail, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { SiteFooter } from '../components/home';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';

// ─── /platform · Die Partnerseite ────────────────────────────────────────────
// Rebuilt 2026-08-28 (canvas "Partnerseite": P1 A, P2 A, P3 C, P4 C without a
// Gradient, P5 B).
//
// What the page WAS: four sections built four different ways, with its OWN
// anchor bar and its OWN mini footer instead of the site's. Three of those four
// sections explained the AI engine, the matching funnel and market coverage —
// to CUSTOMERS. Every one of them now has a better home: the engine and its
// gates are the Trust Center, the orchestration is /how-it-works, the coverage
// is /markets. Told a fourth time here they were not depth, they were drift.
//
// What it IS now: the partner pitch alone, which is what the footer entry has
// promised since the IA rebuild — one audience, one question ("is a mandate
// from here worth your time?"), five sections answering it. The engine survives
// as the ARGUMENT rather than the topic: what reaches a partner is a dossier
// this engine produced.
//
// The apply CTA points at /contact, and that is not a shortcut. Providers are
// recruited offline and onboard through the token-gated intake link (v2 §10/D7,
// see ProviderIntakePage) — there is NO partner self-registration. The old
// button pointed at /register?intent=partner, which set nothing: the register
// flow ignores that parameter and bounces the partner role to /provider-intake,
// where a visitor without a token meets an invite-only notice. Naming the real
// route beats sending an applicant into a wall.
//
// Copy: common.json → platform.* (en/de/es/tr).

const BENEFITS = [
  { id: 'dossier', icon: FileText },
  { id: 'magicLink', icon: Link2 },
  { id: 'merit', icon: TrendingUp },
] as const;

/** Der Magic-Link-Weg, vier Schritte auf dem Zeitstrahl. */
const FLOW = [
  { id: 'dossier', icon: FileText },
  { id: 'mail', icon: Mail },
  { id: 'view', icon: CheckCircle2 },
  { id: 'reply', icon: Clock },
] as const;

/** Zwei Fristen und zwei Folgen — was verlangt wird, was es bringt. */
const RULES = [
  { id: 'confirm', icon: Clock },
  { id: 'answer', icon: Mail },
  { id: 'priority', icon: Award },
  { id: 'demotion', icon: TrendingDown },
] as const;

const INTAKE_STEPS = ['apply', 'vetting', 'activation'] as const;

export function PlatformPage() {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage || 'en';
  const localize = (href: string) => `/${locale}${href}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <main>
        {/* ── P1 · Hero auf dem Gradient (Variante A) ──────────────────────
            613px wie site-weit, mit der schwebenden Karte darunter: die drei
            Zahlen, die ein Partner als Erstes wissen will. */}
        <section className="flex flex-col justify-center bg-gradient-stage pb-24 pt-32 lg:min-h-[38.3125rem] lg:pb-28 lg:pt-40">
          <Container size="xl">
            <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
              <SectionEyebrow tone="brand">{t('platform.hero.eyebrow')}</SectionEyebrow>
              <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
                {t('platform.hero.titlePre')}
                <GoldWord>{t('platform.hero.titleGold')}</GoldWord>
                {t('platform.hero.titlePost')}
              </h1>
              <p className="text-body-lg leading-relaxed text-fg-secondary">{t('platform.hero.lead')}</p>
            </Reveal>
          </Container>
        </section>

        <Container size="xl" className="relative z-10 -mt-14">
          <Reveal delay={0.1} className="mx-auto max-w-[1040px]">
            <div className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-32px_rgba(2,22,17,0.35)] dark:bg-surface-secondary lg:px-8">
              <div className="grid grid-cols-1 gap-y-7 sm:grid-cols-3 sm:divide-x sm:divide-stroke-subtle">
                {(['confirm', 'answer', 'fee'] as const).map((k) => (
                  <div key={k} className="min-w-0 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                    <p className="font-serif text-[1.5rem] font-bold tabular-nums text-fg">
                      {t(`platform.hero.facts.${k}.value`)}
                    </p>
                    <p className="mt-2 text-body-sm font-bold leading-snug text-fg">
                      {t(`platform.hero.facts.${k}.label`)}
                    </p>
                    <p className="mt-1 text-body-xs leading-snug text-fg-tertiary">
                      {t(`platform.hero.facts.${k}.note`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>

        {/* ── P2 · Was bei Ihnen ankommt (Variante A) ──────────────────────
            Drei Karten, Icons ohne Rahmen und ohne Kachel (Konvention). */}
        <section className="bg-surface py-20 lg:py-24">
          <Container size="xl">
            <Reveal className="max-w-[660px]">
              <SectionEyebrow tone="brand">{t('platform.arrives.eyebrow')}</SectionEyebrow>
              <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                {t('platform.arrives.title')}
              </h2>
              <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">
                {t('platform.arrives.lead')}
              </p>
            </Reveal>

            <Stagger className="mt-8 grid gap-5 md:grid-cols-3">
              {BENEFITS.map(({ id, icon: Icon }) => (
                <StaggerItem key={id}>
                  <div className="h-full rounded-xl border border-stroke-subtle bg-surface p-6 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)]">
                    <Icon size={32} strokeWidth={1.6} className="text-brand" aria-hidden />
                    <h3 className="mt-4 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                      {t(`platform.benefit.${id}.title`)}
                    </h3>
                    <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
                      {t(`platform.benefit.${id}.desc`)}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>

        {/* ── P3 · Der Magic-Link-Weg (Variante C) ─────────────────────────
            Zeitstrahl: eine Hairline durch die Reihe, die Icons sitzen als
            Kreise darauf. */}
        <section className="bg-surface pb-20 lg:pb-24">
          <Container size="xl">
            <Reveal className="max-w-[660px]">
              <SectionEyebrow tone="brand">{t('platform.flow.eyebrow')}</SectionEyebrow>
              <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                {t('platform.flow.title')}
              </h2>
              <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">{t('platform.flow.lead')}</p>
            </Reveal>

            <div className="relative mt-10">
              {/* Die Linie verbindet die Kreis-MITTEN, nicht die Container-
                  raender: 1.6875rem ist der halbe Kreis (54px), und der letzte
                  Kreis sitzt am Anfang der vierten von vier gleich breiten
                  Spalten — also endet die Linie 25% minus einen halben Kreis
                  vor dem rechten Rand. Ohne das lief sie rechts rund 300px ins
                  Leere weiter. Nur auf breiten Schirmen: gestapelt haette eine
                  waagerechte Linie nichts zu verbinden. */}
              <div
                aria-hidden
                className="absolute left-[1.6875rem] right-[calc(25%-1.6875rem)] top-[1.6875rem] hidden h-px bg-stroke-subtle md:block"
              />
              <Stagger className="relative grid gap-9 md:grid-cols-4 md:gap-0">
                {FLOW.map(({ id, icon: Icon }, i) => (
                  <StaggerItem key={id} className="md:pr-7">
                    <div className="flex h-[3.375rem] w-[3.375rem] items-center justify-center rounded-full border border-stroke-subtle bg-surface">
                      <Icon size={24} strokeWidth={1.6} className="text-brand" aria-hidden />
                    </div>
                    <p className="mt-3.5 text-body-3xs font-extrabold uppercase tracking-[0.12em] tabular-nums text-accent-700 dark:text-fg-accent-strong">
                      {t('platform.flow.step', { num: `0${i + 1}`, defaultValue: 'Step {{num}}' })}
                    </p>
                    <p className="mt-1.5 text-body-md font-bold leading-snug text-fg">
                      {t(`platform.step.${id}.title`)}
                    </p>
                    <p className="mt-1.5 text-body-xs leading-snug text-fg-tertiary">
                      {t(`platform.step.${id}.desc`)}
                    </p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Container>
        </section>

        {/* ── P4 · Zusagen, Ranking, Abstufung (Variante C, ohne Gradient) ─
            Nutzerwahl 2026-08-28: die vier Karten auf Weiss — die getoente
            Flaeche steht erst im Schluss darunter. */}
        <section className="bg-surface pb-20 lg:pb-24">
          <Container size="xl">
            <Reveal className="mx-auto max-w-[660px] text-center">
              <SectionEyebrow tone="brand">{t('platform.rules.eyebrow')}</SectionEyebrow>
              <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                {t('platform.rules.title')}
              </h2>
              <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">{t('platform.rules.lead')}</p>
            </Reveal>

            <Stagger className="mt-9 grid gap-5 sm:grid-cols-2 desktop-s:grid-cols-4">
              {RULES.map(({ id, icon: Icon }) => (
                <StaggerItem key={id}>
                  <div className="h-full rounded-xl border border-stroke-subtle bg-surface p-6 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)]">
                    <Icon size={26} strokeWidth={1.6} className="text-brand" aria-hidden />
                    <h3 className="mt-4 font-serif text-[1.0625rem] font-bold leading-snug text-fg">
                      {t(`platform.rule.${id}.title`)}
                    </h3>
                    <p className="mt-2 text-body-xs leading-relaxed text-fg-tertiary">
                      {t(`platform.rule.${id}.desc`)}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <Reveal delay={0.15} className="mx-auto mt-9 max-w-[900px]">
              <p className="border-y border-accent-500/40 py-6 text-center text-body-md font-medium leading-relaxed text-fg">
                {t('platform.rules.creed')}
              </p>
            </Reveal>
          </Container>
        </section>

        {/* ── P5 · Aufnahme (Variante B) ───────────────────────────────────
            Schritte links, die getoente Karte mit dem CTA rechts. Der Weg
            fuehrt auf /contact — siehe Kopfkommentar: es gibt keine
            Partner-Selbstregistrierung. */}
        <section className="bg-surface pb-24">
          <Container size="xl">
            <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:items-stretch desktop-s:gap-12">
              <Reveal className="min-w-0 flex-1">
                <SectionEyebrow tone="brand">{t('platform.intake.eyebrow')}</SectionEyebrow>
                <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                  {t('platform.intake.title')}
                </h2>
                <div className="mt-6 divide-y divide-stroke-subtle border-y border-stroke-subtle">
                  {INTAKE_STEPS.map((id, i) => (
                    <div key={id} className="flex gap-4 py-4">
                      <span className="w-6 shrink-0 font-serif text-body-md font-bold tabular-nums text-accent-700 dark:text-fg-accent-strong">
                        {`0${i + 1}`}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-md font-bold text-fg">{t(`platform.intakeStep.${id}.title`)}</p>
                        <p className="mt-1 text-body-sm leading-relaxed text-fg-secondary">
                          {t(`platform.intakeStep.${id}.desc`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.1} className="w-full shrink-0 desktop-s:w-[380px]">
                <div className="flex h-full flex-col justify-center rounded-xl bg-gradient-stage p-8">
                  <h3 className="font-serif text-[1.25rem] font-bold leading-snug text-fg">
                    {t('platform.intake.ctaTitle')}
                  </h3>
                  <p className="mt-2.5 text-body-sm leading-relaxed text-fg-secondary">
                    {t('platform.intake.ctaBody')}
                  </p>
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate(localize('/contact'))}
                    >
                      {t('platform.intake.ctaButton')}
                      <ArrowRight size={16} className="ml-2" aria-hidden />
                    </Button>
                  </div>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
