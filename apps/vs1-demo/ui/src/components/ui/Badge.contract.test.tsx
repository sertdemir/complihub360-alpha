import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Badge } from './Badge';

// Badge had TWO usages in the entire project, both inside components/ui itself,
// and zero on the marketing surface — which had built 16 round labels by hand.
// The reason was not laziness: Badge coloured with raw palette steps
// (neutral-100/300, primary-50/500) while the pages are built on the semantic
// layer (bg-surface-secondary, text-fg-brand). Reaching for the component meant
// importing palette colours into token-based pages. neutral and brand now speak
// the semantic layer; accent deliberately does not — see below.

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Badge.tsx'), 'utf8');

describe('Badge — the shape the marketing labels need', () => {
  it('is rectangular by default, because the Compass badge family is', () => {
    render(<Badge>Neu</Badge>);
    expect(screen.getByText('Neu').className).toMatch(/rounded-\[\d+px\]/);
  });

  it('can go fully round on request', () => {
    render(<Badge shape="pill">Neu</Badge>);
    const c = screen.getByText('Neu').className;
    expect(c).toContain('rounded-full');
    expect(c).not.toMatch(/rounded-\[\d+px\]/);
  });

  it('offers the 10px step the smallest labels use', () => {
    render(<Badge size="xs">Neu</Badge>);
    expect(screen.getByText('Neu').className).toContain('text-[10px]');
  });
});

describe('Badge — a fixed ground may not carry flipping text', () => {
  // The trap, hit twice in this project: pairing a background that does NOT
  // follow the theme with a foreground token that DOES. Moving the gold badge's
  // label to text-fg-accent-strong while its bg-accent-50 stayed fixed measured
  // 1.98:1 in dark mode. Either both sides flip, or neither does.
  const TONE_BLOCK = SRC.slice(SRC.indexOf('const TONE'), SRC.indexOf('export interface BadgeProps'));

  const FIXED_BG = /bg-(?:accent|neutral|primary|gold)-\d+/;
  const SEMANTIC_FG = /text-fg-[\w-]+/;

  it('never pairs a fixed palette background with a semantic text token', () => {
    const offenders: string[] = [];
    for (const line of TONE_BLOCK.split('\n')) {
      const m = /^\s*(soft|outline|solid):\s*'([^']+)'/.exec(line);
      if (!m) continue;
      const classes = m[2];
      const base = classes.split(/\s+/).filter((c) => !c.includes(':'));
      const hasFixedBg = base.some((c) => FIXED_BG.test(c));
      const hasSemanticFg = base.some((c) => SEMANTIC_FG.test(c));
      // `solid` is exempt: text-fg-on-accent/on-brand are *pair* tokens, defined
      // against exactly that fill, so they are correct by construction.
      if (m[1] !== 'solid' && hasFixedBg && hasSemanticFg) offenders.push(`${m[1]}: ${classes}`);
    }
    expect(
      offenders,
      'Feste Palettenflaeche mit kippendem Text-Token gepaart. Entweder beide ' +
        'Seiten folgen dem Theme, oder keine:\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });

  it('gives every fixed-palette soft tone an explicit dark counterpart', () => {
    const offenders: string[] = [];
    for (const line of TONE_BLOCK.split('\n')) {
      const m = /^\s*(soft|outline):\s*'([^']+)'/.exec(line);
      if (!m) continue;
      const classes = m[2];
      const base = classes.split(/\s+/).filter((c) => !c.includes(':'));
      if (!base.some((c) => FIXED_BG.test(c) || /border-(?:accent|primary|neutral)-\d+/.test(c))) continue;
      if (!classes.includes('dark:')) offenders.push(`${m[1]}: ${classes}`);
    }
    expect(
      offenders,
      'Feste Palettenfarbe ohne dark:-Gegenstueck — im Dark-Mode bleibt der ' +
        'helle Wert stehen:\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });
});
