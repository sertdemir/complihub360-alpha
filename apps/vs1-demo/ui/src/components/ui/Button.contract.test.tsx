import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

// The marketing pages hand-built 20 CTAs instead of using this component. The
// reason was not laziness: the component could not produce their shape. It only
// spoke rounded-md (6px) at fixed heights with whitespace-nowrap, while the
// marketing language is rounded-xl (10px), taller, and has to survive a German
// label that wraps. These tests hold the three properties that closed that gap —
// and, just as importantly, that the app surfaces did not move.

describe('Button — the app-surface contract must not drift', () => {
  // 2026-11-28: alle Knoepfe +4px runder (Nutzer-Festlegung) — App 6->10px.
  it('defaults to the 10px app corner every existing call site renders', () => {
    render(<Button>Speichern</Button>);
    expect(screen.getByRole('button').className).toContain('rounded-xl');
  });

  it('still defaults to a single line at a fixed height', () => {
    render(<Button>Speichern</Button>);
    const c = screen.getByRole('button').className;
    expect(c).toContain('whitespace-nowrap');
    expect(c).toContain('h-[40px]');
    expect(c).not.toContain('min-h-');
  });
});

describe('Button — what the marketing surface needs', () => {
  it('speaks the 14px marketing corner on request', () => {
    render(<Button shape="soft">Jetzt starten</Button>);
    const c = screen.getByRole('button').className;
    expect(c).toContain('rounded-cta');
    expect(c).not.toContain('rounded-xl');
  });

  it('offers the 56px hero size the section CTAs are built at', () => {
    render(<Button size="xl">Jetzt starten</Button>);
    expect(screen.getByRole('button').className).toContain('min-h-[56px]');
  });

  it('lets a translated label wrap instead of forcing it onto one line', () => {
    render(<Button wrap>Meinen Bedarf ermitteln</Button>);
    const c = screen.getByRole('button').className;
    expect(c).not.toContain('whitespace-nowrap');
    expect(c).toContain('text-center');
  });

  it('grows with a wrapped label rather than clipping it — every size, not just xl', () => {
    // The first attempt only gave `xl` a min-height. `wrap` on `lg` then rendered
    // a three-line label inside a 48px box. Each size needs the padded variant.
    for (const size of ['sm', 'md', 'lg', 'xl'] as const) {
      const { unmount } = render(<Button size={size} wrap>Meinen Bedarf ermitteln</Button>);
      const c = screen.getByRole('button').className;
      expect(c, `size=${size}`).toMatch(/min-h-\[\d+px\]/);
      expect(c, `size=${size}`).not.toMatch(/(?<!min-)\bh-\[\d+px\]/);
      unmount();
    }
  });
});
