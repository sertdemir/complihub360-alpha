import { apiFetch } from './client';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Sessions API (Wave A1) ───────────────────────────────────────────────────
// The wizard result becomes a persistent session (the user-side dossier).
// Guests anchor via a random guest_key; registration adopts these later.

const GUEST_KEY = 'ch360_guest_key';
const LAST_SESSION = 'ch360_last_session_id';

export function ensureGuestKey(): string {
  let k = localStorage.getItem(GUEST_KEY);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, k);
  }
  return k;
}

export function lastSessionId(): string | null {
  return localStorage.getItem(LAST_SESSION);
}

// ─── Session list + actions (wiring map B13) ─────────────────────────────────
export interface SessionRowData {
  id: string;
  country: string | null;
  markets: string[];
  categories: string[];
  label: string | null;
  status: 'active' | 'archived';
  risk_summary: { level?: string; note?: string } | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSessions(): Promise<SessionRowData[]> {
  const guestKey = localStorage.getItem(GUEST_KEY);
  if (!guestKey) return [];
  const res = await apiFetch<{ ok: boolean; sessions: SessionRowData[] }>(
    `/api/v1/sessions?guest_key=${encodeURIComponent(guestKey)}`,
  );
  return res.sessions;
}

export async function patchSession(id: string, patch: { label?: string; status?: 'active' | 'archived' }): Promise<void> {
  await apiFetch(`/api/v1/session/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function duplicateSession(id: string): Promise<string> {
  const res = await apiFetch<{ ok: boolean; id: string }>(`/api/v1/session/${id}/duplicate`, { method: 'POST', body: '{}' });
  return res.id;
}

export async function saveWizardSession(profile: SearchProfile): Promise<string> {
  const res = await apiFetch<{ ok: boolean; id: string }>('/api/v1/session', {
    method: 'POST',
    body: JSON.stringify({
      guest_key: ensureGuestKey(),
      country: profile.country || null,
      markets: profile.markets || [],
      categories: profile.categories || [],
      answers: profile,
    }),
  });
  localStorage.setItem(LAST_SESSION, res.id);
  return res.id;
}
