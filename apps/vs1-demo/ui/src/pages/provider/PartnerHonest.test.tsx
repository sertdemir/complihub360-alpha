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
  fetchPerformance: vi.fn(),
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
vi.mock('../../api/performance', async (orig) => ({ ...(await orig<typeof import('../../api/performance')>()), fetchPerformance: () => api.fetchPerformance() }));
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

describe('Performance (Phase 6, 2A)', () => {
  // Buchungs-Fakten statt Pipeline-Quoten: unter fuenf Buchungen keine Quote,
  // ab fuenf steht sie — und nie ein Score, nie ein Rang.
  const counted = (count: number, of: number) => ({ count, of, rate: of >= 5 ? count / of : null });
  const perf = (bookings: number) => ({
    ok: true, providerKey: 'k',
    performance: {
      policy_version: 1, window_days: 90, from: '', to: '', bookings, rate_min_bookings: 5, rates_shown: bookings >= 5,
      attended: counted(Math.max(0, bookings - 1), bookings), user_no_show: counted(1, bookings), provider_no_show: counted(0, bookings),
      cancelled_by_provider: counted(0, bookings), cancelled_by_user: counted(0, bookings), disputes_open: 0,
      incidents: { count: 0, window_days: 90, alert_at: 2, pause_at: 3 }, rating: { average: null, count: 1, min_count: 5 },
      would_use_again: counted(1, 1), upcoming: 0,
    },
    analytics: { level: 'basic', trends: false, export: false }, enforcement: null,
  });

  it('unter fuenf Buchungen: Zaehler stehen, Quoten als Strich mit Stichprobe', async () => {
    api.fetchPerformance.mockResolvedValue(perf(2));
    const { container } = page(<PerformancePage />);
    expect(await screen.findByText('1 performance.of 2')).toBeInTheDocument();
    // Stattgefunden, Bewertung, Wieder buchen — drei Karten ohne Quote.
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(3);
    expect(screen.queryByText(/50 %/)).not.toBeInTheDocument();
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
    noFixture();
  });

  it('ab fuenf Buchungen: die Quote steht an der Zahl', async () => {
    api.fetchPerformance.mockResolvedValue(perf(5));
    const { container } = page(<PerformancePage />);
    await waitFor(() => expect(screen.getByText(/80 %/)).toBeInTheDocument());
    expect(container.querySelector('[data-fact="performance.fact.attended"][data-pending="true"]')).toBeNull();
  });

  it('Essential: Verlauf gesperrt heisst erklaert, nicht leer; kein CSV', async () => {
    api.fetchPerformance.mockResolvedValue(perf(5));
    page(<PerformancePage />);
    expect(await screen.findByText('performance.trendsLocked')).toBeInTheDocument();
    expect(screen.getByText('performance.csvLocked')).toBeInTheDocument();
    expect(screen.getByText('performance.rankingNote')).toBeInTheDocument();
  });

  it('Abruf scheitert: A2', async () => {
    api.fetchPerformance.mockRejectedValue(new Error('down'));
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
