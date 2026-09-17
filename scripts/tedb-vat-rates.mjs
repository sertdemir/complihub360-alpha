#!/usr/bin/env node
// ─── TEDB-Prototyp: MwSt-Saetze aus amtlicher Quelle statt aus dem EY-Guide ───
//
// FRAGE, DIE DIESES SKRIPT BEANTWORTET: Wie weit kommen wir mit der Taxes in
// Europe Database, wenn wir die Werte in `jurisdiction_facts` nicht mehr aus
// einer lizenzierten Verlagspublikation, sondern aus der Quelle beziehen, die
// die Finanzministerien der Mitgliedstaaten selbst befuellen?
//
// Es aendert NICHTS an der Datenbank. Es holt die Saetze, stellt sie neben
// unsere heutigen Werte und sagt je Zeile: deckungsgleich, abweichend, oder
// von TEDB nicht zu bekommen. Das Ergebnis ist die Entscheidungsgrundlage,
// nicht die Migration.
//
// DER DIENST (Vertrag aus der WSDL, nicht geraten):
//   Endpoint     http://ec.europa.eu/taxation_customs/tedb/ws/
//   SOAPAction   urn:ec.europa.eu:taxud:tedb:services:v1:VatRetrievalService/RetrieveVatRates
//   Request      memberStates.isoCode[] + situationOn  (oder from/to fuer Zeitraeume)
//   Response     vatRateResults[] mit memberState · type (STANDARD|REDUCED)
//                · rate.type (DEFAULT|REDUCED_RATE|SUPER_REDUCED_RATE|
//                  PARKING_RATE|NOT_APPLICABLE|OUT_OF_SCOPE|EXEMPTED)
//                · rate.value · situationOn · optional category/cnCodes/comment
//
// REICHWEITE — und das ist der eigentliche Befund: TEDB kennt die EU-
// Mitgliedstaaten plus XI (Nordirland). Von unseren neun Maerkten sind das
// sechs. GB faellt seit dem Brexit heraus, US und TR waren nie drin. Fuer die
// drei brauchen wir eine eigene Quelle (UK: legislation.gov.uk / HMRC unter
// OGL v3) — TEDB allein loest das Problem also nicht ganz.
//
// Kein npm-Paket: fetch und ein winziger XML-Leser reichen fuer ein flaches,
// maschinenerzeugtes Schema. Ein Prototyp soll keine Abhaengigkeit hinterlassen.
//
//   node scripts/tedb-vat-rates.mjs                      # live gegen TEDB
//   node scripts/tedb-vat-rates.mjs --date 2026-01-01    # Stichtag
//   node scripts/tedb-vat-rates.mjs --record roh.xml     # Antwort mitschreiben
//   node scripts/tedb-vat-rates.mjs --fixture roh.xml    # ohne Netz auswerten
//   node scripts/tedb-vat-rates.mjs --json               # maschinenlesbar
//   node scripts/tedb-vat-rates.mjs --dump AT            # Saetze eines Landes
//                                                          mit ihren Kategorien

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Proxy ───────────────────────────────────────────────────────────────────
// Node 22 liest HTTPS_PROXY bei `fetch` NICHT von allein (undici nimmt die
// Umgebung erst mit NODE_USE_ENV_PROXY=1, bis heute als experimentell
// markiert). Ohne das geht die Anfrage am Proxy vorbei und laeuft in dessen
// Sperre — mit einer 403-Meldung, die wie eine fehlende Freischaltung
// aussieht, obwohl der Host laengst erlaubt ist. Genau darauf bin ich
// hereingefallen; `curl` kam durch, das Skript nicht.
//
// Statt das in die Aufruf-Doku zu schreiben (wo es beim naechsten Mal niemand
// liest), startet sich das Skript einmal mit gesetzter Variable neu. Die
// Variable ist zugleich die Abbruchbedingung, eine Schleife kann es also nicht
// geben. Ohne Proxy in der Umgebung passiert nichts davon.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(r.status ?? 1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(ROOT, 'supabase/migrations/20260715000008_jurisdiction_facts.sql');
const ENDPOINT = 'https://ec.europa.eu/taxation_customs/tedb/ws/';
const SOAP_ACTION = 'urn:ec.europa.eu:taxud:tedb:services:v1:VatRetrievalService/RetrieveVatRates';

