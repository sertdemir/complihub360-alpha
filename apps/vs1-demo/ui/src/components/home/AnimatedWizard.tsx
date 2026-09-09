import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Truck,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import { X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { WizardDrawerLayer, COUNTRY_INFO } from './MarketsDrawer';
import type { SearchProfile, WizardCategory, BusinessType } from '../wizard/WizardContext';
import { Badge } from '../ui/Badge';

// ─── AnimatedWizard — auto-playing hero key-visual ───────────────────────────
// A fake cursor moves across the wizard, clicks option cards (they select), then
// clicks the footer button to advance — stepping through Markets → Operations →
// Domains and looping. Light desktop wizard (Figma 2463:2242). Mode-aware tokens.

// Copy lives in the 'home' namespace: wizard.cards.<key>.{title,desc},
// wizard.steps.<key>.{title,subtitle}, wizard.rail.<key>, wizard.footer.<key>.
export type Card = { id: string; key: string; icon?: LucideIcon };

export type StepDef = {
  rail: number;
  key: 'markets' | 'operations' | 'domains';
  cards: Card[];
  picks: string[]; // ids clicked in order, then the footer
  footerKey: 'next' | 'skipRoute';
};

const RAIL = ['markets', 'operations', 'domains', 'review'] as const;

export const STEPS: StepDef[] = [
  {
    rail: 0,
    key: 'markets',
    cards: [
      { id: 'Germany', key: 'germany' },
      { id: 'United Kingdom', key: 'unitedKingdom' },
      { id: 'Netherlands', key: 'netherlands' },
      { id: 'France', key: 'france' },
      { id: 'Italy', key: 'italy' },
      { id: 'Spain', key: 'spain' },
      { id: 'United States', key: 'unitedStates' },
      { id: 'Türkiye', key: 'turkiye' },
      { id: 'Others', key: 'others' },
    ],
    picks: ['Germany', 'United Kingdom', 'Netherlands'],
    footerKey: 'next',
  },
  {
    rail: 1,
    key: 'operations',
    cards: [
      { id: 'D2C e-commerce', key: 'd2cEcommerce', icon: ShoppingCart },
      { id: 'B2B / wholesale', key: 'b2bWholesale', icon: Boxes },
      { id: 'Marketplace', key: 'marketplace', icon: Store },
      { id: 'SaaS / digital', key: 'saasDigital', icon: Cloud },
      { id: 'Hybrid', key: 'hybrid', icon: Layers },
      { id: 'Other', key: 'other', icon: MoreHorizontal },
    ],
    picks: ['D2C e-commerce'],
    footerKey: 'next',
  },
  {
    rail: 2,
    key: 'domains',
    // Final 8 domains (decision 2026-08-04) — Full Coverage removed.
    cards: [
      { id: 'Tax & VAT', key: 'vatTax', icon: BarChart3 },
      { id: 'EPR & Packaging', key: 'eprPackaging', icon: Globe },
      { id: 'Data & Privacy', key: 'gdprPrivacy', icon: Shield },
      { id: 'Marketing Compliance', key: 'marketing', icon: MessageSquare },
      { id: 'Corporate & Structure', key: 'corporate', icon: Building2 },
      { id: 'Product Compliance', key: 'productCompliance', icon: ShieldCheck },
      { id: 'Logistics & Customs', key: 'logisticsCustoms', icon: Truck },
      { id: 'Legal Advisory', key: 'legalAdvisory', icon: Scale },
    ],
    picks: ['Tax & VAT', 'EPR & Packaging', 'Data & Privacy'],
    footerKey: 'skipRoute',
  },
];

const FOOTER = '__footer';

// A1 fix: completing the embedded wizard must hand a SearchProfile to the
// results page — otherwise the session save (the whole funnel anchor) never
// fires for the landing-page entry points.
export const MARKET_CODE: Record<string, string> = {
  Germany: 'DE', 'United Kingdom': 'UK', Netherlands: 'NL', France: 'FR',
  Italy: 'IT', Spain: 'ES', 'United States': 'US', 'Türkiye': 'TR',
};
const CATEGORY_CODE: Record<string, WizardCategory> = {
  'Tax & VAT': 'tax-vat', 'EPR & Packaging': 'product-packaging', 'Data & Privacy': 'data-privacy',
  'Marketing Compliance': 'marketing-seo', 'Corporate & Structure': 'corporate-structure',
  'Product Compliance': 'product-compliance', 'Logistics & Customs': 'logistics-customs',
  'Legal Advisory': 'legal-advisory',
};
const BUSINESS_CODE: Record<string, BusinessType> = {
  'D2C e-commerce': 'ecommerce', 'B2B / wholesale': 'other', Marketplace: 'marketplace',
  'SaaS / digital': 'saas', Hybrid: 'other', Other: 'other',
};

// C6 "Refine existing": a stored profile pre-selects the cards. Reverse of the
// maps above — businessTypeNote carries the original card id when available.
export function selectionFromProfile(p: SearchProfile): { selected: Set<string>; extraMarkets: string[] } {
  const sel = new Set<string>();
  const codeToCard = Object.fromEntries(Object.entries(MARKET_CODE).map(([k, v]) => [v, k]));
  const extra: string[] = [];
  for (const m of p.markets ?? []) {
    if (codeToCard[m]) sel.add(codeToCard[m]);
    else { sel.add('Others'); extra.push(m); }
  }
  const catToCard = Object.fromEntries(Object.entries(CATEGORY_CODE).map(([k, v]) => [v, k]));
  for (const c of p.categories ?? []) if (catToCard[c]) sel.add(catToCard[c]);
  if (p.businessTypeNote && STEPS[1].cards.some((c) => c.id === p.businessTypeNote)) sel.add(p.businessTypeNote);
  else {
    const btToCard = Object.fromEntries(Object.entries(BUSINESS_CODE).map(([k, v]) => [v, k]));
    if (p.businessType && btToCard[p.businessType]) sel.add(btToCard[p.businessType]);
  }
  return { selected: sel, extraMarkets: extra };
}

export function buildProfile(selected: Set<string>, extraMarkets: string[]): SearchProfile {
  const markets = [
    ...STEPS[0].cards.filter((c) => c.id !== 'Others' && selected.has(c.id)).map((c) => MARKET_CODE[c.id] ?? c.id),
    ...extraMarkets,
  ];
  const categories = STEPS[2].cards.filter((c) => selected.has(c.id)).map((c) => CATEGORY_CODE[c.id]).filter(Boolean);
  const ops = STEPS[1].cards.find((c) => selected.has(c.id));
  return {
    country: markets[0] ?? '',
    markets,
    categories,
    businessType: ops ? BUSINESS_CODE[ops.id] ?? 'other' : '',
    businessTypeNote: ops?.id ?? '',
    marketScope: markets.length > 1 ? 'eu' : markets.length ? 'local' : '',
    riskSignals: [],
    revenueBand: '',
    intent: '',
    urgency: '',
    note: '',
    existingProvider: false,
  };
}

// Review summary row (Step 4 · Figma 1660:162) — label + value + Edit.
function SummaryRow({ label, value, onEdit }: { label: string; value: string[]; onEdit: () => void }) {
  const { t } = useTranslation('home');
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle py-5 last:border-0">
      <div className="min-w-0 text-left">
        <p className="text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</p>
        <p className="mt-1.5 text-body-md font-medium text-fg">{value.length ? value.join(' · ') : '—'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-body-xs font-semibold text-fg-brand transition-colors hover:text-brand"
      >
        {t('wizard.review.edit')}
      </button>
    </div>
  );
}

function StepRail({ current, spacious = false }: { current: number; spacious?: boolean }) {
  const { t } = useTranslation('home');
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
                  (spacious ? 'text-body-xs ' : 'text-body-4xs ') +
                  'font-semibold ' +
                  (state === 'upcoming' ? 'text-fg-tertiary' : 'text-fg')
                }
              >
                {t(`wizard.rail.${label}`)}
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
  paused = false,
  onComplete,
  initialProfile,
  initialMarkets,
}: {
  className?: string;
  /** User-driven: click cards to select, Back/Next to move; no auto-play, no cursor. */
  interactive?: boolean;
  /** Show the wizard topbar (logo + save link). */
  showHeader?: boolean;
  /** Freezes the auto-play demo loop in place; resuming continues where it stopped. */
  paused?: boolean;
  /** Full-width, natural-size layout with generous whitespace (Figma 1649:2). */
  spacious?: boolean;
  /** Called when the user advances past the last step (interactive mode). */
  onComplete?: (profile: SearchProfile) => void;
  /** C6 "Refine existing": pre-selects the cards and opens on the Review step. */
  initialProfile?: SearchProfile;
  /** Market codes (DE, UK, …) already known from the entry point — a market
      page's CTA passes its own market, so the wizard pre-selects it and opens
      on Operations instead of asking the question the page just answered.
      Back still reaches the Markets step, so the pick stays editable. */
  initialMarkets?: string[];
}) {
  const { t, i18n } = useTranslation('home');
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  // Ref, not effect dep: pausing must freeze the running loop in place, not
  // restart it from step 0 the way re-running the driver effect would.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const targets = useRef(new Map<string, HTMLElement | null>());
  const setTarget = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) targets.current.set(id, el);
      else targets.current.delete(id);
    },
    [],
  );

  const prefill = initialProfile && interactive ? selectionFromProfile(initialProfile) : null;
  // Codes are validated here, not at the call site: an unknown ?market= value
  // degrades to a normal step-0 start instead of an empty pre-selection.
  const marketPrefill = (() => {
    if (!interactive || prefill || !initialMarkets?.length) return null;
    const codeToCard = Object.fromEntries(Object.entries(MARKET_CODE).map(([k, v]) => [v, k]));
    const cards = initialMarkets.map((m) => codeToCard[m.toUpperCase()]).filter(Boolean);
    return cards.length ? cards : null;
  })();
  const [stepIndex, setStepIndex] = useState(
    prefill ? STEPS.length : marketPrefill ? 1 : reduced && !interactive ? 2 : 0,
  );
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      prefill?.selected ??
      new Set(marketPrefill ?? (reduced && !interactive ? ['Tax & VAT', 'EPR & Packaging', 'Data & Privacy'] : [])),
  );
  const [active, setActive] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 120, y: 60 });
  const [pulse, setPulse] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extraMarkets, setExtraMarkets] = useState<string[]>(() => prefill?.extraMarkets ?? []);
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
      onComplete?.(buildProfile(selected, extraMarkets));
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
    const sleep = async (ms: number) => {
      await new Promise((r) => setTimeout(r, ms));
      while (pausedRef.current && !cancelled) await new Promise((r) => setTimeout(r, 150));
    };
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

  // Drawer market ids are single words, so the i18n key is just the lowercase id.
  const marketLabel = (id: string) => t(`marketsDrawer.markets.${id.toLowerCase()}.name`, { defaultValue: id });
  const cardTitle = (c: Card) => t(`wizard.cards.${c.key}.title`);

  // Review summary (Step 4) derived from the user's selections.
  const reviewMarkets = [
    ...STEPS[0].cards.filter((c) => c.id !== 'Others' && selected.has(c.id)).map(cardTitle),
    ...extraMarkets.map(marketLabel),
  ];
  const reviewOps = STEPS[1].cards.filter((c) => selected.has(c.id)).map(cardTitle);
  const reviewDomains = STEPS[2].cards.filter((c) => selected.has(c.id)).map(cardTitle);
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
          {/* Im VOLLBILD-Wizard fuehrt das Logo zurueck auf die Startseite. Der
              SiteHeader ist unter /wizard ausgeblendet (er bringt seine eigene
              Topbar mit), und solange das Logo href={null} trug, gab es von hier
              keinen Weg zurueck ausser dem Browser-Knopf — eine Sackgasse fuer
              jeden Einstieg, den Hero-CTA eingeschlossen. In den eingebetteten
              Demos auf der Startseite bleibt es Text: dort waere ein Home-Link
              der Ausgang aus einer Vorschau, die gar keine Seite ist. */}
          <Logo
            lockup="horizontal"
            tone="on-light"
            href={sp ? `/${i18n.resolvedLanguage || 'en'}` : null}
            markClassName={sp ? 'h-9' : 'h-7'}
          />
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
              (sp ? 'text-body-2xs' : 'text-body-4xs') +
              (interactive ? ' transition-colors hover:text-brand' : '')
            }
          >
            {t('wizard.saveProgress')} <ChevronRight size={sp ? 14 : 12} />
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
              {isReview ? t('wizard.review.title') : t(`wizard.steps.${step.key}.title`)}
            </h3>
            <p
              className={
                'leading-relaxed text-fg-secondary ' +
                (sp ? 'mx-auto mt-3 max-w-xl text-body' : 'mt-2 max-w-md text-body-2xs')
              }
            >
              {isReview ? t('wizard.review.subtitle') : t(`wizard.steps.${step.key}.subtitle`)}
            </p>
          </div>

          {/* Review summary card (Step 4 · Figma 1660:162) */}
          {isReview && (
            <>
              <div className="mx-auto mt-9 max-w-[640px] rounded-xl border-2 border-accent-400 bg-surface px-6">
                <SummaryRow label={t('wizard.review.markets')} value={reviewMarkets} onEdit={() => editStep(0)} />
                <SummaryRow label={t('wizard.review.operations')} value={reviewOps} onEdit={() => editStep(1)} />
                <SummaryRow label={t('wizard.review.domains')} value={reviewDomains} onEdit={() => editStep(2)} />
              </div>
              <p className="mt-8 text-center text-body-sm text-fg-tertiary">
                {t('wizard.review.trust')}
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
                  // Tastatur und Fokusring waren korrekt, der ZUSTAND war unhoerbar: man
                  // konnte auswaehlen, aber nicht erfahren, was ausgewaehlt ist (WCAG 4.1.2).
                  // "Others" ist kein Schalter, sondern oeffnet den Markt-Drawer — dort
                  // deshalb haspopup/expanded statt pressed.
                  aria-pressed={interactive && c.id !== 'Others' ? on : undefined}
                  aria-haspopup={interactive && c.id === 'Others' ? 'dialog' : undefined}
                  aria-expanded={interactive && c.id === 'Others' ? drawerOpen : undefined}
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
                            <Badge shape="pill" tone="brand" appearance="soft" size="md"
                              key={id}
                              className="font-medium"
                            >
                              {marketLabel(id)}
                              <button
                                type="button"
                                aria-label={t('wizard.removeMarket', { market: marketLabel(id) })}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyExtraMarkets(extraMarkets.filter((x) => x !== id));
                                }}
                                className="-mr-0.5 text-fg-brand/70 transition-colors hover:text-fg-brand"
                              >
                                <X size={12} />
                              </button>
                            </Badge>
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
                          aria-label={t('wizard.aboutMarket', { market: cardTitle(c) })}
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
                  <p className={'font-semibold leading-tight text-fg ' + (sp ? 'mt-3 text-body' : 'mt-2.5 text-body-xs')}>
                    {cardTitle(c)}
                  </p>
                  <p className={'leading-snug text-fg-secondary ' + (sp ? 'mt-1 text-body-sm' : 'mt-1 text-body-3xs')}>
                    {t(`wizard.cards.${c.key}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
          )}

          {/* Compact: route hint sits in the body; spacious moves it into the footer. */}
          {!sp && (
            <p className="mx-auto mt-auto pt-4 text-center text-body-3xs text-fg-tertiary">
              {t('wizard.skipHint')}
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
          <p className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 px-4 text-center text-body-xs text-fg-tertiary lg:block">
            {t('wizard.skipHint')}
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
                (sp ? 'text-body-sm' : 'text-body-xs')
              }
            >
              <ArrowLeft size={sp ? 16 : 15} /> {t('wizard.back')}
            </button>
            <button
              type="button"
              onClick={goNext}
              className={
                'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-transform duration-200 hover:-translate-y-0.5 ' +
                (sp ? 'px-6 py-3 text-body-md' : 'px-5 py-2.5 text-body-xs') +
                ' bg-brand text-fg-on-brand'
              }
            >
              {isReview ? t('wizard.generate') : t('wizard.footer.next')} <ArrowRight size={sp ? 16 : 14} />
            </button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-body-xs font-medium text-fg-tertiary">
              <ArrowLeft size={15} /> {t('wizard.back')}
            </span>
            <span
              ref={setTarget(FOOTER)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-body-xs font-semibold text-fg-on-brand"
            >
              {t(`wizard.footer.${step.footerKey}`)} <ArrowRight size={14} />
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
