import { describe, it, expect } from 'vitest';
import { parseActiveSince } from './activeSince';

describe('parseActiveSince', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  it('leer heisst: nicht anzeigen', () => {
    expect(parseActiveSince('', now)).toBeNull();
    expect(parseActiveSince('   ', now)).toBeNull();
  });
  it('vier Ziffern von 1900 bis heute', () => {
    expect(parseActiveSince('1900', now)).toBe(1900);
    expect(parseActiveSince(' 2013 ', now)).toBe(2013);
    expect(parseActiveSince('2026', now)).toBe(2026);
  });
  it('alles andere, statt still zu raten', () => {
    for (const v of ['seit 2013', '2O13', '15', '1899', '2027', '2013–2015', '2013.0', '+2013']) expect(parseActiveSince(v, now), v).toBe('invalid');
  });
});
