import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Modal ────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Modal" (739:2). Centered dialog: dimmed backdrop + panel
// (radius 10) with header (title + close), body, and footer (actions). Size
// sm/md/lg. Escape + backdrop-click close, body scroll-lock, role="dialog". Renders
// in a portal on <body>, so it inherits the app's `dark` class. Light + dark.

export type ModalSize = 'sm' | 'md' | 'lg';
const WIDTH: Record<ModalSize, string> = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  /** Footer actions (usually Buttons). */
  footer?: React.ReactNode;
  /** Hide the close ✕. */
  hideClose?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, size = 'md', footer, hideClose, children, className }: ModalProps) {
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn('relative flex w-full flex-col rounded-[10px] border border-stroke bg-surface shadow-xl', WIDTH[size], className)}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {(title || description || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
                <div className="min-w-0">
                  {title && <h2 className="text-[18px] font-semibold leading-snug text-fg">{title}</h2>}
                  {description && <p className="mt-1 text-body-sm text-fg-secondary">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 shrink-0 rounded-md p-1.5 text-fg-tertiary transition-colors hover:bg-surface-secondary hover:text-fg"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {children && <div className="px-6 py-2 text-body-sm leading-relaxed text-fg-secondary">{children}</div>}
            {footer && <div className="flex justify-end gap-3 px-6 pb-5 pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
