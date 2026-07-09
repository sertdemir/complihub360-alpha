import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Table, THead, TBody, TR, TH, TD } from './Table';
import { Pagination } from './Pagination';
import { Checkbox } from './Checkbox';
import { EmptyState } from './EmptyState';

// ─── DataTable ──────────────────────────────────────────────────────────────────
// Generic composed Organism over the Compass Table primitives. Adds client-side
// sort (asc → desc → none), optional client-side pagination (existing Pagination),
// row selection (leading Checkbox column + select-all), loading shimmer rows and an
// empty state. Pure composition — no table chrome reinvented. Light + dark via the
// underlying primitives' semantic tokens.

export interface DataTableColumn<T> {
  /** Key into the row (used for default cell value + sort) or any string id. */
  key: keyof T | string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Right-aligns + tabular figures on header & cell. */
  numeric?: boolean;
  /** Custom cell renderer. Falls back to `String(row[key])`. */
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** If set, paginate client-side. */
  pageSize?: number;
  /** Adds a leading checkbox column + select-all header checkbox. */
  selectable?: boolean;
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  /** Shown (full-width) when data is empty and not loading. */
  emptyState?: React.ReactNode;
  /** Passthrough to the underlying Table. */
  density?: 'default' | 'compact';
  striped?: boolean;
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

function alignClass(col: { align?: 'left' | 'right' | 'center'; numeric?: boolean }) {
  if (col.align === 'center') return 'text-center';
  if (col.align === 'right' || col.numeric) return 'text-right';
  return undefined;
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyState,
  density = 'default',
  striped = false,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const emitSelection = (next: Set<string>) => {
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // desc → none
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return data;
    const k = col.key as keyof T;
    const copy = [...data];
    copy.sort((ra, rb) => {
      const r = compare(ra[k] as unknown, rb[k] as unknown);
      return sort.dir === 'asc' ? r : -r;
    });
    return copy;
  }, [data, sort, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    if (!pageSize) return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSize, currentPage]);

  const colSpan = columns.length + (selectable ? 1 : 0);

  // Select-all reflects the rows currently visible on the page.
  const pageKeys = pageRows.map(rowKey);
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const someSelected = pageKeys.some((k) => selected.has(k));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) pageKeys.forEach((k) => next.delete(k));
    else pageKeys.forEach((k) => next.add(k));
    emitSelection(next);
  };

  const toggleRow = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    emitSelection(next);
  };

  const showEmpty = !loading && data.length === 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Table density={density} striped={striped}>
        <THead>
          <TR className="hover:bg-transparent">
            {selectable && (
              <TH className="w-px">
                <Checkbox
                  size="sm"
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  disabled={loading || pageKeys.length === 0}
                />
              </TH>
            )}
            {columns.map((col) => {
              const id = String(col.key);
              const isSorted = sort?.key === id;
              return (
                <TH
                  key={id}
                  numeric={col.numeric}
                  className={alignClass(col)}
                  sort={col.sortable ? (isSorted ? sort!.dir : false) : undefined}
                  onSort={col.sortable ? () => toggleSort(id) : undefined}
                >
                  {col.header}
                </TH>
              );
            })}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TR key={`sk-${i}`} className="hover:bg-transparent">
                {selectable && (
                  <TD>
                    <div className="h-4 w-4 animate-pulse rounded bg-neutral-200 dark:bg-white/10" />
                  </TD>
                )}
                {columns.map((col) => (
                  <TD key={String(col.key)} numeric={col.numeric} className={alignClass(col)}>
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-white/10" />
                  </TD>
                ))}
              </TR>
            ))
          ) : showEmpty ? (
            <tr>
              <td colSpan={colSpan} className="p-0">
                {emptyState ?? (
                  <EmptyState
                    icon={<Search size={22} />}
                    title="No results"
                    description="There's nothing to show here yet. Adjust your filters or try again later."
                  />
                )}
              </td>
            </tr>
          ) : (
            pageRows.map((row) => {
              const key = rowKey(row);
              const isSel = selected.has(key);
              return (
                <TR key={key} selected={selectable && isSel}>
                  {selectable && (
                    <TD>
                      <Checkbox
                        size="sm"
                        checked={isSel}
                        onChange={() => toggleRow(key)}
                        aria-label="Select row"
                      />
                    </TD>
                  )}
                  {columns.map((col) => (
                    <TD key={String(col.key)} numeric={col.numeric} className={alignClass(col)}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </TD>
                  ))}
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      {pageSize && !loading && !showEmpty && totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
