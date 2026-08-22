import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NavMenu } from './NavMenu';

// NavMenu exists because the same pattern had been hand-rolled three times and
// two of those announced role="menu" while implementing almost none of the
// keyboard interface it promises — MarketingHeader's LanguageMenu had no key
// handler in the entire file. These tests hold what a visual check cannot see.

function Menu({ panel = 'sheet' as const } = {}) {
  return (
    <NavMenu panel={panel} columns={2}>
      <NavMenu.Trigger label="Compliance areas" />
      <NavMenu.Panel
        title="Choose a compliance area"
        aside={<NavMenu.Footer href="/en/compliance">All compliance areas</NavMenu.Footer>}
      >
        <NavMenu.Item href="/en/compliance/tax-vat" description="Cross-border VAT">
          Tax &amp; VAT
        </NavMenu.Item>
        <NavMenu.Item href="/en/compliance/data-privacy" description="GDPR and transfers" isCurrent>
          Data &amp; Privacy
        </NavMenu.Item>
        <NavMenu.Item href="/en/compliance/logistics-customs" description="EORI and Intrastat">
          Logistics &amp; Customs
        </NavMenu.Item>
      </NavMenu.Panel>
    </NavMenu>
  );
}

describe('NavMenu — a disclosure, not a menu', () => {
  // role="menu" is for application commands. Under role="menuitem" an item stops
  // being announced as a link, and open-in-new-tab, cmd-click and the
  // screen-reader link list all lose it. The eight areas are indexable
  // destinations; they stay anchors.
  it('exposes destinations as real links, never as menuitems', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole('button', { name: /compliance areas/i }));

    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);

    const link = screen.getByRole('link', { name: /tax & vat/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/en/compliance/tax-vat');
  });

  it('wires the trigger to the panel it opens', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: /compliance areas/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const id = trigger.getAttribute('aria-controls')!;
    expect(document.getElementById(id)).not.toBeNull();
  });

  it('marks the destination you are already on', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole('button', { name: /compliance areas/i }));
    expect(screen.getByRole('link', { name: /data & privacy/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /tax & vat/i })).not.toHaveAttribute('aria-current');
  });

  it('carries a description under each label', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole('button', { name: /compliance areas/i }));
    expect(screen.getByText('Cross-border VAT')).toBeInTheDocument();
  });
});

describe('NavMenu — the keyboard contract', () => {
  const openWithArrow = async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: /compliance areas/i });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    return { user, trigger };
  };

  it('opens on ArrowDown and lands on the first destination', async () => {
    await openWithArrow();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /tax & vat/i }));
  });

  it('opens on ArrowUp and lands on the last focusable row', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    screen.getByRole('button', { name: /compliance areas/i }).focus();
    await user.keyboard('{ArrowUp}');
    // The footer link is part of the arrow order — it is a destination too.
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /all compliance areas/i }));
  });

  it('moves with the arrows and wraps at both ends', async () => {
    const { user } = await openWithArrow();
    const first = document.activeElement;

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).not.toBe(first);

    await user.keyboard('{End}');
    const last = document.activeElement;
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(first);

    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(last);

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(first);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user, trigger } = await openWithArrow();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('never traps Tab — focus leaves and the panel closes behind it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Menu />
        <a href="/after">after the menu</a>
      </>,
    );
    const trigger = screen.getByRole('button', { name: /compliance areas/i });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{End}');
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'after the menu' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
