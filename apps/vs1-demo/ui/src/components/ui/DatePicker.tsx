import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── DatePicker ───────────────────────────────────────────────────────────────
// A trigger button (calendar icon + formatted date or placeholder + chevron) that
// opens a floating month-grid popover. Reuses the SelectMenu interaction model:
// trigger-button + floating popover + outside-click-close + keyboard nav + ARIA.
// Calendar math is plain Date arithmetic. Light + dark via tokens.

export type DatePickerSize = 'sm' | 'md' | 'lg';
const TRIGGER_SIZE: Record<DatePickerSize, string> = {
  sm: 'h-9 rounded-[6px] pl-3 pr-3 text-[13px]',
  md: 'h-11 rounded-lg pl-3.5 pr-3.5 text-[14px]',
  lg: 'h-[52px] rounded-lg pl-4 pr-4 text-[15px]',
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (d: Date) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  /** Start in the open state (useful for docs/demos). */
  defaultOpen?: boolean;
  inputSize?: DatePickerSize;
  id?: string;
  className?: string;
}

// ── date helpers ──────────────────────────────────────────────────────────────
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
// Monday-first weekday index (0=Mon … 6=Sun)
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

const formatDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

export function DatePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  disabled,
  defaultOpen,
  inputSize = 'md',
  id,
  className,
}: DatePickerProps) {
  const [uncontrolled, setUncontrolled] = React.useState<Date | undefined>(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;

  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  // The month currently displayed in the grid.
  const [viewMonth, setViewMonth] = React.useState<Date>(() => {
    const base = value ?? defaultValue ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  // Focused/active day for keyboard nav.
  const [active, setActive] = React.useState<Date>(() => value ?? defaultValue ?? new Date());

  const rootRef = React.useRef<HTMLDivElement>(null);

  const minDay = min ? startOfDay(min) : undefined;
  const maxDay = max ? startOfDay(max) : undefined;
  const isDisabledDay = (d: Date) => {
    const day = startOfDay(d);
    if (minDay && day < minDay) return true;
    if (maxDay && day > maxDay) return true;
    return false;
  };

  const today = startOfDay(new Date());

  const commit = (d: Date) => {
    const day = startOfDay(d);
    if (isDisabledDay(day)) return;
    if (controlledValue === undefined) setUncontrolled(day);
    onChange?.(day);
    setOpen(false);
  };

  // sync the view/active when value changes externally
  React.useEffect(() => {
    if (value) {
      setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1));
      setActive(value);
    }
  }, [value]);

  // when opening, snap the view to the active day's month
  React.useEffect(() => {
    if (open) {
      const base = value ?? new Date();
      setActive(base);
      setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const moveActive = (deltaDays: number) => {
    setActive((cur) => {
      const next = addDays(cur, deltaDays);
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
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
      case 'ArrowLeft': e.preventDefault(); moveActive(-1); break;
      case 'ArrowRight': e.preventDefault(); moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); moveActive(-7); break;
      case 'ArrowDown': e.preventDefault(); moveActive(7); break;
      case 'PageUp': e.preventDefault(); setViewMonth((m) => addMonths(m, -1)); break;
      case 'PageDown': e.preventDefault(); setViewMonth((m) => addMonths(m, 1)); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(active);
        break;
      case 'Escape': e.preventDefault(); setOpen(false); break;
      case 'Tab': setOpen(false); break;
    }
  };

  // Build the 6-week (42-cell) grid for viewMonth.
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -mondayIndex(firstOfMonth));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center gap-2 border bg-surface text-left transition-colors focus:outline-none',
          TRIGGER_SIZE[inputSize],
          'border-stroke focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40',
          open && 'border-stroke-focus ring-2 ring-inset ring-primary-500/35 dark:ring-emerald-500/40',
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-60 dark:bg-white/[0.04]',
        )}
      >
        <Calendar size={18} className="shrink-0 text-fg-tertiary" />
        <span className={cn('flex-1 truncate', value ? 'text-fg' : 'text-fg-tertiary')}>
          {value ? formatDate(value) : placeholder}
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-fg-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className={cn(
            'absolute z-50 mt-1.5 w-[280px] rounded-xl border border-stroke bg-surface p-3 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {/* header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary transition-colors hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[14px] font-semibold text-fg">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary transition-colors hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/35 dark:focus:ring-emerald-500/40"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* weekday row */}
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div key={w} className="flex h-8 items-center justify-center text-[11px] font-medium text-fg-tertiary">
                {w}
              </div>
            ))}
          </div>

          {/* day grid */}
          <div role="grid" className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isSelected = value ? sameDay(d, value) : false;
              const isToday = sameDay(d, today);
              const isActive = sameDay(d, active);
              const dayDisabled = isDisabledDay(d);
              return (
                <div key={d.getTime()} role="gridcell" className="flex items-center justify-center">
                  <button
                    type="button"
                    tabIndex={-1}
                    role="button"
                    aria-label={formatDate(d)}
                    aria-selected={isSelected}
                    aria-disabled={dayDisabled || undefined}
                    disabled={dayDisabled}
                    onClick={() => commit(d)}
                    onMouseEnter={() => !dayDisabled && setActive(d)}
                    className={cn(
                      'flex h-[36px] w-[36px] items-center justify-center rounded-full text-[13px] transition-colors focus:outline-none',
                      !inMonth && !isSelected && 'text-fg-tertiary',
                      inMonth && !isSelected && 'text-fg',
                      isSelected && 'bg-brand text-fg-on-brand',
                      !isSelected && isActive && !dayDisabled && 'bg-brand-light',
                      !isSelected && isToday && 'ring-1 ring-stroke-focus',
                      dayDisabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
