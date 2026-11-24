// ─── Lagerregeln (Folgeauftrag Lagerung v1.3, 22.11.2026) ─────────────────────
// Eine Lagerregel ist ein DATENSATZ, kein Code: was Lagerung in einem Land an
// Pruefung ausloest, unter welchen Bedingungen, mit welchen Ausnahmen und auf
// welcher amtlichen Quelle das beruht. Vorgaben der Mitgruenderinnen:
//
//  - Ein Land je Regel. Das Format gilt fuer jedes Land, Deutschland ist nur
//    das erste Kontrollland.
//  - Belege ausschliesslich aus offiziellen staatlichen Quellen (auch EU).
//  - Nur FREIGEGEBENE Regeln wirken. Ein Entwurf darf die Risk Map nicht
//    beeinflussen, auch wenn er im selben Format im Register steht.
//  - Ohne freigegebene Regel gibt es keinen lagerbezogenen Check.
//
// Was die Engine aus einer freigegebenen Regel macht, steht in
// `evaluateStorageRule` und NICHT in der Regel — kein Regelentwurf kann die
// Schwelle zu "applies" verschieben:
//
//   Ausloeser trifft nicht zu ............ kein Check
//   Ausnahme greift ...................... ihre Wirkung (kein Check / Open / Likely)
//   entscheidende Angabe fehlt ........... Open, die fehlende Angabe wird genannt
//   Standort benannt, nicht bestaetigt ... Likely, offene Bestaetigung genannt
//   Lagerung geplant ..................... Likely, gekennzeichnet als geplant, ohne Frist
//   Lagerung aktiv + bestaetigt .......... Applies, WENN die Regel `applies_when`
//                                          fuehrt und alles zutrifft — sonst Likely
//
// Der Standort allein begruendet nie eine Pflicht: ohne `applies_when` bleibt
// auch bestaetigte aktive Lagerung "likely".
//
// `review.reviewer` traegt eine eindeutige Pruefer-ID, keinen Namen; der Name
// wird intern festgehalten (Festlegung der Mitgruenderin, 23.11.2026).
//
// DAS REGISTER IST LEER. Es gibt keine fachlich gepruefte Lagerregel; wer eine
// eintraegt, braucht die Freigabe einer benannten pruefenden Person
// (`review`), und `validateStorageRule` haelt das fest.

import { EU27 } from './eu.js';

/** Was eine Bedingung abfragen kann — nur, was der Wizard erhebt, plus
 *  Zusatzangaben, die eine Regel selbst verlangt (`input:<key>`). */
export type ConditionFact =
  | 'offering'                 // physical | digital | services
  | 'customers'                // consumers | businesses | both
  | 'channels'                 // own-site | marketplaces | …
  | 'products'                 // electronics | batteries-inside | batteries-separate
  | 'packaging'                // Taetigkeiten laut Wizard, none
  | 'established_in_jurisdiction'   // yes | no
  | 'established_in_eu'        // yes | no — aus dem Sitzland, das der Wizard ohnehin erhebt
  | 'sells_in_jurisdiction'    // current | planned | no
  | `input:${string}`;         // Zusatzangabe aus `required_inputs`

export interface Condition {
  fact: ConditionFact;
  /** `is`: genau dieser Wert · `includes`: die Antwortliste enthaelt ihn ·
   *  `in`: einer dieser Werte. Genau eines davon. */
  is?: string;
  includes?: string;
  in?: string[];
}

/** Eine Angabe, die die Regel braucht und die der Wizard nicht allgemein
 *  erhebt (z. B. die Art der Lagerung). Sie wird nur gestellt, wenn die Regel
 *  fuer einen benannten Lagerort ueberhaupt in Betracht kommt — keine
 *  allgemeine Zusatzfrage. Fehlt die Antwort, ist das Ergebnis "open" und
 *  nennt genau diese Angabe. */
export interface RequiredInput {
  key: string;
  question_en: string;
  options: Array<{ value: string; label_en: string }>;
}

/** Eine Ausnahme, die das ERGEBNIS aendert — nicht nur ein Satz im
 *  Erklaerungstext. `when` nutzt dieselben Bedingungen wie der Ausloeser. */
export interface RuleException {
  id: string;
  when: Condition[];
  /** `no_check`: die Regel erzeugt keinen Check · `open`: der Check bleibt
   *  offen · `likely`: hoechstens "likely", nie "applies". */
  effect: 'no_check' | 'open' | 'likely';
  text_en: string;
  /** Die Fundstelle der Ausnahme, wenn sie von der der Regel abweicht. */
  provision?: string;
}

