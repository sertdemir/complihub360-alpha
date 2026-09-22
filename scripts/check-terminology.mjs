#!/usr/bin/env node
// ─── Waechter: verbotene Begriffe in den Sprachdateien ───────────────────────
//
// Die "Technical and UX Acceptance Checklist v1.0" (19.09.2026) fuehrt eine
// Umbenennungstabelle und verlangt dazu woertlich:
//
//   "Create a language-file lint test that fails when prohibited terms appear
//    in user-facing English strings, except approved historical or test
//    fixtures."
//
// Genau das ist dieser Waechter. Er prueft die WERTE der Sprachdateien, nicht
// die Schluessel — die bleiben stabil englisch (Checklist, "Visible status
// labels": translate the label, keep the internal key stable). `domains` als
// Schluessel ist also in Ordnung, "Domains" als angezeigter Text nicht.
//
//   node scripts/check-terminology.mjs           pruefen (Exit 1 bei Treffer)
//   node scripts/check-terminology.mjs --all     auch de/es/tr zeigen
//
// Geprueft wird vorrangig EN, weil Englisch nach der Launch-Entscheidung die
// Quelle ist. Die uebersetzten Entsprechungen stehen als eigene Muster
// darunter, damit eine Umbenennung nicht auf halbem Weg stehen bleibt —
// ein deutscher "Verifizierter Partner" ist derselbe Fehler.
//
// ─── Was ABSICHTLICH nicht drinsteht ────────────────────────────────────────
//
// Severity → Priority und Critical/Immediate → Urgent. Beide stehen in der
// Tabelle der Checklist, und beide sind hier bewusst ausgesetzt (Stand
// 2026-09-20). Der Grund ist nicht Bequemlichkeit, sondern dass sie keine
// Begriffe sind, sondern Datenwerte: `severity` kommt 344-mal im Projekt vor
// — als Feld der Compliance-Engine, als Feld der API, in `packages/types`,
// als RiskBadge-Prop und als Design-Token `--color-risk-critical`.
//
// Nur das Label zu aendern baut genau den Zustand, vor dem dieselbe Checkliste
// warnt: "do not keep risk.severity.critical while displaying Urgent". Die
// Umbenennung gehoert deshalb in einen eigenen Schritt mit eigener
// Entscheidung — bis dahin steht sie hier namentlich unter AUSGESETZT, damit
// niemand sie fuer erledigt oder fuer vergessen haelt.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = resolve(ROOT, 'apps/vs1-demo/ui/public/locales');

/** Verbotener Begriff → geforderter Ersatz. Quelle: Checklist v1.0,
 *  Abschnitt "Terminology and Design System Tests".
 *
 *  Alle Muster mit `i`. Bis 2026-09-22 standen sie ohne, und der Waechter
 *  meldete gruen, waehrend "Unlock matches with a free account", "Generate my
 *  risk map" und "a verified partner" im Englischen standen — der Satzanfang
 *  der Tabelle ist Title Case, die Oberflaeche meist nicht. Ein Begriff ist
 *  derselbe Begriff, egal wie er geschrieben wird. */
const VERBOTEN = [
  // ── Englisch, die Quelle ──
  { muster: /Corporate\s*&(?:amp;)?\s*Structure|Corporate and Structure/gi,
    statt: 'Company Setup & Filings' },
  { muster: /\bLegal Advisory\b/gi,       statt: 'Legal Support' },
  { muster: /\bVerified Partners?\b/gi,    statt: 'Verified Provider' },
  { muster: /\bStart the Risk Map\b/gi,    statt: 'Assess My Needs' },
  { muster: /\bGenerate My Risk Map\b/gi,  statt: 'Create My Risk Map' },
  { muster: /\bUnlock Matches\b/gi,        statt: 'See My Best Matches' },
  { muster: /\bStart New Search\b/gi,      statt: 'Start New Assessment' },
  // "Domain" nur als eigenstaendiges Wort: eine E-Mail-Domain und eine
  // Internet-Domain bleiben Domains, ein Fachbereich heisst Area.
  { muster: /\b(?:Compliance )?Domains?\b(?!\s*(?:name|Name|-))/g, statt: 'Area(s)',
    ausser: /\b(?:email|e-mail|web|internet|domain name|supported-domain)\b/i },

];

// Bewusst NICHT geprueft: uebersetzte Bereichsnamen per Muster. "Rechtsberatung"
// steht 16-mal in den deutschen Dateien, und vier davon sind der
// HAFTUNGSAUSSCHLUSS ("CompliHub360 leistet keine Rechtsberatung", "ersetzt
// keine Rechtsberatung"). Dort ist der Begriff richtig und muss stehen bleiben.
// Ein Muster kann die beiden Faelle nicht unterscheiden; die Umbenennung der
// Bereichsnamen lief deshalb gezielt je Schluessel. Was ein Muster sehr wohl
// kann, ist den englischen Terminus finden, der in allen vier Sprachen
// unuebersetzt steht — dafuer sorgt `Verified Partners?` oben, geprueft mit
// --all.

/** Namentliche Ausnahmen: Schluessel, die einen verbotenen Begriff tragen
 *  DUERFEN, mit Grund. Eine Ausnahme ohne Grund gibt es nicht. */
