import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Eye, EyeOff, Globe, BarChart3, Lock, MessageSquare } from 'lucide-react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { GoldWord, SectionEyebrow } from '../providers/SectionHeading';
import { HeroWizardDesktop, HeroWizardMobile } from './HeroWizardVisual';
import { AnimatedWizard } from './AnimatedWizard';
import { RiskMapPreview } from './RiskMapPreview';

type WizardForm = 'preview' | 'desktop' | 'mobile' | 'animated';

// ─── S1 — Hero (User / Entrepreneur) · Figma 1445:99 ──────────────────────────
// "The compliance work you shouldn't be doing alone." World-map backdrop (desktop),
// two columns: copy + use-case tabs (left) · live wizard preview (right).

const TRUST = ['Anonymous', 'No credit card', 'Results in your browser'] as const;

const STEPS = [
  { label: 'Markets', state: 'done' },
  { label: 'Domains', state: 'active' },
  { label: 'Volume', state: 'upcoming' },
  { label: 'Review', state: 'upcoming' },
] as const;

const DOMAINS = [
  { label: 'VAT & Tax', icon: BarChart3, on: true },
  { label: 'EPR & Packaging', icon: Globe, on: true },
  { label: 'GDPR & Privacy', icon: Lock, on: false },
  { label: 'Marketing Compliance', icon: MessageSquare, on: false },
] as const;

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-surface" />
      <div className="absolute inset-0 hidden lg:block">
        {/* World map capped at 1440px, centered — beyond that only the side margins grow. */}
        <img src="/img/hero-worldmap.png" alt="" className="absolute inset-0 mx-auto h-full w-full max-w-[1440px] object-cover opacity-[0.42]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-primary-500/[0.05]" />
        <div className="absolute right-[6%] top-[14%] h-[500px] w-[800px] rounded-full bg-primary-500/10 blur-[130px]" />
      </div>
    </div>
  );
}

function WizardPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-[480px] overflow-hidden rounded-2xl border border-stroke-subtle bg-surface shadow-xl ${className}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-stroke-subtle px-5 py-3.5">
        <span className="flex items-center gap-2 text-h6 font-semibold text-fg">
          <span className="h-4 w-4 rounded bg-accent-500" /> CompliHub
        </span>
        <span className="text-[12px] text-fg-tertiary">Cross-border launch — DE → UK + NL</span>
      </div>
      {/* Stepper */}
      <div className="flex items-center gap-1.5 px-5 py-4">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-1.5">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                s.state === 'done'
                  ? 'bg-brand text-fg-on-brand'
                  : s.state === 'active'
                  ? 'bg-accent-500 text-primary-900'
                  : 'border border-stroke text-fg-tertiary'
              }`}
            >
              {s.state === 'done' ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span className={`text-[12px] font-medium ${s.state === 'upcoming' ? 'text-fg-tertiary' : 'text-fg'}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-stroke-subtle" />}
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Step 2 of 4</p>
        <p className="mt-1 font-serif text-[19px] font-bold leading-snug text-fg">Which compliance domains are in scope?</p>
        <p className="mt-1.5 text-body-sm text-fg-secondary">Select all that apply. We'll map only the regulations relevant to your scope.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {DOMAINS.map((dm) => (
            <span
              key={dm.label}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium ${
                dm.on ? 'border-transparent bg-brand text-fg-on-brand' : 'border-stroke text-fg-secondary'
              }`}
            >
              {dm.on ? <Check size={15} strokeWidth={2.5} /> : <dm.icon size={15} />}
              {dm.label}
            </span>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-stroke-subtle px-5 py-3.5">
        <span className="text-[12px] text-fg-tertiary">2 selected · 2 left</span>
        <span className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-fg-secondary">Back</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-fg-on-brand">
            Continue <ArrowRight size={14} />
          </span>
        </span>
      </div>
    </div>
  );
}

// Scales a fixed-size child (e.g. the 760px wizard) down to fill its container
// width — so the wizard fills its column at any viewport (bigger, minimal side
// gaps) without overflow. Never upscales past `max`. Cursor stays aligned because
// AnimatedWizard measures targets via layout offsets, not getBoundingClientRect.
function FitScale({
  width,
  height,
  max = 1,
  className = '',
  children,
}: {
  width: number;
  height: number;
  max?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(max);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setScale(Math.min(max, el.clientWidth / width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, max]);
  return (
    <div ref={ref} className={`mx-auto w-full ${className}`} style={{ maxWidth: width, height: height * scale }}>
      <div style={{ width, height, transformOrigin: 'top left', transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}

// Hero key-visual: the animated wizard cross-fading to the risk-map result on
// hover (same 760×588 footprint → no reflow). Soft 600ms ease-in-out opacity.
function HeroVisual({ showRiskMap, className }: { showRiskMap: boolean; className?: string }) {
  return (
    <FitScale width={760} height={588} className={className}>
      {/* Single shared shadow for both views (−20% intensity), on the window shape. */}
      <div className="relative h-full w-full rounded-[20px] shadow-[0_50px_110px_-28px_rgba(2,22,17,0.36)]">
        {/* Opaque base — always rendered, no fade (prevents background show-through).
            `isolate` contains the wizard's z-20 fake cursor so it can never paint
            above the risk-map overlay. */}
        <div className="absolute inset-0 isolate">
          <AnimatedWizard />
        </div>
        {/* Risk-map fades in on top; opaque, so it fully covers when shown. */}
        <div
          aria-hidden={!showRiskMap}
          className={`absolute inset-0 z-10 transition-opacity duration-[700ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            showRiskMap ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <RiskMapPreview />
        </div>
      </div>
    </FitScale>
  );
}

