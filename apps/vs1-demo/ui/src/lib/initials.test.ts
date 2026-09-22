import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

// Eine Regel fuer alle Flaechen. Bis 2026-09-22 nahm die Kopfzeile einen
// Buchstaben und die Seitenleiste zwei — dieselbe Person, zwei Abkuerzungen.

describe('initialsOf', () => {
  it('nimmt zwei Buchstaben, wo der Name zwei Teile hat', () => {
    expect(initialsOf('Serkan Test')).toBe('ST');
    expect(initialsOf('alex weber')).toBe('AW');
  });

  it('nimmt einen, wo es nur einen Teil gibt', () => {
    expect(initialsOf('Ana')).toBe('A');
  });

  it('zerlegt auch einen aus der E-Mail abgeleiteten Namen', () => {
    // useAuthStore bildet genau so einen, wenn kein voller Name in den
    // Metadaten steht: user.email.split('@')[0].
    expect(initialsOf('serkan.test')).toBe('ST');
    expect(initialsOf('alex_weber')).toBe('AW');
    expect(initialsOf('maria-jose')).toBe('MJ');
  });

  it('bleibt bei zwei, auch wenn der Name mehr Teile hat', () => {
    expect(initialsOf('Maximiliane von Trautwein')).toBe('MV');
  });

  it('faellt auf das Ersatzzeichen zurueck, wo kein Name da ist', () => {
    expect(initialsOf(null)).toBe('U');
    expect(initialsOf(undefined)).toBe('U');
    expect(initialsOf('')).toBe('U');
    expect(initialsOf('   ')).toBe('U');
    expect(initialsOf(null, '?')).toBe('?');
  });

  it('schneidet ein Zeichen ausserhalb der BMP nicht in der Mitte durch', () => {
    // charAt(0) lieferte hier die halbe Ersatzzeichen-Paarung — ein Zeichen,
    // das allein nichts bedeutet und als Kaestchen erscheint.
    const out = initialsOf('𝒮erkan Test');
    expect(Array.from(out)).toHaveLength(2);
    expect(out.endsWith('T')).toBe(true);
  });
});
