import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── WorkspaceMobileBar ──────────────────────────────────────────────────────
// The App-Workspace navigation below `lg`, once, for all three shells (user,
// provider, admin).
//
// Until 2026-09-19 the shells had NO responsive handling at all: `Sidebar` is a
// hard `w-60 shrink-0`, so at 390px it took 240 of them and left 150 for the
// content column — 86px once `px-8` was paid. The account block and the sign-out
// button live at the foot of that rail, so they were off-screen too, and
// `SiteHeader` returns null on these routes, so nothing stepped in.
//
// The pattern is the title switcher (user choice from the variant canvas,
// 2026-09-19), picked over an off-canvas drawer and a bottom tab bar. What
// decided it: a workspace is lived in, not visited, and the title carries the
// wayfinding for free — no permanent nav chrome, which is what a dashboard's
// tables and charts want on a 390px screen.
//
// Two things the user settled on top of the canvas:
//   · The bar shows ONLY the page title. An extra group eyebrow above it said
//     the same thing twice.
//   · Opening does not move the header. The bar stays exactly where it is and
//     only its word changes to "Wechseln zu"; what swaps is the view BENEATH it.
//     That is the whole point of a switcher — a full-screen jump would be the
//     drawer again, wearing a different hat.
//
// It is therefore a DISCLOSURE, not a dialog: no `role="dialog"`, no
// `aria-modal`, no focus trap. The header keeps working while the panel is
// open — that is the design — and claiming modality would lie to a screen
// reader about it. (MobileNav in components/layout IS a modal, because there
// the panel really does cover everything.)

/** Height of the bar. The panel is pinned directly beneath it. */
const BAR_H = 60;

export interface WorkspaceNavItem {
  key: string;
  /** Destination. Omit for an entry that opens something instead (a drawer). */
  to?: string;
  onSelect?: () => void;
  /** What the row renders — may carry a risk dot or other adornment. */
  label: React.ReactNode;
  /** Plain text of the same thing: what the bar shows when this entry is open. */
  title: string;
  icon: React.ReactNode;
  count?: React.ReactNode;
  active?: boolean;
}

export interface WorkspaceNavGroup {
  key: string;
  label: string;
  badge?: string;
  items: WorkspaceNavItem[];
}

export interface WorkspaceMobileBarProps {
  /** The whole navigation — the same data the desktop rail renders. */
  groups: WorkspaceNavGroup[];
  /** Locale-aware home for the mark. */
  homeHref: string;
  /** Shown when no entry matches the route (a detail page below the nav). */
  fallbackTitle: string;
  /** What the bar reads while the panel is open. */
  switchLabel: string;
  /** The one or two controls that earn a place in the bar (search, bell). */
  actions?: React.ReactNode;
  /** Pinned under the navigation: the account block, sign-out, and whatever
   *  utilities the desktop bar carries that do not fit in 390px. */
  footer?: React.ReactNode;
  /** Mark + wordmark for the bar. */
  logo: React.ReactNode;
  className?: string;
}

export function WorkspaceMobileBar({
  groups,
  homeHref,
  fallbackTitle,
  switchLabel,
  actions,
  footer,
  logo,
  className,
}: WorkspaceMobileBarProps) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const activeItem = groups.flatMap((g) => g.items).find((i) => i.active);
  const title = activeItem?.title ?? fallbackTitle;

  // Arriving somewhere is the end of choosing where to go.
  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  // Escape hands the focus back to the word that opened it — otherwise the
  // cursor is left on a row that just disappeared.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div
        className={cn(
          'flex h-[60px] shrink-0 items-center gap-2 border-b border-stroke-subtle bg-surface px-3 lg:hidden',
          className,
        )}
      >
        <Link to={homeHref} aria-label="CompliHub360" className="flex shrink-0 items-center">
          {logo}
        </Link>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="ml-0.5 flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-left transition-colors hover:bg-surface-secondary"
        >
          <span className="truncate text-[17px] font-semibold tracking-[-0.01em] text-fg">
            {open ? switchLabel : title}
          </span>
          <ChevronDown
            size={18}
            aria-hidden
            className={cn('shrink-0 text-fg-secondary transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
        {actions && <div className="-mr-1 flex items-center">{actions}</div>}
      </div>

      {/* Into the body, pinned under the bar. The shells carry no backdrop-filter
          today, but a `fixed` child of a header is one `backdrop-blur` away from
          resolving against a 60px box instead of the viewport — that cost an
          evening on MobileNav. A portal cannot be broken that way. */}
      <MobilePanel id={panelId} open={open} groups={groups} footer={footer} onPick={() => setOpen(false)} />
    </>
  );
}

function MobilePanel({
  id,
  open,
  groups,
  footer,
  onPick,
}: {
  id: string;
  open: boolean;
  groups: WorkspaceNavGroup[];
  footer?: React.ReactNode;
  onPick: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="workspace-nav"
          id={id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{ top: BAR_H }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex flex-col bg-surface lg:hidden"
        >
          <nav className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center justify-between px-3 pb-1.5 pt-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-tertiary">
                    {g.label}
                  </span>
                  {g.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">
                      {g.badge}
                    </span>
                  )}
                </div>
                {g.items.map((it) => (
                  <PanelRow key={it.key} item={it} onPick={onPick} />
                ))}
              </div>
            ))}
          </nav>
          {footer && <div className="shrink-0 border-t border-stroke-subtle">{footer}</div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const ROW =
  'flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left transition-colors';

function PanelRow({ item, onPick }: { item: WorkspaceNavItem; onPick: () => void }) {
  const body = (
    <>
      <span className={cn('shrink-0', item.active ? 'text-fg-brand' : 'text-fg-secondary')}>{item.icon}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-body-md',
          item.active ? 'font-semibold text-fg-brand' : 'font-medium text-fg',
        )}
      >
        {item.label}
      </span>
      {item.count && (
        <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-fg-on-brand">
          {item.count}
        </span>
      )}
    </>
  );
  const cls = cn(ROW, item.active ? 'bg-brand-light' : 'hover:bg-surface-secondary');

  // An entry that opens a drawer is a button; everything else is a destination
  // and stays a link — the same rule the headers follow.
  if (!item.to) {
    return (
      <button
        type="button"
        className={cls}
        onClick={() => {
          onPick();
          item.onSelect?.();
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <Link to={item.to} aria-current={item.active ? 'page' : undefined} className={cls} onClick={onPick}>
      {body}
    </Link>
  );
}
