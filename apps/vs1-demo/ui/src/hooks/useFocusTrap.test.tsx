import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

// ─── Focus containment contract ───────────────────────────────────────────────
// Pinned as tests rather than checked by hand: focus behaviour is invisible in a
// screenshot, and the headless pane available here does not dispatch the events
// this depends on. Each case below is one of the four defects the accessibility
// audit found in the drawers on 2026-08-19.

function Harness({ withFields = true }: { withFields?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap<HTMLDivElement>(open);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>Open</button>
      <button data-testid="behind">Behind the panel</button>
      {open && (
        <div ref={ref} role="dialog" tabIndex={-1} data-testid="panel">
          {withFields && (
            <>
              <button data-testid="first">First</button>
              <input data-testid="middle" />
              <button data-testid="last" onClick={() => setOpen(false)}>Last</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const tab = (shift = false) => fireEvent.keyDown(document.activeElement ?? document, { key: 'Tab', shiftKey: shift });

describe('useFocusTrap', () => {
  afterEach(cleanup);

  it('moves focus into the surface when it opens', () => {
    const { getByTestId } = render(<Harness />);
    getByTestId('trigger').focus();
    fireEvent.click(getByTestId('trigger'));
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('wraps Tab from the last control back to the first — never to the page behind', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.click(getByTestId('trigger'));
    getByTestId('last').focus();
    tab();
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.click(getByTestId('trigger'));
    getByTestId('first').focus();
    tab(true);
    expect(document.activeElement).toBe(getByTestId('last'));
  });

  it('pulls focus back in if it somehow lands outside while the surface is open', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.click(getByTestId('trigger'));
    getByTestId('behind').focus();      // the exact defect: a control behind the panel
    tab();
    expect(document.activeElement).toBe(getByTestId('first'));
  });

  it('returns focus to the trigger when it closes', () => {
    const { getByTestId } = render(<Harness />);
    const trigger = getByTestId('trigger');
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(getByTestId('last'));   // closes
    expect(document.activeElement).toBe(trigger);
  });

  it('holds focus on the surface when it contains no focusable control', () => {
    const { getByTestId } = render(<Harness withFields={false} />);
    fireEvent.click(getByTestId('trigger'));
    expect(document.activeElement).toBe(getByTestId('panel'));
    tab();
    expect(document.activeElement).toBe(getByTestId('panel'));
  });

  it('does nothing at all while closed', () => {
    const { getByTestId } = render(<Harness />);
    const behind = getByTestId('behind');
    behind.focus();
    tab();
    expect(document.activeElement).toBe(behind);
  });
});
