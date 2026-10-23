import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimatedWizard, buildProfile, selectionFromProfile } from './AnimatedWizard';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Wizard v1a · Ablauf (Canvas-Wahl 1A · 2B · 3B · 4B · 5A · 6A · 7B · 8B) ─
// Business (Situation → Operations → Angebot) → Markets (Maerkte → Sitz →
// Lager, nur bei physischen Produkten) → Areas (Bereiche → EPR 1/2 → EPR 2/2,
// nur mit EPR & Packaging) → Review.

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
    i18n: { resolvedLanguage: 'en' },
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

// ─── initialMarkets · the market page hands over its market ──────────────────
// A market page's CTA opens /wizard?market=<code>. The page IS the answer to
// the Markets question, so the wizard must never re-ask it going forward —
// and Back must still reach it. These tests pin the skip, the way back and
// the bad code.
describe('AnimatedWizard · initialMarkets', () => {
  it('starts with the situation and skips Markets going forward', () => {
    setup({ initialMarkets: ['DE'] });
    expect(heading('situation')).toBeInTheDocument();
    nextTimes(3); // Situation → Operations → Offering → (Markets skipped)
    expect(heading('establishment')).toBeInTheDocument();
  });

  it('keeps the market editable: Back reaches the Markets step with the market selected', () => {
    setup({ initialMarkets: ['DE'] });
    nextTimes(3);
    fireEvent.click(screen.getByRole('button', { name: /wizard\.back/ }));
    expect(heading('markets')).toBeInTheDocument();
    expect(card('germany')).toHaveAttribute('aria-pressed', 'true');
  });

  it('carries the market through to the completed profile', () => {
    const { onComplete } = setup({ initialMarkets: ['UK'] });
    nextTimes(5); // … Establishment → Domains → Review
    fireEvent.click(generate());
    expect(onComplete).toHaveBeenCalledTimes(1);
    const profile = onComplete.mock.calls[0][0] as SearchProfile;
    expect(profile.markets).toEqual(['UK']);
    expect(profile.country).toBe('UK');
  });

  it('falls back to a normal start when the code is unknown', () => {
    setup({ initialMarkets: ['XX'] });
    nextTimes(3);
    expect(heading('markets')).toBeInTheDocument();
  });
});

