import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AuthCallbackPage } from './AuthCallbackPage';
import { setAuthLinkFailure } from '../../lib/authLink';

// ─── Callback: der Fehler nennt den Grund, den wir kennen ────────────────────
// Bis 18.10.2026 wartete die Seite bei jedem Fehlschlag 6 s und meldete
// "abgelaufen" — auch fuer einen Link, der 14 s alt war (Beta-Klicktest).

const session = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de' } }),
}));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn().mockResolvedValue({
    auth: {
      getSession: async () => ({ data: { session: session.current } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

function renderAt(url: string) {
  window.history.replaceState(null, '', url);
  return render(
    <MemoryRouter initialEntries={['/de/auth/callback']}>
      <Routes>
        <Route path="/de/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => { session.current = null; setAuthLinkFailure(null); window.history.replaceState(null, '', '/'); });

describe('AuthCallbackPage · Fehlergrund', () => {
  it('PKCE-Code ohne Sitzung (anderer Browser): sofort "nicht einloesbar", nicht "abgelaufen"', async () => {
    renderAt('/de/auth/callback?code=abc');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/de/login?error=unredeemable'));
  });

  it('Supabase meldet otp_expired: "abgelaufen"', async () => {
    renderAt('/de/auth/callback#error=access_denied&error_code=otp_expired');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/de/login?error=expired'));
  });

  it('token_hash abgelehnt: der Grund aus dem Einloesen gilt', async () => {
    setAuthLinkFailure('invalid');
    renderAt('/de/auth/callback');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/de/login?error=invalid'));
  });

  it('Gegenprobe: mit Sitzung geht es ins Dashboard, kein Fehler', async () => {
    session.current = { user: { app_metadata: {}, user_metadata: {} } };
    renderAt('/de/auth/callback?code=abc');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/de/dashboard'));
  });
});
