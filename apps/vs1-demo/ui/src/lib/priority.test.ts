import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRIORITY_EN, PRIORITY_LEVELS, priorityOf, severityOf } from './priority';

const LOCALES = resolve(__dirname, '../../public/locales');
const read = (lng: string, ns: string) => JSON.parse(readFileSync(resolve(LOCALES, lng, `${ns}.json`), 'utf8'));

describe('priorityOf', () => {
  it('maps the engine level critical to Immediate, the rest unchanged', () => {
    expect(priorityOf('critical')).toBe('immediate');
    expect(priorityOf('high')).toBe('high');
    expect(priorityOf('medium')).toBe('medium');
    expect(priorityOf('low')).toBe('low');
  });

  it('every surface that labels a level carries all four priority keys in every language', () => {
    for (const lng of ['en', 'de', 'es', 'tr']) {
      const tables = [
        read(lng, 'results').priority,
        read(lng, 'home').risk.priority,
        read(lng, 'common').compliance.priority,
        read(lng, 'userws').home.priorityTag,
      ];
      for (const table of tables) expect(Object.keys(table).sort()).toEqual([...PRIORITY_LEVELS].sort());
    }
  });

  it('one word per level across the EN surfaces', () => {
    const tables = [
      read('en', 'results').priority,
      read('en', 'home').risk.priority,
      read('en', 'common').compliance.priority,
      read('en', 'userws').home.priorityTag,
    ];
    for (const table of tables) expect(table).toEqual(PRIORITY_EN);
  });
});

describe('severityOf', () => {
  it('is the inverse of priorityOf', () => {
    for (const p of PRIORITY_LEVELS) expect(priorityOf(severityOf(p))).toBe(p);
  });
});
