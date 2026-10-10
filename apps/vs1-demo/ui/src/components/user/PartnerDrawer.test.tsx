import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartnerDrawer } from './PartnerDrawer';
import type { AnonProvider } from '../../api/search';

// ─── Schublade · nicht buchbarer Anbieter ────────────────────────────────────
// Nutzer-Entscheidung 2026-10-01: kein Knopf und keine Termine, wenn der
// Anbieter nicht gebucht werden kann. Die Detailseite hielt sich daran, die
// Schublade nicht (Testlauf Phase 4, 2026-10-09).

const { fetchProviderDetail } = vi.hoisted(() => ({ fetchProviderDetail: vi.fn() }));

vi.mock('../../api/bookings', () => ({
  fetchProviderDetail: (...a: unknown[]) => fetchProviderDetail(...a),
  fetchSlots: vi.fn().mockResolvedValue([]),
  fetchAcknowledgement: vi.fn().mockResolvedValue(null),
  createBooking: vi.fn(),
  bookingFailureFrom: () => ({ kind: 'generic' }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

const PROVIDER = {
  public_ref: 'a1b2c3d4e5f6', title: 'Verified Provider A', letter: 'A', descriptor: 'Tax and VAT · Norditalien',
  region: null, active_since: 2015, specializations: [], languages: [], rating: null, completed_count: null,
  avg_response_hours: 3, billing_model: 'project', is_verified: true, match: 100, match_tier: 'high',
} as unknown as AnonProvider;

const DETAIL = { services: [], excluded_services: [], markets: [], languages: [], work_mode: null, credentials: [], pricing_table: [] };

function renderDrawer() {
  return render(
    <MemoryRouter>
      <PartnerDrawer open onClose={() => {}} provider={PROVIDER} />
    </MemoryRouter>,
  );
}

describe('PartnerDrawer · Buchbarkeit', () => {
  beforeEach(() => { fetchProviderDetail.mockReset(); });

  it('ohne Zahlungsbereitschaft: Hinweis statt Buchungsknopf', async () => {
    fetchProviderDetail.mockResolvedValue({ ...DETAIL, bookable_chargeable: false });
    renderDrawer();
    expect(await screen.findByText('detail.notBookableNote')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /detail\.bookCta/ })).not.toBeInTheDocument();
  });

  it('buchbar: der Knopf bleibt', async () => {
    fetchProviderDetail.mockResolvedValue({ ...DETAIL, bookable_chargeable: true });
    renderDrawer();
    expect(await screen.findByRole('button', { name: /detail\.bookCta/ })).toBeInTheDocument();
    expect(screen.queryByText('detail.notBookableNote')).not.toBeInTheDocument();
  });
});
