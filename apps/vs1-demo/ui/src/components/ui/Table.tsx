import React, { createContext, useContext, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Table ────────────────────────────────────────────────────────────────────
// Mirrors the Compass Table family (788/794/796/801): Table · THead · TBody · TR ·
// TH · TD. Header = secondary bg, 11px uppercase secondary label; cells = 13px
// default text. Numeric cells right-align with tabular figures (compliance data
// alignment, per Typography spec). Layouts: standard · striped. Density: default ·
// compact. Sortable headers. Ships light + dark (semantic surfaces + static row
// tints so opacity works on the dark app slate).

type Density = 'default' | 'compact';
const Ctx = createContext<{ density: Density; striped: boolean }>({ density: 'default', striped: false });

export interface TableProps {
  density?: Density;
  striped?: boolean;
  className?: string;
  children: ReactNode;
}

export function Table({ density = 'default', striped = false, className, children }: TableProps) {
  return (
    <Ctx.Provider value={{ density, striped }}>
      <div className={cn('w-full overflow-x-auto rounded-lg border border-stroke', className)}>
        <table className="w-full border-collapse text-left text-fg">{children}</table>
      </div>
    </Ctx.Provider>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-stroke bg-surface-secondary">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  const { striped } = useContext(Ctx);
  return (
    <tbody className={cn(striped && '[&>tr:nth-child(even)]:bg-neutral-50 dark:[&>tr:nth-child(even)]:bg-white/[0.03]')}>
      {children}
    </tbody>
  );
}

export interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}
export function TR({ selected, className, children, ...rest }: TRProps) {
  return (
    <tr
      className={cn(
        'border-b border-stroke transition-colors last:border-b-0 hover:bg-neutral-50 dark:hover:bg-white/[0.04]',
        selected && 'bg-brand-light dark:bg-white/10',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

const PAD: Record<Density, string> = { default: 'px-3 py-2.5', compact: 'px-3 py-1.5' };

export interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** `false` = sortable but unsorted · 'asc'/'desc' = sorted. Omit = not sortable. */
  sort?: 'asc' | 'desc' | false;
  onSort?: () => void;
  numeric?: boolean;
}
export function TH({ sort, onSort, numeric, className, children, ...rest }: THProps) {
  const { density } = useContext(Ctx);
  const sortable = sort !== undefined;
  const SortIcon = sort === 'asc' ? ChevronUp : sort === 'desc' ? ChevronDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      className={cn(PAD[density], 'whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-secondary', numeric && 'text-right', className)}
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      {...rest}
    >
      {sortable ? (
        <button type="button" onClick={onSort} className={cn('inline-flex items-center gap-1 hover:text-fg', numeric && 'flex-row-reverse')}>
          {children}
          <SortIcon size={13} className={sort ? 'text-fg' : 'text-fg-tertiary'} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  bold?: boolean;
}
export function TD({ numeric, bold, className, children, ...rest }: TDProps) {
  const { density } = useContext(Ctx);
  return (
    <td
      className={cn(PAD[density], 'align-middle text-[13px]', numeric && 'text-right tabular-nums', bold && 'font-semibold', className)}
      {...rest}
    >
      {children}
    </td>
  );
}
