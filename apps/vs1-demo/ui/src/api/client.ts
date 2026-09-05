import { generateCorrelationId } from '@complihub360/types/src/observability';
import { getAccessToken, isMockApi } from '../lib/supabase';

// ─── API client ───────────────────────────────────────────────────────────────
// Shared fetch wrapper for the compliance-api (services/compliance-api): base
// URL (VITE_API_URL or Vite dev-proxy), Supabase bearer token, x-api-key dev
// escape hatch, correlation id. All api/* modules go through this.

export class ApiError extends Error {
  constructor(message: string, public status: number, public correlationId: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const correlationId = generateCorrelationId();
  // Im Mock-Modus bleiben alle Aufrufe relativ, damit sie die Vite-Middleware
  // treffen — eine lokale .env mit VITE_API_URL=https://staging… schickte sie
  // sonst am Mock vorbei an die echte API (Befund 2026-09-05: "die Task-
  // Badges sind immer noch nicht da").
  const baseUrl = isMockApi ? '' : (import.meta.env.VITE_API_URL || '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    ...(init.headers as Record<string, string> | undefined),
  };

  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const devKey = import.meta.env.VITE_DEV_API_KEY as string | undefined;
  if (devKey) headers['x-api-key'] = devKey;

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { message?: string }));
    throw new ApiError(data.message || `HTTP ${res.status}`, res.status, correlationId);
  }
  return (await res.json()) as T;
}
