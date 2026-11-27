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

const api = vi.hoisted(() => ({ fetchApplications: vi.fn(), inviteApplication: vi.fn(), declineApplication: vi.fn() }));
vi.mock('../../components/admin/AdminShell', () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/providerInvites', async (orig) => ({
  ...(await orig<typeof import('../../api/providerInvites')>()),
  fetchApplications: () => api.fetchApplications(),
  inviteApplication: (id: string) => api.inviteApplication(id),
  declineApplication: (id: string, reason: string) => api.declineApplication(id, reason),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { AdminApplicationsPage } from './AdminApplicationsPage';

const app = (over: Partial<ProviderApplication> = {}): ProviderApplication => ({
  id: 'a1', reference: 'ref-1', created_at: '2026-11-24T09:00:00Z', locale: 'en', first_name: 'Elise', contact_name: 'Elise Marlow', email: 'elise@alderquay.example',
  firm: 'Alder Quay VAT Services LLC', website: 'https://alderquay.example', credentials: 'Enrolled Agent (US)', areas: ['tax-vat'], markets: ['DE', 'FR'],
  message: 'We support US sellers.', status: 'received', invited_at: null, invite_expires_at: null, invite_expired: false, invite_send_count: 0, redeemed_at: null, provider_key: null, declined_at: null, decline_reason: null, ...over,
});
const list = (rows: ProviderApplication[]): ApplicationList => ({
  applications: rows,
  counts: { total: rows.length, received: rows.filter((r) => r.status === 'received').length, invited: rows.filter((r) => r.status === 'invited').length, onboarding: rows.filter((r) => r.status === 'onboarding').length, declined: rows.filter((r) => r.status === 'declined').length },
});
const show = () => render(<MemoryRouter><AdminApplicationsPage /></MemoryRouter>);

describe('Admin · Bewerbungen', () => {
  beforeEach(() => { api.fetchApplications.mockReset(); api.inviteApplication.mockReset(); api.declineApplication.mockReset(); });

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

  const REASON = 'We currently onboard providers for EU markets only.';

  it('lehnt nur mit Grund ab und sagt, dass der Text in die Mail geht', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(screen.getByText(/goes into the message to Elise Marlow, word for word/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reason for declining'), { target: { value: 'Too short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline and send message' }));
    expect(screen.getByText(/Please give a reason of 20 to 1200 characters/)).toBeInTheDocument();
    expect(screen.getByLabelText('Reason for declining')).toHaveAttribute('aria-invalid', 'true');
    expect(api.declineApplication).not.toHaveBeenCalled();
  });

  it('lehnt ab, nennt den Zeitpunkt und zeigt den gesendeten Grund', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    api.declineApplication.mockResolvedValue(app({ status: 'declined', declined_at: '2026-11-27T09:00:00Z', decline_reason: REASON }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    fireEvent.change(screen.getByLabelText('Reason for declining'), { target: { value: `  ${REASON} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline and send message' }));
    await waitFor(() => expect(api.declineApplication).toHaveBeenCalledWith('a1', REASON));
    expect(await screen.findByText(/declined\. The message with your reason went to elise@alderquay\.example/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Declined · 1$/ }));
    const row = document.querySelector('[data-status="declined"]') as HTMLElement;
    expect(within(row).getByText(/^Declined \d/)).toBeInTheDocument();
    // Abgelehnt ist nicht endgueltig.
    expect(within(row).getByRole('button', { name: 'Invite to onboarding' })).toBeInTheDocument();
    // Die Zeile ist vom Ablehnen noch offen: der gesendete Grund steht da.
    expect(screen.getByText('Reason sent to the applicant')).toBeInTheDocument();
    expect(screen.getByText(REASON)).toBeInTheDocument();
  });

  it('laesst Zeile und Text stehen, wenn die Mail nicht hinausgeht; Abbrechen sendet nichts', async () => {
    api.fetchApplications.mockResolvedValue(list([app()]));
    api.declineApplication.mockRejectedValue(new ApiError('x', 502, 'c', undefined, { errorCode: 'DECLINE_SEND_FAILED' }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    fireEvent.change(screen.getByLabelText('Reason for declining'), { target: { value: REASON } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline and send message' }));
    expect(await screen.findByText(/could not be sent\. Nothing was changed/)).toBeInTheDocument();
    expect(screen.getByLabelText('Reason for declining')).toHaveValue(REASON);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Reason for declining')).toBeNull();
    expect(screen.getByRole('button', { name: /Invite to onboarding/ })).toBeInTheDocument();
  });

  it('bietet fuer ein bestehendes Konto kein Ablehnen an', async () => {
    api.fetchApplications.mockResolvedValue(list([app({ status: 'onboarding', provider_key: 'done-ltd', invited_at: '2026-11-10T10:00:00Z', redeemed_at: '2026-11-11T10:00:00Z' })]));
    show();
    fireEvent.click(await screen.findByRole('button', { name: /^All · 1$/ }));
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  });

  it('zeigt bei einem Ladefehler keine Beispielzeilen', async () => {
    api.fetchApplications.mockRejectedValue(new ApiError('x', 403, 'c'));
    show();
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
