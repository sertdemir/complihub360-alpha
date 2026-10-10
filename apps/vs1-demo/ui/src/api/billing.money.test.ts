import { describe, it, expect } from 'vitest';
import { money } from './billing';

describe('money', () => {
  it('glatte Betraege ohne, alle anderen mit zwei Nachkommastellen', () => {
    expect(money(14900)).toBe('$149');
    expect(money(13410)).toBe('$134.10');
    expect(money(8910)).toBe('$89.10');
    expect(money(1)).toBe('$0.01');
    expect(money(0)).toBe('$0');
  });
});