const AUSNAHMEN = new Map([
  // "Domain Restriction" ist hier kein Fachbereich, sondern ein Begriff der
  // KI-Governance (neben Data Sanitization und Explicit Consent). Er meint die
  // Beschraenkung auf einen Gegenstandsbereich, nicht eine Compliance-Flaeche.
  ['common:aiGov.featGateDesc',
   'Domain Restriction = KI-Governance-Begriff, kein Fachbereich'],

  // Der englische Satz zitiert einen deutschen GESETZESBEGRIFF neben seiner
  // Fundstelle: "We do not provide Rechtsberatung within the meaning of
  // §§ RDG / StBerG." Wer ihn uebersetzt, nimmt ihm die juristische Bedeutung —
  // "legal advice" ist keine Rechtsdienstleistung im Sinne des RDG. Deutsches
  // Wort in einem englischen String, und zwar richtig so.
  ['home:footer.disclaimer',
   'Zitierter deutscher Gesetzesbegriff zu §§ RDG / StBerG, nicht uebersetzbar'],
]);

/** In der Checklist gefordert, hier bewusst noch nicht erzwungen.
 *  Siehe Kopfkommentar — jede Zeile mit Datum und Grund. */
const AUSGESETZT = [
  ['Severity → Priority',
   '2026-09-20: `severity` ist ein Datenwert (Engine, API, packages/types, ' +
   'RiskBadge-Prop, Design-Token --color-risk-critical), 344 Vorkommen. ' +
   'Eigener Schritt, eigene Entscheidung.'],
  ['Immediate / Critical → Urgent',
   '2026-09-20: dieselbe Kette wie Severity. Nur das Label zu aendern ergaebe ' +
   'genau das von der Checklist verbotene "risk.severity.critical zeigt Urgent".'],
  ['Saved Sessions → Saved Risk Maps',
   '2026-09-22: kein Wort, sondern ein Konzept. 71 EN-Werte tragen "session", ' +
   'die meisten meinen eine gespeicherte Risk Map (Seitentitel "Your compliance ' +
   'sessions", "No session saved yet", Suchhinweis), einige die Anmeldung ' +
   '("Your session has expired" — die bleibt). Nur die sechs woertlichen ' +
   '"saved sessions" zu tauschen gaebe eine Navigation mit "Saved Risk Maps" ' +
   'ueber einer Seite mit "sessions". Dazu haengen Tabelle `sessions`, ' +
   'Parameter `?session=` und die Sitzungs-Kachel dran.'],
];

function* blaetter(o, pfad = '') {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      yield* blaetter(v, pfad ? `${pfad}.${Array.isArray(o) ? `[${k}]` : k}` : k);
    }
  } else if (typeof o === 'string') {
    yield [pfad, o];
  }
}

function pruefe(sprache) {
  const dir = resolve(LOCALES, sprache);
  const treffer = [];
  for (const datei of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const ns = basename(datei, '.json');
    const daten = JSON.parse(readFileSync(resolve(dir, datei), 'utf8'));
    for (const [pfad, wert] of blaetter(daten)) {
      const schluessel = `${ns}:${pfad}`;
      if (AUSNAHMEN.has(schluessel)) continue;
      for (const { muster, statt, ausser } of VERBOTEN) {
        if (ausser && ausser.test(wert)) continue;
        for (const m of wert.matchAll(muster)) {
          treffer.push({ schluessel, gefunden: m[0], statt, wert });
        }
      }
    }
  }
  return treffer;
}

const alle = process.argv.includes('--all');
const sprachen = alle ? ['en', 'de', 'es', 'tr'] : ['en'];

let gesamt = 0;
for (const s of sprachen) {
  const treffer = pruefe(s);
  gesamt += treffer.length;
  if (treffer.length) {
    console.error(`\n${s}: ${treffer.length} verbotene[r] Begriff[e]\n`);
    for (const t of treffer) {
      console.error(`  ${t.schluessel}`);
      console.error(`      „${t.gefunden}"  ->  ${t.statt}`);
      console.error(`      ${t.wert.length > 90 ? t.wert.slice(0, 90) + '…' : t.wert}`);
    }
  }
}

if (gesamt === 0) {
  const geprueft = sprachen.join(', ');
  console.log(`Terminologie in Ordnung (${geprueft}).`);
  if (AUSGESETZT.length) {
    console.log(`\n${AUSGESETZT.length} Paar(e) aus der Checklist noch nicht erzwungen:`);
    for (const [paar, grund] of AUSGESETZT) console.log(`  ${paar}\n      ${grund}`);
  }
  process.exit(0);
}

console.error(`\n${gesamt} verbotene[r] Begriff[e] in den Sprachdateien.`);
console.error(`Die Tabelle steht in der Acceptance-Checklist v1.0, Abschnitt`);
console.error(`"Terminology and Design System Tests". Wer einen Begriff behalten muss,`);
console.error(`traegt ihn mit Grund in AUSNAHMEN ein — stillschweigend stehen lassen`);
console.error(`ist die dritte Moeglichkeit, die es nicht gibt.\n`);
process.exit(1);
