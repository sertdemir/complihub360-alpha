import React from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Combobox ─────────────────────────────────────────────────────────────────
// A searchable select (typeahead). Like SelectMenu, but the trigger is a text
// input that filters options case-insensitively by label as you type. Reuses the
// SelectMenu popover styling, outside-click-close, open/active state model and
// `defaultOpen` convention. ARIA combobox pattern. Light + dark via tokens.

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export type ComboboxSize = 'sm' | 'md' | 'lg';
const TRIGGER_SIZE: Record<ComboboxSize, string> = {
  sm: 'h-9 rounded-[6px] pl-3 pr-3 text-[13px]',
  md: 'h-11 rounded-lg pl-3.5 pr-3.5 text-[14px]',
  lg: 'h-[52px] rounded-lg pl-4 pr-4 text-[15px]',
};

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  inputSize?: ComboboxSize;
  disabled?: boolean;
  /** Start in the open state (useful for docs/demos). */
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}

export function Combobox({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No results',
  inputSize = 'md',
  disabled,
  defaultOpen,
  id,
  className,
}: ComboboxProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string | undefined>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;

  const selected = options.find((o) => o.value === value);

  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const commit = (v: string) => {
    if (controlledValue === undefined) setUncontrolled(v);
    onChange?.(v);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  // close + restore on outside click
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // keep active within the filtered range
  React.useEffect(() => {
    setActive((a) => Math.min(Math.max(a, 0), Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const moveActive = (dir: 1 | -1) => {
    setActive((cur) => {
      if (filtered.length === 0) return 0;
      let next = cur;
      for (let i = 0; i < filtered.length; i++) {
        next = (next + dir + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) break;
      }
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setOpen(true); moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); setOpen(true); moveActive(-1); break;
      case 'Enter':
        e.preventDefault();
        if (open && filtered[active] && !filtered[active].disabled) commit(filtered[active].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const listId = `${id ?? 'cbx'}-list`;
  // What the input shows: while open & typing → query; otherwise the selected label.
  const inputValue = open ? query : selected?.label ?? '';

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'flex w-full items-center gap-2 border bg-surface transition-colors',
          TRIGGER_SIZE[inputSize],
          'border-stroke',
          open && 'border-stroke-focus ring-2 ring-inset ring-primary-500/35 dark:ring-emerald-500/40',
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
        )}
      >
        <Search size={18} className="shrink-0 text-fg-tertiary" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={selected ? selected.label : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-tertiary focus:outline-none',
            disabled && 'cursor-not-allowed',
          )}
        />
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-fg-tertiary transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-stroke bg-surface p-1.5 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {filtered.length === 0 && (
            <li className="px-2.5 py-3 text-center text-[13px] text-fg-tertiary">{emptyMessage}</li>
          )}
          {filtered.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === active;
            return (
              <li
                key={opt.value}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onMouseEnter={() => !opt.disabled && setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => !opt.disabled && commit(opt.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px]',
                  opt.disabled && 'cursor-not-allowed opacity-50',
                  isActive && !opt.disabled && 'bg-brand-light',
                  isSelected ? 'text-fg-brand' : 'text-fg',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="block truncate text-[12px] text-fg-tertiary">{opt.description}</span>
                  )}
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
