import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatedWizard } from './AnimatedWizard';
import { FitScale } from './HomeHero';
import { Button } from '../ui/Button';
import { GoldWord, SectionEyebrow } from '../providers/SectionHeading';

// ─── S9 — Entry Door, demo edition (canvas "Hier beginnen" · Variante 3) ──────
// Replaces EntryDoor ON THE HOMEPAGE ONLY — EntryDoor stays in the tree.
//
// The Mercury pattern: the giant frosted-glass wizard is gone. Left, the
// self-playing AnimatedWizard runs as a COMPACT demo on a soft petrol-to-gold
// tinted panel — the fake cursor picks cards on its own, and the play/pause
// chip freezes the loop in place. Right, the calm pitch with one CTA that
// opens the real wizard full-screen (/:locale/wizard). The section carries
// far more whitespace than the instrument it replaced (1440×1071 → ~560 tall).

export function EntryDoorDemo() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const startAssessment = () => navigate(`/${locale}/wizard`);

  return (
    <section id="entry-door" className="overflow-hidden bg-surface py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-10">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-[88px]">
          {/* Tinted demo panel on the stage Gradient — theme-aware since the
              dark G1 variant (2026-08-26); the wizard card on it keeps its own
              surface tokens, so both flip together. */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative flex w-full items-center justify-center rounded-xl bg-gradient-stage px-4 py-10 lg:h-[560px] lg:w-[660px] lg:shrink-0"
          >
            <div className="w-[440px] max-w-full">
              <FitScale width={760} height={588}>
                <AnimatedWizard paused={paused} className="shadow-[0_30px_70px_-25px_rgba(2,22,17,0.35)]" />
              </FitScale>
            </div>
            {/* Reduced motion shows the wizard's static completed frame — nothing to pause. */}
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-pressed={paused}
                aria-label={t(paused ? 'entryDoor.demo.play' : 'entryDoor.demo.pause')}
                className="absolute bottom-4 left-4 grid h-8 w-8 place-items-center rounded-full border border-neutral-900/50 text-neutral-900 transition-colors hover:bg-white/70 dark:border-white/50 dark:text-white dark:hover:bg-white/10"
              >
                {paused ? <Play size={12} /> : <Pause size={12} />}
              </button>
            )}
          </motion.div>

          {/* The calm pitch */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="max-w-[480px]"
          >
            <SectionEyebrow>{t('entryDoor.eyebrow')}</SectionEyebrow>
            <h2 className="mt-4 font-serif text-[2rem] font-bold leading-[1.15] tracking-tight text-fg lg:text-display-md">
              {t('entryDoor.title.pre')}
              <GoldWord>{t('entryDoor.title.highlight')}</GoldWord>
              {t('entryDoor.title.post')}
            </h2>
            <p className="mt-5 text-body-md leading-relaxed text-fg-secondary sm:text-[17px]">{t('entryDoor.subtitle')}</p>
            <Button size="lg" className="mt-9" onClick={startAssessment}>
              {t('entryDoor.cta')} <ArrowRight size={17} />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
