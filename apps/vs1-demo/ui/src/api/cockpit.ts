import { apiFetch } from './client';

// ─── Cockpit API ──────────────────────────────────────────────────────────────
// GET /api/v1/admin/cockpit → the founder command-center read-model: five lenses
// aggregated across the live systems (services/compliance-api/src/cockpit.ts).
// Admin-only (server-to-server x-api-key, injected by the client in staging).

export interface CockpitAtRisk {
  id: string;
  provider_key: string;
  country: string;
  category: string;
  status: string;
  deadline: string | null;
  hoursLeft: number | null;
}

export interface Cockpit {
  generatedAt: string;
  watchersShadow: boolean;
  platformHealth: {
    api: 'up';
    db: 'reachable' | 'degraded';
    sources: Record<string, boolean>;
    recentErrorEvents: number;
    latestEventAt: string | null;
  };
  productEngagement: {
    engagementsTotal: number;
    engagementsToday: number;
    confirmRate: number | null;
    replyRate: number | null;
    sessionsActive: number;
  };
  money: {
    currency: string;
    invoices: { open: number; paid: number; failed: number; void: number; overdue: number; openCents: number; paidCents: number };
    subscriptions: { active: number; trialing: number; past_due: number; canceled: number; inactive: number };
    mrrEstimateCents: number;
  };
  voiceOfCustomer: {
    note: string;
    signals: { declined: number; withdrawn: number; remindersSent: number };
  };
  slaTrust: {
    breachedNow: number;
    breachEvents: number;
    autoReminders: number;
    expiries: number;
    downgrades: number;
    providers: { active: number; downgraded: number; inactive: number; totalBreachCount: number };
    atRisk: CockpitAtRisk[];
  };
  events: Array<{ type: string; at: string | null; payload?: Record<string, unknown> | null }>;
}

export async function fetchCockpit(): Promise<Cockpit> {
  const { cockpit } = await apiFetch<{ ok: boolean; cockpit: Cockpit }>('/api/v1/admin/cockpit');
  return cockpit;
}
