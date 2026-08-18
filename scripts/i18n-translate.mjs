#!/usr/bin/env node
/**
 * Keeps de/es/tr in key-parity with en by translating only the missing keys
 * through the DeepL API.
 *
 *   node scripts/i18n-translate.mjs --check      # CI gate: fail on any gap
 *   node scripts/i18n-translate.mjs --dry-run    # list what would be sent
 *   node scripts/i18n-translate.mjs              # translate + write
 *   node scripts/i18n-translate.mjs --lang de --ns home
 *   node scripts/i18n-translate.mjs home:hero.title           # redo one key
 *
 * en is the source of truth. Existing target values are never overwritten
 * unless a bare <namespace>:<key.path> argument names them, so hand-polished
 * copy survives a re-run.
 *
 * Requires DEEPL_API_KEY in the environment.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = join(ROOT, "apps/vs1-demo/ui/public/locales");
const SOURCE = "en";

/**
 * formality: DeepL only supports it for de and es. Both surfaces are written
 * in the formal register today (Sie / usted), so new copy has to match.
 * 'prefer_more' degrades to default instead of erroring where unsupported.
 */
const TARGETS = {
  de: { code: "DE", formality: "more" },
  es: { code: "ES", formality: "prefer_more" },
  tr: { code: "TR", formality: undefined },
};

const GLOSSARY_ID =
  process.env.DEEPL_GLOSSARY_ID || "e2ccfb21-d0a9-4ad2-a9c7-46a7b990a54c";

/**
 * Some segments are legitimately empty in a target language — Turkish reorders
 * a headline and leaves the lead-in fragment with no words. Those are listed in
 * i18n-intentional-empty.json so the check does not flag them forever.
 */
const INTENTIONAL_EMPTY = new Set(
  Object.keys(
    JSON.parse(
      readFileSync(join(ROOT, "scripts/i18n-intentional-empty.json"), "utf8"),
    ),
  ).filter((k) => !k.startsWith("_")),
);

/**
 * Appended to every context. Measurably improves placeholder handling: without
 * it DeepL renders "Showing {{count}} of {{total}}" as
 * «Anzeige von „{ph0}“ der „{ph1}“-Anbieter», with it as
 * «Es werden {ph0} von {ph1} Anbietern angezeigt».
 * Must not contain literal angle brackets — DeepL parses the context as XML too
 * and rejects the request with a tag-mismatch error.
 */
const PLACEHOLDER_HINT =
  " Tokens written as {ph0}, {ph1} are runtime placeholders replaced by a number or a name at render time;" +
  " treat each as a plain noun phrase, keep it verbatim, never put quotation marks around one and never join" +
  " one to the next word with a hyphen. The terms and privacy tags wrap a clickable link label, so the entire" +
  " translated label must stay inside the tag pair.";

/** Per-namespace hint. Not translated — it only steers word sense. */
const CONTEXT = {
  common:
    "Shared UI chrome (navigation, buttons, form labels) of a B2B SaaS compliance platform.",
  home: "Marketing landing page for a B2B SaaS platform that matches companies with compliance advisors.",
  auth: "Login, signup and account-recovery screens of a B2B SaaS platform.",
  legal:
    "Legal notices: terms of service, privacy policy and imprint of a US-incorporated SaaS company.",
  results:
    "Result screens showing a company-specific compliance risk assessment and matching advisors.",
  userws:
    "Logged-in workspace for the customer: dashboards, tasks, documents, monitoring.",
  providerws:
    "Logged-in workspace for partner advisory firms: incoming leads, profile, billing.",
  providersLp:
    "Marketing landing page aimed at advisory firms who want to receive qualified leads.",
};

/**
 * i18next Trans markup stays real XML so DeepL can move it with the phrase it
 * wraps. Interpolation placeholders become {phN} tokens rather than XML tags —
 * an A/B run showed tags get quoted and hyphenated in German and scrambled in
 * Turkish, while the brace tokens come back inside grammatical sentences.
 */
const TRANS_TAG = String.raw`</?(?:b|em|accent|gold|terms|privacy|br)\s*/?>`;
const VAR = String.raw`\{\{[^}]*\}\}`;
const TOKEN = new RegExp(`${TRANS_TAG}|${VAR}`, "g");

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

function toXml(value) {
  const vars = [];
  let out = "";
  let last = 0;
  for (const m of value.matchAll(TOKEN)) {
    out += escapeXml(value.slice(last, m.index));
    if (m[0].startsWith("{{")) {
      vars.push(m[0]);
      out += `{ph${vars.length - 1}}`;
    } else {
      out += m[0];
    }
    last = m.index + m[0].length;
  }
  return { xml: out + escapeXml(value.slice(last)), vars };
}

function fromXml(xml, vars) {
  const withVars = xml.replace(/\{ph(\d+)\}/g, (_, i) => vars[Number(i)] ?? "");
  return unescapeXml(withVars);
}

/**
 * DeepL can drop or duplicate a placeholder, and can shrink a link label so the
 * tag wraps only part of the term. Neither breaks the JSON, both break the UI at
 * runtime, so every translation is compared against its source before it lands.
 */
function structuralIssues(source, result) {
  const issues = [];
  const bag = (s, re) => {
    const c = {};
    for (const m of s.matchAll(re)) c[m[0]] = (c[m[0]] || 0) + 1;
    return c;
  };
  const cmp = (a, b, label) => {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if ((a[k] || 0) !== (b[k] || 0))
        issues.push(
          `${label} ${k}: ${a[k] || 0}× source, ${b[k] || 0}× result`,
        );
    }
  };
  cmp(
    bag(source, new RegExp(VAR, "g")),
    bag(result, new RegExp(VAR, "g")),
    "placeholder",
  );
  cmp(
    bag(source, new RegExp(TRANS_TAG, "g")),
    bag(result, new RegExp(TRANS_TAG, "g")),
    "tag",
  );
  return issues;
}

