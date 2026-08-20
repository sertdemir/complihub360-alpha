import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── /about copy contract ────────────────────────────────────────────────────
// Same guard as PricingPage/ResourcesPage: a key the component asks for and no
// locale file holds renders the raw path to the user, and every render test in
// this repo mocks i18n, so nothing else would catch it.
//
// Two obligations specific to this page:
//   1. about.behave.items is an ARRAY, and the page renders one <li> per entry.
//      A locale with fewer principles than English silently ships a shorter
//      list, which no string-only check would notice — so the lengths are
//      pinned across locales.
//   2. The page exists because the footer linked "Über uns" to href="#" for
//      months. The last test pins that the link now has a destination, so the
//      page cannot be orphaned again by an edit to the footer.

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'de', 'es', 'tr'] as const;
const EXPANSIONS: Record<string, string[]> = {
  key: ['purpose', 'mission', 'vision'],
};
// Keys the page reads with returnObjects — arrays, not strings.
const ARRAY_KEYS = ['about.behave.items'];

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
  const src = readFileSync(resolve(here, 'AboutPage.tsx'), 'utf8');
  const keys = new Set<string>();
  for (const m of src.matchAll(/['"`]about\.([A-Za-z0-9_.$}{]+)['"`]/g)) {
    const raw = `about.${m[1]}`;
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

describe('/about copy', () => {
  const used = keysUsedByPage();
  const stringKeys = used.filter((k) => !ARRAY_KEYS.includes(k));

  it('asks for a non-trivial number of keys (guards the extractor itself)', () => {
    expect(used.length).toBeGreaterThanOrEqual(12);
  });

  it.each(LOCALES)('resolves every string key the page uses in %s', (lng) => {
    const dict = loadCommon(lng);
    const missing = stringKeys.filter((k) => typeof get(dict, k) !== 'string');
    expect(missing, `missing in ${lng}: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(LOCALES)('carries the same number of behaviour principles in %s', (lng) => {
    const items = get(loadCommon(lng), 'about.behave.items');
    const reference = get(loadCommon('en'), 'about.behave.items') as string[];
    expect(Array.isArray(items), `about.behave.items is not an array in ${lng}`).toBe(true);
    expect((items as string[]).length).toBe(reference.length);
    expect((items as string[]).every((s) => typeof s === 'string' && s.trim().length > 0)).toBe(true);
  });

  it('keeps the four brand statements the addendum defines as master wording', () => {
    // Why We Exist / Purpose / Mission / Vision are the reason this page exists.
    // If a refactor drops one of the four, the page stops doing its job.
    for (const lng of LOCALES) {
      const dict = loadCommon(lng);
      for (const path of ['about.why.statement', 'about.purpose.body', 'about.mission.body', 'about.vision.body']) {
        const value = get(dict, path);
        expect(typeof value === 'string' && (value as string).length > 40, `${path} too short in ${lng}`).toBe(true);
      }
    }
  });

  it('the footer link that motivated this page now has a destination', () => {
    const footer = readFileSync(resolve(here, '../components/home/SiteFooter.tsx'), 'utf8');
    expect(footer).toContain("{ key: 'about', href: '/about' }");
    expect(footer).not.toContain("{ key: 'about', href: '#' }");
  });
});
