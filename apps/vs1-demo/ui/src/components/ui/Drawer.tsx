import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// ─── Drawer (Side Sheet) ──────────────────────────────────────────────────────
// Mirrors the Compass "Drawer Surface" (948:449). An overlay panel sliding in from
// the right (or left): header (eyebrow + title + close), scrollable body, footer.
// Size sm/md/lg → 440 / 520 / 540 (Compass SM / MD / L).
// Height is ADAPTIVE — hugs content, clamped to [--drawer-min-h, --drawer-max-h]
// (400 / 1000); beyond max the body scrolls while header + footer stay pinned.
// Dimmed backdrop, Escape + backdrop-click close, scroll-lock. Portal on <body> →
// inherits the app `dark` class. Light + dark.

export type DrawerSize = 'sm' | 'md' | 'lg';
export type DrawerSide = 'right' | 'left';
const WIDTH: Record<DrawerSize, string> = {
  sm: 'max-w-[var(--drawer-w-sm)]',
  md: 'max-w-[var(--drawer-w-md)]',
  lg: 'max-w-[var(--drawer-w-lg)]',
};

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Force dark theming — required when the drawer is opened from an
      always-dark workspace: the portal mounts on document.body, OUTSIDE the
      shell's `.dark` scope, so it would otherwise pick up light variables. */
  forceDark?: boolean;
  side?: DrawerSide;
  size?: DrawerSize;
  title?: React.ReactNode;
  /** Small uppercase label above the title (e.g. "DOMAIN"). */
  eyebrow?: React.ReactNode;
  /** Extra header content under the title (meta, description). */
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, side = 'right', size = 'md', title, eyebrow, headerExtra, footer, children, className, forceDark = false }: DrawerProps) {
  // Escape und Scroll-Lock gab es hier schon; der FOKUS fehlte. Ohne ihn blieb
  // er beim Ausloeser stehen, der erste Tab landete HINTER dem Panel, und beim
  // Schliessen kam er nicht zurueck. Zehn Komponenten haengen an diesem Drawer.
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  const offX = side === 'right' ? '100%' : '-100%';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[100]', forceDark && 'dark')}>
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[var(--drawer-scrim-blur)]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* Centering wrapper — pins the adaptive-height panel to the side edge,
              vertically centered. pointer-events-none so backdrop clicks pass through. */}
          <div
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center p-4',
              side === 'right' ? 'justify-end' : 'justify-start',
            )}
          >
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              className={cn(
                // Floating glass overlay: translucent surface + backdrop-blur frosts the
                // dimmed content behind; rounded (radius/3xl) with a soft ambient shadow.
                'pointer-events-auto flex w-full flex-col overflow-hidden rounded-[var(--radius-3xl)] border border-white/10 shadow-2xl',
                'bg-[var(--drawer-glass-bg)] backdrop-blur-[var(--drawer-glass-blur)]',
                'min-h-[var(--drawer-min-h)] max-h-[min(var(--drawer-max-h),calc(100dvh-2rem))]',
                WIDTH[size],
                className,
              )}
              initial={{ x: offX }}
              animate={{ x: 0 }}
              exit={{ x: offX }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stroke px-6 py-5">
                <div className="min-w-0">
                  {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{eyebrow}</p>}
                  {title && <h2 className="mt-1.5 font-serif text-[26px] font-bold leading-tight text-fg">{title}</h2>}
                  {headerExtra && <div className="mt-2 text-body-sm text-fg-secondary">{headerExtra}</div>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 shrink-0 rounded-md p-1.5 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Body fills the space between header + pinned footer; content stays
                  top-aligned so the footer sits at the bottom with breathing room. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-7">{children}</div>
              {footer && <div className="shrink-0 border-t border-stroke px-6 py-6">{footer}</div>}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
