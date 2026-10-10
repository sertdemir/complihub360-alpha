import { generateCorrelationId } from '@complihub360/types/src/observability';
import { ApiError } from './client';
import { isMockApi } from '../lib/supabase';

// ─── Kontakt und Partner-Bewerbung ───────────────────────────────────────────
// Server: services/compliance-api/src/contact.ts (POST /api/v1/contact).
// Bewusst NICHT ueber apiFetch: dessen TEMP-DEMO-DATEN-Zweig beantwortet auf
// Staging jeden Aufruf eines Demo-Logins aus dem Mock — hier hiesse das „Ihre
// Nachricht ist angekommen", ohne dass etwas abging. Die Route ist oeffentlich,
// ein Token braucht sie nicht.

export type ContactLane = 'support' | 'sales' | 'partner' | 'privacy' | 'application';

export interface ContactPayload {
  lane: ContactLane;
  locale: string;
  name: string;
  email: string;
  message?: string;
  firm?: string;
  website?: string;
  credentials?: string;
  areas?: string[];
  markets?: string[];
  /** Honeypot — bleibt bei Menschen leer. */
  hp?: string;
}

export type SendFailure = 'unavailable' | 'network' | 'rateLimit';

/** Postfach fuer den direkten Weg (Canvas C1, B2). Ohne Wert steht keine
 *  Adresse auf der Seite — nie eine erfundene. */
export const CONTACT_INBOX: string | null = (import.meta.env.VITE_CONTACT_INBOX as string | undefined)?.trim() || null;

/** Schickt die Nachricht. `acknowledged` sagt, ob die Bestaetigung an den
 *  Absender rausging. Wirft ApiError (Status 0 = keine Antwort). */
export async function sendContact(payload: ContactPayload): Promise<{ acknowledged: boolean }> {
  const correlationId = generateCorrelationId();
  const baseUrl = isMockApi ? '' : (import.meta.env.VITE_API_URL || '');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('Network error', 0, correlationId);
  }
  const loggedAs = res.headers.get('x-correlation-id') || correlationId;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(String(data.message ?? `HTTP ${res.status}`), res.status, String(data.correlationId ?? loggedAs), undefined, data);
  }
  return { acknowledged: data.acknowledged === true };
}

/** Welcher der drei Saetze (Canvas B): 503 → nicht eingerichtet, 429 → zu
 *  viele, alles andere (502, offline, 5xx) → Verbindung. */
export function failureOf(err: unknown): SendFailure {
  if (err instanceof ApiError && err.status === 503) return 'unavailable';
  if (err instanceof ApiError && err.status === 429) return 'rateLimit';
  return 'network';
}

/** Das Feld, das der Server bemaengelt hat (400), sonst null. */
export function invalidFieldOf(err: unknown): string | null {
  if (err instanceof ApiError && err.status === 400 && typeof err.body.field === 'string') return err.body.field;
  return null;
}

export const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
