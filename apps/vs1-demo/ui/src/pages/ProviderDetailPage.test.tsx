import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderDetail } from '../api/bookings';
import { ProviderDetailPage } from './ProviderDetailPage';

const fetchProviderDetail = vi.fn();
vi.mock('../api/bookings', () => ({
  fetchProviderDetail: (...a: unknown[]) => fetchProviderDetail(...a),
  fetchProviderReviews: async () => ({ reviews: [], count: 0, average: null }),
  fetchSlots: async () => ['2026-11-02T09:00:00Z'],
  fetchUserBookings: async () => [],
}));
vi.mock('../lib/providerContext', () => ({ loadProviderContext: async () => null }));
vi.mock('../components/user/UserShell', () => ({ UserShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      typeof opts?.defaultValue === 'string' ? opts.defaultValue
        : opts && 'areas' in opts ? `${key}:${String(opts.areas)}` : key,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

const detail: ProviderDetail = {
  public_ref: 'aaaaaaaaaaaa', descriptor: 'Data and Privacy · Berlin', area_codes: ['data-privacy'],
  region: 'Berlin', active_since: 2015, specializations: [], markets: ['DE'], languages: ['de'],
  rating: null, completed_count: null, avg_response_hours: null, billing_model: 'project',
  pricing_table: null, is_verified: true, availability: 'available', bookable_chargeable: true,
};

const renderAt = (url: string) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/en/p/:ref" element={<ProviderDetailPage />} /></Routes>
  </MemoryRouter>,
);

// ─── F2 (Wizard-Audit, 23.10.2026): Profil aus "Anbieter ohne Passung" ───────
describe('ProviderDetailPage · coming from providers outside the request', () => {
  beforeEach(() => { fetchProviderDetail.mockResolvedValue(detail); });

  it('shows why there is no booking instead of the booking rail', async () => {
    renderAt('/en/p/aaaaaaaaaaaa?fit=outside&need=tax-vat');
    const rail = await screen.findByTestId('outside-fit-rail');
    expect(rail).toHaveTextContent('outside.profileTitle');
    expect(rail).toHaveTextContent('outside.profileBody:Tax & VAT');
    expect(screen.queryByText('detail.bookCta')).not.toBeInTheDocument();
  });

  it('keeps the booking rail on a normal visit', async () => {
    renderAt('/en/p/aaaaaaaaaaaa');
    expect(await screen.findByText('detail.bookCta')).toBeInTheDocument();
    expect(screen.queryByTestId('outside-fit-rail')).not.toBeInTheDocument();
  });
});
