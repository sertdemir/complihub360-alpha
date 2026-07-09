import React from 'react';
import { cn } from '../../lib/utils';

// ─── DashboardSection ───────────────────────────────────────────────────────────
// A titled wrapper used to group dashboard blocks. A header row carries the
// title (+ optional description) on the left and right-aligned actions (e.g. a
// Button or filter). A subtle divider separates the header from the children.
// Light + dark.

export interface DashboardSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned controls, e.g. a Button or filter. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({ title, description, actions, children, className }: DashboardSectionProps) {
  return (
    <section className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-stroke pb-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-fg-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
