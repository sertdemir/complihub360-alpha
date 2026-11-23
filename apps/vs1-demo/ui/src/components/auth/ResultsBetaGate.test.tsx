import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../store/useAuthStore';
import { resetAgreementGate } from '../../lib/agreementGate';
import { ResultsBetaGate, markBetaDeclined } from './ResultsBetaGate';

// ─── Beta-Vereinbarung vor der Risk Map (1A + 3B, 23.11.2026) ────────────────
// Bis dahin kam ein Konto aus der Schublade per Mail-Link eingeloggt nach
// /results und konnte buchen, ohne das Blatt gesehen zu haben. Die Huelle
// schickt eingeloggte Nutzer ohne geltende Annahme zuerst ueber den Schritt.
// Der Gast bleibt unberuehrt; Anbieter und Admins haben kein Blatt.

const { fetchMyAgreements } = vi.hoisted(() => ({ fetchMyAgreements: vi.fn() }));
vi.mock('../../api/agreements', () => ({ fetchMyAgreements: (...a: unknown[]) => fetchMyAgreements(...a) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const state = (required: boolean) => ({ beta: { agreement: 'beta', currentVersion: 'beta-2026-11', acceptedVersion: required ? null : 'beta-2026-11', acceptedAt: null, language: null, required } });

function Step() {
  const location = useLocation();
  return <p>SCHRITT {location.search}</p>;
}

function mount(entry: string | { pathname: string; state?: unknown } = '/de/results') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/:locale/results" element={<ResultsBetaGate><p>RISK MAP</p></ResultsBetaGate>} />
        <Route path="/:locale/beta-agreement" element={<Step />} />
        <Route path="/:locale/terms" element={<p>BLATT</p>} />
        <Route path="/:locale/login" element={<p>LOGIN</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMyAgreements.mockReset();
  resetAgreementGate();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({ isLoggedIn: false, role: null, loading: false });
});

describe('ResultsBetaGate', () => {
  it('Gast: die Risk Map steht sofort da, nach der Vereinbarung wird nicht gefragt', async () => {
    mount();
    expect(screen.getByText('RISK MAP')).toBeInTheDocument();
    expect(fetchMyAgreements).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('eingeloggt ohne geltende Annahme: erst der Schritt, mit Rueckweg zur Risk Map', async () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'user', loading: false });
    fetchMyAgreements.mockResolvedValue(state(true));
    mount();
    expect(await screen.findByText(/SCHRITT/)).toHaveTextContent('redirect=%2Fde%2Fresults');
    expect(screen.queryByText('RISK MAP')).toBeNull();
  });

  it('das Profil aus dem Wizard ueberlebt den Umweg ueber den Schritt', async () => {
    useAuthStore.setState({ isLoggedIn: true, role: null, loading: false });
    fetchMyAgreements.mockResolvedValue(state(true));
    mount({ pathname: '/de/results', state: { searchProfile: { country: 'DE', markets: ['DE'], categories: ['tax-vat'] } } });
    await screen.findByText(/SCHRITT/);
    expect(JSON.parse(localStorage.getItem('ch360_last_profile') || 'null')).toMatchObject({ markets: ['DE'] });
  });

  it('eingeloggt mit Annahme: die Risk Map', async () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'user', loading: false });
    fetchMyAgreements.mockResolvedValue(state(false));
    mount();
    expect(await screen.findByText('RISK MAP')).toBeInTheDocument();
  });

  it('Anbieter und Admins haben kein Blatt (4C)', async () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'partner', loading: false });
    mount();
    expect(screen.getByText('RISK MAP')).toBeInTheDocument();
    expect(fetchMyAgreements).not.toHaveBeenCalled();
  });

  it('faellt die Abfrage aus, bleibt der Weg offen; die Buchung prueft der Server', async () => {
    useAuthStore.setState({ isLoggedIn: true, role: 'user', loading: false });
    fetchMyAgreements.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByText('RISK MAP')).toBeInTheDocument();
  });

  describe('nach „Lieber nicht“ (3B)', () => {
    it('der Gast sieht seine Risk Map und einen ruhigen Hinweis mit beiden Wegen', async () => {
      markBetaDeclined();
      mount();
      expect(screen.getByText('RISK MAP')).toBeInTheDocument();
      const hinweis = screen.getByRole('status');
      expect(hinweis).toHaveTextContent('betaStep.declined.title');
      expect(hinweis).toHaveTextContent('betaStep.declined.body');
      expect(screen.getByRole('link', { name: 'betaStep.declined.read' })).toHaveAttribute('href', '/de/terms');
      expect(screen.getByRole('link', { name: 'betaStep.declined.signIn' })).toHaveAttribute('href', '/de/login?redirect=%2Fde%2Fresults');
    });

    it('der Hinweis laesst sich schliessen und kommt dann nicht wieder', async () => {
      markBetaDeclined();
      const { unmount } = mount();
      fireEvent.click(screen.getByRole('button', { name: 'betaStep.declined.close' }));
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
      unmount();
      mount();
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('ohne Ablehnung gibt es keinen Hinweis', () => {
      mount();
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