/** Walks two parallel trees and yields every leaf path present in en. */
function* leaves(node, path = []) {
  if (node !== null && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) yield* leaves(v, [...path, k]);
  } else {
    yield { path, value: node };
  }
}

const getIn = (obj, path) =>
  path.reduce(
    (o, k) => (o === undefined || o === null ? undefined : o[k]),
    obj,
  );

function setIn(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") {
      cur[k] = Array.isArray(getIn(obj, path.slice(0, i + 1))) ? [] : {};
    }
    cur = cur[k];
  }
  cur[path[path.length - 1]] = value;
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

async function deepl(texts, lang, ns) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_API_KEY is not set");
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const { code, formality } = TARGETS[lang];

  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "EN",
      target_lang: code,
      tag_handling: "xml",
      preserve_formatting: true,
      split_sentences: "nonewlines",
      ...(formality ? { formality } : {}),
      ...(GLOSSARY_ID ? { glossary_id: GLOSSARY_ID } : {}),
      context: (CONTEXT[ns] || "") + PLACEHOLDER_HINT,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 456)
      throw new Error("DeepL quota exhausted for this billing period.");
    throw new Error(`DeepL HTTP ${res.status}: ${detail}`);
  }
  return (await res.json()).translations.map((t) => t.text);
}

// ---------------------------------------------------------------- main

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f) => {
  const i = argv.indexOf(f);
  return i === -1 ? undefined : argv[i + 1];
};

const check = has("--check");
const dryRun = has("--dry-run");
const onlyLang = opt("--lang");
const onlyNs = opt("--ns");
const forced = new Set(
  argv.filter((a) => a.includes(":") && !a.startsWith("--")),
);

const namespaces = readdirSync(join(LOCALES, SOURCE))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .filter((ns) => !onlyNs || ns === onlyNs);

const langs = Object.keys(TARGETS).filter((l) => !onlyLang || l === onlyLang);

let gaps = 0;
let translated = 0;
const touched = [];
const suspect = [];

for (const lang of langs) {
  for (const ns of namespaces) {
    const srcPath = join(LOCALES, SOURCE, `${ns}.json`);
    const dstPath = join(LOCALES, lang, `${ns}.json`);
    const src = readJson(srcPath);
    let dst;
    try {
      dst = readJson(dstPath);
    } catch {
      dst = {};
    }

    const pending = [];
    for (const { path, value } of leaves(src)) {
      if (typeof value !== "string" || value === "") continue;
      const id = `${ns}:${path.join(".")}`;
      if (INTENTIONAL_EMPTY.has(`${lang}/${id}`)) continue;
      const existing = getIn(dst, path);
      if (existing !== undefined && existing !== "" && !forced.has(id))
        continue;
      pending.push({ path, value, id });
    }

    if (pending.length === 0) continue;
    gaps += pending.length;

    if (check) {
      console.log(`✗ ${lang}/${ns}.json — ${pending.length} missing`);
      for (const p of pending.slice(0, 5)) console.log(`    ${p.id}`);
      if (pending.length > 5) console.log(`    … ${pending.length - 5} more`);
      continue;
    }
    if (dryRun) {
      console.log(`→ ${lang}/${ns}.json — would translate ${pending.length}`);
      for (const p of pending.slice(0, 5))
        console.log(`    ${p.id}  «${p.value.slice(0, 60)}»`);
      continue;
    }

    // DeepL accepts up to 50 texts per request.
    for (let i = 0; i < pending.length; i += 50) {
      const chunk = pending.slice(i, i + 50);
      const encoded = chunk.map((c) => toXml(c.value));
      const out = await deepl(
        encoded.map((e) => e.xml),
        lang,
        ns,
      );
      out.forEach((xml, j) => {
        const value = fromXml(xml, encoded[j].vars);
        const issues = structuralIssues(chunk[j].value, value);
        if (issues.length) {
          suspect.push({
            id: `${lang}/${chunk[j].id}`,
            source: chunk[j].value,
            value,
            issues,
          });
        }
        setIn(dst, chunk[j].path, value);
      });
      translated += chunk.length;
      process.stdout.write(
        `  ${lang}/${ns}: ${Math.min(i + 50, pending.length)}/${pending.length}\r`,
      );
    }

    writeFileSync(dstPath, JSON.stringify(dst, null, 2) + "\n");
    touched.push(dstPath);
    console.log(
      `✓ ${lang}/${ns}.json — ${pending.length} translated          `,
    );
  }
}

if (touched.length) {
  // The locale files are Prettier-formatted; match it so diffs stay minimal.
  execFileSync("npx", ["prettier", "--write", ...touched], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

if (check) {
  if (gaps === 0) {
    console.log(`✓ key parity — ${langs.join(", ")} match ${SOURCE}`);
    process.exit(0);
  }
  console.error(
    `\n${gaps} untranslated key(s). Run: node scripts/i18n-translate.mjs`,
  );
  process.exit(1);
}

if (suspect.length) {
  console.error(
    `\n⚠ ${suspect.length} key(s) came back structurally changed — fix these by hand:`,
  );
  for (const s of suspect) {
    console.error(`  ${s.id}`);
    console.error(`    ${s.issues.join("; ")}`);
    console.error(`    en: ${s.source}`);
    console.error(`    →   ${s.value}`);
  }
}

console.log(
  dryRun
    ? `\n${gaps} key(s) pending.`
    : `\nDone — ${translated} key(s) translated.`,
);

// Machine output is a first draft. Structural damage fails the run outright so
// it cannot slip into a commit unnoticed.
if (suspect.length) process.exit(1);
