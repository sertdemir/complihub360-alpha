import { isSupabaseConfigured } from './supabase';

// ─── Konto-Umschalter (nur Staging) ──────────────────────────────────────────
//
// Wer auf Staging testet, wechselt dauernd zwischen Nutzer- und Partnerkonto
// (Testlauf Phase 4, 2026-10-09: buchen als Nutzer, Lead ansehen als Partner).
// Jeder Wechsel hiess Abmelden, Adresse, Passwort. Der Umschalter merkt sich
// die Supabase-Sitzungen, mit denen sich jemand in DIESEM Browser angemeldet
// hat, und setzt beim Wechsel die gemerkte Sitzung ein.
//
// Was gespeichert wird: Access- und Refresh-Token je Konto, in localStorage —
// dieselbe Art Ablage, in der supabase-js die laufende Sitzung ohnehin haelt.
// Keine Passwoerter, nichts auf dem Server, nichts fuer andere Browser.
//
// Wo er existiert: nur mit dem ausdruecklichen Staging-Schalter
// VITE_DEMO_LOGIN=1 (allein deploy-staging.yml setzt ihn) UND echter
// Supabase-Anmeldung. Ein Produktions-Build hat den Schalter nicht — dort
// rendert die Komponente nichts und es wird nichts gespeichert.

export const ACCOUNT_SWITCHER_KEY = 'staging_saved_accounts_v1';
const MAX_ACCOUNTS = 6;

export function resolveAccountSwitcher(o: { demoFlag: boolean; supabaseConfigured: boolean }): boolean {
  return o.demoFlag && o.supabaseConfigured;
}

export const isAccountSwitcherEnabled = resolveAccountSwitcher({
  demoFlag: import.meta.env.VITE_DEMO_LOGIN === '1',
  supabaseConfigured: isSupabaseConfigured,
});

export interface SavedAccount {
  userId: string;
  email: string | null;
  role: 'user' | 'partner' | 'admin';
  accessToken: string;
  refreshToken: string;
  savedAt: string;
}

/** Was aus einer Supabase-Sitzung gebraucht wird — bewusst schmal. */
export interface SessionLike {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> };
}

function roleOf(s: SessionLike): SavedAccount['role'] {
  const r = (s.user.app_metadata?.role ?? s.user.user_metadata?.role) as string | undefined;
  return r === 'partner' || r === 'admin' ? r : 'user';
}

export function loadAccounts(storage: Pick<Storage, 'getItem'> = localStorage): SavedAccount[] {
  try {
    const raw = JSON.parse(storage.getItem(ACCOUNT_SWITCHER_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((a) => a && typeof a.userId === 'string' && typeof a.refreshToken === 'string') : [];
  } catch {
    return [];
  }
}

function save(list: SavedAccount[], storage: Pick<Storage, 'setItem'>) {
  try { storage.setItem(ACCOUNT_SWITCHER_KEY, JSON.stringify(list)); } catch { /* voller oder gesperrter Speicher: Umschalter faellt aus, Anmeldung nicht */ }
}

/**
 * Merkt die laufende Sitzung. Bei jedem Token-Wechsel aufgerufen — Supabase
 * rotiert den Refresh-Token, und nur der juengste taugt fuer den Rueckweg.
 */
export function rememberSession(s: SessionLike, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage, now = new Date()): SavedAccount[] {
  const entry: SavedAccount = {
    userId: s.user.id,
    email: s.user.email ?? null,
    role: roleOf(s),
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    savedAt: now.toISOString(),
  };
  const rest = loadAccounts(storage).filter((a) => a.userId !== entry.userId);
  const next = [entry, ...rest].slice(0, MAX_ACCOUNTS);
  save(next, storage);
  return next;
}

/** Vergisst ein Konto — nach dem Abmelden (Token widerrufen) oder wenn der Wechsel scheitert. */
export function forgetAccount(userId: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): SavedAccount[] {
  const next = loadAccounts(storage).filter((a) => a.userId !== userId);
  save(next, storage);
  return next;
}

/** Wohin nach dem Wechsel: die Startseite der Rolle. */
export function homeFor(role: SavedAccount['role'], lang: string): string {
  return role === 'partner' ? `/${lang}/partner-dashboard` : role === 'admin' ? `/${lang}/admin` : `/${lang}/dashboard`;
}

export const ROLE_LABEL: Record<SavedAccount['role'], string> = { user: 'Nutzer', partner: 'Partner', admin: 'Admin' };
