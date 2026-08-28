import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useInViewOnce } from '../../lib/useInViewOnce';

/** One entry of the rail — presentation only, no engine types. */
export interface RailItem {
  id: string;
  /** The row's label, and the active card's headline. */
  label: string;
  /** The second line the ACTIVE row shows under its label. */
  sub?: ReactNode;
  /** A small badge on the right of the active row (severity, count, …). */
  badge?: ReactNode;
  /** Classes for the 6px marker bar left of the row; omitted = petrol. */
  markerClass?: string;
}

interface Props {
  items: RailItem[];
  /** The dossier for one item — every item's card stays mounted. */
  renderCard: (item: RailItem) => ReactNode;
  /** Sits above the rows: filter chips, a segmented control, … */
  railHeader?: ReactNode;
  /** Sits under the rows: a coverage note, a link out, … */
  railFooter?: ReactNode;
  /** Milliseconds between auto-advances; 0 disables the self-run. */
  autoAdvanceMs?: number;
  /** Widths differ per caller (360px on area pages, 340px elsewhere). */
  railWidthClass?: string;
  /** Raised when the user takes over, so callers can freeze their own state. */
  onPick?: (id: string) => void;
  /** Resets selection when it changes (area, market, filter …). */
  resetKey?: string;
  /**
   * Hovering a row opens it, and leaving the column falls back to the first —
   * the related-areas accordion's behaviour (user ask 2026-08-28). Off by
   * default: with seven duty rows, sweeping the pointer towards the dossier
   * would flip through every card on the way.
   */
  openOnHover?: boolean;
}

// ─── Rail and dossier ────────────────────────────────────────────────────────
// The homepage atlas's instrument, extracted from ObligationsExplorer on
// 2026-08-28 so the "Für wen" page can use the SAME component instead of a
// lookalike (user decision — the same rule the shared FaqList follows).
//
// Three mechanics live here, and each one exists because its naive version
// broke:
//
//   · The rows carry their OWN entrance, never parent variant propagation: a
//     row mounted later by a filter switch would inherit "hidden" from a
//     parent whose animation has already run, and never be told to show (the
//     vanishing-list bug, 2026-08-28). `layout` on every row gives the group
//     the homepage's rubber-band feel.
//   · The cards stand ABSOLUTELY STACKED for a crossfade that cannot flicker,
//     so the panel cannot size itself from flow: the active card is measured
//     and the wrapper's height eases towards it (layout effect for the first
//     paint, ResizeObserver for viewport and font changes).
//   · It plays itself through once in view — until a click takes over.
//     Reduced motion never auto-advances.
export function RailDossier({
  items,
  renderCard,
  railHeader,
  railFooter,
  autoAdvanceMs = 6000,
  railWidthClass = 'desktop-s:w-[360px]',
  onPick,
  resetKey,
  openOnHover = false,
}: Props) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-120px');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);

  // Changing the caller's context can strip the item that was open; falling
  // back to the first keeps the pane populated instead of blanking it. A
  // hovered row wins over the clicked one for as long as the pointer rests on
  // it — the accordion's rule, so a reader can sweep the rail and read.
  const selected = items.find((i) => i.id === (hovered ?? selectedId)) ?? items[0];
  useEffect(() => {
    setSelectedId(null);
  }, [resetKey]);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [panelH, setPanelH] = useState<number | null>(null);
  const activeId = selected?.id ?? null;
  useLayoutEffect(() => {
    const el = activeId ? cardRefs.current[activeId] : null;
    if (!el) return;
    setPanelH(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeId]);

  useEffect(() => {
    if (!inView || reduced || picked || hovered || items.length < 2 || !selected || autoAdvanceMs <= 0)
      return;
    const id = setTimeout(() => {
      const idx = items.findIndex((i) => i.id === selected.id);
      setSelectedId(items[(idx + 1) % items.length].id);
    }, autoAdvanceMs);
    return () => clearTimeout(id);
  }, [inView, reduced, picked, hovered, items, selected, autoAdvanceMs]);

  if (items.length === 0 || !selected) return null;

  const take = (id: string) => {
    setPicked(true);
    setSelectedId(id);
    onPick?.(id);
  };

  return (
    <div ref={ref} className="mt-6 flex flex-col gap-8 desktop-s:flex-row desktop-s:items-stretch desktop-s:gap-10">
      <div
        className={`flex flex-col desktop-s:shrink-0 ${railWidthClass}`}
        onMouseLeave={openOnHover ? () => setHovered(null) : undefined}
      >
        {railHeader}
        <div className={`flex flex-col gap-1.5 ${railHeader ? 'mt-6' : ''}`}>
          {items.map((item, i) => {
            const active = item.id === selected.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                layout
                aria-pressed={active}
                onClick={() => take(item.id)}
                onMouseEnter={openOnHover ? () => setHovered(item.id) : undefined}
                onFocus={openOnHover ? () => setHovered(item.id) : undefined}
                onBlur={openOnHover ? () => setHovered((v) => (v === item.id ? null : v)) : undefined}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                  opacity: { duration: 0.5, ease: 'easeOut', delay: i * 0.06 },
                  y: { duration: 0.5, ease: 'easeOut', delay: i * 0.06 },
                }}
                className={
                  active
                    ? 'flex w-full items-center gap-3.5 rounded-xl border-l-[3px] border-accent-500 bg-surface px-4 py-4 text-left shadow-[0_20px_50px_-24px_rgba(2,22,17,0.28)] dark:bg-surface-secondary'
                    : 'flex w-full items-center gap-3.5 border-b border-stroke-subtle px-4 py-3 text-left transition-colors hover:bg-surface-secondary/60'
                }
              >
                <span
                  aria-hidden
                  className={`h-[2.125rem] w-1.5 shrink-0 rounded-full ${item.markerClass ?? 'bg-brand'}`}
                />
                {active ? (
                  <motion.span
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="block min-w-0 flex-1"
                  >
                    <span className="block text-body-sm font-bold leading-snug text-fg">{item.label}</span>
                    {item.sub && (
                      <span className="mt-1 block text-body-2xs leading-snug text-fg-tertiary">{item.sub}</span>
                    )}
                  </motion.span>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 text-body-sm font-semibold leading-snug text-fg-secondary">
                      {item.label}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-fg-tertiary" aria-hidden />
                  </>
                )}
                {active && item.badge}
              </motion.button>
            );
          })}
        </div>
        {railFooter}
      </div>

      <div className="flex min-w-0 flex-1 items-start rounded-xl bg-gradient-stage p-4 sm:p-7">
        <div
          className="relative w-full min-w-0 transition-[height] duration-500 ease-out motion-reduce:transition-none"
          style={{ height: panelH ?? undefined }}
        >
          {items.map((item) => {
            const active = item.id === selected.id;
            return (
              <motion.div
                key={item.id}
                ref={(el) => {
                  cardRefs.current[item.id] = el;
                }}
                initial={false}
                animate={
                  active
                    ? { opacity: 1, y: 0, visibility: 'visible' }
                    : { opacity: 0, y: 10, transitionEnd: { visibility: 'hidden' } }
                }
                transition={reduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                aria-hidden={!active}
                className={`absolute inset-x-0 top-0 min-w-0 ${active ? '' : 'pointer-events-none'}`}
              >
                {renderCard(item)}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
