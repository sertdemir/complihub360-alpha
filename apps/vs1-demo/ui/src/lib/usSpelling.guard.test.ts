import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Waechter: US-Schreibweise in den englischen Sprachdateien ───────────────
// Handover 1.0 §14 legt US-Englisch fest. Bis November 2026 standen britische
// Formen in providerws (PR #457) und in common, auth und home (PR #460).
//
// Geprueft werden nur Werte, keine Schluessel (z. B. "behaviour" als Key).
// "cancelled"/"cancellation" bleiben erlaubt: Beide Formen sind im US-Englisch
// gebraeuchlich, die Plattform schreibt sie durchgehend mit zwei l.
// Eigennamen und fremdsprachige Woerter ("organisme" im Frankreich-Text)
// treffen die Muster nicht, weil die Muster ganze Woerter verlangen.

const EN = join(__dirname, '../../public/locales/en');

const BRITISCH =
  /\b(e-mails?|licences?|centres?|colours?|behaviours?|favour\w*|judgements?|offences?|defences?|practise[ds]?|labell(ed|ing)|catalogues?|programmes?|whilst|amongst|(anonym|author|organ|recogn|personal|sanit|optim|custom|summar|minim|priorit|categor|util|real|final|standard|special)is(e|ed|es|ing|ation|ations))\b/i;

const flat = (o: unknown, p = ''): Array<[string, string]> =>
  o && typeof o === 'object'
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : typeof o === 'string' ? [[p, o]] : [];

describe('US-Schreibweise in EN', () => {
  it.each(readdirSync(EN).filter((f) => f.endsWith('.json')))('%s hat keine britischen Formen', (datei) => {
    const treffer = flat(JSON.parse(readFileSync(join(EN, datei), 'utf8')))
      .map(([k, v]) => [k, v.match(BRITISCH)?.[0]] as const)
      .filter(([, w]) => w)
      .map(([k, w]) => `${k}: ${w}`);
    expect(treffer, `${datei}: britische Schreibweise`).toEqual([]);
  });
});
