import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── NavMenu ──────────────────────────────────────────────────────────────────
// A disclosure dropdown for site navigation. Compass page 🧩 Navigation.
//
// A DISCLOSURE, NOT A MENU. role="menu" is for application commands (File,
// Edit) where items are actions. Site navigation reveals destinations, so the
// items stay real anchors: the trigger carries aria-expanded + aria-controls
// and the panel is a plain <ul> of links. That distinction is not academic —
// under role="menuitem" an item stops being announced as a link, and the
// screen-reader link list, middle-click, cmd-click and copy-address all lose
// it. The eight compliance areas are indexable destinations with their own
// URLs; stripping link semantics in the one control that points at them would
// be self-inflicted.
//
// This replaces three hand-rolled versions of the same pattern, two of which
// announced role="menu" while implementing almost none of the keyboard
// interface it promises — MarketingHeader's LanguageMenu had no key handler at
// all. The keyboard contract below is the whole reason the component exists.
//
// Focus moves to the items (roving tabindex) rather than staying on the trigger
// with aria-activedescendant, which is what SelectMenu does. Both are correct
// for their pattern: a listbox picks a value and the trigger keeps the focus, a
// navigation panel wants focus on the anchor so the browser reports the
// destination and native link affordances work.

export type NavMenuPanel = 'sheet' | 'popover';
export type NavMenuAlign = 'start' | 'end';

export interface NavMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  panel: NavMenuPanel;
  align: NavMenuAlign;
  columns: 1 | 2 | 3;
  panelId: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
  itemsRef: React.MutableRefObject<HTMLAnchorElement[]>;
  /** Focus the item at index, wrapping at both ends. */
  focusItem: (index: number) => void;
  close: (returnFocus?: boolean) => void;
}

const NavMenuContext = React.createContext<NavMenuContextValue | null>(null);

function useNavMenu(component: string): NavMenuContextValue {
  const ctx = React.useContext(NavMenuContext);
  if (!ctx) throw new Error(`${component} must be rendered inside <NavMenu>`);
  return ctx;
}

export interface NavMenuProps {
  /** `sheet` spans the viewport under a fixed header; `popover` floats beside the trigger. */
  panel?: NavMenuPanel;
  /** Which trigger edge a popover aligns to. Ignored for `sheet`. */
  align?: NavMenuAlign;
  /** Column count inside the panel. */
  columns?: 1 | 2 | 3;
  /** Close when the route changes — pass the current pathname. */
  closeKey?: string;
  className?: string;
  children: React.ReactNode;
}

export function NavMenu({
  panel = 'popover',
  align = 'start',
  columns = 1,
  closeKey,
  className,
  children,
}: NavMenuProps) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemsRef = React.useRef<HTMLAnchorElement[]>([]);

  const close = React.useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const focusItem = React.useCallback((index: number) => {
    const items = itemsRef.current.filter(Boolean);
    if (items.length === 0) return;
    const wrapped = ((index % items.length) + items.length) % items.length;
    items[wrapped]?.focus();
  }, []);

  // A route change must close the panel. The old AreaSwitcher closed on
  // navigation only because it unmounted, which is luck rather than design.
  React.useEffect(() => {
    if (closeKey === undefined) return;
    setOpen(false);
  }, [closeKey]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Escape works from anywhere inside, including from a focused item.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  React.useEffect(() => {
    if (!open) itemsRef.current = [];
  }, [open]);

  // Tabbing past the last link leaves the panel but used to leave it hanging
  // open behind the focused element. Closing on focusout covers Tab in both
  // directions without trapping anything — the focus has already moved on, so
  // it is never pulled back.
  const onFocusOut = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!open) return;
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    setOpen(false);
  };

  const value: NavMenuContextValue = {
    open, setOpen, panel, align, columns, panelId, triggerRef, itemsRef, focusItem, close,
  };

  return (
    <NavMenuContext.Provider value={value}>
      <div
        ref={rootRef}
        onBlur={onFocusOut}
        className={cn(panel === 'popover' && 'relative', className)}
      >
        {children}
      </div>
    </NavMenuContext.Provider>
  );
}

