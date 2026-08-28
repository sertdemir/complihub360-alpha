import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Lock, Minus, Plus } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { SiteFooter } from '../components/home';
import { HowOrchestrationWorks } from '../components/compliance-areas';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { useInViewOnce } from '../lib/useInViewOnce';

// ─── /pricing ────────────────────────────────────────────────────────────────
// Redesigned 2026-08-24 against the pricing canvas; re-dressed section by
// section from 2026-08-28 (Gradient hero with the receipt card, the free
// items as a card trio on a Gradient panel). The three statements (who pays /
// ranking / the specialist's fee) are alternating text-and-image teasers, and
// the page carries the FAQ it never had before 08-24.
//
// Still deliberately a USER-side page only (see the pricing decision: providers
// are sold offline/B2B, no self-checkout) — the page answers one question: what
// does this cost me? The answer is "nothing", and the teasers carry the honest
// part: who pays instead, why the ranking cannot be bought, and that the
// specialist's own fee is real and published up front.
//
// The teaser illustrations are decorative vignettes (aria-hidden) — the real
// content is the text column beside each. Their small labels still come from
// i18n so no German string is baked into markup.
//
// Copy: common.json → pricing.* (en/de/es/tr).

const FREE_COUNT = 3;
const FAQ_COUNT = 6;

// Text column slides in from its own side, the vignette from the other — the
// pair meets in the middle. Once-only, like every reveal on the marketing
// surface.
function SlideIn({
  children,
  from,
  className = '',
}: {
  children: React.ReactNode;
  from: 'left' | 'right';
  className?: string;
}) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-80px');
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: from === 'left' ? -28 : 28 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Teaser vignettes (decorative, but honest) ───────────────────────────────
// Redrawn with P3 Variante A (2026-08-28): real dossier cards with real text
// on the Gradient panels instead of grey skeleton mockups on tinted bands.
// Each card ANIMATES its own argument once in view (user ask): the partner's
// bill staggers its 0-€ rows towards the one line that costs, the ranking
// counts its match scores up while the bars grow, and the fee card lifts in.
// They stay aria-hidden — every claim they draw is stated in the copy beside
// them.

/** A number easing towards its target once `run` is true — the KPI cards' move. */
function useCountUp(to: number, run: boolean) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!run || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 800);
      setV(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return run || reduced ? v : 0;
}

