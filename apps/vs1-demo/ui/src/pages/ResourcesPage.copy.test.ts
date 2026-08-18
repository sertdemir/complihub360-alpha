import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── /resources copy contract ────────────────────────────────────────────────
// Same guard as PricingPage.copy.test.ts: a key the component asks for and no
// locale file holds renders the raw path to the user, and every render test in
// this repo mocks i18n, so nothing else would catch it.
//
// The page carries a second obligation the pricing page does not. It replaced
// three fabricated customer stories and four invented guides, so it must not
// quietly grow claims again — the last test pins that the promise-free framing
// stays in place.

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'de', 'es', 'tr'] as const;
const EXPANSIONS: Record<string, string[]> = {
  key: ['markets', 'compliance', 'howItWorks'],
};

function loadCommon(lng: string) {
  return JSON.parse(readFileSync(resolve(here, `../../public/locales/${lng}/common.json`), 'utf8'));
}
function get(obj: unknown, path: string) {
  return path.split('.').reduce<unknown>(
    (acc, part) => (acc === undefined || acc === null ? undefined : (acc as Record<string, unknown>)[part]),
    obj,
  );
}

function keysUsedByPage(): string[] {
  const src = readFileSync(resolve(here, 'ResourcesPage.tsx'), 'utf8');
  const keys = new Set<string>();
  for (const m of src.matchAll(/['"`]resources\.([A-Za-z0-9_.$}{]+)['"`]/g)) {
    const raw = `resources.${m[1]}`;
    const v = raw.match(/\$\{(\w+)/);
    if (v) {
      const values = EXPANSIONS[v[1]];
      if (!values) throw new Error(`unknown interpolation \${${v[1]}} in ${raw} — add it to EXPANSIONS`);
      for (const value of values) keys.add(raw.replace(/\$\{[^}]+\}/, value));
    } else {
      keys.add(raw);
    }
  }
  return [...keys].sort();
}

describe('/resources copy', () => {
  const used = keysUsedByPage();

  it('asks for a non-trivial number of keys (guards the extractor itself)', () => {
    expect(used.length).toBeGreaterThanOrEqual(12);
  });

  it.each(LOCALES)('resolves every key the page uses in %s', (lng) => {
    const dict = loadCommon(lng);
    const missing = used.filter((k) => typeof get(dict, k) !== 'string');
    expect(missing, `missing in ${lng}: ${missing.join(', ')}`).toEqual([]);
  });

  it('states the counts through interpolation rather than hardcoding them', () => {
    // A written-out "8 markets" rots the first time the engine gains one, so the
    // meta lines must carry placeholders the page fills from the real sources.
    for (const lng of LOCALES) {
      const dict = loadCommon(lng);
      expect(get(dict, 'resources.entries.markets.meta')).toContain('{{markets}}');
      expect(get(dict, 'resources.entries.compliance.meta')).toContain('{{domains}}');
      expect(get(dict, 'resources.entries.howItWorks.meta')).toContain('{{stages}}');
    }
  });

  it('carries no invented references', () => {
    // The page this replaced named companies that do not exist and guides that
    // were never written. These are the exact shapes of that claim.
    const banned = [/GmbH\b/i, /\bInc\.\b/, /min read/i, /whitepaper/i, /case stud/i];
    for (const lng of LOCALES) {
      const blob = JSON.stringify(loadCommon(lng).resources);
      for (const re of banned) {
        expect(re.test(blob), `${lng} resources copy matches ${re}`).toBe(false);
      }
    }
  });
});
