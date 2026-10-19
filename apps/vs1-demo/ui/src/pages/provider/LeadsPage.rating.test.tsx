import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { ProviderBooking } from '../../api/bookings';
import { ApiError } from '../../api/client';

// ─── Termine · Lead-Bewertung (19.10.2026) ───────────────────────────────────
// Bis hierher stand „✓ Lead rated" sofort da, und ein Fehler verschwand in
// `.catch(() => {})`. Nach dem Neuladen wusste die Seite nichts mehr von der
// Bewertung. Jetzt: bewertet erst nach dem OK des Servers, Fehler mit „Try
// Again" und Referenz, 409 als Hinweis, der Stand kommt vom Server.

const api = vi.hoisted(() => ({ fetchProviderBookings: vi.fn(), submitReview: vi.fn() }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/bookings', async (orig) => ({
  ...(await orig<typeof import('../../api/bookings')>()),
  fetchProviderBookings: () => api.fetchProviderBookings(),
  submitReview: (...a: unknown[]) => api.submitReview(...a),
  reportProposal: vi.fn(), reportAttendance: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { LeadsPage } from './LeadsPage';

const lead = (over: Partial<ProviderBooking> = {}): ProviderBooking => ({
  id: 'b-1', slotStart: '2026-10-01T09:00:00Z', slotEnd: '2026-10-01T09:30:00Z', status: 'completed', leadCharged: true,
  userEmail: 'kunde@example.com', userCompany: 'Kunde GmbH', category: 'tax-vat', country: 'DE', countries: ['DE'], message: 'Bitte um Angebot',
  lead: null, userDiscountPct: null, proposal: null, acknowledgementVersion: null, reviewed: false,
  attendance: { noShowBy: null, noShowReportedAt: null, disputeStatus: 'none', rebookDeadline: null, rebookedFrom: null, rescheduleCount: 0, rescheduleLimit: 2, attendanceReportable: false, disputeOpenUntil: null, rebookOpen: false },
  ...over,
} as ProviderBooking);

async function openLead(b: ProviderBooking) {
  api.fetchProviderBookings.mockResolvedValue([b]);
  render(<MemoryRouter><LeadsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'termine.openDossier' }));
}
const send = () => fireEvent.click(screen.getByRole('button', { name: /termine.rateSubmit|common:states.actions.tryAgain/ }));
const star = (n: number) => fireEvent.click(screen.getAllByRole('button', { name: 'termine.rateStar' })[n - 1]);

describe('Lead-Bewertung', () => {
  beforeEach(() => { api.fetchProviderBookings.mockReset(); api.submitReview.mockReset(); });

  it('zeigt „bewertet" erst nach dem OK des Servers', async () => {
    let resolve!: () => void;
    api.submitReview.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    await openLead(lead());
    star(4); send();
    expect(api.submitReview).toHaveBeenCalledWith({ bookingId: 'b-1', fromRole: 'provider', rating: 4, categories: [] });
    expect(screen.queryByText('termine.rated')).not.toBeInTheDocument();
    resolve();
    expect(await screen.findByText('termine.rated')).toBeInTheDocument();
  });

  it('ein Fehler steht am Lead, mit Referenz und „Try Again" — die Sterne bleiben', async () => {
    api.submitReview.mockRejectedValueOnce(new ApiError('raw server text', 500, 'ref-7'));
    await openLead(lead());
    star(3); send();
    expect(await screen.findByText('termine.rateFailed.heading')).toBeInTheDocument();
    expect(screen.queryByText('termine.rated')).not.toBeInTheDocument();
    expect(screen.queryByText('raw server text')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'termine.rateStar' })[2]).toHaveAttribute('aria-pressed', 'true');
    api.submitReview.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.tryAgain' }));
    expect(await screen.findByText('termine.rated')).toBeInTheDocument();
  });

  it('409 ALREADY_REVIEWED ist ein Hinweis, kein Fehler', async () => {
    api.submitReview.mockRejectedValue(new ApiError('x', 409, 'r', undefined, { errorCode: 'ALREADY_REVIEWED' }));
    await openLead(lead());
    star(5); send();
    expect(await screen.findByText('termine.rateAlready.heading')).toBeInTheDocument();
    expect(screen.queryByText('termine.rateFailed.heading')).not.toBeInTheDocument();
  });

  it('schon bewertet laut Server: keine Sterne mehr, auch nach dem Neuladen', async () => {
    await openLead(lead({ reviewed: true }));
    expect(screen.getByText('termine.rated')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: 'termine.rateStar' })).toHaveLength(0);
  });

  it('ohne Sterne: Satz an der Sternreihe, nichts geht ab', async () => {
    await openLead(lead());
    send();
    expect(screen.getByText('termine.rateRequired')).toBeInTheDocument();
    await waitFor(() => expect(api.submitReview).not.toHaveBeenCalled());
  });
});
