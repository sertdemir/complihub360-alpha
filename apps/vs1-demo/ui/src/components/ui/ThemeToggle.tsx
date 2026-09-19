import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface ThemeToggleProps {
  /** Force foreground tone on dark/petrol bars where tokens don't apply. */
  inverse?: boolean;
  className?: string;
  /** Box size in px. NOT a Tailwind step — the project's spacing scale maps
   *  10 → 64px, so h-10 here would be 64 and not 40 (see Button.tsx). */
  size?: number;
  /** Glyph size in px. Raise it where the bar wants tighter optical spacing:
   *  the gap a reader sees is glyph-to-glyph, not box-to-box. */
  iconSize?: number;
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
// Light/dark switch for the header. Flips the `.dark` class via the theme engine;
// the choice persists and is restored before paint by the inline script in
// index.html. Icon shows the mode you'd switch TO.
export function ThemeToggle({ inverse = false, className = '', size = 38, iconSize = 19 }: ThemeToggleProps) {
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
      {isDark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}
