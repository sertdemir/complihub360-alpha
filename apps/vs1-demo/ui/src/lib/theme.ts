import { useEffect, useState } from 'react';

// ─── Theme engine ────────────────────────────────────────────────────────────
// Class-based light/dark (Tailwind `darkMode: ['class']`). Single source of
// truth = the `.dark` class on <html>. The initial class is applied by an inline
// snippet in index.html (before paint, no FOUC); this module keeps it in sync.

export type Theme = 'light' | 'dark';
const KEY = 'ch360-theme';

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Apply a theme to the DOM (class + color-scheme + meta theme-color). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#001c16' : '#ffffff');
}

/** Set + persist the theme and notify listeners. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>('ch360:themechange', { detail: theme }));
}

/** React hook: current theme + toggle. Follows the system pref until the user
 *  makes an explicit choice (which then persists). */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener('ch360:themechange', onChange);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSys = () => {
      if (!getStoredTheme()) setTheme(getSystemTheme());
    };
    mq.addEventListener?.('change', onSys);

    return () => {
      window.removeEventListener('ch360:themechange', onChange);
      mq.removeEventListener?.('change', onSys);
    };
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}
