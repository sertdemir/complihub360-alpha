import { apiFetch } from './client';

// ─── Engagement thread API (wiring map B1/B2/B11) ────────────────────────────
// One shared history per engagement: the requester's opening message, dashboard
// replies from either side, and magic-link replies all land in the same thread.

export interface ThreadMessage {
  id: string;
  author: 'user' | 'provider' | 'system';
  body: string;
  created_at: string;
}

export interface EngagementDetail {
  engagement: {
    id: string;
    provider_key: string;
    country: string;
    category: string;
    status: string;
    message?: string;
    created_at: string;
    sla_confirm_deadline?: string;
    sla_reply_deadline?: string;
  };
  messages: ThreadMessage[];
}

export async function fetchEngagementDetail(id: string): Promise<EngagementDetail> {
  const res = await apiFetch<{ ok: boolean } & EngagementDetail>(`/api/v1/engagement/${id}`);
  return { engagement: res.engagement, messages: res.messages };
}

export async function postThreadMessage(id: string, author: 'user' | 'provider', body: string): Promise<void> {
  await apiFetch(`/api/v1/engagement/${id}/message`, {
    method: 'POST',
    body: JSON.stringify({ author, body }),
  });
}
