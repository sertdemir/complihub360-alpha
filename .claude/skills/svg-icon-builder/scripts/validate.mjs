#!/usr/bin/env node
// Guardrail for the CompliHub icon house style.
// Usage: node scripts/validate.mjs <icon.svg> [more.svg ...]
// Flags the few things that quietly break the look: missing round caps,
// off-palette colors, line paths left fillable (SVG fills them black), and a
// width/height on the root that stops the icon scaling. Warnings, not law —
// read them, fix what's real.

import { readFileSync } from 'node:fs';

const PALETTE = new Set([
  '#b49a5c', // gold
  '#c9b583', // soft-gold
  '#1c2433', // ink
  '#efebe1', // cream (chip only)
  'currentcolor',
  'none',
]);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/validate.mjs <icon.svg> [...]');
  process.exit(2);
}

let totalIssues = 0;

for (const file of files) {
  const issues = [];
  let svg;
  try {
    svg = readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`✗ ${file}: cannot read (${err.code})`);
    totalIssues++;
    continue;
  }

  // Root <svg> should not pin width/height (kills container scaling).
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  if (/\bwidth\s*=/.test(root) || /\bheight\s*=/.test(root)) {
    issues.push('root <svg> has width/height — remove so the icon scales to its container');
  }
  if (!/viewbox\s*=/i.test(root)) {
    issues.push('root <svg> has no viewBox');
  }

  // Color check: every fill="..." and stroke="..." must be on-palette.
  for (const m of svg.matchAll(/\b(fill|stroke)\s*=\s*"([^"]*)"/gi)) {
    const val = m[2].trim().toLowerCase();
    if (val === '') continue;
    if (!PALETTE.has(val)) {
      issues.push(`off-palette ${m[1]}="${m[2]}" — use gold/soft-gold/ink/cream/currentColor/none`);
    }
  }

  // Per-element checks on drawable tags.
  for (const el of svg.matchAll(/<(path|line|polyline|polygon|circle|rect|ellipse)\b[^>]*>/gi)) {
    const tag = el[0];
    const hasStroke = /\bstroke\s*=\s*"(?!none")/i.test(tag);
    if (hasStroke) {
      if (!/stroke-linecap\s*=\s*"round"/i.test(tag)) {
        issues.push(`stroked <${el[1]}> missing stroke-linecap="round"`);
      }
      // A stroked path/polyline that isn't explicitly fill="none" will fill black.
      if (/^(path|polyline)$/i.test(el[1]) && !/\bfill\s*=\s*"none"/i.test(tag)) {
        issues.push(`stroked <${el[1]}> should set fill="none" (or SVG fills it black)`);
      }
    }
  }

  if (issues.length === 0) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file}`);
    for (const i of issues) console.log(`    · ${i}`);
    totalIssues += issues.length;
  }
}

process.exit(totalIssues > 0 ? 1 : 0);
