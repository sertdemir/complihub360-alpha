import React, { useState } from 'react';
import { cn } from '../../lib/utils';

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Mirrors the Compass "Tooltip" (683:2). Inverse bubble (dark on light, light on
// dark) + small arrow, shown on hover/focus. side = top·bottom·left·right.

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const POS: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};
const ARROW: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2',
  right: 'right-full top-1/2 translate-x-1/2 -translate-y-1/2',
};

export type TooltipSize = 'sm' | 'md' | 'lg';

// Size axis: padding + text size + max width for richer (multi-line) content.
const SIZE_CLS: Record<TooltipSize, string> = {
  sm: 'px-2 py-1 text-[11px]',
  md: 'px-2.5 py-1.5 text-[12px]',
  lg: 'px-3 py-2 text-[13px]',
};

export interface TooltipProps {
  content: React.ReactNode;
  /** Bold title rendered above the content — turns the tooltip into the "With Title" / "Rich" type. */
  title?: React.ReactNode;
  side?: TooltipSide;
  size?: TooltipSize;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, title, side = 'top', size = 'md', children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const rich = title != null;
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 rounded-md bg-neutral-900 font-medium text-white shadow-md dark:bg-neutral-50 dark:text-neutral-900',
            // Plain tooltips stay on one line; titled/rich tooltips wrap and gain a max width.
            rich ? 'max-w-[240px] whitespace-normal' : 'whitespace-nowrap',
            SIZE_CLS[size],
            POS[side],
            className,
          )}
        >
          {rich ? (
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{title}</span>
              <span className="font-normal opacity-90">{content}</span>
            </span>
          ) : (
            content
          )}
          <span className={cn('absolute h-2 w-2 rotate-45 bg-neutral-900 dark:bg-neutral-50', ARROW[side])} />
        </span>
      )}
    </span>
  );
}