export interface StorageRule {
  id: string;
  version: number;
  /** Ein Land je Regel (ISO-Code, UK statt GB). */
  jurisdiction: string;
  applies_to: {
    phases: Array<'current' | 'planned'>;
    /** Der Ausloeser: ALLE muessen zutreffen. */
    conditions: Condition[];
  };
  required_inputs?: RequiredInput[];
  exceptions?: RuleException[];
  /** Nur damit kann aktive, bestaetigte Lagerung "applies" werden: ALLE
   *  muessen zutreffen. Fehlt das Feld, ist "likely" die Obergrenze. */
  applies_when?: Condition[];
  result: {
    /** Servicebereich (Wizard-Slug), unter dem der Check erscheint. */
    area: string;
    title_en: string;
    explanation_en: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  };
  source: {
    authority: string;
    title: string;
    url: string;
    provision: string;
    /** Gesetzestext oder amtliche Erlaeuterung — letztere wird so gekennzeichnet. */
    kind: 'statute' | 'official_guidance';
    legal_status_as_of: string;
    last_checked: string;
  };
  review: {
    status: 'draft' | 'reviewed' | 'released';
    reviewer?: string;
    reviewed_on?: string;
  };
}

/** Das Register. Leer, bis eine Regel fachlich geprueft und freigegeben ist. */
export const STORAGE_RULES: StorageRule[] = [];

/** Formale Pruefung einer Regel. Fachlich prueft sie niemand hier — aber eine
 *  freigegebene Regel ohne Quelle, Fundstelle oder benannte pruefende Person
 *  kommt nicht ins Register (Waechtertest). */
export function validateStorageRule(r: StorageRule): string[] {
  const errors: string[] = [];
  const date = (v: string | undefined) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!/^[a-z0-9-]+$/.test(r.id)) errors.push('id: only lowercase letters, digits and hyphens');
  if (!Number.isInteger(r.version) || r.version < 1) errors.push('version: integer >= 1');
  if (!/^[A-Z]{2}$/.test(r.jurisdiction)) errors.push('jurisdiction: one two-letter country code');
  if (!r.applies_to.phases.length) errors.push('applies_to.phases: at least one phase');
  if (!r.result.title_en.trim() || !r.result.explanation_en.trim()) errors.push('result: title and explanation are required');
  if (!/^https:\/\//.test(r.source.url)) errors.push('source.url: an https link to the official source');
  for (const k of ['authority', 'title', 'provision'] as const) if (!r.source[k].trim()) errors.push(`source.${k}: required`);
  if (!date(r.source.legal_status_as_of)) errors.push('source.legal_status_as_of: YYYY-MM-DD');
  if (!date(r.source.last_checked)) errors.push('source.last_checked: YYYY-MM-DD');
  const one = (c: Condition) => [c.is, c.includes, c.in].filter((x) => x !== undefined).length === 1;
  const conditions = [...r.applies_to.conditions, ...(r.applies_when ?? []), ...(r.exceptions ?? []).flatMap((e) => e.when)];
  if (!conditions.every(one)) errors.push('conditions: exactly one of is / includes / in');
  const inputs = new Set((r.required_inputs ?? []).map((i) => i.key));
  for (const c of conditions) {
    if (c.fact.startsWith('input:') && !inputs.has(c.fact.slice(6))) errors.push(`condition ${c.fact}: no required_input with that key`);
  }
  for (const e of r.exceptions ?? []) if (!e.when.length || !e.text_en.trim()) errors.push(`exception ${e.id}: needs a condition and a text`);
  if (r.review.status !== 'draft' && (!r.review.reviewer?.trim() || !date(r.review.reviewed_on))) {
    errors.push('review: a reviewed or released rule names its reviewer and the review date');
  }
  return errors;
}

/** Die Antworten, die eine Regel lesen darf. */
export interface StorageRuleAnswers {
  offering: string[];
  customers: string;
  channels: string[];
  products: string[];
  packaging: string[];
  /** Laender des Sitzes; `null` = nicht bekannt ("nicht sicher" oder nicht gefragt). */
  establishment: string[] | null;
  currentMarkets: string[];
  plannedMarkets: string[];
  /** Zusatzangaben je Regel: `<regel-id>.<key>` → Wert. */
  inputs: Record<string, string>;
}

export interface StorageCheck {
  rule_id: string;
  rule_version: number;
  country: string;
  phase: 'current' | 'planned';
  confirmation: 'confirmed' | 'unconfirmed' | 'unstated';
  /** `confirmed` = "applies". */
  state: 'confirmed' | 'likely' | 'open';
  area: string;
  priority: StorageRule['result']['priority'];
  title: string;
  explanation: string;
  /** Was noch entscheidet, in der Reihenfolge der Dringlichkeit. `location`
   *  ist die offene Bestaetigung des Standorts; `input` eine fehlende Angabe
   *  mit ihrer Frage; `answer` eine Wizard-Antwort, die fehlt. */
  open: Array<{ kind: 'location' | 'input' | 'answer'; key: string; text?: string; options?: RequiredInput['options'] }>;
  /** Die Ausnahme, die das Ergebnis bestimmt hat. */
  exception?: { id: string; text: string; provision?: string };
  source: Pick<StorageRule['source'], 'authority' | 'title' | 'url' | 'provision' | 'kind'>;
}

type Tri = true | false | null;

