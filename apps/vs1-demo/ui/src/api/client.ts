import { generateCorrelationId } from '@complihub360/types/src/observability';
import { getAccessToken, isMockApi } from '../lib/supabase';

// ─── API client ───────────────────────────────────────────────────────────────
// Shared fetch wrapper for the compliance-api (services/compliance-api): base
// URL (VITE_API_URL or Vite dev-proxy), Supabase bearer token, x-api-key dev
// escape hatch, correlation id. All api/* modules go through this.

export class ApiError extends Error {
  /** Wann der Fehler bemerkt wurde, ISO 8601 in UTC. Steht zusammen mit der
   *  Referenz-ID unter "Technical details" — der Support sucht mit beidem. */
  public readonly at: string;

  constructor(message: string, public status: number, public correlationId: string, at?: string) {
    super(message);
    this.name = 'ApiError';
    this.at = at ?? new Date().toISOString();
  }
}

/** Referenz fuer "Technical details": ID und Zeitpunkt eines gescheiterten
 *  API-Aufrufs, oder null, wenn der Fehler nicht aus `apiFetch` kommt. Eine
 *  Flaeche zeigt die Details nur, wenn es eine Referenz gibt — eine erfundene
 *  ID fuehrt den Support ins Leere. */
export function referenceOf(err: unknown): { id: string; at: string } | null {
  return err instanceof ApiError ? { id: err.correlationId, at: err.at } : null;
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

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    // Keine Antwort: Netz weg, Server nicht erreichbar, CORS. Gerade hier
    // braucht der Nutzer die Referenz — und nur der Browser hat sie. Bis
    // 2026-09-22 ging die ID an dieser Stelle verloren (roher TypeError).
    // Status 0 wie bisher: die Aufrufer lesen ihn schon als "kein HTTP-Fehler".
    throw new ApiError('Network error', 0, correlationId);
  }
  // Die ID, unter der der Server geloggt hat. Er uebernimmt die gesendete,
  // ersetzt sie aber, wenn sie nicht wie eine ID aussieht — dann zaehlt seine.
  const loggedAs = res.headers.get('x-correlation-id') || correlationId;
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { message?: string; correlationId?: string }));
    throw new ApiError(data.message || `HTTP ${res.status}`, res.status, data.correlationId || loggedAs);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // 200 mit kaputtem Koerper (Proxy-Fehlerseite o. ae.) ist ein Fehler wie jeder andere.
    throw new ApiError('Invalid response body', res.status, loggedAs);
  }
}