/** Unsere Maerkte → ISO-Code, unter dem TEDB sie kennt. null = kennt TEDB nicht. */
const MARKET_TO_TEDB = {
  DE: 'DE', NL: 'NL', FR: 'FR', IT: 'IT', ES: 'ES', AT: 'AT',
  // Grossbritannien ist seit dem Brexit draussen; XI deckt nur Nordirland und
  // nur Waren. Ein XI-Satz ist deshalb KEIN Ersatz fuer den GB-Satz.
  UK: null,
  US: null, // Sales Tax, keine MwSt — TEDB waere ohnehin die falsche Quelle
  TR: null, // kein Mitgliedstaat
};

// ─── Ein sehr kleiner XML-Leser ──────────────────────────────────────────────
// Reicht fuer dieses Schema: keine Attribute noetig, keine gemischten Inhalte,
// feste Verschachtelung. Namensraum-Praefixe werden ignoriert, weil der Dienst
// sie zwischen Umgebungen wechseln darf, ohne den Vertrag zu brechen.

/** Alle Bloecke <tag>…</tag> (Praefix egal) als Rohtext. */
function blocks(xml, tag) {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'g');
  return [...xml.matchAll(re)].map((m) => m[1]);
}

/** Der Textinhalt des ersten <tag> im Block, sonst undefined. */
function text(xml, tag) {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`));
  return m ? m[1].trim() : undefined;
}

function parseRates(xml) {
  const fault = blocks(xml, 'error')[0] ?? (xml.includes('Fault') ? xml : null);
  if (fault && text(fault, 'code')) {
    throw new Error(`TEDB meldet einen Fehler: ${text(fault, 'code')} — ${text(fault, 'description') ?? ''}`);
  }
  return blocks(xml, 'vatRateResults').map((b) => {
    const rate = blocks(b, 'rate')[0] ?? '';
    return {
      memberState: text(b, 'memberState'),
      type: text(b, 'type'),                 // STANDARD | REDUCED
      rateType: text(rate, 'type'),          // DEFAULT | REDUCED_RATE | …
      value: text(rate, 'value') === undefined ? null : Number(text(rate, 'value')),
      situationOn: text(b, 'situationOn'),
      category: text(blocks(b, 'category')[0] ?? '', 'identifier'),
      comment: text(b, 'comment'),
    };
  });
}

// ─── Unser heutiger Stand ────────────────────────────────────────────────────
// Gelesen wird die Migration, nicht eine Kopie der Werte: eine zweite Liste im
// Skript waere schon beim naechsten Eintrag falsch, ohne dass es auffiele.

function ownFacts() {
  const sql = readFileSync(MIGRATION, 'utf8');
  const out = {};
  const re = /^\('([A-Z]{2})','([a-z_]+)','((?:[^']|'')*)',\s*([0-9.]+|null)/gm;
  for (const m of sql.matchAll(re)) {
    const [, country, key, value, numeric] = m;
    (out[country] ??= {})[key] = { text: value.replace(/''/g, "'"), numeric: numeric === 'null' ? null : Number(numeric) };
  }
  return out;
}

/** "7%" → [7] · "2.1%, 5.5%, 10%" → [2.1, 5.5, 10] · "None" → [] */
function percentages(s) {
  return [...(s ?? '').matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1].replace(',', '.')));
}

const near = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.005;

// ─── Vergleich ───────────────────────────────────────────────────────────────

function compare(facts, rates) {
  const byState = new Map();
  for (const r of rates) {
    if (r.value === null) continue;
    const e = byState.get(r.memberState) ?? { standard: null, reduced: new Map(), parking: new Set(), regional: new Map() };

    if (r.rateType === 'DEFAULT') {
      // Der Regelsatz ist der einzige Eintrag OHNE Kategorie — er gilt fuer
      // alles, was nicht eigens ermaessigt ist.
      e.standard = r.value;
    } else if (r.category === 'REGION') {
      // BEFUND aus dem Live-Lauf: TEDB markiert territoriale Sondersaetze selbst
      // mit der Kategorie REGION und sagt im Kommentar, wofuer sie gelten —
      // Korsika und die Ueberseedepartements bei Frankreich (0,9 · 1,05 · 8,5 ·
      // 13 %), Jungholz und Mittelberg bei Oesterreich (19 %). Das sind keine
      // ermaessigten Saetze des LANDES, und sie gehoeren deshalb nicht in die
      // Menge, die wir gegen `reduced_rates` stellen: sonst meldet jedes Land
      // mit Sonderzone eine Abweichung, die keine ist.
      //
      // Ihr Platz ist die region-Ebene von `jurisdiction_facts` (Migration
      // 20260917000000) — dieselbe Ebene, die die US-Bundesstaaten brauchen.
      e.regional.set(r.value, [...(e.regional.get(r.value) ?? []), r.comment ?? '']);
    } else if (r.rateType === 'REDUCED_RATE' || r.rateType === 'SUPER_REDUCED_RATE') {
      // BEFUND aus dem ersten Live-Lauf (2026-09-17, 333 Eintraege fuer sechs
      // Laender): ein ermaessigter Satz haengt in TEDB IMMER an einer Kategorie
      // (Anhang III MwStSystRL) — einen kategorielosen "allgemeinen ermaessigten
      // Satz" gibt es nicht. Die erste Fassung verwarf jeden Eintrag mit
      // Kategorie und meldete deshalb fuer ALLE sechs Laender "keine Antwort".
      //
      // Die ermaessigten Saetze eines Landes sind die MENGE der verschiedenen
      // Werte ueber alle Kategorien. Welche Kategorien hinter einem Wert
      // stehen, bleibt erhalten — nur so laesst sich ein einzelner Ausreisser
      // (etwa eine oertliche Ausnahme) von einem echten Satz unterscheiden;
      // --dump zeigt es.
      e.reduced.set(r.value, [...(e.reduced.get(r.value) ?? []), r.category ?? '(ohne Kategorie)']);
    } else if (r.rateType === 'PARKING_RATE') {
      // Der Parking Rate ist ein Bestandsschutz-Satz einzelner Mitgliedstaaten
      // und in unserer Spalte `reduced_rates` bewusst nicht enthalten. Er wird
      // getrennt ausgewiesen statt stillschweigend eingemischt.
      e.parking.add(r.value);
    }
    byState.set(r.memberState, e);
  }

  const rows = [];
  for (const [market, iso] of Object.entries(MARKET_TO_TEDB)) {
    const own = facts[market];
    if (!own) continue;
    if (iso === null) {
      rows.push({ market, key: 'standard_rate', ours: own.standard_rate?.text ?? '—', theirs: '—', verdict: 'ausserhalb TEDB' });
      continue;
    }
    const t = byState.get(iso);
    if (!t) {
      rows.push({ market, key: 'standard_rate', ours: own.standard_rate?.text ?? '—', theirs: '—', verdict: 'keine Antwort' });
      continue;
    }
    const ourStd = own.standard_rate?.numeric ?? percentages(own.standard_rate?.text)[0] ?? null;
    rows.push({
      market, key: 'standard_rate',
      ours: own.standard_rate?.text ?? '—',
      theirs: t.standard === null ? '—' : `${t.standard}%`,
      verdict: t.standard === null ? 'keine Antwort' : near(ourStd, t.standard) ? 'deckungsgleich' : 'ABWEICHUNG',
    });

    const ourRed = percentages(own.reduced_rates?.text).sort((a, b) => a - b);
    // 0 % bleibt draussen: Nullsatz und Befreiung fuehrt unsere Spalte als
    // Anmerkung ("Plus zero-rated (0%) and exempt categories"), nicht als
    // ermaessigten Satz. Eingemischt wuerde es jeden Vergleich sprengen.
    const theirRed = [...t.reduced.keys()].filter((v) => v > 0).sort((a, b) => a - b);
    const same = ourRed.length === theirRed.length && ourRed.every((v, i) => near(v, theirRed[i]));
    rows.push({
      market, key: 'reduced_rates',
      ours: own.reduced_rates?.text ?? '—',
      theirs: theirRed.length ? theirRed.map((v) => `${v}%`).join(', ') : '—',
      verdict: !theirRed.length ? 'keine Antwort' : same ? 'deckungsgleich' : 'ABWEICHUNG',
    });

    if (t.regional.size) {
      const vals = [...t.regional.keys()].sort((a, b) => a - b);
      rows.push({
        market, key: 'regionale Sondersaetze',
        ours: '— (kennt unser Modell nicht)',
        theirs: vals.map((v) => `${v}%`).join(', '),
        verdict: 'gehoert auf region-Ebene',
      });
    }

    if (t.parking.size) {
      rows.push({
        market, key: 'parking_rate',
        ours: '— (fuehren wir nicht)',
        theirs: [...t.parking].sort((a, b) => a - b).map((v) => `${v}%`).join(', '),
        verdict: 'nur bei TEDB',
      });
    }
  }
  return rows;
}

/** --dump <ISO>: welche Kategorien hinter jedem Satz eines Landes stehen. */
function dump(rates, iso) {
  const byValue = new Map();
  for (const r of rates) {
    if (r.memberState !== iso || r.value === null) continue;
    const k = `${r.value}% · ${r.rateType}`;
    byValue.set(k, [...(byValue.get(k) ?? []), r.category ?? '(ohne Kategorie)']);
  }
  console.log(`TEDB · ${iso} · ${byValue.size} verschiedene Saetze\n`);
  for (const [k, cats] of [...byValue].sort()) {
    console.log(`${k}  (${cats.length} Kategorie${cats.length === 1 ? '' : 'n'})`);
    for (const c of cats.slice(0, 12)) console.log(`    ${c}`);
    if (cats.length > 12) console.log(`    … und ${cats.length - 12} weitere`);
    console.log();
  }
}

// ─── Abruf ───────────────────────────────────────────────────────────────────

function envelope(isoCodes, date) {
  const codes = isoCodes.map((c) => `<t:isoCode>${c}</t:isoCode>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
            xmlns:m="urn:ec.europa.eu:taxud:tedb:services:v1:IVatRetrievalService"
            xmlns:t="urn:ec.europa.eu:taxud:tedb:services:v1:IVatRetrievalService:types">
  <s:Body>
    <m:retrieveVatRatesReqMsg>
      <t:memberStates>${codes}</t:memberStates>
      <t:situationOn>${date}</t:situationOn>
    </m:retrieveVatRatesReqMsg>
  </s:Body>
</s:Envelope>`;
}

async function fetchRates(isoCodes, date) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: SOAP_ACTION },
    body: envelope(isoCodes, date),
  });
  const body = await res.text();
  // Ein SOAP-Fault kommt mit HTTP 500 — der Text ist dann die Fehlermeldung,
  // die parseRates lesbar macht. Nur alles andere ist ein Transportfehler.
  if (!res.ok && !body.includes('Fault') && !body.includes('<error')) {
    throw new Error(`TEDB antwortete mit HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return body;
}

