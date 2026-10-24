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
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { WizardDrawerLayer, COUNTRY_INFO } from './MarketsDrawer';
import type { SearchProfile, WizardCategory, BusinessType, WizardDetails } from '../wizard/WizardContext';
import { Badge } from '../ui/Badge';
import { track } from '../../lib/analytics';

// ─── AnimatedWizard — auto-playing hero key-visual ───────────────────────────
// A fake cursor moves across the wizard, clicks option cards (they select), then
// clicks the footer button to advance — stepping through Operations → Markets →
// Domains and looping. Light desktop wizard (Figma 2463:2242). Mode-aware tokens.
//
// Wizard v1a (Canvas-Wahl 1A · 2B · 3B · 4B · 5A · 6A · 7B · 8B, 23.10.2026;
// Figma "Wizard v1a"): der interaktive Wizard fragt in vier Abschnitten
//   Business  Situation (S01) → Operations wie bisher → Angebot (S04)
//   Markets   Maerkte wie bisher → Sitz (S03, eigene Maerkte zuerst)
//             → Lager (S08, nur bei physischen Produkten)
//   Areas     Bereiche wie bisher → EPR 1/2 (E01 + E02) → EPR 2/2 (E03),
//             beide nur, wenn EPR & Packaging gewaehlt ist
//   Review    wie bisher; "Not sure" steht sichtbar als offen da
// Aussehen unveraendert: dieselben Karten, Raster, Leiste und Fusszeile.

// Copy lives in the 'home' namespace: wizard.cards.<key>.{title,desc},
// wizard.steps.<key>.{title,subtitle}, wizard.rail.<key>, wizard.footer.<key>.
export type Card = { id: string; key: string; icon?: LucideIcon; title?: string };

export type StepKey =
  | 'situation' | 'operations' | 'offering'
  | 'markets' | 'establishment' | 'stock'
  | 'domains' | 'eprProducts' | 'packaging';

export type StepDef = {
  rail: number;
  key: StepKey;
  cards: Card[];
  picks: string[]; // ids clicked in order, then the footer
  footerKey: 'next';
  /** Genau eine Antwort (Situation, Operations). */
  single?: boolean;
  /** Antworten, die alle anderen des Schritts ausschliessen (Not sure, None …). */
  exclusive?: string[];
};

const RAIL = ['business', 'markets', 'domains', 'review'] as const;

// Die drei Kernschritte. Reihenfolge im Array bleibt Markets · Operations ·
// Domains — AnswersDrawer und buildProfile greifen ueber den Index zu. Die
// Reihenfolge im Wizard bestimmt FLOW weiter unten.
export const STEPS: StepDef[] = [
  {
    rail: 1,
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
    rail: 0,
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
    // Operations ist eine Einzelwahl: gespeichert wird genau ein
    // Geschaeftsmodell (Wizard-Audit B1).
    single: true,
  },
  {
    rail: 2,
    key: 'domains',
    // Nine domains: die finalen 8 (04.08.) plus Umwelt (18.09.), das bis
    // dahin nur als Verpackung existierte.
    cards: [
      { id: 'Tax & VAT', key: 'vatTax', icon: BarChart3 },
      { id: 'EPR & Packaging', key: 'eprPackaging', icon: Globe },
      { id: 'Data & Privacy', key: 'gdprPrivacy', icon: Shield },
      { id: 'Marketing Compliance', key: 'marketing', icon: MessageSquare },
      { id: 'Corporate & Structure', key: 'corporate', icon: Building2 },
      { id: 'Product Compliance', key: 'productCompliance', icon: ShieldCheck },
      { id: 'Logistics & Customs', key: 'logisticsCustoms', icon: Truck },
      { id: 'Legal Advisory', key: 'legalAdvisory', icon: Scale },
      { id: 'Environmental Compliance', key: 'environment', icon: Leaf },
    ],
    picks: ['Tax & VAT', 'EPR & Packaging', 'Data & Privacy'],
    // Frueher "Skip & route" — eine Weiche, die es im echten Wizard nicht gibt
    // (Wizard-Audit B6). Die Demo zeigt jetzt denselben Knopf wie der Wizard.
    footerKey: 'next',
  },
];
const [MARKETS, OPERATIONS, DOMAINS] = STEPS;