export function HomeHero({ wizard = 'desktop' }: { wizard?: WizardForm } = {}) {
  // Click toggles the hero visual between the animated wizard and the risk map.
  const [showRiskMap, setShowRiskMap] = useState(false);
  // Hero CTA opens the FULL-VIEW wizard overlay (/:locale/wizard) — the
  // embedded Entry-Door wizard stays as the in-flow fallback while scrolling.
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const startAssessment = () => navigate(`/${locale}/wizard`);
  const toggleProps = {
    onClick: () => setShowRiskMap((v) => !v),
    'aria-pressed': showRiskMap,
  };
  return (
    <section className="relative overflow-hidden bg-surface">
      <HeroBackground />
      <Container size="2xl" bleed className="relative px-4 md:px-6 lg:px-6">
        {/* Desktop — two columns */}
        <div className="hidden items-center gap-6 pb-24 pt-28 lg:grid lg:grid-cols-[592px_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col"
          >
            <SectionEyebrow tone="brand">For operations leads</SectionEyebrow>
            <h1 className="mt-5 font-serif text-[3.25rem] font-semibold leading-[1.1] tracking-tight text-fg">
              The compliance work you <GoldWord>shouldn't</GoldWord> be doing alone.
            </h1>
            <p className="mt-5 max-w-[560px] text-body-lg leading-relaxed text-fg-secondary">
              CompliHub360 maps the rules that apply to your operations across European markets, then connects you to a
              verified specialist when something needs hands. Six minutes to your first risk map. No account required.
            </p>
            <div className="mt-8 flex items-center gap-7">
              <Button size="lg" onClick={startAssessment}>Start your assessment</Button>
              <button {...toggleProps} className="inline-flex items-center gap-2 text-body font-semibold text-fg-brand">
                {showRiskMap ? 'Close risk map' : 'See an example risk map'}
                {showRiskMap ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2">
              {TRUST.map((c) => (
                <span key={c} className="inline-flex items-center gap-2 text-body-sm text-fg-secondary">
                  <Check size={14} className="text-fg-brand" strokeWidth={2.5} /> {c}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            {wizard === 'preview' ? (
              <WizardPreview />
            ) : wizard === 'mobile' ? (
              <HeroWizardMobile />
            ) : wizard === 'animated' ? (
              <HeroVisual showRiskMap={showRiskMap} />
            ) : (
              <HeroWizardDesktop />
            )}
            <p className="mt-5 flex items-center gap-2 text-caption text-fg-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Six minutes · 4 questions · No account required
            </p>
          </motion.div>
        </div>

        {/* Mobile — stacked (wizard leads, above the title) */}
        <div className="flex flex-col pb-16 pt-10 lg:hidden">
          {wizard === 'preview' ? (
            <WizardPreview className="mb-9" />
          ) : wizard === 'animated' ? (
            <HeroVisual showRiskMap={showRiskMap} className="mb-9" />
          ) : (
            <HeroWizardMobile className="mx-auto mb-9" />
          )}
          <SectionEyebrow tone="brand">For operations leads</SectionEyebrow>
          <h1 className="mt-4 font-serif text-[2.1rem] font-semibold leading-[1.12] tracking-tight text-fg">
            The compliance work you <GoldWord>shouldn't</GoldWord> be doing alone.
          </h1>
          <p className="mt-4 text-body leading-relaxed text-fg-secondary">
            CompliHub360 maps the rules across European markets, then connects you to a verified specialist when
            something needs hands. Six minutes to your first risk map. No account required.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" fullWidth onClick={startAssessment}>Start your assessment</Button>
            <button {...toggleProps} className="inline-flex items-center justify-center gap-2 text-body font-semibold text-fg-brand">
              {showRiskMap ? 'Close risk map' : 'See an example risk map'}
              {showRiskMap ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {TRUST.map((c) => (
              <span key={c} className="inline-flex items-center gap-2 text-body-sm text-fg-secondary">
                <Check size={14} className="text-fg-brand" strokeWidth={2.5} /> {c}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
