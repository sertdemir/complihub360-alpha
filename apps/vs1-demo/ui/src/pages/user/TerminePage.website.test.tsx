import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TerminePage } from './TerminePage';

// ─── Affiliate 1b · Website-Link nach der Buchung ────────────────────────────
// Bis 10.10.2026 zeigte der Link auf /api/v1/p/:ref/website. Der Endpunkt
// verlangt ein Bearer-Token, ein neuer Tab schickt keins — jeder Klick endete
// auf einer 401-JSON-Seite, genau fuer die, die gebucht haben. Jetzt: der Link
// zeigt direkt auf die offengelegte Website, gezaehlt wird per apiFetch.

const REF = 'a1b2c3d4e5f6';
const SITE = 'https://kanzlei.example';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}));
vi.mock('../../api/requests', () => ({ fetchUserRequests: vi.fn().mockResolvedValue([]) }));
vi.mock('../../components/user/UserShell', () => ({ UserShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../components/user/WizardDrawer', () => ({ useWizardDrawer: () => ({ openWizard: vi.fn() }) }));
vi.mock('../../lib/requestContext', () => ({
  useRequestContext: () => ({ beschreibung: () => 'Tax and VAT', kontext: () => 'ctx' }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en', language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const booking = {
  id: 'b1', public_ref: REF, provider_name: 'Kanzlei Beispiel', provider_descriptor: 'Tax and VAT',
  provider_area_codes: ['tax-vat'], provider_region: null, provider_website: SITE, identity_revealed: true,
  slot_start: new Date(Date.now() + 3 * 86_400_000).toISOString(), slot_end: null,
  status: 'confirmed', message: null,
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/api/v1/bookings') return { ok: true, bookings: [booking] };
    if (path === `/api/v1/p/${REF}/website`) return { url: SITE };
    throw new Error(`unerwarteter Aufruf ${path}`);
  });
});

const renderPage = () => render(<MemoryRouter><TerminePage /></MemoryRouter>);

describe('TerminePage · Website-Link (Affiliate 1b)', () => {
  it('zeigt direkt auf die offengelegte Website, nie auf den Token-Endpunkt', async () => {
    renderPage();
    const links = await screen.findAllByRole('link', { name: /termine\.website/ });
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a).toHaveAttribute('href', SITE);
      expect(a.getAttribute('href')).not.toMatch(/\/api\/v1\/p\//);
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('der Klick zaehlt ueber apiFetch (mit Token), nicht ueber eine Navigation', async () => {
    renderPage();
    const [link] = await screen.findAllByRole('link', { name: /termine\.website/ });
    fireEvent.click(link);
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/p/${REF}/website`);
  });

  it('ein Fehler beim Zaehlen bleibt still — der Link bleibt der Link', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/api/v1/bookings') return { ok: true, bookings: [booking] };
      throw new Error('403');
    });
    renderPage();
    const [link] = await screen.findAllByRole('link', { name: /termine\.website/ });
    fireEvent.click(link);
    await Promise.resolve();
    expect(link).toHaveAttribute('href', SITE);
  });
});