// Neue Fragen (Question Bank v1.0). Ids tragen ein Praefix, weil "Germany"
// schon die Markt-Karte ist und Sitz/Lager dieselben Laender anbieten.
const SITUATION: StepDef = {
  rail: 0,
  key: 'situation',
  // "Personal matter" (S01) bleibt aussen vor, bis der Umfang entschieden ist
  // (D11) — der Hinweis in der Fusszeile nennt den besseren ersten Schritt.
  cards: [
    { id: 'sit:existing', key: 'sitExisting' },
    { id: 'sit:starting', key: 'sitStarting' },
    { id: 'sit:not-sure', key: 'sitNotSure' },
  ],
  picks: [],
  footerKey: 'next',
  single: true,
};
const OFFERING: StepDef = {
  rail: 0,
  key: 'offering',
  cards: [
    { id: 'off:physical', key: 'offPhysical' },
    { id: 'off:digital', key: 'offDigital' },
    { id: 'off:services', key: 'offServices' },
    { id: 'off:deciding', key: 'offDeciding' },
    { id: 'off:not-sure', key: 'notSure' },
  ],
  picks: [],
  footerKey: 'next',
  exclusive: ['off:deciding', 'off:not-sure'],
};
const EPR_PRODUCTS: StepDef = {
  rail: 2,
  key: 'eprProducts',
  // E01 und E02 auf einer Karte (Wahl 7B): Batterien sind Teil der Frage.
  cards: [
    { id: 'epr:electronics', key: 'eprElectronics' },
    { id: 'epr:batteries-inside', key: 'eprBatteriesInside' },
    { id: 'epr:batteries-separate', key: 'eprBatteriesSeparate' },
    { id: 'epr:other', key: 'eprOther' },
    { id: 'epr:not-sure', key: 'notSure' },
  ],
  picks: [],
  footerKey: 'next',
  exclusive: ['epr:not-sure'],
};
const PACKAGING: StepDef = {
  rail: 2,
  key: 'packaging',
  cards: [
    { id: 'pkg:packaged', key: 'pkgPackaged' },
    { id: 'pkg:repack', key: 'pkgRepack' },
    { id: 'pkg:shipping', key: 'pkgShipping' },
    { id: 'pkg:empty', key: 'pkgEmpty' },
    { id: 'pkg:none', key: 'pkgNone' },
    { id: 'pkg:not-sure', key: 'notSure' },
  ],
  picks: [],
  footerKey: 'next',
  exclusive: ['pkg:none', 'pkg:not-sure'],
};

// Sitz (S03) und Lager (S08): die eigenen Maerkte zuerst (Wahl 3B), dann
// "Others" mit allen uebrigen Laendern, dann die Antworten ohne Land.
type CountryStep = 'establishment' | 'stock';
const COUNTRY_PREFIX: Record<CountryStep, string> = { establishment: 'est:', stock: 'stock:' };
const COUNTRY_TAIL: Record<CountryStep, Card[]> = {
  establishment: [
    { id: 'est:not-yet', key: 'estNotYet' },
    { id: 'est:not-sure', key: 'notSure' },
  ],
  stock: [
    { id: 'stock:none', key: 'stockNone' },
    { id: 'stock:not-sure', key: 'notSure' },
  ],
};
function countryStep(key: CountryStep, ownMarkets: string[]): StepDef {
  const pre = COUNTRY_PREFIX[key];
  return {
    rail: 1,
    key,
    cards: [
      ...ownMarkets.map((m) => ({ id: pre + m, key: key === 'establishment' ? 'estMarket' : 'stockMarket' })),
      { id: pre + 'Others', key: 'others' },
      ...COUNTRY_TAIL[key],
    ],
    picks: [],
    footerKey: 'next',
    exclusive: COUNTRY_TAIL[key].map((c) => c.id),
  };
}

const isOthers = (id: string) => id === 'Others' || id.endsWith(':Others');

/** Die eigenen Maerkte als Karten-Ids (Namen), Karten und Drawer zusammen. */
function ownMarketsOf(selected: Set<string>, extraMarkets: string[]): string[] {
  return [...MARKETS.cards.filter((c) => !isOthers(c.id) && selected.has(c.id)).map((c) => c.id), ...extraMarkets];
}

