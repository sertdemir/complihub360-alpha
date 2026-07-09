import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Toast ──────────────────────────────────────────────────────────────────
// Transient notification system. `ToastProvider` holds the queue in context and
// renders a portal stack (bottom-right) on <body>, so it inherits the app's
// `dark` class. `useToast()` returns `{ toast }` to enqueue. Each toast is a
// mode-aware surface card with a status icon, title, optional description, and a
// manual close ✕; auto-dismisses after `duration` (default 4000ms). Light + dark.
//   status: info · success · warning · error

export type ToastStatus = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  status?: ToastStatus;
  /** Auto-dismiss delay in ms (default 4000). */
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// status → icon + accent color. status CSS vars only carry {bg,500,700}, so for
// the icon accent we use tailwind statics (matches Banner.tsx): -500 light, -400 dark.
const STATUS: Record<ToastStatus, { Icon: LucideIcon; accent: string }> = {
  info: { Icon: Info, accent: 'text-sky-500 dark:text-sky-400' },
  success: { Icon: CheckCircle2, accent: 'text-emerald-500 dark:text-emerald-400' },
  warning: { Icon: AlertTriangle, accent: 'text-amber-500 dark:text-amber-400' },
  error: { Icon: XCircle, accent: 'text-red-500 dark:text-red-400' },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const s = STATUS[item.status ?? 'info'];
  const Icon = s.Icon;
  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-w-[300px] max-w-[380px] items-start gap-3 rounded-xl border border-stroke bg-surface px-4 py-3 shadow-lg"
    >
      <span className={cn('mt-0.5 shrink-0', s.accent)}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-fg-secondary">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Dismiss"
        className="-mr-1 ml-1 shrink-0 rounded p-0.5 text-fg-tertiary transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++counter.current;
      const duration = opts.duration ?? 4000;
      setToasts((prev) => [...prev, { ...opts, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <ToastCard key={t.id} item={t} onClose={dismiss} />
              ))}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}
