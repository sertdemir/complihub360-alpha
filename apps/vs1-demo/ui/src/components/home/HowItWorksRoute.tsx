import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Container } from '../ui/Container';
import { useInViewOnce } from '../../lib/useInViewOnce';
import { FitScale } from './HomeHero';

// ─── S4 — How It Works, route edition (canvas "So funktioniert es", Petrol) ───
// Replaces HowItWorksSteps ON THE HOMEPAGE ONLY — that component stays in the
// tree (and /how-it-works keeps carrying the full copy).
//
// The five stages as stations on the golden route — the same visual language
// as the hero map: cards sit ON the arcs, the big icon chip overlaps each
// card's top edge, and beside it the numbered eyebrow pill. The short
// per-stage lines (stages.*.short) name the actual product surfaces —
// Freitextfeld, Wizard, Risk Map — so the reader knows what each step IS;
// the full reasoning stays on /how-it-works.
//
// The scroll animation is a strict relay (user spec 2026-08-25): a card
// appears, then ITS elements in order (icon chip → numbered pill → title →
// line), then the arc draws onward, and only then the next card — one slot
// per station. Reduced motion shows the completed picture.
//
// Deliberately theme-fixed raw colours (see the guard test's colour note):
// the band must stay dark petrol in both themes, the cards white on it.

const CARD_W = 200;
// Canvas geometry (1240×400 stage): card left/top per station, arcs between
// card edge midpoints with the hero's alternating perpendicular bulge.
const CARDS = [
  { x: 0, y: 36 },
  { x: 260, y: 166 },
  { x: 520, y: 16 },
  { x: 780, y: 166 },
  { x: 1040, y: 72 },
];

function arc(i: number): string {
  const a = { x: CARDS[i].x + CARD_W, y: CARDS[i].y + 100 };
  const b = { x: CARDS[i + 1].x, y: CARDS[i + 1].y + 100 };
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const k = i % 2 === 0 ? 0.3 : -0.3;
  return `M ${a.x} ${a.y} Q ${(mx - dy * k).toFixed(1)} ${(my + dx * k).toFixed(1)} ${b.x} ${b.y}`;
}

// One relay slot per station: the card and its elements fill the front of the
// slot, the outgoing arc draws at its end, landing when the next slot begins.
const SLOT = 0.85;
const ARC_START = 0.55;
const ARC_DUR = 0.28;

// Station icons — the canvas set: speech bubble (free-text question), folded
// map (Risk Map), fork in the road (decide), person + check (match), pin
// with the gold orbit (act). 28px grid, petrol strokes, gold accents.
const ICONS = [
  <g key="chat" stroke="#004D40" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(1,1)">
    <path d="M4 7a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8l-5 5v-5H7a3 3 0 0 1-3-3z" />
    <path d="M11.2 9.2a2.6 2.6 0 1 1 3.6 2.4c-.9.4-1.4.9-1.4 1.9" />
    <circle cx="13.4" cy="16.3" r="0.4" fill="#004D40" />
  </g>,
  <g key="map" stroke="#004D40" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(2,2)">
    <path d="M10 4 3.5 6.5v14L10 18l7 2.5 6.5-2.5v-14L17 6.5 10 4z" />
    <path d="M10 4v14M17 6.5v14" />
  </g>,
  <g key="fork" stroke="#004D40" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(1,1)">
    <path d="M14 24v-8" />
    <path d="M14 16c0-4.5-7-3.5-7-9.5" />
    <path d="M14 16c0-4.5 7-3.5 7-9.5" />
    <path d="M4.8 9 7 6.5 9.2 9M18.8 9 21 6.5 23.2 9" />
  </g>,
  <g key="match" stroke="#004D40" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(1,1)">
    <circle cx="10.5" cy="8.5" r="3.6" />
    <path d="M3.5 23c0-4.2 3.2-7 7-7 1.6 0 3 .4 4.2 1.2" />
    <circle cx="19" cy="18.5" r="4.6" stroke="#D4AF37" />
    <path d="M17 18.5l1.5 1.5 2.7-3" stroke="#D4AF37" />
  </g>,
  <g key="pin" transform="translate(3,1)">
    <ellipse cx="11" cy="23.5" rx="8.5" ry="2.8" stroke="#D4AF37" strokeWidth={1.2} fill="none" opacity="0.9" />
    <path d="M11 1 C16.2 1 20.2 5 20.2 10 C20.2 16.2 11 23.5 11 23.5 C11 23.5 1.8 16.2 1.8 10 C1.8 5 5.8 1 11 1 Z" fill="#004D40" />
    <circle cx="11" cy="9.6" r="3.2" fill="#ffffff" />
  </g>,
];

