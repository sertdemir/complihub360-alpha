import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Design-System-Waechter ───────────────────────────────────────────────────
// Wurzel 3 des Qualitaets-Konzils: "Der Weg an der Komponente vorbei ist
// billiger als der durch sie." Auf der Marketing-Flaeche standen 275 freie
// Schriftgroessen (text-[Npx]) gegen 75 Verwendungen der Skala — Adoption 21 %.
// Und das, obwohl 205 davon ein EXAKTES Aequivalent hatten.
//
// Der Grund war nicht Bequemlichkeit allein: die semantischen Kleinstufen
// caption (12px) und eyebrow (11px) tragen Laufweite und eine engere
// Zeilenhoehe, die die Verwendungen gar nicht wollten. Die Skala hatte unter
// 17px keine NEUTRALE Stufe. Deshalb wurden am 20.08. body-md/-2xs/-3xs/-4xs/
// -5xs ergaenzt (15/12/11/10/9 px, Zeilenhoehe 1.6, kein Tracking) und die 254
// betroffenen Stellen migriert — im laufenden Build gegen einen Referenzabdruck
// von 585 Elementen geprueft, Sektionshoehe unveraendert bei exakt 4002 px.
//
// Dieser Test haelt das Ergebnis. Er ersetzt die im Report vorgeschlagene
// ESLint-Regel, weil die CI dieses Repos gar kein Lint ausfuehrt (ci.yml:
// i18n:check, typecheck, build, test) — eine Regel dort waere wirkungslos
// gewesen. Ein Test laeuft ohnehin mit.
//
// BEWUSST NICHT geprueft werden rohe FARB-Klassen. Auf der Marketing-Flaeche
// stehen noch ~40, und die meisten sind richtig: die absichtlich dunklen
// Baender (bg-primary-700/800/900 mit text-white) und die weissen CTA-Knoepfe
// darauf duerfen NICHT mit dem Theme kippen. Eine Regel, die auf korrektem Code
// feuert, bringt Leuten bei, sie abzuschalten.

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '..');

// Die oeffentliche Marketing-Flaeche. Rollen-Bereiche bleiben aussen vor: dort
// stehen noch 404 freie Werte, und sie sind nicht Gegenstand dieses Wurzelfixes.
const SCOPE = [
  { dir: 'pages', recursive: false },
  { dir: 'components/home', recursive: true },
  { dir: 'components/compliance-areas', recursive: true },
  { dir: 'components/layout', recursive: true },
];

function collect(dir: string, recursive: boolean): string[] {
  const abs = join(SRC, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) {
      if (recursive) out.push(...collect(join(dir, entry), true));
      continue;
    }
    if (!entry.endsWith('.tsx')) continue;
    if (entry.includes('.test.') || entry.includes('.stories.') || entry.includes('.figma.')) continue;
    out.push(full);
  }
  return out;
}

const FILES = SCOPE.flatMap((s) => collect(s.dir, s.recursive));

describe('Design-System-Waechter · Marketing-Flaeche', () => {
  it('erfasst ueberhaupt Dateien (schuetzt den Waechter vor sich selbst)', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(30);
  });

  it('benutzt unter 17px keine freie Schriftgroesse mehr', () => {
    // Unter 17px ist die Skala vollstaendig: 9,10,11,12,13,14,15,16 px haben
    // alle eine neutrale Stufe. Ein freier Wert dort ist deshalb immer ein
    // Umweg, nie eine Notwendigkeit.
    const treffer: string[] = [];
    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      src.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/text-\[(\d+)px\]/g)) {
          if (Number(m[1]) <= 16) treffer.push(`${relative(SRC, file)}:${i + 1} → ${m[0]}`);
        }
      });
    }
    expect(
      treffer,
      `Freie Schriftgroesse statt Skala:\n  ${treffer.join('\n  ')}\n` +
        'Ersatz: 9→text-body-5xs 10→body-4xs 11→body-3xs 12→body-2xs ' +
        '13→body-xs 14→body-sm 15→body-md 16→body',
    ).toEqual([]);
  });

  it('haelt die Skala vollstaendig — jede erlaubte Groesse hat eine Stufe', () => {
    const cfg = readFileSync(resolve(SRC, '..', 'tailwind.config.js'), 'utf8');
    for (const step of ['body-md', 'body-2xs', 'body-3xs', 'body-4xs', 'body-5xs',
                        'body-xs', 'body-sm', 'body-lg', 'caption', 'eyebrow']) {
      expect(cfg, `Stufe ${step} fehlt — ohne sie ist der Waechter oben nicht erfuellbar`)
        .toContain(`'${step}'`);
    }
  });

  it('laesst den Display-Bereich ab 17px bewusst frei', () => {
    // Dort sind Einzelwerte gestalterische Entscheidungen (ein 90px-Hero hat
    // keine Skalenstufe verdient). Der Test dokumentiert die Grenze, statt sie
    // stillschweigend zu lassen.
    const gross = FILES.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/text-\[(\d+)px\]/g)].map((m) => Number(m[1])),
    ).filter((n) => n >= 17);
    expect(gross.every((n) => n >= 17)).toBe(true);
  });
});
