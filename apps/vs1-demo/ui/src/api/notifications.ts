import { apiFetch } from './client';
import { fetchLastSeen, isUnread } from './reads';

// ─── Benachrichtigungen ───────────────────────────────────────────────────────
// Zwei verschiedene Dinge, die bis 2026-08-31 dieselbe Route benutzt haben:
//
//   fetchMyNotifications()  → GET /api/v1/notifications
//       Die Post des ANGEMELDETEN Kontos aus `public.notifications`. Jede Zeile
//       hat einen Empfaenger und einen eigenen Lesezeitpunkt.
//
//   fetchEventLogFeed()     → GET /api/v1/admin/events
//       Das BETRIEBSPROTOKOLL, neueste zuerst. Das ist eine Betriebssicht fuer
//       das Control Center, keine Nutzer-Post.
//
// Vorher lief beides ueber /api/v1/notifications, und das lieferte den
// event_log mit leerem Filter: jedes angemeldete Konto sah alle Zeilen aller
// Nutzer — und weil die Beschreibungszeile hier als roher Abzug der Nutzlast
// gebaut wurde (`Object.entries(payload).map(...)`), standen die Mailadressen
// aus den `email_sent`-Zeilen im Klartext darin. Beides ist mit der Trennung
// weg: die Nutzer-Post traegt nur Felder, die der Server ausdruecklich
// durchlaesst (services/compliance-api/src/notifications.ts → PayloadFelder).

// ─── Nutzer-Post ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'provider_confirmed'
  | 'provider_replied'
  | 'provider_declined'
  | 'engagement_message'
  | 'engagement_expired'
  | 'booking_rescheduled'
  | 'booking_cancelled';

/** Die Felder, die der Server durchlaesst. Keine Kontaktdaten, keine Freitexte. */
export interface NotificationPayload {
  providerKey?: string;
  providerName?: string;
  from?: string;
  to?: string;
  label?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  subject: 'engagement' | 'booking' | 'session' | null;
  subjectId: string | null;
  payload: NotificationPayload;
  createdAt: string;
  unread: boolean;
  /** Einfaerbung und Filterleiste. Kein Server-Feld, reine Anzeige-Sache. */
  kind: 'request' | 'termine' | 'sla';
}

/**
 * Welcher Anlass welche Spur bekommt. Anfragen sind Petrol, Termine neutral,
 * ein Ablauf ohne Antwort ist eine Warnung — dort ist etwas NICHT passiert.
 */
const KIND: Record<NotificationType, Notification['kind']> = {
  provider_confirmed: 'request',
  provider_replied: 'request',
  provider_declined: 'request',
  engagement_message: 'request',
  engagement_expired: 'sla',
  booking_rescheduled: 'termine',
  booking_cancelled: 'termine',
};

interface NotificationRow {
  id: string;
  type: string;
  subject: string | null;
  subject_id: string | null;
  payload?: NotificationPayload | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationsFeed {
  items: Notification[];
  unread: number;
}

export const LEERES_FACH: NotificationsFeed = { items: [], unread: 0 };

export async function fetchMyNotifications(): Promise<NotificationsFeed> {
  const res = await apiFetch<{ ok: boolean; notifications: NotificationRow[]; unread: number }>(
    '/api/v1/notifications',
  );
  const items = res.notifications
    // Ein unbekannter Typ waere eine Zeile ohne Text — der Server ist neuer
    // als dieses Bundle. Lieber weglassen als eine leere Karte zeigen.
    .filter((r): r is NotificationRow & { type: NotificationType } => r.type in KIND)
    .map((r) => ({
      id: r.id,
      type: r.type,
      subject: (r.subject as Notification['subject']) ?? null,
      subjectId: r.subject_id,
      payload: r.payload ?? {},
      createdAt: r.created_at,
      unread: !r.read_at,
      kind: KIND[r.type],
    }));
  return { items, unread: items.filter((i) => i.unread).length };
}

/** `{ id }` markiert eine Zeile, `{ all: true }` alle noch offenen. */
export async function markNotificationsRead(arg: { id?: string; all?: boolean }): Promise<number> {
  const res = await apiFetch<{ ok: boolean; marked: number }>('/api/v1/notifications/read', {
    method: 'POST',
    body: JSON.stringify(arg),
  });
  return res.marked;
}

// ─── Betriebsprotokoll (Control Center) ──────────────────────────────────────

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

const EVENT_KIND: Record<string, FeedItem['kind']> = {
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
  review_overdue_warning: 'sla',
  provider_downgraded_reviews: 'sla',
  provider_detail_opened: 'billing',
  provider_intake_submitted: 'system',
  provider_profile_updated: 'system',
};

// Human titles for v2 events — without this, the feed would show raw
// "reminder 24h"-style debug text (dashboard-v2 gap cluster G). English by
// design: the Control Center is an internal surface.
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
  review_overdue_warning: 'Warning: lead review overdue',
  provider_downgraded_reviews: 'Partner status downgraded (missing reviews)',
  provider_detail_opened: 'Profile detail opened',
  provider_intake_submitted: 'Partner package submitted',
  provider_profile_updated: 'Matchmaking profile updated',
};

// Aus der Nutzlast wird NUR gezeigt, was ein Bezeichner ist. Freitexte und
// alles, was nach einer Adresse aussieht, bleiben draussen — der Abzug lief
// frueher ueber alle Felder und trug damit die Mailadressen der
// `email_sent`-Zeilen ins Bild.
const EVENT_PAYLOAD_KEYS = ['engagementId', 'bookingId', 'providerKey', 'provider_key', 'status', 'stage', 'sessionId'];

function eventDesc(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '';
  return EVENT_PAYLOAD_KEYS
    .filter((k) => payload[k] !== undefined && payload[k] !== null)
    .map((k) => `${k}: ${String(payload[k])}`)
    .join(' · ');
}

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

export interface EventLogFeed {
  groups: FeedGroup[];
  lastSeen: string | null;
}

export const NOTIFICATIONS_VIEWER = 'provider-notifications';
export const USER_NOTIFICATIONS_VIEWER = 'user-notifications';

/**
 * Das Betriebsprotokoll. Die Route ist admin-pflichtig (403 fuer alle
 * anderen) — die Anbieter-Oberflaechen rufen sie noch auf und fallen damit
 * auf ihre Fixture zurueck, wie der Rest des Anbieter-Arbeitsbereichs. Eine
 * eigene Quelle fuer Anbieter gibt es noch nicht: Anbieter haengen an keinem
 * Konto, `providers` hat keine Spalte, die auf `auth.users` zeigt.
 */
export async function fetchEventLogFeed(viewer: string = NOTIFICATIONS_VIEWER): Promise<EventLogFeed> {
  const [{ events }, lastSeen] = await Promise.all([
    apiFetch<{ ok: boolean; events: EventRow[] }>('/api/v1/admin/events'),
    fetchLastSeen(viewer),
  ]);
  const groups = new Map<string, FeedItem[]>();
  for (const row of events) {
    const day = dayLabel(row.created_at);
    const item: FeedItem = {
      title: TITLE[row.type] ?? row.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      event: row.type,
      time: timeLabel(row.created_at),
      desc: eventDesc(row.payload),
      unread: isUnread(row.created_at, lastSeen),
      kind: EVENT_KIND[row.type] ?? 'system',
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
