import { apiFetch } from './client';

// ─── Read-state API (wiring map C1) ──────────────────────────────────────────
// One watermark per viewer key; anything newer than last_seen_at is unread.
// Keys are per-surface until provider auth lands ('provider-notifications',
// 'provider-requests').

export async function fetchLastSeen(viewer: string): Promise<string | null> {
  const res = await apiFetch<{ ok: boolean; last_seen_at: string | null }>(
    `/api/v1/reads?viewer=${encodeURIComponent(viewer)}`,
  );
  return res.last_seen_at;
}

export async function markSeen(viewer: string): Promise<string> {
  const res = await apiFetch<{ ok: boolean; last_seen_at: string }>('/api/v1/reads', {
    method: 'POST',
    body: JSON.stringify({ viewer }),
  });
  return res.last_seen_at;
}

export function isUnread(createdAt: string | undefined, lastSeen: string | null): boolean {
  if (!createdAt) return false;
  if (!lastSeen) return true; // never marked seen → everything is new
  return Date.parse(createdAt) > Date.parse(lastSeen);
}
