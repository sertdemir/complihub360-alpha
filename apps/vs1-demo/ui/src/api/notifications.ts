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
  engagementId?: string; // raw uuid — deep-link into the request thread
  bookingId?: string;    // v2: deep-link into the Termine page
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
  // Matchmaking v2 lifecycle (notifications-alerts-concept §1): bookings ride
  // on 'request' (teal), reminders/no-shows on 'sla' (warning), lead fees on
  // 'billing', reviews on 'review'.
  scheduling_started: 'request',
  scheduling_confirmed: 'request',
  provider_lead_charged: 'billing',
  reminder_24h: 'sla',
  reminder_1h: 'sla',
  provider_cancelled: 'sla',
  user_cancelled: 'system',
  user_rescheduled: 'system',
  outcome_check: 'system',
  no_show: 'sla',
  review_request: 'review',
  review_submitted: 'review',
  provider_detail_opened: 'billing',
  provider_intake_submitted: 'system',
  provider_profile_updated: 'system',
};

// Human titles for v2 events — without this, the feed would show raw
// "reminder 24h"-style debug text (dashboard-v2 gap cluster G).
const TITLE: Record<string, string> = {
  scheduling_started: 'Booking started',
  scheduling_confirmed: 'Appointment booked',
  provider_lead_charged: 'Lead billed',
  reminder_24h: 'Appointment reminder (24h)',
  reminder_1h: 'Appointment reminder (1h)',
  provider_cancelled: 'Provider cancelled the appointment',
  user_cancelled: 'Appointment cancelled',
  user_rescheduled: 'Appointment rescheduled',
  outcome_check: 'Did the appointment take place?',
  no_show: 'No-show recorded',
  review_request: 'Please rate your appointment',
  review_submitted: 'Review submitted',
  provider_detail_opened: 'Profile detail opened',
  provider_intake_submitted: 'Partner package submitted',
  provider_profile_updated: 'Matchmaking profile updated',
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
export const USER_NOTIFICATIONS_VIEWER = 'user-notifications';

export async function fetchNotificationsFeed(viewer: string = NOTIFICATIONS_VIEWER): Promise<NotificationsFeed> {
  const [{ notifications }, lastSeen] = await Promise.all([
    apiFetch<{ ok: boolean; notifications: EventRow[] }>('/api/v1/notifications'),
    fetchLastSeen(viewer),
  ]);
  if (!notifications.length) throw new Error('empty feed'); // keep the design fixture
  const groups = new Map<string, FeedItem[]>();
  for (const row of notifications) {
    const day = dayLabel(row.created_at);
    const payloadBits = row.payload
      ? Object.entries(row.payload).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
      : '';
    const item: FeedItem = {
      title: TITLE[row.type] ?? row.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      event: row.type,
      time: timeLabel(row.created_at),
      desc: payloadBits,
      unread: isUnread(row.created_at, lastSeen),
      kind: KIND[row.type] ?? 'system',
      action: row.payload?.bookingId
        ? 'Open Termine →'
        : row.payload?.engagementId ? `Open ${String(row.payload.engagementId).slice(0, 8)} →` : undefined,
      engagementId: row.payload?.engagementId ? String(row.payload.engagementId) : undefined,
      bookingId: row.payload?.bookingId ? String(row.payload.bookingId) : undefined,
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
