import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { anonProviderLabel, PROVIDER_NAMES } from './requests';

// Die anonymen Anbieter-Labels vor der Buchung. Bis 2026-10-07 standen sie als
// deutsche Literale im Code und lasen sich in jeder Sprache deutsch.
const HERE = dirname(fileURLToPath(import.meta.url));
const labels = (lng: string): Record<string, string> =>
  JSON.parse(readFileSync(join(HERE, `../../public/locales/${lng}/userws.json`), 'utf8')).requests.anonProvider;

describe('anonyme Anbieter-Labels', () => {
  it('jedes Label hat einen Text in vier Sprachen, EN ist die kanonische Fassung', () => {
    const en = labels('en');
    for (const [key, canonical] of Object.entries(PROVIDER_NAMES)) {
      expect(en[key], key).toBe(canonical);
      for (const lng of ['de', 'es', 'tr']) {
        const v = labels(lng)[key];
        expect(v?.trim(), `${lng} ${key}`).toBeTruthy();
        expect(v, `${lng} ${key} ist nur die englische Fassung`).not.toBe(canonical);
      }
    }
    expect(Object.keys(en).sort()).toEqual(Object.keys(PROVIDER_NAMES).sort());
  });

  it('liest das Label ueber den Schluessel und faellt fuer Unbekannte auf den Rohwert zurueck', () => {
    const t = (k: string, o: { defaultValue: string }) => (k === 'requests.anonProvider.studio-bianchi' ? 'Verifizierte Steuerkanzlei · Norditalien' : o.defaultValue);
    expect(anonProviderLabel(t, { providerKey: 'studio-bianchi', company: PROVIDER_NAMES['studio-bianchi'] })).toBe('Verifizierte Steuerkanzlei · Norditalien');
    expect(anonProviderLabel(t, { providerKey: 'unbekannt', company: 'unbekannt' })).toBe('unbekannt');
  });
});
