import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, type TooltipSide } from './Tooltip';
import { cn } from '../../lib/utils';

// ─── TermTip ──────────────────────────────────────────────────────────────────
// Ein Fachbegriff mit Erklaerung (Website Implementation Handover 1.0, §14:
// "Explain technical terms through tooltips rather than replacing them").
// Der Begriff bleibt stehen; die Erklaerung kommt per Hover, Fokus oder
// Antippen, Escape schliesst. Der Ausloeser ist ein echter Knopf, damit er
// per Tab erreichbar ist und Screenreader ihn mit Beschreibung vorlesen.
//
//   inline — der Begriff im Fliesstext, gepunktet unterstrichen
//   chip   — ein eigener kleiner Knopf mit Info-Symbol (Begriffsleisten)
//   plain  — ohne eigene Optik, fuer ein Element, das schon eine hat (Badge)

export interface TermTipProps {
  /** Die Erklaerung. */
  tip: string;
  children: React.ReactNode;
  variant?: 'inline' | 'chip' | 'plain';
  side?: TooltipSide;
  className?: string;
}

export function TermTip({ tip, children, variant = 'inline', side = 'top', className }: TermTipProps) {
  return (
    <Tooltip content={tip} side={side} multiline>
      {variant === 'chip' ? (
        <button
          type="button"
          className={cn(
            'inline-flex cursor-help items-center gap-1.5 rounded-full border border-stroke bg-surface px-2.5 py-1 text-body-3xs font-semibold text-fg-secondary transition-colors hover:border-stroke-brand hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus dark:bg-surface-secondary',
            className,
          )}
        >
          <Info size={12} aria-hidden className="text-fg-brand" />
          {children}
        </button>
      ) : variant === 'plain' ? (
        <button
          type="button"
          className={cn('cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus', className)}
        >
          {children}
        </button>
      ) : (
        <button
          type="button"
          className={cn(
            'cursor-help rounded-sm text-left underline decoration-dotted decoration-1 underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus',
            className,
          )}
        >
          {children}
        </button>
      )}
    </Tooltip>
  );
}
