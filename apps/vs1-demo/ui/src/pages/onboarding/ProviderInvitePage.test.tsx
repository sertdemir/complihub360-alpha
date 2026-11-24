import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../api/client';

// ─── /provider-invite (P01, 24.11.2026) ──────────────────────────────────────
// Der Link gehoert zu einer Bewerbung. Mit ihm richtet die Person ihr Konto
// ein und landet auf "Application". Ohne gueltigen Link gibt es kein Formular,
// sondern den Grund.

const api = vi.hoisted(() => ({ readInvite: vi.fn(), acceptInvite: vi.fn(), signIn: vi.fn(), login: vi.fn() }));
vi.mock('../../api/providerInvites', async (orig) => ({
  ...(await orig<typeof import('../../api/providerInvites')>()),
  readInvite: (t: string) => api.readInvite(t),
  acceptInvite: (t: string, p: string) => api.acceptInvite(t, p),
}));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, isMockApi: false, isDemoLoginEnabled: false, getSupabase: async () => ({ auth: { signInWithPassword: api.signIn } }) }));
vi.mock('../../store/useAuthStore', () => ({ useAuthStore: (sel: (s: { login: typeof api.login }) => unknown) => sel({ login: api.login }) }));
vi.mock('../../components/auth/SystemFooter', () => ({ SystemFooter: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o && 'name' in o ? `${k}|${o.name}` : o && 'firm' in o ? `${k}|${o.firm}` : k), i18n: { resolvedLanguage: 'en' } }),
}));

import { ProviderInvitePage } from './ProviderInvitePage';

function Where() { return <p data-testid="where">{useLocation().pathname}</p>; }
const show = (url = '/en/provider-invite?token=tok') => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/en/provider-invite" element={<ProviderInvitePage />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);
const INVITE = { first_name: 'Elise', firm: 'Alder Quay VAT Services LLC', email: 'elise@alderquay.example', expires_at: '2026-12-09T10:00:00Z' };

describe('/provider-invite', () => {
  beforeEach(() => { for (const f of Object.values(api)) f.mockReset(); });

  it('begruesst mit dem Vornamen, nennt Firma und Adresse und sagt, dass eingeladen nicht verifiziert heisst', async () => {
    api.readInvite.mockResolvedValue(INVITE);
    show();
    expect(await screen.findByText('invite.helloName|Elise')).toBeInTheDocument();
    expect(screen.getByText('invite.lead|Alder Quay VAT Services LLC')).toBeInTheDocument();
    expect(screen.getByLabelText('invite.email')).toHaveValue('elise@alderquay.example');
    expect(screen.getByLabelText('invite.email')).toHaveAttribute('readonly');
    expect(screen.getByText('invite.notVerified')).toBeInTheDocument();
  });

  it('richtet das Konto ein, meldet an und fuehrt auf Application', async () => {
    api.readInvite.mockResolvedValue(INVITE);
    api.acceptInvite.mockResolvedValue({ provider_key: 'alder-quay', email: 'elise@alderquay.example' });
    api.signIn.mockResolvedValue({ error: null });
    show();
    fireEvent.change(await screen.findByLabelText('invite.password'), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: /invite\.submit/ }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/en/provider-dashboard/application'));
    expect(api.acceptInvite).toHaveBeenCalledWith('tok', 'correct horse');
    expect(api.signIn).toHaveBeenCalledWith({ email: 'elise@alderquay.example', password: 'correct horse' });
  });

  it('schickt ein zu kurzes Passwort nicht ab und sagt es am Feld', async () => {
    api.readInvite.mockResolvedValue(INVITE);
    show();
    fireEvent.change(await screen.findByLabelText('invite.password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /invite\.submit/ }));
    expect(screen.getByText('invite.passwordShort')).toBeInTheDocument();
    expect(screen.getByLabelText('invite.password')).toHaveAttribute('aria-invalid', 'true');
    expect(api.acceptInvite).not.toHaveBeenCalled();
  });

  it('sagt es, wenn die Adresse schon ein Konto hat, und laesst die Eingabe stehen', async () => {
    api.readInvite.mockResolvedValue(INVITE);
    api.acceptInvite.mockRejectedValue(new ApiError('x', 409, 'c', undefined, { errorCode: 'EMAIL_HAS_LOGIN' }));
    show();
    fireEvent.change(await screen.findByLabelText('invite.password'), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: /invite\.submit/ }));
    expect(await screen.findByText('invite.failure.exists')).toBeInTheDocument();
    expect(screen.getByLabelText('invite.password')).toHaveValue('correct horse');
  });

  it('nennt nach geglueckter Einrichtung eine gescheiterte Anmeldung als solche', async () => {
    api.readInvite.mockResolvedValue(INVITE);
    api.acceptInvite.mockResolvedValue({ provider_key: 'alder-quay', email: 'elise@alderquay.example' });
    api.signIn.mockResolvedValue({ error: { code: 'unexpected' } });
    show();
    fireEvent.change(await screen.findByLabelText('invite.password'), { target: { value: 'correct horse' } });
    fireEvent.click(screen.getByRole('button', { name: /invite\.submit/ }));
    expect(await screen.findByText(/invite\.failure\.signin/)).toBeInTheDocument();
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it.each([
    ['INVITE_EXPIRED', 410, 'expired'], ['INVITE_USED', 409, 'used'], ['INVITE_INVALID', 404, 'invalid'],
  ])('zeigt bei %s den Grund statt eines Formulars', async (errorCode, status, problem) => {
    api.readInvite.mockRejectedValue(new ApiError('x', status as number, 'c', undefined, { errorCode }));
    show();
    expect(await screen.findByText(`invite.problem.${problem}.title`)).toBeInTheDocument();
    expect(screen.queryByLabelText('invite.password')).toBeNull();
  });

  it('ohne Link: kein Aufruf, der Grund steht da', () => {
    show('/en/provider-invite');
    expect(screen.getByText('invite.problem.invalid.title')).toBeInTheDocument();
    expect(api.readInvite).not.toHaveBeenCalled();
  });

  it('haelt einen Ausfall nicht fuer einen ungueltigen Link', async () => {
    api.readInvite.mockRejectedValue(new ApiError('Network error', 0, 'c'));
    show();
    expect(await screen.findByText('invite.problem.unreachable.title')).toBeInTheDocument();
  });
});
