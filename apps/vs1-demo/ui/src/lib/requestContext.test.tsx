import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ─── Kontextzeile (1 V3) und Anbieter-Beschreibung (3 V3) ────────────────────
// Beide Seiten — Nutzer und Partner — beschreiben eine Anfrage gleich, und die
// Anbieter-Beschreibung kommt in der Sprache des Nutzers statt als englische
// Server-Zeile. Die Uebersetzung selbst ist hier gestellt: geprueft wird, dass
// aus Codes Namen werden und nie ein Slug durchrutscht.

const NAMEN: Record<string, string> = {
  'domain.taxVat': 'Steuern & USt',
  'domain.productPackaging': 'EPR & Verpackung',
  'domain.dataPrivacy': 'Daten & Datenschutz',
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => NAMEN[k] ?? k, i18n: { resolvedLanguage: 'de' } }),
}));

import { useRequestContext } from './requestContext';

describe('useRequestContext', () => {
  it('baut die Kontextzeile Bereich · Markt · Eingang · ID, ohne Slugs', () => {
    const { result } = renderHook(() => useRequestContext());
    const vorZwoelf = new Date(Date.now() - 12 * 60_000).toISOString();
    const zeile = result.current.kontext({ category: 'product-packaging', country: 'de', createdAt: vorZwoelf, ref: 'RQ-7C41' });
    expect(zeile).toMatch(/^EPR & Verpackung · Deutschland · vor 12 Min\. · RQ-7C41$/);
    expect(zeile).not.toContain('product-packaging');
  });

  it('laesst fehlende Teile weg statt Platzhalter zu zeigen', () => {
    const { result } = renderHook(() => useRequestContext());
    expect(result.current.kontext({ ref: 'RQ-0001' })).toBe('RQ-0001');
  });

  it('uebersetzt die Beschreibung aus Codes, sortiert und mit +n wie der Server', () => {
    const { result } = renderHook(() => useRequestContext());
    const text = result.current.beschreibung({ areaCodes: ['tax-vat', 'product-packaging', 'data-privacy'], region: 'Norddeutschland', fallback: 'Tax and VAT · Norddeutschland' });
    expect(text).toBe('Daten & Datenschutz, EPR & Verpackung +1 · Norddeutschland');
    expect(result.current.beschreibung({ areaCodes: ['tax-vat', 'data-privacy'], region: null }, 0)).toBe('Daten & Datenschutz, Steuern & USt');
  });

  it('faellt ohne Codes auf die Server-Zeile zurueck (aelterer Server)', () => {
    const { result } = renderHook(() => useRequestContext());
    expect(result.current.beschreibung({ areaCodes: [], fallback: 'Tax and VAT · Berlin' })).toBe('Tax and VAT · Berlin');
  });
});
