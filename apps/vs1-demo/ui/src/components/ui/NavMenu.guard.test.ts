import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Waechter: keine role="menu"-Navigation mehr ─────────────────────────────
// NavMenu ist eine Disclosure, keine Menue-Widget-Implementierung: der Trigger
// traegt aria-expanded + aria-controls, die Ziele bleiben echte Links. Unter
// role="menuitem" hoert ein Eintrag auf, als Link angesagt zu werden, und
// Neuer-Tab, Cmd-Klick, Adresse-kopieren und die Screenreader-Linkliste
// verlieren ihn.
//
// Genau das stand dreimal im Code, zweimal mit role="menu" ueber einem
// Tastatur-Interface, das gar nicht existierte — MarketingHeaders LanguageMenu
// hatte in der ganzen Datei keinen Key-Handler. Alle drei sind auf NavMenu
// migriert. Dieser Test haelt das Ergebnis: die naechste handgebaute Variante
// faellt beim ersten Lauf auf, nicht beim naechsten Accessibility-Audit.
//
// NavMenu.contract.test.tsx prueft das Verhalten der Komponente. Dieser Test
// prueft, dass es keinen Weg daran vorbei gibt — die beiden zusammen sind erst
// die Regel.

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../..');

// Navigationsflaechen. Rollen-Bereiche und Wizard bleiben aussen vor: dort gibt
// es echte Anwendungsmenues, und eine Regel, die auf korrektem Code feuert,
// bringt Leuten bei, sie abzuschalten.
const SCOPE = ['components/layout', 'components/compliance-areas', 'components/home', 'components/common'];

function collect(dir: string): string[] {
  const abs = join(SRC, dir);
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return out; // Verzeichnis existiert nicht mehr — kein Grund zu scheitern.
  }
  for (const entry of entries) {
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collect(join(dir, entry)));
      continue;
    }
    if (!entry.endsWith('.tsx')) continue;
    if (entry.includes('.test.') || entry.includes('.stories.') || entry.includes('.figma.')) continue;
    out.push(full);
  }
  return out;
}

const FILES = SCOPE.flatMap(collect);

/** Kommentarzeilen raus: mehrere Dateien erklaeren, warum sie es NICHT tun. */
const code = (src: string) =>
  src
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

describe('NavMenu-Waechter · Navigationsflaechen', () => {
  it('erfasst ueberhaupt Dateien (schuetzt den Waechter vor sich selbst)', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(10);
  });

  it('kuendigt nirgends ein Menue-Widget an', () => {
    const treffer: string[] = [];
    for (const file of FILES) {
      const src = code(readFileSync(file, 'utf8'));
      for (const pattern of ['role="menu"', "role='menu'", 'role="menuitem"', "role='menuitem'"]) {
        if (src.includes(pattern)) treffer.push(`${relative(SRC, file)} → ${pattern}`);
      }
    }
    expect(treffer, 'Navigation ist eine Disclosure — NavMenu benutzen').toEqual([]);
  });

  it('verspricht kein aria-haspopup="menu" ohne Menue dahinter', () => {
    const treffer: string[] = [];
    for (const file of FILES) {
      const src = code(readFileSync(file, 'utf8'));
      if (/aria-haspopup=["']menu["']/.test(src)) treffer.push(relative(SRC, file));
    }
    expect(treffer).toEqual([]);
  });

  it('hat die zwei migrierten Aufrufstellen auf NavMenu', () => {
    // Positivprobe: die Regel oben liesse sich auch dadurch erfuellen, dass
    // jemand das Attribut streicht und den handgebauten Rest stehen laesst.
    for (const f of ['components/layout/LanguageMenu.tsx', 'components/compliance-areas/AreaSwitcher.tsx']) {
      const src = readFileSync(join(SRC, f), 'utf8');
      expect(src, `${f} soll NavMenu benutzen`).toContain('<NavMenu');
    }
  });
});
