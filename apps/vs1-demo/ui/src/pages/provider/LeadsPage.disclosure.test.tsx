import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { ProviderBooking } from '../../api/bookings';

// ─── Termine · Offenlegung noch nicht protokolliert (23.10.2026) ─────────────
// Die Kontaktdaten gehen erst nach dem Audit an den Anbieter (disclosure.ts).
// Bis dahin steht dort der Grund, kein leeres „—".

const api = vi.hoisted(() => ({ fetchProviderBookings: vi.fn() }));
vi.mock('../../components/provider/ProviderShell', () => ({ ProviderShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/bookings', async (orig) => ({
  ...(await orig<typeof import('../../api/bookings')>()),
  fetchProviderBookings: () => api.fetchProviderBookings(),
  submitReview: vi.fn(), reportProposal: vi.fn(), reportAttendance: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { LeadsPage } from './LeadsPage';

const lead = (over: Partial<ProviderBooking> = {}): ProviderBooking => ({
  id: 'b-1', slotStart: '2026-11-01T09:00:00Z', slotEnd: '2026-11-01T09:30:00Z', status: 'confirmed', leadCharged: true,
  userEmail: null, userCompany: null, category: 'tax-vat', country: 'DE', countries: ['DE'], message: null,
  lead: null, userDiscountPct: null, proposal: null, acknowledgementVersion: 'v2', reviewed: false, disclosurePending: true,
  attendance: { noShowBy: null, noShowReportedAt: null, disputeStatus: 'none', rebookDeadline: null, rebookedFrom: null, rescheduleCount: 0, rescheduleLimit: 2, attendanceReportable: false, disputeOpenUntil: null, rebookOpen: false },
  ...over,
} as ProviderBooking);

describe('Termine · Offenlegung ausstehend', () => {
  beforeEach(() => { api.fetchProviderBookings.mockReset(); });

  it('zeigt den Grund statt eines leeren Kontakts', async () => {
    api.fetchProviderBookings.mockResolvedValue([lead()]);
    render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    expect(await screen.findByText('termine.disclosurePendingShort')).toBeInTheDocument();
    expect(screen.queryByText('termine.companyMissing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'termine.openDossier' }));
    expect(await screen.findByText('termine.disclosurePending')).toBeInTheDocument();
  });

  it('nach der Freigabe die E-Mail', async () => {
    api.fetchProviderBookings.mockResolvedValue([lead({ disclosurePending: false, userEmail: 'kunde@example.com' })]);
    render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    expect(await screen.findByText('kunde@example.com')).toBeInTheDocument();
    expect(screen.queryByText('termine.disclosurePendingShort')).not.toBeInTheDocument();
  });
});
