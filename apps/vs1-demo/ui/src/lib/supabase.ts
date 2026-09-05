import type { SupabaseClient } from '@supabase/supabase-js';

// Public, browser-safe Supabase values. The ANON key is designed to be public;
// the SERVICE_ROLE key must NEVER appear in any VITE_ variable.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when real Supabase Auth is configured. Drives the auth strategy. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Demo login availability. Defaults to "only when real auth is absent";
 * staging sets VITE_DEMO_LOGIN=1 to keep the one-click stakeholder logins
 * alongside real auth. Never set the flag in production builds.
 */
// Mock-API-Modus (VITE_MOCK_API=1, nur `vite dev`): die Daten kommen aus dem
// eingebauten Datensatz, ein echter Login waere ein Magic-Link ins Leere —
// deshalb schaltet der Mock-Schalter den Demo-Login gleich mit frei.
export const isMockApi = import.meta.env.DEV && import.meta.env.VITE_MOCK_API === '1';
export const isDemoLoginEnabled = !isSupabaseConfigured || import.meta.env.VITE_DEMO_LOGIN === '1' || isMockApi;

/**
 * The Supabase client, or null when env is not configured.
 *
 * Security model:
 *  - PRODUCTION builds require a configured client; there is NO demo fallback in
 *    prod (see useAuthStore), so auth is fail-closed.
 *  - DEV builds without config fall back to a clearly-labelled local demo login
 *    so the preview keeps working until VITE_SUPABASE_* are supplied.
 */
// @supabase/supabase-js wiegt ~206 kB roh / 60 kB gzip (auth-js, realtime,
// storage, postgrest). Bis 20.08. lag es im Einstiegs-Chunk, weil dieses Modul
// den Client auf Modulebene erzeugte — ein anonymer Besucher auf /de/imprint lud
// den Realtime- und Storage-Client mit. Jetzt kommt er beim ersten Bedarf.
//
// Der Import wird gemerkt, nicht wiederholt: mehrere Aufrufer teilen sich
// EINEN Client, sonst liefen mehrere onAuthStateChange-Abonnements nebeneinander.
let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Der Supabase-Client, oder null wenn die Umgebung ihn nicht konfiguriert.
 * Asynchron, weil das SDK nachgeladen wird — Aufrufer, die vorher `supabase`
 * synchron lasen, muessen awaiten.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url as string, anonKey as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // consume magic-link / OAuth tokens from the URL
          flowType: 'pkce',
        },
      }),
    );
  }
  return clientPromise;
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — using DEV demo auth fallback (NOT secure, dev only).'
  );
}

/** Returns the current access token (JWT) for authenticated API calls, or null. */
export async function getAccessToken(): Promise<string | null> {
  const client = await getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