export interface NavMenuTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon?: React.ReactNode;
  /** Icon-only trigger — requires aria-label. */
  iconOnly?: boolean;
  /** Mark the trigger as the active section. */
  isActive?: boolean;
}

export function NavMenuTrigger({
  label, icon, iconOnly = false, isActive = false, className, ...rest
}: NavMenuTriggerProps) {
  const { open, setOpen, panelId, triggerRef, focusItem, close } = useNavMenu('NavMenu.Trigger');

  const openAndFocus = (index: number) => {
    setOpen(true);
    // The panel mounts on this render; focus lands after it exists.
    requestAnimationFrame(() => focusItem(index));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        openAndFocus(0);
        return;
      case 'ArrowUp':
        e.preventDefault();
        openAndFocus(-1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) close();
        else openAndFocus(0);
        return;
      case 'Escape':
        if (!open) return;
        e.preventDefault();
        close();
        return;
      default:
        return;
    }
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={iconOnly ? label : undefined}
      onClick={() => (open ? close(false) : setOpen(true))}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md text-body-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2',
        iconOnly ? 'h-9 w-9 justify-center' : 'px-2.5 py-2',
        open || isActive ? 'bg-brand-light text-fg-brand' : 'text-fg-secondary hover:text-fg',
        className,
      )}
      {...rest}
    >
      {icon}
      {!iconOnly && label}
      {!iconOnly && (
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      )}
    </button>
  );
}

export interface NavMenuPanelProps {
  /** Optional heading above the columns; `sheet` only. */
  title?: string;
  /** Trailing region beside the columns — a footer link, a cross-link column. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function NavMenuPanel({ title, aside, className, children }: NavMenuPanelProps) {
  const { open, panel, align, columns, panelId } = useNavMenu('NavMenu.Panel');
  if (!open) return null;

  const grid = columns === 3 ? 'lg:grid-cols-3' : columns === 2 ? 'lg:grid-cols-2' : 'grid-cols-1';

  // The sheet spans the header's full width and is positioned by the header,
  // not by this component — it is rendered inside a fixed <header>, so
  // `absolute inset-x-0 top-full` puts it directly beneath the bar.
  if (panel === 'sheet') {
    return (
      <div
        id={panelId}
        className={cn(
          'absolute inset-x-0 top-full z-50 border-b border-stroke-subtle bg-surface',
          'shadow-lg dark:shadow-none dark:border-b-stroke',
          'animate-in fade-in-0 slide-in-from-top-1 duration-150',
          className,
        )}
      >
        <div className="mx-auto flex max-w-container-2xl flex-col gap-8 px-4 py-9 lg:flex-row lg:px-10">
          <div className="min-w-0 flex-1">
            {title && (
              <p className="mb-6 text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
                {title}
              </p>
            )}
            <ul className={cn('grid gap-x-12 gap-y-7', grid)}>{children}</ul>
          </div>
          {aside && (
            <div className="shrink-0 border-t border-stroke-subtle pt-7 lg:w-[288px] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {aside}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id={panelId}
      className={cn(
        'absolute top-full z-50 mt-2 min-w-[260px] overflow-hidden rounded-xl border border-stroke bg-surface py-1.5',
        'shadow-lg dark:shadow-none',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {title && (
        <p className="px-3 pb-1.5 pt-1 text-body-3xs font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
          {title}
        </p>
      )}
      <ul className={cn('grid', grid)}>{children}</ul>
      {aside && <div className="mt-1 border-t border-stroke-subtle px-3 pb-1 pt-2">{aside}</div>}
    </div>
  );
}

export interface NavMenuItemProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  /** Render as the router's Link so client-side navigation is kept. */
  as?: React.ElementType;
  icon?: React.ReactNode;
  /** The one-line description under the label. */
  description?: string;
  /** Trailing slot — a risk badge, a check for the current language. */
  meta?: React.ReactNode;
  /** The destination you are already on. */
  isCurrent?: boolean;
  children: React.ReactNode;
}

