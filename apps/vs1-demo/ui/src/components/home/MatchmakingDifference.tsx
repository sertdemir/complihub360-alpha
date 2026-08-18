import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Container } from '../ui/Container';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { PartnerStatusBadge } from '../ui/ProviderBadges';
import { SectionEyebrow, GoldWord } from '../providers/SectionHeading';

// ─── S2.5 — The Matchmaking Difference · Figma 1553:852 ──────────────────────
// "Other tools tell you what's wrong. We connect you with who fixes it."
// Three overlapping verified-partner match cards + the 4-step "How it works"
// timeline (steps 3 petrol · 4 gold). Soft gray band with a subtle dot field.

// Person names, initials, match % and ratings stay in code (fixture identity);
// place / specialty / tags / covers / response / engagements come from
// matchmaking.matches.<index>.* in the 'home' namespace.
const MATCHES = [
  { index: 0, initials: 'ML', name: 'M. Lang', pct: 94, rating: '4.8' },
  { index: 1, initials: 'SW', name: 'S. Whitcomb', pct: 88, rating: '4.9' },
  { index: 2, initials: 'AD', name: 'A. Dubois', pct: 81, rating: '4.7' },
] as const;

// Titles + descriptions come from matchmaking.steps.<index>.* in 'home'.
const STEPS = [
  { n: 1, tone: 'idle' },
  { n: 2, tone: 'idle' },
  { n: 3, tone: 'brand' },
  { n: 4, tone: 'gold' },
] as const;

// Fixed dot constellation (deterministic) — subtle depth on the band edges.
const DOTS = [
  [12, 18], [30, 44], [52, 8], [70, 30], [88, 56], [20, 70], [44, 88], [66, 64], [92, 14], [8, 48],
  [38, 26], [58, 46], [80, 78], [26, 6], [14, 90], [48, 64], [74, 10], [90, 38], [34, 56], [60, 84],
] as const;

function DotField({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={`pointer-events-none absolute h-64 w-64 opacity-[0.35] ${className}`}>
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.6 : 0.9} className="fill-primary-500/60" />
      ))}
    </svg>
  );
}

function MatchCard({ m, className = '' }: { m: (typeof MATCHES)[number]; className?: string }) {
  const { t } = useTranslation('home');
  const base = `matchmaking.matches.${m.index}`;
  return (
    <div className={`w-full rounded-2xl border border-stroke-subtle bg-surface px-5 py-4 shadow-[0_30px_70px_-30px_rgba(2,22,17,0.3)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="md" initials={m.initials} tone="soft" />
          <div>
            <p className="text-[15px] font-semibold leading-tight text-fg">{m.name}</p>
            <p className="text-[12px] text-fg-secondary">{t(`${base}.place`)}</p>
          </div>
        </div>
        <PartnerStatusBadge status="verified" styleVariant="solid" label={t('badge.verified')} />
      </div>
      <p className="mt-3 border-b border-stroke-subtle pb-2.5 text-[13px] text-fg-secondary">{t(`${base}.specialty`)}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {[0, 1].map((i) => (
          <Tag key={i} tone="neutral">{t(`${base}.tags.${i}`)}</Tag>
        ))}
      </div>
      <p className="mt-3 text-[16px] font-bold text-fg-brand">{t('risk.match', { pct: m.pct })}</p>
      <p className="text-[12px] text-fg-secondary">{t(`${base}.covers`)}</p>
      <p className="mt-3 flex items-center gap-1.5 border-t border-stroke-subtle pt-2.5 text-[11px] text-fg-tertiary">
        {t(`${base}.response`)} · {m.rating} <Star size={10} className="-ml-0.5 fill-accent-500 text-accent-500" /> · {t(`${base}.engagements`)}
      </p>
    </div>
  );
}

export function MatchmakingDifference() {
  const { t } = useTranslation('home');
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepsInView = useInView(stepsRef, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  // The cards' spread animation only makes sense in the 3-column layout.
  // Initialized synchronously — framer captures `initial` on mount.
  const [lg, setLg] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const spread = lg && !reduced;

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-surface-secondary py-20 lg:py-28">
      <DotField className="left-[2%] top-[22%] hidden lg:block" />
      <DotField className="right-[2%] top-[30%] hidden lg:block" />

      <Container size="2xl" className="relative">
        {/* Heading */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionEyebrow tone="brand">{t('matchmaking.eyebrow')}</SectionEyebrow>
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
            {t('matchmaking.title.line1')}
            <br className="hidden sm:block" /> {t('matchmaking.title.pre')}<GoldWord>{t('matchmaking.title.gold')}</GoldWord>{t('matchmaking.title.post')}
          </h2>
          <p className="max-w-2xl text-body leading-relaxed text-fg-secondary">
            {t('matchmaking.subtitle')}
          </p>
        </div>

        {/* Match cards — start as an overlapped stack, spread on scroll into a
            3-column grid with gaps (their final placement). */}
        <div ref={ref} className="mx-auto mt-14 grid max-w-[1140px] gap-[24px] lg:grid-cols-3">
          {MATCHES.map((m, i) => (
            <motion.div
              key={m.name}
              className={i === 1 ? 'relative z-20' : 'relative z-10'}
              initial={
                spread
                  ? { x: i === 0 ? '58%' : i === 2 ? '-58%' : 0, scale: i === 1 ? 1 : 0.96 }
                  : { opacity: 0, y: 24 }
              }
              animate={
                inView
                  ? { x: 0, y: 0, scale: 1, opacity: 1 }
                  : undefined
              }
              transition={{ duration: 0.8, ease: [0.45, 0, 0.25, 1], delay: 0.2 + i * 0.06 }}
            >
              <MatchCard m={m} className="h-full" />
            </motion.div>
          ))}
        </div>

        {/* How it works timeline */}
        <div className="mt-20 lg:mt-24">
          <p className="mx-auto text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-secondary">
            {t('matchmaking.howItWorks.label')} <span className="mx-1 text-fg-tertiary">·</span> {t('matchmaking.howItWorks.sub')}
          </p>
          <div ref={stepsRef} className="relative mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-6">
            {/* connector line (desktop) */}
            <span aria-hidden className="absolute left-[12%] right-[12%] top-[20px] hidden h-px bg-stroke lg:block" />
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                className="relative flex flex-col items-center text-center"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.55, ease: 'easeInOut', delay: i * 0.22 }}
              >
                <span
                  className={
                    'grid h-[40px] w-[40px] place-items-center rounded-full text-[15px] font-semibold ' +
                    (s.tone === 'brand'
                      ? 'bg-brand text-fg-on-brand'
                      : s.tone === 'gold'
                      ? 'bg-accent-500 text-fg-on-accent'
                      : 'bg-surface-tertiary/80 text-fg-secondary')
                  }
                >
                  {s.n}
                </span>
                <p className="mt-4 text-[15px] font-bold text-fg">{t(`matchmaking.steps.${i}.title`)}</p>
                <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-fg-secondary">{t(`matchmaking.steps.${i}.desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
