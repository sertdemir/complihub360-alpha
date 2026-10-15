import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

// ─── Registrierung · Regel V2 (11.10.2026) ───────────────────────────────────
// "Weiter" blieb in Schritt 1 grau, bis alles stimmte. Jetzt bleibt er aktiv,
// der Klick nennt an jedem Feld und gesammelt am Knopf, was fehlt, und der
// Fokus geht aufs erste fehlerhafte Feld.

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/en/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage · Schritt 1 (V2)', () => {
  it('Knopf aktiv; der Klick zeigt die Zusammenfassung und setzt den Fokus aufs erste Feld', () => {
    renderPage();
    const weiter = screen.getByRole('button', { name: /register\.next/ });
    expect(weiter).toBeEnabled();
    fireEvent.click(weiter);

    const summary = screen.getByRole('alert');
    expect(summary).toHaveTextContent('common:states.formErrorSummary.heading');
    for (const msg of ['common:contactSend.field.name', 'login.validation.invalidEmail', 'reset.errors.tooShort', 'register.validation.consent']) {
      expect(summary).toHaveTextContent(msg);
    }
    expect(screen.getByLabelText('register.nameLabel')).toHaveFocus();
    expect(screen.getByLabelText('register.passwordLabel')).toHaveAttribute('aria-describedby', 'reg-password-error');
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    // Noch in Schritt 1.
    expect(screen.getByText('register.stepTitles.account')).toBeInTheDocument();
  });

  it('nach dem ersten Versuch laufen die Meldungen mit; alles korrekt fuehrt zu Schritt 2', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /register\.next/ }));

    fireEvent.change(screen.getByLabelText('register.nameLabel'), { target: { value: 'Anna Berg' } });
    fireEvent.change(screen.getByLabelText('register.emailLabel'), { target: { value: 'anna@firma.de' } });
    expect(screen.getByRole('alert')).not.toHaveTextContent('common:contactSend.field.name');
    fireEvent.change(screen.getByLabelText('register.passwordLabel'), { target: { value: 'langes-passwort' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /register\.next/ }));
    // AnimatePresence (mode="wait") tauscht den Schritt erst nach dem Ausblenden.
    expect(await screen.findByText('register.stepTitles.company')).toBeInTheDocument();
  });
});
