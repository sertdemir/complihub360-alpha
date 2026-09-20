import {
  FX_STAND,
  inEuro,
  type PenaltyCeiling,
  type SubnationalCeiling,
  type UsState,
} from '@complihub/compliance-engine';

// ─── Die belegte Obergrenze als Anzeige ──────────────────────────────────────
//
// Seit Tagen wird jede Obergrenze am Primaertext belegt — und angezeigt wurde
// davon nichts. `penaltyCeiling` reiste bis in `AreaObligation` und wurde dort
// fallen gelassen; die Oberflaeche zeigte weiter `penalty`, den redaktionellen
// Fliesstext, und `penaltyMaxEur`, die hochgezaehlte Eurozahl.
//
// Dieses Modul uebersetzt die acht Formen in Anzeigeteile. Es macht BEWUSST
// keine i18n: es liefert Zahlen und Formkennungen, die Komponente setzt die
// Worte. So bleibt die Rechnerei testbar, ohne eine Uebersetzung zu laden.

/** Was die Oberflaeche von einer Obergrenze anzeigt. `form` waehlt den Satz,
 *  die Felder fuellen ihn. */
export type CeilingDisplay =
  | { form: 'amount'; amount: string }
  | { form: 'perUnit'; amount: string; per: string }
  | { form: 'proportional'; percent: number; of: string }
  | { form: 'turnover'; percent: number; orAmount: string | null }
  | { form: 'delegated' | 'none' | 'unlimited' }
  | { form: 'subnational'; level: string; states: StateRow[] };

export interface StateRow {
  code: UsState;
  amount: string;
  source: string;
}

/** Woher die Eurozahl kommt, die neben der Obergrenze steht. Das ist die
 *  Frage, die ein Leser der Karte stellen wuerde und die bisher niemand
 *  beantwortet hat: eine umgerechnete Zahl ist schwaechere Evidenz als eine,
 *  die im Gesetz steht — und eine ohne jeden Beleg ist blosser Bestand. */
export type Provenance =
  /** Der Betrag steht in Euro im Gesetz. Staerkste Form. */
  | { kind: 'statutory' }
  /** Das Gesetz nennt Pfund oder Dollar; die Eurozahl ist unsere Umrechnung. */
  | { kind: 'converted'; from: string; rateAsOf: string }
  /** Das Gesetz nennt ueberhaupt keinen Betrag — delegiert, anteilig, je
   *  Einheit, unbegrenzt. Die Eurozahl daneben hat dann keine Entsprechung. */
  | { kind: 'noAmount' }
  /** Noch gar keine belegte Obergrenze: `penaltyMaxEur` ist Bestand. */
  | { kind: 'unproven' };

