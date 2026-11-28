import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from './LoginPage';

// ─── Anmeldung · Regel V2 (11.10.2026) ───────────────────────────────────────
// Der Knopf bleibt aktiv. Geht es nur um die E-Mail (Anmeldelink, Passwort
// vergessen), steht der Satz am Feld (role="alert") und der Fokus darin —
// ohne Zusammenfassung. Der Passwort-Versuch (E-Mail + Passwort) zeigt
// zusaetzlich die Zusammenfassung.
//
// Seit 28.11.2026 (Canvas-Wahl L1-A · L2-B) melden sich auch Unternehmen mit
// Passwort an; der Anmeldelink ist der zweite Knopf, „Passwort vergessen?“
// sendet direkt am Feld.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
// Der Fuss laedt die i18n-Konfiguration (Sprachwahl) — hier ohne Belang.
vi.mock('../../components/auth/SystemFooter', () => ({ SystemFooter: () => null }));
vi.mock('../../lib/supabase', () => ({
  getSupabase: vi.fn().mockResolvedValue(null),
  isSupabaseConfigured: false,
  isDemoLoginEnabled: false,
  isGoogleLoginEnabled: false,
}));

const SUMMARY = 'common:states.formErrorSummary.heading';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/en/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage · Unternehmen mit Passwort (L1-A)', () => {
  it('zeigt Passwortfeld und den Anmeldelink als zweiten Knopf', () => {
    renderPage();
    expect(screen.getByLabelText('login.partner.passwordLabel')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /login\.user\.signIn/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /login\.user\.sendLinkInstead/ })).toBeEnabled();
  });

  it('Anmelden ohne Angaben: Saetze an beiden Feldern, Zusammenfassung, Fokus aufs erste', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /login\.user\.signIn/ }));

    const summary = screen.getByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY);
    expect(summary).toHaveTextContent('login.validation.invalidEmail');
    expect(summary).toHaveTextContent('login.validation.passwordRequired');
    expect(screen.getByLabelText('login.emailLabel')).toHaveFocus();
    expect(screen.getByLabelText('login.partner.passwordLabel')).toHaveAttribute('aria-describedby', 'login-password-error');
  });
});

describe('LoginPage · Fehler am Feld (V2)', () => {
  it('Anmeldelink ohne gueltige Adresse: Satz am Feld, Fokus im Feld, keine Zusammenfassung, nichts am Passwort', () => {
    renderPage();
    const knopf = screen.getByRole('button', { name: /login\.user\.sendLinkInstead/ });
    expect(knopf).toBeEnabled();
    fireEvent.click(knopf);

    const email = screen.getByLabelText('login.emailLabel');
    expect(screen.getByRole('alert')).toHaveTextContent('login.validation.invalidEmail');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'login-email-error');
    expect(screen.queryByText(SUMMARY)).not.toBeInTheDocument();
    expect(screen.queryByText('login.validation.passwordRequired')).not.toBeInTheDocument();
  });

  it('der Satz verschwindet, sobald die Adresse stimmt', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /login\.user\.sendLinkInstead/ }));
    fireEvent.change(screen.getByLabelText('login.emailLabel'), { target: { value: 'anna@firma.de' } });
    expect(screen.queryByText('login.validation.invalidEmail')).not.toBeInTheDocument();
    expect(screen.getByLabelText('login.emailLabel')).not.toHaveAttribute('aria-invalid');
  });

  it('Anbieter-Anmeldung (zwei Felder): Saetze an beiden Feldern, Zusammenfassung am Knopf, Fokus aufs erste', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'login.toggle.provider' }));
    // AnimatePresence (mode="wait") tauscht das Formular erst nach dem Ausblenden.
    const knopf = await screen.findByRole('button', { name: /login\.partner\.signIn/ });
    expect(knopf).toBeEnabled();
    fireEvent.click(knopf);

    const summary = screen.getByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY);
    expect(summary).toHaveTextContent('login.validation.invalidEmail');
    expect(summary).toHaveTextContent('login.validation.passwordRequired');
    expect(screen.getByLabelText('login.emailLabel')).toHaveFocus();
    expect(screen.getByLabelText('login.partner.passwordLabel')).toHaveAttribute('aria-describedby', 'login-password-error');
  });
});

describe('LoginPage · Passwort vergessen am Feld (L2-B)', () => {
  it('ohne Adresse: Satz am E-Mail-Feld, kein Versand', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'login.user.forgotLink' }));
    expect(screen.getByRole('alert')).toHaveTextContent('login.validation.invalidEmail');
    expect(screen.queryByText('login.user.resetInline.body')).not.toBeInTheDocument();
  });

  it('mit Adresse: Bestaetigung unter dem Passwortfeld, ohne Seitenwechsel; neue Adresse setzt zurueck', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('login.emailLabel'), { target: { value: 'anna@firma.de' } });
    fireEvent.click(screen.getByRole('button', { name: 'login.user.forgotLink' }));

    expect(await screen.findByRole('status')).toHaveTextContent('login.user.resetInline.body');
    expect(screen.getByText('login.user.resetInline.sent')).toBeInTheDocument();
    expect(screen.getByLabelText('login.partner.passwordLabel')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('login.emailLabel'), { target: { value: 'ben@firma.de' } });
    expect(screen.queryByText('login.user.resetInline.body')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'login.user.forgotLink' })).toBeInTheDocument();
  });
});
