import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── /pricing copy contract ──────────────────────────────────────────────────
// The page is almost entirely translated strings, so the realistic way for it to
// break is a key that exists in the component and nowhere in the locale files —
// which renders the raw key path to the user and passes every render test that
// mocks i18n (as the page tests in this repo do).
//
// So this asserts against the JSON directly: every `pricing.*` key the component
// asks for must resolve in ALL four locales. It reads the component source rather
// than a hand-maintained list, so adding a key to the page without translating it
// fails here instead of shipping.

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'de', 'es', 'tr'] as const;
const FREE_COUNT = 3; // mirrors the constant in PricingPage.tsx
const FAQ_COUNT = 6; // mirrors the constant in PricingPage.tsx
// The page interpolates three different variables into key paths; each expands
// over its own domain, so the extractor has to tell them apart.
const EXPANSIONS: Record<string, string[]> = {
  i: Array.from({ length: FREE_COUNT }, (_, n) => String(n)),     // free.items.${i}
  index: Array.from({ length: FAQ_COUNT }, (_, n) => String(n)),  // faq.items.${index}
  base: ['who', 'ranking', 'specialist'],                         // ${base}.kicker
};

function loadCommon(lng: string) {
  return JSON.parse(readFileSync(resolve(here, `../../public/locales/${lng}/common.json`), 'utf8'));
}
function get(obj: unknown, path: string) {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

/** Every `pricing.…` key the component requests, template literals expanded. */
function keysUsedByPage(): string[] {
  const src = readFileSync(resolve(here, 'PricingPage.tsx'), 'utf8');
  const keys = new Set<string>();
  for (const m of src.matchAll(/['"`]pricing\.([A-Za-z0-9_.$}{]+)['"`]/g)) {
    const raw = `pricing.${m[1]}`;
    const varMatch = raw.match(/\$\{(\w+)/);
    if (varMatch) {
      const values = EXPANSIONS[varMatch[1]];
      if (!values) throw new Error(`unknown interpolation \${${varMatch[1]}} in ${raw} — add it to EXPANSIONS`);
      for (const v of values) keys.add(raw.replace(/\$\{[^}]+\}/, v));
    } else {
      keys.add(raw);
    }
  }
  return [...keys].sort();
}

describe('/pricing copy', () => {
  const used = keysUsedByPage();

  it('asks for a non-trivial number of keys (guards the extractor itself)', () => {
    expect(used.length).toBeGreaterThanOrEqual(12);
  });

  it.each(LOCALES)('resolves every key the page uses in %s', (lng) => {
    const dict = loadCommon(lng);
    const missing = used.filter((k) => typeof get(dict, k) !== 'string');
    expect(missing, `missing in ${lng}: ${missing.join(', ')}`).toEqual([]);
  });

  it('never leaves a locale on the English string for the body copy', () => {
    const en = loadCommon('en');
    for (const lng of LOCALES.filter((l) => l !== 'en')) {
      const other = loadCommon(lng);
      for (const k of ['pricing.lead', 'pricing.who.body', 'pricing.ranking.body']) {
        expect(get(other, k), `${k} is untranslated in ${lng}`).not.toBe(get(en, k));
      }
    }
  });
});
