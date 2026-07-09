import { apiFetch } from './client';
import type { RequestStatus } from '../components/ui/RequestCard';

// ─── Requests API ─────────────────────────────────────────────────────────────
// GET /api/v1/requests (compliance-api) → provider request inbox. Maps the raw
// engagement_requests rows onto the shape the RequestCard pages consume.

export interface EngagementRow {
  id: string;
  provider_key: string;
  country?: string;
  category?: string;
  message?: string;
  status: 'created' | 'delivered' | 'confirmed' | 'replied' | 'declined' | 'expired' | string;
  sla_confirm_deadline?: string;
  sla_reply_deadline?: string;
  created_at: string;
}

export interface ProviderRequest {
  id: string;
  idLine: string;
  status: RequestStatus;
  statusLabel: string;
  company: string;
  tag?: string;
  meta: string;
  sla?: string;
  action: { label: string; variant: 'accent' | 'primary' | 'ghost' };
}

// Engagement lifecycle → RequestCard status axis.
const STATUS_MAP: Record<string, { status: RequestStatus; label: string; action: ProviderRequest['action'] }> = {
  created: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'accent' } },
  delivered: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'accent' } },
  confirmed: { status: 'awaiting-reply', label: 'Awaiting reply', action: { label: 'Reply', variant: 'primary' } },
  replied: { status: 'active', label: 'Active', action: { label: 'View', variant: 'ghost' } },
};

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diffMs / 60_000))} min ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

function slaLeft(iso?: string): string | undefined {
  if (!iso) return undefined;
  const left = new Date(iso).getTime() - Date.now();
  if (left <= 0) return 'overdue';
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export async function fetchProviderRequests(): Promise<ProviderRequest[]> {
  const { requests } = await apiFetch<{ ok: boolean; requests: EngagementRow[] }>('/api/v1/requests');
  return requests
    .filter((r) => r.status in STATUS_MAP)
    .map((r) => {
      const m = STATUS_MAP[r.status];
      return {
        id: r.id,
        idLine: `RQ-${r.id.slice(0, 4).toUpperCase()} · ${relTime(r.created_at)}`,
        status: m.status,
        statusLabel: m.label,
        company: r.provider_key,
        tag: [r.country, r.category].filter(Boolean).join(' · ') || undefined,
        meta: r.message || '',
        sla: m.status === 'active' ? undefined : slaLeft(r.status === 'confirmed' ? r.sla_reply_deadline : r.sla_confirm_deadline),
        action: m.action,
      };
    });
}
