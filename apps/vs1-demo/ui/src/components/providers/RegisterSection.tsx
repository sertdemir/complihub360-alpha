import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { Typography } from '../ui/Typography';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Reveal } from './SectionHeading';

// ─── S6 — Register as (Provider) · Figma 1801:837 ─────────────────────────────
// GOLD apply/beta-cohort CTA band. Highlighted headline word is WHITE here
// (gold-on-gold would vanish). Practice-profile picker + lightweight intake form.
// Copy lives in the 'providersLp' namespace; selection state stores stable keys.

const PROFILE_KEYS = ['solo', 'boutique', 'network'] as const;
const AREA_KEYS = ['vatTax', 'eprPackaging', 'gdprPrivacy', 'marketing', 'corporate'] as const;
const COUNTRIES = ['DE', 'UK', 'NL', 'FR', 'IT', 'ES', 'US', 'TR'] as const;

export function RegisterSection() {
  const { t } = useTranslation('providersLp');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [profile, setProfile] = useState('boutique');
  const [areas, setAreas] = useState<string[]>(['vatTax', 'eprPackaging']);
  const [countries, setCountries] = useState<string[]>(['DE', 'UK', 'NL']);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <section id="register" className="bg-accent-500 py-20 lg:py-28">
      <Container size="2xl">
        {/* Heading */}
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <span className="text-caption font-sans font-semibold uppercase tracking-[0.14em] text-primary-900/80">
            {t('register.eyebrow')}
          </span>
          <Typography variant="h2" weight="semibold" className="!text-[2rem] leading-tight tracking-tight text-primary-900 sm:!text-[2.5rem]">
            {t('register.title.pre')} <span className="text-white">{t('register.title.gold')}</span>
            {t('register.title.post')}
          </Typography>
          <p className="max-w-2xl text-base leading-relaxed text-primary-900/80">{t('register.lead')}</p>
        </Reveal>

        {/* Picker + form */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8"
        >
          {/* Practice profiles */}
          <div className="flex flex-col gap-4">
            {PROFILE_KEYS.map((key) => {
              const active = key === profile;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfile(key)}
                  className={`flex items-center justify-between rounded-xl bg-white p-4 text-left shadow-sm transition-all ${
                    active ? 'ring-2 ring-primary-600' : 'ring-1 ring-transparent hover:ring-neutral-200'
                  }`}
                >
                  <span>
                    <span className="block text-[16px] font-semibold text-neutral-900">{t(`register.profiles.${key}.title`)}</span>
                    <span className="block text-[13px] text-neutral-500">{t(`register.profiles.${key}.desc`)}</span>
                  </span>
                  {active && <Check size={20} className="shrink-0 text-primary-600" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>

          {/* Intake form */}
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t('register.form.emailLabel')}</p>
            <div className="mt-2">
              <Input type="email" placeholder={t('register.form.emailPlaceholder')} />
            </div>
            <p className="mt-2 text-[12px] text-neutral-400">{t('register.form.emailHint')}</p>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t('register.form.areasLabel')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AREA_KEYS.map((a) => {
                const on = areas.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggle(areas, setAreas, a)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      on ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {t(`register.form.areas.${a}`)}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t('register.form.countriesLabel')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const on = countries.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(countries, setCountries, c)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      on ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              <span className="rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-400">{t('register.form.addChip')}</span>
            </div>
          </div>
        </motion.div>

        {/* CTA + footnotes */}
        <Reveal className="mt-10 flex flex-col items-center gap-4 text-center">
          <Button size="lg" className="px-8">
            {t('register.cta')} <ArrowRight size={18} className="ml-2" />
          </Button>
          <p className="text-[13px] text-primary-900/70">{t('register.footnote')}</p>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-primary-900">{t('register.spots')}</p>
        </Reveal>
      </Container>
    </section>
  );
}
