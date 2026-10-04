import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import i18next from 'i18next';

// "1 Bereiche im Fokus": the header read `{{total}}` without a plural form, so
// a single area came out plural in every language. With `count` and _one /
// _other, i18next picks the form from the locale's own plural rules.

const LOCALES = join(dirname(fileURLToPath(import.meta.url)), '../../public/locales');
const load = (lng: string) => JSON.parse(readFileSync(join(LOCALES, lng, 'results.json'), 'utf8'));

const EXPECTED: Record<string, [string, string]> = {
  en: ['Based on your assessment. 1 domain in scope.', 'Based on your assessment. 2 domains in scope.'],
  de: ['Basierend auf Ihrer Einschätzung. 1 Bereich im Fokus.', 'Basierend auf Ihrer Einschätzung. 2 Bereiche im Fokus.'],
  es: ['Basado en su evaluación. 1 ámbito en alcance.', 'Basado en su evaluación. 2 ámbitos en alcance.'],
  // Turkish keeps the noun singular after a numeral.
  tr: ['Değerlendirmenize dayanmaktadır. Kapsamda 1 alan bulunuyor.', 'Değerlendirmenize dayanmaktadır. Kapsamda 2 alan bulunuyor.'],
};

describe('results:header.subtitleProfile plural', () => {
  for (const [lng, [one, two]] of Object.entries(EXPECTED)) {
    it(`agrees with the number of areas in ${lng}`, async () => {
      const i18n = i18next.createInstance();
      await i18n.init({ lng, resources: { [lng]: { results: load(lng) } }, defaultNS: 'results', interpolation: { escapeValue: false } });
      expect(i18n.t('header.subtitleProfile', { count: 1 })).toBe(one);
      expect(i18n.t('header.subtitleProfile', { count: 2 })).toBe(two);
    });
  }
});
