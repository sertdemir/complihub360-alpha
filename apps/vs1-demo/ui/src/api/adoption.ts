import { apiFetch } from './client';

// ─── Signup adoption (Wave A3) ────────────────────────────────────────────────
// After a real Supabase login, the account claims the wizard sessions created
// as a guest (anchored on the localStorage guest_key, see sessions.ts). Fires
// once per user id — the flag remembers who already adopted so a page reload
// or token refresh does not re-post, while a different account on the same
// device still gets its own adoption run.

const GUEST_KEY = 'ch360_guest_key';
const ADOPTED_FOR = 'ch360_adopted_for';

let inFlight: Promise<void> | null = null;

export function adoptGuestSessions(userId: string): Promise<void> {
  const guestKey = localStorage.getItem(GUEST_KEY);
  if (!guestKey) return Promise.resolve();
  if (localStorage.getItem(ADOPTED_FOR) === userId) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      await apiFetch<{ ok: boolean; adopted: number }>('/api/v1/auth/adopt', {
        method: 'POST',
        body: JSON.stringify({ guest_key: guestKey }),
      });
      localStorage.setItem(ADOPTED_FOR, userId);
    } catch {
      // Non-fatal: retried on the next login / auth-state change.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
