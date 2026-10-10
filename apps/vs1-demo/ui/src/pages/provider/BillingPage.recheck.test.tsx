import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { BillingPage } from './BillingPage';

// ─── ADR-0008 A2 · Canvas-Wahl A V2 / B V1 ───────────────────────────────────
// Bei payment_failed zwei Wege; das Ergebnis der Pruefung steht als Zeile
// unter dem Knopf, eine Bestaetigung macht den Kasten gruen.

const { recheck, BLOCKED } = vi.hoisted(() => ({
  recheck: vi.fn(),
  BLOCKED: { ready: false, reasons: ['payment_failed'], synced_at: '2026-10-10T08:00:00Z', payment_method: 'Visa ····4242' },
}));

vi.mock('../../api/billing', async (orig) => ({
  ...(await orig<typeof import('../../api/billing')>()),
  fetchInvoices: vi.fn().mockResolvedValue([]),
  fetchBillingPreview: vi.fn().mockResolvedValue({ readiness: BLOCKED, currency: 'USD', period: '2026-10', total_cents: 0, lines: [], leads: { count: 0, standard_cents: 0, discount_cents: 0, final_cents: 0 }, discount: { count: 0, pct: 0, remaining: 0 }, subscription: null }),
  syncBillingReadiness: vi.fn().mockResolvedValue(BLOCKED),
  recheckPaymentMethod: (...a: unknown[]) => recheck(...a),
}));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

const renderPage = () => render(<MemoryRouter><BillingPage /></MemoryRouter>);

describe('BillingPage · Karte erneut pruefen', () => {
  beforeEach(() => { recheck.mockReset(); });

  it('zeigt bei payment_failed beide Wege statt der alten Knoepfe', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'billing.recheck.sameCta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'billing.recheck.otherCta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'billing.checkNow' })).not.toBeInTheDocument();
    expect(screen.getByText('billing.recheck.note')).toBeInTheDocument();
  });

  it('abgelehnt: die Antwort steht unter dem Knopf, der Kasten bleibt', async () => {
    recheck.mockResolvedValue({ kind: 'declined' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'billing.recheck.sameCta' }));
    expect(await screen.findByText('billing.recheck.declined')).toBeInTheDocument();
    expect(screen.getByText('billing.blockedTitle')).toBeInTheDocument();
  });

  it('bestaetigt: der Kasten wird gruen und sagt es', async () => {
    recheck.mockResolvedValue({ kind: 'cleared', readiness: { ...BLOCKED, ready: true, reasons: [] } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'billing.recheck.sameCta' }));
    await waitFor(() => expect(screen.getByText('billing.readyTitle')).toBeInTheDocument());
    expect(screen.getByText('billing.recheck.cleared')).toBeInTheDocument();
  });

  it('Tageslimit: nennt, ab wann die naechste Pruefung geht', async () => {
    recheck.mockResolvedValue({ kind: 'rate_limited', retryAfter: '2026-10-11T12:20:00Z' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'billing.recheck.sameCta' }));
    expect(await screen.findByText('billing.recheck.rateLimited')).toBeInTheDocument();
  });
});
