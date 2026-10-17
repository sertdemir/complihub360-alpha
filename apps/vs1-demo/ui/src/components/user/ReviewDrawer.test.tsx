import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewDrawer } from './ReviewDrawer';
import { ApiError } from '../../api/client';

// ─── Bewertung · ehrliche Zustaende (Punkt 1, Canvas R3 · S2 · E1, 15.10.2026) ─
// Vorher stand „✓ Submitted“ da, bevor der Server antwortete, und der Termin
// galt als bewertet, auch wenn das Speichern scheiterte. Diese Tests halten:
// Erfolg erst nach der Antwort, Fehler bleibt sichtbar samt Eingaben, die zwei
// 409 sind ein Hinweis statt eines Fehlers.

const { submitReview } = vi.hoisted(() => ({ submitReview: vi.fn() }));

vi.mock('../../api/bookings', async (orig) => ({
  ...(await orig<typeof import('../../api/bookings')>()),
  submitReview: (...a: unknown[]) => submitReview(...a),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const TARGET = { bookingId: 'b-1', providerName: 'Meridian Tax Advisors' };

function setup() {
  const onClose = vi.fn();
  const onSubmitted = vi.fn();
  render(<ReviewDrawer target={TARGET} onClose={onClose} onSubmitted={onSubmitted} />);
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  fireEvent.change(screen.getByLabelText('review.bodyLabel'), { target: { value: 'Clear answers.' } });
  fireEvent.click(screen.getByRole('button', { name: 'review.submit' }));
  return { onClose, onSubmitted };
}

const apiError = (status: number, errorCode: string) =>
  new ApiError('x', status, 'corr-123', '2026-10-15T09:42:17.000Z', { errorCode });

describe('ReviewDrawer · Senden', () => {
  // Block statt Ausdruck: gibt beforeEach eine Funktion zurueck, ruft Vitest
  // sie nach dem Test als Aufraeumer auf — hier waere das submitReview selbst.
  beforeEach(() => { submitReview.mockReset(); });

  it('zeigt den Erfolg erst nach der Antwort des Servers (S2) und schliesst nicht von selbst', async () => {
    vi.useFakeTimers();
    let resolve!: () => void;
    submitReview.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    const { onClose, onSubmitted } = setup();
    // Solange der Server nicht geantwortet hat: keine Bestaetigung, nicht bewertet
    expect(screen.queryByText('review.submitted.heading')).not.toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
    await act(async () => { resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent('review.submitted.heading');
    expect(onSubmitted).toHaveBeenCalledWith('b-1');
    // Die Zusammenfassung zeigt, was gesendet wurde
    expect(screen.getByText('“Clear answers.”')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'review.close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('bleibt bei einem Fehler offen, behaelt die Eingaben und markiert nichts (R3)', async () => {
    submitReview.mockRejectedValue(apiError(500, 'INTERNAL'));
    const { onClose, onSubmitted } = setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('review.sendFailed.heading');
    expect(screen.getByRole('alert')).toHaveTextContent('review.sendFailed.message');
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('review.bodyLabel')).toHaveValue('Clear answers.');
    expect(screen.queryByText('review.submitted.heading')).not.toBeInTheDocument();
    // Der Hauptknopf heisst jetzt „Try Again“ und sendet erneut
    submitReview.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.tryAgain' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('b-1'));
    expect(submitReview).toHaveBeenCalledTimes(2);
  });

  it('ALREADY_REVIEWED ist ein Hinweis, kein Fehler, und die Karte gilt als bewertet (E1)', async () => {
    submitReview.mockRejectedValue(apiError(409, 'ALREADY_REVIEWED'));
    const { onSubmitted } = setup();
    expect(await screen.findByRole('status')).toHaveTextContent('review.alreadyReviewed.heading');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledWith('b-1');
    expect(screen.queryByRole('button', { name: 'common:states.actions.tryAgain' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'review.close' })).toBeInTheDocument();
  });

  it('BOOKING_NOT_HELD ist ein Hinweis und markiert nichts (E1)', async () => {
    submitReview.mockRejectedValue(apiError(409, 'BOOKING_NOT_HELD'));
    const { onSubmitted } = setup();
    expect(await screen.findByRole('status')).toHaveTextContent('review.notHeld.heading');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