// Welche Schritte der interaktive Wizard zeigt — haengt von den Antworten ab.
// Faellt eine Bedingung weg, fallen auch ihre Antworten aus dem Profil
// (buildProfile), statt still mitzulaufen (Question Bank S17).
function flowFor(selected: Set<string>): StepKey[] {
  return [
    'situation', 'operations', 'offering',
    'markets', 'establishment',
    ...(selected.has('off:physical') ? (['stock'] as const) : []),
    'domains',
    ...(selected.has('EPR & Packaging') ? (['eprProducts', 'packaging'] as const) : []),
  ];
}
// Die Demo auf der Startseite zeigt nur die drei Kernschritte.
const DEMO_FLOW: StepKey[] = ['operations', 'markets', 'domains'];

const FOOTER = '__footer';

// A1 fix: completing the embedded wizard must hand a SearchProfile to the
// results page — otherwise the session save (the whole funnel anchor) never
// fires for the landing-page entry points.
export const MARKET_CODE: Record<string, string> = {
  Germany: 'DE', 'United Kingdom': 'UK', Netherlands: 'NL', France: 'FR',
  Italy: 'IT', Spain: 'ES', 'United States': 'US', 'Türkiye': 'TR',
};
// Die Drawer-Maerkte tragen Namen als ids (i18n-Schluessel); gespeichert und
// gesucht wird mit ISO-Code. Vorher landeten die Namen im Profil und die Engine
// verwarf sie still (Wizard-Audit B5).
const EXTRA_MARKET_CODE: Record<string, string> = {
  Switzerland: 'CH', Austria: 'AT', Belgium: 'BE', Sweden: 'SE', Denmark: 'DK', Poland: 'PL',
  Czechia: 'CZ', Romania: 'RO', Norway: 'NO', Ireland: 'IE', Finland: 'FI', Portugal: 'PT',
};
const codeOf = (name: string) => MARKET_CODE[name] ?? EXTRA_MARKET_CODE[name] ?? name;
const NAME_OF: Record<string, string> = Object.fromEntries(
  [...Object.entries(MARKET_CODE), ...Object.entries(EXTRA_MARKET_CODE)].map(([k, v]) => [v, k]),
);
const CATEGORY_CODE: Record<string, WizardCategory> = {
  'Tax & VAT': 'tax-vat', 'EPR & Packaging': 'product-packaging', 'Data & Privacy': 'data-privacy',
  'Marketing Compliance': 'marketing-seo', 'Corporate & Structure': 'corporate-structure',
  'Product Compliance': 'product-compliance', 'Logistics & Customs': 'logistics-customs',
  'Legal Advisory': 'legal-advisory', 'Environmental Compliance': 'environment',
};
const BUSINESS_CODE: Record<string, BusinessType> = {
  'D2C e-commerce': 'ecommerce', 'B2B / wholesale': 'other', Marketplace: 'marketplace',
  'SaaS / digital': 'saas', Hybrid: 'other', Other: 'other',
};

/** Laender, die in Sitz oder Lager ueber "Others" gewaehlt wurden (Namen). */
export type CountryExtras = { establishment: string[]; stock: string[] };

// C6 "Refine existing": a stored profile pre-selects the cards. Reverse of the
// maps above — businessTypeNote carries the original card id when available.
export function selectionFromProfile(p: SearchProfile): {
  selected: Set<string>;
  extraMarkets: string[];
  countryExtras: CountryExtras;
} {
  const sel = new Set<string>();
  const codeToCard = Object.fromEntries(Object.entries(MARKET_CODE).map(([k, v]) => [v, k]));
  const codeToExtra = Object.fromEntries(Object.entries(EXTRA_MARKET_CODE).map(([k, v]) => [v, k]));
  const extra: string[] = [];
  for (const m of p.markets ?? []) {
    if (codeToCard[m]) sel.add(codeToCard[m]);
    // Aeltere Profile tragen noch den Namen statt des Codes — beide fuehren
    // zurueck auf dieselbe Drawer-Auswahl.
    else { sel.add('Others'); extra.push(codeToExtra[m] ?? m); }
  }
  const catToCard = Object.fromEntries(Object.entries(CATEGORY_CODE).map(([k, v]) => [v, k]));
  for (const c of p.categories ?? []) if (catToCard[c]) sel.add(catToCard[c]);
  if (p.businessTypeNote && OPERATIONS.cards.some((c) => c.id === p.businessTypeNote)) sel.add(p.businessTypeNote);
  else {
    const btToCard = Object.fromEntries(Object.entries(BUSINESS_CODE).map(([k, v]) => [v, k]));
    if (p.businessType && btToCard[p.businessType]) sel.add(btToCard[p.businessType]);
  }

  const countryExtras: CountryExtras = { establishment: [], stock: [] };
  const d = p.details;
  if (d) {
    if (d.situation) sel.add('sit:' + d.situation);
    for (const v of d.offering ?? []) sel.add('off:' + v);
    for (const v of d.eprProducts ?? []) sel.add('epr:' + v);
    for (const v of d.packaging ?? []) sel.add('pkg:' + v);
    const own = new Set(ownMarketsOf(sel, extra));
    for (const key of ['establishment', 'stock'] as const) {
      const pre = COUNTRY_PREFIX[key];
      for (const v of d[key] ?? []) {
        if (COUNTRY_TAIL[key].some((c) => c.id === pre + v)) { sel.add(pre + v); continue; }
        const name = NAME_OF[v] ?? v;
        if (own.has(name)) sel.add(pre + name);
        else { sel.add(pre + 'Others'); countryExtras[key].push(name); }
      }
    }
  }
  return { selected: sel, extraMarkets: extra, countryExtras };
}