function test(c: Condition, rule: StorageRule, a: StorageRuleAnswers): Tri {
  const j = rule.jurisdiction;
  // Einzelwerte und Listen auf dieselbe Form bringen; `null` = unbekannt.
  const values: string[] | null = (() => {
    if (c.fact.startsWith('input:')) {
      const v = a.inputs[`${rule.id}.${c.fact.slice(6)}`];
      return v ? [v] : null;
    }
    switch (c.fact) {
      case 'offering': return a.offering.length ? a.offering : null;
      case 'customers': return a.customers ? [a.customers] : null;
      case 'channels': return a.channels.length ? a.channels : null;
      case 'products': return a.products.length ? a.products : null;
      case 'packaging': return a.packaging.length && !a.packaging.every((x) => x === 'not-sure') ? a.packaging : null;
      case 'established_in_jurisdiction': return a.establishment === null ? null : [a.establishment.includes(j) ? 'yes' : 'no'];
      // "Sitz ausserhalb der EU" (erste deutsche Regel: amtliche Anleitung fuer
      // Onlinehaendler mit Sitz ausserhalb der EU). Wer noch keinen Sitz hat,
      // sitzt nicht "ausserhalb": ohne Sitzland bleibt die Angabe unbekannt.
      case 'established_in_eu': return !a.establishment?.length ? null : [a.establishment.some((c) => EU27.has(c)) ? 'yes' : 'no'];
      case 'sells_in_jurisdiction': return [a.currentMarkets.includes(j) ? 'current' : a.plannedMarkets.includes(j) ? 'planned' : 'no'];
      default: return null;
    }
  })();
  if (values === null) return null;
  if (c.is !== undefined) return values.length === 1 && values[0] === c.is;
  if (c.includes !== undefined) return values.includes(c.includes);
  return values.some((v) => (c.in ?? []).includes(v));
}

/** Eine Regel fuer einen Lagerort. `null` = die Regel erzeugt hier keinen Check. */
export function evaluateStorageRule(
  rule: StorageRule,
  location: { country: string; phase: 'current' | 'planned'; confirmation: 'confirmed' | 'unconfirmed' | 'unstated' },
  answers: StorageRuleAnswers,
): StorageCheck | null {
  if (rule.review.status !== 'released') return null;
  if (rule.jurisdiction !== location.country || !rule.applies_to.phases.includes(location.phase)) return null;

  const open: StorageCheck['open'] = [];
  const missing = (c: Condition) => {
    if (open.some((o) => o.key === c.fact)) return;
    if (c.fact.startsWith('input:')) {
      const input = rule.required_inputs?.find((i) => i.key === c.fact.slice(6));
      open.push({ kind: 'input', key: c.fact, text: input?.question_en, options: input?.options });
    } else open.push({ kind: 'answer', key: c.fact });
  };
  const all = (cs: Condition[]): Tri => {
    let unknown = false;
    for (const c of cs) {
      const r = test(c, rule, answers);
      if (r === false) return false;
      if (r === null) { unknown = true; missing(c); }
    }
    return unknown ? null : true;
  };

  const base = {
    rule_id: rule.id, rule_version: rule.version,
    country: location.country, phase: location.phase, confirmation: location.confirmation,
    area: rule.result.area, priority: rule.result.priority,
    title: rule.result.title_en, explanation: rule.result.explanation_en,
    source: { authority: rule.source.authority, title: rule.source.title, url: rule.source.url, provision: rule.source.provision, kind: rule.source.kind },
  };

  // 1) Der Ausloeser. Trifft er nicht zu, gibt es keinen Check; ist er
  //    unbekannt, verhindert eine fehlende Angabe die Bewertung → open.
  const trigger = all(rule.applies_to.conditions);
  if (trigger === false) return null;
  if (trigger === null) return { ...base, state: 'open', open };

  // 2) Ausnahmen aendern das Ergebnis. Eine Ausnahme, deren Voraussetzung
  //    unbekannt ist, laesst die Bewertung offen und nennt die Angabe.
  let ceiling: 'likely' | null = null;
  let applied: StorageCheck['exception'];
  for (const e of rule.exceptions ?? []) {
    const hit = all(e.when);
    if (hit === null) return { ...base, state: 'open', open };
    if (hit === false) continue;
    const exception = { id: e.id, text: e.text_en, provision: e.provision };
    if (e.effect === 'no_check') return null;
    if (e.effect === 'open') return { ...base, state: 'open', open, exception };
    ceiling = 'likely';
    applied = exception;
  }

  // 3) Ein benannter, nicht bestaetigter Standort: likely, mit der offenen
  //    Bestaetigung als erstem Punkt.
  if (location.confirmation !== 'confirmed') {
    return { ...base, state: 'likely', open: [{ kind: 'location', key: 'location' }, ...open], exception: applied };
  }
  // 4) Ein Plan ist keine laufende Pflicht — auch ein bestaetigter nicht.
  if (location.phase === 'planned' || ceiling === 'likely' || !rule.applies_when) {
    return { ...base, state: 'likely', open, exception: applied };
  }
  // 5) Aktiv und bestaetigt: "applies" nur, wenn die Regel und saemtliche
  //    Angaben es tragen.
  const carries = all(rule.applies_when);
  if (carries === null) return { ...base, state: 'open', open };
  return { ...base, state: carries ? 'confirmed' : 'likely', open, exception: applied };
}
