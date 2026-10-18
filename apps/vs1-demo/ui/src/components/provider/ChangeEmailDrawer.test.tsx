import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/client';

// ─── E-Mail aendern ohne Server-Text (Punkt 2, Wahl E1 · C3, 17.10.2026) ─────

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../api/client', async (orig) => ({ ...(await orig<typeof import('../../api/client')>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock('../../api/provider', () => ({ myProviderKey: async () => 'neue-kanzlei' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { ChangeEmailDrawer } from './ChangeEmailDrawer';

function send(address = 'kanzlei@schmidt-partner.example') {
  render(<ChangeEmailDrawer open currentEmail="kanzlei@schmidt-partner.example" onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText('changeEmail.newAddress'), { target: { value: address } });
  fireEvent.click(screen.getByRole('button', { name: 'changeEmail.sendVerification' }));
}
const err = (status: number, body: Record<string, unknown>) => new ApiError('This is already the contact address', status, 'corr-7', '2026-10-17T10:00:00.000Z', body);

describe('ChangeEmailDrawer · Fehler', () => {
  // Block statt Ausdruck: siehe vitest-Merkfakt (beforeEach darf den Mock nicht zurueckgeben).
  beforeEach(() => { apiFetch.mockReset(); });

  it('gleiche Adresse steht am Feld, nie der Server-Text (E1)', async () => {
    apiFetch.mockRejectedValueOnce(err(409, { errorCode: 'SAME_ADDRESS' }));
    send();
    expect(await screen.findByText('changeEmail.sameAddress')).toBeInTheDocument();
    expect(screen.getByLabelText('changeEmail.newAddress')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/already the contact address/)).not.toBeInTheDocument();
  });

  it('ein echter Fehler: Hinweis ueber den Knoepfen mit Referenz, Hauptknopf „Try Again“', async () => {
    apiFetch.mockRejectedValueOnce(err(500, { errorCode: 'INTERNAL' }));
    send('kontakt@schmidt-partner.example');
    expect(await screen.findByText('changeEmail.sendFailed.heading')).toBeInTheDocument();
    expect(screen.getByText('common:states.technicalDetails')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:states.actions.tryAgain' })).toBeInTheDocument();
    expect(screen.queryByText(/contact address/)).not.toBeInTheDocument();
  });

  it('ungueltige Adresse laut Server (field) steht am Feld', async () => {
    apiFetch.mockRejectedValueOnce(err(400, { errorCode: 'VALIDATION_ERROR', field: 'new_email' }));
    send('kontakt@schmidt-partner.example');
    expect(await screen.findByText('common:contactSend.field.email')).toBeInTheDocument();
  });
});
