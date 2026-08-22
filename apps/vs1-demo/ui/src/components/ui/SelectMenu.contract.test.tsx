import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SelectMenu } from './SelectMenu';

// SelectMenu carries the listbox keyboard contract for the whole app, which is
// why reaching for it beats reimplementing it — the compliance market picker
// had hand-written arrows, Home/End, Escape and aria-activedescendant before
// moving here. These tests hold the part of that contract a screen reader
// depends on and a visual check cannot see.

const OPTIONS = [
  { value: 'EU', label: 'EU-wide' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
];

describe('SelectMenu — the active option must be announceable', () => {
  // aria-activedescendant only does anything on the element that holds DOM
  // focus. It used to sit on the <ul>, which is tabIndex={-1} and never
  // focused, so arrowing through the list changed nothing a screen reader
  // could report. Focus stays on the trigger here, so the attribute does too.
  it('puts aria-activedescendant on the trigger, not on the list', async () => {
    const user = userEvent.setup();
    render(<SelectMenu id="market" options={OPTIONS} value="EU" />);
    const trigger = screen.getByRole('combobox');

    expect(trigger).not.toHaveAttribute('aria-activedescendant');

    trigger.focus();
    await user.keyboard('{ArrowDown}');

    const active = trigger.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-activedescendant');
  });

  it('points at an element that actually exists and is an option', async () => {
    const user = userEvent.setup();
    render(<SelectMenu id="market" options={OPTIONS} value="EU" />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');

    const id = trigger.getAttribute('aria-activedescendant')!;
    const target = document.getElementById(id);
    expect(target).not.toBeNull();
    expect(target).toHaveAttribute('role', 'option');
  });

  it('moves the active option with the arrows and with End', async () => {
    const user = userEvent.setup();
    render(<SelectMenu id="market" options={OPTIONS} value="EU" />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    const first = trigger.getAttribute('aria-activedescendant');
    await user.keyboard('{ArrowDown}');
    const second = trigger.getAttribute('aria-activedescendant');
    expect(second).not.toBe(first);

    await user.keyboard('{End}');
    expect(trigger.getAttribute('aria-activedescendant')).not.toBe(second);
  });

  it('drops the reference when the list closes', async () => {
    const user = userEvent.setup();
    render(<SelectMenu id="market" options={OPTIONS} value="EU" />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-activedescendant');

    await user.keyboard('{Escape}');
    expect(trigger).not.toHaveAttribute('aria-activedescendant');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('resolves aria-controls to the open list', async () => {
    const user = userEvent.setup();
    render(<SelectMenu id="market" options={OPTIONS} value="EU" />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    const id = trigger.getAttribute('aria-controls')!;
    expect(document.getElementById(id)).toBe(screen.getByRole('listbox'));
  });
});

describe('SelectMenu — two instances must not share option ids', () => {
  // Both fell back to the literal 'sm' when no id was passed, so a page with
  // two pickers produced duplicate element ids and aria-activedescendant could
  // resolve into the wrong list. The compliance area pages render exactly that:
  // the hero picker and the compact one in the sticky switcher.
  it('namespaces option ids per instance without an explicit id', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SelectMenu options={OPTIONS} value="EU" />
        <SelectMenu options={OPTIONS} value="DE" />
      </>,
    );
    const [a, b] = screen.getAllByRole('combobox');

    a.focus();
    await user.keyboard('{ArrowDown}');
    b.focus();
    await user.keyboard('{ArrowDown}');

    const ids = screen.getAllByRole('option').map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
