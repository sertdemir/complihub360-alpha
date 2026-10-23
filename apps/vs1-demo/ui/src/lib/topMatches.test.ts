import { describe, it, expect } from 'vitest';
import { topMatches } from './topMatches';

const p = (ref: string, match: number) => ({ public_ref: ref, match });

describe('topMatches', () => {
  it('Beta 23.10.: aus neun Treffern (2x100, 7x60) die zwei vollen und den ersten Teil-Treffer', () => {
    const list = [p('C', 60), p('A', 100), p('D', 60), p('B', 100), p('E', 60), p('F', 60), p('G', 60), p('H', 60), p('I', 60)];
    expect(topMatches(list).map((x) => x.public_ref)).toEqual(['A', 'B', 'C']);
  });

  it('bei gleichem Match bleibt die Reihenfolge der Engine', () => {
    expect(topMatches([p('X', 80), p('Y', 80), p('Z', 80), p('W', 80)]).map((x) => x.public_ref)).toEqual(['X', 'Y', 'Z']);
  });

  it('Gegenprobe: weniger als drei bleiben vollstaendig', () => {
    expect(topMatches([p('A', 60)])).toHaveLength(1);
    expect(topMatches([])).toEqual([]);
  });
});