// ─── Ausgabe ─────────────────────────────────────────────────────────────────

function table(rows) {
  const head = ['Markt', 'Wert', 'unser Stand (EY)', 'TEDB', 'Befund'];
  const data = rows.map((r) => [r.market, r.key, r.ours, r.theirs, r.verdict]);
  const w = head.map((h, i) => Math.max(h.length, ...data.map((d) => d[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(w[i])).join('  ').trimEnd();
  console.log(line(head));
  console.log(w.map((n) => '─'.repeat(n)).join('  '));
  for (const d of data) console.log(line(d));
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const date = arg('--date') ?? new Date().toISOString().slice(0, 10);
  const fixture = arg('--fixture');
  const record = arg('--record');

  const facts = ownFacts();
  const isoCodes = [...new Set(Object.values(MARKET_TO_TEDB).filter(Boolean))].sort();

  let xml;
  if (fixture) {
    xml = readFileSync(fixture, 'utf8');
    console.error('⚠  FIXTURE-MODUS — ausgewertet wird eine Datei, nicht der Dienst.\n');
  } else {
    xml = await fetchRates(isoCodes, date);
    if (record) { writeFileSync(record, xml); console.error(`Antwort geschrieben: ${record}\n`); }
  }

  const rates = parseRates(xml);

  const dumpIso = arg('--dump');
  if (dumpIso) { dump(rates, dumpIso.toUpperCase()); return; }

  const rows = compare(facts, rates);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ date, endpoint: ENDPOINT, rateCount: rates.length, rows }, null, 2));
    return;
  }

  console.log(`TEDB · Stichtag ${date} · ${rates.length} Satz-Eintraege fuer ${isoCodes.join(' ')}\n`);
  table(rows);

  const diff = rows.filter((r) => r.verdict === 'ABWEICHUNG').length;
  const gap = rows.filter((r) => r.verdict !== 'deckungsgleich' && r.verdict !== 'ABWEICHUNG').length;
  void gap;
  console.log(`\n${rows.length - diff - gap} deckungsgleich · ${diff} abweichend · ${gap} nicht aus TEDB zu bekommen`);
  if (gap) console.log('Fuer die letzte Gruppe braucht es eine zweite Quelle — fuer UK legislation.gov.uk/HMRC (OGL v3).');
}

main().catch((e) => { console.error(`\n✗ ${e.message}`); process.exit(1); });
