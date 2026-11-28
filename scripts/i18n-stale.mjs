#!/usr/bin/env node
/**
 * Findet Uebersetzungen, die aelter sind als ihr aktueller EN-Text.
 *
 *   node scripts/i18n-stale.mjs                  # CI: pruefen
 *   node scripts/i18n-stale.mjs --stamp          # Stempel nachziehen
 *   node scripts/i18n-stale.mjs --stamp --en-only home:hero.title …
 *                                                # EN-Korrektur ohne neue
 *                                                # Uebersetzung freigeben
 *
 * Warum: `i18n:check` prueft nur die Schluesselparitaet. Wird ein EN-Text
 * umgeschrieben, bleibt die alte Uebersetzung stehen, und alles bleibt gruen.
 * Am 28.11.2026 waren so 222 Schluessel veraltet (PR #478), gefunden nur
 * ueber die Git-Historie.
 *
 * Wie: scripts/i18n-stamps.json haelt je Schluessel die Hashes von EN, DE,
 * ES und TR zum Zeitpunkt, an dem die Uebersetzungen zuletzt zum EN passten.
 * Die Pruefung braucht keine Git-Historie und laeuft lokal wie in CI gleich.
 *
 *   EN gleich, Uebersetzung gleich          → in Ordnung
 *   EN geaendert, Uebersetzung gleich       → VERALTET: neu uebersetzen
 *   EN geaendert, Uebersetzung auch         → Stempel nachziehen (--stamp)
 *   EN gleich, Uebersetzung geaendert       → Stempel nachziehen (--stamp)
 *   Schluessel neu oder entfernt            → Stempel nachziehen (--stamp)
 *
 * `--stamp` uebernimmt alles ausser veralteten Schluesseln. Die bleiben auf
 * dem alten Stempel, bis sie uebersetzt sind, oder bis `--en-only` sie
 * ausdruecklich freigibt (Tippfehler, Schreibweise, Zeichensetzung in EN,
 * die keine Uebersetzung aendert).
 *
 * Merge-Konflikt in i18n-stamps.json: die Datei von main nehmen
 * (`git checkout --theirs` bzw. `--ours`, je nach Richtung) und `--stamp`
 * neu laufen lassen. Veraltete Schluessel bleiben dabei sichtbar, weil der
 * Stempel von main noch den alten EN-Text kennt.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE = "en";
export const TARGETS = ["de", "es", "tr"];
const NONE = "-";
const COMMENT =
  "Generiert von scripts/i18n-stale.mjs --stamp. Je Schluessel die Hashes von en de es tr zum Zeitpunkt, an dem die Uebersetzungen zuletzt zum EN passten. Nicht von Hand bearbeiten.";

/** Kurzer, stabiler Hash eines Werts; fehlender Wert → "-". */
export const hash = (v) =>
  typeof v === "string"
    ? createHash("sha256").update(v).digest("hex").slice(0, 8)
    : NONE;

function* leaves(node, path = "") {
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node))
      yield* leaves(v, path ? `${path}.${k}` : k);
  } else if (typeof node === "string") {
    yield [path, node];
  }
}

/** { lang: { "ns:key.path": value } } aus einem Locales-Verzeichnis. */
export function readLocales(dir, langs = [SOURCE, ...TARGETS]) {
  const out = {};
  const files = readdirSync(join(dir, SOURCE)).filter((f) => f.endsWith(".json"));
  for (const lang of langs) {
    out[lang] = {};
    for (const f of files) {
      const p = join(dir, lang, f);
      if (!existsSync(p)) continue;
      const ns = f.replace(/\.json$/, "");
      for (const [k, v] of leaves(JSON.parse(readFileSync(p, "utf8"))))
        out[lang][`${ns}:${k}`] = v;
    }
  }
  return out;
}

/** Aktueller Stempel eines Schluessels: "en de es tr". */
export const stampOf = (locales, key) =>
  [SOURCE, ...TARGETS].map((l) => hash(locales[l]?.[key])).join(" ");

/**
 * Vergleicht die Locales mit den Stempeln.
 * stale:  [{ key, lang }]  — EN geaendert, Uebersetzung nicht
 * drift:  [{ key, why }]   — Stempel passt nicht mehr, Inhalt in Ordnung
 */
