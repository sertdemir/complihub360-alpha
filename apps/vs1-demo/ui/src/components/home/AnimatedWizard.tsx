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
import { Button } from '../ui/Button';
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
export type Card = { id: string; key: string; icon?: LucideIcon; title?: string; /** i18n-Schluessel statt wizard.cards.<key>.desc */ descKey?: string };

export type StepKey =
  | 'situation' | 'reason' | 'operations' | 'offering' | 'customers' | 'channels'
  | 'markets' | 'establishment' | 'planned' | 'check' | 'expand' | 'stock' | 'plannedStock'
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

// Kernfragen nach dem Core Wizard Handover v1.1 (18.11.2026, CW01–CW08):
// was heute gilt und was geplant ist, bleibt getrennt — Maerkte, Lager und
// der Pruefumfang je als eigene Antwort. Ids tragen ein Praefix, weil
// "Germany" schon die Markt-Karte ist und mehrere Fragen dieselben Laender
// anbieten.
const SITUATION: StepDef = {
  rail: 0,
  key: 'situation',
  // CW01: "I work for myself" ist eine eigene Antwort — wer selbststaendig
  // arbeitet, muss dafuer kein eingetragenes Unternehmen haben.
  cards: [
    { id: 'sit:starting', key: 'sitStarting' },
    { id: 'sit:existing', key: 'sitExisting' },
    { id: 'sit:self-employed', key: 'sitSelf' },
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
// CW02 Ziele. "Something else or I'm not sure" darf neben bekannten Zielen
// stehen — deshalb keine exklusive Antwort.
const REASON: StepDef = {
  rail: 0,
  key: 'reason',
  cards: [
    { id: 'rsn:starting', key: 'rsnStarting' },
    { id: 'rsn:expansion', key: 'rsnExpansion' },
    { id: 'rsn:check', key: 'rsnCheck' },
    { id: 'rsn:ongoing', key: 'rsnOngoing' },
    { id: 'rsn:provider', key: 'rsnProvider' },
    { id: 'rsn:other', key: 'rsnOther' },
  ],
  picks: [],
  footerKey: 'next',
};
const CUSTOMERS: StepDef = {
  rail: 0,
  key: 'customers',
  cards: [
    { id: 'cu:consumers', key: 'cuConsumers' },
    { id: 'cu:businesses', key: 'cuBusinesses' },
    { id: 'cu:both', key: 'cuBoth' },
    { id: 'cu:deciding', key: 'offDeciding' },
    { id: 'cu:not-sure', key: 'notSure' },
  ],
  picks: [],
  footerKey: 'next',
  single: true,
};
const CHANNELS: StepDef = {
  rail: 0,
  key: 'channels',
  cards: [
    { id: 'ch:own-site', key: 'chOwnSite' },
    { id: 'ch:marketplaces', key: 'chMarketplaces' },
    { id: 'ch:operating', key: 'chOperating' },
    { id: 'ch:direct', key: 'chDirect' },
    { id: 'ch:stores', key: 'chStores' },
    { id: 'ch:deciding', key: 'offDeciding' },
    { id: 'ch:not-sure', key: 'notSure' },
  ],
  picks: ['ch:own-site', 'ch:marketplaces'],
  footerKey: 'next',
  exclusive: ['ch:deciding', 'ch:not-sure'],
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

// CW04 Aktuelle Maerkte: die Laenderkarten wie bisher, dazu zwei Antworten
// ohne Land. Sie gehoeren nicht zu MARKETS — sonst zaehlte "noch nicht" als
// Markt (ownMarketsOf) und die Demo zeigte sie.
export const MARKET_STATUS = ['mk:not-yet', 'mk:not-sure'];
const MARKETS_ASK: StepDef = {
  ...MARKETS,
  cards: [...MARKETS.cards, { id: 'mk:not-yet', key: 'mkNotYet' }, { id: 'mk:not-sure', key: 'notSure' }],
  exclusive: MARKET_STATUS,
};

// Fragen nach Laendern. Jede fuehrt die passenden Laender als Karten, dann
// "Others" mit allen uebrigen, dann die Antworten ohne Land (exklusiv).
//   establishment  CW03 Sitz            planned       Folgefrage "noch nicht gegruendet"
//   check          CW08 Pruefumfang     expand        CW05 geplante Maerkte
//   stock          CW06 Lager heute     plannedStock  CW07 geplantes Lager
export type CountryStep = 'establishment' | 'planned' | 'check' | 'expand' | 'stock' | 'plannedStock';
export const COUNTRY_PREFIX: Record<CountryStep, string> = {
  establishment: 'est:', planned: 'plan:', check: 'chk:', expand: 'exp:', stock: 'stock:', plannedStock: 'pstock:',
};
export const COUNTRY_STEPS = Object.keys(COUNTRY_PREFIX) as CountryStep[];
export const isCountryStep = (k: string): k is CountryStep => k in COUNTRY_PREFIX;
const COUNTRY_TAIL: Record<CountryStep, Card[]> = {
  establishment: [
    { id: 'est:not-yet', key: 'estNotYet' },
    { id: 'est:not-sure', key: 'notSure' },
  ],
  planned: [{ id: 'plan:deciding', key: 'offDeciding' }],
  // "All current" ist eine lebende Verweisung auf CW04, kein Schnappschuss.
  check: [
    { id: 'chk:all-current', key: 'chkAll' },
    { id: 'chk:not-sure', key: 'notSure' },
  ],
  expand: [
    { id: 'exp:undecided', key: 'expUndecided' },
    { id: 'exp:not-planned', key: 'expNotPlanned' },
  ],
  // Kein Lager, trifft nicht zu und unbekannt sind drei verschiedene Zustaende.
  stock: [
    { id: 'stock:none', key: 'stockNone' },
    { id: 'stock:not-applicable', key: 'stockNA' },
    { id: 'stock:not-sure', key: 'notSure' },
  ],
  // "Kein Lager in einem anderen Land" heisst weder "kein Lager" noch
  // "keine Expansion".
  plannedStock: [
    { id: 'pstock:no-other', key: 'pstockNoOther' },
    { id: 'pstock:undecided', key: 'expUndecided' },
    { id: 'pstock:not-sure', key: 'notSure' },
  ],
};
const COUNTRY_CARD_KEY: Record<CountryStep, string> = {
  establishment: 'estMarket', planned: 'estMarket', check: 'chkMarket', expand: '', stock: 'stockMarket', plannedStock: 'pstockMarket',
};
/** Eine Karte, die fuer ein Land steht (Titel = Landesname). */
export const isCountryCard = (c: Card) => c.key.endsWith('Market');
const uniq = (xs: string[]) => [...new Set(xs)];
function countryStep(key: CountryStep, ownMarkets: string[], plannedMarkets: string[]): StepDef {
  const pre = COUNTRY_PREFIX[key];
  // Geplante Maerkte: alle Hauptlaender, auch die mit heutiger Aktivitaet
  // (CW05). Geplantes Lager: heutige und geplante Maerkte. Sonst die heutigen.
  const countries: Card[] = key === 'expand'
    ? MARKETS.cards.filter((c) => !isOthers(c.id)).map((c) => ({ id: pre + c.id, key: c.key }))
    : (key === 'plannedStock' ? uniq([...ownMarkets, ...plannedMarkets]) : ownMarkets).map((m) => ({ id: pre + m, key: COUNTRY_CARD_KEY[key] }));
  return {
    rail: 1,
    key,
    cards: [...countries, { id: pre + 'Others', key: 'others' }, ...COUNTRY_TAIL[key]],
    picks: [],
    footerKey: 'next',
    exclusive: COUNTRY_TAIL[key].map((c) => c.id),
  };
}

export const isOthers = (id: string) => id === 'Others' || id.endsWith(':Others');

/** Die heutigen Maerkte als Karten-Ids (Namen), Karten und Drawer zusammen. */
export function ownMarketsOf(selected: Set<string>, extraMarkets: string[]): string[] {
  return [...MARKETS.cards.filter((c) => !isOthers(c.id) && selected.has(c.id)).map((c) => c.id), ...extraMarkets];
}
/** Die geplanten Maerkte (CW05) als Namen — nur solange das Ziel "Expansion" gewaehlt ist. */
export function plannedMarketsOf(selected: Set<string>, extraPlanned: string[]): string[] {
  if (!selected.has('rsn:expansion')) return [];
  return [
    ...MARKETS.cards.filter((c) => !isOthers(c.id) && selected.has('exp:' + c.id)).map((c) => c.id),
    ...(selected.has('exp:Others') ? extraPlanned : []),
  ];
}

// "I am not sure what I need" (Handover v1.1): eine eigene Bitte um Hilfe,
// keine Alternative zu den Bereichen — gewaehlte Bereiche bleiben stehen.
// Die Karte gehoert nicht zu DOMAINS: die Antworten-Schublade bietet sie
// nicht an.
export const HELP_IDENTIFY = 'help:identify';
const DOMAINS_ASK: StepDef = {
  ...DOMAINS,
  cards: [...DOMAINS.cards, { id: HELP_IDENTIFY, key: 'helpIdentify' }],
};

/** Bereiche, die zu den bisherigen Antworten passen koennen — feste Regeln,
 *  keine AI, und nie eine Aussage, dass eine Pflicht gilt. Jede Regel nennt
 *  die Antwort, aus der sie folgt. Kein Vorschlag heisst nicht "trifft nicht
 *  zu". `markets` sind heutige und geplante Maerkte zusammen. */
export function suggestedAreas(selected: Set<string>, markets: string[]): Array<{ id: string; reason: string }> {
  const has = (id: string) => selected.has(id);
  const out: Array<{ id: string; reason: string }> = [];
  if (markets.length > 0) out.push({ id: 'Tax & VAT', reason: 'market' });
  if (has('off:physical')) {
    out.push({ id: 'EPR & Packaging', reason: 'physical' });
    out.push({ id: 'Product Compliance', reason: 'physical' });
    if (markets.length > 1) out.push({ id: 'Logistics & Customs', reason: 'multiMarket' });
  }
  if (has('ch:own-site') || has('off:digital')) out.push({ id: 'Data & Privacy', reason: 'online' });
  if (has('ch:own-site') && (has('cu:consumers') || has('cu:both'))) out.push({ id: 'Marketing Compliance', reason: 'consumersOnline' });
  if (has('sit:starting') || has('est:not-yet') || has('rsn:starting')) out.push({ id: 'Corporate & Structure', reason: 'starting' });
  return out;
}

// Welche Schritte der interaktive Wizard zeigt — haengt von den Antworten ab.
// Faellt eine Bedingung weg, fallen auch ihre Antworten aus dem Profil
// (buildProfile), statt still mitzulaufen. Gruppierung nach dem Handover:
// Ausgangslage · Angebot · Heutiger Stand · Expansion · Lager · Bereiche.
export function pagesFor(selected: Set<string>): StepKey[][] {
  return [
    ['situation', 'reason'],
    ['offering', 'customers', 'channels'],
    [
      'markets', 'establishment',
      ...(selected.has('est:not-yet') ? (['planned'] as const) : []),
      ...(selected.has('rsn:check') ? (['check'] as const) : []),
    ],
    ...(selected.has('rsn:expansion') ? [['expand'] as StepKey[]] : []),
    // Lager heute und geplant stehen zusammen, auch ohne Expansionsziel.
    ...(selected.has('off:physical') ? [['stock', 'plannedStock'] as StepKey[]] : []),
    ['domains'],
    ...(selected.has('EPR & Packaging') ? [['eprProducts'] as StepKey[], ['packaging'] as StepKey[]] : []),
  ];
}
export function flowFor(selected: Set<string>): StepKey[] {
  return pagesFor(selected).flat();
}
// Die Demo auf der Startseite zeigt nur drei Kernschritte.
const DEMO_FLOW: StepKey[] = ['channels', 'markets', 'domains'];

/** Die Karten eines Schritts. Die Laenderfragen haengen an den heutigen und
 *  geplanten Maerkten. Wizard und Antworten-Schublade teilen sich diese
 *  Definition. */
export function stepDefFor(k: StepKey, ownMarkets: string[], plannedMarkets: string[] = []): StepDef {
  switch (k) {
    case 'markets': return MARKETS;
    case 'operations': return OPERATIONS;
    case 'domains': return DOMAINS;
    case 'situation': return SITUATION;
    case 'reason': return REASON;
    case 'offering': return OFFERING;
    case 'customers': return CUSTOMERS;
    case 'channels': return CHANNELS;
    case 'eprProducts': return EPR_PRODUCTS;
    case 'packaging': return PACKAGING;
    default: return countryStep(k, ownMarkets, plannedMarkets);
  }
}

/** Eine Karte an- oder abwaehlen. Einzelwahl ersetzt die bisherige Antwort;
 *  eine exklusive Antwort (Not sure, None …) ersetzt alle anderen des
 *  Schritts, jede andere Antwort hebt die exklusive auf. Wizard und
 *  Antworten-Schublade teilen sich diese Regel. */
export function toggleAnswer(def: StepDef, prev: Set<string>, id: string): Set<string> {
  const n = new Set(prev);
  if (n.has(id)) {
    n.delete(id);
    return n;
  }
  if (def.single || def.exclusive?.includes(id)) for (const c of def.cards) n.delete(c.id);
  else for (const x of def.exclusive ?? []) n.delete(x);
  n.add(id);
  return n;
}

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

/** Laender, die in einer Laenderfrage ueber "Others" gewaehlt wurden (Namen). */
export type CountryExtras = Record<CountryStep, string[]>;
export const emptyExtras = (): CountryExtras => ({ establishment: [], planned: [], check: [], expand: [], stock: [], plannedStock: [] });

// Wo eine Laenderfrage in `details` steht.
const DETAIL_FIELD = {
  establishment: 'establishment', planned: 'plannedEstablishment', expand: 'plannedMarkets', stock: 'stock', plannedStock: 'plannedStock',
} as const;
// Ziele aus Sitzungen vor dem Handover v1.1 (Deck S02).
const OLD_GOAL: Record<string, string> = { launch: 'starting', problem: 'other', 'not-sure': 'other' };

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

  const countryExtras = emptyExtras();
  const d = p.details;
  if (d) {
    if (d.situation) sel.add('sit:' + d.situation);
    for (const v of d.goals ?? d.reason ?? []) sel.add('rsn:' + (OLD_GOAL[v] ?? v));
    for (const v of d.offering ?? []) sel.add('off:' + v);
    if (d.customers) sel.add('cu:' + d.customers);
    for (const v of d.channels ?? []) sel.add('ch:' + v);
    for (const v of d.eprProducts ?? []) sel.add('epr:' + v);
    for (const v of d.packaging ?? []) sel.add('pkg:' + v);
    if (d.marketsStatus && !(p.markets ?? []).length) sel.add('mk:' + d.marketsStatus);
    if (d.helpIdentify) sel.add(HELP_IDENTIFY);
    const own = ownMarketsOf(sel, extra);
    const restore = (key: CountryStep, values: string[], planned: string[]) => {
      const pre = COUNTRY_PREFIX[key];
      const def = countryStep(key, own, planned);
      for (const v of values) {
        if (COUNTRY_TAIL[key].some((c) => c.id === pre + v)) { sel.add(pre + v); continue; }
        const name = NAME_OF[v] ?? v;
        if (def.cards.some((c) => c.id === pre + name)) sel.add(pre + name);
        else { sel.add(pre + 'Others'); countryExtras[key].push(name); }
      }
    };
    // Geplante Maerkte zuerst: das geplante Lager bietet sie als Karten an.
    restore('expand', d.plannedMarkets ?? [], []);
    const planned = plannedMarketsOf(sel, countryExtras.expand);
    for (const key of ['establishment', 'planned', 'stock', 'plannedStock'] as const) restore(key, d[DETAIL_FIELD[key]] ?? [], planned);
    if (d.checkScope?.mode === 'all-current') sel.add('chk:all-current');
    else if (d.checkScope?.mode === 'unknown') sel.add('chk:not-sure');
    else restore('check', d.checkScope?.countries ?? [], planned);
  }
  return { selected: sel, extraMarkets: extra, countryExtras };
}

function detailsOf(selected: Set<string>, extraMarkets: string[], extras: CountryExtras): WizardDetails {
  const strip = (step: StepDef) => step.cards.filter((c) => selected.has(c.id)).map((c) => c.id.slice(c.id.indexOf(':') + 1));
  const flow = flowFor(selected);
  const own = ownMarketsOf(selected, extraMarkets);
  const planned = plannedMarketsOf(selected, extras.expand);
  // Laendercodes einer Laenderfrage, dann ihre Antwort ohne Land. Nicht
  // gefragt heisst leer — nie "nein".
  const countries = (key: CountryStep, withTail = true) => {
    if (!flow.includes(key)) return [];
    const pre = COUNTRY_PREFIX[key];
    const tails = new Set(COUNTRY_TAIL[key].map((c) => c.id));
    return [
      ...countryStep(key, own, planned).cards
        .filter((c) => !isOthers(c.id) && !tails.has(c.id) && selected.has(c.id))
        .map((c) => codeOf(c.id.slice(pre.length))),
      ...(selected.has(pre + 'Others') ? extras[key].map(codeOf) : []),
      ...(withTail ? COUNTRY_TAIL[key].filter((c) => selected.has(c.id)).map((c) => c.id.slice(pre.length)) : []),
    ];
  };
  const situation = SITUATION.cards.find((c) => selected.has(c.id));
  const status = MARKET_STATUS.find((id) => selected.has(id));
  return {
    situation: (situation?.id.slice(4) ?? '') as WizardDetails['situation'],
    goals: strip(REASON),
    offering: strip(OFFERING),
    customers: strip(CUSTOMERS)[0] ?? '',
    channels: strip(CHANNELS),
    marketsStatus: own.length ? '' : ((status?.slice(3) ?? '') as WizardDetails['marketsStatus']),
    establishment: countries('establishment'),
    plannedEstablishment: countries('planned'),
    plannedMarkets: countries('expand'),
    stock: countries('stock'),
    plannedStock: countries('plannedStock'),
    // "All current" bleibt eine Verweisung: wer die heutigen Maerkte aendert,
    // aendert den Pruefumfang mit.
    ...(flow.includes('check')
      ? {
          checkScope: selected.has('chk:all-current') ? { mode: 'all-current' as const, countries: [] }
            : selected.has('chk:not-sure') ? { mode: 'unknown' as const, countries: [] }
            : { mode: (countries('check', false).length ? 'countries' : '') as 'countries' | '', countries: countries('check', false) },
        }
      : {}),
    helpIdentify: selected.has(HELP_IDENTIFY),
    eprProducts: flow.includes('eprProducts') ? strip(EPR_PRODUCTS) : [],
    packaging: flow.includes('packaging') ? strip(PACKAGING) : [],
  };
}

const isCode = (v: string) => /^[A-Z]{2}$/.test(v);

/** Ohne extras (AnswersDrawer) bleibt `details` aussen vor — der Aufrufer
    behaelt dann die gespeicherten Antworten der neuen Fragen. */
export function buildProfile(selected: Set<string>, extraMarkets: string[], extras?: CountryExtras): SearchProfile {
  const markets = [
    ...MARKETS.cards.filter((c) => c.id !== 'Others' && selected.has(c.id)).map((c) => MARKET_CODE[c.id] ?? c.id),
    ...extraMarkets.map((m) => EXTRA_MARKET_CODE[m] ?? m),
  ];
  const details = extras ? detailsOf(selected, extraMarkets, extras) : undefined;
  const categories = DOMAINS.cards.filter((c) => selected.has(c.id)).map((c) => CATEGORY_CODE[c.id]).filter(Boolean);
  const ops = OPERATIONS.cards.find((c) => selected.has(c.id));
  // Geschaeftsart fuer die Engine. Mit einer Antwort auf den Vertriebsweg
  // (S06) leitet sie sich daraus ab; aeltere Sitzungen behalten ihre
  // Operations-Karte. Im Zweifel "other": lieber ungefiltert als falsch.
  const has = (id: string) => selected.has(id);
  const channelsAnswered = CHANNELS.cards.some((c) => has(c.id));
  const derived: BusinessType =
    has('ch:own-site') && has('off:physical') && !has('cu:businesses') ? 'ecommerce'
      : has('ch:marketplaces') ? 'marketplace'
      : has('ch:own-site') && has('off:digital') && !has('off:physical') ? 'saas'
      : 'other';
  return {
    // Ohne heutigen Markt das erste geplante Land — nie ein erfundenes.
    country: markets[0] ?? (details?.plannedMarkets ?? []).find(isCode) ?? '',
    markets,
    categories,
    businessType: channelsAnswered ? derived : ops ? BUSINESS_CODE[ops.id] ?? 'other' : '',
    businessTypeNote: channelsAnswered ? '' : ops?.id ?? '',
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
    ...(details ? { details } : {}),
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
            // Unbeantwortet steht in Klartext da — ein Strich laese sich als "nichts".
            : <span className="text-fg-tertiary">{t('wizard.review.unanswered')}</span>}
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
    () => prefill?.countryExtras ?? emptyExtras(),
  );
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Eine Marktseite reicht ihren Markt vorausgewaehlt herein. Die Seite wird
  // nicht mehr uebersprungen: sie traegt auch Sitz und Pruefumfang, und der
  // Markt der Seite ist nicht zwingend ein heutiger Markt (Handover v1.1).

  const pages = interactive ? pagesFor(selected) : DEMO_FLOW.map((k) => [k]);
  const flow = pages.flat();
  const isReview = stepKey === 'review';
  const pageIndex = pages.findIndex((p) => p.includes(stepKey as StepKey));
  const page = isReview ? [] : pages[pageIndex] ?? [stepKey as StepKey];
  const ownMarkets = ownMarketsOf(selected, extraMarkets);
  const plannedMarkets = plannedMarketsOf(selected, countryExtras.expand);
  const stepOf = (k: StepKey): StepDef => {
    if (interactive && k === 'markets') return MARKETS_ASK;
    if (interactive && k === 'domains') return DOMAINS_ASK;
    return stepDefFor(k, ownMarkets, plannedMarkets);
  };
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
        // Ein Land schliesst die Antworten ohne Land aus ("Not yet", "None" …).
        for (const x of stepOf(target).exclusive ?? []) n.delete(x);
      } else n.delete(others);
      return n;
    });
  };
  const extrasFor = (k: StepKey) =>
    k === 'markets' ? extraMarkets : isCountryStep(k) ? countryExtras[k] : [];

  // Interactive handlers (no-ops in auto-play mode). Einzelwahl ersetzt die
  // bisherige Antwort; eine exklusive Antwort (Not sure, None …) ersetzt alle
  // anderen des Schritts, jede andere Antwort hebt die exklusive auf.
  const toggle = (def: StepDef, id: string) => {
    const next = toggleAnswer(def, selected, id);
    // Hat eine exklusive Antwort "Others" abgewaehlt, gehen dessen Laender mit.
    if (isCountryStep(def.key) && !next.has(COUNTRY_PREFIX[def.key] + 'Others')) {
      setCountryExtras((p) => ({ ...p, [def.key]: [] }));
    }
    if (def.key === 'markets' && !next.has('Others')) setExtraMarkets([]);
    setSelected(next);
  };
  // CW04 braucht eine Antwort: Laender oder "noch nicht" / "nicht sicher".
  // Und ohne ein einziges Land — heute oder geplant — gibt es nichts
  // auszuwerten: frueher wurde daraus still eine deutsche Risk Map
  // (Wizard-Audit B12).
  const marketsAnswered = ownMarkets.length > 0 || MARKET_STATUS.some((id) => selected.has(id));
  const needsMarket = interactive && !isReview && page.includes('markets') && !marketsAnswered;
  const needsCountry = interactive && isReview && ownMarkets.length === 0 && plannedMarkets.length === 0;
  const blocked = needsMarket || needsCountry;
  const completedRef = useRef(false);
  const go = (k: StepKey | 'review') => {
    // Immer die erste Frage der Seite: "Edit" kann auf die zweite zeigen.
    setStepKey(k === 'review' ? k : pages.find((p) => p.includes(k))?.[0] ?? k);
    setActive(null);
  };
  const goNext = () => {
    if (blocked) return;
    if (!isReview) {
      go(pages[pageIndex + 1]?.[0] ?? 'review');
    } else {
      const profile = buildProfile(selected, extraMarkets, countryExtras);
      completedRef.current = true;
      track('Wizard Completed', { markets: profile.markets.length, areas: profile.categories.length });
      onComplete?.(profile);
    }
  };
  const goBack = () => {
    const i = isReview ? pages.length : pageIndex;
    if (i > 0) go(pages[i - 1][0]);
  };
  const atStart = !isReview && pageIndex === 0;

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
  // Fragetitel: linksbuendig und klein (Festlegung 14.11.2026) — auf einer
  // Seite stehen bis zu zwei Fragen untereinander.
  const heading = (title: string, subtitle: string) => (
    <div className={sp ? 'text-left' : 'mt-5 text-left'}>
      <h3 className="font-serif text-[24px] font-bold leading-tight text-fg">{title}</h3>
      <p className={'leading-relaxed text-fg-secondary ' + (sp ? 'mt-1.5 text-body-sm' : 'mt-2 max-w-md text-body-2xs')}>
        {subtitle}
      </p>
    </div>
  );

  // Drawer market ids are single words, so the i18n key is just the lowercase id.
  const marketLabel = (id: string) => t(`marketsDrawer.markets.${id.toLowerCase()}.name`, { defaultValue: id });
  /** Landesname fuer Karten-Id (Germany) oder Drawer-Id (Switzerland). */
  const countryLabel = (name: string) => {
    const card = MARKETS.cards.find((c) => c.id === name);
    return card ? t(`wizard.cards.${card.key}.title`) : marketLabel(name);
  };
  const cardTitle = (c: Card) => {
    const pre = Object.values(COUNTRY_PREFIX).find((x) => c.id.startsWith(x)) ?? '';
    if (pre && isCountryCard(c)) return countryLabel(c.id.slice(pre.length));
    return t(`wizard.cards.${c.key}.title`);
  };

  // Vorschlaege fuer "I am not sure what I need": nur, was noch nicht gewaehlt ist.
  const allMarkets = [...new Set([...ownMarkets, ...plannedMarkets])];
  const allMarketsLabel = allMarkets.map(countryLabel).join(', ');
  const openSuggestions = suggestedAreas(selected, allMarkets).filter((x) => !selected.has(x.id));
  const removeExpansionGoal = () => {
    const nextKey = pages[pageIndex + 1]?.[0] ?? 'review';
    setSelected((prev) => { const n = new Set(prev); n.delete('rsn:expansion'); return n; });
    setStepKey(nextKey);
    setActive(null);
  };

  // Review summary derived from the user's selections. "Not sure" steht als
  // eigene, gedaempfte Angabe da — sichtbar offen, nie als stilles Nein (8B).
  const segsOf = (k: StepKey): Seg[] => {
    if (!flow.includes(k)) return [];
    const def = stepOf(k);
    return [
      ...def.cards
        .filter((c) => selected.has(c.id) && !isOthers(c.id))
        .filter((c) => c.id !== HELP_IDENTIFY)
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
  // Die Uebersicht haelt getrennt, was das Handover v1.1 getrennt verlangt:
  // Sitz, heutige Maerkte, Pruefumfang, geplante Maerkte, Lager heute und
  // geplant, gewaehlte Bereiche und die Bitte um Hilfe.
  const row = (id: string, labelKey: string, value: Seg[], edit: StepKey) => ({ id, label: t(labelKey), value, edit });
  const reviewRows: { id: string; label: string; value: Seg[]; edit: StepKey }[] = interactive
    ? [
        row('business', 'wizard.review.business', [...segsOf('situation'), ...segsOf('reason')], 'situation'),
        row('offering', 'wizard.review.offering', [...segsOf('offering'), ...segsOf('customers'), ...segsOf('channels')], 'offering'),
        row('establishment', 'wizard.review.establishment', [
          ...segsOf('establishment'),
          ...countrySegs('planned', 'wizard.review.plannedIn', 'wizard.review.establishmentOpen'),
        ], 'establishment'),
        row('markets', 'wizard.review.currentMarkets', segsOf('markets'), 'markets'),
        ...(flow.includes('check') ? [row('check', 'wizard.review.checkScope', segsOf('check'), 'check')] : []),
        ...(flow.includes('expand') ? [row('expand', 'wizard.review.plannedMarkets', segsOf('expand'), 'expand')] : []),
        ...(flow.includes('stock')
          ? [
              row('stock', 'wizard.review.currentStock', segsOf('stock'), 'stock'),
              row('plannedStock', 'wizard.review.plannedStock', segsOf('plannedStock'), 'plannedStock'),
            ]
          : []),
        row('domains', 'wizard.review.domains', segsOf('domains'), 'domains'),
        ...(selected.has(HELP_IDENTIFY) ? [row('help', 'wizard.review.help', [{ text: t('wizard.review.helpValue') }], 'domains')] : []),
        ...(flow.includes('eprProducts')
          ? [row('epr', 'wizard.review.epr', [...segsOf('eprProducts'), ...segsOf('packaging')], 'eprProducts')]
          : []),
      ]
    : [
        row('markets', 'wizard.review.markets', segsOf('markets'), 'markets'),
        row('offering', 'wizard.review.offering', segsOf('channels'), 'channels'),
        row('domains', 'wizard.review.domains', segsOf('domains'), 'domains'),
      ];

  // Laender-Drawer fuer Sitz und Lager: Hauptlaender, die keine eigene Karte
  // sind, oben; eigene Maerkte fallen aus der Liste.
  const drawerShown = drawerFor && drawerFor !== 'markets'
    ? stepOf(drawerFor).cards.filter((c) => !isOthers(c.id)).map((c) => c.id.slice(COUNTRY_PREFIX[drawerFor].length))
    : [];
  const drawerPrimary =
    drawerFor && drawerFor !== 'markets'
      ? MARKETS.cards
          .filter((c) => !isOthers(c.id) && !drawerShown.includes(c.id))
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
          {/* Review summary card (Step 4 · Figma 1660:162). Titel und Karte teilen
              sich eine Spalte, damit beide auf derselben Kante stehen. */}
          {isReview && (
            <div className={sp ? 'mx-auto max-w-[640px]' : undefined}>
              {heading(t('wizard.review.title'), t('wizard.review.subtitle'))}
              <div className="mt-5 rounded-xl border-2 border-accent-400 bg-surface px-6">
                {reviewRows.map((r) => (
                  <SummaryRow key={r.id} label={r.label} value={r.value} onEdit={() => go(r.edit)} />
                ))}
              </div>
              <p className="mt-8 text-left text-body-sm text-fg-tertiary">
                {t('wizard.review.trust')}
              </p>
            </div>
          )}

          {/* Eine oder zwei Fragen je Seite (Wahl 1B), getrennt durch eine Linie. */}
          {!isReview && page.map((k, qi) => {
            const def = stepOf(k);
            // Die Demo im Hero (compact) zeigt 6 Karten. Wer selbst waehlt, sieht
            // immer alle — sonst waere eine Antwort nicht erreichbar.
            const cards = sp || interactive ? def.cards : def.cards.slice(0, 6);
            return (
              <section key={k} className={qi > 0 ? 'mt-10 border-t border-stroke-subtle pt-9' : undefined}>
                {heading(
                  t(`wizard.steps.${def.key}.title`),
                  // Sitz (3B) nennt die eigenen Maerkte im Untertitel.
                  t(`wizard.steps.${def.key}.subtitle`, { markets: ownMarkets.map(countryLabel).join(', ') }),
                )}
              <div className={'grid ' + (sp ? 'mt-5 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'mt-5 grid-cols-3 gap-3')}>
                {cards.map((c) => {
                  const on = selected.has(c.id);
                  const others = isOthers(c.id);
                  const openDrawer = () => setDrawerFor(def.key === 'markets' ? 'markets' : (def.key as CountryStep));
                  const cardExtras = others ? extrasFor(def.key) : [];
                  return (
                    <div
                      key={c.id}
                      ref={setTarget(c.id)}
                      onClick={interactive ? () => (others ? openDrawer() : toggle(def, c.id)) : undefined}
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
                                else toggle(def, c.id);
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
                                      applyExtra(def.key === 'markets' ? 'markets' : (def.key as CountryStep), cardExtras.filter((x) => x !== id));
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
                      {/* Karten des Fragen-Decks haben (noch) keine Beschreibung. */}
                      {(c.descKey || i18n.exists(`home:wizard.cards.${c.key}.desc`)) && (
                        <p className={'leading-snug text-fg-secondary ' + (sp ? 'mt-1 text-body-sm' : 'mt-1 text-body-3xs')}>
                          {t(c.descKey ?? `wizard.cards.${c.key}.desc`)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

                {/* "I am not sure what I need": Vorschlaege mit Grund, nichts ist
                    vorausgewaehlt. Uebernehmen fuegt sie den gewaehlten Bereichen
                    hinzu und laesst die Bitte um Hilfe stehen (Handover v1.1). */}
                {interactive && def.key === 'domains' && selected.has(HELP_IDENTIFY) && (
                  <div className="mt-6 rounded-md bg-brand-light px-5 py-4" data-testid="area-suggestions">
                    <p className="text-body-md font-semibold text-fg">{t('wizard.suggest.title')}</p>
                    <p className="mt-0.5 text-body-sm text-fg-secondary">
                      {t(openSuggestions.length ? 'wizard.suggest.note' : 'wizard.suggest.none')}
                    </p>
                    {openSuggestions.length > 0 && (
                      <>
                        <ul className="mt-3 flex flex-col gap-1.5">
                          {openSuggestions.map((x) => (
                            <li key={x.id} className="text-body-sm text-fg">
                              <span className="font-semibold">{cardTitle(DOMAINS.cards.find((c) => c.id === x.id)!)}</span>
                              <span className="text-fg-secondary"> — {t(`wizard.suggest.reasons.${x.reason}`, { markets: allMarketsLabel })}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="mt-4"
                          onClick={() => setSelected((prev) => new Set([...prev, ...openSuggestions.map((x) => x.id)]))}
                        >
                          {t('wizard.suggest.add')}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* CW05: "nicht geplant" widerspricht dem Ziel "Expansion". Die
                    Korrektur ist sichtbar und ausdruecklich — andere Ziele bleiben. */}
                {interactive && def.key === 'expand' && selected.has('exp:not-planned') && (
                  <div className="mt-6 flex flex-col gap-4 rounded-md bg-brand-light px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body-sm text-fg">{t('wizard.expandConflict.text')}</p>
                    <Button className="shrink-0" onClick={removeExpansionGoal}>
                      {t('wizard.expandConflict.action')}
                    </Button>
                  </div>
                )}
              </section>
            );
          })}

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
        {sp && !isReview && !blocked && (
          <p className="pointer-events-none absolute left-1/2 hidden w-max max-w-[900px] -translate-x-1/2 px-4 text-center text-body-xs text-fg-tertiary lg:block">
            {/* S01: "Personal matter" ist keine Karte, solange der Umfang offen
                ist (D11) — der Hinweis nennt den besseren ersten Schritt. */}
            {stepKey === 'situation' ? t('wizard.situationHint') : t('wizard.skipHint')}
          </p>
        )}
        {blocked && (
          <p
            id="wizard-needs-market"
            className={
              'text-center text-fg-secondary ' +
              (sp ? 'pointer-events-none absolute left-1/2 -translate-x-1/2 px-4 text-body-xs' : 'order-1 mx-3 flex-1 text-body-3xs')
            }
          >
            {needsCountry ? t('wizard.needsCountry') : t('wizard.needsMarket')}
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
              disabled={blocked}
              aria-describedby={blocked ? 'wizard-needs-market' : undefined}
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
          exclude={drawerFor && drawerFor !== 'markets' ? drawerShown : undefined}
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
