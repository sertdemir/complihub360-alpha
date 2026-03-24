import { create } from 'zustand';

export type UserRole = 'user' | 'partner';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  userName: string | null;
  login: (role: UserRole, userName?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: localStorage.getItem('is_logged_in') === 'true',
  role: (localStorage.getItem('user_role') as UserRole) || null,
  userName: localStorage.getItem('user_name') || null,

  login: (role: UserRole, userName?: string) => {
    localStorage.setItem('is_logged_in', 'true');
    localStorage.setItem('user_role', role);
    if (userName) localStorage.setItem('user_name', userName);
    set({ isLoggedIn: true, role, userName: userName || null });
  },

  logout: () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    set({ isLoggedIn: false, role: null, userName: null });
  },
}));
