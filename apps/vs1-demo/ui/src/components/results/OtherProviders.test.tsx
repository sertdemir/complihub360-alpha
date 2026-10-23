import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OtherProvidersBlock } from './OtherProviders';
import type { OtherProvider } from '../../api/search';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key),
    i18n: { resolvedLanguage: 'en' },
  }),
}));
vi.mock('../../lib/requestContext', () => ({
  useRequestContext: () => ({ beschreibung: ({ fallback }: { fallback: string }) => fallback }),
}));

const other = (letter: string): OtherProvider => ({
  public_ref: `ref-${letter}`, title: `Verified Provider ${letter}`, letter, descriptor: 'Environmental · Germany',
  region: null, active_since: null, specializations: [], languages: [], rating: null, completed_count: null,
  avg_response_hours: null, billing_model: 'mixed', is_verified: true, match: null, match_tier: null,
  match_basis: { country: 'DE', country_covered: true, domains_requested: ['tax-vat'], domains_matched: [] },
});

// F2 · Canvas 1B 2B 3A (23.10.2026): eingeklappt, ohne Prozent, „nicht als
// Empfehlung", Details fuehren in die Schublade.
describe('OtherProvidersBlock', () => {
  it('ist eingeklappt und nennt nur die Anzahl', () => {
    render(<OtherProvidersBlock providers={[other('A'), other('B')]} onDetails={() => {}} />);
    const toggle = screen.getByRole('button', { name: /otherProviders\.toggle/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('"count":2');
    expect(screen.queryByText('Verified Provider A')).not.toBeInTheDocument();
  });

  it('aufgeklappt: Zeilen ohne Prozent, mit der Luecke und dem Weg zu Details', () => {
    const onDetails = vi.fn();
    render(<OtherProvidersBlock providers={[other('A'), other('B')]} onDetails={onDetails} />);
    fireEvent.click(screen.getByRole('button', { name: /otherProviders\.toggle/ }));
    expect(screen.getByRole('button', { name: /otherProviders\.toggle/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/otherProviders\.message/)).toBeInTheDocument();
    expect(screen.getAllByText(/otherProviders\.notCovered/)).toHaveLength(2);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /snapshot\.providerDetails/ })[1]);
    expect(onDetails).toHaveBeenCalledWith(expect.objectContaining({ letter: 'B' }));
  });

  it('ohne Anbieter: nichts', () => {
    const { container } = render(<OtherProvidersBlock providers={[]} onDetails={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
