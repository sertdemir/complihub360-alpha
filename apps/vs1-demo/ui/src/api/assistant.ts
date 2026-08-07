import { apiFetch } from './client';

// ─── VAT assistant (chatbot plan phase ②) ─────────────────────────────────────
// POST /api/v1/assistant/chat — RAG answer over the internal knowledge base.
// 503 ASSISTANT_NOT_CONFIGURED until the model key is set server-side.

export type AssistantMessage = { role: 'user' | 'assistant'; content: string };
export type AssistantSource = { label: string };
export type AssistantReply = { ok: boolean; answer: string; sources: AssistantSource[] };

export function askAssistant(
  message: string,
  opts: { country?: string; history?: AssistantMessage[] } = {},
): Promise<AssistantReply> {
  return apiFetch<AssistantReply>('/api/v1/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, ...opts }),
  });
}

// ─── Phase ③: Assistant Pro (12 $/month via Stripe Checkout) ─────────────────

export function createAssistantCheckout(returnPath: string, email?: string): Promise<{ ok: boolean; url: string }> {
  return apiFetch<{ ok: boolean; url: string }>('/api/v1/assistant/checkout', {
    method: 'POST',
    body: JSON.stringify({ return_path: returnPath, ...(email ? { email } : {}) }),
  });
}

export function verifyAssistantSubscription(sessionId: string): Promise<{ ok: boolean; active: boolean; status?: string }> {
  return apiFetch<{ ok: boolean; active: boolean; status?: string }>('/api/v1/assistant/verify', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// Feature flag (phase ② ships dark): ?assistant=1 arms it per browser,
// ?assistant=0 disarms. The subscription gate (phase ③) sits server-side.
const FLAG_KEY = 'ch360_assistant';

export function assistantEnabled(): boolean {
  const param = new URLSearchParams(window.location.search).get('assistant');
  if (param === '1') localStorage.setItem(FLAG_KEY, '1');
  if (param === '0') localStorage.removeItem(FLAG_KEY);
  return localStorage.getItem(FLAG_KEY) === '1';
}
