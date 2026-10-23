import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OutsideFitProviders, type OutsideProvider } from './OutsideFitProviders';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? opts.defaultValue
        : opts ? `${key}:${Object.values(opts).join('|')}` : key,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

const provider = (over: Partial<OutsideProvider>): OutsideProvider => ({
  public_ref: 'aaaaaaaaaaaa', title: 'Verified Provider A', letter: 'A', descriptor: 'Data and Privacy · Berlin',
  area_codes: ['data-privacy'], region: 'Berlin', active_since: 2015, specializations: [], languages: ['de'],
  rating: null, completed_count: null, avg_response_hours: null, billing_model: 'project', is_verified: true,
  ...over,
});

// ─── F2 · Canvas-Wahl A (23.10.2026) ─────────────────────────────────────────
describe('OutsideFitProviders', () => {
  const providers = [
    provider({}),
    provider({ public_ref: 'bbbbbbbbbbbb', title: 'Verified Provider B', letter: 'B', descriptor: 'Product Compliance · Hamburg', area_codes: ['product-compliance'] }),
  ];

  it('starts collapsed and names the market, the count and what is not covered', () => {
    render(<OutsideFitProviders providers={providers} requested={['tax-vat']} market="DE" />);
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle).toHaveTextContent('outside.title:Germany');
    expect(toggle).toHaveTextContent('2');
    expect(toggle).toHaveTextContent('outside.sub:Tax & VAT');
    expect(screen.queryByText('Verified Provider A')).not.toBeInTheDocument();
  });

  it('shows the providers without a match score once opened', () => {
    render(<OutsideFitProviders providers={providers} requested={['tax-vat']} market="DE" />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Verified Provider A')).toBeInTheDocument();
    expect(screen.getByText('Verified Provider B')).toBeInTheDocument();
    expect(screen.getAllByText('outside.notCovered:Tax & VAT')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/%|match/i);
  });

  it('offers no profile link to guests and never a booking', () => {
    render(<OutsideFitProviders providers={providers} requested={['tax-vat']} market="DE" />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.queryByRole('button', { name: /outside\.viewProfile/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /book/i })).not.toBeInTheDocument();
  });

  it('with an account: "View profile" hands over the provider reference', () => {
    const onView = vi.fn();
    render(<OutsideFitProviders providers={providers} requested={['tax-vat']} market="DE" onViewProfile={onView} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('button', { name: 'outside.viewProfile: Verified Provider B' }));
    expect(onView).toHaveBeenCalledWith('bbbbbbbbbbbb');
  });

  it('renders nothing without providers', () => {
    const { container } = render(<OutsideFitProviders providers={[]} requested={['tax-vat']} market="DE" />);
    expect(container).toBeEmptyDOMElement();
  });
});
