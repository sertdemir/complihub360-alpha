// ─── Sitzung abgelaufen (G2, EN-Launch Schritt 2) ─────────────────────────────
// Figma 3634:3355, Canvas-Wahl G2 (09.10.2026): die Anmeldeseite mit dem
// abgenommenen Hinweis "Your session has expired", die E-Mail vorbelegt, und
// nach der Anmeldung zurueck auf die Seite, auf der es passierte.
//
// Bis 2026-10-10 merkte niemand den Ablauf: das SDK meldete SIGNED_OUT, der
// AuthGuard schickte stumm zur Anmeldung, und eine 401 der API liess jede
// Flaeche still in ihren Leer- oder Fehlerzustand fallen.
//
// Zwei Ausloeser, ein Weg:
//   - das SDK meldet SIGNED_OUT, ohne dass der Nutzer sich abgemeldet hat
//     (Refresh-Token abgelaufen oder widerrufen) — useAuthStore;
//   - die API antwortet 401 auf einen Aufruf MIT Token (abgelaufen,
//     widerrufen) — api/client.ts meldet es, SessionExpiryWatcher entscheidet.
// Gaeste und der Demo-Login senden kein Token; ihre 401 ist kein Ablauf.
//
// Gespeichert wird nur Adresse und Ruecksprung, und nur im Tab (sessionStorage);
// der Ruecksprung zusaetzlich kurz im localStorage, weil der Magic Link in
// einem neuen Tab landet.

const EXPIRED_KEY = 'ch360_session_expired';
const RETURN_KEY = 'ch360_return_to';
const RETURN_TTL_MS = 60 * 60 * 1000;
export const UNAUTHORIZED_EVENT = 'ch360:unauthorized';
const LOGOUT_KEY = 'ch360_logout_at';
const LOGOUT_WINDOW_MS = 10_000;

let intentionalLogout = false;

/** Vor jedem gewollten Abmelden — sonst hielte der Listener es fuer einen Ablauf. */
export function markIntentionalLogout() {
  intentionalLogout = true;
  try { sessionStorage.removeItem(EXPIRED_KEY); } catch { /* kein Speicher */ }
  // Andere Tabs bekommen das Abmelden ueber den Speicher-Abgleich des SDK als
  // SIGNED_OUT mit — ohne diese Marke hielten sie es fuer einen Ablauf.
  try { localStorage.setItem(LOGOUT_KEY, String(Date.now())); } catch { /* kein Speicher */ }
}

function recentlyLoggedOut(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(LOGOUT_KEY) ?? 0);
    return at > 0 && now - at < LOGOUT_WINDOW_MS;
  } catch {
    return false;
  }
}

/** Nach jeder neuen Anmeldung — ein spaeterer Ablauf zaehlt wieder. */
export function resetIntentionalLogout() {
  intentionalLogout = false;
}

/** Nur ein Pfad derselben App — nie eine fremde Adresse, kein //host. */
export function safeReturnPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  if (/\/(login|auth\/callback|register|reset-password)(\b|\/|\?|$)/.test(path)) return null;
  return path;
}

export interface ExpiredInfo {
  email: string | null;
  returnTo: string | null;
}

export function noteSessionExpired(email: string | null, returnTo: string | null) {
  if (intentionalLogout || recentlyLoggedOut()) return;
  const info: ExpiredInfo = { email, returnTo: safeReturnPath(returnTo) };
  try { sessionStorage.setItem(EXPIRED_KEY, JSON.stringify(info)); } catch { /* kein Speicher: der Hinweis entfaellt */ }
  rememberReturnTo(info.returnTo);
}

export function readExpired(): ExpiredInfo | null {
  try {
    const raw = sessionStorage.getItem(EXPIRED_KEY);
    return raw ? (JSON.parse(raw) as ExpiredInfo) : null;
  } catch {
    return null;
  }
}

export function clearExpired() {
  try { sessionStorage.removeItem(EXPIRED_KEY); } catch { /* kein Speicher */ }
}

export function rememberReturnTo(path: string | null) {
  const p = safeReturnPath(path);
  if (!p) return;
  try { localStorage.setItem(RETURN_KEY, JSON.stringify({ path: p, at: Date.now() })); } catch { /* kein Speicher */ }
}

/** Einmal lesbar und nur frisch — ein alter Ruecksprung fuehrt nirgends hin. */
export function takeReturnTo(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY);
    localStorage.removeItem(RETURN_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    return now - at <= RETURN_TTL_MS ? safeReturnPath(path) : null;
  } catch {
    return null;
  }
}

/** Fuer api/client.ts: eine 401 auf einen Aufruf mit Token. */
export function reportUnauthorized() {
  try { window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT)); } catch { /* kein window (Tests) */ }
}
