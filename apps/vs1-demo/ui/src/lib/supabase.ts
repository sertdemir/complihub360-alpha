import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
export const isDemoLoginEnabled = !isSupabaseConfigured || import.meta.env.VITE_DEMO_LOGIN === '1';

/**
 * The Supabase client, or null when env is not configured.
 *
 * Security model:
 *  - PRODUCTION builds require a configured client; there is NO demo fallback in
 *    prod (see useAuthStore), so auth is fail-closed.
 *  - DEV builds without config fall back to a clearly-labelled local demo login
 *    so the preview keeps working until VITE_SUPABASE_* are supplied.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // consume magic-link / OAuth tokens from the URL
        flowType: 'pkce',
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — using DEV demo auth fallback (NOT secure, dev only).'
  );
}

/** Returns the current access token (JWT) for authenticated API calls, or null. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
