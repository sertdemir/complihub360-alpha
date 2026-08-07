import React from 'react';
import { cn } from '../../lib/utils';

// ─── EmptyState ───────────────────────────────────────────────────────────────
// Mirrors the Compass "Empty State" (775:2). Centered icon + title + description +
// optional action — for no-data / no-results / error / first-run surfaces. Size
// compact / default. Light + dark via tokens.

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'compact' | 'default';
  className?: string;
}

export function EmptyState({ icon, title, description, action, size = 'default', className }: EmptyStateProps) {
  const compact = size === 'compact';
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'gap-3 p-6' : 'gap-4 p-10', className)}>
      {icon && (
        <div className={cn('grid place-items-center rounded-full bg-surface-secondary text-fg-tertiary', compact ? 'h-12 w-12' : 'h-16 w-16')}>
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className={cn('font-semibold text-fg', compact ? 'text-[15px]' : 'text-[17px]')}>{title}</p>
        {description && <p className="mx-auto max-w-sm text-body-sm leading-relaxed text-fg-secondary">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
