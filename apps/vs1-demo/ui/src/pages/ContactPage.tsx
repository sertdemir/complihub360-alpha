import { FormErrorSummary, focusField } from '../components/ui/FormErrorSummary';
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
import { InboxAddress, SendFailed } from '../components/contact/SendStates';
import { CONTACT_INBOX, EMAIL_RE, failureOf, invalidFieldOf, sendContact, type SendFailure } from '../api/contact';

// ─── /contact · Kontakt und Support ──────────────────────────────────────────
// Built 2026-08-28 (canvas "Kontaktseite": K1 C, K2 A, K3 B on the full-bleed
// Gradient, K4 B, K5 B). The footer's 'contact' AND 'support' entries both
// point here, so the page sorts by WHAT SOMEONE WANTS, not by which department
// would own it: four lanes, one form, one promise per lane.
//
// Copy: common.json → contact.* (en/de/es/tr).

// ─── Senden (Beta-Plan Di 13.10.) ────────────────────────────────────────────
// POST /api/v1/contact (api/contact.ts): ein Postfach, das Anliegen im Betreff.
// Canvas „Kontakt und Bewerbung senden", Wahl 10.10.2026: A3 (angekommen, mit
// den drei Schritten aus K4), B2 (nicht abgeschickt, Text bleibt, Adresse zum
// Kopieren), C1 (Karten ohne Adresse, eine Zeile unter dem Formular).
// Figma: Screens-Datei, Seite „Kontakt + Bewerbung senden (Di 13.10.)".
//
// Noch offen (Rechtsseiten-Tag): contact.placeholders.* (Anschrift, Telefon).

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

  // Tiefenlink fuer Zubringer (heute: der "formlose Fragen"-Weg der
  // Bewerbungsseite /partner-apply): /contact?lane=partner waehlt den Weg vor
  // und scrollt zum Formular — ohne das landete ein Bewerber oben im Hero und
  // musste den Anbieter-Weg selbst suchen (Nutzer-Befund 2026-08-29).
  const [params] = useSearchParams();
  const laneParam = params.get('lane');
  const initialLane: LaneId = LANE_IDS.includes(laneParam as LaneId) ? (laneParam as LaneId) : 'support';
  const [lane, setLane] = useState<LaneId>(initialLane);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [failure, setFailure] = useState<{ kind: SendFailure; error: unknown } | null>(null);
  const [acknowledged, setAcknowledged] = useState(true);
  const [sentTo, setSentTo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'message', string>>>({});

  useEffect(() => {
    if (laneParam && LANE_IDS.includes(laneParam as LaneId)) {
      document.getElementById('contact-form')?.scrollIntoView({ block: 'start' });
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const errs: typeof fieldErrors = {};
    if (!name.trim()) errs.name = t('contactSend.field.name');
    if (!EMAIL_RE.test(email.trim())) errs.email = t('contactSend.field.email');
    if (!message.trim()) errs.message = t('contactSend.field.message');
    setFieldErrors(errs);
    // H2: Fokus aufs erste fehlerhafte Feld; die Zusammenfassung steht am Knopf.
    const first = (['name', 'email', 'message'] as const).find((k) => errs[k]);
    if (first) { focusField(`contact-${first}`); return; }
    setStatus('sending');
    setFailure(null);
    try {
      const r = await sendContact({ lane, locale, name: name.trim(), email: email.trim(), message, hp });
      setAcknowledged(r.acknowledged);
      setSentTo(email.trim());
      setStatus('sent');
    } catch (err) {
      // Der Server bemaengelt ein Feld (400): dort anzeigen, nicht als Ausfall.
      const field = invalidFieldOf(err);
      if (field === 'name' || field === 'email' || field === 'message') {
        setFieldErrors({ [field]: t(`contactSend.field.${field}`) });
        setStatus('idle');
        return;
      }
      setFailure({ kind: failureOf(err), error: err });
      setStatus('failed');
    }
  };

  const writeAnother = () => {
    setMessage('');
    setStatus('idle');
    setFailure(null);
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
              <div className="grid grid-cols-1 gap-y-6 border-y border-stroke-subtle py-7 tablet:grid-cols-3 tablet:divide-x tablet:divide-stroke-subtle">
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
            Kartenfuss trägt die Frist. Eine Adresse je Karte gibt es nicht
            mehr: ein Postfach, eine Zeile unter dem Formular (C1). */}
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
                      <div className="mt-4 border-t border-stroke-subtle pt-3">
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
              <div className="rounded-xl bg-surface p-7 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] sm:p-9">
                {status === 'sent' ? (
                  <div className="flex flex-col gap-5" role="status">
                    {acknowledged ? (
                      <div className="flex flex-col gap-2.5 rounded-xl border border-success-500/30 bg-success-bg dark:bg-emerald-500/10 px-[18px] py-[15px]">
                        <p className="font-serif text-[1.125rem] font-bold text-fg">{t('contact.sent.title')}</p>
                        <p className="text-body-sm leading-relaxed text-fg-secondary">{t('contact.sent.body', { email: sentTo })}</p>
                        {/* A3: die Schritte aus K4 — Schritt 1 ist erledigt. */}
                        <ul className="mt-1 flex flex-col gap-2.5">
                          {AFTER_STEPS.map((s, i) => (
                            <li key={s} className="flex items-center gap-2.5 text-body-sm text-fg" data-step={s} data-done={i === 0}>
                              <span
                                aria-hidden
                                className={'grid h-5 w-5 shrink-0 place-items-center rounded-full text-body-4xs font-bold '
                                  + (i === 0 ? 'bg-brand text-fg-on-brand' : 'border border-stroke bg-surface text-fg-tertiary')}
                              >
                                {i === 0 ? '✓' : i + 1}
                              </span>
                              <span className="min-w-0 flex-1">{t(`contact.after.${s}.title`)}</span>
                              <span className={i === 0 ? 'text-body-3xs font-bold uppercase tracking-[0.08em] text-brand' : 'text-body-2xs text-fg-tertiary'}>
                                {i === 0 ? t('contact.sent.done') : t(`contact.after.${s}.when`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      // Angekommen, aber die Bestaetigung ging nicht raus —
                      // dann steht dort kein Haken, sondern der Hinweis.
                      <div className="flex flex-col gap-2 rounded-xl border border-warning-500/30 bg-warning-bg dark:bg-amber-500/10 px-[18px] py-[15px]">
                        <p className="font-serif text-[1.125rem] font-bold text-fg">{t('contact.sent.title')}</p>
                        <p className="text-body-sm leading-relaxed text-warning-700 dark:text-amber-200">{t('contactSend.ackFailed', { email: sentTo })}</p>
                      </div>
                    )}
                    <div>
                      <Button type="button" variant="secondary" size="md" onClick={writeAnother}>
                        {t('contact.sent.again')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate>
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
                      <FormField label={t('contact.form.name')} htmlFor="contact-name" error={fieldErrors.name}>
                        <Input id="contact-name" name="name" autoComplete="name" placeholder={t('contact.form.namePlaceholder')}
                          value={name} onChange={(e) => setName(e.target.value)} error={!!fieldErrors.name} />
                      </FormField>
                      <FormField label={t('contact.form.email')} htmlFor="contact-email" error={fieldErrors.email}>
                        <Input id="contact-email" name="email" type="email" autoComplete="email" placeholder={t('contact.form.emailPlaceholder')}
                          value={email} onChange={(e) => setEmail(e.target.value)} error={!!fieldErrors.email} />
                      </FormField>
                    </div>

                    <FormField
                      label={t('contact.form.message')}
                      htmlFor="contact-message"
                      className="mt-5"
                      helper={t('contact.form.messageHelper')}
                      error={fieldErrors.message}
                    >
                      <Textarea id="contact-message" name="message" rows={5} placeholder={t('contact.form.messagePlaceholder')}
                        value={message} onChange={(e) => setMessage(e.target.value)} error={!!fieldErrors.message} />
                    </FormField>

                    {/* Honeypot: fuer Menschen unsichtbar und nicht erreichbar. */}
                    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                      <label htmlFor="contact-hp">Website</label>
                      <input id="contact-hp" name="website_hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                    </div>

                    {status === 'failed' && failure && (
                      <div className="mt-6">
                        <SendFailed kind="message" failure={failure.kind} error={failure.error} />
                      </div>
                    )}

                    <FormErrorSummary
                      className="mt-6"
                      errors={(['name', 'email', 'message'] as const).filter((k) => fieldErrors[k]).map((k) => ({
                        id: `contact-${k}`, label: t(`contact.form.${k}`), message: fieldErrors[k] as string,
                      }))}
                    />
                    <div className="mt-7 flex flex-col gap-4 border-t border-stroke-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-[400px] text-body-2xs leading-relaxed text-fg-tertiary">
                        {t('contact.form.privacy')}
                      </p>
                      <Button type="submit" variant="primary" size="md" className="shrink-0" loading={status === 'sending'}>
                        {status === 'sending' ? t('contactSend.sending') : status === 'failed' ? t('contactSend.retry') : t('contact.form.submit')}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
              {/* C1: die eine Adresse, an einer Stelle — nur wenn sie feststeht.
                  Im Fehlerfall steht sie schon im Hinweis (B2), nicht doppelt. */}
              {CONTACT_INBOX && status !== 'failed' && (
                <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-body-sm text-fg-secondary">
                  {t('contact.form.direct')} <InboxAddress />
                </p>
              )}
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
            <Reveal delay={0.1} className="mx-auto mt-9 border-t border-stroke-subtle">
              <FaqList
                items={FAQ_IDS.map((id) => ({
                  q: t(`contact.faq.items.${id}.q`),
                  a: t(`contact.faq.items.${id}.a`),
                }))}
              />
            </Reveal>
            <Reveal delay={0.15} className="mx-auto mt-6">
              <p className="text-body-2xs text-fg-tertiary">{t('contact.faq.note')}</p>
            </Reveal>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
