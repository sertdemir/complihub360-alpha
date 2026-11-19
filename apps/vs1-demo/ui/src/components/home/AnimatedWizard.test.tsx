import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimatedWizard, buildProfile, selectionFromProfile, suggestedAreas, emptyExtras } from './AnimatedWizard';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Kernablauf nach dem Core Wizard Handover v1.1 (18.11.2026) ──────────────
// Ausgangslage (Situation + Ziele) → Angebot (Angebot + Kundschaft +
// Vertriebsweg) → Heutiger Stand (Maerkte + Sitz, dazu Pruefumfang beim Ziel
// "check") → Expansion (nur beim Ziel "expansion") → Lager heute + geplant
// (nur bei physischen Produkten) → Bereiche → EPR → Review.
// Die Tests am Ende folgen den Abnahmefaellen des Handovers.

// The drawers pull in focus traps and the whole markets catalogue; none of it
// participates in the step logic under test.
vi.mock('./MarketsDrawer', () => ({
  WizardDrawerLayer: () => null,
  COUNTRY_INFO: {},
}));
// t() resolves to the key (no defaultValues in this component), so assertions
// name the copy slot rather than one locale's wording.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key,
    i18n: { resolvedLanguage: 'en', exists: () => true },
  }),
}));

const setup = (props: Partial<Parameters<typeof AnimatedWizard>[0]> = {}) => {
  const onComplete = vi.fn();
  render(<AnimatedWizard interactive showHeader={false} onComplete={onComplete} {...props} />);
  return { onComplete };
};

const heading = (key: string) => screen.getByRole('heading', { name: `wizard.steps.${key}.title` });
const card = (key: string, nth = 0) =>
  screen.getAllByText(`wizard.cards.${key}.title`)[nth].closest('[role="button"]') as HTMLElement;
const next = () => screen.getByRole('button', { name: /wizard\.footer\.next/ });
const generate = () => screen.getByRole('button', { name: /wizard\.generate/ });
const nextTimes = (n: number) => { for (let i = 0; i < n; i++) fireEvent.click(next()); };

const done = (onComplete: ReturnType<typeof vi.fn>) => {
  fireEvent.click(generate());
  return onComplete.mock.calls[0][0] as SearchProfile;
};
/** Bis zur Seite "Heutiger Stand"; waehlt vorher Situation, Ziele und Angebot. */
const toFootprint = (goals: string[] = [], offering: string[] = []) => {
  fireEvent.click(card('sitExisting'));
  for (const g of goals) fireEvent.click(card(g));
  nextTimes(1);
  for (const o of offering) fireEvent.click(card(o));
  nextTimes(1);
  expect(heading('markets')).toBeInTheDocument();
};

