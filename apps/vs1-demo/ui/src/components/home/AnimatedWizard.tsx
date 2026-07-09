import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Info,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  BarChart3,
  Globe,
  Shield,
  MessageSquare,
  Building2,
  ShieldCheck,
  ShoppingCart,
  Boxes,
  Store,
  Cloud,
  Layers,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { WizardDrawerLayer, COUNTRY_INFO } from './MarketsDrawer';

// ─── AnimatedWizard — auto-playing hero key-visual ───────────────────────────
// A fake cursor moves across the wizard, clicks option cards (they select), then
// clicks the footer button to advance — stepping through Markets → Operations →
// Domains and looping. Light desktop wizard (Figma 2463:2242). Mode-aware tokens.

type Card = { id: string; icon?: LucideIcon; title: string; desc: string };

type StepDef = {
  rail: number;
  stepLabel: string;
  title: string;
  subtitle: string;
  cards: Card[];
  pills?: { caption: string; items: string[] };
  picks: string[]; // ids clicked in order, then the footer
  footer: string;
};

const RAIL = ['Markets', 'Operations', 'Domains', 'Review'];

const STEPS: StepDef[] = [
  {
    rail: 0,
    stepLabel: 'Step 1 of 4',
    title: 'Where do you operate?',
    subtitle: 'Multi-select. We map regulations against the markets you sell into.',
    cards: [
      { id: 'Germany', title: 'Germany', desc: 'Primary VAT regime · LUCID register' },
      { id: 'United Kingdom', title: 'United Kingdom', desc: 'Post-Brexit packaging + VAT' },
      { id: 'Netherlands', title: 'Netherlands', desc: 'VAT + WEEE register' },
      { id: 'France', title: 'France', desc: 'EPR + AGEC compliance' },
      { id: 'Italy', title: 'Italy', desc: 'VAT + REACH' },
      { id: 'Spain', title: 'Spain', desc: 'VAT + ecodesign' },
      { id: 'United States', title: 'United States', desc: 'Sales-tax nexus · marketplace facilitator' },
      { id: 'Türkiye', title: 'Türkiye', desc: 'VAT (KDV) · e-fatura / e-arşiv' },
      { id: 'Others', title: 'Others', desc: 'Open country list →' },
    ],
    picks: ['Germany', 'United Kingdom', 'Netherlands'],
    footer: 'Next',
  },
  {
    rail: 1,
    stepLabel: 'Step 2 of 4',
    title: 'What do your operations look like?',
    subtitle: 'We scope the regulations that apply to your operation, not just your market.',
    cards: [
      { id: 'D2C e-commerce', icon: ShoppingCart, title: 'D2C e-commerce', desc: 'Direct-to-consumer online sales' },
      { id: 'B2B / wholesale', icon: Boxes, title: 'B2B / wholesale', desc: 'Sell to businesses or distributors' },
      { id: 'Marketplace', icon: Store, title: 'Marketplace', desc: 'You connect buyers + sellers' },
      { id: 'SaaS / digital', icon: Cloud, title: 'SaaS / digital', desc: 'Software, no physical shipment' },
      { id: 'Hybrid', icon: Layers, title: 'Hybrid', desc: 'Mix of B2B and B2C channels' },
      { id: 'Other', icon: MoreHorizontal, title: 'Other', desc: 'Tell us in a sentence' },
    ],
    picks: ['D2C e-commerce'],
    footer: 'Next',
  },
  {
    rail: 2,
    stepLabel: 'Step 3 of 4',
    title: 'Which compliance areas concern you?',
    subtitle: 'Multi-select. We prioritize the obligations in these domains.',
    cards: [
      { id: 'VAT & Tax', icon: BarChart3, title: 'VAT & Tax', desc: 'Cross-border VAT, OSS/IOSS, thresholds' },
      { id: 'EPR & Packaging', icon: Globe, title: 'EPR & Packaging', desc: 'Producer responsibility, registers' },
      { id: 'GDPR & Privacy', icon: Shield, title: 'GDPR & Privacy', desc: 'DPIA, RoPA, processor agreements' },
      { id: 'Marketing', icon: MessageSquare, title: 'Marketing', desc: 'Consent, cookies, dark-pattern audits' },
      { id: 'Corporate', icon: Building2, title: 'Corporate', desc: 'Annual statements, beneficial owners' },
      { id: 'Full Coverage', icon: ShieldCheck, title: 'Full Coverage', desc: 'Cross-domain partner routing' },
    ],
    picks: ['VAT & Tax', 'EPR & Packaging', 'GDPR & Privacy'],
    footer: 'Skip & route',
  },
];

