import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
// Mirrors the Compass "Breadcrumb" (698:2). Path of links + chevron separators;
// the last item is the current page. Light + dark via tokens.

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  size?: 'sm' | 'md';
  className?: string;
}

export function Breadcrumb({ items, size = 'md', className }: BreadcrumbProps) {
  const txt = size === 'sm' ? 'text-[12px]' : 'text-[13px]';
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn('flex flex-wrap items-center gap-1.5', txt)}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {it.href && !last ? (
                <a href={it.href} className="inline-flex items-center gap-1.5 text-fg-secondary transition-colors hover:text-fg">
                  {it.icon}
                  {it.label}
                </a>
              ) : (
                <span className={cn('inline-flex items-center gap-1.5', last ? 'font-medium text-fg' : 'text-fg-secondary')} aria-current={last ? 'page' : undefined}>
                  {it.icon}
                  {it.label}
                </span>
              )}
              {!last && <ChevronRight size={14} className="shrink-0 text-fg-tertiary" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
