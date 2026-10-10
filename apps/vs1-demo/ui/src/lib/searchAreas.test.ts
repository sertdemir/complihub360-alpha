import { describe, it, expect } from 'vitest';
import { areasForQuery, MAX_AREAS } from './searchAreas';

describe('areasForQuery (feste Stichwortliste, Canvas C2)', () => {
  it('ordnet typische Fragen in vier Sprachen zu', () => {
    expect(areasForQuery('Brauche ich eine Cookie-Einwilligung?')).toEqual(['data-privacy']);
    expect(areasForQuery('When do I need a VAT registration in France?')[0]).toBe('tax-vat');
    expect(areasForQuery('¿Necesito registrarme para envases y EPR?')).toContain('product-packaging');
    expect(areasForQuery('KVKK kapsamında kişisel veri işleme')).toEqual(['data-privacy']);
  });

  it('nur ganze Wörter oder Wortanfänge: „Lust“ ist keine USt, „original“ kein Zoll', () => {
    expect(areasForQuery('Ich habe Lust auf ein Original')).toEqual([]);
    expect(areasForQuery('USt-Voranmeldung')).toEqual(['tax-vat']);
  });

  it('ohne Treffer leer, nie mehr als drei', () => {
    expect(areasForQuery('Hallo, wie geht es?')).toEqual([]);
    expect(areasForQuery('')).toEqual([]);
    const many = areasForQuery('VAT EPR DSGVO Zoll Werbung GmbH Vertrag WEEE CE-Kennzeichnung');
    expect(many.length).toBe(MAX_AREAS);
  });

  it('mehr Treffer zuerst', () => {
    expect(areasForQuery('Zoll, Import und EORI — und die Umsatzsteuer')[0]).toBe('logistics-customs');
  });
});
