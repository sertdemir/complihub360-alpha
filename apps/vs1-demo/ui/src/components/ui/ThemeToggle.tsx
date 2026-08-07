import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface ThemeToggleProps {
  /** Force foreground tone on dark/petrol bars where tokens don't apply. */
  inverse?: boolean;
  className?: string;
  size?: number;
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
// Light/dark switch for the header. Flips the `.dark` class via the theme engine;
// the choice persists and is restored before paint by the inline script in
// index.html. Icon shows the mode you'd switch TO.
export function ThemeToggle({ inverse = false, className = '', size = 38 }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={
        'grid place-items-center rounded-md transition-colors ' +
        (inverse
          ? 'text-fg-inverse/80 hover:text-fg-inverse hover:bg-white/10'
          : 'text-fg-secondary hover:text-fg hover:bg-surface-secondary') +
        ' ' +
        className
      }
      style={{ width: size, height: size }}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
