import { apiFetch } from './client';

// ─── Engagement API ───────────────────────────────────────────────────────────
// GET/POST provider/* — the magic-link action flow (public action page).
// Anfragen entstehen heute ueber die Buchung (api/bookings.ts); der fruehere
// Helfer fuer POST /api/v1/engagement hatte keinen Aufrufer mehr und ist weg
// (Punkt 4, 18.10.2026).

// Anonymized dossier (Addendum 2026-07-10): what the provider sees BEFORE
// confirming — situational context + redacted message, never identity.
export interface EngagementDossier {
  country: string;
  category: string;
  structured_answers: Record<string, unknown>;
  message_redacted: string;
  created_at?: string;
  sla_confirm_deadline?: string;
}

export interface UnlockedDossier {
  message: string;
  requester_identity: { company: string | null; email: string | null };
}

export interface MagicTokenInfo {
  ok: boolean;
  action: 'confirm' | 'reply' | 'decline';
  engagementId: string;
  dossier: EngagementDossier | null;
}

export async function verifyMagicToken(token: string): Promise<MagicTokenInfo> {
  return apiFetch<MagicTokenInfo>(`/api/v1/provider/magic/${encodeURIComponent(token)}`);
}

export async function actOnEngagement(
  action: 'confirm' | 'reply' | 'decline',
  engagementId: string,
  token: string,
  message?: string,
): Promise<UnlockedDossier | null> {
  const res = await apiFetch<{ ok: boolean; unlocked?: UnlockedDossier | null }>(`/api/v1/provider/${action}`, {
    method: 'POST',
    body: JSON.stringify({ engagementId, token, ...(message ? { message } : {}) }),
  });
  return res.unlocked ?? null;
}
