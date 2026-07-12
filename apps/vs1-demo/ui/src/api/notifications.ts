import { apiFetch } from './client';
import { fetchLastSeen, isUnread } from './reads';

// ─── Notifications API ────────────────────────────────────────────────────────
// GET /api/v1/notifications → event_log rows, grouped by day for the feed pages.
// Unread comes from the C1 read-state watermark, not a per-row flag.

interface EventRow {
  id?: string;
  type: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface FeedItem {
  title: string;
  event: string;
  time: string;
  desc: string;
  action?: string;
  unread?: boolean;
  kind: 'request' | 'sla' | 'billing' | 'system' | 'review';
}

export interface FeedGroup {
  day: string;
  items: FeedItem[];
}

const KIND: Record<string, FeedItem['kind']> = {
  primary_request_submitted: 'request',
  request_routed: 'request',
  sla_reminder_sent: 'sla',
  engagement_completed: 'system',
  client_review_posted: 'review',
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function timeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diffMs / 60_000))} min ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export interface NotificationsFeed {
  groups: FeedGroup[];
  lastSeen: string | null;
}

export const NOTIFICATIONS_VIEWER = 'provider-notifications';

export async function fetchNotificationsFeed(): Promise<NotificationsFeed> {
  const [{ notifications }, lastSeen] = await Promise.all([
    apiFetch<{ ok: boolean; notifications: EventRow[] }>('/api/v1/notifications'),
    fetchLastSeen(NOTIFICATIONS_VIEWER),
  ]);
  if (!notifications.length) throw new Error('empty feed'); // keep the design fixture
  const groups = new Map<string, FeedItem[]>();
  for (const row of notifications) {
    const day = dayLabel(row.created_at);
    const payloadBits = row.payload
      ? Object.entries(row.payload).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
      : '';
    const item: FeedItem = {
      title: row.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      event: row.type,
      time: timeLabel(row.created_at),
      desc: payloadBits,
      unread: isUnread(row.created_at, lastSeen),
      kind: KIND[row.type] ?? 'system',
      action: row.payload?.engagementId ? `Open ${String(row.payload.engagementId).slice(0, 8)} →` : undefined,
    };
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return { groups: [...groups.entries()].map(([day, items]) => ({ day, items })), lastSeen };
}

// Lightweight unread counter for the sidebar badge (shell-level).
export async function fetchUnreadCount(): Promise<number> {
  const { groups } = await fetchNotificationsFeed();
  return groups.reduce((n, g) => n + g.items.filter((i) => i.unread).length, 0);
}
