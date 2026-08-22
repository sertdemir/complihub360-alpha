import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── SelectMenu ───────────────────────────────────────────────────────────────
// Custom listbox dropdown — Compass "Select Dropdown Open" (638:524) with
// "Select Option Item" rows (637:401). Unlike the native <Select>, this renders a
// styled floating panel: hoverable/active rows, selected check, optional icon +
// description, full keyboard nav and ARIA listbox semantics. Light + dark.

export interface SelectMenuOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type SelectMenuSize = 'sm' | 'md' | 'lg';
const TRIGGER_SIZE: Record<SelectMenuSize, string> = {
  sm: 'h-9 rounded-[6px] pl-3 pr-3 text-[13px]',
  md: 'h-11 rounded-lg pl-3.5 pr-3.5 text-[14px]',
  lg: 'h-[52px] rounded-lg pl-4 pr-4 text-[15px]',
};

export interface SelectMenuProps {
  options: SelectMenuOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  inputSize?: SelectMenuSize;
  variant?: 'outlined' | 'filled';
  error?: boolean;
  disabled?: boolean;
  /** Start in the open state (useful for docs/demos). */
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}

export function SelectMenu({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  inputSize = 'md',
  variant = 'outlined',
  error,
  disabled,
  defaultOpen,
  id,
  className,
}: SelectMenuProps) {
  // Two SelectMenus without an explicit id both fell back to 'sm', so their
  // option ids collided and aria-activedescendant could point into the wrong
  // list. useId gives each instance its own namespace.
  const autoId = React.useId();
  const uid = id ?? autoId;
  const listId = `${uid}-listbox`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [uncontrolled, setUncontrolled] = React.useState<string | undefined>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [active, setActive] = React.useState<number>(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const commit = (v: string) => {
    if (controlledValue === undefined) setUncontrolled(v);
    onChange?.(v);
    setOpen(false);
  };

  // close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // when opening, focus the active row to the selection
  React.useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  const moveActive = (dir: 1 | -1) => {
    setActive((cur) => {
      let next = cur;
      for (let i = 0; i < options.length; i++) {
        next = (next + dir + options.length) % options.length;
        if (!options[next]?.disabled) break;
      }
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); moveActive(-1); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(options.length - 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (active >= 0 && !options[active]?.disabled) commit(options[active].value);
        break;
      case 'Escape': e.preventDefault(); setOpen(false); break;
      case 'Tab': setOpen(false); break;
    }
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={error || undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center gap-2 border text-left transition-colors focus:outline-none',
          TRIGGER_SIZE[inputSize],
          variant === 'filled' ? 'bg-surface-secondary' : 'bg-surface',
          error
            ? 'border-error-500 bg-error-bg focus:ring-2 focus:ring-inset focus:ring-error-500/40 dark:bg-red-500/10'
            : 'border-stroke focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40',
          open && !error && 'border-stroke-focus ring-2 ring-inset ring-primary-500/35 dark:ring-emerald-500/40',
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
        )}
      >
        {selected?.icon && <span className="shrink-0 text-fg-secondary">{selected.icon}</span>}
        <span className={cn('flex-1 truncate', selected ? 'text-fg' : 'text-fg-tertiary')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-fg-tertiary transition-transform', open && 'rotate-180', error && 'text-error-500')}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-stroke bg-surface p-1.5 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === active;
            return (
              <li
                key={opt.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onMouseEnter={() => !opt.disabled && setActive(i)}
                onClick={() => !opt.disabled && commit(opt.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px]',
                  opt.disabled && 'cursor-not-allowed opacity-50',
                  isActive && !opt.disabled && 'bg-brand-light',
                  isSelected ? 'text-fg-brand' : 'text-fg',
                )}
              >
                {opt.icon && <span className="shrink-0 text-fg-secondary">{opt.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{opt.label}</span>
                  {opt.description && <span className="block truncate text-[12px] text-fg-tertiary">{opt.description}</span>}
                </span>
                {isSelected && <Check size={16} strokeWidth={2.5} className="shrink-0 text-fg-brand" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
