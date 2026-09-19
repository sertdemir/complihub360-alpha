#!/usr/bin/env node
// Holt die EZB-Referenzkurse und friert sie als generierte Datei ein.
//
// WARUM EINGEFROREN UND NICHT ZUR LAUFZEIT: eine Obergrenze, die das Gesetz in
// Pfund nennt, wird fuer die Risikosumme in Euro gebraucht. Holte die Anzeige
// den Kurs selbst, haenge sie an einem fremden Dienst — faellt er aus, fehlt
// die Zahl oder altert stumm. Eingefroren ist der Kurs dagegen im Diff
// sichtbar, der Build bleibt offline lauffaehig, und wie alt er ist, prueft
// ein Waechter.
//
// Aufruf:  node scripts/fetch-fx-rates.mjs
// Danach:  npm run test --workspaces  (der Waechter rechnet nach)

import fs from 'node:fs';
import path from 'node:path';

const QUELLE = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const ZIEL = path.join(import.meta.dirname, '..', 'packages', 'compliance-engine', 'fx-rates.generated.ts');
const GEBRAUCHT = ['USD', 'GBP', 'TRY'];

const antwort = await fetch(QUELLE);
if (!antwort.ok) {
  console.error(`EZB antwortet mit ${antwort.status}. Kurse nicht erneuert.`);
  process.exit(1);
}
const xml = await antwort.text();

const tag = xml.match(/time='(\d{4}-\d{2}-\d{2})'/)?.[1];
if (!tag) {
  console.error('Kein Kursdatum im EZB-Dokument gefunden. Format geaendert?');
  process.exit(1);
}

const kurse = {};
for (const w of GEBRAUCHT) {
  const m = xml.match(new RegExp(`currency='${w}' rate='([\\d.]+)'`));
  if (!m) {
    console.error(`Kurs fuer ${w} fehlt im EZB-Dokument.`);
    process.exit(1);
  }
  kurse[w] = Number(m[1]);
}

const zeilen = GEBRAUCHT.map((w) => `    ${w}: ${kurse[w]},`).join('\n');
const inhalt = `// GENERIERT von scripts/fetch-fx-rates.mjs — nicht von Hand bearbeiten.
//
// EZB-Referenzkurse, eingefroren. Einheit: Fremdwaehrung je 1 EUR, also
// EUR = Betrag / kurs. Die EZB veroeffentlicht werktags gegen 16:00 MEZ;
// an Wochenenden und Feiertagen bleibt der letzte Werktag stehen.
//
// Erneuern mit:  node scripts/fetch-fx-rates.mjs

/** Tag, fuer den die Kurse gelten — nicht der Tag des Abrufs. */
export const FX_STAND = '${tag}';

/** Fremdwaehrung je 1 EUR. */
export const FX_JE_EUR = {
${zeilen}
} as const;

export type FxWaehrung = keyof typeof FX_JE_EUR;

/** Rechnet einen Betrag in seiner Waehrung nach Euro um, auf ganze Euro
 *  gerundet. EUR bleibt unveraendert. Gibt null zurueck, wenn fuer die
 *  Waehrung kein Kurs eingefroren ist — dann fehlt lieber eine Zahl als dass
 *  eine falsche entsteht. */
export function inEuro(betrag: number, waehrung: string): number | null {
    if (waehrung === 'EUR') return Math.round(betrag);
    const kurs = (FX_JE_EUR as Record<string, number | undefined>)[waehrung];
    if (!kurs) return null;
    return Math.round(betrag / kurs);
}
`;

fs.writeFileSync(ZIEL, inhalt);
console.log(`Kurse vom ${tag} eingefroren in ${path.relative(process.cwd(), ZIEL)}`);
for (const w of GEBRAUCHT) console.log(`  ${w}  ${kurse[w]}`);
