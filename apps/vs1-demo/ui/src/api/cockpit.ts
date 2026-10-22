import { apiFetch } from './client';

// ─── Cockpit API ──────────────────────────────────────────────────────────────
// GET /api/v1/admin/cockpit → the founder command-center read-model: five lenses
// aggregated across the live systems (services/compliance-api/src/cockpit.ts).
// Admin-only (Admin-JWT oder Server-Key).
//
// 22.10.2026: neue Form. Vorher kamen Produkt, Kundenstimme und SLA aus dem
// alten Anfragemodell (`engagement_requests`, tot seit 01.09.). Jetzt
// Buchungen, Tarife, Lead-Gebuehren, Bewertungen und der Lebenszyklus der
// Anbieter. Eine Quelle, die nicht gelesen werden konnte, steht in
// `unavailable` — ihre Zahlen sind null, nie 0.

export type CockpitSource =
  | 'scheduling' | 'event_log' | 'sessions' | 'invoices' | 'provider_subscriptions' | 'pricing'
  | 'provider_lead_ledger' | 'provider_credits' | 'reviews' | 'providers' | 'provider_performance_incidents'
  | 'provider_enforcement_actions' | 'user_subscriptions' | 'provider_lead_ledger_payment_events' | 'event_feed';

/** Betraege je Waehrung, in Cent (z. B. { USD: 5900, EUR: 4600 }). */
export type Amounts = Record<string, number>;

export type AttentionReason = 'suspended' | 'enforcement' | 'past_due' | 'incident' | 'billing_blocked' | 'reverification_due';

export interface Cockpit {
  generatedAt: string;
  watchersShadow: boolean;
  unavailable: CockpitSource[];
  truncated: CockpitSource[];
  platformHealth: { api: 'up'; db: 'reachable' | 'degraded'; errorEvents7: number | null; latestEventAt: string | null };
  product: {
    bookingsToday: number | null; bookings7: number | null; bookingsTotal: number | null;
    heldRate: number | null; sessionsActive: number | null; sessions7: number | null;
  };
  money: {
    baseCurrency: string;
    mrr: Amounts | null;
    unpriced: number;
    subscriptions: { active: number; pastDue: number } | null;
    invoices: { open: number; paid: number; failed: number; overdue: number; openAmounts: Amounts; paidAmounts: Amounts } | null;
    leadFees7: { charges: number; collected: Amounts; pending: number; failed: number } | null;
    credits7: Amounts | null;
    assistantActive: number | null;
  };
  voice: {
    reviews: { count: number; avgRating: number | null; fromUsers: number; fromProviders: number } | null;
    userCancellations7: number | null;
    disputesOpen: number | null;
  };
  trust: {
    providers: { live: number; onboarding: number; paused: number; suspended: number; reverification: number; ended: number } | null;
    providerNoShows30: number | null;
    incidents30: number | null;
    enforcementOpen: number | null;
    appealsPending: number | null;
    /** null: eine der Quellen fehlte — "niemand" laesst sich dann nicht behaupten. */
    attention: Array<{ provider_key: string; reason: AttentionReason; since: string | null }> | null;
    attentionTotal: number;
  };
  rates: { heldRate: number | null; invoicesPaid: number | null; billingReady: number | null; subscriptionsCurrent: number | null };
  events: Array<{ type: string; payload: Record<string, unknown>; created_at: string | null }>;
  /** `leadFeeCents` nur bei genau einer Waehrung, sonst null. */
  series: { dates: string[]; bookings: number[]; sessions: number[]; leadFeeCents: number[] | null };
}

export async function fetchCockpit(): Promise<Cockpit> {
  const { cockpit } = await apiFetch<{ ok: boolean; cockpit: Cockpit }>('/api/v1/admin/cockpit');
  return cockpit;
}
