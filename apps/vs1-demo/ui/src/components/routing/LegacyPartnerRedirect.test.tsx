import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LegacyPartnerRedirect } from './LegacyPartnerRedirect';

// Partner → Provider (15.10.2026): alte Adressen aus verschickten Mails und
// Lesezeichen muessen auf der neuen Seite landen — mit Unterpfad, Query und
// Anker. Die Routen-Formen spiegeln App.tsx.

function Probe() {
  const { pathname, search, hash } = useLocation();
  return <span data-testid="path">{pathname + search + hash}</span>;
}

function Harness({ start }: { start: string }) {
  return (
    <MemoryRouter initialEntries={[start]}>
      <Probe />
      <Routes>
        <Route path="/:locale">
          <Route path="provider-dashboard/*" element={null} />
          <Route path="provider-apply" element={null} />
          <Route path="provider-intake" element={null} />
          <Route path="partner-dashboard/*" element={<LegacyPartnerRedirect from="partner-dashboard" to="provider-dashboard" />} />
          <Route path="partner-apply" element={<LegacyPartnerRedirect from="partner-apply" to="provider-apply" />} />
          <Route path="partner-onboarding" element={<LegacyPartnerRedirect from="partner-onboarding" to="provider-intake" />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('LegacyPartnerRedirect', () => {
  it.each([
    ['/de/partner-dashboard/settings?calendar=connected', '/de/provider-dashboard/settings?calendar=connected'],
    ['/en/partner-dashboard/billing?from=portal#card', '/en/provider-dashboard/billing?from=portal#card'],
    ['/tr/partner-dashboard', '/tr/provider-dashboard'],
    ['/es/partner-apply', '/es/provider-apply'],
    ['/de/partner-onboarding?token=abc', '/de/provider-intake?token=abc'],
  ])('%s → %s', async (start, ziel) => {
    const { getByTestId } = render(<Harness start={start} />);
    await waitFor(() => expect(getByTestId('path').textContent).toBe(ziel));
  });

  it('Gegenprobe: eine neue Adresse bleibt, wo sie ist', async () => {
    const { getByTestId } = render(<Harness start="/de/provider-dashboard/termine?tab=anfragen" />);
    await waitFor(() => expect(getByTestId('path').textContent).toBe('/de/provider-dashboard/termine?tab=anfragen'));
  });
});
