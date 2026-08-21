import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatedWizard } from './AnimatedWizard';

// ─── S9 — The Entry Door · Figma 1227:151 / wizard 1649:2 ───────────────────
// The gold closing panel. The real assessment wizard lives here at its natural,
// spacious size (Figma 1649:2 — full hero width, generous whitespace). A frosted
// (blur-only) backdrop carries the pitch + journey + CTA; clicking "Start your
// assessment" lifts the backdrop and frees the live wizard for the visitor.

// Labels come from entryDoor.journey.<index> ('home' ns).
const JOURNEY = [
  { index: 0, done: true },
  { index: 1 },
  { index: 2 },
  { index: 3 },
];

function JourneyStepper() {
  const { t } = useTranslation('home');
  return (
    <div className="mx-auto flex max-w-[420px] items-start justify-between">
      {JOURNEY.map((s, i) => (
        <div key={s.index} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && <span className="h-px flex-1 bg-primary-950/25" />}
            <span
              className={
                'h-[11px] w-[11px] shrink-0 rounded-full ' +
                // primary-500, not bg-brand: the backdrop below is fixed-light in both
                // themes, so a flipping token turns this dot into bright teal on a pale
                // gold ground (1.78:1). Every sibling here is already a fixed primitive.
                (s.done ? 'bg-primary-500' : 'border-2 border-primary-950/35 bg-transparent')
              }
            />
            {i < JOURNEY.length - 1 && <span className="h-px flex-1 bg-primary-950/25" />}
          </div>
          <span className={'mt-2.5 text-body-2xs ' + (s.done ? 'font-bold text-neutral-900' : 'text-primary-950/60')}>
            {t(`entryDoor.journey.${s.index}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EntryDoor() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [started, setStarted] = useState(false);

  // Petrol statt Gold. Gold bedeutet in Compass ausschliesslich Verified Partner
  // und Monetarisierung — hier trug es den KOSTENLOSEN Einstieg, auf dem groessten
  // Einzelfarbfeld der Seite (1440x1071 px, 6,7 % der Landingpage). bg-brand-surface
  // ist der Vertrauensanker und bleibt in beiden Themes tiefes Petrol, der weisse
  // Glas-Backdrop darauf also stabil.
  return (
    <section id="entry-door" className="overflow-hidden bg-brand-surface py-20 lg:py-24">
      {/* Hero-content width (matches Container size="2xl") */}
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-6">
        <motion.div
          className="relative overflow-hidden rounded-[20px] shadow-[0_50px_110px_-35px_rgba(11,11,12,0.45)]"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* The real wizard — natural size, full width, with header */}
          <AnimatedWizard
            spacious
            interactive
            onComplete={(profile) => navigate(`/${locale}/results`, { state: { searchProfile: profile } })}
            className="!rounded-[20px]"
          />

          {/* Frosted (blur-only) backdrop carrying the pitch + CTA */}
          <AnimatePresence>
            {!started && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 px-6 backdrop-blur-md dark:bg-white/80"
              >
                {/* Der Text hier ist bewusst hartcodiert dunkel und KEIN Theme-Token — mit
                    text-fg fiel er im Dark-Mode auf 1,4:1. Das setzt voraus, dass der
                    Glas-Backdrop in BEIDEN Themes hell ist, und genau das stimmte nicht:
                    unter dem Schleier liegt nicht die Sektion, sondern die Wizard-Karte
                    (ein GESCHWISTER, kein Vorfahr) mit bg-surface — die kippt. bg-white/30
                    darüber ergab im Dark #626973, ein Mittelgrau, auf dem der 12-px-Text
                    3,22:1 und der CTA 1,77:1 maßen.
                    Wer das nachmisst: ein Scanner, der den DOM nach OBEN läuft, landet bei
                    der Sektion und misst den falschen Grund. Der echte Malstapel steht in
                    #57; hier wird er aus dem Geschwister gerechnet.
                    dark:bg-white/80 macht die Voraussetzung wahr — Grund #D2D4D7, CTA 7,0:1,
                    Fließtext 7,3:1, 12-px-Text 12,6:1. Im Light ändert sich nichts: weiß
                    über weiß bleibt weiß. */}
                <div className="flex max-w-xl flex-col items-center text-center">
                  <span className="text-body-2xs font-semibold uppercase tracking-[0.18em] text-primary-500">{t('entryDoor.eyebrow')}</span>
                  <h2 className="mt-4 font-serif text-[2rem] font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-[2.75rem] lg:text-[3rem]">
                    {t('entryDoor.title.pre')}<span className="text-accent-900">{t('entryDoor.title.highlight')}</span>{t('entryDoor.title.post')}
                  </h2>
                  <p className="mt-5 max-w-md text-body-md leading-relaxed text-neutral-700 sm:text-[17px]">
                    {t('entryDoor.subtitle')}
                  </p>

                  <div className="mt-8 w-full">
                    <JourneyStepper />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="mt-9 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-7 py-3.5 text-body-md font-semibold text-white shadow-[0_18px_34px_-14px_rgba(0,77,64,0.65)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {t('entryDoor.cta')} <ArrowRight size={17} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
