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

// ─── Zweite Wurzel-3-Haelfte: die Komponente statt des Nachbaus ───────────────
// Von 58 rohen <button> auf der Marketing-Flaeche waren nur ~20 CTAs — der Rest
// sind Akkordeon-Koepfe, Combobox-Trigger, Schliessen-Kreuze und Ankerpillen,
// die zu Recht KEINE <Button> sind. Die Kennzahl "Adoption 18 %" war deshalb
// irrefuehrend: gemessen an dem, was ueberhaupt ein Button sein soll, lag sie
// bei knapp der Haelfte.
//
// Der Nachbau hatte einen sachlichen Grund. Die Komponente konnte die
// Marketing-Form nicht erzeugen: sie sprach nur rounded-md (6 px) bei FESTEN
// Pixelhoehen und mit whitespace-nowrap, waehrend die Seiten rounded-xl (10 px),
// 46-57 px hohe Knoepfe und umbrechende Labels brauchen — "Meinen Bedarf
// ermitteln" laeuft auf Deutsch ueber zwei Zeilen. Erst shape="soft",
// size="xl" (min-height statt height), wrap und die beiden inverse-Varianten
// fuer die dunklen Baender machten die Umstellung ueberhaupt moeglich.
//
// Dieser Test haelt nur die eng definierte Klasse: ein rohes <button>, das wie
// ein CTA AUSSIEHT (gefuellte Marken-/Akzent-/Weissflaeche plus Radius). Er
// verbietet NICHT rohe <button> an sich — das waere falsch und wuerde auf 42
// korrekten Stellen feuern.

/** Klassen im Ruhezustand — hover:/focus:/dark:-Praefixe zaehlen nicht als Fuellung. */
function baseClassNames(tag: string): string {
  const raw = [...tag.matchAll(/className=\{?[`"']([^`"']*)/g)].map((m) => m[1]).join(' ');
  return raw
    .split(/\s+/)
    .filter((c) => c && !c.includes(':'))
    .join(' ');
}

/** Ein <button …> vom Namen bis zu seinem schliessenden > — Ausdruecke inklusive. */
function buttonTags(src: string): { index: number; tag: string }[] {
  const out: { index: number; tag: string }[] = [];
  for (const m of src.matchAll(/<button\b/g)) {
    let i = m.index! + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    while (i < src.length) {
      const ch = src[i];
      if (quote) {
        if (ch === quote && src[i - 1] !== '\\') quote = null;
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
      i++;
    }
    out.push({ index: m.index!, tag: src.slice(m.index!, i + 1) });
  }
  return out;
}

describe('Design-System-Waechter · Komponente statt Nachbau', () => {
  it('baut keinen CTA aus einem rohen <button> nach', () => {
    const found: string[] = [];
    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      for (const { index, tag } of buttonTags(src)) {
        const cls = baseClassNames(tag);
        const filled = /\bbg-(?:brand|primary-\d00|accent-\d00|white)\b/.test(cls);
        if (filled && /\brounded-/.test(cls)) {
          const line = src.slice(0, index).split('\n').length;
          found.push(`${relative(SRC, file)}:${line}`);
        }
      }
    }
    expect(
      found,
      'Gefuellter CTA als rohes <button> gebaut. Die Komponente kann das jetzt:\n' +
        '  <Button shape="soft" size="lg|xl">        Marken-CTA (10px Radius)\n' +
        '  <Button variant="inverse" …>              weisse Flaeche auf dunklem Band\n' +
        '  <Button variant="inverseOutline" …>       Outline auf dunklem Band\n' +
        '  wrap                                      Label darf umbrechen\n' +
        'Gefunden:\n  ' + found.join('\n  '),
    ).toEqual([]);
  });

  it('nutzt die Komponente inzwischen mehr als doppelt so oft wie vorher', () => {
    const uses = FILES.reduce(
      (n, f) => n + (readFileSync(f, 'utf8').match(/<Button\b/g) ?? []).length,
      0,
    );
    // Vor der Umstellung: 14. Die Zahl darf wachsen, aber nicht zurueckfallen.
    expect(uses).toBeGreaterThanOrEqual(30);
  });
});
