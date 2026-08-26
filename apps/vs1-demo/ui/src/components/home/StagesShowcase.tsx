import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lock, ArrowRight } from 'lucide-react';
import { RiskBadge, type RiskLevel } from '../ui/RiskBadge';
import { Reveal } from '../providers/SectionHeading';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── /how-it-works — the five stages as a showcase route ─────────────────────
// (canvas "Die fünf Etappen · Showcase" · Variante A "Wechselspiel", 2026-08-26)
// The plain stage list becomes an expansive zigzag: copy and a Gradient panel
// swap sides per stage, the golden connector runs as a spine down the middle
// with the numbered nodes sitting on it. Every panel carries a white demo card
// that PLAYS its stage once it scrolls into view:
//   1 · the question types itself, "Fragen" clicks, the field slides up and
//       the sourced answers pull up after it (the last one fades out),
//   2 · the Risk-Map stats count up and the obligation rows build,
//   3 · the entries sort into "self" vs "specialist", then the honesty note,
//   4 · the anonymous dossiers rise, match percentages counting,
//   5 · a slot selects itself, then dossier + deadlines tick off.
// Reduced motion shows every card in its finished state.
// Copy lives in howItWorks.stages.* / howItWorks.demos.* ('common' ns).

const STAGES = 5;

// ── Small shared pieces ──────────────────────────────────────────────────────

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};
const list = (stagger = 0.24, delay = 0.15) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

// Counts 0 → to once `run` flips true; reduced motion shows the target at once.
function CountUp({ to, run }: { to: number; run: boolean }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setV(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return <>{run || reduced ? v : 0}</>;
}

function DemoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-xl bg-surface p-6 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary">
      {children}
    </div>
  );
}

function SourceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-md border border-accent-500/45 bg-accent-500/10 px-1.5 py-px text-body-4xs font-semibold text-accent-700 dark:text-fg-accent-strong">
      {children}
    </span>
  );
}

