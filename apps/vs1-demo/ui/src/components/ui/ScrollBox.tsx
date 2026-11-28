import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// ─── ScrollBox ────────────────────────────────────────────────────────────────
// Compass "Scroll Box" (2279:55, Canvas-Wahl 2A vom 2026-11-28): langer Text
// auf festem Platz — die Punkte der Beta-Vereinbarung ueber dem Haken.
//
//   * Der Kasten ist mit der Tastatur erreichbar (tabIndex 0) und traegt
//     role="region" samt Namen. Ohne beides laesst sich ein scrollender Bereich
//     ohne fokussierbaren Inhalt per Tastatur gar nicht lesen.
//   * Der Auslauf unten sagt "es geht weiter". Er liegt ueber dem unteren
//     Innenabstand, faengt keine Klicks ab und verschwindet am Textende — er
//     verdeckt nie die Zeile, die gerade gelesen wird.
//   * Die Hoehe bestimmt der Aufrufer ueber className (max-h-…, flex-1, …).
//     Passt der Inhalt ganz hinein, gibt es weder Scrollen noch Auslauf.

export interface ScrollBoxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label'> {
  /** Name des Bereichs fuer Screenreader. Pflicht: ein Bereich ohne Namen ist keiner. */
  label: string;
  /** Auslauf am unteren Rand, solange Text folgt. Standard an. */
  fade?: boolean;
  /** Klassen fuer den scrollenden Bereich selbst (Innenabstand). */
  contentClassName?: string;
}

/** Ab so vielen Pixeln vor dem Ende gilt der Text als zu Ende gelesen. */
const END_TOLERANCE = 2;

export function ScrollBox({ label, fade = true, className, contentClassName, children, ...rest }: ScrollBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > END_TOLERANCE);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Der Inhalt laedt oft nach (das Blatt kommt vom Server): neu messen, wenn
    // der Kasten oder sein Inhalt die Groesse aendert.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-stroke bg-surface-secondary',
        className,
      )}
      {...rest}
    >
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto rounded-[inherit] px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus',
          contentClassName,
        )}
      >
        {children}
      </div>
      {fade && more && (
        <div
          aria-hidden
          data-testid="scrollbox-fade"
          className="pointer-events-none absolute inset-x-px bottom-px h-11 rounded-b-[11px] bg-gradient-to-b from-transparent to-surface-secondary"
        />
      )}
    </div>
  );
}
