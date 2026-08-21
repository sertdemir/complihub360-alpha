import { useEffect, useRef } from 'react';

// ─── useFocusTrap ─────────────────────────────────────────────────────────────
// Keyboard containment for modal surfaces. Before this existed, a grep for
// FocusTrap|inert|trapFocus over src/ returned zero hits, and the drawers behaved
// accordingly: focus stayed on the trigger when one opened, the first Tab landed
// on a control BEHIND the panel, and Escape closed it without giving focus back —
// so a keyboard user was dropped at the top of the document with no way back to
// where they were (WCAG 2.4.3 / 2.4.11).
//
// Three jobs, in order:
//   1. move focus into the surface when it opens,
//   2. keep Tab and Shift+Tab inside it,
//   3. return focus to whatever had it before, when it closes.
//
// Step 3 is the one that is easy to forget and the most valuable: without it the
// user loses their place entirely.

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    // offsetParent is null for display:none; a zero box catches visibility:hidden
    // and collapsed elements. Cheap, and enough for the panels we ship.
    return el.offsetParent !== null || el.getClientRects().length > 0;
  });
}

/**
 * Attach the returned ref to the modal surface. Pass `active` = whether it is open.
 *
 * The surface itself should carry `tabIndex={-1}` so focus has somewhere to land
 * when it happens to contain no focusable control.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    // Captured BEFORE we move focus, so we can hand it back on close.
    const previous = document.activeElement as HTMLElement | null;

    const items = focusableWithin(node);
    (items[0] ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = focusableWithin(node);
      if (current.length === 0) {
        // Nothing to move to — hold focus on the surface rather than letting it
        // escape to the page behind.
        e.preventDefault();
        node.focus();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const activeEl = document.activeElement;
      const outside = !node.contains(activeEl);

      if (e.shiftKey && (activeEl === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Capture phase: the panel's own handlers must not be able to swallow Tab
    // before containment runs.
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Only restore if the trigger is still in the document — a drawer that
      // removed its own opener would otherwise throw focus at a detached node.
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [active]);

  return ref;
}
