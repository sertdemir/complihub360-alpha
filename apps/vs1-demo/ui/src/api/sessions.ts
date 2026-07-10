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
