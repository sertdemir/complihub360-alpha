import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimatedWizard } from './AnimatedWizard';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── initialMarkets · the market page hands over its market ──────────────────
// A market page's CTA opens /wizard?market=<code>. The page IS the answer to
// the wizard's first question, so the wizard must open on Operations with that
// market pre-selected — and never re-ask what the visitor just chose. These
// tests pin the three edges: the skip, the way back, and the bad code.

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

describe('AnimatedWizard · initialMarkets', () => {
  it('opens on Operations when the entry point already named the market', () => {
    setup({ initialMarkets: ['DE'] });
    expect(screen.getByRole('heading', { name: 'wizard.steps.operations.title' })).toBeInTheDocument();
  });

  it('keeps the market editable: Back reaches the Markets step with the market selected', () => {
    setup({ initialMarkets: ['DE'] });
    fireEvent.click(screen.getByRole('button', { name: /wizard\.back/ }));
    expect(screen.getByRole('heading', { name: 'wizard.steps.markets.title' })).toBeInTheDocument();
    const germany = screen
      .getByText('wizard.cards.germany.title')
      .closest('[role="button"]') as HTMLElement;
    expect(germany).toHaveAttribute('aria-pressed', 'true');
  });

  it('carries the market through to the completed profile', () => {
    const { onComplete } = setup({ initialMarkets: ['UK'] });
    // Operations → Domains → Review → Generate; the market needs no re-touch.
    fireEvent.click(screen.getByRole('button', { name: /wizard\.footer\.next/ }));
    fireEvent.click(screen.getByRole('button', { name: /wizard\.footer\.next/ }));
    fireEvent.click(screen.getByRole('button', { name: /wizard\.generate/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const profile = onComplete.mock.calls[0][0] as SearchProfile;
    expect(profile.markets).toEqual(['UK']);
    expect(profile.country).toBe('UK');
  });

  it('falls back to a normal start when the code is unknown', () => {
    setup({ initialMarkets: ['XX'] });
    expect(screen.getByRole('heading', { name: 'wizard.steps.markets.title' })).toBeInTheDocument();
  });
});
