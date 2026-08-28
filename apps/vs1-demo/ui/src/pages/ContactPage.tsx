import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, HandHeart, LifeBuoy, Map, ShieldCheck, Tag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { FormField } from '../components/ui/FormField';
import { SiteFooter } from '../components/home';
import { FaqList } from '../components/home/HomeFaq';
import { Segment } from '../components/compliance-areas';
import { SectionEyebrow, GoldWord, Reveal } from '../components/providers/SectionHeading';

// ─── /contact · Kontakt und Support ──────────────────────────────────────────
// Built 2026-08-28 (canvas "Kontaktseite": K1 C, K2 A, K3 B on the full-bleed
// Gradient, K4 B, K5 B). The footer's 'contact' AND 'support' entries both
// point here, so the page sorts by WHAT SOMEONE WANTS, not by which department
// would own it: four lanes, one form, one promise per lane.
//
// Copy: common.json → contact.* (en/de/es/tr).

// ─── Was noch nicht echt ist ─────────────────────────────────────────────────
// Der Nutzer hat die Seite ausdrücklich MIT PLATZHALTERN bestellt (Entscheidung
// 2026-08-28): echte Adressen, Telefonnummer, Servicezeiten und Antwortzeit-
// Zusagen reicht er nach. Bis dahin steht hier NICHTS Erfundenes — die offenen
// Stellen tragen denselben gelben Chip wie die Legal-Seiten, damit niemand sie
// für echt hält, und der Absendeweg sagt selbst, dass er noch nicht angebunden
// ist, statt einen Versand vorzutäuschen.
//
// TODO(contact-live): drei Dinge machen die Seite echt —
//   1. CONTACT_ENDPOINT auf die reale Route setzen (unten),
//   2. die LANE-Adressen aus i18n mit echten Postfächern füllen,
//   3. contact.placeholders.* (Anschrift, Telefon, Servicezeiten) ersetzen.
// Danach fällt der Draft-Hinweis am Formular von selbst weg.
const CONTACT_ENDPOINT: string | null = null;

/** Wie in LegalPages.tsx: sichtbar offen, nicht heimlich erfunden. */
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-warning-bg px-1.5 py-0.5 font-mono text-[0.85em] text-warning-700 ring-1 ring-inset ring-warning-500/30">
      [{children}]
    </span>
  );
}

const LANE_IDS = ['support', 'sales', 'partner', 'privacy'] as const;
type LaneId = (typeof LANE_IDS)[number];

const LANE_ICON: Record<LaneId, typeof LifeBuoy> = {
  support: LifeBuoy,
  sales: Tag,
  partner: HandHeart,
  privacy: ShieldCheck,
};

const FASTER = [
  { id: 'assessment', icon: Map, href: '/wizard' },
  { id: 'faq', icon: BookOpen, href: '#faq' },
  { id: 'security', icon: ShieldCheck, href: '/ai-governance' },
] as const;

const AFTER_STEPS = ['ack', 'sort', 'answer'] as const;
const FAQ_IDS = ['human', 'legal', 'data', 'provider'] as const;