function StationCard({
  index,
  delay,
  animate,
  reduced,
}: {
  index: number;
  delay: number;
  animate: boolean;
  reduced: boolean;
}) {
  const { t } = useTranslation('common');
  // The card's own elements relay in order once the card is visible.
  const part = (offset: number, from: object) => ({
    initial: reduced ? (false as const) : { opacity: 0, ...from },
    animate: animate ? { opacity: 1, x: 0, y: 0, scale: 1 } : {},
    transition: { delay: delay + offset, duration: 0.3, ease: 'easeOut' as const },
  });
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={animate ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl border border-neutral-100 bg-white px-[18px] pb-[18px] shadow-[0_20px_44px_-20px_rgba(2,22,17,0.4)]"
    >
      <div className="-mt-7 flex items-center gap-3">
        <motion.span
          initial={reduced ? false : { opacity: 0, scale: 0 }}
          animate={animate ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: delay + 0.1, type: 'spring', stiffness: 280, damping: 20 }}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-neutral-100 bg-white shadow-[0_10px_24px_-10px_rgba(2,22,17,0.28)]"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            {ICONS[index]}
          </svg>
        </motion.span>
        <motion.span
          {...part(0.22, { x: -8 })}
          className="whitespace-nowrap rounded-full border border-neutral-100 bg-white px-3 py-[5px] text-body-3xs font-semibold uppercase tracking-[0.12em] text-neutral-600 shadow-[0_6px_16px_-8px_rgba(2,22,17,0.25)]"
        >
          {index + 1} · {t(`howItWorks.stages.${index}.kicker`)}
        </motion.span>
      </div>
      <motion.p {...part(0.32, { y: 8 })} className="mt-3.5 text-body-md font-bold leading-snug text-neutral-900">
        {t(`howItWorks.stages.${index}.title`)}
      </motion.p>
      <motion.p {...part(0.42, { y: 8 })} className="mt-[7px] text-body-xs leading-relaxed text-neutral-600">
        {t(`howItWorks.stages.${index}.short`)}
      </motion.p>
    </motion.div>
  );
}

// Mobile stations reveal themselves as they scroll in, same inner relay.
function MobileStation({ index }: { index: number }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');
  const reduced = useReducedMotion();
  return (
    <div ref={ref}>
      <StationCard index={index} delay={0} animate={inView || !!reduced} reduced={!!reduced} />
    </div>
  );
}

export function HowItWorksRoute() {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');
  const reduced = useReducedMotion();
  const animate = inView || !!reduced;

  return (
    // Full-bleed petrol (user decision 2026-08-25): the gradient runs edge to
    // edge; only the content keeps the container width.
    <section id="the-five-steps" className="bg-[linear-gradient(160deg,#004D40_0%,#00231D_100%)] py-20 lg:py-24">
      <Container size="2xl" bleed className="px-4 md:px-6 lg:px-10">
        <div>
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
            <span className="text-body-2xs font-semibold uppercase tracking-[0.14em] text-white/65">{t('howItWorks.eyebrow')}</span>
            <h2 className="font-serif text-[2rem] font-semibold leading-[1.18] tracking-tight text-white lg:text-[2.75rem]">
              {t('howItWorks.title.pre')}
              <span className="whitespace-nowrap text-accent-500">{t('howItWorks.title.gold')}</span>
              {t('howItWorks.title.post')}
            </h2>
            <p className="text-body-lg leading-relaxed text-white/75">{t('howItWorks.lead')}</p>
          </div>

          {/* Desktop: the route — a fixed 1240px stage, scaled to fit. */}
          <div ref={ref} className="mt-14 hidden md:block">
            <FitScale width={1240} height={412}>
              <div className="relative mt-3 h-[400px] w-[1240px]">
                <svg viewBox="0 0 1240 400" fill="none" className="absolute inset-0 h-full w-full">
                  {CARDS.slice(0, -1).map((_, i) => (
                    <motion.path
                      key={i}
                      d={arc(i)}
                      stroke="#D4AF37"
                      strokeWidth={2}
                      strokeLinecap="round"
                      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                      animate={animate ? { pathLength: 1, opacity: 0.9 } : {}}
                      transition={{ delay: i * SLOT + ARC_START, duration: ARC_DUR, ease: 'easeInOut' }}
                    />
                  ))}
                </svg>
                {CARDS.map((c, i) => (
                  <div key={i} className="absolute" style={{ left: c.x, top: c.y, width: CARD_W }}>
                    <StationCard index={i} delay={i * SLOT} animate={animate} reduced={!!reduced} />
                  </div>
                ))}
              </div>
            </FitScale>
          </div>

          {/* Mobile: the stations stacked, same cards. */}
          <div className="mt-14 flex flex-col gap-10 md:hidden">
            {CARDS.map((_, i) => (
              <MobileStation key={i} index={i} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              to={`/${locale ?? 'en'}/how-it-works`}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent-500 underline decoration-dotted underline-offset-4 hover:decoration-solid"
            >
              {t('howItWorks.seeAll')}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