describe('AnimatedWizard · pages', () => {
  it('groups the core questions as the handover does', () => {
    setup();
    expect(heading('situation')).toBeInTheDocument();
    expect(heading('reason')).toBeInTheDocument();
    nextTimes(1);
    for (const k of ['offering', 'customers', 'channels']) expect(heading(k)).toBeInTheDocument();
    nextTimes(1);
    expect(heading('markets')).toBeInTheDocument();
    expect(heading('establishment')).toBeInTheDocument();
  });

  it('CW04 needs an answer — countries, or one of the two statuses', () => {
    setup();
    toFootprint();
    expect(next()).toBeDisabled();
    expect(screen.getByText('wizard.needsMarket')).toBeInTheDocument();
    fireEvent.click(card('mkNotYet'));
    expect(next()).toBeEnabled();
  });

  it('without a single country — current or planned — there is nothing to assess', () => {
    const { onComplete } = setup();
    toFootprint();
    fireEvent.click(card('mkNotYet'));
    nextTimes(2);
    expect(generate()).toBeDisabled();
    expect(screen.getByText('wizard.needsCountry')).toBeInTheDocument();
    fireEvent.click(generate());
    expect(onComplete).not.toHaveBeenCalled();
  });

  // Feedback CW-F05 (19.11.2026): Gruendung ist nicht Expansion.
  it('a founder with only a planned establishment country reaches the Risk Map', () => {
    const { onComplete } = setup();
    fireEvent.click(card('sitStarting'));
    nextTimes(2);
    fireEvent.click(card('mkNotYet'));
    fireEvent.click(card('estNotYet'));
    expect(heading('planned')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('wizard.cards.others.title')[2].closest('[role="button"]') as HTMLElement);
    nextTimes(2);
    // Ohne Land bleibt gesperrt — die Laenderliste ist hier gemockt.
    expect(generate()).toBeDisabled();
    const p = buildProfile(new Set(['mk:not-yet', 'est:not-yet', 'plan:Others']), [], { ...emptyExtras(), planned: ['Austria'] });
    expect(p.country).toBe('AT');
    expect(p.markets).toEqual([]);
    expect(p.details?.plannedEstablishment).toEqual(['AT']);
    expect(p.details?.plannedMarkets).toEqual([]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('an existing establishment without sales carries the request', () => {
    const p = buildProfile(new Set(['mk:not-yet', 'est:Others']), [], { ...emptyExtras(), establishment: ['France'] });
    expect(p.country).toBe('FR');
    expect(p.details?.marketsStatus).toBe('not-yet');
  });

  // Feedback CW-F06: "Add answer" oeffnet die Frage, nicht die Uebersicht.
  it('opens on the page of the question "Add answer" points to', () => {
    setup({ initialProfile: { markets: ['DE'], categories: ['tax-vat'], details: { situation: 'existing', offering: [], establishment: [], stock: [], eprProducts: [], packaging: [] } } as unknown as SearchProfile, initialStep: 'establishment' });
    expect(heading('markets')).toBeInTheDocument();
    expect(heading('establishment')).toBeInTheDocument();
  });

  it('an unknown step falls back to the review', () => {
    setup({ initialProfile: { markets: ['DE'], categories: ['tax-vat'] } as SearchProfile, initialStep: 'nonsense' });
    expect(generate()).toBeInTheDocument();
  });

  // Feedback CW-F03: jedes Land ist erfassbar, auch wenn es nicht ausgewertet wird.
  it('keeps a country we cannot assess in the request, in every role', () => {
    const sel = new Set(['Others', 'rsn:expansion', 'exp:Others', 'est:Others']);
    const p = buildProfile(sel, ['CA'], { ...emptyExtras(), expand: ['MX'], establishment: ['BR'] });
    expect(p.markets).toEqual(['CA']);
    expect(p.details?.plannedMarkets).toEqual(['MX']);
    expect(p.details?.establishment).toEqual(['BR']);
    const again = selectionFromProfile(p);
    expect(again.extraMarkets).toEqual(['CA']);
    expect(again.countryExtras.expand).toEqual(['MX']);
    expect(again.countryExtras.establishment).toEqual(['BR']);
    expect(buildProfile(again.selected, again.extraMarkets, again.countryExtras).details).toEqual(p.details);
  });

  it('the review names the countries that are not assessed yet', () => {
    setup({ initialProfile: { country: 'DE', markets: ['DE', 'CA'], categories: ['tax-vat'], details: { situation: 'existing', goals: ['expansion'], offering: [], establishment: [], plannedMarkets: ['MX'], stock: [], eprProducts: [], packaging: [] } } as unknown as SearchProfile });
    expect(screen.getByTestId('not-assessed')).toHaveTextContent('wizard.review.notAssessedTitle');
    expect(generate()).toBeEnabled();
  });

  it('says nothing when every country can be assessed', () => {
    setup({ initialProfile: { country: 'DE', markets: ['DE', 'FR'], categories: ['tax-vat'] } as SearchProfile });
    expect(screen.queryByTestId('not-assessed')).not.toBeInTheDocument();
  });

  it('a market page hands over its market preselected; the page is not skipped', () => {
    setup({ initialMarkets: ['DE'] });
    toFootprint();
    expect(card('germany')).toHaveAttribute('aria-pressed', 'true');
  });

  it('an unknown market code degrades to a normal start', () => {
    setup({ initialMarkets: ['XX'] });
    toFootprint();
    expect(next()).toBeDisabled();
  });

  it('B12: a category-only entry cannot generate without a country', () => {
    const { onComplete } = setup({ initialProfile: { categories: ['tax-vat'] } as SearchProfile });
    expect(generate()).toBeDisabled();
    fireEvent.click(generate());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('B8 · F8: no invented EU scope, no invented "no existing Provider"', () => {
    const { onComplete } = setup({ initialMarkets: ['US', 'TR'] });
    toFootprint();
    nextTimes(2);
    const profile = done(onComplete);
    expect(profile.markets).toEqual(['US', 'TR']);
    expect(profile.marketScope).toBe('');
    expect(profile.existingProvider).toBeNull();
  });
});

describe('AnimatedWizard · business type and follow-ups', () => {
  const sel = (ids: string[]) => buildProfile(new Set(ids), [], emptyExtras());

  it('S06: the sales channel sets the business type for the engine', () => {
    expect(sel(['Germany', 'off:physical', 'ch:own-site']).businessType).toBe('ecommerce');
    expect(sel(['Germany', 'off:physical', 'ch:own-site']).businessTypeNote).toBe('');
    expect(sel(['Germany', 'ch:marketplaces']).businessType).toBe('marketplace');
    expect(sel(['Germany', 'ch:operating']).businessType).toBe('other');
  });

  it('S05: customers is a single choice', () => {
    setup();
    nextTimes(1);
    fireEvent.click(card('cuConsumers'));
    fireEvent.click(card('cuBoth'));
    expect(card('cuConsumers')).toHaveAttribute('aria-pressed', 'false');
    expect(card('cuBoth')).toHaveAttribute('aria-pressed', 'true');
  });

  it('CW01: working for yourself is its own answer', () => {
    expect(sel(['Germany', 'sit:self-employed']).details?.situation).toBe('self-employed');
  });

  it('"Not established yet" asks for the planned country on the same page', () => {
    const { onComplete } = setup({ initialMarkets: ['DE'] });
    toFootprint();
    expect(screen.queryByRole('heading', { name: 'wizard.steps.planned.title' })).not.toBeInTheDocument();
    fireEvent.click(card('estNotYet'));
    expect(heading('planned')).toBeInTheDocument();
    // Germany steht als Markt, als Sitz und in der Folgefrage.
    fireEvent.click(card('germany', 2));
    nextTimes(2);
    const profile = done(onComplete);
    expect(profile.details?.establishment).toEqual(['not-yet']);
    expect(profile.details?.plannedEstablishment).toEqual(['DE']);
  });

  it('asks the EPR details only when EPR & Packaging is chosen', () => {
    setup({ initialMarkets: ['DE'] });
    toFootprint();
    nextTimes(1);
    fireEvent.click(card('eprPackaging'));
    nextTimes(1);
    expect(heading('eprProducts')).toBeInTheDocument();
    nextTimes(1);
    expect(heading('packaging')).toBeInTheDocument();
  });

  it('an exclusive answer stands alone, and back', () => {
    setup();
    nextTimes(1);
    fireEvent.click(card('offPhysical'));
    fireEvent.click(card('offServices'));
    fireEvent.click(card('notSure'));
    expect(card('notSure')).toHaveAttribute('aria-pressed', 'true');
    expect(card('offPhysical')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(card('offDigital'));
    expect(card('notSure')).toHaveAttribute('aria-pressed', 'false');
  });

  it('sessions from before the handover keep their goals', () => {
    const old = selectionFromProfile({ markets: ['DE'], categories: [], details: { situation: 'existing', reason: ['launch', 'expansion', 'problem'], offering: [], establishment: [], stock: [], eprProducts: [], packaging: [] } } as unknown as SearchProfile);
    expect(old.selected.has('rsn:starting')).toBe(true);
    expect(old.selected.has('rsn:expansion')).toBe(true);
    expect(old.selected.has('rsn:other')).toBe(true);
  });
});

// ─── Abnahmefaelle des Handovers ─────────────────────────────────────────────
describe('Handover v1.1 · acceptance', () => {
  it('US seller expansion: US is current, DE and FR are planned — not US-only', () => {
    const { onComplete } = setup();
    toFootprint(['rsnExpansion']);
    fireEvent.click(card('unitedStates'));
    nextTimes(1);
    expect(heading('expand')).toBeInTheDocument();
    fireEvent.click(card('germany'));
    fireEvent.click(card('france'));
    nextTimes(2);
    // Die Uebersicht fuehrt beides getrennt.
    expect(screen.getByText('wizard.review.currentMarkets')).toBeInTheDocument();
    expect(screen.getByText('wizard.review.plannedMarkets')).toBeInTheDocument();
    const profile = done(onComplete);
    expect(profile.markets).toEqual(['US']);
    expect(profile.country).toBe('US');
    expect(profile.details?.plannedMarkets).toEqual(['DE', 'FR']);
  });

  it('several goals: expansion, current check and "something else" all stay', () => {
    const { onComplete } = setup();
    toFootprint(['rsnExpansion', 'rsnCheck', 'rsnOther']);
    expect(heading('check')).toBeInTheDocument();
    fireEvent.click(card('unitedStates'));
    fireEvent.click(card('chkAll'));
    nextTimes(1);
    fireEvent.click(card('germany'));
    fireEvent.click(card('france'));
    nextTimes(2);
    const profile = done(onComplete);
    expect(profile.details?.goals).toEqual(['expansion', 'check', 'other']);
    expect(profile.markets).toEqual(['US']);
    expect(profile.details?.plannedMarkets).toEqual(['DE', 'FR']);
    expect(profile.details?.checkScope).toEqual({ mode: 'all-current', countries: [] });
  });

  it('explicit check scope: "all current" is a live reference; specific countries stay explicit', () => {
    const all = buildProfile(new Set(['United States', 'rsn:check', 'chk:all-current']), [], emptyExtras());
    expect(all.details?.checkScope).toEqual({ mode: 'all-current', countries: [] });
    // Heutige Maerkte geaendert: die Verweisung traegt nichts Altes mit.
    const edited = buildProfile(new Set(['United States', 'Germany', 'rsn:check', 'chk:all-current']), [], emptyExtras());
    expect(edited.markets).toEqual(['DE', 'US']);
    expect(edited.details?.checkScope).toEqual({ mode: 'all-current', countries: [] });
    const specific = buildProfile(new Set(['United States', 'Germany', 'rsn:check', 'chk:Germany']), [], emptyExtras());
    expect(specific.details?.checkScope).toEqual({ mode: 'countries', countries: ['DE'] });
    // CW-F02: der eingegrenzte Umfang fuehrt die Suche — nicht der erste heutige Markt.
    expect(specific.markets).toEqual(['DE', 'US']);
    expect(specific.country).toBe('DE');
    const onlyUs = buildProfile(new Set(['United States', 'Germany', 'rsn:check', 'chk:United States']), [], emptyExtras());
    expect(onlyUs.markets).toEqual(['DE', 'US']);
    expect(onlyUs.country).toBe('US');
    // Ohne das Ziel ist der Pruefumfang nicht gefragt.
    expect(buildProfile(new Set(['United States', 'chk:all-current']), [], emptyExtras()).details?.checkScope).toBeUndefined();
  });

  it('undecided expansion stays visibly unresolved', () => {
    const { onComplete } = setup();
    toFootprint(['rsnExpansion']);
    fireEvent.click(card('unitedStates'));
    nextTimes(1);
    fireEvent.click(card('germany'));
    fireEvent.click(card('expUndecided'));
    expect(card('germany')).toHaveAttribute('aria-pressed', 'false');
    nextTimes(2);
    expect(screen.getByText('wizard.cards.expUndecided.title')).toBeInTheDocument();
    const profile = done(onComplete);
    expect(profile.details?.plannedMarkets).toEqual(['undecided']);
    expect(profile.markets).toEqual(['US']);
  });

  it('distinct stock roles: current US, planned FR, planned sales DE/FR', () => {
    const { onComplete } = setup();
    toFootprint(['rsnExpansion'], ['offPhysical']);
    fireEvent.click(card('unitedStates'));
    nextTimes(1);
    fireEvent.click(card('germany'));
    fireEvent.click(card('france'));
    nextTimes(1);
    expect(heading('stock')).toBeInTheDocument();
    expect(heading('plannedStock')).toBeInTheDocument();
    // Lager heute bietet die heutigen Maerkte, geplantes Lager auch die geplanten.
    fireEvent.click(card('unitedStates', 0));
    fireEvent.click(card('france'));
    nextTimes(2);
    const profile = done(onComplete);
    expect(profile.markets).toEqual(['US']);
    expect(profile.details?.plannedMarkets).toEqual(['DE', 'FR']);
    expect(profile.details?.stock).toEqual(['US']);
    expect(profile.details?.plannedStock).toEqual(['FR']);
  });

  it('stock visibility: services only skips stock; products plus services shows both, without expansion', () => {
    setup();
    toFootprint(['rsnExpansion'], ['offServices']);
    fireEvent.click(card('unitedStates'));
    nextTimes(1);
    expect(heading('expand')).toBeInTheDocument();
    fireEvent.click(card('germany'));
    nextTimes(1);
    expect(heading('domains')).toBeInTheDocument();
  });

  it('stock visibility: physical products plus services ask both stock questions', () => {
    setup();
    toFootprint([], ['offPhysical', 'offServices']);
    fireEvent.click(card('unitedStates'));
    nextTimes(1);
    expect(heading('stock')).toBeInTheDocument();
    expect(heading('plannedStock')).toBeInTheDocument();
  });

  it('guided services: help only', () => {
    const { onComplete } = setup({ initialMarkets: ['DE'] });
    toFootprint([], ['offPhysical']);
    nextTimes(2);
    fireEvent.click(card('helpIdentify'));
    expect(screen.getByTestId('area-suggestions')).toBeInTheDocument();
    // Vorgeschlagen, aber nichts ausgewaehlt.
    expect(card('eprPackaging')).toHaveAttribute('aria-pressed', 'false');
    nextTimes(1);
    const profile = done(onComplete);
    expect(profile.categories).toEqual([]);
    expect(profile.details?.helpIdentify).toBe(true);
  });

  it('guided services: EPR plus help — Add merges, help stays, clearing help keeps the areas', () => {
    const { onComplete } = setup({ initialMarkets: ['DE'] });
    toFootprint([], ['offPhysical']);
    nextTimes(2);
    fireEvent.click(card('eprPackaging'));
    fireEvent.click(card('helpIdentify'));
    expect(card('eprPackaging')).toHaveAttribute('aria-pressed', 'true');
    expect(card('vatTax')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'wizard.suggest.add' }));
    expect(card('vatTax')).toHaveAttribute('aria-pressed', 'true');
    expect(card('productCompliance')).toHaveAttribute('aria-pressed', 'true');
    expect(card('helpIdentify')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(card('helpIdentify'));
    expect(card('eprPackaging')).toHaveAttribute('aria-pressed', 'true');
    expect(card('vatTax')).toHaveAttribute('aria-pressed', 'true');
    nextTimes(3); // EPR 1/2 → EPR 2/2 → Review
    const profile = done(onComplete);
    expect(profile.categories).toEqual(['tax-vat', 'product-packaging', 'product-compliance']);
    expect(profile.details?.helpIdentify).toBe(false);
  });

  it('suggestions follow fixed rules, each tied to an answer', () => {
    expect(suggestedAreas(new Set(), [])).toEqual([]);
    expect(suggestedAreas(new Set(['off:physical']), ['United States', 'Germany']).map((x) => x.id))
      .toEqual(['Tax & VAT', 'EPR & Packaging', 'Product Compliance', 'Logistics & Customs']);
  });

  it('change and resume: planned FR becomes NL — US stays current, FR is gone', () => {
    const first = buildProfile(new Set(['United States', 'rsn:expansion', 'exp:Germany', 'exp:France']), [], emptyExtras());
    expect(first.details?.plannedMarkets).toEqual(['DE', 'FR']);
    const resumed = selectionFromProfile(first);
    expect(buildProfile(resumed.selected, resumed.extraMarkets, resumed.countryExtras).details).toEqual(first.details);
    resumed.selected.delete('exp:France');
    resumed.selected.add('exp:Netherlands');
    const second = buildProfile(resumed.selected, resumed.extraMarkets, resumed.countryExtras);
    expect(second.markets).toEqual(['US']);
    expect(second.details?.plannedMarkets).toEqual(['DE', 'NL']);
  });

  it('expansion ends only through an explicit goal correction — other goals stay', () => {
    const { onComplete } = setup();
    toFootprint(['rsnExpansion', 'rsnCheck']);
    fireEvent.click(card('unitedStates'));
    fireEvent.click(card('chkAll'));
    nextTimes(1);
    fireEvent.click(card('expNotPlanned'));
    expect(screen.getByText('wizard.expandConflict.text')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.expandConflict.action' }));
    expect(heading('domains')).toBeInTheDocument();
    nextTimes(1);
    const profile = done(onComplete);
    expect(profile.details?.goals).toEqual(['check']);
    expect(profile.details?.plannedMarkets).toEqual([]);
  });

  it('status handling: a status and countries exclude each other; unanswered is not "no"', () => {
    setup();
    toFootprint();
    fireEvent.click(card('unitedStates'));
    fireEvent.click(card('mkNotYet'));
    expect(card('unitedStates')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(card('unitedStates'));
    expect(card('mkNotYet')).toHaveAttribute('aria-pressed', 'false');
    const blank = buildProfile(new Set(['United States']), [], emptyExtras());
    expect(blank.details?.plannedMarkets).toEqual([]);
    expect(blank.details?.stock).toEqual([]);
    expect(blank.details?.plannedStock).toEqual([]);
    expect(blank.details?.checkScope).toBeUndefined();
  });

  it('no current market yet: the first planned country carries the request, as planned', () => {
    const p = buildProfile(new Set(['mk:not-yet', 'rsn:expansion', 'exp:Germany']), [], emptyExtras());
    expect(p.markets).toEqual([]);
    expect(p.details?.marketsStatus).toBe('not-yet');
    expect(p.country).toBe('DE');
    expect(p.details?.plannedMarkets).toEqual(['DE']);
  });

  it('no foreign stock plan keeps current US stock and the DE/FR expansion', () => {
    const p = buildProfile(
      new Set(['United States', 'rsn:expansion', 'exp:Germany', 'exp:France', 'off:physical', 'stock:United States', 'pstock:no-other']),
      [], emptyExtras(),
    );
    expect(p.details?.stock).toEqual(['US']);
    expect(p.details?.plannedStock).toEqual(['no-other']);
    expect(p.details?.plannedMarkets).toEqual(['DE', 'FR']);
  });

  it('dependent answers drop when their condition goes away', () => {
    const p = buildProfile(new Set(['Germany', 'stock:Germany', 'pstock:Germany', 'exp:France', 'epr:other', 'pkg:none']), [], emptyExtras());
    expect(p.details?.stock).toEqual([]);
    expect(p.details?.plannedStock).toEqual([]);
    expect(p.details?.plannedMarkets).toEqual([]);
    expect(p.details?.eprProducts).toEqual([]);
  });

  it('a country chosen through the list survives the round trip', () => {
    const sel = new Set(['Germany', 'Others', 'sit:starting', 'off:physical', 'est:Others', 'stock:Germany', 'EPR & Packaging', 'epr:not-sure', 'pkg:packaged']);
    const profile = buildProfile(sel, ['Austria'], { ...emptyExtras(), establishment: ['France'] });
    expect(profile.details?.establishment).toEqual(['FR']);
    const again = selectionFromProfile(profile);
    expect(again.countryExtras.establishment).toEqual(['France']);
    expect(buildProfile(again.selected, again.extraMarkets, again.countryExtras).details).toEqual(profile.details);
  });
});