// ── 1 · Verstehen: type → click → the answers pull the field up ─────────────
function AskDemo({ inView }: { inView: boolean }) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const question = t('howItWorks.demos.ask.question');
  const [typed, setTyped] = useState(reduced ? question.length : 0);
  const [phase, setPhase] = useState<'type' | 'click' | 'answers'>(reduced ? 'answers' : 'type');

  useEffect(() => {
    if (!inView || reduced) return;
    if (phase === 'type') {
      const id = setTimeout(
        () => (typed >= question.length ? setPhase('click') : setTyped((n) => n + 1)),
        typed >= question.length ? 380 : 26,
      );
      return () => clearTimeout(id);
    }
    if (phase === 'click') {
      const id = setTimeout(() => setPhase('answers'), 420);
      return () => clearTimeout(id);
    }
  }, [inView, reduced, phase, typed, question.length]);

  const answered = phase === 'answers';
  return (
    <DemoCard>
      {/* The field starts vertically centred; when the answers mount, the
          collapsing padding slides it to the top and the list pulls up. */}
      <motion.div
        animate={{ paddingTop: answered ? 0 : 44, paddingBottom: answered ? 0 : 44 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        initial={false}
      >
        <div className="flex items-center gap-2.5 rounded-[10px] border border-stroke px-3.5 py-2.5">
          <span className="min-w-0 flex-1 truncate text-body-xs text-fg">
            {question.slice(0, typed)}
            {!answered && <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-fg-brand align-middle" />}
          </span>
          <motion.span
            animate={phase === 'click' ? { scale: [1, 0.9, 1] } : {}}
            transition={{ duration: 0.35 }}
            className="inline-flex shrink-0 items-center rounded-lg bg-brand px-3.5 py-1.5 text-body-2xs font-semibold text-fg-on-brand"
          >
            {t('howItWorks.demos.ask.cta')}
          </motion.span>
        </div>
      </motion.div>
      {answered && (
        <motion.div variants={list(0.3, 0.25)} initial={reduced ? false : 'hidden'} animate="show" className="mt-3.5 flex flex-col gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <motion.div
              key={i}
              variants={item}
              className="flex gap-2 text-body-2xs leading-relaxed text-fg-secondary"
              style={i === 2 ? { maskImage: 'linear-gradient(#000 0%, transparent 92%)', WebkitMaskImage: 'linear-gradient(#000 0%, transparent 92%)' } : undefined}
            >
              <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
              <span>
                {t(`howItWorks.demos.ask.answers.${i}.text`)}{' '}
                {t(`howItWorks.demos.ask.answers.${i}.chip`) && (
                  <SourceChip>{t(`howItWorks.demos.ask.answers.${i}.chip`)}</SourceChip>
                )}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </DemoCard>
  );
}

// ── 2 · Einschätzen: stats count up, obligation rows build ──────────────────
function MapDemo({ inView }: { inView: boolean }) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  return (
    <DemoCard>
      <motion.div variants={list(0.22, 0.1)} initial={reduced ? false : 'hidden'} animate={inView ? 'show' : undefined}>
        <motion.div variants={item} className="flex gap-6 border-b border-stroke-subtle pb-2.5">
          {[0, 1].map((i) => (
            <span key={i} className="flex items-baseline gap-1.5">
              <span className="font-serif text-[19px] font-bold text-fg-accent-emphasis">
                <CountUp to={Number(t(`howItWorks.demos.map.stats.${i}.value`))} run={inView} />
              </span>
              <span className="text-body-4xs font-semibold uppercase tracking-[0.06em] text-fg-tertiary">
                {t(`howItWorks.demos.map.stats.${i}.label`)}
              </span>
            </span>
          ))}
        </motion.div>
        {Array.from({ length: 3 }, (_, i) => (
          <motion.div
            key={i}
            variants={item}
            className={`grid grid-cols-[64px_1fr] items-center gap-3 py-2.5 ${i < 2 ? 'border-b border-stroke-subtle' : ''}`}
          >
            <RiskBadge level={t(`howItWorks.demos.map.rows.${i}.level`) as RiskLevel} size="sm">
              {t(`risk.severity.${t(`howItWorks.demos.map.rows.${i}.level`)}`, { ns: 'home' })}
            </RiskBadge>
            <span className="min-w-0">
              <span className="block truncate text-body-2xs font-bold text-fg">{t(`howItWorks.demos.map.rows.${i}.title`)}</span>
              <span className="block text-body-3xs text-fg-accent-emphasis">{t(`howItWorks.demos.map.rows.${i}.meta`)}</span>
            </span>
          </motion.div>
        ))}
      </motion.div>
    </DemoCard>
  );
}

// ── 3 · Entscheiden: the entries sort into two columns, then the note ───────
function DecideDemo({ inView }: { inView: boolean }) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const col = (base: 'self' | 'pro') => (
    <div>
      <span className="block border-b border-stroke-subtle pb-2 text-body-4xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
        {t(`howItWorks.demos.decide.${base}Title`)}
      </span>
      <div className="mt-2.5 flex flex-col gap-2">
        {[0, 1].map((i) => (
          <motion.div key={i} variants={item} className="flex items-start gap-2 text-body-2xs leading-snug text-fg-secondary">
            {base === 'self' ? (
              <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
            ) : (
              <ArrowRight size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-accent-emphasis" />
            )}
            {t(`howItWorks.demos.decide.${base}.${i}`)}
          </motion.div>
        ))}
      </div>
    </div>
  );
  return (
    <DemoCard>
      <motion.div variants={list(0.26, 0.1)} initial={reduced ? false : 'hidden'} animate={inView ? 'show' : undefined}>
        <div className="grid grid-cols-2 gap-4">
          {col('self')}
          {col('pro')}
        </div>
        <motion.p
          variants={item}
          className="mt-3.5 rounded-lg border border-primary-500/25 bg-primary-500/[0.06] px-3 py-2 text-body-3xs leading-relaxed text-fg-brand dark:border-brand/40 dark:bg-brand/10"
        >
          <strong>{t('howItWorks.demos.decide.notePre')}</strong> {t('howItWorks.demos.decide.notePost')}
        </motion.p>
      </motion.div>
    </DemoCard>
  );
}

// ── 4 · Matchen: anonymous dossiers rise, percentages count ─────────────────
function MatchDemo({ inView }: { inView: boolean }) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const PCTS = [94, 88];
  return (
    <DemoCard>
      <motion.div variants={list(0.3, 0.1)} initial={reduced ? false : 'hidden'} animate={inView ? 'show' : undefined}>
        {PCTS.map((pct, i) => (
          <motion.div key={i} variants={item} className={`flex items-center gap-3 py-2.5 ${i === 0 ? 'border-b border-stroke-subtle' : ''}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-secondary dark:bg-elevate/10">
              <Lock size={14} className="text-fg-tertiary" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="h-2 w-24 rounded bg-neutral-300/70 dark:bg-white/20" />
              <span className="h-2 w-16 rounded bg-neutral-300/50 dark:bg-white/[0.14]" />
            </span>
            <span className="text-right">
              <span className="block whitespace-nowrap text-body-xs font-bold text-fg-brand">
                <CountUp to={pct} run={inView} /> {t('risk.match', { ns: 'home', pct: '' }).trim()}
              </span>
              <span className="block text-body-4xs text-fg-tertiary">{t(`howItWorks.demos.match.rows.${i}.meta`)}</span>
            </span>
          </motion.div>
        ))}
        <motion.p variants={item} className="mt-2.5 text-body-3xs text-fg-tertiary">
          {t('howItWorks.demos.match.note')}
        </motion.p>
      </motion.div>
    </DemoCard>
  );
}

// ── 5 · Handeln: a slot selects itself, dossier + deadlines tick off ────────
function BookDemo({ inView }: { inView: boolean }) {
  const { t } = useTranslation('common');
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState(!!reduced);
  useEffect(() => {
    if (!inView || reduced) return;
    const id = setTimeout(() => setPicked(true), 1100);
    return () => clearTimeout(id);
  }, [inView, reduced]);
  return (
    <DemoCard>
      <motion.div variants={list(0.16, 0.1)} initial={reduced ? false : 'hidden'} animate={inView ? 'show' : undefined}>
        <motion.span variants={item} className="block text-body-4xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
          {t('howItWorks.demos.book.title')}
        </motion.span>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              variants={item}
              className={`grid h-8 place-items-center rounded-lg text-body-3xs font-semibold transition-colors duration-300 ${
                i === 1 && picked ? 'bg-brand text-fg-on-brand' : 'border border-stroke text-fg-secondary'
              }`}
            >
              {t(`howItWorks.demos.book.slots.${i}`)}
            </motion.span>
          ))}
        </div>
        {[0, 1].map((i) => (
          <motion.p
            key={i}
            variants={item}
            className={`flex items-start gap-2 text-body-2xs leading-snug text-fg-secondary ${i === 0 ? 'mt-3.5 border-t border-stroke-subtle pt-3' : 'mt-2'}`}
          >
            <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-fg-brand" />
            {t(`howItWorks.demos.book.points.${i}`)}
          </motion.p>
        ))}
      </motion.div>
    </DemoCard>
  );
}

// ── The route: zigzag rows on the golden spine ──────────────────────────────

const DEMOS = [AskDemo, MapDemo, DecideDemo, MatchDemo, BookDemo] as const;

// The numbered node lights up the moment its stage scrolls into view: the
// ring fills with the brand colour and pops once (user spec 2026-08-26).
// Reduced motion swaps the colours without the pop.
function StageNode({ n, active, className = '' }: { n: number; active: boolean; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      animate={active && !reduced ? { scale: [1, 1.16, 1] } : {}}
      transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
      className={`grid shrink-0 place-items-center rounded-full border font-bold tabular-nums transition-colors duration-300 ${
        active
          ? 'border-brand bg-brand text-fg-on-brand'
          : 'border-stroke-brand bg-surface text-fg-brand dark:bg-surface-secondary'
      } ${className}`}
    >
      {n}
    </motion.span>
  );
}

function StageRow({ index }: { index: number }) {
  const { t } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-140px');
  const reduced = useReducedMotion();
  const Demo = DEMOS[index];
  const copyLeft = index % 2 === 0;

  const copy = (
    <Reveal className={`flex min-w-0 items-center lg:py-9 ${copyLeft ? 'lg:justify-end' : ''}`}>
      <div className={copyLeft ? 'lg:text-right' : ''}>
        <span className="flex items-center gap-3 lg:block">
          <StageNode n={index + 1} active={inView} className="h-9 w-9 text-body-sm lg:hidden" />
          <span className="text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
            {t(`howItWorks.stages.${index}.kicker`)}
          </span>
        </span>
        <h3 className="mt-2 font-serif text-[1.625rem] font-bold leading-snug text-fg">
          {t(`howItWorks.stages.${index}.title`)}
        </h3>
        <p className={`mt-3 max-w-[46ch] text-body-sm leading-relaxed text-fg-secondary ${copyLeft ? 'lg:ml-auto' : ''}`}>
          {t(`howItWorks.stages.${index}.body`)}
        </p>
      </div>
    </Reveal>
  );

  const panel = (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="lg:my-9"
    >
      <div className="flex h-full items-center rounded-xl bg-gradient-stage p-5 sm:p-7">
        <Demo inView={inView} />
      </div>
    </motion.div>
  );

  return (
    <div ref={ref} className="grid gap-6 py-7 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:gap-x-10 lg:py-0">
      {copyLeft ? copy : panel}
      {/* The spine: golden connector with the numbered node — desktop only. */}
      <div className="hidden flex-col items-center self-stretch lg:flex">
        <span aria-hidden className={`w-px flex-1 bg-accent-500/70 ${index === 0 ? 'opacity-0' : ''}`} />
        <StageNode n={index + 1} active={inView} className="h-11 w-11 text-body-md" />
        <span aria-hidden className={`w-px flex-1 bg-accent-500/70 ${index === STAGES - 1 ? 'opacity-0' : ''}`} />
      </div>
      {copyLeft ? panel : copy}
    </div>
  );
}

export function StagesShowcase() {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col lg:gap-0">
      {Array.from({ length: STAGES }, (_, i) => (
        <StageRow key={i} index={i} />
      ))}
    </div>
  );
}
