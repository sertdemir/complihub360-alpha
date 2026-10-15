import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

// ─── Google-Login hinter VITE_AUTH_GOOGLE (Beta-Plan 15.10.2026) ─────────────
// Ohne Schalter kein Google-Knopf: Im Beta-Projekt ist der Provider aus, der
// Knopf fuehrte dort in einen Fehler (Login) bzw. ins Leere (Registrierung,
// ohne Handler). Gegenprobe: mit Schalter erscheint er wieder.

const flags = vi.hoisted(() => ({ google: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
vi.mock('../../components/auth/SystemFooter', () => ({ SystemFooter: () => null }));
vi.mock('../../lib/supabase', () => ({
  getSupabase: vi.fn().mockResolvedValue(null),
  isSupabaseConfigured: false,
  isDemoLoginEnabled: false,
  get isGoogleLoginEnabled() { return flags.google; },
}));

function renderAt(path: string, page: JSX.Element) {
  return render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);
}

afterEach(() => { flags.google = false; });

describe('Google-Login · Schalter', () => {
  it('ohne Schalter: weder Login noch Registrierung zeigen Google', () => {
    renderAt('/en/login', <LoginPage />);
    expect(screen.queryByText(/login\.continueWithGoogle/)).not.toBeInTheDocument();
    expect(screen.queryByText('login.or')).not.toBeInTheDocument();

    renderAt('/en/register', <RegisterPage />);
    expect(screen.queryByText(/register\.googleSignup/)).not.toBeInTheDocument();
    expect(screen.queryByText('register.orEmail')).not.toBeInTheDocument();
  });

  it('mit Schalter (Gegenprobe): beide zeigen Google wieder', () => {
    flags.google = true;
    renderAt('/en/login', <LoginPage />);
    expect(screen.getByText(/login\.continueWithGoogle/)).toBeInTheDocument();

    renderAt('/en/register', <RegisterPage />);
    expect(screen.getByText(/register\.googleSignup/)).toBeInTheDocument();
  });
});
