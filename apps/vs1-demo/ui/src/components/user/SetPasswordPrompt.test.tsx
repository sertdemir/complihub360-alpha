import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { SetPasswordPrompt, passwordRules } from './SetPasswordPrompt';

// ─── Passwort festlegen (Canvas-Wahl L3-A, 28.11.2026) ───────────────────────
// Konten ohne Passwort bekommen das Fenster; „Spaeter“ merkt sich die
// Anmeldung, das naechste Login zeigt es wieder. Faellt die Abfrage aus,
// bleibt es zu — ein Angebot, kein Tor.

const sb = vi.hoisted(() => ({
  hasPassword: false as boolean | null,
  rpcError: null as null | { message: string },
  lastSignIn: '2026-11-28T10:00:00Z',
  updateUser: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (sel: (s: { isLoggedIn: boolean; role: string }) => unknown) => sel({ isLoggedIn: true, role: 'user' }),
}));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn(async () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', last_sign_in_at: sb.lastSignIn } } } }),
      updateUser: sb.updateUser,
    },
    rpc: async () => ({ data: sb.hasPassword, error: sb.rpcError }),
  })),
}));

beforeEach(() => {
  sb.hasPassword = false;
  sb.rpcError = null;
  sb.lastSignIn = '2026-11-28T10:00:00Z';
  sb.updateUser.mockReset().mockResolvedValue({ error: null });
  localStorage.clear();
});

describe('passwordRules', () => {
  it('prueft Laenge, Buchstabe + Zahl und Wiederholung', () => {
    expect(passwordRules('', '')).toEqual({ length: false, mix: false, match: false });
    expect(passwordRules('abcdefgh', 'abcdefgh')).toEqual({ length: true, mix: false, match: true });
    expect(passwordRules('Weber2026', 'Weber2027')).toEqual({ length: true, mix: true, match: false });
    expect(passwordRules('Müller2026', 'Müller2026')).toEqual({ length: true, mix: true, match: true });
  });
});

describe('SetPasswordPrompt', () => {
  it('Konto ohne Passwort: Fenster erscheint', async () => {
    render(<SetPasswordPrompt />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('setPassword.newLabel')).toBeInTheDocument();
  });

  it('Konto mit Passwort: kein Fenster', async () => {
    sb.hasPassword = true;
    render(<SetPasswordPrompt />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('Abfrage scheitert: kein Fenster', async () => {
    sb.rpcError = { message: 'function does not exist' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<SetPasswordPrompt />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    warn.mockRestore();
  });

  it('Speichern mit unvollstaendigem Passwort: Hinweis, kein Aufruf', async () => {
    render(<SetPasswordPrompt />);
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('setPassword.newLabel'), { target: { value: 'kurz' } });
    fireEvent.click(screen.getByRole('button', { name: 'setPassword.save' }));
    expect(await screen.findByText('setPassword.incomplete')).toBeInTheDocument();
    expect(sb.updateUser).not.toHaveBeenCalled();
  });

  it('Speichern mit gueltigem Passwort: updateUser, dann Bestaetigung', async () => {
    render(<SetPasswordPrompt />);
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('setPassword.newLabel'), { target: { value: 'Weber2026x' } });
    fireEvent.change(screen.getByLabelText('setPassword.confirmLabel'), { target: { value: 'Weber2026x' } });
    fireEvent.click(screen.getByRole('button', { name: 'setPassword.save' }));
    expect(await screen.findByText('setPassword.savedBody')).toBeInTheDocument();
    expect(sb.updateUser).toHaveBeenCalledWith({ password: 'Weber2026x' });
  });

  it('„Spaeter“ schliesst und gilt bis zur naechsten Anmeldung', async () => {
    const { unmount } = render(<SetPasswordPrompt />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'setPassword.later' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    unmount();

    // Gleiche Anmeldung, neu geladen: bleibt zu.
    const again = render(<SetPasswordPrompt />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    again.unmount();

    // Naechste Anmeldung: wieder da.
    sb.lastSignIn = '2026-11-29T08:00:00Z';
    render(<SetPasswordPrompt />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
