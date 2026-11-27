import { apiFetch } from './client';

// ─── Bewerbung sichten, einladen, einloesen ──────────────────────────────────
// Gegenstueck zu services/compliance-api/src/providerInvites.ts.
//   Admin:  GET  /api/v1/admin/provider-applications
//           POST /api/v1/admin/provider-applications/:id/invite
//           POST /api/v1/admin/provider-applications/:id/decline
//   Offen:  GET  /api/v1/provider-invite?token=…
//           POST /api/v1/provider-invite/accept
// Bei den offenen Routen ist der Link der Ausweis.

export type ApplicationStatus = 'received' | 'invited' | 'onboarding' | 'declined';

export interface ProviderApplication {
  id: string;
  reference: string;
  created_at: string;
  locale: string;
  first_name: string | null;
  contact_name: string;
  email: string;
  firm: string;
  website: string | null;
  credentials: string;
  areas: string[];
  markets: string[];
  message: string | null;
  status: ApplicationStatus;
  invited_at: string | null;
  invite_expires_at: string | null;
  invite_expired: boolean;
  invite_send_count: number;
  redeemed_at: string | null;
  provider_key: string | null;
  declined_at: string | null;
  /** Der Grund, wie er in der Mail stand. */
  decline_reason: string | null;
}

export interface ApplicationList {
  applications: ProviderApplication[];
  counts: { total: number; received: number; invited: number; onboarding: number; declined: number };
}

export async function fetchApplications(): Promise<ApplicationList> {
  return apiFetch<ApplicationList>('/api/v1/admin/provider-applications');
}

export async function inviteApplication(id: string): Promise<ProviderApplication> {
  const r = await apiFetch<{ application: ProviderApplication }>(`/api/v1/admin/provider-applications/${id}/invite`, { method: 'POST', body: '{}' });
  return r.application;
}

export const DECLINE_REASON_MIN = 20;
export const DECLINE_REASON_MAX = 1200;

/** Lehnt ab und verschickt die Mail mit dem Grund. Der Grund steht in der Mail. */
export async function declineApplication(id: string, reason: string): Promise<ProviderApplication> {
  const r = await apiFetch<{ application: ProviderApplication }>(`/api/v1/admin/provider-applications/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) });
  return r.application;
}

export interface Invite { first_name: string | null; firm: string; email: string; expires_at: string | null }

export async function readInvite(token: string): Promise<Invite> {
  const r = await apiFetch<{ invite: Invite }>(`/api/v1/provider-invite?token=${encodeURIComponent(token)}`);
  return r.invite;
}

export async function acceptInvite(token: string, password: string): Promise<{ provider_key: string; email: string }> {
  return apiFetch<{ provider_key: string; email: string }>('/api/v1/provider-invite/accept', { method: 'POST', body: JSON.stringify({ token, password }) });
}
