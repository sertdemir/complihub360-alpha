import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

// ─── TKT-PROV-12 · Partner-Arbeitsbereich ohne Fixtures ──────────────────────
// Leer heisst B3, Fehler heisst A2, unter fuenf Anfragen keine Quote. Die
// Gegenprobe ist die Fixture selbst: ihre Firmennamen und Zahlen duerfen auf
// keinem Weg erscheinen (Acme GmbH, Brunnen Living Ltd., 87 %, #3).

const api = vi.hoisted(() => ({
  fetchProviderBookings: vi.fn(),
  fetchMetrics: vi.fn(),
  fetchApplication: vi.fn(),
  fetchSubscription: vi.fn(),
  fetchVerification: vi.fn(),
  fetchCoverage: vi.fn(),
}));

vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/bookings', () => ({
  fetchProviderBookings: () => api.fetchProviderBookings(),
  reportProposal: vi.fn(), submitReview: vi.fn(),
}));
vi.mock('../../api/metrics', async (orig) => ({ ...(await orig<typeof import('../../api/metrics')>()), fetchMetrics: () => api.fetchMetrics() }));
vi.mock('../../api/application', () => ({ fetchApplication: () => api.fetchApplication(), fetchVerification: () => api.fetchVerification() }));
vi.mock('../../api/subscription', () => ({ fetchSubscription: () => api.fetchSubscription() }));
vi.mock('../../api/provider', () => ({ fetchCoverage: () => api.fetchCoverage() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { LeadsPage } from './LeadsPage';
import { PerformancePage } from './PerformancePage';
import { CoveragePage, cellView } from './CoveragePage';
import { ApiError } from '../../api/client';

const page = (el: ReactNode) => render(<MemoryRouter>{el}</MemoryRouter>);
const FIXTURE_TRACES = [/Acme GmbH/, /Brunnen Living/, /87%/, /#3/, /Schmidt & Partner/];
const noFixture = () => { for (const re of FIXTURE_TRACES) expect(screen.queryByText(re)).not.toBeInTheDocument(); };

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.fetchApplication.mockRejectedValue(new Error('not needed'));
  api.fetchSubscription.mockRejectedValue(new Error('not needed'));
});

describe('Termine (LeadsPage)', () => {
  it('keine Termine: B3 statt erfundener Termine', async () => {
    api.fetchProviderBookings.mockResolvedValue([]);
    page(<LeadsPage />);
    expect(await screen.findByText('states.partner.empty.appointments')).toBeInTheDocument();
    noFixture();
  });

  it('Abruf scheitert: A2 mit Weg zum Support, keine Fixture', async () => {
    api.fetchProviderBookings.mockRejectedValue(new ApiError('down', 500, 'ref-9'));
    page(<LeadsPage />);
    expect(await screen.findByText('states.partner.loadFailed.appointments')).toBeInTheDocument();
    expect(screen.getByText('states.actions.contactSupport')).toBeInTheDocument();
    noFixture();
  });
});

describe('Performance (C3)', () => {
  const m = (total: number) => ({ total, confirm_rate: 0.5, reply_rate: 0.5, sla_breach_rate: 0.5, avg_confirm_ms: 3_600_000, avg_reply_ms: 3_600_000 });

  it('unter fuenf Anfragen: echte Zahl, Quoten als Strich', async () => {
    api.fetchMetrics.mockResolvedValue(m(2));
    const { container } = page(<PerformancePage />);
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(5);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.getByText('common:states.partner.performance.thresholdNote')).toBeInTheDocument();
    noFixture();
  });

  it('ab fuenf Anfragen: die Quoten stehen da', async () => {
    api.fetchMetrics.mockResolvedValue(m(5));
    const { container } = page(<PerformancePage />);
    await waitFor(() => expect(screen.getAllByText('50%').length).toBeGreaterThan(0));
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
  });

  it('Abruf scheitert: A2', async () => {
    api.fetchMetrics.mockRejectedValue(new Error('down'));
    page(<PerformancePage />);
    expect(await screen.findByText('states.partner.loadFailed.performance')).toBeInTheDocument();
    noFixture();
  });
});

describe('Abdeckung (D1)', () => {
  it('cellView: freigegeben, in Pruefung, nicht beantragt, sonst Strich', () => {
    expect(cellView('approved')?.key).toBe('approved');
    expect(cellView('limited')?.key).toBe('approved');
    expect(cellView('pending')?.key).toBe('underReview');
    expect(cellView(undefined)?.key).toBe('notRequested');
    expect(cellView('rejected')).toBeNull();
  });

  it('zeigt die Freigabematrix, keinen erfundenen Markt und kein „Markt hinzufuegen"', async () => {
    api.fetchVerification.mockResolvedValue({
      lifecycle: { status: 'active', since: null, reason: null, reverification_due_at: null, grace_until: null },
      matrix: [{ service_id: 's1', service_code: 'tax-vat', service_name: 'USt-Voranmeldung', status: 'approved', cells: [
        { coverage_id: 'c', country_code: 'DE', jurisdiction_code: null, status: 'approved', limitations: null, approved_at: null, expires_at: null },
      ] }],
      checklist: [], open_requests: [], history: [],
    });
    api.fetchCoverage.mockResolvedValue({ provider_key: 'k', name: 'n', countries_supported: ['DE', 'NL'], languages: ['DE'], sla_target_confirm_hours: 24 });
    const { container } = page(<CoveragePage />);
    expect(await screen.findByText('USt-Voranmeldung')).toBeInTheDocument();
    expect(container.querySelector('[data-cell="tax-vat:DE"]')?.textContent).toBe('common:states.partner.coverage.approved');
    // NL steht in countries_supported, aber nicht in der Freigabe — also nicht in der Matrix.
    expect(container.querySelector('[data-cell="tax-vat:NL"]')).toBeNull();
    expect(screen.queryByText(/addMarket/)).not.toBeInTheDocument();
    expect(screen.queryByText(/rankBanner/)).not.toBeInTheDocument();
  });
});
