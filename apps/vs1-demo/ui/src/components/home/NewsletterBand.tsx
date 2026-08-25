import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { FreeAccountDrawer } from './MarketsDrawer';
import { SectionEyebrow, Reveal } from '../providers/SectionHeading';
import { Button } from '../ui/Button';

// ─── S10 — Newsletter band (canvas "Auf dem Laufenden" · Split, 2026-08-25) ──
// The slim grey band became the page's closing statement: a FULL-BLEED
// Gradient band (CLAUDE.md) with the copy standing directly on the tint —
// eyebrow, serif headline, briefing pitch, and the free-account link below —
// and the form as a white card on the right: card title, stacked e-mail
// field, full-width Subscribe, the privacy line inside the card. The
// free-account link keeps opening the drawer (same mechanism as the wizard's
// "Save progress").
//
// Choreography: the copy reveals from the left, the card rises onto the band
// a beat later and its rows build up one after another (the Homebase cascade
// language). Copy lives in newsletter.*.

const cardShell = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const, delay: 0.2, when: 'beforeChildren' as const, staggerChildren: 0.09 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function NewsletterBand() {
  const { t } = useTranslation('home');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const valid = /.+@.+\..+/.test(email);

  return (
    <section id="newsletter" className="bg-surface">
      <div className="bg-[linear-gradient(165deg,#EAF3F1_0%,#DDECE8_55%,#E9E4D3_100%)] px-4 py-16 md:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-10 lg:flex-row lg:items-center lg:gap-[72px]">
          {/* Left — copy directly on the Gradient */}
          <Reveal className="min-w-0 flex-1">
            <SectionEyebrow tone="brand">{t('newsletter.eyebrow')}</SectionEyebrow>
            <h2 className="mt-3.5 font-serif text-[1.75rem] font-semibold leading-[1.22] tracking-tight text-fg lg:text-[2.25rem]">
              {t('newsletter.title')}
            </h2>
            <p className="mt-4 max-w-[52ch] text-body-md leading-relaxed text-fg-secondary">
              {t('newsletter.desc')}
            </p>
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-body-xs font-semibold text-fg-brand transition-colors hover:text-brand"
            >
              {t('newsletter.accountLink')} <ArrowRight size={14} />
            </button>
          </Reveal>

          {/* Right — the white form card, rising onto the band */}
          <motion.div
            variants={cardShell}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="w-full shrink-0 rounded-xl bg-surface p-7 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] lg:w-[440px]"
          >
            <motion.p variants={cardItem} className="font-serif text-[1.125rem] font-bold text-fg">
              {t('newsletter.cardTitle')}
            </motion.p>
            {subscribed ? (
              <motion.div
                variants={cardItem}
                className="mt-3 flex items-center gap-2 rounded-xl border border-stroke-subtle bg-surface-secondary px-4 py-3 text-body-sm font-semibold text-fg-brand"
              >
                <Check size={16} strokeWidth={2.5} /> {t('newsletter.success')}
              </motion.div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) setSubscribed(true);
                }}
                className="mt-3 flex flex-col gap-3"
              >
                <motion.input
                  variants={cardItem}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('newsletter.placeholder')}
                  aria-label={t('newsletter.emailAria')}
                  className="min-w-0 rounded-xl border border-stroke px-4 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-brand"
                />
                <motion.div variants={cardItem}>
                  <Button size="lg" shape="soft" type="submit" fullWidth>
                    {t('newsletter.subscribe')}
                  </Button>
                </motion.div>
              </form>
            )}
            <motion.p variants={cardItem} className="mt-3.5 text-body-2xs leading-relaxed text-fg-tertiary">
              {t('newsletter.privacy')}
            </motion.p>
          </motion.div>
        </div>
      </div>

      <FreeAccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} />
    </section>
  );
}
