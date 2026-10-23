import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { AdminStats } from '../../api/admin';
import { ApiError } from '../../api/client';

// ─── Control Center (20.10.2026) ─────────────────────────────────────────────
// Vorher: Nullen aus toten Tabellen, die wie „alles im Plan" aussahen. Hier
// steht fest: eine Quote ohne Grundlage ist „—" mit Hinweis, nie 0 %;
// Kunden-Uploads heissen „Not live"; ein Ladefehler zeigt keine Beispielzahlen.

const api = vi.hoisted(() => ({ fetchAdminStats: vi.fn() }));
vi.mock('../../components/admin/AdminShell', () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/admin', async (orig) => ({ ...(await orig<typeof import('../../api/admin')>()), fetchAdminStats: () => api.fetchAdminStats() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { AdminOverviewPage } from './AdminOverviewPage';

const zero = [0, 0, 0, 0, 0, 0, 0];
const stats = (over: Partial<AdminStats['bookings']> = {}, more: Partial<AdminStats> = {}): AdminStats => ({
  generatedAt: new Date().toISOString(), truncated: [],
  bookings: { today: 1, last7: 2, total: 5, upcoming7: 0, cancelled7: 0, noShows7: 0, disputesOpen: 0, unreported: 0, heldRate: null, disclosureAuditedRate: 1, reminderRate: null, ...over },
  watchlist: [],
  privacy: { aiRequests7: 0, aiRedacted7: 0, reveals7: 2, evidenceStored: 3, evidenceToReview: 1, customerUploads: null },
  security: { rateLimitPerMinute: 100, accessEvents7: 0, errorEvents7: 0 },
  events: [],
  series: { dates: ['14.10', '15.10', '16.10', '17.10', '18.10', '19.10', '20.10'], bookings: zero, cancelled: zero, noShows: zero, aiRequests: zero, aiRedacted: zero, reveals: zero },
  ...more,
});

describe('Control Center', () => {
  beforeEach(() => { api.fetchAdminStats.mockReset(); });

  it('Quote ohne Grundlage: „—" mit Hinweis statt 0 %', async () => {
    api.fetchAdminStats.mockResolvedValue(stats());
    render(<AdminOverviewPage />);
    expect(await screen.findAllByText('no basis yet')).toHaveLength(2);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByText('Disclosure audited')).toBeInTheDocument();
    expect(screen.getByText('All on track')).toBeInTheDocument();
  });

  it('Kunden-Uploads stehen als „Not live", nicht als 0', async () => {
    api.fetchAdminStats.mockResolvedValue(stats());
    render(<AdminOverviewPage />);
    expect(await screen.findByText('Not live')).toBeInTheDocument();
    expect(screen.getByText(/upload pipeline for customer documents is not active/)).toBeInTheDocument();
  });

  it('offene Einsprueche stehen oben und in der Watchlist', async () => {
    api.fetchAdminStats.mockResolvedValue(stats({ disputesOpen: 1 }, { watchlist: [
      { id: 'b7f2c1a0-x', provider_key: 'meridian-legal', slot_start: new Date().toISOString(), flag: 'dispute', msUntil: -2 * 86_400_000 },
      { id: 'a90d77e2-y', provider_key: 'baltika-tax', slot_start: new Date().toISOString(), flag: 'reminder_missing', msUntil: 5 * 3_600_000 },
    ] }));
    render(<AdminOverviewPage />);
    expect(await screen.findByText('1 open dispute')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('dispute open')).toBeInTheDocument();
    expect(within(rows[1]).getByText('2d ago')).toBeInTheDocument();
    expect(within(rows[2]).getByText('reminder missing')).toBeInTheDocument();
  });

  it.each([
    [{}, { security: { rateLimitPerMinute: 100, accessEvents7: 0, errorEvents7: 3 } }, '3 error events'],
    [{ unreported: 2 }, {}, '2 not yet reported'],
    [{}, { truncated: ['event_log' as const] }, 'Read incomplete'],
  ])('kein „All on track", solange etwas offen oder ungelesen ist (%#)', async (b, more, text) => {
    api.fetchAdminStats.mockResolvedValue(stats(b, more));
    render(<AdminOverviewPage />);
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(screen.queryByText('All on track')).not.toBeInTheDocument();
  });

  it('nennt unvollstaendig gelesene Quellen', async () => {
    api.fetchAdminStats.mockResolvedValue(stats({ total: 500 }, { truncated: ['scheduling', 'event_log'] }));
    render(<AdminOverviewPage />);
    expect(await screen.findByText(/Not every row could be read \(scheduling, event_log\)/)).toBeInTheDocument();
    expect(screen.getByText(/500\+ total/)).toBeInTheDocument();
  });

  it('Ladefehler: keine Beispielzahlen, sondern Hinweis mit Referenz', async () => {
    api.fetchAdminStats.mockRejectedValue(new ApiError('boom', 500, 'ref-42'));
    render(<AdminOverviewPage />);
    expect(await screen.findByText('Figures could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('common:states.technicalDetails')).toBeInTheDocument();
    expect(screen.queryByText('Appointments held')).not.toBeInTheDocument();
    expect(screen.queryByText('demo data')).not.toBeInTheDocument();
    expect(screen.queryByText(/open dispute/)).not.toBeInTheDocument();
  });
});
