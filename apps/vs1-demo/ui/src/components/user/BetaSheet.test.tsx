import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/client';
import { BookingFailureCard } from './BookingAcknowledgement';
import { BetaSheetBody, BetaSheetFooter, useBetaSheet } from './BetaSheet';

// ─── Das Netz hinter dem Gate (4A, 23.11.2026) ───────────────────────────────
// Lehnt der Server eine Buchung ab, weil die Beta-Vereinbarung fehlt, nennt
// die Karte den Grund und fuehrt zum Blatt. Das Blatt steht ganz im Kasten
// (Festlegung 23.10.2026), ohne Haken geht es nicht weiter, und eine
// veraltete Fassung wird benannt statt still untergeschoben.

const { fetchAgreement, acceptAgreement } = vi.hoisted(() => ({ fetchAgreement: vi.fn(), acceptAgreement: vi.fn() }));
vi.mock('../../api/agreements', () => ({
  fetchAgreement: (...a: unknown[]) => fetchAgreement(...a),
  acceptAgreement: (...a: unknown[]) => acceptAgreement(...a),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de' } }),
}));

const points = Array.from({ length: 10 }, (_, i) => ({ lead: `Satz ${i + 1}.`, text: `Erklärung ${i + 1}` }));
const agreement = (version = 'beta-2026-11') => ({ agreement: 'beta', version, language: 'de', title: 'Beta-Vereinbarung', points, effectiveFrom: '2026-11-23' });

function Sheet({ onAccepted }: { onAccepted: () => void }) {
  const sheet = useBetaSheet('de', true);
  return (<><BetaSheetBody sheet={sheet} /><BetaSheetFooter sheet={sheet} onAccepted={onAccepted} /></>);
}

beforeEach(() => {
  fetchAgreement.mockReset().mockResolvedValue(agreement());
  acceptAgreement.mockReset().mockResolvedValue({ version: 'beta-2026-11', language: 'de', acceptedAt: '2026-11-23T19:00:00Z', replay: false });
});

describe('BookingFailureCard · Beta-Vereinbarung fehlt', () => {
  const noop = () => {};
  const failure = { kind: 'agreement_required', currentVersion: 'beta-2026-11' } as const;

  it('nennt den Grund, sagt was NICHT passiert ist, und fuehrt zum Blatt', () => {
    const onReadAgreement = vi.fn();
    render(<MemoryRouter><BookingFailureCard failure={failure} onRetry={noop} onReread={noop} onPickSlot={noop} onReadAgreement={onReadAgreement} /></MemoryRouter>);
    const karte = screen.getByRole('status');
    expect(karte).toHaveTextContent('schedule.fail.agreement_required.title');
    expect(karte).toHaveTextContent('schedule.fail.list.noBooking');
    expect(karte).toHaveTextContent('schedule.fail.list.nothingShared');
    expect(karte).toHaveTextContent('schedule.fail.list.kept');
    fireEvent.click(screen.getByRole('button', { name: 'schedule.fail.readAgreement' }));
    expect(onReadAgreement).toHaveBeenCalledTimes(1);
  });

  it('ohne eigenen Handler (eigene Seite): zum Schritt, mit Rueckweg hierher', async () => {
    function Step() { return <p>SCHRITT {useLocation().search}</p>; }
    render(
      <MemoryRouter initialEntries={['/de/p/a1b2c3d4e5f6/schedule']}>
        <Routes>
          <Route path="/:locale/p/:ref/schedule" element={<BookingFailureCard failure={failure} onRetry={noop} onReread={noop} onPickSlot={noop} />} />
          <Route path="/:locale/beta-agreement" element={<Step />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'schedule.fail.readAgreement' }));
    expect(await screen.findByText(/SCHRITT/)).toHaveTextContent('redirect=%2Fde%2Fp%2Fa1b2c3d4e5f6%2Fschedule');
  });
});

describe('Das Blatt in der Schublade', () => {
  it('zeigt das ganze Blatt und sagt ehrlich, dass nichts gebucht und nichts reserviert ist', async () => {
    render(<Sheet onAccepted={() => {}} />);
    expect(await screen.findByText('Satz 10.')).toBeInTheDocument();
    expect(screen.getByTestId('beta-points').querySelectorAll('li')).toHaveLength(10);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('betaStep.drawer.noteLead');
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('betaStep.drawer.note');
  });

  it('ohne Haken: Hinweis am Feld, nichts gespeichert', async () => {
    const onAccepted = vi.fn();
    render(<Sheet onAccepted={onAccepted} />);
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('button', { name: /betaStep.drawer.cta/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('betaStep.needCheck');
    expect(acceptAgreement).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('mit Haken: Annahme mit der gesehenen Fassung, erst dann zurueck in die Buchung', async () => {
    const onAccepted = vi.fn();
    render(<Sheet onAccepted={onAccepted} />);
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.drawer.cta/ }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
    expect(acceptAgreement).toHaveBeenCalledWith('beta', 'beta-2026-11', 'de');
  });

  it('neue Fassung waehrend des Lesens (409): benannt, Haken zurueck, kein Weiter', async () => {
    const onAccepted = vi.fn();
    acceptAgreement.mockRejectedValueOnce(new ApiError('outdated', 409, 'corr-1', undefined, { errorCode: 'AGREEMENT_OUTDATED' }));
    fetchAgreement.mockResolvedValueOnce(agreement('beta-2026-11')).mockResolvedValueOnce(agreement('beta-2026-12'));
    render(<Sheet onAccepted={onAccepted} />);
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.drawer.cta/ }));
    expect(await screen.findByText('betaStep.outdated')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('Speichern scheitert: es liegt nicht am Nutzer, der Haken bleibt, kein Weiter', async () => {
    const onAccepted = vi.fn();
    acceptAgreement.mockRejectedValueOnce(new Error('offline'));
    render(<Sheet onAccepted={onAccepted} />);
    await screen.findByText('Satz 1.');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /betaStep.drawer.cta/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('betaStep.failed');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(onAccepted).not.toHaveBeenCalled();
  });
});