const NF = (locale: string, currency: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

/** Zerlegt eine Obergrenze in das, was angezeigt wird. `states` kommt vom
 *  Eintrag, nicht von der Obergrenze — nur `subnational` verwendet es. */
export function describeCeiling(
  ceiling: PenaltyCeiling,
  locale: string,
  states?: Partial<Record<UsState, SubnationalCeiling>>,
): CeilingDisplay {
  switch (ceiling.kind) {
    case 'amount':
      return { form: 'amount', amount: NF(locale, ceiling.currency).format(ceiling.value) };
    case 'perUnit':
      return {
        form: 'perUnit',
        amount: NF(locale, ceiling.currency).format(ceiling.value),
        per: ceiling.per,
      };
    case 'proportional':
      return { form: 'proportional', percent: ceiling.percent, of: ceiling.of };
    case 'turnover':
      return {
        form: 'turnover',
        percent: ceiling.percent,
        orAmount: ceiling.orAmount
          ? NF(locale, ceiling.orAmount.currency).format(ceiling.orAmount.value)
          : null,
      };
    case 'subnational':
      return {
        form: 'subnational',
        level: ceiling.level,
        // Sortiert nach Betrag, groesster zuerst: die Spanne ist hier die
        // Aussage. Kalifornien und Texas nennen 7.500 USD, Florida das
        // Zwanzigfache — alphabetisch sortiert versteckte das.
        states: Object.entries(states ?? {})
          .map(([code, e]) => ({ code: code as UsState, eintrag: e }))
          .filter((x): x is { code: UsState; eintrag: SubnationalCeiling } => !!x.eintrag)
          .sort((a, b) => betragVon(b.eintrag) - betragVon(a.eintrag))
          .map(({ code, eintrag }) => ({
            code,
            amount:
              eintrag.penaltyCeiling.kind === 'amount'
                ? NF(locale, eintrag.penaltyCeiling.currency).format(eintrag.penaltyCeiling.value)
                : '',
            source: eintrag.source,
          })),
      };
    default:
      return { form: ceiling.kind };
  }
}

const betragVon = (e: SubnationalCeiling): number =>
  e.penaltyCeiling.kind === 'amount' ? e.penaltyCeiling.value : 0;

/** Die Fundstelle mit Stand, wie sie unter der Zahl steht. `asOf` fehlt bei
 *  den Formen, die keinen Betrag nennen — dort gibt es nichts zu datieren. */
export function ceilingBasis(
  ceiling: PenaltyCeiling,
): { basis: string; basisNote?: string; asOf?: string } {
  // `basisNote` traegt einen SCHLUESSEL, keinen Satz — die Uebersetzung holt
  // die Komponente. Siehe den Typ `BasisNote` in der Engine.
  const note = ceiling.basisNote;
  return 'asOf' in ceiling
    ? { basis: ceiling.basis, basisNote: note, asOf: ceiling.asOf }
    : { basis: ceiling.basis, basisNote: note };
}

/** Beantwortet fuer einen Eintrag, woher seine Eurozahl stammt.
 *
 *  Die Reihenfolge der Faelle ist die Aussage: erst pruefen, OB eine
 *  Obergrenze belegt ist, dann ob sie ueberhaupt einen Betrag nennt, dann ob
 *  der in Euro steht. Jeder Schritt nach unten ist schwaechere Evidenz. */
export function provenance(entry: {
  penaltyMaxEur?: number;
  penaltyCeiling?: PenaltyCeiling;
}, locale: string): Provenance {
  const c = entry.penaltyCeiling;
  if (!c) return { kind: 'unproven' };
  // `turnover` mit `orAmount` NENNT einen Betrag — die DSGVO sagt "20 Mio EUR
  // ODER 4 % des Umsatzes, je nachdem, was hoeher ist". Wer hier nur auf
  // `kind === 'amount'` prueft, schreibt unter eine Zeile mit 20.000.000 EUR
  // die Behauptung, das Gesetz nenne keinen Betrag. Genau das stand kurz in
  // der Oberflaeche. Der Engine-Waechter kennt dieselbe Unterscheidung als
  // `nenntBetrag`; hier muss sie gleich lauten.
  const betrag =
    c.kind === 'amount'
      ? { value: c.value, currency: c.currency }
      : c.kind === 'turnover' && c.orAmount
        ? c.orAmount
        : null;
  if (!betrag) return { kind: 'noAmount' };
  if (betrag.currency === 'EUR') return { kind: 'statutory' };
  return {
    kind: 'converted',
    from: NF(locale, betrag.currency).format(betrag.value),
    rateAsOf: FX_STAND,
  };
}

/** Die Eurozahl, die zu einer Fremdwaehrungs-Obergrenze gehoert — am selben
 *  eingefrorenen Kurs wie im Eintrag. Gibt null zurueck, wenn dafuer kein
 *  Kurs vorliegt; lieber fehlt eine Zahl, als dass eine falsche entsteht. */
export function ceilingInEuro(ceiling: PenaltyCeiling): number | null {
  if (ceiling.kind !== 'amount') return null;
  return inEuro(ceiling.value, ceiling.currency);
}

/** Wie es um die Belege einer LISTE von Pflichten steht.
 *
 *  Vier Flaechen stellen dieselbe Frage — die Kennzahl, die Matrix, die
 *  Kalender-Fussnote und die Bereichsseite. Sie muss ueberall gleich
 *  beantwortet werden, sonst zaehlt eine Flaeche anders als die daneben.
 *  Genau daran ist die Unterscheidung "nennt das Gesetz einen Betrag" heute
 *  schon zweimal gescheitert. */
export interface BelegLage {
  gesetzlich: number;
  umgerechnet: number;
  /** Obergrenze belegt, aber ohne absoluten Betrag: anteilig, je Einheit,
   *  delegiert, unbegrenzt, eine Ebene tiefer. */
  ohneBetrag: number;
  /** Ueberhaupt keine Obergrenze gelesen. */
  unbelegt: number;
  gesamt: number;
  /** Summe NUR der Betraege, die das Gesetz nennt — in Euro, Fremdwaehrung am
   *  eingefrorenen Kurs. Was keinen Betrag nennt, wird NICHT mitgezaehlt:
   *  eine Kennzahl soll messen, was sie behauptet. */
  belegteSummeEur: number;
  /** Die bisherige Summe ueber `penaltyMaxEur`, zum Vergleich. */
  bestandSummeEur: number;
}

export function belegLage(
  entries: { penaltyMaxEur?: number; penaltyCeiling?: PenaltyCeiling }[],
): BelegLage {
  const l: BelegLage = {
    gesetzlich: 0, umgerechnet: 0, ohneBetrag: 0, unbelegt: 0,
    gesamt: entries.length, belegteSummeEur: 0, bestandSummeEur: 0,
  };
  for (const e of entries) {
    l.bestandSummeEur += e.penaltyMaxEur ?? 0;
    const c = e.penaltyCeiling;
    if (!c) { l.unbelegt += 1; continue; }
    const b = statutoryAmount(c);
    if (!b) { l.ohneBetrag += 1; continue; }
    const eur = b.currency === 'EUR' ? b.value : inEuro(b.value, b.currency);
    // Fehlt fuer eine Waehrung der Kurs, zaehlt der Eintrag NICHT als belegt.
    // Lieber eine kleinere Summe als eine, die eine Zahl erfindet.
    if (eur == null) { l.ohneBetrag += 1; continue; }
    l.belegteSummeEur += eur;
    if (b.currency === 'EUR') l.gesetzlich += 1; else l.umgerechnet += 1;
  }
  return l;
}

/** Der Betrag, den das Gesetz nennt — oder null. Dieselbe Unterscheidung wie
 *  `nenntBetrag` im Engine-Waechter: `turnover` MIT `orAmount` nennt einen. */
function statutoryAmount(c: PenaltyCeiling): { value: number; currency: string } | null {
  if (c.kind === 'amount') return { value: c.value, currency: c.currency };
  if (c.kind === 'turnover' && c.orAmount) return c.orAmount;
  return null;
}
