import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type UserRole = 'user' | 'partner' | 'admin';

// ─── Identity derivation ──────────────────────────────────────────────────────
// Role is a server-controlled claim. We set it in user_metadata at sign-up and
// (authoritatively) in app_metadata server-side; app_metadata wins when present.
function roleFromUser(user: User | null | undefined): UserRole {
  const r =
    (user?.app_metadata?.role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined);
  return r === 'partner' ? 'partner' : 'user';
}

function nameFromUser(user: User | null | undefined): string | null {
  return (
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    null
  );
}

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  userName: string | null;
  user: User | null;
  session: Session | null;
  /** true until the initial session check resolves (avoids guard flicker). */
  loading: boolean;

  /** Reflect a Supabase session into the store. Called by the auth listener. */
  setSession: (session: Session | null) => void;

  /**
   * DEV / compatibility local login. In real-auth mode the session listener
   * drives state, so this is only the dev-fallback path (no Supabase config)
   * and a post-sign-up convenience. Never grants real data access — the backend
   * rejects any request without a valid Supabase JWT.
   */
  login: (role: UserRole, userName?: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: null,
  userName: null,
  user: null,
  session: null,
  loading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoggedIn: !!session,
      role: session ? roleFromUser(session.user) : null,
      userName: session ? nameFromUser(session.user) : null,
      loading: false,
    }),

  login: (role, userName) => {
    // Dev fallback only — keep the preview usable before Supabase env is wired.
    if (!isSupabaseConfigured) {
      localStorage.setItem('demo_is_logged_in', 'true');
      localStorage.setItem('demo_user_role', role);
      if (userName) localStorage.setItem('demo_user_name', userName);
    }
    set({ isLoggedIn: true, role, userName: userName ?? null, loading: false });
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('demo_is_logged_in');
    localStorage.removeItem('demo_user_role');
    localStorage.removeItem('demo_user_name');
    set({ isLoggedIn: false, role: null, userName: null, user: null, session: null, loading: false });
  },
}));

// ─── One-time initialisation ──────────────────────────────────────────────────
if (isSupabaseConfigured && supabase) {
  // Real auth: hydrate from the persisted session, then track changes.
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
} else {
  // DEV demo fallback: hydrate the labelled demo flag (never used in prod auth).
  const isLoggedIn = localStorage.getItem('demo_is_logged_in') === 'true';
  useAuthStore.setState({
    isLoggedIn,
    role: (localStorage.getItem('demo_user_role') as UserRole) || null,
    userName: localStorage.getItem('demo_user_name'),
    loading: false,
  });
}