const FOOTER = '__footer';

// Review summary row (Step 4 · Figma 1660:162) — label + value + Edit.
function SummaryRow({ label, value, onEdit }: { label: string; value: string[]; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle py-5 last:border-0">
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</p>
        <p className="mt-1.5 text-[15px] font-medium text-fg">{value.length ? value.join(' · ') : '—'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[13px] font-semibold text-fg-brand transition-colors hover:text-brand"
      >
        Edit
      </button>
    </div>
  );
}

function StepRail({ current, spacious = false }: { current: number; spacious?: boolean }) {
  // Fixed-width nodes + equal flex connectors → the rail is symmetric, so it
  // (and the "Step X of 4" label below) centers truly under the window.
  return (
    <div className={'mx-auto flex w-full items-center ' + (spacious ? 'max-w-[680px]' : 'max-w-[560px]')}>
      {RAIL.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'upcoming';
        return (
          <Fragment key={label}>
            <div className={'flex shrink-0 flex-col items-center gap-1.5 ' + (spacious ? 'w-[100px]' : 'w-[84px]')}>
              <span
                className={
                  (spacious ? 'h-3 w-3 ' : 'h-3.5 w-3.5 ') +
                  'rounded-full ' +
                  (state === 'done'
                    ? 'bg-brand'
                    : state === 'active'
                    ? 'bg-brand ring-4 ring-brand-light'
                    : 'border border-stroke bg-surface')
                }
              />
              <span
                className={
                  (spacious ? 'text-[13px] ' : 'text-[10px] ') +
                  'font-semibold ' +
                  (state === 'upcoming' ? 'text-fg-tertiary' : 'text-fg')
                }
              >
                {label}
              </span>
            </div>
            {i < RAIL.length - 1 && <span className="mx-3 mb-4 h-px flex-1 bg-stroke" />}
          </Fragment>
        );
      })}
    </div>
  );
}

