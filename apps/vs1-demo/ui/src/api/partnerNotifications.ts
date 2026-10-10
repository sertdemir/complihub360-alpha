import { apiFetch } from './client';

// ─── Partner-Post (Canvas-Wahl A V2 · B V1 · C, 2026-10-10) ──────────────────
// Bis hierhin lasen Glocke und Seite des Partners das Betriebsprotokoll
// (`/api/v1/admin/events`), und das antwortet Partnern mit 403 — sie sahen
// keine einzige ihrer Nachrichten, obwohl der Server sie in
// `public.notifications` an die `provider_members` schreibt. Jetzt lesen
// beide die eigene Post, wie die Nutzerseite.
//
// `needsAction` kommt vom Server und folgt der LAGE (Sperre steht, Rechnung
// offen), nicht dem Lesen — „Needs you" verschwindet, wenn die Sache erledigt
// ist (services/compliance-api/src/notifications.ts → needsAction).

export type PartnerNotificationType =
  | 'booking_created' | 'appointment_reminder' | 'dispute_opened' | 'dispute_resolved'
  | 'performance_incident' | 'credit_issued' | 'payment_failed' | 'invoice_retry_scheduled'
  | 'subscription_scheduled' | 'subscription_schedule_done'
  | 'verification_info_requested' | 'verification_decided' | 'verification_activated' | 'evidence_expiring'
  // Phase 6 (ADR-0009): Serien-No-Shows und Durchsetzung.
  | 'serial_no_show_alert' | 'booking_paused' | 'enforcement_decided';

export type PartnerTopic = 'appointments' | 'billing' | 'verification' | 'plan';

/** Thema (Filter) und Ziel (wohin ein Klick fuehrt) je Art. */
export const PARTNER_TYPES: Record<PartnerNotificationType, { topic: PartnerTopic; to: string }> = {
  booking_created: { topic: 'appointments', to: 'termine' },
  appointment_reminder: { topic: 'appointments', to: 'termine' },
  dispute_opened: { topic: 'appointments', to: 'termine' },
  dispute_resolved: { topic: 'appointments', to: 'termine' },
  performance_incident: { topic: 'appointments', to: 'performance' },
  credit_issued: { topic: 'billing', to: 'billing' },
  payment_failed: { topic: 'billing', to: 'billing' },
  invoice_retry_scheduled: { topic: 'billing', to: 'billing' },
  subscription_scheduled: { topic: 'plan', to: 'subscription' },
  subscription_schedule_done: { topic: 'plan', to: 'subscription' },
  verification_info_requested: { topic: 'verification', to: 'verification' },
  verification_decided: { topic: 'verification', to: 'verification' },
  verification_activated: { topic: 'verification', to: 'verification' },
  evidence_expiring: { topic: 'verification', to: 'verification' },
  serial_no_show_alert: { topic: 'appointments', to: 'performance' },
  booking_paused: { topic: 'appointments', to: 'performance' },
  enforcement_decided: { topic: 'appointments', to: 'performance' },
};

export interface PartnerNotification {
  id: string;
  type: PartnerNotificationType;
  payload: Record<string, string>;
  createdAt: string;
  unread: boolean;
  needsAction: boolean;
  topic: PartnerTopic;
  /** Pfad unter /partner-dashboard/. */
  to: string;
}

interface Row {
  id: string; type: string; payload?: Record<string, string> | null;
  created_at: string; read_at: string | null; needs_action?: boolean;
}

export async function fetchPartnerNotifications(): Promise<PartnerNotification[]> {
  const res = await apiFetch<{ ok: boolean; notifications: Row[] }>('/api/v1/notifications');
  return (res.notifications || [])
    // Unbekannte Arten (Server neuer als das Bundle) lieber weglassen als eine leere Zeile zeigen.
    .filter((r): r is Row & { type: PartnerNotificationType } => r.type in PARTNER_TYPES)
    .map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload ?? {},
      createdAt: r.created_at,
      unread: !r.read_at,
      needsAction: !!r.needs_action,
      topic: PARTNER_TYPES[r.type].topic,
      to: PARTNER_TYPES[r.type].to,
    }));
}
