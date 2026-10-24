import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Mirrors the Compass "Tooltip" (683:2). Inverse bubble (dark on light, light on
// dark) + small arrow, shown on hover/focus. side = top·bottom·left·right.
// Checklist v1.0 (A11y): nicht nur per Hover — Fokus oeffnet, Escape schliesst,
// und der Ausloeser verweist per aria-describedby auf den Text. Auf Touch
// schaltet das Antippen um, ein Tippen daneben schliesst.

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const ARROW: Record<TooltipSide, string> = {
  top: 'top-full -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-full -translate-x-1/2 translate-y-1/2',
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
  /** Longer plain text (a definition): wraps at a max width instead of one line. */
  multiline?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Abstand der Blase zum Viewport-Rand und zum Ausloeser, in px. */
const EDGE = 8;
const GAP = 8;

type Pos = { top: number; left: number; arrow: number };

/** Lage der Blase am Ausloeser, seitlich in den Viewport geschoben. Der Pfeil
 *  bleibt ueber der Mitte des Ausloesers. */
function place(side: TooltipSide, r: DOMRect, w: number, h: number): Pos {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), Math.max(EDGE, vw - EDGE - w));
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), Math.max(EDGE, vh - EDGE - h));
  if (side === 'left' || side === 'right') {
    const left = side === 'left' ? r.left - GAP - w : r.right + GAP;
    return { top: clampY(r.top + r.height / 2 - h / 2), left, arrow: 0 };
  }
  const left = clampX(r.left + r.width / 2 - w / 2);
  const top = side === 'top' ? r.top - GAP - h : r.bottom + GAP;
  return { top, left, arrow: r.left + r.width / 2 - left };
}

export function Tooltip({ content, title, side = 'top', size = 'md', multiline = false, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const rich = title != null;
  const wraps = rich || multiline;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // Touch: ein Tippen ausserhalb schliesst, wie Escape auf der Tastatur.
    const onOutside = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [open]);
  // Die Blase haengt per Portal am body und steht fixed: Karten mit
  // overflow-hidden (Risk Map, Atlas) schneiden sie so nicht ab, und am
  // Viewport-Rand wird sie seitlich nachgeschoben (body hat overflow-x: hidden).
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const measure = () => {
      if (!wrapRef.current || !tipRef.current) return;
      const t = tipRef.current.getBoundingClientRect();
      setPos(place(side, wrapRef.current.getBoundingClientRect(), t.width, t.height));
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, side]);
  // Den Verweis traegt das ausloesende Element selbst, nicht die Huelle. Die
  // Blase steht immer im DOM, damit der Verweis schon beim ersten Fokus
  // aufloest und nicht erst nach dem naechsten Rendern.
  const trigger = React.isValidElement<{ 'aria-describedby'?: string }>(children)
    ? React.cloneElement(children, { 'aria-describedby': tipId })
    : children;
  const bubble = (
    <span
      ref={tipRef}
      id={tipId}
      role="tooltip"
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className={cn(
        'pointer-events-none fixed z-[100] rounded-md bg-neutral-900 font-medium text-white shadow-md dark:bg-neutral-50 dark:text-neutral-900',
        // Plain tooltips stay on one line; titled/rich/multiline tooltips wrap and gain a max width.
        wraps ? 'w-max max-w-[min(260px,calc(100vw-16px))] whitespace-normal text-left' : 'whitespace-nowrap',
        SIZE_CLS[size],
        // Geschlossen: display:none. aria-describedby loest auch auf versteckte
        // Elemente auf, und die Blase verbreitert so nie die Seite.
        !open && 'hidden',
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
      <span
        style={side === 'top' || side === 'bottom' ? { left: pos?.arrow ?? 0 } : undefined}
        className={cn('absolute h-2 w-2 rotate-45 bg-neutral-900 dark:bg-neutral-50', ARROW[side])}
      />
    </span>
  );
  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      // Safari fokussiert Knoepfe beim Antippen nicht — Touch schaltet selbst um.
      onPointerUp={(e) => { if (e.pointerType === 'touch') setOpen((o) => !o); }}
    >
      {trigger}
      {typeof document === 'undefined' ? bubble : createPortal(bubble, document.body)}
    </span>
  );
}