function detailsOf(selected: Set<string>, extraMarkets: string[], extras: CountryExtras): WizardDetails {
  const strip = (step: StepDef) => step.cards.filter((c) => selected.has(c.id)).map((c) => c.id.slice(c.id.indexOf(':') + 1));
  const flow = flowFor(selected);
  const own = ownMarketsOf(selected, extraMarkets);
  const countries = (key: CountryStep) => {
    if (!flow.includes(key)) return [];
    const pre = COUNTRY_PREFIX[key];
    return [
      ...own.filter((m) => selected.has(pre + m)).map(codeOf),
      ...(selected.has(pre + 'Others') ? extras[key].map(codeOf) : []),
      ...strip({ ...SITUATION, cards: COUNTRY_TAIL[key] }),
    ];
  };
  const situation = SITUATION.cards.find((c) => selected.has(c.id));
  return {
    situation: (situation?.id.slice(4) ?? '') as WizardDetails['situation'],
    offering: strip(OFFERING),
    establishment: countries('establishment'),
    stock: countries('stock'),
    eprProducts: flow.includes('eprProducts') ? strip(EPR_PRODUCTS) : [],
    packaging: flow.includes('packaging') ? strip(PACKAGING) : [],
  };
}

/** Ohne extras (AnswersDrawer) bleibt `details` aussen vor — der Aufrufer
    behaelt dann die gespeicherten Antworten der neuen Fragen. */
export function buildProfile(selected: Set<string>, extraMarkets: string[], extras?: CountryExtras): SearchProfile {
  const markets = [
    ...MARKETS.cards.filter((c) => c.id !== 'Others' && selected.has(c.id)).map((c) => MARKET_CODE[c.id] ?? c.id),
    ...extraMarkets.map((m) => EXTRA_MARKET_CODE[m] ?? m),
  ];
  const categories = DOMAINS.cards.filter((c) => selected.has(c.id)).map((c) => CATEGORY_CODE[c.id]).filter(Boolean);
  const ops = OPERATIONS.cards.find((c) => selected.has(c.id));
  return {
    country: markets[0] ?? '',
    markets,
    categories,
    businessType: ops ? BUSINESS_CODE[ops.id] ?? 'other' : '',
    businessTypeNote: ops?.id ?? '',
    // Nicht mehr abgeleitet: "mehr als ein Markt = EU" machte aus US + TR eine
    // EU-Reichweite, und kein Verbraucher las das Feld (Wizard-Audit B8).
    marketScope: '',
    riskSignals: [],
    revenueBand: '',
    intent: '',
    urgency: '',
    note: '',
    // Nicht gefragt heisst unbekannt, nicht "nein" (Wizard-Audit F8).
    existingProvider: null,
    ...(extras ? { details: detailsOf(selected, extraMarkets, extras) } : {}),
  };
}