// ─── Wizard-Audit 23.10.2026: was angezeigt wird, wird auch gespeichert ──────
describe('AnimatedWizard · audit fixes', () => {
  it('B12: no market, no way forward — and the reason is named', () => {
    setup();
    nextTimes(3);
    expect(next()).toBeDisabled();
    expect(next()).toHaveAttribute('aria-describedby', 'wizard-needs-market');
    expect(screen.getByText('wizard.needsMarket')).toBeInTheDocument();
    fireEvent.click(card('germany'));
    expect(next()).toBeEnabled();
    expect(screen.queryByText('wizard.needsMarket')).not.toBeInTheDocument();
  });

  it('B12: a category-only entry cannot generate without a market', () => {
    const { onComplete } = setup({ initialProfile: { categories: ['tax-vat'] } as SearchProfile });
    expect(generate()).toBeDisabled();
    fireEvent.click(generate());
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('B1: Operations takes exactly one business model', () => {
    const { onComplete } = setup({ initialMarkets: ['DE'] });
    nextTimes(1);
    fireEvent.click(card('d2cEcommerce'));
    fireEvent.click(card('marketplace'));
    expect(card('d2cEcommerce')).toHaveAttribute('aria-pressed', 'false');
    expect(card('marketplace')).toHaveAttribute('aria-pressed', 'true');
    nextTimes(4);
    fireEvent.click(generate());
    const profile = onComplete.mock.calls[0][0] as SearchProfile;
    expect(profile.businessType).toBe('marketplace');
    expect(profile.businessTypeNote).toBe('Marketplace');
  });

  it('B8 · F8: no invented EU scope, no invented "no existing Provider"', () => {
    const { onComplete } = setup({ initialMarkets: ['US', 'TR'] });
    nextTimes(5);
    fireEvent.click(generate());
    const profile = onComplete.mock.calls[0][0] as SearchProfile;
    expect(profile.markets).toEqual(['US', 'TR']);
    expect(profile.marketScope).toBe('');
    expect(profile.existingProvider).toBeNull();
  });
});

describe('AnimatedWizard · v1a', () => {
  it('asks for stock only when physical products are sold', () => {
    setup({ initialMarkets: ['DE'] });
    nextTimes(2);
    expect(heading('offering')).toBeInTheDocument();
    nextTimes(2); // Offering → Establishment → Domains
    expect(heading('domains')).toBeInTheDocument();
    // Zurueck fuehrt ueber den uebersprungenen Markt-Schritt.
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /wizard\.back/ }));
    expect(heading('offering')).toBeInTheDocument();
    fireEvent.click(card('offPhysical'));
    nextTimes(2);
    expect(heading('stock')).toBeInTheDocument();
  });

  it('asks the EPR details only when EPR & Packaging is chosen', () => {
    setup({ initialMarkets: ['DE'] });
    nextTimes(4);
    fireEvent.click(card('eprPackaging'));
    nextTimes(1);
    expect(heading('eprProducts')).toBeInTheDocument();
    nextTimes(1);
    expect(heading('packaging')).toBeInTheDocument();
  });

  it('Not sure stands alone: it clears the other answers of the step, and back', () => {
    setup({ initialMarkets: ['DE'] });
    nextTimes(2);
    fireEvent.click(card('offPhysical'));
    fireEvent.click(card('offServices'));
    fireEvent.click(card('notSure'));
    expect(card('notSure')).toHaveAttribute('aria-pressed', 'true');
    expect(card('offPhysical')).toHaveAttribute('aria-pressed', 'false');
    expect(card('offServices')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(card('offDigital'));
    expect(card('notSure')).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers the own markets first for the establishment', () => {
    setup({ initialMarkets: ['DE', 'NL'] });
    nextTimes(3);
    // Zwei eigene Maerkte als Karten, dann Others, Not yet, Not sure.
    expect(screen.getAllByText('wizard.cards.estMarket.desc')).toHaveLength(2);
    expect(screen.getByText('wizard.cards.estNotYet.title')).toBeInTheDocument();
  });

  it('stores the new answers in details — and only those that were asked', () => {
    const { onComplete } = setup({ initialMarkets: ['DE'] });
    fireEvent.click(card('sitExisting'));
    nextTimes(2);
    fireEvent.click(card('offPhysical'));
    nextTimes(1);
    fireEvent.click(screen.getAllByText('wizard.cards.estMarket.desc')[0].closest('[role="button"]') as HTMLElement);
    nextTimes(1);
    fireEvent.click(card('notSure'));
    nextTimes(1);
    fireEvent.click(card('eprPackaging'));
    nextTimes(1);
    fireEvent.click(card('eprOther'));
    nextTimes(1);
    fireEvent.click(card('pkgShipping'));
    nextTimes(1);
    // Review: "Not sure" steht gedaempft als offen da (8B).
    expect(screen.getByText('wizard.review.notSure')).toHaveClass('text-fg-tertiary');
    fireEvent.click(generate());
    const profile = onComplete.mock.calls[0][0] as SearchProfile;
    expect(profile.details).toEqual({
      situation: 'existing',
      offering: ['physical'],
      establishment: ['DE'],
      stock: ['not-sure'],
      eprProducts: ['other'],
      packaging: ['shipping'],
    });
  });

  it('drops dependent answers when the condition goes away', () => {
    const profile = buildProfile(
      new Set(['Germany', 'stock:Germany', 'epr:other', 'pkg:none']),
      [],
      { establishment: [], stock: [] },
    );
    // Kein "Physical products", kein EPR-Bereich: Lager und EPR wurden nie gefragt.
    expect(profile.details?.stock).toEqual([]);
    expect(profile.details?.eprProducts).toEqual([]);
    expect(profile.details?.packaging).toEqual([]);
  });
});

describe('details · round trip', () => {
  it('a stored profile comes back as the same selection', () => {
    const sel = new Set(['Germany', 'Others', 'sit:starting', 'off:physical', 'est:Others', 'stock:Germany', 'EPR & Packaging', 'epr:not-sure', 'pkg:packaged']);
    const extras = { establishment: ['France'], stock: [] };
    const profile = buildProfile(sel, ['Austria'], extras);
    expect(profile.details?.establishment).toEqual(['FR']);
    const back = selectionFromProfile(profile);
    expect(back.countryExtras.establishment).toEqual(['France']);
    expect(buildProfile(back.selected, back.extraMarkets, back.countryExtras).details).toEqual(profile.details);
  });

  it('without extras buildProfile leaves details out (AnswersDrawer keeps the stored ones)', () => {
    expect('details' in buildProfile(new Set(['Germany']), [])).toBe(false);
  });
});

describe('buildProfile · B5 drawer markets', () => {
  it('stores drawer markets as ISO codes and reads old name profiles back', () => {
    const profile = buildProfile(new Set(['Germany', 'Others']), ['Switzerland', 'Austria']);
    expect(profile.markets).toEqual(['DE', 'CH', 'AT']);
    expect(selectionFromProfile(profile).extraMarkets).toEqual(['Switzerland', 'Austria']);
    // Profile vor dem Fix trugen den Namen — die Auswahl bleibt dieselbe.
    expect(selectionFromProfile({ ...profile, markets: ['DE', 'Portugal'] }).extraMarkets).toEqual(['Portugal']);
  });
});
