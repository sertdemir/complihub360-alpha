import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Lock, Minus, Plus } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { TypeOnView } from '../components/ui/TypeOnView';
import { SiteFooter } from '../components/home';
import { HowOrchestrationWorks } from '../components/compliance-areas';
import { SectionEyebrow, GoldWord, Reveal, Stagger, StaggerItem } from '../components/providers/SectionHeading';
import { useInViewOnce } from '../lib/useInViewOnce';

// ─── /pricing ────────────────────────────────────────────────────────────────
// Redesigned 2026-08-24 against the pricing canvas: the three free items became
// large numbered cards whose copy TYPES itself in on arrival, the three
// statements (who pays / ranking / the specialist's fee) became alternating
// text-and-image teasers, and the page gained the FAQ it never had. It closes
// on the same orchestration band as the area and market pages.
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

// ─── Teaser vignettes (decorative) ───────────────────────────────────────────

function BookingVignette() {
  const { t } = useTranslation('common');
  return (
    <div
      aria-hidden="true"
      className="flex h-[340px] w-full items-center justify-center rounded-xl border border-stroke bg-surface desktop-s:w-[520px]"
    >
      <div className="w-[300px] rounded-xl border border-stroke bg-surface p-6 shadow-[0_12px_32px_rgba(15,23,42,0.07)]">
        <div className="flex items-center gap-3">
          <div className="h-[38px] w-[38px] rounded-full bg-primary-50" />
          <div className="flex flex-col gap-1.5">
            <div className="h-[9px] w-[130px] rounded-[5px] bg-stroke" />
            <div className="h-2 w-[90px] rounded-[5px] bg-stroke-subtle" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2.5 border-t border-dashed border-stroke pt-4">
          <div className="flex justify-between text-body-xs text-fg-tertiary">
            <span>{t('pricing.vignette.confirmed')}</span>
            <Check size={14} className="text-fg-brand" />
          </div>
          <div className="flex justify-between text-body-xs text-fg-tertiary">
            <span>{t('pricing.vignette.yourCost')}</span>
            <span className="font-bold text-fg">0 €</span>
          </div>
          <div className="flex justify-between text-body-xs text-fg-tertiary">
            <span>{t('pricing.vignette.fee')}</span>
            <span className="font-semibold">{t('pricing.vignette.feePaidBy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingVignette() {
  const { t } = useTranslation('common');
  const rows = [
    { pct: 98, w: 'w-[150px]', lead: true },
    { pct: 91, w: 'w-[120px]', lead: false },
    { pct: 87, w: 'w-[135px]', lead: false },
  ];
  return (
    <div
      aria-hidden="true"
      className="flex h-[340px] w-full items-center justify-center rounded-xl border border-stroke-subtle bg-surface-secondary desktop-s:w-[520px]"
    >
      <div className="flex w-[320px] flex-col gap-3">
        {rows.map((r, i) => (
          <div
            key={r.pct}
            className={`flex items-center gap-3.5 rounded-xl border bg-surface px-4 py-3.5 ${
              r.lead ? 'border-primary-100' : 'border-stroke'
            }`}
          >
            <span className={`font-serif text-body font-bold ${r.lead ? 'text-fg-brand' : 'text-fg-tertiary'}`}>
              {i + 1}
            </span>
            <div className={`h-[9px] rounded-[5px] bg-stroke ${r.w}`} />
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-body-3xs font-semibold ${
                r.lead ? 'bg-primary-50 text-fg-brand' : 'bg-surface-tertiary text-fg-tertiary'
              }`}
            >
              {t('pricing.vignette.match', { pct: r.pct })}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stroke px-4 py-3 text-body-2xs font-medium text-fg-tertiary">
          <Lock size={13} />
          {t('pricing.vignette.noSlot')}
        </div>
      </div>
    </div>
  );
}

function FeeVignette() {
  const { t } = useTranslation('common');
  return (
    <div
      aria-hidden="true"
      className="flex h-[340px] w-full items-center justify-center rounded-xl border border-stroke bg-surface desktop-s:w-[520px]"
    >
      <div className="w-[320px] overflow-hidden rounded-xl border border-stroke bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.07)]">
        <div className="flex items-center gap-3 border-b border-stroke-subtle px-6 py-5">
          <div className="h-[38px] w-[38px] rounded-full bg-primary-50" />
          <div className="flex flex-col gap-1.5">
            <div className="h-[9px] w-[120px] rounded-[5px] bg-stroke" />
            <span className="text-body-3xs font-semibold uppercase tracking-[0.08em] text-accent-700">
              {t('pricing.vignette.verified')}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 px-6 py-5">
          <span className="text-body-2xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">
            {t('pricing.vignette.rangeLabel')}
          </span>
          <span className="font-serif text-h2 font-bold tabular-nums text-fg">
            {t('pricing.vignette.range')}{' '}
            <span className="font-sans text-body-xs font-medium text-fg-tertiary">
              {t('pricing.vignette.perHour')}
            </span>
          </span>
          <span className="text-body-2xs text-fg-tertiary">{t('pricing.vignette.published')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Teaser row (text + vignette, alternating) ───────────────────────────────

function Teaser({
  base,
  vignette,
  imageLeft = false,
  tinted = false,
}: {
  base: 'who' | 'ranking' | 'specialist';
  vignette: React.ReactNode;
  imageLeft?: boolean;
  tinted?: boolean;
}) {
  const { t } = useTranslation('common');
  const text = (
    <SlideIn from={imageLeft ? 'right' : 'left'} className="min-w-0 flex-1">
      <SectionEyebrow tone="brand">{t(`pricing.${base}.kicker`)}</SectionEyebrow>
      <h2 className="mt-3 font-serif text-h1 font-semibold text-fg">{t(`pricing.${base}.title`)}</h2>
      <p className="mt-4 max-w-[52ch] text-body leading-relaxed text-fg-secondary">
        {t(`pricing.${base}.body`)}
      </p>
    </SlideIn>
  );
  const image = (
    <SlideIn from={imageLeft ? 'left' : 'right'} className="w-full shrink-0 desktop-s:w-auto">
      {vignette}
    </SlideIn>
  );
  return (
    <section className={tinted ? 'border-y border-stroke-subtle bg-surface-secondary' : 'bg-surface'}>
      <Container size="xl">
        <div className="flex flex-col gap-12 py-20 desktop-s:flex-row desktop-s:items-center desktop-s:gap-24 desktop-s:py-[5.5rem]">
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

      {/* ── The three free items, as large numbered cards ─────────────────── */}
      <section className="py-20 desktop-s:py-24">
        <Container size="xl">
          <Reveal className="max-w-[760px]">
            <SectionEyebrow tone="brand">{t('pricing.free.kicker')}</SectionEyebrow>
            <h2 className="mt-3 font-serif text-h1 font-semibold text-fg">{t('pricing.free.title')}</h2>
          </Reveal>
          <Stagger className="mt-11 grid gap-6 tablet:grid-cols-3" stagger={0.15}>
            {Array.from({ length: FREE_COUNT }, (_, i) => (
              <StaggerItem key={i}>
                <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-stroke-subtle bg-surface p-9">
                  <span className="font-serif text-display-md font-semibold tabular-nums text-primary-100">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-5 font-serif text-h3 font-bold leading-snug text-fg">
                    {t(`pricing.free.items.${i}.title`)}
                  </p>
                  <TypeOnView
                    text={t(`pricing.free.items.${i}.desc`)}
                    className="mt-3 text-body-md leading-relaxed text-fg-secondary"
                    delay={0.2 + i * 0.15}
                  />
                  <span className="mt-auto pt-6 text-body-xs font-semibold text-fg-brand">
                    {t(`pricing.free.items.${i}.price`)}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ── Three teasers, text and image alternating ─────────────────────── */}
      <Teaser base="who" vignette={<BookingVignette />} tinted />
      <Teaser base="ranking" vignette={<RankingVignette />} imageLeft />
      <Teaser base="specialist" vignette={<FeeVignette />} tinted />

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
