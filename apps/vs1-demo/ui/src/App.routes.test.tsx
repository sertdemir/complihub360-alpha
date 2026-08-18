import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';

// ─── Retired marketing routes ────────────────────────────────────────────────
// /services, /advisory and /providers were removed on 2026-08-18 and /countries
// was merged into /markets. The failure mode worth guarding is not a 404 but a
// *blank* page: if a locale-level path matches the layout route without matching
// any child, React Router renders <Outlet /> empty and the user gets a header
// over nothing, with no error anywhere.
//
// SCOPE — read before trusting this file: it pins the ROUTER SEMANTICS that
// App.tsx relies on, using the same route shapes, not App itself. Rendering the
// real AppContent needs the i18n and auth providers the unit setup does not
// supply (the whole tree throws and nothing mounts). So this proves "a parent
// route without a splat does not swallow deeper paths, they fall to the
// top-level catch-all" — the part that is genuinely easy to get wrong. It does
// NOT prove App.tsx still has that catch-all; that is verified in the browser.
function LocaleRedirect({ to }: { to: string }) {
  const { locale } = useParams();
  return <Navigate to={`/${locale || 'en'}/${to}`} replace />;
}

function Probe() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

// Mirrors App.tsx: a `/:locale` layout route with named children, plus a
// top-level `*` catch-all that sends anything unmatched to the locale home.
function Harness({ start }: { start: string }) {
  return (
    <MemoryRouter initialEntries={[start]}>
      <Probe />
      <Routes>
        <Route path="/:locale">
          <Route index element={null} />
          <Route path="markets" element={null} />
          <Route path="how-it-works" element={null} />
          <Route path="countries" element={<LocaleRedirect to="markets" />} />
        </Route>
        <Route path="*" element={<Navigate to="/de" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('retired marketing routes', () => {
  it('keeps /countries reachable and lands it on /markets (§11 P5 "SEO behalten")', async () => {
    const { getByTestId } = render(<Harness start="/de/countries" />);
    await waitFor(() => expect(getByTestId('path').textContent).toBe('/de/markets'));
  });

  it.each(['/de/services', '/de/advisory', '/de/providers'])(
    'sends the retired %s to the locale home instead of rendering nothing',
    async (path) => {
      const { getByTestId } = render(<Harness start={path} />);
      await waitFor(() => expect(getByTestId('path').textContent).toBe('/de'));
    },
  );

  it('still resolves the routes that stayed', async () => {
    for (const path of ['/de', '/de/markets', '/de/how-it-works']) {
      const { getByTestId, unmount } = render(<Harness start={path} />);
      await waitFor(() => expect(getByTestId('path').textContent).toBe(path));
      unmount();
    }
  });
});
