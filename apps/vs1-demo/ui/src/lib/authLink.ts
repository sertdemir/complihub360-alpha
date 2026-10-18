// ─── Was ein Anmeldelink in der URL mitbringt ────────────────────────────────
//
// Bis 18.10.2026 liefen alle Mail-Links ueber PKCE: Der Browser, der den Link
// anfordert, legt einen Gegenschluessel ab, und nur er kann den Link einloesen.
// Wer die Mail auf dem Handy oder in einem anderen Browser oeffnete, landete
// nach 6 Sekunden Warten auf "Link abgelaufen", obwohl Supabase den Link
// angenommen hatte (Beta-Klicktest, Link 14 s alt).
//
// Jetzt tragen die Mail-Vorlagen einen token_hash (docs/email-templates), den
// jeder Browser einloesen kann. Bleiben zwei Faelle, die die Callback-Seite
// ehrlich benennen muss, statt zu raten:
//   - Supabase hat den Link abgelehnt (error_code in Query oder Hash),
//   - ein PKCE-Code kam an, aber hier fehlt der Gegenschluessel.

import type { EmailOtpType } from '@supabase/supabase-js';

export type AuthLinkFailure = 'expired' | 'invalid' | 'unredeemable';

export type AuthLinkParams =
  | { kind: 'token_hash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'error'; reason: Exclude<AuthLinkFailure, 'unredeemable'> }
  | { kind: 'code' }
  | { kind: 'none' };

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/** Liest Query und Hash; Supabase legt Fehler je nach Ablauf in den einen oder den anderen. */
export function readAuthLinkParams(search: string, hash: string): AuthLinkParams {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => q.get(k) ?? h.get(k);

  const errorCode = get('error_code');
  if (errorCode || get('error') || get('error_description')) {
    return { kind: 'error', reason: errorCode === 'otp_expired' ? 'expired' : 'invalid' };
  }
  const tokenHash = q.get('token_hash');
  const type = q.get('type') as EmailOtpType | null;
  if (tokenHash && type && OTP_TYPES.includes(type)) return { kind: 'token_hash', tokenHash, type };
  if (q.get('code')) return { kind: 'code' };
  return { kind: 'none' };
}

/** Die URL ohne die Einmal-Parameter: Ein Neuladen soll den Link nicht erneut einreichen. */
export function stripAuthLinkParams(href: string): string {
  const url = new URL(href);
  for (const k of ['token_hash', 'type', 'code', 'error', 'error_code', 'error_description']) url.searchParams.delete(k);
  return url.pathname + url.search;
}

// Ergebnis des Einloesens, damit die Callback-Seite es nach dem Laden des SDK
// lesen kann. Modulvariable statt Storage: Es gilt nur fuer diesen Seitenaufruf.
let lastFailure: AuthLinkFailure | null = null;
export const setAuthLinkFailure = (f: AuthLinkFailure | null) => { lastFailure = f; };
export const takeAuthLinkFailure = (): AuthLinkFailure | null => { const f = lastFailure; lastFailure = null; return f; };