export function NavMenuItem({
  href, as: Comp = 'a', icon, description, meta, isCurrent = false,
  className, children, onClick, ...rest
}: NavMenuItemProps) {
  const { panel, itemsRef, focusItem, close } = useNavMenu('NavMenu.Item');
  const ref = React.useRef<HTMLAnchorElement>(null);

  // Register in DOM order so the arrow keys traverse what the reader sees.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const list = itemsRef.current;
    if (!list.includes(el)) list.push(el);
    return () => {
      const i = list.indexOf(el);
      if (i >= 0) list.splice(i, 1);
    };
  });

  const indexOfSelf = () => itemsRef.current.filter(Boolean).indexOf(ref.current!);

  const onKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    const i = indexOfSelf();
    const last = itemsRef.current.filter(Boolean).length - 1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusItem(i + 1); return;
      case 'ArrowUp': e.preventDefault(); focusItem(i - 1); return;
      case 'Home': e.preventDefault(); focusItem(0); return;
      case 'End': e.preventDefault(); focusItem(last); return;
      // Tab leaves naturally — focus is never trapped.
      default: return;
    }
  };

  const dense = panel === 'popover';

  return (
    <li>
      <Comp
        ref={ref}
        href={href}
        to={Comp === 'a' ? undefined : href}
        aria-current={isCurrent ? 'page' : undefined}
        onKeyDown={onKeyDown}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          onClick?.(e);
          close(false);
        }}
        className={cn(
          'group flex items-start gap-3 rounded-lg transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-1',
          // 44px minimum hit target, per the Compass accessibility standard.
          dense ? 'min-h-[44px] items-center px-3 py-2.5' : 'min-h-[44px] p-2 pr-3',
          isCurrent ? 'bg-brand-light/60' : 'hover:bg-surface-secondary',
          className,
        )}
        {...rest}
      >
        {icon && (
          <span
            aria-hidden
            className={cn('shrink-0 text-fg-tertiary group-hover:text-fg-brand', dense ? '' : 'mt-0.5')}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'flex items-center gap-2 text-body-sm font-semibold',
              isCurrent ? 'text-fg-brand' : 'text-fg',
            )}
          >
            {children}
            {meta}
          </span>
          {description && (
            <span className="mt-1 block text-body-xs leading-relaxed text-fg-secondary">
              {description}
            </span>
          )}
        </span>
        {isCurrent && dense && <Check size={14} aria-hidden className="shrink-0 text-fg-brand" />}
      </Comp>
    </li>
  );
}

export interface NavMenuFooterProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  as?: React.ElementType;
  children: React.ReactNode;
}

/** The closing row — "All areas →". A real link, and part of the arrow order. */
export function NavMenuFooter({
  href, as: Comp = 'a', className, children, onClick, ...rest
}: NavMenuFooterProps) {
  const { itemsRef, focusItem, close } = useNavMenu('NavMenu.Footer');
  const ref = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const list = itemsRef.current;
    if (!list.includes(el)) list.push(el);
    return () => {
      const i = list.indexOf(el);
      if (i >= 0) list.splice(i, 1);
    };
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    const items = itemsRef.current.filter(Boolean);
    const i = items.indexOf(ref.current!);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusItem(i + 1); return;
      case 'ArrowUp': e.preventDefault(); focusItem(i - 1); return;
      case 'Home': e.preventDefault(); focusItem(0); return;
      case 'End': e.preventDefault(); focusItem(items.length - 1); return;
      default: return;
    }
  };

  return (
    <Comp
      ref={ref}
      href={href}
      to={Comp === 'a' ? undefined : href}
      onKeyDown={onKeyDown}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        close(false);
      }}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-body-sm font-semibold text-fg-brand',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-1',
        'underline decoration-dotted underline-offset-4 hover:decoration-solid',
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

NavMenu.Trigger = NavMenuTrigger;
NavMenu.Panel = NavMenuPanel;
NavMenu.Item = NavMenuItem;
NavMenu.Footer = NavMenuFooter;
