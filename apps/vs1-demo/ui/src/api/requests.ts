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
  structured_answers?: { company?: string; requester_email?: string } & Record<string, unknown>;
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
  createdAt?: string; // raw ISO — C1 new-since-last-seen banner
  action: { label: string; variant: 'accent' | 'primary' | 'ghost' };
}

// Engagement lifecycle → RequestCard status axis.
const STATUS_MAP: Record<string, { status: RequestStatus; label: string; action: ProviderRequest['action'] }> = {
  created: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'accent' } },
  delivered: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'accent' } },
  viewed: { status: 'awaiting-confirm', label: 'Awaiting confirm', action: { label: 'Open · confirm', variant: 'accent' } },
  confirmed: { status: 'awaiting-reply', label: 'Awaiting reply', action: { label: 'Reply', variant: 'primary' } },
  replied: { status: 'active', label: 'Active', action: { label: 'View', variant: 'ghost' } },
};

// Dossier rule (Addendum 2026-07-10): the requester identity unlocks only
// after the provider confirms — before that the card stays anonymized.
const UNLOCKED_STATUSES = new Set(['confirmed', 'replied']);

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
        company: UNLOCKED_STATUSES.has(r.status)
          ? r.structured_answers?.company ?? 'Requester'
          : '🔒 Anonymized · unlocks on confirm',
        tag: [r.country, r.category].filter(Boolean).join(' · ') || undefined,
        meta: r.message || '',
        sla: m.status === 'active' ? undefined : slaLeft(r.status === 'confirmed' ? r.sla_reply_deadline : r.sla_confirm_deadline),
        createdAt: r.created_at,
        action: m.action,
      };
    });
}

// ─── User-side view of the same engagement rows (wiring map B11) ─────────────
export interface UserRequestRow {
  uuid: string;
  id: string;               // display line
  status: RequestStatus;
  statusLabel: string;
  company: string;
  partner?: boolean;
  meta: string;
  action: { label: string; variant: 'accent' | 'secondary' };
  bucket: 'confirm' | 'confirmed' | 'replied' | 'overdue' | 'active' | 'closed';
  /** Raw engagement status — the B14 actions drawer gates remind/withdraw on it. */
  rawStatus?: string;
}

const USER_VIEW: Record<string, Pick<UserRequestRow, 'status' | 'statusLabel' | 'action' | 'bucket'>> = {
  created:   { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'accent' }, bucket: 'confirm' },
  delivered: { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'accent' }, bucket: 'confirm' },
  viewed:    { status: 'awaiting-confirm', statusLabel: 'Awaiting confirmation', action: { label: 'Send reminder', variant: 'accent' }, bucket: 'confirm' },
  confirmed: { status: 'active', statusLabel: 'Provider confirmed', action: { label: 'View thread', variant: 'secondary' }, bucket: 'confirmed' },
  replied:   { status: 'awaiting-reply', statusLabel: 'Provider replied', action: { label: 'Open thread', variant: 'secondary' }, bucket: 'replied' },
  declined:  { status: 'active', statusLabel: 'Declined', action: { label: 'View request', variant: 'secondary' }, bucket: 'overdue' },
  expired:   { status: 'awaiting-confirm', statusLabel: 'Expired', action: { label: 'View request', variant: 'secondary' }, bucket: 'overdue' },
  withdrawn: { status: 'active', statusLabel: 'Withdrawn', action: { label: 'View thread', variant: 'secondary' }, bucket: 'closed' },
};

const PROVIDER_NAMES: Record<string, string> = {
  'studio-bianchi': 'Studio Bianchi SRL',
  'schmidt-partner': 'Schmidt & Partner',
  'madrid-tax': 'Madrid Tax Consultants',
  'dahlmann-cpa': 'Dahlmann CPA',
};

export async function fetchUserRequests(): Promise<UserRequestRow[]> {
  const { requests } = await apiFetch<{ ok: boolean; requests: EngagementRow[] }>('/api/v1/requests');
  return requests.map((r) => {
    const v = USER_VIEW[r.status] ?? USER_VIEW.created;
    return {
      uuid: r.id,
      id: `RQ-${r.id.slice(0, 4).toUpperCase()} · sent ${relTime(r.created_at)}`,
      status: v.status,
      statusLabel: v.statusLabel,
      company: PROVIDER_NAMES[r.provider_key] ?? r.provider_key,
      partner: true,
      meta: `↗ ${r.category} · ${r.country}`,
      action: v.action,
      bucket: v.bucket,
      rawStatus: r.status,
    };
  });
}
