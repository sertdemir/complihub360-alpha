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
});

describe('ObligationClusters · only open duties', () => {
  it('opens the card when it is the only one, so the page is never blank', () => {
    render(<ObligationClusters rows={[row({ title: 'WEEE', evidence: 'open' })]} />);
    expect(screen.getByText('WEEE')).toBeInTheDocument();
  });
});
