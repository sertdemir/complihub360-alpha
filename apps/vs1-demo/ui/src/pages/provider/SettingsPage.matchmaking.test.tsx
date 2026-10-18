import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchmakingPanel } from './SettingsPage';

// ─── Settings · Matchmaking-Profil ───────────────────────────────────────────
// Bis 09.10.2026 startete das Panel mit Beispielwerten (Norditalien, 2015,
// drei Preiszeilen) und meldete „Gespeichert", auch wenn das Speichern
// scheiterte. Wer speicherte, schrieb die Beispiele in sein oeffentliches
// Profil. Hier: gespeicherter Stand rein, Fehler raus, nichts dazwischen.

const { fetchCoverage, updateMatchmakingProfile } = vi.hoisted(() => ({
  fetchCoverage: vi.fn(),
  updateMatchmakingProfile: vi.fn(),
}));

vi.mock('../../api/provider', () => ({
  fetchCoverage: () => fetchCoverage(),
  updateMatchmakingProfile: (...a: unknown[]) => updateMatchmakingProfile(...a),
}));
vi.mock('../../api/client', () => ({ identityHintFrom: () => null, identityFindingsOf: () => null }));
// t() gibt den Schluessel zurueck: geprueft wird die Verdrahtung, nicht die Copy.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}));

const SAVED = {
  provider_key: 'k', name: 'n', countries_supported: [], languages: [], sla_target_confirm_hours: 24,
  billing_model: 'hourly', region: 'Rheinland', active_since: 2011,
  pricing_table: [{ service: 'OSS-Registrierung', price: 'ab 450 €' }],
};

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
const saveButton = () => screen.getByRole('button', { name: 'settings.matchmakingSave' });

describe('MatchmakingPanel', () => {
  beforeEach(() => {
    fetchCoverage.mockReset();
    updateMatchmakingProfile.mockReset();
  });

  it('zeigt den gespeicherten Stand, keine Beispielwerte', async () => {
    fetchCoverage.mockResolvedValue(SAVED);
    render(<MatchmakingPanel />);
    expect(await screen.findByDisplayValue('Rheinland')).toBeInTheDocument();
    // Punkt 3 (O2): das Jahr steht nur zur Ansicht da, kein Eingabefeld mehr.
    expect(screen.getByText('2011')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('2011')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('OSS-Registrierung')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Norditalien')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/VAT-Erstregistrierung/)).not.toBeInTheDocument();
  });

  it('sperrt Speichern, solange der gespeicherte Stand nicht geladen ist', async () => {
    fetchCoverage.mockRejectedValue(new Error('down'));
    render(<MatchmakingPanel />);
    await waitFor(() => expect(fetchCoverage).toHaveBeenCalled());
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByDisplayValue('Norditalien')).not.toBeInTheDocument();
    // E2 (TKT-PROV-12): der gesperrte Knopf sagt, warum.
    expect(await screen.findByText('common:states.partner.profileUnavailable')).toBeInTheDocument();
  });

  it('meldet einen gescheiterten Speichervorgang statt „Gespeichert"', async () => {
    fetchCoverage.mockResolvedValue(SAVED);
    updateMatchmakingProfile.mockRejectedValue(new Error('500'));
    render(<MatchmakingPanel />);
    await screen.findByDisplayValue('Rheinland');
    fireEvent.click(saveButton());
    expect(await screen.findByText('application.saveError')).toBeInTheDocument();
    expect(screen.queryByText('settings.matchmakingSaved')).not.toBeInTheDocument();
  });

  it('meldet „Gespeichert" nach erfolgreichem Speichern und schickt den geladenen Stand', async () => {
    fetchCoverage.mockResolvedValue(SAVED);
    updateMatchmakingProfile.mockResolvedValue(undefined);
    render(<MatchmakingPanel />);
    await screen.findByDisplayValue('Rheinland');
    fireEvent.click(saveButton());
    expect(await screen.findByText('settings.matchmakingSaved')).toBeInTheDocument();
    expect(updateMatchmakingProfile).toHaveBeenCalledWith(expect.objectContaining({
      billing_model: 'hourly', region: 'Rheinland', pricing_table: SAVED.pricing_table,
    }));
    // Punkt 3: das Jahr laeuft ueber die Bewerbung, nicht ueber dieses Profil.
    expect(updateMatchmakingProfile.mock.calls[0][0]).not.toHaveProperty('active_since');
  });

  it('„Aktiv seit" nur zur Ansicht, mit Weg zur Bewerbung und dem Jahr in der Vorschau (Punkt 3: O2, S1)', async () => {
    fetchCoverage.mockResolvedValue(SAVED);
    render(<MatchmakingPanel />);
    await screen.findByDisplayValue('Rheinland');
    expect(screen.getByRole('button', { name: 'settings.changeViaApplication' })).toBeInTheDocument();
    expect(screen.getByText('settings.activeSinceReadonly')).toBeInTheDocument();
    expect(screen.getByText(/settings\.previewAreas · Rheinland · settings\.previewActiveSince/)).toBeInTheDocument();
  });

  it('ohne Jahr: „nicht angezeigt" statt einer leeren Stelle, die Vorschau ohne Jahr', async () => {
    fetchCoverage.mockResolvedValue({ ...SAVED, active_since: null });
    render(<MatchmakingPanel />);
    await screen.findByDisplayValue('Rheinland');
    expect(screen.getByText('settings.activeSinceNone')).toBeInTheDocument();
    expect(screen.getByText('settings.previewAreas · Rheinland')).toBeInTheDocument();
  });
});
