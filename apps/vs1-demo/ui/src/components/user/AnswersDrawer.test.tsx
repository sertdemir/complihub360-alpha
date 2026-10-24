import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnswersDrawer } from './AnswersDrawer';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Antworten-Schublade v1a (Canvas-Wahl 1B · 2A · 3C · 4A · 5A · 6C) ───────
// t() liefert den Schluessel (mit Interpolation angehaengt), damit die Tests
// den Copy-Platz pruefen, nicht eine Sprache.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts.answer === 'string' ? `${key}|${opts.answer}` : key,
    i18n: { resolvedLanguage: 'en' },
  }),
}));
// Die Laenderliste bringt Fokusfalle und Katalog mit; hier zaehlt nur, ob sie aufgeht.
vi.mock('../home/MarketsDrawer', () => ({
  WizardDrawerLayer: ({ marketsOpen }: { marketsOpen: boolean }) => (marketsOpen ? <div>country-list-open</div> : null),
  COUNTRY_INFO: {},
}));
const updateSessionAnswers = vi.hoisted(() => vi.fn());
vi.mock('../../api/sessions', () => ({ updateSessionAnswers: (...a: unknown[]) => updateSessionAnswers(...a) }));

const BASE: Partial<SearchProfile> = {
  country: 'DE', markets: ['DE', 'IT'], categories: ['tax-vat', 'product-packaging'],
  businessType: 'ecommerce', businessTypeNote: 'D2C e-commerce',
  details: { situation: 'existing', offering: ['physical'], establishment: ['DE'], stock: ['not-sure'], eprProducts: ['other'], packaging: ['shipping'] },
};

const setup = (profile: Partial<SearchProfile> = BASE) => {
  const onSaved = vi.fn();
  render(<AnswersDrawer open onClose={() => {}} sessionId="s1" sessionLabel="Shop" profile={profile} onSaved={onSaved} />);
  return { onSaved };
};
const step = (title: string) => screen.getByText(title).closest('section') as HTMLElement;
const openStep = (title: string) => fireEvent.click(screen.getByText(title).closest('button') as HTMLElement);
const option = (key: string) => screen.getAllByRole('checkbox').concat(screen.queryAllByRole('radio'))
  .find((b) => b.textContent?.includes(`wizard.cards.${key}.title`)) as HTMLElement;

beforeEach(() => { updateSessionAnswers.mockReset(); updateSessionAnswers.mockResolvedValue(undefined); });

describe('AnswersDrawer · v1a', () => {
  it('1B · 2A: groups like the wizard rail, conditional steps only when they apply', () => {
    setup();
    expect(screen.getByText('wizard.rail.business')).toBeInTheDocument();
    expect(screen.getByText('answersDrawer.steps.stock')).toBeInTheDocument();
    expect(screen.getByText('answersDrawer.steps.eprProducts')).toBeInTheDocument();
    // Ohne physische Produkte und ohne EPR-Bereich: weder Lager noch EPR.
    setup({ ...BASE, categories: ['tax-vat'], details: { ...BASE.details!, offering: ['services'] } });
    expect(screen.getAllByText('answersDrawer.steps.stock')).toHaveLength(1);
    expect(screen.getAllByText('answersDrawer.steps.eprProducts')).toHaveLength(1);
  });

  it('5A: a collapsed "Not sure" reads as still open, muted', () => {
    setup();
    const chip = step('answersDrawer.steps.stock').querySelector('.bg-surface-tertiary');
    expect(chip?.textContent).toBe('wizard.review.notSure');
  });

  it('4A: Not sure replaces the other answers of the step, like the wizard', () => {
    setup();
    openStep('answersDrawer.steps.offering');
    fireEvent.click(option('offServices'));
    expect(option('offPhysical')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(option('notSure'));
    expect(option('notSure')).toHaveAttribute('aria-checked', 'true');
    expect(option('offPhysical')).toHaveAttribute('aria-checked', 'false');
    expect(option('offServices')).toHaveAttribute('aria-checked', 'false');
  });

  it('3C: the establishment step offers the wizard\'s country list', () => {
    setup();
    openStep('answersDrawer.steps.establishment');
    fireEvent.click(screen.getByRole('button', { name: 'answersDrawer.otherCountry' }));
    expect(screen.getByText('country-list-open')).toBeInTheDocument();
  });

  it('Escape in the country list leaves the drawer and its unsaved changes open', () => {
    const onClose = vi.fn();
    render(<AnswersDrawer open onClose={onClose} sessionId="s1" sessionLabel="Shop" profile={BASE} onSaved={() => {}} />);
    openStep('answersDrawer.steps.establishment');
    fireEvent.click(screen.getByRole('button', { name: 'answersDrawer.otherCountry' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('6C: dropping physical products names the stock answer before saving, and saving drops it', async () => {
    setup();
    expect(screen.queryByText(/answersDrawer\.removes\.stock/)).not.toBeInTheDocument();
    openStep('answersDrawer.steps.offering');
    fireEvent.click(option('offPhysical'));
    fireEvent.click(option('offServices'));
    expect(screen.queryByText('answersDrawer.steps.stock')).not.toBeInTheDocument();
    expect(screen.getByText('answersDrawer.removes.stock|wizard.cards.notSure.title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'answersDrawer.save' }));
    await waitFor(() => expect(updateSessionAnswers).toHaveBeenCalledTimes(1));
    const saved = updateSessionAnswers.mock.calls[0][1] as SearchProfile;
    expect(saved.details).toMatchObject({ offering: ['services'], stock: [], establishment: ['DE'] });
    expect(saved.markets).toEqual(['DE', 'IT']);
  });

  it('saves a changed establishment into details', async () => {
    setup();
    openStep('answersDrawer.steps.establishment');
    fireEvent.click(screen.getAllByRole('checkbox').find((b) => b.textContent?.includes('wizard.cards.italy.title')) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'answersDrawer.save' }));
    await waitFor(() => expect(updateSessionAnswers).toHaveBeenCalled());
    expect((updateSessionAnswers.mock.calls[0][1] as SearchProfile).details?.establishment).toEqual(['DE', 'IT']);
  });

  it('an older profile without details opens cleanly and keeps markets and areas required', async () => {
    setup({ country: 'DE', markets: ['DE'], categories: ['tax-vat'], businessTypeNote: 'D2C e-commerce' });
    expect(step('answersDrawer.steps.situation').textContent).toContain('answersDrawer.none');
    openStep('wizard.review.domains');
    fireEvent.click(screen.getAllByRole('checkbox').find((b) => b.textContent?.includes('wizard.cards.vatTax.title')) as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'answersDrawer.save' }));
    expect(updateSessionAnswers).not.toHaveBeenCalled();
  });
});
