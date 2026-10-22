import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import type { Cockpit } from '../../api/cockpit';
import { ApiError } from '../../api/client';

// ─── Founder Cockpit (22.10.2026) ────────────────────────────────────────────
// Wie das Control Center: eine Quote ohne Grundlage ist „—", eine Quelle, die
// nicht gelesen werden konnte, wird genannt und ihre Zahlen stehen als „—",
// ein Ladefehler zeigt keine Beispielzahlen.

const api = vi.hoisted(() => ({ fetchCockpit: vi.fn() }));
vi.mock('../../components/admin/AdminShell', () => ({ AdminShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../api/cockpit', async (orig) => ({ ...(await orig<typeof import('../../api/cockpit')>()), fetchCockpit: () => api.fetchCockpit() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { resolvedLanguage: 'en' } }) }));

import { CockpitPage } from './CockpitPage';

const zero = [0, 0, 0, 0, 0, 0, 0];
const cockpit = (over: Partial<Cockpit> = {}): Cockpit => ({
  generatedAt: new Date().toISOString(), watchersShadow: false, unavailable: [], truncated: [],
  platformHealth: { api: 'up', db: 'reachable', errorEvents7: 0, latestEventAt: null },
  product: { bookingsToday: 1, bookings7: 2, bookingsTotal: 5, heldRate: 1, sessionsActive: 3, sessions7: 2 },
  money: { baseCurrency: 'USD', mrr: { USD: 22700 }, unpriced: 0, subscriptions: { active: 3, pastDue: 0 }, invoices: { open: 1, paid: 2, failed: 0, overdue: 0, openAmounts: { USD: 4900 }, paidAmounts: { USD: 4900, EUR: 4600 } }, leadFees7: { charges: 2, collected: { USD: 7000 }, pending: 0, failed: 0 }, credits7: {}, assistantActive: 0 },
  voice: { reviews: { count: 2, avgRating: 4.5, fromUsers: 2, fromProviders: 0 }, userCancellations7: 0, disputesOpen: 0 },
  trust: { providers: { live: 3, onboarding: 1, paused: 0, suspended: 0, reverification: 0, ended: 0 }, providerNoShows30: 0, incidents30: 0, enforcementOpen: 0, appealsPending: 0, attention: [], attentionTotal: 0 },
  rates: { heldRate: 1, invoicesPaid: 0.67, billingReady: null, subscriptionsCurrent: 1 },
  events: [],
  series: { dates: ['16.10', '17.10', '18.10', '19.10', '20.10', '21.10', '22.10'], bookings: zero, sessions: zero, leadFeeCents: zero },
  ...over,
});

describe('Founder Cockpit', () => {
  beforeEach(() => { api.fetchCockpit.mockReset(); });

  it('Quote ohne Grundlage: „—" mit Hinweis statt 0 %', async () => {
    api.fetchCockpit.mockResolvedValue(cockpit());
    render(<CockpitPage />);
    expect(await screen.findByText('no basis yet')).toBeInTheDocument();
    expect(screen.getByText('Ready to bill')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    // Katalog in USD — kein Euro-Zeichen an einem Dollar-Betrag.
    expect(screen.getByText('$227')).toBeInTheDocument();
    // Gemischte Waehrungen nebeneinander, nicht summiert.
    expect(screen.getByText('$49 · €46')).toBeInTheDocument();
    expect(screen.getByText('No provider needs attention')).toBeInTheDocument();
  });

  it('nicht lesbare Quelle: genannt, ihre Zahlen stehen als „—"', async () => {
    api.fetchCockpit.mockResolvedValue(cockpit({
      unavailable: ['invoices', 'reviews'],
      money: { ...cockpit().money, invoices: null },
      voice: { reviews: null, userCancellations7: 0, disputesOpen: 0 },
    }));
    render(<CockpitPage />);
    expect(await screen.findByText('Not every source could be read')).toBeInTheDocument();
    expect(screen.getByText(/invoices, reviews/)).toBeInTheDocument();
    const reviews = screen.getByText('Reviews').closest('div')!.parentElement!;
    expect(reviews).toHaveTextContent('—');
  });

  it('Handlungsbedarf je Anbieter mit Grund, gekuerzte Liste mit „+N more"', async () => {
    api.fetchCockpit.mockResolvedValue(cockpit({ trust: { ...cockpit().trust, attention: [{ provider_key: 'meridian-legal', reason: 'past_due', since: null }], attentionTotal: 13 } }));
    render(<CockpitPage />);
    expect(await screen.findByText('meridian-legal')).toBeInTheDocument();
    expect(screen.getByText('payment overdue')).toBeInTheDocument();
    expect(screen.getByText('+12 more')).toBeInTheDocument();
  });

  it('Handlungsbedarf nicht pruefbar: keine Entwarnung', async () => {
    api.fetchCockpit.mockResolvedValue(cockpit({ unavailable: ['providers'], trust: { ...cockpit().trust, providers: null, attention: null } }));
    render(<CockpitPage />);
    expect(await screen.findByText(/Could not be fully checked/)).toBeInTheDocument();
    expect(screen.queryByText('No provider needs attention')).not.toBeInTheDocument();
  });

  it('Ladefehler: keine Beispielzahlen, sondern Hinweis mit Referenz', async () => {
    api.fetchCockpit.mockRejectedValue(new ApiError('boom', 500, 'ref-9'));
    render(<CockpitPage />);
    expect(await screen.findByText('Figures could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('common:states.technicalDetails')).toBeInTheDocument();
    expect(screen.queryByText('MRR')).not.toBeInTheDocument();
    expect(screen.queryByText('demo data')).not.toBeInTheDocument();
  });
});
