import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ObligationClusters, settledByWizard, type ClusterRow } from './ObligationClusters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.count === 'number' ? `${key}#${opts.count}` : key,
  }),
}));

const row = (over: Partial<ClusterRow>): ClusterRow => ({
  title: 'Row', severity: 'high', market: 'DE', due: 'ongoing', dueSub: '',
  evidence: 'likely', supports: [], decides: [], ...over,
});

// ─── F1 · Canvas 1C · 2B · 4A (23.10.2026) ───────────────────────────────────
describe('ObligationClusters', () => {
  const rows = [
    row({ title: 'Privacy', evidence: 'confirmed', supports: ['online_sales', 'consumer_sales', 'eu_market'] }),
    row({ title: 'VAT', evidence: 'likely', supports: ['online_sales'], decides: ['establishment'] }),
    row({ title: 'WEEE', evidence: 'open', decides: ['electronics'] }),
  ];

  it('orders the cards by evidence and keeps the open one collapsed', () => {
    render(<ObligationClusters rows={rows} />);
    const toggles = screen.getAllByRole('button', { expanded: true }).concat(screen.getAllByRole('button', { expanded: false }));
    expect(toggles.length).toBeGreaterThan(0);
    expect(screen.getByTestId('cluster-confirmed')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.queryByText('WEEE')).not.toBeInTheDocument();
    const openCard = screen.getByTestId('cluster-open');
    fireEvent.click(within(openCard).getByRole('button', { name: /clusters\.open\.title/ }));
    expect(screen.getByText('WEEE')).toBeInTheDocument();
  });

  it('leaves out a stage without obligations', () => {
    render(<ObligationClusters rows={[rows[1]]} />);
    expect(screen.queryByTestId('cluster-confirmed')).not.toBeInTheDocument();
    expect(screen.getByTestId('cluster-likely')).toBeInTheDocument();
  });

  it('explains what supports a duty and what still decides (2B)', () => {
    render(<ObligationClusters rows={rows} />);
    const vat = screen.getByText('VAT').closest('[data-testid="obligation-row"]') as HTMLElement;
    const toggle = within(vat).getByRole('button', { name: /why\.toggle/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(vat).getByText(/why\.fact\.online_sales/)).toBeInTheDocument();
    expect(within(vat).getByText(/why\.ask\.establishment/)).toBeInTheDocument();
  });

  it('says plainly when only the chosen area put a duty on the map', () => {
    const area = row({ title: 'EPR', evidence: 'open', supports: ['eu_market'], decides: ['physical_goods'] });
    render(<ObligationClusters rows={[area]} />);
    fireEvent.click(screen.getByRole('button', { name: /why\.toggle/ }));
    expect(screen.getByText('why.onlyArea')).toBeInTheDocument();
  });

  it('counts only what an answer in today\'s wizard can settle (5B)', () => {
    expect(settledByWizard(rows)).toBe(0);
    expect(settledByWizard([row({ evidence: 'open', decides: ['consumer_sales', 'physical_goods'] }), row({ evidence: 'open', decides: ['electronics'] })])).toBe(1);
  });

  // 24.10.2026 (nach D1): der volle Wizard klaert mehr — aber nur, was der
  // Knopf erreicht, und gezaehlt wird die eine Antwort, die am meisten klaert.
  const physical = row({ evidence: 'likely', decides: ['physical_goods'] });
  const weee = row({ evidence: 'open', decides: ['electronics'] });
  const battery = row({ evidence: 'open', decides: ['batteries'] });
  const seat = row({ evidence: 'open', decides: ['established_in_market'] });
  const consumer = row({ evidence: 'likely', decides: ['consumer_sales'] });

  it('the answers drawer (saved risk map) keeps today\'s set', () => {
    expect(settledByWizard([physical, weee, seat, consumer], { fullWizard: false, profile: { categories: ['product-packaging'] } })).toBe(1);
  });

  it('the full wizard settles offering, seat and EPR facts', () => {
    const profile = { categories: ['product-packaging'] };
    expect(settledByWizard([physical], { fullWizard: true, profile })).toBe(1);
    expect(settledByWizard([seat], { fullWizard: true, profile })).toBe(1);
    // Elektronik und Batterien sind EINE Frage (EPR 1/2): beide zaehlen zusammen.
    expect(settledByWizard([weee, battery, physical], { fullWizard: true, profile })).toBe(2);
  });

  it('counts the best single answer, never the sum over questions', () => {
    expect(settledByWizard([physical, seat, consumer], { fullWizard: true, profile: {} })).toBe(1);
  });

  it('EPR facts only count when the wizard asks them (EPR & Packaging chosen)', () => {
    expect(settledByWizard([weee, battery], { fullWizard: true, profile: { categories: ['environment'] } })).toBe(0);
  });

  it('an answered seat is not promised again', () => {
    expect(settledByWizard([seat], { fullWizard: true, profile: { details: { establishment: ['DE'] } } })).toBe(0);
  });
});

describe('ObligationClusters · only open duties', () => {
  it('opens the card when it is the only one, so the page is never blank', () => {
    render(<ObligationClusters rows={[row({ title: 'WEEE', evidence: 'open' })]} />);
    expect(screen.getByText('WEEE')).toBeInTheDocument();
  });
});

// ─── Variante 1 (25.10.2026): Bereiche, die die Engine auffuellt ─────────────
describe('ObligationClusters · outside the chosen areas', () => {
  it('tags the row and does not claim the user chose the area', () => {
    render(<ObligationClusters rows={[
      row({ title: 'Privacy', evidence: 'likely', outside: true }),
      row({ title: 'VAT', evidence: 'likely' }),
    ]} />);
    const privacy = screen.getByText('Privacy').closest('[data-testid="obligation-row"]') as HTMLElement;
    const vat = screen.getByText('VAT').closest('[data-testid="obligation-row"]') as HTMLElement;
    expect(within(privacy).getByText('outsideTag')).toBeInTheDocument();
    expect(within(vat).queryByText('outsideTag')).not.toBeInTheDocument();
    fireEvent.click(within(privacy).getByRole('button', { name: /why\.toggle/ }));
    expect(within(privacy).getByText('why.outside')).toBeInTheDocument();
    expect(within(privacy).getByText('why.nothingYet')).toBeInTheDocument();
    expect(within(privacy).queryByText('why.onlyArea')).not.toBeInTheDocument();
    fireEvent.click(within(vat).getByRole('button', { name: /why\.toggle/ }));
    expect(within(vat).getByText('why.onlyArea')).toBeInTheDocument();
  });
});
