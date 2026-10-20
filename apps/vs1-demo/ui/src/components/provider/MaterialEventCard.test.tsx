import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/client';

// ─── Wesentliche Aenderung melden · V2 (11.10.2026) ──────────────────────────
// Bis hierher war „Melden" grau, solange kein Ereignis gewaehlt war — der Satz
// `pickEvent` konnte deshalb nie erscheinen. Jetzt: Knopf aktiv, Satz an der
// Gruppe (role="alert"), Fokus aufs erste Ereignis, nichts geht ab.

const { reportMaterialEvent } = vi.hoisted(() => ({ reportMaterialEvent: vi.fn() }));
vi.mock('../../api/application', async (orig) => ({
  ...(await orig<typeof import('../../api/application')>()),
  reportMaterialEvent: (...a: unknown[]) => reportMaterialEvent(...a),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { MaterialEventCard } from './MaterialEventCard';

const open = () => {
  render(<MaterialEventCard services={[]} onReported={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'verification.materialEvent.open' }));
};
const report = () => screen.getByRole('button', { name: 'verification.materialEvent.submitNone' });

describe('MaterialEventCard · V2', () => {
  // Block statt Ausdruck: gibt beforeEach eine Funktion zurueck, ruft Vitest
  // sie nach dem Test auf — hier waere das reportMaterialEvent selbst.
  beforeEach(() => { reportMaterialEvent.mockReset(); });

  it('ohne Ereignis: der Satz pickEvent erscheint, Fokus aufs erste Ereignis', () => {
    open();
    expect(report()).toBeEnabled();
    fireEvent.click(report());

    expect(screen.getByRole('alert')).toHaveTextContent('verification.materialEvent.pickEvent');
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveFocus();
    expect(radios[0]).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('material-event')).toHaveAttribute('aria-describedby', 'material-event-error');
    expect(reportMaterialEvent).not.toHaveBeenCalled();
  });

  it('mit Ereignis verschwindet der Satz und die Meldung geht ab', async () => {
    reportMaterialEvent.mockResolvedValue({ paused_service_ids: [] });
    open();
    fireEvent.click(report());
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(report());
    await waitFor(() => expect(reportMaterialEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: expect.any(String), service_ids: [] })));
    expect(await screen.findByText('verification.materialEvent.doneNone')).toBeInTheDocument();
  });

  it('scheitert das Melden: Hinweis mit Referenz statt Server-Text, Eingaben bleiben (Punkt 2, W1)', async () => {
    reportMaterialEvent.mockRejectedValueOnce(new ApiError('Request failed', 500, 'corr-9', '2026-10-17T10:00:00.000Z', { errorCode: 'INTERNAL' }));
    open();
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(report());
    expect(await screen.findByText('verification.materialEvent.sendFailed.heading')).toBeInTheDocument();
    expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
    expect(screen.getByRole('button', { name: 'common:states.actions.tryAgain' })).toBeInTheDocument();
  });

  it('ein ungueltiges Datum laut Server (field) steht am Datum', async () => {
    reportMaterialEvent.mockRejectedValueOnce(new ApiError('occurred_on must be a date', 400, 'c', undefined, { errorCode: 'VALIDATION_ERROR', field: 'occurred_on' }));
    open();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(report());
    expect(await screen.findByText('verification.materialEvent.dateInvalid')).toBeInTheDocument();
  });
});