export function AnimatedWizard({
  className = '',
  interactive = false,
  showHeader = true,
  spacious = false,
  onComplete,
}: {
  className?: string;
  /** User-driven: click cards to select, Back/Next to move; no auto-play, no cursor. */
  interactive?: boolean;
  /** Show the wizard topbar (logo + save link). */
  showHeader?: boolean;
  /** Full-width, natural-size layout with generous whitespace (Figma 1649:2). */
  spacious?: boolean;
  /** Called when the user advances past the last step (interactive mode). */
  onComplete?: () => void;
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const targets = useRef(new Map<string, HTMLElement | null>());
  const setTarget = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) targets.current.set(id, el);
      else targets.current.delete(id);
    },
    [],
  );

  const [stepIndex, setStepIndex] = useState(reduced && !interactive ? 2 : 0);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(reduced && !interactive ? ['VAT & Tax', 'EPR & Packaging', 'GDPR & Privacy'] : []),
  );
  const [active, setActive] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 120, y: 60 });
  const [pulse, setPulse] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extraMarkets, setExtraMarkets] = useState<string[]>([]);
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  // Commit the drawer's market picks; the "Others" card reflects the selection.
  const applyExtraMarkets = (v: string[]) => {
    setExtraMarkets(v);
    setSelected((prev) => {
      const n = new Set(prev);
      if (v.length) n.add('Others');
      else n.delete('Others');
      return n;
    });
  };

  // Interactive handlers (no-ops in auto-play mode).
  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const goNext = () => {
    // stepIndex runs 0..STEPS.length-1 (card steps) then STEPS.length (Review).
    if (stepIndex < STEPS.length) {
      setStepIndex(stepIndex + 1);
      setActive(null);
    } else {
      onComplete?.();
    }
  };
  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      setActive(null);
    }
  };

  // Measure the active target relative to the wizard root → cursor position.
  // Uses layout offsets (not getBoundingClientRect) so it stays correct even when
  // the whole wizard is wrapped in a CSS transform scale.
  useEffect(() => {
    if (!active) return;
    const el = targets.current.get(active);
    if (!el) return; // offsetParent is the `relative` root for every target
    setCursor({ x: el.offsetLeft + el.offsetWidth * 0.5, y: el.offsetTop + el.offsetHeight * 0.5 });
  }, [active, stepIndex]);

  // Timeline driver (auto-play only).
  useEffect(() => {
    if (reduced || interactive) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const firePulse = () => setPulse((p) => p + 1);

    (async () => {
      while (!cancelled) {
        for (let i = 0; i < STEPS.length; i++) {
          if (cancelled) return;
          setStepIndex(i);
          setSelected(new Set());
          setActive(null);
          await sleep(680);
          for (const pick of STEPS[i].picks) {
            if (cancelled) return;
            setActive(pick);
            await sleep(820);
            if (cancelled) return;
            setSelected((prev) => new Set(prev).add(pick));
            firePulse();
            await sleep(470);
          }
          if (cancelled) return;
          setActive(FOOTER);
          await sleep(820);
          firePulse();
          await sleep(620);
        }
        await sleep(720);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reduced, interactive]);

  const isReview = stepIndex >= STEPS.length;
  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const sp = spacious;
  // Hero (compact) shows 6 cards; the spacious Figma layout shows the full set.
  const cards = sp ? step.cards : step.cards.slice(0, 6);

  // Review summary (Step 4) derived from the user's selections.
  const reviewMarkets = [
    ...STEPS[0].cards.filter((c) => c.id !== 'Others' && selected.has(c.id)).map((c) => c.title),
    ...extraMarkets,
  ];
  const reviewOps = STEPS[1].cards.filter((c) => selected.has(c.id)).map((c) => c.title);
  const reviewDomains = STEPS[2].cards.filter((c) => selected.has(c.id)).map((c) => c.title);
  const editStep = (i: number) => {
    setStepIndex(i);
    setActive(null);
  };

  return (
    <div
      ref={rootRef}
      className={
        'relative flex flex-col overflow-hidden rounded-[20px] border border-stroke-subtle bg-surface ' +
        (sp ? 'w-full min-h-[820px] ' : 'w-[760px] ' + (interactive ? 'min-h-[460px] ' : 'h-[588px] ')) +
        className
      }
    >
      {/* Topbar — logo · (progress rail, spacious) · save link */}
      {showHeader && (
        <div
          className={
            'flex items-center justify-between border-b border-stroke-subtle ' +
            (sp ? 'relative px-16 py-5' : 'px-7 py-3')
          }
        >
          <Logo lockup="horizontal" tone="on-light" href={null} markClassName={sp ? 'h-9' : 'h-7'} />
          {sp && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
              <StepRail current={isReview ? STEPS.length : step.rail} spacious />
            </div>
          )}
          <button
            type="button"
            onClick={interactive ? () => setSaveOpen(true) : undefined}
            className={
              'flex items-center gap-0.5 font-semibold uppercase tracking-wide text-fg-brand ' +
              (sp ? 'text-[12px]' : 'text-[10px]') +
              (interactive ? ' transition-colors hover:text-brand' : '')
            }
          >
            Save progress <ChevronRight size={sp ? 14 : 12} />
          </button>
        </div>
      )}

      {/* Body — flex column so step changes never resize the window. */}
      <div className={'flex flex-1 flex-col overflow-hidden ' + (sp ? 'px-16 pb-8 pt-12' : 'px-7 pb-5 pt-5')}>
        {/* Compact (hero) keeps the rail in the body; spacious puts it in the header. */}
        {!sp && <StepRail current={step.rail} spacious={sp} />}

        {/* In spacious mode, content sits in a centered 880px column; the body's
            extra height becomes whitespace above the footer. */}
        <div className={sp ? 'mx-auto w-full max-w-[880px]' : 'contents'}>
          <div className={sp ? 'text-center' : 'mt-5 text-left'}>
            <h3 className={'font-serif font-bold leading-tight text-fg ' + (sp ? 'text-[38px]' : 'text-[24px]')}>
              {isReview ? 'Your situation, summarized.' : step.title}
            </h3>
            <p
              className={
                'leading-relaxed text-fg-secondary ' +
                (sp ? 'mx-auto mt-3 max-w-xl text-[16px]' : 'mt-2 max-w-md text-[12px]')
              }
            >
              {isReview
                ? "Here’s what we’ll use. Edit anything you need, then generate your risk map."
                : step.subtitle}
            </p>
          </div>

          {/* Review summary card (Step 4 · Figma 1660:162) */}
          {isReview && (
            <>
              <div className="mx-auto mt-9 max-w-[640px] rounded-2xl border-2 border-accent-400 bg-surface px-6">
                <SummaryRow label="Markets" value={reviewMarkets} onEdit={() => editStep(0)} />
                <SummaryRow label="Operations" value={reviewOps} onEdit={() => editStep(1)} />
                <SummaryRow label="Compliance domains" value={reviewDomains} onEdit={() => editStep(2)} />
              </div>
              <p className="mt-8 text-center text-[14px] text-fg-tertiary">
                Anonymous · No account required to see your risk map · Processed in ~4 seconds
              </p>
            </>
          )}

          {/* Card grid */}
          {!isReview && (
          <div className={'grid ' + (sp ? 'mt-9 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'mt-5 grid-cols-3 gap-3')}>
            {cards.map((c) => {
              const on = selected.has(c.id);
              return (
                <div
                  key={c.id}
                  ref={setTarget(c.id)}
                  onClick={interactive ? () => (c.id === 'Others' ? setDrawerOpen(true) : toggle(c.id)) : undefined}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (c.id === 'Others') setDrawerOpen(true);
                            else toggle(c.id);
                          }
                        }
                      : undefined
                  }
                  className={
                    'rounded-xl border transition-colors duration-200 ' +
                    (sp ? 'p-[18px] ' : 'p-3.5 ') +
                    (interactive ? 'cursor-pointer hover:border-stroke-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus ' : '') +
                    (on ? 'border-stroke-brand bg-brand-light/50 ring-1 ring-stroke-brand' : 'border-stroke bg-surface')
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {c.id === 'Others' && extraMarkets.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {extraMarkets.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[12px] font-medium text-fg-brand"
                            >
                              {id}
                              <button
                                type="button"
                                aria-label={`Remove ${id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyExtraMarkets(extraMarkets.filter((x) => x !== id));
                                }}
                                className="-mr-0.5 text-fg-brand/70 transition-colors hover:text-fg-brand"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : c.icon ? (
                        <c.icon size={sp ? 22 : 19} className="text-fg-brand" strokeWidth={1.75} />
                      ) : (
                        <span className={'block ' + (sp ? 'h-[22px]' : 'h-[19px]')} />
                      )}
                    </div>
                    <span className="shrink-0">
                      {on ? (
                        <Check size={sp ? 18 : 15} strokeWidth={2.5} className="text-fg-brand" />
                      ) : c.id === 'Others' ? null : interactive && COUNTRY_INFO[c.id] ? (
                        <button
                          type="button"
                          aria-label={`About ${c.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoCountry(c.id);
                          }}
                          className="-m-1 rounded-full p-1 text-fg-tertiary transition-colors hover:text-fg-brand"
                        >
                          <Info size={sp ? 16 : 13} />
                        </button>
                      ) : (
                        <Info size={sp ? 16 : 13} className="text-fg-tertiary" />
                      )}
                    </span>
                  </div>
                  <p className={'font-semibold leading-tight text-fg ' + (sp ? 'mt-3 text-[16px]' : 'mt-2.5 text-[13px]')}>
                    {c.title}
                  </p>
                  <p className={'leading-snug text-fg-secondary ' + (sp ? 'mt-1 text-[14px]' : 'mt-1 text-[11px]')}>
                    {c.desc}
                  </p>
                </div>
              );
            })}
          </div>
          )}

          {/* Optional pills */}
          {!isReview && step.pills && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">{step.pills.caption}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {step.pills.items.map((p) => {
                  const on = selected.has(p);
                  return (
                    <span
                      key={p}
                      ref={setTarget(p)}
                      className={
                        'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ' +
                        (on ? 'border-stroke-brand bg-brand-light/50 text-fg-brand' : 'border-stroke text-fg-secondary')
                      }
                    >
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {/* Compact: route hint sits in the body; spacious moves it into the footer. */}
          {!sp && (
            <p className="mx-auto mt-auto pt-4 text-center text-[11px] text-fg-tertiary">
              Not sure? Skip and we'll route based on your business model and markets.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={
          'flex items-center justify-between border-t border-stroke-subtle ' +
          (sp ? 'relative px-16 py-5' : 'px-7 py-3.5')
        }
      >
        {sp && !isReview && (
          <p className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 px-4 text-center text-[13px] text-fg-tertiary lg:block">
            Not sure? Skip and we&rsquo;ll route based on your business model and markets.
          </p>
        )}
        {interactive ? (
          <>
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className={
                'inline-flex items-center gap-1.5 font-medium text-fg-tertiary transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-40 ' +
                (sp ? 'text-[14px]' : 'text-[13px]')
              }
            >
              <ArrowLeft size={sp ? 16 : 15} /> Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className={
                'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-transform duration-200 hover:-translate-y-0.5 ' +
                (sp ? 'px-6 py-3 text-[15px]' : 'px-5 py-2.5 text-[13px]') +
                (isReview ? ' bg-accent-500 text-primary-950' : ' bg-brand text-fg-on-brand')
              }
            >
              {isReview ? 'Generate my risk map' : 'Next'} <ArrowRight size={sp ? 16 : 14} />
            </button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg-tertiary">
              <ArrowLeft size={15} /> Back
            </span>
            <span
              ref={setTarget(FOOTER)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-fg-on-brand"
            >
              {step.footer} <ArrowRight size={14} />
            </span>
          </>
        )}
      </div>

      {/* Fake cursor */}
      {!reduced && !interactive && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-20"
          animate={{ x: cursor.x, y: cursor.y }}
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.62 }}
        >
          {/* click pulse */}
          <motion.span
            key={pulse}
            className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary-500"
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="drop-shadow-md"
            animate={{ scale: pulse ? [1, 0.82, 1] : 1 }}
            transition={{ duration: 0.32 }}
          >
            <path d="M2 1.5 L2 15 L6 11.5 L9 17 L11.5 16 L8.5 10.5 L14 10.5 Z" fill="#0B0B0B" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>
      )}

      {/* Drawers — rendered inside the wizard (blurred behind), interactive only */}
      {interactive && (
        <WizardDrawerLayer
          marketsOpen={drawerOpen}
          onMarketsClose={() => setDrawerOpen(false)}
          value={extraMarkets}
          onChange={applyExtraMarkets}
          infoCountry={infoCountry}
          onInfoClose={() => setInfoCountry(null)}
          onSelectCountry={(id) => setSelected((prev) => new Set(prev).add(id))}
          saveOpen={saveOpen}
          onSaveClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  );
}
