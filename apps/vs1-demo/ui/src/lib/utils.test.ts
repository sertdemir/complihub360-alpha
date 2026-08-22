import { describe, expect, it } from 'vitest';
import { cn } from './utils';

// ─── cn() must not silently drop a Compass alias ─────────────────────────────
// tailwind-merge only recognises the stock scales. Every alias this project
// adds in tailwind.config.js — the type scale, the border widths — lands in its
// catch-all for that prefix and gets classified as a COLOUR, which means the
// real class is dropped by the next colour in the same string. Silently: no
// error, no warning, just a control that renders without the property.
//
// It has now happened twice. text-caption was dropped next to a text colour
// (fixed when the type scale was registered), and border-medium was dropped
// next to border-neutral-300 — so every Button variant="outline" in the app
// rendered with no border at all, a white control on a near-white ground.
//
// These cases are cheap to pin and the failure mode is invisible without them,
// which is exactly the combination that earns a test.
describe('cn · Compass aliases survive tailwind-merge', () => {
  it('keeps a border-width alias next to a border colour', () => {
    const out = cn('border-medium border-neutral-300 bg-transparent');
    expect(out).toContain('border-medium');
    expect(out).toContain('border-neutral-300');
  });

  it('keeps every border-width alias the config defines', () => {
    for (const w of ['none', 'sm', 'md', 'lg', 'thin', 'medium', 'thick']) {
      expect(cn(`border-${w} border-stroke`), `border-${w}`).toContain(`border-${w}`);
    }
  });

  it('keeps a type-scale size next to a text colour', () => {
    const out = cn('text-caption text-error-700');
    expect(out).toContain('text-caption');
    expect(out).toContain('text-error-700');
  });

  it('still lets a later width win over an earlier one', () => {
    // The point is classification, not suppression: two widths must still
    // collapse to the last, or overriding a variant's border stops working.
    expect(cn('border-medium', 'border-thin')).toBe('border-thin');
  });
});