function VignetteRow({
  inView,
  delay,
  children,
  className = '',
}: {
  inView: boolean;
  delay: number;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function PartnerBillVignette() {
  const { t } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');
  const rows = [
    { key: 'listing', label: t('pricing.vignette.billListing', 'Directory listing') },
    { key: 'profile', label: t('pricing.vignette.billProfile', 'Profile view') },
    { key: 'click', label: t('pricing.vignette.billClick', 'Click on the profile') },
  ];
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="w-[340px] max-w-full overflow-hidden rounded-xl bg-surface shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary"
    >
      <div className="border-b border-stroke-subtle px-5 py-3 text-body-4xs font-extrabold uppercase tracking-[0.12em] text-fg-tertiary">
        {t('pricing.vignette.billTitle', "The partner's bill")}
      </div>
      <div className="px-5 py-2">
        {rows.map((r, i) => (
          <VignetteRow
            key={r.key}
            inView={inView}
            delay={0.15 + i * 0.18}
            className={`flex items-baseline justify-between gap-3 py-2 ${i > 0 ? 'border-t border-stroke-subtle' : ''}`}
          >
            <span className="text-body-2xs text-fg-tertiary">{r.label}</span>
            <span className="text-body-2xs font-bold tabular-nums text-fg">0 €</span>
          </VignetteRow>
        ))}
        {/* The payoff lands last: the one line on the bill that costs. */}
        <VignetteRow
          inView={inView}
          delay={0.8}
          className="flex items-baseline justify-between gap-3 border-t border-stroke-subtle py-2.5"
        >
          <span className="text-body-2xs font-bold text-fg">
            {t('pricing.vignette.billBooked', 'Confirmed appointment')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-body-2xs font-bold text-fg-brand">
            <Check size={13} aria-hidden />
            {t('pricing.vignette.billDue', 'fee due')}
          </span>
        </VignetteRow>
      </div>
      <p className="border-t border-stroke-subtle bg-surface-secondary px-5 py-2.5 text-body-3xs leading-relaxed text-fg-tertiary dark:bg-white/[0.04]">
        {t('pricing.vignette.billFoot', 'You are never charged at any point.')}
      </p>
    </div>
  );
}

function RankingRow({
  rank,
  pct,
  barWidth,
  lead,
  inView,
  delay,
}: {
  rank: number;
  pct: number;
  barWidth: string;
  lead: boolean;
  inView: boolean;
  delay: number;
}) {
  const { t } = useTranslation('common');
  const value = useCountUp(pct, inView);
  return (
    <VignetteRow
      inView={inView}
      delay={delay}
      className={`flex items-center gap-3.5 rounded-xl border bg-surface px-4 py-3 dark:bg-surface-secondary ${
        lead ? 'border-primary-200' : 'border-stroke-subtle'
      }`}
    >
      <span className={`font-serif text-body font-bold ${lead ? 'text-fg-brand' : 'text-fg-tertiary'}`}>
        {rank}
      </span>
      {/* The name stays a bar on purpose — anonymity before contact is the
          product's own promise; the bar just measures in petrol now. */}
      <span className="h-2 overflow-hidden rounded-full bg-brand/10" style={{ width: barWidth }}>
        <span
          className="block h-full rounded-full bg-brand/35 transition-[width] duration-700 ease-out"
          style={{ width: inView ? '100%' : 0, transitionDelay: `${delay * 1000}ms` }}
        />
      </span>
      <span
        className={`ml-auto rounded-full px-2.5 py-1 text-body-3xs font-semibold tabular-nums ${
          lead ? 'bg-brand-light/60 text-fg-brand' : 'bg-surface-tertiary text-fg-tertiary'
        }`}
      >
        {t('pricing.vignette.match', { pct: value })}
      </span>
    </VignetteRow>
  );
}

function RankingVignette() {
  const { t } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');
  const rows = [
    { pct: 98, w: '9.375rem', lead: true },
    { pct: 91, w: '7.375rem', lead: false },
    { pct: 87, w: '8.25rem', lead: false },
  ];
  return (
    <div ref={ref} aria-hidden="true" className="flex w-[340px] max-w-full flex-col gap-2.5">
      {rows.map((r, i) => (
        <RankingRow
          key={r.pct}
          rank={i + 1}
          pct={r.pct}
          barWidth={r.w}
          lead={r.lead}
          inView={inView}
          delay={0.15 + i * 0.18}
        />
      ))}
      {/* The dashed slot arrives last: the one place money cannot buy. */}
      <VignetteRow
        inView={inView}
        delay={0.75}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stroke bg-surface/60 px-4 py-2.5 text-body-2xs font-semibold text-fg-tertiary"
      >
        <Lock size={13} aria-hidden />
        {t('pricing.vignette.noSlot')}
      </VignetteRow>
    </div>
  );
}

function FeeVignette() {
  const { t } = useTranslation('common');
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-60px');
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="w-[340px] max-w-full overflow-hidden rounded-xl bg-surface shadow-[0_34px_80px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary"
    >
      <div className="flex items-center gap-3 border-b border-stroke-subtle px-5 py-4">
        <div className="h-9 w-9 rounded-full bg-brand-light/70" />
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-[7.5rem] rounded-full bg-brand/15" />
          <span className="text-body-4xs font-extrabold uppercase tracking-[0.1em] text-accent-700 dark:text-fg-accent-strong">
            {t('pricing.vignette.verified')}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <span className="text-body-4xs font-extrabold uppercase tracking-[0.1em] text-fg-tertiary">
          {t('pricing.vignette.rangeLabel')}
        </span>
        <VignetteRow inView={inView} delay={0.3}>
          <span className="mt-1.5 block font-serif text-[1.875rem] font-bold leading-tight tabular-nums text-fg">
            {t('pricing.vignette.range')}{' '}
            <span className="font-sans text-body-xs font-medium text-fg-tertiary">
              {t('pricing.vignette.perHour')}
            </span>
          </span>
        </VignetteRow>
        <VignetteRow inView={inView} delay={0.55}>
          <span className="mt-1 block text-body-2xs text-fg-tertiary">
            {t('pricing.vignette.published')}
          </span>
        </VignetteRow>
      </div>
    </div>
  );
}

// ─── Teaser row (text + Gradient panel, alternating) ─────────────────────────
// The tinted full-bleed bands retired with P3 Variante A: each statement is a
// Gradient-panel pair now — copy on one side, the animated dossier card
// standing on the tinted panel — the same anatomy the area and market
// sections speak. The pair still slides together from both sides.

function Teaser({
  base,
  vignette,
  imageLeft = false,
}: {
  base: 'who' | 'ranking' | 'specialist';
  vignette: React.ReactNode;
  imageLeft?: boolean;
}) {
  const { t } = useTranslation('common');
  const text = (
    <SlideIn from={imageLeft ? 'right' : 'left'} className="min-w-0 shrink-0 desktop-s:w-[400px]">
      <SectionEyebrow tone="brand">{t(`pricing.${base}.kicker`)}</SectionEyebrow>
      <h2 className="mt-3 font-serif text-[1.625rem] font-bold leading-snug text-fg">
        {t(`pricing.${base}.title`)}
      </h2>
      <p className="mt-3.5 text-body leading-relaxed text-fg-secondary">
        {t(`pricing.${base}.body`)}
      </p>
    </SlideIn>
  );
  const image = (
    <SlideIn from={imageLeft ? 'left' : 'right'} className="min-w-0 w-full desktop-s:flex-1">
      <div className="flex justify-center rounded-xl bg-gradient-stage px-5 py-9 sm:px-7">
        {vignette}
      </div>
    </SlideIn>
  );
  return (
    <section className="bg-surface">
      <Container size="xl">
        <div className="flex flex-col gap-10 py-12 desktop-s:flex-row desktop-s:items-center desktop-s:gap-14 desktop-s:py-14">
          {imageLeft ? (
            <>
              <div className="hidden desktop-s:contents">{image}</div>
              {text}
              <div className="desktop-s:hidden">{image}</div>
            </>
          ) : (
            <>
              {text}
              {image}
            </>
          )}
        </div>
      </Container>
    </section>
  );
}

// ─── FAQ (canvas pattern: hairline rows, plus/minus, first open) ─────────────

function FaqItem({ index, open, onToggle }: { index: number; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation('common');
  const panelId = `pricing-faq-panel-${index}`;
  return (
    <div className="border-b border-stroke">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 px-2 py-6 text-left"
      >
        <span className="text-[17px] font-semibold leading-snug text-fg">
          {t(`pricing.faq.items.${index}.q`)}
        </span>
        {open ? (
          <Minus size={20} strokeWidth={1.75} className="shrink-0 text-fg-brand" aria-hidden />
        ) : (
          <Plus size={20} strokeWidth={1.75} className="shrink-0 text-fg-tertiary" aria-hidden />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="max-w-[62ch] px-2 pb-6 text-body-md leading-relaxed text-fg-secondary">
              {t(`pricing.faq.items.${index}.a`)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { locale } = useParams();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="bg-surface">
      {/* ── Hero on the full-bleed Gradient (canvas "Preise · Hero" ·
          Variante B "Gradient-Split mit Buchungs-Quittung", 2026-08-28) ────
          The grey statement band retires: copy stands left on the Gradient
          with the two ways onward, and the whole pricing story floats right
          as ONE receipt card — your cost 0 €, the platform fee the partner's,
          the specialist's fee quantified up front. Height pinned to the
          shared 613px hero band; the fixed header (81px at lg) floats over
          the tint like on the hub. */}
      <section className="flex flex-col justify-center bg-gradient-stage pb-24 pt-32 lg:min-h-[38.3125rem] lg:pb-28 lg:pt-40">
        <Container size="xl">
          <div className="flex flex-col gap-14 desktop-s:flex-row desktop-s:items-center desktop-s:gap-[4.75rem]">
            <Reveal className="min-w-0 flex-1">
              <SectionEyebrow tone="brand">{t('pricing.eyebrow')}</SectionEyebrow>
              <h1 className="mt-3.5 font-serif text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-fg lg:text-[3.25rem]">
                {t('pricing.title.pre')}
                <GoldWord>{t('pricing.title.gold')}</GoldWord>
                {t('pricing.title.post')}
              </h1>
              <p className="mt-4 max-w-[540px] text-body-lg leading-relaxed text-fg-secondary">
                {t('pricing.lead')}
              </p>
              <div className="mt-8 flex flex-col gap-3 tablet:flex-row">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => navigate(`/${locale ?? 'en'}/wizard`)}
                >
                  {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
                  <ArrowRight size={17} className="ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-surface"
                  onClick={() =>
                    document.getElementById('pricing-faq')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  {t('pricing.faq.eyebrow')}
                </Button>
              </div>
            </Reveal>

            {/* The receipt — the FeeVignette's honesty condensed into the
                hero: every row is a claim the page below substantiates. */}
            <Reveal delay={0.15} className="w-full shrink-0 desktop-s:w-[380px]">
              <div className="overflow-hidden rounded-xl bg-surface shadow-[0_40px_90px_-30px_rgba(2,22,17,0.4)] dark:bg-surface-secondary">
                <div className="flex items-center justify-between border-b border-stroke-subtle px-5 py-4">
                  <span className="text-body-3xs font-bold uppercase tracking-[0.14em] text-fg-tertiary">
                    {t('pricing.receipt.title', 'Your booking')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-body-2xs font-semibold text-fg-brand">
                    <Check size={14} aria-hidden />
                    {t('pricing.vignette.confirmed')}
                  </span>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-body-sm font-bold text-fg">
                      {t('pricing.vignette.yourCost')}
                    </span>
                    <span className="font-serif text-[2.5rem] font-semibold leading-none tabular-nums text-fg">
                      0 €
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-stroke-subtle pt-3.5">
                    <span className="text-body-2xs text-fg-tertiary">{t('pricing.vignette.fee')}</span>
                    <span className="text-body-2xs font-bold text-fg">
                      {t('pricing.vignette.feePaidBy')}
                    </span>
                  </div>
                  <div className="mt-3.5 flex items-baseline justify-between gap-4 border-t border-stroke-subtle pt-3.5">
                    <span className="text-body-2xs text-fg-tertiary">
                      {t('pricing.receipt.specialistFee', "The specialist's fee")}
                    </span>
                    <span className="text-body-2xs font-bold tabular-nums text-accent-700 dark:text-fg-accent-strong">
                      {t('pricing.vignette.range')} {t('pricing.vignette.perHour')}
                    </span>
                  </div>
                </div>
                <p className="border-t border-stroke-subtle bg-surface-secondary px-5 py-3.5 text-body-3xs leading-relaxed text-fg-tertiary dark:bg-white/[0.04]">
                  {t('pricing.receipt.note', {
                    defaultValue:
                      'The fee is quantified before you commit — published before first contact, no intro call just to learn the price.',
                  })}
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── The three free items (canvas "Preise · Was kostenlos ist" ·
          Variante B "Karten-Trio auf Gradient-Panel", 2026-08-28) ──────────
          The bordered 320px cards and their typewriter body retire: the
          three posts stand as white dossier cards in ONE Gradient panel —
          gold numeral kicker, serif title, and the 0-€ price behind a
          hairline in the foot — arriving with the staggered entrance every
          card on the redesigned surface uses. */}
      <section className="py-20 desktop-s:py-24">
        <Container size="xl">
          <Reveal className="max-w-[760px]">
            <SectionEyebrow tone="brand">{t('pricing.free.kicker')}</SectionEyebrow>
            <h2 className="mt-3 font-serif text-h1 font-semibold text-fg">{t('pricing.free.title')}</h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-9 rounded-xl bg-gradient-stage p-5 sm:p-7">
            <Stagger className="grid gap-5 tablet:grid-cols-3" stagger={0.15}>
              {Array.from({ length: FREE_COUNT }, (_, i) => (
                <StaggerItem key={i} className="h-full">
                  <div className="flex h-full flex-col rounded-xl bg-surface p-7 shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary">
                    <span className="text-body-3xs font-extrabold uppercase tracking-[0.12em] tabular-nums text-accent-700 dark:text-fg-accent-strong">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-2.5 font-serif text-[1.25rem] font-bold leading-snug text-fg">
                      {t(`pricing.free.items.${i}.title`)}
                    </p>
                    <p className="mt-2.5 flex-1 text-body-sm leading-relaxed text-fg-secondary">
                      {t(`pricing.free.items.${i}.desc`)}
                    </p>
                    <span className="mt-5 border-t border-stroke-subtle pt-3.5 text-body-xs font-bold tabular-nums text-fg-brand">
                      {t(`pricing.free.items.${i}.price`)}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        </Container>
      </section>

      {/* ── Three teasers, text and animated card alternating ─────────────── */}
      <Teaser base="who" vignette={<PartnerBillVignette />} />
      <Teaser base="ranking" vignette={<RankingVignette />} imageLeft />
      <Teaser base="specialist" vignette={<FeeVignette />} />

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      {/* The id is the hero's secondary CTA target — scroll-mt clears the
          fixed header. */}
      <section id="pricing-faq" className="scroll-mt-28 py-20 desktop-s:py-24">
        <Container size="xl">
          <Reveal className="flex flex-col items-center gap-2.5 text-center">
            <SectionEyebrow tone="brand">{t('pricing.faq.eyebrow')}</SectionEyebrow>
            <h2 className="font-serif text-h1 font-semibold text-fg">{t('pricing.faq.title')}</h2>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-11 max-w-[820px] border-t border-stroke">
            {Array.from({ length: FAQ_COUNT }, (_, i) => (
              <FaqItem
                key={i}
                index={i}
                open={openFaq === i}
                onToggle={() => setOpenFaq((cur) => (cur === i ? null : i))}
              />
            ))}
          </Reveal>
        </Container>
      </section>

      {/* ── The close · the same orchestration band as area and market ────── */}
      <section className="bg-primary-700 py-16 desktop-s:py-20">
        <Container size="xl">
          <HowOrchestrationWorks tone="inverse" />
          <div className="mt-[3.5rem] border-t border-white/[0.14] pt-[2.5rem]">
            <div className="flex flex-col gap-6 desktop-s:flex-row desktop-s:items-center desktop-s:justify-between desktop-s:gap-12">
              <div className="max-w-[560px]">
                <h2 className="font-serif text-h3 font-bold text-white">{t('pricing.cta.title')}</h2>
                <p className="mt-2 text-body leading-relaxed text-primary-100">{t('pricing.cta.lead')}</p>
              </div>
              <Button
                variant="inverse"
                size="xl"
                shape="soft"
                className="shrink-0 self-start desktop-s:self-auto"
                onClick={() => navigate(`/${locale ?? 'en'}/wizard`)}
              >
                {t('hero.cta.start', { ns: 'home', defaultValue: 'Assess My Needs' })}
                <ArrowRight size={17} className="ml-1.5" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
