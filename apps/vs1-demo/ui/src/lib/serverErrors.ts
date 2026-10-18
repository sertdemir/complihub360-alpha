import { ApiError, identityHintFrom, referenceOf } from '../api/client';

// ─── Server- und Auth-Fehler als eigene Saetze (Punkt 2, Wahl M1, 17.10.2026) ─
// Kein Text vom Server oder von Supabase erreicht die Oberflaeche: frueher
// stand dort `e.message` woertlich, englisch auch in de/es/tr. Erkannt wird
// nur ueber Codes (`errorCode`, `field`; bei Supabase `error.code`), nie ueber
// einen Textvergleich. Was keine Tabelle kennt, wird der allgemeine Satz der
// Flaeche plus Technical details mit Referenz.

/** errorCode eines API-Fehlers, sonst null (Netzfehler, unbekannt). */
export function errorCodeOf(err: unknown): string | null {
  return err instanceof ApiError && typeof err.body.errorCode === 'string' ? err.body.errorCode : null;
}

/** Das bemaengelte Feld eines VALIDATION_ERROR, sonst null. */
export function errorFieldOf(err: unknown): string | null {
  return err instanceof ApiError && err.body.errorCode === 'VALIDATION_ERROR' && typeof err.body.field === 'string' ? err.body.field : null;
}

export type AuthFailure = 'credentials' | 'unconfirmed' | 'rateLimit' | 'weakPassword' | 'samePassword' | 'exists' | 'unknown';

/** Supabase-Auth-Fehler → eigene Lage. Supabase-Texte zeigen wir nie. */
export function authFailureFrom(err: { code?: string; status?: number } | null | undefined): AuthFailure {
  const code = err?.code ?? '';
  if (code === 'invalid_credentials') return 'credentials';
  if (code === 'email_not_confirmed') return 'unconfirmed';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || code === 'over_sms_send_rate_limit' || err?.status === 429) return 'rateLimit';
  if (code === 'weak_password') return 'weakPassword';
  if (code === 'same_password') return 'samePassword';
  if (code === 'user_already_exists' || code === 'email_exists') return 'exists';
  return 'unknown';
}

// ─── Anbieter: Speichern in der Bewerbung (Wahl L1) ──────────────────────────
// Ein Grund, den die Person selbst beheben kann, ist ein eigener Satz; alles
// andere der allgemeine Hinweis mit Referenz. SERVICE_EXISTS und
// UNKNOWN_SERVICE_CODE stehen beim Hinzufuegen am Feld (der Aufrufer prueft
// sie vorher); hier landen sie nur aus anderen Wegen.
export type SaveFailure = { kind: 'text'; text: string } | { kind: 'generic'; reference: { id: string; at: string } | null };

export function saveFailureFrom(e: unknown, t: (key: string, opts?: Record<string, unknown>) => string): SaveFailure {
  const hint = identityHintFrom(e, t);
  if (hint) return { kind: 'text', text: hint };
  switch (errorCodeOf(e)) {
    case 'CATEGORY_ALLOWANCE': return { kind: 'text', text: t('application.services.allowanceError') };
    case 'SERVICE_CODE_FIXED': return { kind: 'text', text: t('application.errors.serviceCodeFixed') };
    case 'SERVICE_RETIRED': return { kind: 'text', text: t('application.errors.serviceRetired') };
    case 'SERVICE_EXISTS': return { kind: 'text', text: t('application.errors.serviceExists') };
  }
  return { kind: 'generic', reference: referenceOf(e) };
}
