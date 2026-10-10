import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';

// ─── Phase 6 · Übersicht (1B „Heute zuerst") ─────────────────────────────────
// Oben die eine Sache, die heute eine Handlung braucht — oder „Nichts offen".
// Keine Fixture: was der Server nicht liefert, steht nicht da.

const api = vi.hoisted(() => ({ fetchOverview: vi.fn() }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/performance', async (orig) => ({ ...(await orig<typeof import('../../api/performance')>()), fetchOverview: () => api.fetchOverview() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o && 'count' in o ? `${k}:${String(o.count)}` : k), i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { OverviewPage } from './OverviewPage';
import { ApiError } from '../../api/client';

const page = () => render(<MemoryRouter><OverviewPage /></MemoryRouter>);
const base = () => ({
  ok: true, providerKey: 'k',
  status: { lifecycle: 'active', verified: true, billing_ready: true, billing_block_reasons: [], availability: 'available', ooo_until: null, booking_open: true, booking_closed_reason: null, calendar_connected: true },
  plan: { code: 'growth', label: 'Growth', analytics_level: 'enhanced', cadence: 'monthly', discount: { pct: 10, count: 3, used: 2, remaining: 1, cycle_start: '2026-10-01' } },
  leads: { count: 3, final_cents: 40230, currency: 'USD', cycle_start: '2026-10-01' },
  credit_balance_cents: 4023, upcoming: [], report_open: 0, disputes_open: 0, expiring_evidence: [], enforcement: null, tasks: [],
});


describe('Übersicht', () => {
  it('ohne Aufgaben: „Nichts offen", Konto-Fakten aus der Antwort', async () => {
    api.fetchOverview.mockResolvedValue(base());
    page();
    expect(await screen.findByText('overview.nothingOpen')).toBeInTheDocument();
    expect(screen.getByText('overview.discountUsed:3')).toBeInTheDocument();
    expect(screen.getByText(/\$402\.30/)).toBeInTheDocument();
    expect(screen.getByText(/\$40\.23/)).toBeInTheDocument();
    expect(screen.getByText('overview.upcomingEmpty')).toBeInTheDocument();
  });

  it('mit Aufgaben: die erste steht oben als Karte mit Sprungziel, die weiteren darunter', async () => {
    api.fetchOverview.mockResolvedValue({ ...base(), report_open: 1, tasks: [
      { kind: 'attendance_report', count: 1, to: 'termine' },
      { kind: 'evidence_expiring', evidence_type: 'Haftpflicht', expires_at: '2026-10-30T00:00:00Z', to: 'verification' },
    ] });
    const { container } = page();
    expect(await screen.findByText('overview.task.attendance_report:1')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-task]')).toHaveLength(2);
    expect(screen.getByText('overview.go.termine')).toBeInTheDocument();
    expect(screen.getByText('overview.go.verification')).toBeInTheDocument();
    expect(screen.queryByText('overview.nothingOpen')).not.toBeInTheDocument();
  });

  it('Buchungspause: Buchbar „Nein" mit Grund, Sichtbarkeit bleibt eine Zeile darueber', async () => {
    api.fetchOverview.mockResolvedValue({ ...base(), status: { ...base().status, booking_open: false, booking_closed_reason: 'paused' } });
    page();
    expect(await screen.findByText('overview.closedPaused')).toBeInTheDocument();
    expect(screen.getByText('overview.no')).toBeInTheDocument();
  });

  it('Abruf scheitert: A2, keine Fixture', async () => {
    // Lazy ablehnen: vitest 4 meldet die Ablehnung von mockRejectedValue hier als
    // unbehandelt, obwohl useWorkspaceData sie faengt.
    api.fetchOverview.mockImplementation(() => Promise.reject(new ApiError('down', 500, 'ref-1')));
    page();
    expect(await screen.findByText('states.partner.loadFailed.overview')).toBeInTheDocument();
    expect(screen.queryByText(/Schmidt/)).not.toBeInTheDocument();
  });
});