// Review summary row (Step 4 · Figma 1660:162) — label + value + Edit.
// Ein Teil kann "muted" sein: so steht "Not sure" sichtbar als offen da (8B).
export type Seg = { text: string; muted?: boolean; /** haengt ohne Trenner an */ glue?: boolean };
function SummaryRow({ label, value, onEdit }: { label: string; value: Seg[]; onEdit: () => void }) {
  const { t } = useTranslation('home');
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle py-5 last:border-0">
      <div className="min-w-0 text-left">
        <p className="text-body-3xs font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{label}</p>
        <p className="mt-1.5 text-body-md font-medium text-fg">
          {value.length
            ? value.map((v, i) => (
                <Fragment key={i}>
                  {i > 0 && (v.glue ? ' ' : ' · ')}
                  <span className={v.muted ? 'text-fg-tertiary' : undefined}>{v.text}</span>
                </Fragment>
              ))
            : '—'}
        </p>
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
      page's CTA passes its own market, so the wizard pre-selects it and skips
      the Markets step going forward instead of asking the question the page
      just answered. Back still reaches the Markets step, so the pick stays
      editable. */
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
  // Der aktuelle Schritt als Schluessel, nicht als Index: welche Schritte es
  // gibt, haengt von den Antworten ab (Lager, EPR), ein Index wuerde springen.
  const [stepKey, setStepKey] = useState<StepKey | 'review'>(
    prefill ? 'review' : interactive ? 'situation' : reduced ? 'domains' : DEMO_FLOW[0],
  );
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      prefill?.selected ??
      new Set(marketPrefill ?? (reduced && !interactive ? ['Tax & VAT', 'EPR & Packaging', 'Data & Privacy'] : [])),
  );
  const [active, setActive] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 120, y: 60 });
  const [pulse, setPulse] = useState(0);
  // Welcher Schritt den Laender-Drawer geoeffnet hat: Maerkte, Sitz oder Lager.
  const [drawerFor, setDrawerFor] = useState<'markets' | CountryStep | null>(null);
  const [extraMarkets, setExtraMarkets] = useState<string[]>(() => prefill?.extraMarkets ?? []);
  const [countryExtras, setCountryExtras] = useState<CountryExtras>(
    () => prefill?.countryExtras ?? { establishment: [], stock: [] },
  );
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Die Marktseite hat die Markt-Frage schon beantwortet: vorwaerts wird sie
  // uebersprungen, zurueck bleibt sie erreichbar.
  const skipMarkets = useRef(!!marketPrefill);

  const flow = interactive ? flowFor(selected) : DEMO_FLOW;
  const isReview = stepKey === 'review';
  const ownMarkets = ownMarketsOf(selected, extraMarkets);
  const stepOf = (k: StepKey): StepDef =>
    k === 'markets' ? MARKETS
    : k === 'operations' ? OPERATIONS
    : k === 'domains' ? DOMAINS
    : k === 'situation' ? SITUATION
    : k === 'offering' ? OFFERING
    : k === 'eprProducts' ? EPR_PRODUCTS
    : k === 'packaging' ? PACKAGING
    : countryStep(k, ownMarkets);
  const step = stepOf(isReview ? flow[flow.length - 1] : stepKey);

  // Commit the drawer's picks; the "Others" card of that step reflects them.
  const applyExtra = (target: 'markets' | CountryStep, v: string[]) => {
    const others = target === 'markets' ? 'Others' : COUNTRY_PREFIX[target] + 'Others';
    if (target === 'markets') setExtraMarkets(v);
    else setCountryExtras((prev) => ({ ...prev, [target]: v }));
    setSelected((prev) => {
      const n = new Set(prev);
      if (v.length) {
        n.add(others);
        // Ein Land schliesst "Not yet" / "None" / "Not sure" aus.
        if (target !== 'markets') for (const x of stepOf(target).exclusive ?? []) n.delete(x);
      } else n.delete(others);
      return n;
    });
  };
  const extrasFor = (k: StepKey) =>
    k === 'markets' ? extraMarkets : k === 'establishment' || k === 'stock' ? countryExtras[k] : [];

  // Interactive handlers (no-ops in auto-play mode). Einzelwahl ersetzt die
  // bisherige Antwort; eine exklusive Antwort (Not sure, None …) ersetzt alle
  // anderen des Schritts, jede andere Antwort hebt die exklusive auf.
  const toggle = (def: StepDef, id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        return n;
      }
      const ids = def.cards.map((c) => c.id);
      if (def.single || def.exclusive?.includes(id)) {
        for (const o of ids) n.delete(o);
        if (def.key === 'establishment' || def.key === 'stock') setCountryExtras((p) => ({ ...p, [def.key]: [] }));
      } else for (const x of def.exclusive ?? []) n.delete(x);
      n.add(id);
      return n;
    });
  // Ohne Markt keine Auswertung: frueher wurde daraus still eine deutsche
  // (Wizard-Audit B12). Weiter vom Markt-Schritt und Erstellen brauchen einen.
  const hasMarket = ownMarkets.length > 0;
  const needsMarket = interactive && !hasMarket && (stepKey === 'markets' || isReview);
  const completedRef = useRef(false);
  const go = (k: StepKey | 'review') => {
    setStepKey(k);
    setActive(null);
  };
  const goNext = () => {
    if (needsMarket) return;
    if (!isReview) {
      let i = flow.indexOf(stepKey) + 1;
      if (flow[i] === 'markets' && skipMarkets.current) i += 1;
      go(flow[i] ?? 'review');
    } else {
      const profile = buildProfile(selected, extraMarkets, countryExtras);
      completedRef.current = true;
      track('Wizard Completed', { markets: profile.markets.length, areas: profile.categories.length });
      onComplete?.(profile);
    }
  };
  const goBack = () => {
    const i = isReview ? flow.length : flow.indexOf(stepKey);
    if (i > 0) go(flow[i - 1]);
  };
  const atStart = !isReview && flow.indexOf(stepKey) === 0;

  // Messgrundlage (Wizard-Audit B14): Start, jeder Schritt, Abschluss, Abbruch.
  // Nur Schritt und Anzahlen — keine Antworten, keine Maerkte, keine Bereiche.
  // Die Demo auf der Startseite zaehlt nicht mit.
  const stepRef = useRef(stepKey);
  stepRef.current = stepKey;
  useEffect(() => {
    if (!interactive) return;
    track('Wizard Started', { step: stepRef.current });
    return () => {
      if (!completedRef.current) track('Wizard Abandoned', { step: stepRef.current });
    };
  }, [interactive]);
  useEffect(() => {
    if (interactive) track('Wizard Step', { step: stepKey });
  }, [interactive, stepKey]);

  // Measure the active target relative to the wizard root → cursor position.
  // Uses layout offsets (not getBoundingClientRect) so it stays correct even when
  // the whole wizard is wrapped in a CSS transform scale.
  useEffect(() => {
    if (!active) return;
    const el = targets.current.get(active);
    if (!el) return; // offsetParent is the `relative` root for every target
    setCursor({ x: el.offsetLeft + el.offsetWidth * 0.5, y: el.offsetTop + el.offsetHeight * 0.5 });
  }, [active, stepKey]);

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
        for (const k of DEMO_FLOW) {
          if (cancelled) return;
          setStepKey(k);
          setSelected(new Set());
          setActive(null);
          await sleep(680);
          for (const pick of stepOf(k).picks) {
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
    // stepOf liest fuer die Demo nur statische Schritte.
  }, [reduced, interactive]);

  const sp = spacious;
  // Hero (compact) shows 6 cards; the spacious Figma layout shows the full set.
  const cards = sp ? step.cards : step.cards.slice(0, 6);

  // Drawer market ids are single words, so the i18n key is just the lowercase id.
  const marketLabel = (id: string) => t(`marketsDrawer.markets.${id.toLowerCase()}.name`, { defaultValue: id });
  /** Landesname fuer Karten-Id (Germany) oder Drawer-Id (Switzerland). */
  const countryLabel = (name: string) => {
    const card = MARKETS.cards.find((c) => c.id === name);
    return card ? t(`wizard.cards.${card.key}.title`) : marketLabel(name);
  };
  const cardTitle = (c: Card) => {
    const pre = c.id.startsWith('est:') ? 'est:' : c.id.startsWith('stock:') ? 'stock:' : '';
    if (pre && (c.key === 'estMarket' || c.key === 'stockMarket')) return countryLabel(c.id.slice(pre.length));
    return t(`wizard.cards.${c.key}.title`);
  };

  // Review summary derived from the user's selections. "Not sure" steht als
  // eigene, gedaempfte Angabe da — sichtbar offen, nie als stilles Nein (8B).
  const segsOf = (k: StepKey): Seg[] => {
    if (!flow.includes(k)) return [];
    const def = stepOf(k);
    return [
      ...def.cards
        .filter((c) => selected.has(c.id) && !isOthers(c.id))
        .map((c) => (c.key === 'notSure' || c.key === 'sitNotSure'
          ? { text: t('wizard.review.notSure'), muted: true }
          : { text: cardTitle(c) })),
      ...(def.cards.some((c) => isOthers(c.id) && selected.has(c.id)) ? extrasFor(k).map((m) => ({ text: countryLabel(m) })) : []),
    ];
  };
  // Sitz und Lager: Laender mit Vorsatz ("established in Germany"), eine
  // Antwort ohne Land fuer sich ("No stock held"), offen als "stock: Not sure".
  const countrySegs = (k: CountryStep, inKey: string, openKey: string): Seg[] => {
    if (!flow.includes(k)) return [];
    const def = stepOf(k);
    const countries = [
      ...def.cards.filter((c) => selected.has(c.id) && !isOthers(c.id) && c.key !== 'notSure' && !COUNTRY_TAIL[k].includes(c)).map(cardTitle),
      ...(selected.has(COUNTRY_PREFIX[k] + 'Others') ? extrasFor(k).map(countryLabel) : []),
    ];
    const tails = COUNTRY_TAIL[k].filter((c) => c.key !== 'notSure' && selected.has(c.id)).map(cardTitle);
    const open = selected.has(COUNTRY_PREFIX[k] + 'not-sure');
    return [
      ...countries.map((text, i) => ({ text: i === 0 ? `${t(inKey)} ${text}` : text })),
      ...tails.map((text) => ({ text })),
      ...(open ? [{ text: t(openKey) }, { text: t('wizard.review.notSure'), muted: true, glue: true }] : []),
    ];
  };
  const reviewRows: { label: string; value: Seg[]; edit: StepKey }[] = interactive
    ? [
        {
          label: t('wizard.review.business'),
          value: [...segsOf('situation'), ...countrySegs('establishment', 'wizard.review.establishedIn', 'wizard.review.establishmentOpen')],
          edit: 'situation',
        },
        { label: t('wizard.review.offering'), value: [...segsOf('offering'), ...segsOf('operations')], edit: 'offering' },
        {
          label: flow.includes('stock') ? t('wizard.review.marketsStock') : t('wizard.review.markets'),
          value: [...segsOf('markets'), ...countrySegs('stock', 'wizard.review.stockIn', 'wizard.review.stockOpen')],
          edit: 'markets',
        },
        { label: t('wizard.review.domains'), value: segsOf('domains'), edit: 'domains' },
        ...(flow.includes('eprProducts')
          ? [{
              label: t('wizard.review.epr'),
              value: [...segsOf('eprProducts'), ...segsOf('packaging')],
              edit: 'eprProducts' as StepKey,
            }]
          : []),
      ]
    : [
        { label: t('wizard.review.markets'), value: segsOf('markets'), edit: 'markets' },
        { label: t('wizard.review.operations'), value: segsOf('operations'), edit: 'operations' },
        { label: t('wizard.review.domains'), value: segsOf('domains'), edit: 'domains' },
      ];

  // Laender-Drawer fuer Sitz und Lager: Hauptlaender, die keine eigene Karte
  // sind, oben; eigene Maerkte fallen aus der Liste.
  const drawerPrimary =
    drawerFor && drawerFor !== 'markets'
      ? MARKETS.cards
          .filter((c) => !isOthers(c.id) && !ownMarkets.includes(c.id))
          .map((c) => ({ id: c.id, name: t(`wizard.cards.${c.key}.title`), desc: t(`wizard.cards.${c.key}.desc`) }))
      : undefined;

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
            href={sp ? `/${i18n.resolvedLanguage || 'en'}` : null}
            className={sp ? 'h-[36px]' : 'h-7'}
          />
          {sp && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
              <StepRail current={isReview ? RAIL.length - 1 : step.rail} spacious />
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
        {/* Compact (hero) keeps the rail in the body; spacious puts it in the header.
            Ohne Header (Workspace-Drawer) faellt der Header-Platz weg — dann steht
            die Leiste im Body, sonst gaebe es keine Fortschrittsanzeige (B15). */}
        {(!sp || !showHeader) && (
          <div className={sp ? 'mb-10' : undefined}>
            <StepRail current={isReview ? RAIL.length - 1 : step.rail} spacious={sp} />
          </div>
        )}

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
              {isReview
                ? t('wizard.review.subtitle')
                : t(`wizard.steps.${step.key}.subtitle`, {
                    // Sitz (3B) nennt die eigenen Maerkte im Untertitel.
                    markets: ownMarkets.map(countryLabel).join(', '),
                  })}
            </p>
          </div>

          {/* Review summary card (Step 4 · Figma 1660:162) */}
          {isReview && (
            <>
              <div className="mx-auto mt-9 max-w-[640px] rounded-xl border-2 border-accent-400 bg-surface px-6">
                {reviewRows.map((r) => (
                  <SummaryRow key={r.edit} label={r.label} value={r.value} onEdit={() => go(r.edit)} />
                ))}
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
              const others = isOthers(c.id);
              const openDrawer = () => setDrawerFor(step.key === 'markets' ? 'markets' : (step.key as CountryStep));
              const cardExtras = others ? extrasFor(step.key) : [];
              return (
                <div
                  key={c.id}
                  ref={setTarget(c.id)}
                  onClick={interactive ? () => (others ? openDrawer() : toggle(step, c.id)) : undefined}
                  role={interactive ? 'button' : undefined}
                  // Tastatur und Fokusring waren korrekt, der ZUSTAND war unhoerbar: man
                  // konnte auswaehlen, aber nicht erfahren, was ausgewaehlt ist (WCAG 4.1.2).
                  // "Others" ist kein Schalter, sondern oeffnet den Markt-Drawer — dort
                  // deshalb haspopup/expanded statt pressed.
                  aria-pressed={interactive && !others ? on : undefined}
                  aria-haspopup={interactive && others ? 'dialog' : undefined}
                  aria-expanded={interactive && others ? drawerFor !== null : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (others) openDrawer();
                            else toggle(step, c.id);
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
                      {others && cardExtras.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {cardExtras.map((id) => (
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
                                  applyExtra(step.key === 'markets' ? 'markets' : (step.key as CountryStep), cardExtras.filter((x) => x !== id));
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
                      ) : others ? null : interactive && COUNTRY_INFO[c.id] ? (
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
        {sp && !isReview && !needsMarket && (
          <p className="pointer-events-none absolute left-1/2 hidden w-max max-w-[900px] -translate-x-1/2 px-4 text-center text-body-xs text-fg-tertiary lg:block">
            {/* S01: "Personal matter" ist keine Karte, solange der Umfang offen
                ist (D11) — der Hinweis nennt den besseren ersten Schritt. */}
            {stepKey === 'situation' ? t('wizard.situationHint') : t('wizard.skipHint')}
          </p>
        )}
        {needsMarket && (
          <p
            id="wizard-needs-market"
            className={
              'text-center text-fg-secondary ' +
              (sp ? 'pointer-events-none absolute left-1/2 -translate-x-1/2 px-4 text-body-xs' : 'order-1 mx-3 flex-1 text-body-3xs')
            }
          >
            {t('wizard.needsMarket')}
          </p>
        )}
        {interactive ? (
          <>
            <button
              type="button"
              onClick={goBack}
              disabled={atStart}
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
              disabled={needsMarket}
              aria-describedby={needsMarket ? 'wizard-needs-market' : undefined}
              className={
                'order-2 inline-flex items-center gap-1.5 rounded-lg font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40 ' +
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
          marketsOpen={drawerFor !== null}
          onMarketsClose={() => setDrawerFor(null)}
          value={drawerFor && drawerFor !== 'markets' ? countryExtras[drawerFor] : extraMarkets}
          onChange={(v) => drawerFor && applyExtra(drawerFor, v)}
          primary={drawerPrimary}
          exclude={drawerFor && drawerFor !== 'markets' ? ownMarkets : undefined}
          variant={drawerFor && drawerFor !== 'markets' ? 'countries' : 'markets'}
          infoCountry={infoCountry}
          onInfoClose={() => setInfoCountry(null)}
          onSelectCountry={(id) => setSelected((prev) => new Set(prev).add(id))}
          saveOpen={saveOpen}
          onSaveClose={() => setSaveOpen(false)}
          draft={saveOpen ? buildProfile(selected, extraMarkets, countryExtras) : undefined}
        />
      )}
    </div>
  );
}
