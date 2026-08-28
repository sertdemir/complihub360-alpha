import type { ReactNode } from 'react';

// ─── Segmented control ───────────────────────────────────────────────────────
// Extracted from ObligationsExplorer on 2026-08-28 so the contact page can use
// the SAME control instead of a lookalike — the rule the shared FaqList and
// RailDossier already follow.
//
// NOT the design system's FilterChip (components/ui/Badge.tsx), and the
// difference is the point: a chip's pill shape reads as an INDEPENDENT toggle
// you may switch on and off, while these segments are ONE choice with several
// states. Square corners, dark when chosen, outlined when not.
//
// Plain buttons with aria-pressed, NOT a tablist with roving focus — the same
// reasoning the explorer's rail carries: this repo has twice shipped a green
// jsdom test asserting a keyboard contract that did not hold in a real browser.
// Tab to reach, Enter to choose, no focus machinery to get wrong.
export function Segment({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-body-xs font-semibold tabular-nums transition-colors ${
        selected
          ? 'bg-fg text-surface'
          : 'border border-stroke bg-surface text-fg-secondary hover:border-stroke-strong hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}