export function evaluate(locales, stamps) {
  const stale = [];
  const drift = [];
  for (const key of Object.keys(locales[SOURCE]).sort()) {
    const now = stampOf(locales, key).split(" ");
    const was = stamps[key]?.split(" ");
    if (!was) {
      drift.push({ key, why: "neu" });
      continue;
    }
    const enChanged = now[0] !== was[0];
    let moved = enChanged;
    TARGETS.forEach((lang, i) => {
      const same = now[i + 1] === was[i + 1];
      // Ohne Uebersetzung gibt es nichts zu veralten; die Paritaet meldet das.
      if (enChanged && same && now[i + 1] !== NONE) stale.push({ key, lang });
      if (!same) moved = true;
    });
    if (moved && !stale.some((s) => s.key === key))
      drift.push({ key, why: enChanged ? "EN und Uebersetzung geaendert" : "Uebersetzung geaendert" });
  }
  for (const key of Object.keys(stamps))
    if (!(key in locales[SOURCE])) drift.push({ key, why: "entfernt" });
  return { stale, drift };
}

/** Neue Stempel: alles uebernehmen ausser veralteten Schluesseln. */
export function restamp(locales, stamps, enOnly = []) {
  const { stale } = evaluate(locales, stamps);
  const keep = new Set(stale.map((s) => s.key).filter((k) => !enOnly.includes(k)));
  const next = {};
  for (const key of Object.keys(locales[SOURCE]).sort())
    next[key] = keep.has(key) ? stamps[key] : stampOf(locales, key);
  return { next, kept: [...keep] };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const LOCALES = process.env.I18N_LOCALES || join(ROOT, "apps/vs1-demo/ui/public/locales");
  const STAMPS = process.env.I18N_STAMPS || join(ROOT, "scripts/i18n-stamps.json");
  const args = process.argv.slice(2);
  const locales = readLocales(LOCALES);
  const file = existsSync(STAMPS) ? JSON.parse(readFileSync(STAMPS, "utf8")) : {};
  const { _comment, ...stamps } = file;

  const fmt = (list) =>
    Object.entries(
      list.reduce((acc, { key, lang }) => ((acc[key] ||= []).push(lang), acc), {}),
    ).map(([k, ls]) => `  ${k}  (${ls.join(", ")})`).join("\n");

  if (args.includes("--stamp")) {
    const enOnly = args.filter((a) => !a.startsWith("--"));
    const unknown = enOnly.filter((k) => !(k in locales[SOURCE]));
    if (unknown.length) {
      console.error(`Unbekannte Schluessel: ${unknown.join(", ")}`);
      process.exit(1);
    }
    const { next, kept } = restamp(locales, stamps, enOnly);
    // Eine Zeile je Schluessel: kleine Diffs, gut lesbar im Review.
    const lines = Object.entries({ _comment: COMMENT, ...next }).map(
      ([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`,
    );
    writeFileSync(STAMPS, `{\n${lines.join(",\n")}\n}\n`);
    const left = evaluate(locales, stamps).stale.filter((s) => kept.includes(s.key));
    console.log(`Stempel geschrieben (${Object.keys(next).length} Schluessel).`);
    if (left.length)
      console.log(`Nicht uebernommen, weil veraltet — erst uebersetzen oder mit --en-only freigeben:\n${fmt(left)}`);
    process.exit(0);
  }

  const { stale, drift } = evaluate(locales, stamps);
  if (stale.length) {
    console.error(
      `✗ ${stale.length} Uebersetzung(en) aelter als ihr EN-Text:\n${fmt(stale)}\n\n` +
        `Neu uebersetzen und dann \`npm run i18n:stamp\`.\n` +
        `Aendert die EN-Korrektur keine Uebersetzung (Tippfehler, Schreibweise): ` +
        `\`npm run i18n:stamp -- --en-only <ns:key> …\`.`,
    );
  }
  if (drift.length) {
    const shown = drift.slice(0, 20).map((d) => `  ${d.key}  (${d.why})`).join("\n");
    console.error(
      `✗ ${drift.length} Stempel nicht nachgezogen:\n${shown}${drift.length > 20 ? "\n  …" : ""}\n\n` +
        `\`npm run i18n:stamp\` ausfuehren und scripts/i18n-stamps.json mit committen.`,
    );
  }
  if (stale.length || drift.length) process.exit(1);
  console.log(`✓ Uebersetzungen aktuell — de, es, tr passen zum EN-Stand (${Object.keys(locales[SOURCE]).length} Schluessel)`);
}

