import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { resetAgreementGate } from '../../lib/agreementGate';
import { BetaAgreementStepPage } from './BetaAgreementStepPage';

// ─── Schritt nach dem ersten Login (Canvas-Wahl 2A) ──────────────────────────
// Der Text kommt vom Server und steht vor dem Haken; ohne Haken geht es nicht
// weiter, aber ohne Vorwurf; eine veraltete Fassung (409) wird neu geladen
// und benannt statt still untergeschoben.

const { fetchAgreement, acceptAgreement } = vi.hoisted(() => ({ fetchAgreement: vi.fn(), acceptAgreement: vi.fn() }));
vi.mock('../../api/agreements', () => ({
  fetchAgreement: (...a: unknown[]) => fetchAgreement(...a),
  acceptAgreement: (...a: unknown[]) => acceptAgreement(...a),
}));

const points = Array.from({ length: 9 }, (_, i) => ({ lead: `Satz ${i + 1}.`, text: `Erklärung ${i + 1}` }));
const agreement = (version = 'beta-2026-10') => ({ agreement: 'beta', version, language: 'de', title: 'Beta-Vereinbarung', points, effectiveFrom: '2026-10-22' });

function mount(path = '/de/beta-agreement?redirect=/de/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:locale/beta-agreement" element={<BetaAgreementStepPage />} />
        <Route path="/:locale/dashboard" element={<p>DASHBOARD</p>} />
        <Route path="/:locale/results" element={<p>RISK MAP</p>} />
        <Route path="/:locale/login" element={<p>LOGIN</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchAgreement.mockReset().mockResolvedValue(agreement());
  acceptAgreement.mockReset().mockResolvedValue({ version: 'beta-2026-10', language: 'de', acceptedAt: '2026-10-29T14:12:00Z', replay: false });
  resetAgreementGate();
  useAuthStore.setState({ isLoggedIn: true, role: 'user', loading: false });
});

describe('BetaAgreementStepPage', () => {
  it('zeigt das ganze Blatt vom Server im Kasten, ohne Absprung, bevor ein Haken verlangt wird', async () => {
    mount();
    expect(await screen.findByText('Satz 1.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').filter((li) => /^0\d/.test(li.textContent ?? ''))).toHaveLength(9);
    expect(fetchAgreement).toHaveBeenCalledWith('beta', 'de');
    // Festlegung 23.10.2026: kein Link zum Volltext — das ganze Blatt steht im Kasten.
    expect(screen.queryByRole('link', { name: /betaStep.fullText/ })).toBeNull();
  });

  it('ohne Haken: Hinweis am Feld, nichts gespeichert; mit Haken: Annahme mit der gesehenen Fassung, dann weiter zum Ziel', async () => {
    mount();
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('button', { name: /betaStep.cta/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('betaStep.needCheck');
    // Regel V2: ein Feld, keine Zusammenfassung — der Satz haengt am Haken, der Fokus steht dort.
    const box = screen.getByRole('checkbox');
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'beta-check-error');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'beta-check-error');
    expect(acceptAgreement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.cta/ }));
    await waitFor(() => expect(acceptAgreement).toHaveBeenCalledWith('beta', 'beta-2026-10', 'de'));
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument();
  });

  it('409: laedt die neue Fassung, nimmt den Haken zurueck und sagt es', async () => {
    acceptAgreement.mockRejectedValueOnce(new ApiError('outdated', 409, 'c1'));
    fetchAgreement.mockResolvedValueOnce(agreement('beta-2026-09')).mockResolvedValueOnce(agreement('beta-2026-10'));
    mount();
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.cta/ }));
    expect(await screen.findByText(/betaStep.outdated/)).toBeInTheDocument();
    await waitFor(() => expect(fetchAgreement).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByText('DASHBOARD')).toBeNull();
  });

  it('anderer Fehler: bleibt auf der Seite und sagt, dass es nicht am Nutzer liegt', async () => {
    acceptAgreement.mockRejectedValueOnce(new ApiError('boom', 500, 'c2'));
    mount();
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.cta/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('betaStep.failed');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  // 1A + 3B (23.11.2026): Wer ueber die Risk Map kommt, liest "Risk Map" statt
  // "Workspace" und behaelt seine Karte, wenn er ablehnt.
  describe('Ziel Risk Map', () => {
    const path = '/de/beta-agreement?redirect=%2Fde%2Fresults';

    it('Schritt drei und der Knopf nennen die Risk Map', async () => {
      mount(path);
      await screen.findByText('Satz 1.');
      expect(screen.getByText('betaStep.steps.riskMap')).toBeInTheDocument();
      expect(screen.queryByText('betaStep.steps.workspace')).toBeNull();
      expect(screen.getByRole('button', { name: /betaStep.ctaRiskMap/ })).toBeInTheDocument();
    });

    it('nach der Annahme zurueck zur Risk Map', async () => {
      mount(path);
      await screen.findByText('Satz 1.');
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /betaStep.ctaRiskMap/ }));
      expect(await screen.findByText('RISK MAP')).toBeInTheDocument();
    });

    it('„Lieber nicht“: abgemeldet zurueck zur Risk Map, der Hinweis ist vorgemerkt', async () => {
      const logout = vi.fn().mockImplementation(async () => { useAuthStore.setState({ isLoggedIn: false, role: null }); });
      useAuthStore.setState({ logout });
      sessionStorage.clear();
      mount(path);
      await screen.findByText('Satz 1.');
      fireEvent.click(screen.getByRole('button', { name: /betaStep.exit/ }));
      expect(await screen.findByText('RISK MAP')).toBeInTheDocument();
      expect(logout).toHaveBeenCalled();
      expect(sessionStorage.getItem('ch360_beta_declined')).toBe('1');
    });

    it('anderes Ziel: „Lieber nicht“ fuehrt wie bisher zur Anmeldung, ohne Vormerkung', async () => {
      const logout = vi.fn().mockImplementation(async () => { useAuthStore.setState({ isLoggedIn: false, role: null }); });
      useAuthStore.setState({ logout });
      sessionStorage.clear();
      mount();
      await screen.findByText('Satz 1.');
      expect(screen.getByText('betaStep.steps.workspace')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /betaStep.exit/ }));
      expect(await screen.findByText('LOGIN')).toBeInTheDocument();
      expect(sessionStorage.getItem('ch360_beta_declined')).toBeNull();
    });
  });

  it('ohne Login: zur Anmeldung, mit Rueckweg', async () => {
    useAuthStore.setState({ isLoggedIn: false, role: null, loading: false });
    mount();
    expect(await screen.findByText('LOGIN')).toBeInTheDocument();
    expect(fetchAgreement).not.toHaveBeenCalled();
  });
});