export function ContactPage() {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.resolvedLanguage || 'en';
  const localize = (href: string) => (href.startsWith('/') ? `/${locale}${href}` : href);

  // Tiefenlink fuer die Zubringer (Registrierungs-Weiche, Partnerseite):
  // /contact?lane=partner waehlt den Weg vor und scrollt zum Formular — ohne
  // das landete ein Bewerber oben im Hero und musste den Anbieter-Weg selbst
  // suchen (Nutzer-Befund 2026-08-29).
  const [params] = useSearchParams();
  const laneParam = params.get('lane');
  const initialLane: LaneId = LANE_IDS.includes(laneParam as LaneId) ? (laneParam as LaneId) : 'support';
  const [lane, setLane] = useState<LaneId>(initialLane);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (laneParam && LANE_IDS.includes(laneParam as LaneId)) {
      document.getElementById('contact-form')?.scrollIntoView({ block: 'start' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Solange kein Endpunkt existiert, wird KEIN Versand vorgetäuscht: der
    // Zustand darunter sagt offen, dass die Nachricht noch nicht abgeht.
    setSent(true);
  };

  return (
    <>
      <main>
        {/* ── K1 · Hero (Variante C) ───────────────────────────────────────
            Weiss, zentriert, und die drei Fakten als eine ruhige Gold-
            Hairline-Zeile. Höhe 613px wie site-weit seit 2026-08-28. */}
        <section className="flex flex-col justify-center bg-surface pb-20 pt-32 lg:min-h-[38.3125rem] lg:pb-24 lg:pt-40">
          <Container size="xl">
            <Reveal className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
              <SectionEyebrow tone="brand">{t('contact.hero.eyebrow')}</SectionEyebrow>
              <h1 className="font-serif text-[2.25rem] font-semibold leading-tight tracking-tight text-fg lg:text-[3rem]">
                {t('contact.hero.titlePre')}
                <GoldWord>{t('contact.hero.titleGold')}</GoldWord>
                {t('contact.hero.titlePost')}
              </h1>
              <p className="max-w-[620px] text-body-lg leading-relaxed text-fg-secondary">
                {t('contact.hero.lead')}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mx-auto mt-11 max-w-[900px]">
              <div className="grid grid-cols-1 gap-y-6 border-y border-accent-500/40 py-7 tablet:grid-cols-3 tablet:divide-x tablet:divide-stroke-subtle">
                {(['ways', 'day', 'human'] as const).map((k) => (
                  <div key={k} className="px-6 text-center">
                    <span className="font-serif text-[1.0625rem] font-bold text-fg">
                      {t(`contact.hero.facts.${k}.value`)}
                    </span>
                    <span className="mt-1 block text-body-2xs text-fg-tertiary">
                      {t(`contact.hero.facts.${k}.note`)}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </Container>
        </section>

        {/* ── K2 · Vier Wege (Variante A) ──────────────────────────────────
            Vier Karten, Icons ohne Rahmen und ohne Fläche (Konvention). Der
            Kartenfuss trägt die Adresse und die Frist — die Adressen sind
            Platzhalter, die Fristen ebenfalls offen markiert. */}
        <section className="bg-surface pb-20 pt-4 lg:pb-24">
          <Container size="xl">
            <Reveal className="max-w-[660px]">
              <SectionEyebrow tone="brand">{t('contact.lanes.eyebrow')}</SectionEyebrow>
              <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                {t('contact.lanes.title')}
              </h2>
              <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">
                {t('contact.lanes.lead')}
              </p>
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {LANE_IDS.map((id, i) => {
                const Icon = LANE_ICON[id];
                return (
                  <Reveal key={id} delay={0.06 * i}>
                    <div className="h-full rounded-xl border border-stroke-subtle bg-surface p-6 shadow-[0_18px_44px_-30px_rgba(2,22,17,0.25)]">
                      <Icon size={32} strokeWidth={1.6} className="text-brand" aria-hidden />
                      <h3 className="mt-4 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                        {t(`contact.lane.${id}.title`)}
                      </h3>
                      <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">
                        {t(`contact.lane.${id}.desc`)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-stroke-subtle pt-3">
                        <Placeholder>{t(`contact.lane.${id}.mailbox`)}</Placeholder>
                        <span className="text-body-2xs text-fg-tertiary">
                          {t(`contact.lane.${id}.sla`)}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={0.1}>
              <p className="mt-6 text-body-2xs text-fg-tertiary">
                {t('contact.lanes.postal')} <Placeholder>{t('contact.placeholders.address')}</Placeholder>{' '}
                · <Placeholder>{t('contact.placeholders.phone')}</Placeholder>
              </p>
            </Reveal>
          </Container>
        </section>

        {/* ── K3 · Das Formular (Variante B, auf Full-Bleed-Gradient) ──────
            Nutzerwahl 2026-08-28: die schwebende Karte, aber der Gradient
            läuft über die volle Breite statt als Kasten. */}
        <section id="contact-form" className="scroll-mt-16 bg-gradient-stage py-20 lg:py-24">
          <Container size="xl">
            <Reveal className="mx-auto max-w-[640px] text-center">
              <SectionEyebrow tone="brand">{t('contact.form.eyebrow')}</SectionEyebrow>
              <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                {t('contact.form.title')}
              </h2>
              <p className="mt-4 text-body-md leading-relaxed text-fg-secondary">
                {t('contact.form.lead')}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mx-auto mt-9 w-full max-w-[760px]">
              <form
                onSubmit={onSubmit}
                className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] sm:p-9"
              >
                {/* Der Hinweis verschwindet, sobald CONTACT_ENDPOINT steht. */}
                {!CONTACT_ENDPOINT && (
                  <div className="mb-7 rounded-lg border border-warning-500/30 bg-warning-bg px-4 py-3 text-body-xs leading-relaxed text-warning-700">
                    {t('contact.form.draftNote')}
                  </div>
                )}

                <fieldset>
                  <legend className="text-body-xs font-bold text-fg">{t('contact.form.lane')}</legend>
                  {/* Die GETEILTE Segment-Komponente des Pflichten-Explorers —
                      vier Zustaende EINER Wahl, kein Chip-Nachbau. */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {LANE_IDS.map((id) => (
                      <Segment key={id} selected={lane === id} onClick={() => setLane(id)}>
                        {t(`contact.lane.${id}.short`)}
                      </Segment>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <FormField label={t('contact.form.name')} htmlFor="contact-name">
                    <Input id="contact-name" name="name" autoComplete="name" placeholder={t('contact.form.namePlaceholder')} />
                  </FormField>
                  <FormField label={t('contact.form.email')} htmlFor="contact-email">
                    <Input id="contact-email" name="email" type="email" autoComplete="email" placeholder={t('contact.form.emailPlaceholder')} />
                  </FormField>
                </div>

                <FormField
                  label={t('contact.form.message')}
                  htmlFor="contact-message"
                  className="mt-5"
                  helper={t('contact.form.messageHelper')}
                >
                  <Textarea id="contact-message" name="message" rows={5} placeholder={t('contact.form.messagePlaceholder')} />
                </FormField>

                <div className="mt-7 flex flex-col gap-4 border-t border-stroke-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[400px] text-body-2xs leading-relaxed text-fg-tertiary">
                    {t('contact.form.privacy')}
                  </p>
                  <Button type="submit" variant="primary" size="md" className="shrink-0">
                    {t('contact.form.submit')}
                  </Button>
                </div>

                {sent && (
                  <div
                    role="status"
                    className="mt-6 rounded-lg border border-stroke-subtle bg-surface-secondary px-4 py-3.5 text-body-sm leading-relaxed text-fg-secondary"
                  >
                    {t('contact.form.notWired')}{' '}
                    <Placeholder>{t(`contact.lane.${lane}.mailbox`)}</Placeholder>
                  </div>
                )}
              </form>
            </Reveal>
          </Container>
        </section>

        {/* ── K4 · Schneller als eine Mail + was danach passiert (B) ───────
            Links die drei Wege ohne Warten, rechts der Ablauf als Karte auf
            der getönten Fläche. */}
        <section className="bg-surface py-20 lg:py-24">
          <Container size="xl">
            <div className="flex flex-col gap-10 desktop-s:flex-row desktop-s:items-start desktop-s:gap-14">
              <Reveal className="min-w-0 flex-1">
                <SectionEyebrow tone="brand">{t('contact.faster.eyebrow')}</SectionEyebrow>
                <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-fg lg:text-[2rem]">
                  {t('contact.faster.title')}
                </h2>
                <div className="mt-6 divide-y divide-stroke-subtle border-y border-stroke-subtle">
                  {FASTER.map(({ id, icon: Icon, href }) => (
                    <div key={id} className="flex items-start gap-4 py-4">
                      <Icon size={24} strokeWidth={1.6} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-body-md font-bold text-fg">
                          {t(`contact.faster.${id}.title`)}
                        </p>
                        <p className="mt-1 text-body-sm leading-relaxed text-fg-secondary">
                          {t(`contact.faster.${id}.desc`)}
                        </p>
                        <a
                          href={localize(href)}
                          className="mt-2 inline-flex items-center gap-1.5 text-body-xs font-semibold text-brand transition-colors hover:text-brand-700"
                        >
                          {t(`contact.faster.${id}.cta`)}
                          <ArrowRight size={14} aria-hidden />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.1} className="w-full shrink-0 desktop-s:w-[380px]">
                <div className="rounded-xl bg-gradient-stage p-7">
                  <div className="flex items-center gap-2 text-body-3xs font-bold uppercase tracking-[0.12em] text-brand">
                    <Clock size={14} aria-hidden />
                    {t('contact.after.eyebrow')}
                  </div>
                  <div className="mt-4 divide-y divide-[rgba(2,22,17,0.08)]">
                    {AFTER_STEPS.map((s) => (
                      <div key={s} className="flex items-baseline justify-between gap-4 py-3">
                        <span className="text-body-sm font-bold text-fg">{t(`contact.after.${s}.title`)}</span>
                        <span className="shrink-0 text-body-2xs text-fg-tertiary">
                          {t(`contact.after.${s}.when`)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-body-2xs leading-relaxed text-fg-tertiary">
                    {t('contact.after.note')}
                  </p>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ── K5 · Fragen (Variante B) ─────────────────────────────────────
            Die GETEILTE FaqList — es gibt genau eine FAQ-Komponente auf der
            Site (Festlegung 2026-08-28). Danach direkt der Footer. */}
        <section id="faq" className="scroll-mt-28 bg-surface pb-24 pt-4">
          <Container size="xl">
            {/* Gerahmt wie auf der Preise-Seite: zentrierter Kopf, Liste ueber
                die volle Breite. Die LISTE ist die geteilte, der Rahmen Sache
                des Aufrufers — dann aber ueberall derselbe. */}
            <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
              <SectionEyebrow tone="brand">{t('contact.faq.eyebrow')}</SectionEyebrow>
              <h2 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
                {t('contact.faq.title')}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="mx-auto mt-9 max-w-[1120px] border-t border-stroke-subtle">
              <FaqList
                items={FAQ_IDS.map((id) => ({
                  q: t(`contact.faq.items.${id}.q`),
                  a: t(`contact.faq.items.${id}.a`),
                }))}
              />
            </Reveal>
            <Reveal delay={0.15} className="mx-auto mt-6 max-w-[1120px]">
              <p className="text-body-2xs text-fg-tertiary">{t('contact.faq.note')}</p>
            </Reveal>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
