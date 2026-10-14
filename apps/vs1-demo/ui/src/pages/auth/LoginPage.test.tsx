import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from './LoginPage';

// ─── Anmeldung · Regel V2 (11.10.2026) ───────────────────────────────────────
// Der Knopf bleibt aktiv. Ein Formular mit nur der E-Mail zeigt den Satz am
// Feld (role="alert") und setzt den Fokus hinein — ohne Zusammenfassung. Das
// Anbieter-Formular (E-Mail + Passwort) zeigt zusaetzlich die Zusammenfassung.

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
}));

const SUMMARY = 'common:states.formErrorSummary.heading';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/en/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage · Fehler am Feld (V2)', () => {
  it('Anmeldelink ohne gueltige Adresse: Satz am Feld, Fokus im Feld, keine Zusammenfassung', () => {
    renderPage();
    const knopf = screen.getByRole('button', { name: /login\.user\.send/ });
    expect(knopf).toBeEnabled();
    fireEvent.click(knopf);

    const email = screen.getByLabelText('login.emailLabel');
    expect(screen.getByRole('alert')).toHaveTextContent('login.validation.invalidEmail');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'login-email-error');
    expect(screen.queryByText(SUMMARY)).not.toBeInTheDocument();
  });

  it('der Satz verschwindet, sobald die Adresse stimmt', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /login\.user\.send/ }));
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
