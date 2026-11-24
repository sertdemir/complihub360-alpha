import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { ApplicationList, ProviderApplication } from '../../api/providerInvites';
import { ApiError } from '../../api/client';

// ─── Admin · Bewerbungen (P01, 24.11.2026) ───────────────────────────────────
// Die Seite zeigt alle Angaben des Formulars, laedt per Klick ein und nennt
// danach den Zeitpunkt. Geht die Einladung nicht hinaus, bleibt die Zeile,
// wie sie war, und die Seite sagt es.

const api = vi.hoisted(() => ({ fetchApplications: vi.fn(), inviteApplication: vi.fn() }));
vi.mock('../../components/admin/AdminShell', () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/providerInvites', async (orig) => ({
  ...(await orig<typeof import('../../api/providerInvites')>()),
  fetchApplications: () => api.fetchApplications(),
  inviteApplication: (id: string) => api.inviteApplication(id),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { AdminApplicationsPage } from './AdminApplicationsPage';

const app = (over: Partial<ProviderApplication> = {}): ProviderApplication => ({
  id: 'a1', reference: 'ref-1', created_at: '2026-11-24T09:00:00Z', locale: 'en', first_name: 'Elise', contact_name: 'Elise Marlow', email: 'elise@alderquay.example',
  firm: 'Alder Quay VAT Services LLC', website: 'https://alderquay.example', credentials: 'Enrolled Agent (US)', areas: ['tax-vat'], markets: ['DE', 'FR'],
  message: 'We support US sellers.', status: 'received', invited_at: null, invite_expires_at: null, invite_expired: false, invite_send_count: 0, redeemed_at: null, provider_key: null, ...over,
});
const list = (rows: ProviderApplication[]): ApplicationList => ({
  applications: rows,
  counts: { total: rows.length, received: rows.filter((r) => r.status === 'received').length, invited: rows.filter((r) => r.status === 'invited').length, onboarding: rows.filter((r) => r.status === 'onboarding').length },
});
const show = () => render(<MemoryRouter><AdminApplicationsPage /></MemoryRouter>);

describe('Admin · Bewerbungen', () => {
  beforeEach(() => { api.fetchApplications.mockReset(); api.inviteApplication.mockReset(); });

  it('zeigt die Bewerbung mit allen Angaben des Formulars', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    show();
    expect(await screen.findByText('Alder Quay VAT Services LLC')).toBeInTheDocument();
    expect(screen.getByText('Not sent')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show details for Alder Quay VAT Services LLC' }));
    for (const text of ['Enrolled Agent (US)', 'We support US sellers.', 'https://alderquay.example', 'ref-1']) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('laedt per Klick ein und nennt danach den Zeitpunkt', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    api.inviteApplication.mockResolvedValue(app({ status: 'invited', invited_at: '2026-11-25T10:02:00Z', invite_expires_at: '2026-12-09T10:02:00Z', invite_send_count: 1 }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Invite to onboarding/ }));
    await waitFor(() => expect(api.inviteApplication).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText(/Invitation sent to elise@alderquay\.example/)).toBeInTheDocument();
    // Die Zeile wandert aus "New" nach "Invited"; dort steht der Zeitpunkt.
    fireEvent.click(screen.getByRole('button', { name: /^Invited · 1$/ }));
    const row = document.querySelector('[data-status="invited"]') as HTMLElement;
    expect(within(row).getByText(/^Sent /)).toBeInTheDocument();
    expect(within(row).getByText(/Valid until/)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Send again' })).toBeInTheDocument();
    expect(within(row).getByText('Invited to onboarding')).toBeInTheDocument();
  });

  it('sagt es, wenn die Einladung nicht hinausgeht, und laesst die Zeile stehen', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    api.inviteApplication.mockRejectedValue(new ApiError('x', 502, 'c', undefined, { errorCode: 'INVITE_SEND_FAILED' }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Invite to onboarding/ }));
    expect(await screen.findByText(/could not be sent\. Nothing was changed/)).toBeInTheDocument();
    expect(screen.getByText('Not sent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Invite to onboarding/ })).toBeInTheDocument();
  });

  it('nennt einen abgelaufenen Link und fuehrt nach der Kontoeinrichtung ins Dossier', async () => {
    api.fetchApplications.mockResolvedValue(list([
      app({ id: 'a2', firm: 'Late GmbH', status: 'invited', invited_at: '2026-11-01T10:00:00Z', invite_expires_at: '2026-11-15T10:00:00Z', invite_expired: true, invite_send_count: 2 }),
      app({ id: 'a3', firm: 'Done Ltd', status: 'onboarding', invited_at: '2026-11-10T10:00:00Z', redeemed_at: '2026-11-11T10:00:00Z', provider_key: 'done-ltd', invite_send_count: 1 }),
    ]));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /^All · 2$/ }));
    expect(screen.getByText(/Link expired .* · sent 2 times/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open dossier' })).toHaveAttribute('href', '/en/admin/providers/done-ltd');
    // "Verified" vergibt diese Seite nie.
    expect(screen.queryByText(/verified$/i)).toBeNull();
  });

  it('zeigt bei einem Ladefehler keine Beispielzeilen', async () => {
    api.fetchApplications.mockRejectedValue(new ApiError('x', 403, 'c'));
    show();
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
