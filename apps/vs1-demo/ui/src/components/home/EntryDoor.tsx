import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatedWizard } from './AnimatedWizard';

// ─── S9 — The Entry Door · Figma 1227:151 / wizard 1649:2 ───────────────────
// The gold closing panel. The real assessment wizard lives here at its natural,
// spacious size (Figma 1649:2 — full hero width, generous whitespace). A frosted
// (blur-only) backdrop carries the pitch + journey + CTA; clicking "Start your
// assessment" lifts the backdrop and frees the live wizard for the visitor.

const JOURNEY = [
  { label: '6 min', done: true },
  { label: 'Risk map' },
  { label: 'Register' },
  { label: 'Workspace' },
];

function JourneyStepper() {
  return (
    <div className="mx-auto flex max-w-[420px] items-start justify-between">
      {JOURNEY.map((s, i) => (
        <div key={s.label} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && <span className="h-px flex-1 bg-primary-950/25" />}
            <span
              className={
                'h-[11px] w-[11px] shrink-0 rounded-full ' +
                (s.done ? 'bg-brand' : 'border-2 border-primary-950/35 bg-transparent')
              }
            />
            {i < JOURNEY.length - 1 && <span className="h-px flex-1 bg-primary-950/25" />}
          </div>
          <span className={'mt-2.5 text-[12px] ' + (s.done ? 'font-bold text-fg' : 'text-primary-950/60')}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EntryDoor() {
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [started, setStarted] = useState(false);

  return (
    <section id="entry-door" className="overflow-hidden bg-accent-500 py-20 lg:py-24">
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
            onComplete={() => navigate(`/${locale}/results`)}
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
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 px-6 backdrop-blur-md"
              >
                <div className="flex max-w-xl flex-col items-center text-center">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-fg-brand">Begin here</span>
                  <h2 className="mt-4 font-serif text-[2rem] font-bold leading-[1.1] tracking-tight text-fg sm:text-[2.75rem] lg:text-[3rem]">
                    One assessment. One result. The path becomes <span className="text-accent-600">legible</span>.
                  </h2>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-secondary sm:text-[17px]">
                    Six minutes. No account required. We map your operations against the regulations that actually apply,
                    and show you what to do next.
                  </p>

                  <div className="mt-8 w-full">
                    <JourneyStepper />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-[15px] font-semibold text-fg-on-brand shadow-[0_18px_34px_-14px_rgba(0,77,64,0.65)] transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Start your assessment <ArrowRight size={17} />
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
