import { CountryCode } from './country-profile.js';

// ─── Obligation enrichment ───────────────────────────────────────────────────
// Per-subdomain legal metadata: statute reference, penalty exposure and the
// typical filing cadence. Keyed by subdomain id → country override, with a
// 'default' fallback (EU-level instruments or a generic phrasing). This is
// editorial ground truth for the risk map — deterministic, no live lookups.

/** Die Waehrung, in der das Gesetz den Betrag fuehrt. */
export type Waehrung = 'EUR' | 'GBP' | 'USD' | 'TRY';

/** Der erklaerende Zusatz zu einer Fundstelle — als SCHLUESSEL, nicht als
 *  Text.
 *
 *  `basis` ist eine Zitation und bleibt deutsch, genau wie `source`: "CGI
 *  Art. 1728 Abs. 1" liest sich in jeder Sprache richtig, weil es ein
 *  Eigenname ist. Der Klammerzusatz dahinter war etwas anderes — "10 % ohne
 *  Mahnung, 40 % nach Mahnung" ist Prosa, und die stand als Redaktionsnotiz
 *  im selben Feld. Solange nur `source` angezeigt wurde, fiel das nicht auf;
 *  seit die Obergrenze sichtbar ist, steht deutscher Fliesstext in einer
 *  englischen Oberflaeche.
 *
 *  Deshalb hier ein Schluessel und kein Satz: die Uebersetzungen liegen bei
 *  den anderen, das Deutsche ist keine bevorzugte Sprache mehr, und ein
 *  Waechter merkt, wenn ein Schluessel keine hat.
 *
 *  Zitate bleiben in `basis`. Hier steht nur, was ERKLAERT: wie der Betrag
 *  zustande kommt, fuer wen er gilt, ab wann er greift. */
export type BasisNote = string;

/** Die Obergrenze einer Sanktion, so wie das Gesetz sie fuehrt. */
export type PenaltyCeiling =
    /** Ein im Gesetz genannter Betrag, in SEINER Waehrung. Nicht umrechnen und
     *  nicht runden — die Umrechnung gehoert an die Anzeige, mit Kurs und Tag. */
    | {
          kind: 'amount';
          value: number;
          currency: Waehrung;
          /** Der Betrag, den der Sanktionsartikel SELBST nennt, wenn `value`
           *  daraus erst errechnet ist. In Frankreich ist das der Regelfall:
           *  Code penal Art. 131-38 setzt die Strafe fuer juristische Personen
           *  auf das Fuenffache des Satzes fuer natuerliche, und der Artikel
           *  nennt nur diesen.
           *
           *  Stand als Zahl im basis-String, solange der Prosa enthielt —
           *  ein Waechter las sie dort heraus. Das trug nicht: als die Prosa
           *  in `basisNote` wanderte, verlor er seinen Gegenstand und wurde
           *  rot. Eine Rechengroesse gehoert in ein Feld, nicht in einen Satz. */
          statutoryValue?: number;
          basis: string;
          basisNote?: BasisNote;
          asOf: string;
      }
    /** Umsatzabhaengig. `orAmount` fuer den Fall, dass das Gesetz das Hoehere
     *  von beidem verlangt — so die DSGVO in Art. 83 Abs. 5 und, mit eigener
     *  Zahl in eigener Waehrung, die UK-DSGVO in DPA 2018 s. 157 Abs. 5. */
    | { kind: 'turnover'; percent: number; orAmount?: { value: number; currency: Waehrung }; basis: string; basisNote?: BasisNote; asOf: string }
    /** Der Rechtsakt ueberlaesst die Sanktion den Mitgliedstaaten. Hier GIBT es
     *  keinen Betrag; eine Zahl waere erfunden, kein ungenauer Wert. */
    | { kind: 'delegated'; basis: string; basisNote?: BasisNote; note: string }
    /** Geprueft, und es gibt ueberhaupt keine Geldbusse: die Folge eines
     *  Verstosses ist zivilrechtlich (unwirksame Klausel, Prozessrisiko).
     *  Unterscheidet sich von `undefined` — das heisst "noch nicht geprueft". */
    | { kind: 'none'; basis: string; basisNote?: BasisNote; note: string }
    /** Anteil an einer anderen Groesse als dem Umsatz — fast immer an der
     *  hinterzogenen Steuer. Das romanische Steuerstrafrecht kennt kaum
     *  absolute Hoechstbetraege: Spanien sanktioniert mit 100-150 % der nicht
     *  abgefuehrten Schuld, Italien mit 120-240 %. `of` benennt die Bezugs-
     *  groesse im Klartext; ohne sie ist der Prozentsatz wertlos. */
    | { kind: 'proportional'; percent: number; of: string; basis: string; basisNote?: BasisNote; asOf: string }
    /** Das Gesetz sieht eine Geldstrafe vor, aber KEINE Obergrenze. Im
     *  Vereinigten Koenigreich ist das seit LASPO 2012 s. 85 der Regelfall:
     *  "punishable ... by a fine" ohne Zusatz heisst unbegrenzt. Das ist weder
     *  `none` (eine Busse gibt es sehr wohl) noch `delegated` (der Gesetzgeber
     *  war taetig) noch `amount` (es gibt keine Zahl zu nennen). */
    | { kind: 'unlimited'; basis: string; basisNote?: BasisNote; note: string }
    /** Die Sanktion wird eine Ebene UNTER der gesetzt, die dieser Eintrag
     *  fuehrt. Nicht dasselbe wie `delegated`: dort hat der Gesetzgeber die
     *  Zahl noch nicht erlassen und eine Frist laeuft; hier gibt es sie
     *  laengst, nur eben fuenfundvierzigmal. Die US-Umsatzsteuer ist Sache
     *  der Bundesstaaten, der Bund hat dafuer keine Zustaendigkeit.
     *
     *  Eine Zahl waere hier nicht ungenau, sondern eine Verwechslung der
     *  Ebene. `level` benennt, WER sie setzt und wie viele — ohne das ist
     *  "steht woanders" keine Auskunft. */
    | { kind: 'subnational'; level: string; basis: string; basisNote?: BasisNote; note: string }
    /** Ein Betrag JE EINHEIT — Stueck, Tonne, Tag. Das Gesetz nennt eine Zahl,
     *  aber sie ist nicht die Obergrenze, sondern ihr Faktor: die Summe waechst
     *  mit der Menge und hat nach oben keinen Deckel.
     *
     *  Die franzoesische AGEC-Busse ist der Fall: 7.500 EUR "par unite ou par
     *  tonne de produit concerne". Wer 10.000 Einheiten in Verkehr bringt,
     *  haftet nicht mit 7.500 EUR. Als `amount` gefuehrt waere die Zahl nicht
     *  ungenau, sondern um Groessenordnungen zu niedrig — und zwar genau bei
     *  den grossen Inverkehrbringern, fuer die die Karte gedacht ist.
     *
     *  `per` benennt die Bezugseinheit im Klartext; ohne sie ist der Betrag
     *  so wertlos wie ein Prozentsatz ohne Bezugsgroesse. */
    | { kind: 'perUnit'; value: number; currency: Waehrung; per: string; basis: string; basisNote?: BasisNote; asOf: string };

/** Die US-Gliedstaaten, fuer die das Produkt eigene Zahlen fuehrt.
 *  Bewusst KEINE Erweiterung von `CountryCode`: dort haengen Marktgewichte,
 *  EU-Mitgliedschaft und der Generator dran, und ein Gliedstaat ist kein Markt
 *  im Sinne dieser Liste. */
export type UsState = 'CA' | 'TX' | 'NY' | 'FL';

/** Die Aufloesung zu `penaltyCeiling.kind === 'subnational'`: was der einzelne
 *  Gliedstaat vorsieht, mit seiner eigenen Vorschrift. Der Bund hat hier keine. */
export interface SubnationalCeiling {
    /** Die Vorschrift DIESES Staates, nicht die des Bundes. */
    source: string;
    penaltyCeiling: PenaltyCeiling;
}

export interface ObligationEnrichment {
    /** Primary legal source, e.g. 'UStG §18i (OSS)'. */
    source: string;
    /** Human penalty phrasing, e.g. 'up to €50,000'. */
    penalty: string;
    /** Upper penalty bound in EUR used for the total-exposure stat. */
    penaltyMaxEur?: number;
    /** Was ein Verstoss hoechstens kostet — belegt, in der Waehrung des
     *  Gesetzes, mit Stand. Oder die ehrliche Auskunft, dass es dafuer keinen
     *  Betrag gibt.
     *
     *  ERSETZT den Ansatz `penaltyBasis`, der eine Woche alt war und zu kurz
     *  griff: eine Fundstelle allein reicht nicht, wenn `penaltyMaxEur`
     *  drei verschiedene Dinge in einem Feld fuehrt. Die Pruefung am
     *  Primaertext (2026-09-17) hat gezeigt, welche:
     *
     *    - einen gesetzlichen Betrag in EUR                     (33 Eintraege)
     *    - eine UNDATIERTE UMRECHNUNG aus GBP, USD oder TRY     (21 Eintraege)
     *      Das Gesetz nennt GBP 1.500 oder USD 120.000; wann und zu welchem
     *      Kurs daraus ein Eurobetrag wurde, steht nirgends. Bei tuerkischer
     *      Inflation ist so ein Wert nach Monaten sinnlos.
     *    - eine SCHAETZUNG, wo das Gesetz gar keinen Betrag nennt (18 Eintraege)
     *      PPWR Art. 68: "Bis zum 12. Februar 2027 erlassen die Mitgliedstaaten
     *      Vorschriften ueber Sanktionen." Es GIBT dort keinen Betrag, den man
     *      zitieren koennte — er ist noch nicht erlassen.
     *
     *  Neben einen solchen Wert passt keine Fundstelle, ohne selbst zu luegen:
     *  eine echte Vorschrift, die einen Betrag belegt, den sie nicht nennt.
     *
     *  Die drei Zahlen oben sind der Stand vom 17.09.2026 und altern mit jeder
     *  neuen Pflicht. Den lebenden Stand fuehrt der Waechter in
     *  `obligationScope.test.ts` — dort steht, wie viele noch unbelegt sind. */
    penaltyCeiling?: PenaltyCeiling;
    /** Nur wo `penaltyCeiling.kind === 'subnational'` steht: je gefuehrtem
     *  Gliedstaat der belegte Betrag. Die Karte bleibt nach Laendern
     *  geschluesselt; dieses Feld haengt die Ebene darunter ein, ohne dass
     *  Generator, Marktprofile oder Risikomatrix etwas davon wissen muessen.
     *
     *  Unvollstaendig zu sein ist hier der Normalfall und kein Mangel: nicht
     *  jeder Staat stellt seinen Gesetzestext maschinell bereit. Welche fehlen
     *  und warum, fuehrt der Waechter in `obligationScope.test.ts`. */
    states?: Partial<Record<UsState, SubnationalCeiling>>;
    /** Cadence label: 'Quarterly' | 'Annual' | 'Monthly' | 'Ongoing' | 'One-off'. */
    due: string;
    /** Typical days until the next deadline; drives the median-deadline stat. */
    dueDays?: number;
    /** ISO date (YYYY-MM-DD) from which the obligation actually bites. Set only
     *  where an act is already in force but not yet applicable, or where a
     *  staged duty starts later than its parent act (PPWR recycled-content and
     *  empty-space quotas in 2030). Omitted = applicable today, which is the
     *  case for every obligation unless stated otherwise. Kept as a plain date
     *  rather than a countdown so this map stays deterministic — the days-until
     *  arithmetic belongs at the render point, which is the only place that
     *  legitimately knows 'now'. */
    appliesFrom?: string;
    /** How this entry stands to NATIONAL law. Only meaningful on a 'default'
     *  entry — a country override is by definition national.
     *
     *  'eu'               An EU Regulation. Directly applicable and identical
     *                     in every member state, so there is no national text
     *                     to hold: this IS the applicable law. NOT a coverage
     *                     gap, and must never be rendered as one.
     *  'national-pending' A national instrument genuinely exists — a Directive
     *                     transposed, or a Regulation that mandates a national
     *                     register — and the engine does not carry it yet.
     *                     This IS a coverage gap, and the honest one.
     *  'placeholder'      Not a source. A string shaped like a citation
     *                     ("National commercial register act") standing where
     *                     one belongs. It must NEVER be printed as a legal
     *                     basis: the page's whole claim is that every duty
     *                     traces to a named statute, and this traces to
     *                     nothing.
     *
     *  Absent on a country override; absent on a default is read as 'eu' for
     *  back-compatibility, so a new entry that is really a gap has to say so.
     */
    scope?: 'eu' | 'national-pending' | 'placeholder';
}

type EnrichmentMap = Record<string, Partial<Record<CountryCode | 'default', ObligationEnrichment>>>;

export const ObligationEnrichmentMap: EnrichmentMap = {
    'tax-vat-registration': {
        DE: { source: 'UStG §18 / §18i (OSS)', penalty: 'late-filing surcharge up to 10%, max €25,000', penaltyMaxEur: 25000, due: 'Quarterly', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 25000, currency: 'EUR', basis: 'AO § 152 Abs. 10', basisNote: 'deLateSurchargeCap', asOf: '2026-09-17' } },
        UK: { source: 'UK VATA 1994 §3', penalty: 'bis zu 100% der entgangenen Steuer', penaltyMaxEur: 23000, due: 'Quarterly', dueDays: 30, penaltyCeiling: { kind: 'proportional', percent: 100, of: 'potentialLostRevenue', basis: 'FA 2008 Sch. 41 Abs. 6 Nr. 2 Buchst. a i.V.m. Abs. 1', basisNote: 'ukDeliberateConcealed', asOf: '2026-09-19' } },
        FR: {
            source: 'CGI Art. 256 / 287',
            penalty: '10–40% surcharge on VAT due (80% if undeclared activity)',
            penaltyMaxEur: 20000,
            due: 'Monthly',
            dueDays: 24,
            // Das franzoesische Steuerstrafrecht kennt hier keinen absoluten
            // Hoechstbetrag: CGI Art. 1728 staffelt 10 / 40 / 80 % auf die
            // geschuldete Steuer. Die 20.000 EUR daneben stehen in keinem Text.
            penaltyCeiling: {
                kind: 'proportional',
                percent: 80,
                of: 'taxDue',
                basis: 'CGI Art. 1728 Abs. 1', basisNote: 'frTaxTiers',
                asOf: '2026-02-21',
            },
        },
        IT: { source: 'Testo unico IVA (D.Lgs. 10/2026), vorher DPR 633/1972 Art. 35', penalty: '120% der geschuldeten Steuer, mind. EUR 250', penaltyMaxEur: 30000, due: 'Quarterly', dueDays: 30, penaltyCeiling: { kind: 'proportional', percent: 120, of: 'vatDue', basis: 'Testo unico delle sanzioni tributarie (D.Lgs. 173/2024) Art. 30 Abs. 1 — omessa dichiarazione, Mindestbetrag 250 EUR; bei bloßer Unrichtigkeit 70 % nach Abs. 5. Die früheren 120 bis 240 % aus D.Lgs. 471/1997 Art. 5 gibt es nicht mehr: die Reform 2024 hat Bandbreiten durch feste Sätze ersetzt.', asOf: '2026-09-19' } },
        ES: { source: 'Ley 37/1992 (IVA) Art. 164', penalty: '50–150% of unpaid VAT', penaltyMaxEur: 25000, due: 'Quarterly', dueDays: 30, penaltyCeiling: { kind: 'proportional', percent: 150, of: 'unremittedTax', basis: 'LGT (Ley 58/2003) Art. 191 Abs. 4', basisNote: 'esVeryGraveRange', asOf: '2026-09-17' } },
        NL: { source: 'Wet OB 1968 Art. 14', penalty: 'up to €6,709 per late payment', penaltyMaxEur: 6709, due: 'Quarterly', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 6709, currency: 'EUR', basis: 'AWR Art. 67c Abs. 1', basisNote: 'nlPaymentDefault', asOf: '2026-09-17' } },
        TR: { source: 'KDV Kanunu No. 3065', penalty: 'tax-loss fine: 1× the unpaid KDV', penaltyMaxEur: 15000, due: 'Monthly', dueDays: 26 },
        US: { source: 'State economic-nexus rules (post-Wayfair)', penalty: 'per-state assessments + interest', penaltyMaxEur: 20000, due: 'Monthly', dueDays: 20, penaltyCeiling: { kind: 'subnational', level: 'states45AndDc', basis: 'South Dakota v. Wayfair, 585 U.S. 162 (2018); keine bundesrechtliche Umsatzsteuer', note: 'Der Bund erhebt keine Umsatzsteuer und setzt dafür keine Sanktion. Jeder Bundesstaat mit Sales Tax führt seine eigene — fünfundvierzig verschiedene Antworten plus D.C. Eine davon als "die" US-Zahl zu führen wäre keine Ungenauigkeit, sondern eine Verwechslung der Ebene.' } },
        default: { source: 'EU VAT Directive 2006/112/EC', penalty: 'national surcharges + interest', penaltyMaxEur: 20000, due: 'Quarterly', dueDays: 30, scope: 'national-pending' },
    },
    'tax-corporate': {
        DE: { source: 'KStG §7 / AO §149', penalty: 'late surcharge 0.25%/month of assessed tax', penaltyMaxEur: 25000, due: 'Annual', dueDays: 120, penaltyCeiling: { kind: 'amount', value: 25000, currency: 'EUR', basis: 'AO § 152 Abs. 10', basisNote: 'deLateSurchargeCap', asOf: '2026-09-17' } },
        UK: { source: 'CTA 2010 / HMRC CT600', penalty: '£200–£2,000 fest + bis zu 20% der offenen Steuer', penaltyMaxEur: 5000, due: 'Annual', dueDays: 120, penaltyCeiling: { kind: 'proportional', percent: 20, of: 'unpaidCorporateTax', basis: 'FA 1998 Sch. 18 Abs. 18 Nr. 2 Buchst. b; dazu der Festbetrag nach Abs. 17 Nr. 2 und 3: 200/400, im dritten Wiederholungsfall 1.000/2.000 GBP (Beträge i.d.F. FA 2026 s. 265)', basisNote: 'ukOverTwoYears', asOf: '2026-09-19' } },
        FR: {
            source: 'CGI Art. 205 (impôt sur les sociétés)',
            penalty: '10–40% majoration + intérêts de retard',
            penaltyMaxEur: 12000,
            due: 'Annual',
            dueDays: 105,
            // Dieselbe Norm wie bei der Umsatzsteuer — CGI Art. 1728 gilt fuer
            // jede verspaetete Erklaerung, nicht nur fuer eine Steuerart.
            penaltyCeiling: {
                kind: 'proportional',
                percent: 80,
                of: 'corporateTaxDue',
                basis: 'CGI Art. 1728 Abs. 1 (Verspätung), Art. 1729', basisNote: 'frTaxIntent',
                asOf: '2026-02-21',
            },
        },
        IT: { source: 'TUIR DPR 917/1986 (IRES)', penalty: '120% bei unterlassener, 70% bei unrichtiger Erklärung', penaltyMaxEur: 20000, due: 'Annual', dueDays: 120, penaltyCeiling: { kind: 'proportional', percent: 120, of: 'itIncomeTax', basis: 'Testo unico delle sanzioni tributarie (D.Lgs. 173/2024) Art. 27 Abs. 1 — omessa dichiarazione, Mindestbetrag 250 EUR; bei unrichtiger Erklärung 70 % nach Abs. 3. Die früheren 90 bis 180 % aus D.Lgs. 471/1997 Art. 1 sind mit dessen Aufhebung entfallen.', asOf: '2026-09-19' } },
        ES: { source: 'Ley 27/2014 (Impuesto sobre Sociedades)', penalty: '50–150% de la cuota + recargos', penaltyMaxEur: 15000, due: 'Annual', dueDays: 115, penaltyCeiling: { kind: 'proportional', percent: 150, of: 'unremittedTax', basis: 'LGT (Ley 58/2003) Art. 191 Abs. 4', basisNote: 'esVeryGraveRange', asOf: '2026-09-17' } },
        NL: { source: 'Wet Vpb 1969 (vennootschapsbelasting)', penalty: 'verzuim-/vergrijpboete tot 100%', penaltyMaxEur: 6709, due: 'Annual', dueDays: 150, penaltyCeiling: { kind: 'amount', value: 6709, currency: 'EUR', basis: 'AWR Art. 67a Abs. 1', basisNote: 'deAssessedTaxes', asOf: '2026-09-17' } },
        US: { source: 'IRC §11 / state franchise tax', penalty: '5%/month of unpaid tax, max 25%', penaltyMaxEur: 15000, due: 'Annual', dueDays: 105, penaltyCeiling: { kind: 'proportional', percent: 25, of: 'taxRequiredToShow', basis: '26 CFR § 301.6651-1 Buchst. a Nr. 1', basisNote: 'usMonthlyCap25', asOf: '2026-09-19' } },
        default: { source: 'National corporate income tax act', penalty: 'late surcharges + interest', penaltyMaxEur: 10000, due: 'Annual', dueDays: 120, scope: 'placeholder' },
    },
    'prod-epr': {
        DE: { source: 'VerpackDG §6 / §7 (LUCID)', penalty: 'up to €200,000 + distribution ban', penaltyMaxEur: 200000, due: 'Annual', dueDays: 60, penaltyCeiling: { kind: 'amount', value: 200000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 1 Nr. 3 (Systembeteiligungspflicht)', asOf: '2026-09-17' } },
        FR: {
            source: 'Code env. Art. L541-10 (AGEC)',
            penalty: '€7,500 per unit or tonne placed on the market (legal persons)',
            penaltyMaxEur: 30000,
            due: 'Annual',
            dueDays: 60,
            // Art. L541-9-5 nennt DREI Betraege, und die 30.000 EUR, die wir
            // bisher fuehrten, sind der engste davon: eine Pauschale fuer den
            // Sonderfall der fehlenden Registereintragung. Der Regelfall ist
            // der Betrag je Einheit, und der hat keinen Deckel. Das dritte ist
            // ein Zwangsgeld von 20.000 EUR am Tag.
            penaltyCeiling: {
                kind: 'perUnit',
                value: 7500,
                currency: 'EUR',
                per: 'unitOrTonnePlaced',
                basis: 'Code de l’environnement Art. L541-9-5 Abs. 2', basisNote: 'frPerUnitTwoRates',
                asOf: '2021-08-25',
            },
        },
        UK: { source: 'UK Packaging Waste Regs 2023 §7 (PackUK)', penalty: 'unbegrenzte Geldstrafe; Festbetragsstrafe £1.000', penaltyMaxEur: 50000, due: 'Annual', dueDays: 90, penaltyCeiling: { kind: 'unlimited', basis: 'SI 2024/1332 Reg. 119 Buchst. a und b Nr. i (Producer Responsibility Obligations (Packaging and Packaging Waste) Regulations 2024)', note: 'Auf Anklage und in England und Wales auch im abgekürzten Verfahren "by a fine" — ohne Höchstbetrag. Die variable Verwaltungsstrafe ist nach Sch. 13 Abs. 10 Nr. 2 auf das Höchstmaß dieser Geldstrafe begrenzt, das es nicht gibt; nur die Festbetragsstrafe nennt eine Zahl (1.000 GBP, Sch. 13 Abs. 2 Nr. 1).' } },
        ES: { source: 'RD 1055/2022 (Envases) / Ley 7/2022', penalty: 'up to €3,500,000 (infracción muy grave)', penaltyMaxEur: 3500000, due: 'Annual', dueDays: 60, penaltyCeiling: { kind: 'amount', value: 3500000, currency: 'EUR', basis: 'Ley 7/2022 Art. 109 Abs. 1 Buchst. a Nr. 1 (infracción muy grave)', asOf: '2026-09-17' } },
        IT: { source: 'D.Lgs. 152/2006 (CONAI)', penalty: 'EUR 15.500 bis 46.500', penaltyMaxEur: 46500, due: 'Annual', dueDays: 60, penaltyCeiling: { kind: 'amount', value: 46500, currency: 'EUR', basis: 'D.Lgs. 152/2006 Art. 261 Abs. 2 (kein eigenes System und kein Beitritt zu einem Konsortium nach Art. 223)', asOf: '2026-09-19' } },
        NL: { source: 'Besluit beheer verpakkingen (Afvalfonds)', penalty: 'recovery + administrative fines', penaltyMaxEur: 25000, due: 'Annual', dueDays: 60 },
        default: { source: 'EU PPWR 2025/40', penalty: 'national EPR fines + sales ban', penaltyMaxEur: 50000, due: 'Annual', dueDays: 60, scope: 'national-pending', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    // PPWR is a Regulation: it binds whoever places packaging on the EU market,
    // identically in every member state, so there are no country overrides here.
    // The national layer (registration, licensing fees) sits in 'prod-epr'.
    'prod-packaging-conformity': {
        DE: { source: 'EU PPWR 2025/40 Art. 37–39 (Annex VII/VIII)', penalty: 'VerpackDG §66: bis zu €10.000 (Konformitätsbewertung)', penaltyMaxEur: 10000, due: 'Ongoing', appliesFrom: '2026-08-12', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 10000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 3 (Konformitätsbewertung nach Art. 15 Abs. 2 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 37–39 (Annex VII/VIII)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2026-08-12', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    // The 2030 tranche. Same reasoning as above: a Regulation, so no country
    // overrides. Art. 24 additionally slips to "3 years after the implementing
    // act" if the Commission is late, so the date is a floor, not a promise —
    // said plainly in the source string rather than pretended away.
    'prod-packaging-recycled-content': {
        DE: { source: 'EU PPWR 2025/40 Art. 7 (post-consumer recyclate only)', penalty: 'VerpackDG §66: bis zu €10.000 + Marktrücknahme', penaltyMaxEur: 10000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 10000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 2 (Inverkehrbringen entgegen Art. 7 Abs. 1 und 2 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 7 (post-consumer recyclate only)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    'prod-packaging-recyclability': {
        DE: { source: 'EU PPWR 2025/40 Art. 6 + Annex II (grade A–C; A/B from 2038)', penalty: 'VerpackDG §66: bis zu €10.000 + Marktrücknahme', penaltyMaxEur: 10000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 10000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 2 (Inverkehrbringen entgegen Art. 6 Abs. 1 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 6 + Annex II (grade A–C; A/B from 2038)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 100000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    'prod-packaging-empty-space': {
        DE: { source: 'EU PPWR 2025/40 Art. 24 (50% cap, or 3 years after the implementing act)', penalty: 'VerpackDG §66: bis zu €10.000', penaltyMaxEur: 10000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 10000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 17 (Leerraumverhältnis nach Art. 24 Abs. 1 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 24 (50% cap, or 3 years after the implementing act)', penalty: 'national penalties under Art. 68 + withdrawal from the market', penaltyMaxEur: 75000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    'prod-packaging-format-bans': {
        DE: { source: 'EU PPWR 2025/40 Art. 25 + Annex V', penalty: 'VerpackDG §66: bis zu €10.000; Format nicht mehr verkehrsfähig', penaltyMaxEur: 10000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 10000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 18 (Inverkehrbringen entgegen Art. 25 Abs. 1 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 25 + Annex V', penalty: 'format may no longer be placed on the market', penaltyMaxEur: 75000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    'prod-packaging-reuse-targets': {
        DE: { source: 'EU PPWR 2025/40 Art. 29 (40% transport / 10% grouped; cardboard exempt)', penalty: 'VerpackDG §66: bis zu €200.000 — höchste Stufe', penaltyMaxEur: 200000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'amount', value: 200000, currency: 'EUR', basis: 'VerpackDG § 66 Abs. 3 i.V.m. Abs. 2 Nr. 23, 25 und 26 (Wiederverwendungsquoten nach Art. 29 PPWR)', asOf: '2026-09-17' } },
        default: { source: 'EU PPWR 2025/40 Art. 29 (40% transport / 10% grouped; cardboard exempt)', penalty: 'national penalties under Art. 68', penaltyMaxEur: 50000, due: 'Ongoing', appliesFrom: '2030-01-01', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'PPWR (EU) 2025/40 Art. 68', note: 'Die Verordnung nennt keinen Betrag: nach Art. 68 Abs. 1 erlassen die Mitgliedstaaten die Sanktionen bis zum 12. Februar 2027. Für Verstöße gegen Art. 24-29 müssen Geldbußen dabei sein (Abs. 2), ohne Höhe.' } },
    },
    'prod-safety': {
        UK: { source: 'UK GPSR 2005', penalty: 'up to £20,000 + 12 months imprisonment', penaltyMaxEur: 23288, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 20000, currency: 'GBP', basis: 'SI 2005/1803 Reg. 20 Abs. 1', basisNote: 'ukIndictmentVsSummary', asOf: '2026-09-19' } },
        US: { source: 'CPSA / CPSC recall rules', penalty: '$120,000 je Verstoß, $17,150,000 je Verstoßreihe', penaltyMaxEur: 14965096, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 17150000, currency: 'USD', basis: 'CPSA § 20 Buchst. a Nr. 1 (15 U.S.C. 2069) i.d.F. der Anpassung 86 FR 68244 vom 1.12.2021, wirksam ab 1.1.2022: 120.000 je Verstoß, 17.150.000 je zusammenhängender Verstoßreihe. Die CPSC passt nur alle fünf Jahre an; die nächste Bekanntmachung steht im Dezember 2026 an.', asOf: '2026-09-19' } },
        default: { source: 'EU GPSR 2023/988', penalty: 'up to 4% of annual turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' },
    },
    'mktg-consent': {
        DE: { source: 'UWG §7 / GDPR Art. 7', penalty: 'up to €300,000 per campaign (UWG)', penaltyMaxEur: 300000, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 300000, currency: 'EUR', basis: 'UWG § 20 Abs. 2 i.V.m. Abs. 1 Nr. 1 (unerlaubte Telefonwerbung)', asOf: '2026-09-17' } },
        TR: { source: 'ETK No. 6563 / KVKK', penalty: 'up to ₺1,000,000', penaltyMaxEur: 30000, due: 'Ongoing' },
        US: { source: 'CAN-SPAM / TCPA', penalty: 'up to $53,088 per email; $1,500 per call/text', penaltyMaxEur: 46325, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 53088, currency: 'USD', basis: '16 CFR § 1.98 Buchst. p i.V.m. Buchst. d (FTC Act § 5 Buchst. m Nr. 1 Buchst. A, 15 U.S.C. 45); CAN-SPAM § 7 Buchst. a verweist auf diese Sanktion. Stand der Inflationsanpassung: 90 FR 5581 vom 17.1.2025. Die 1.500 je Anruf aus dem TCPA sind ein zivilrechtlicher Anspruch, keine Behördenbuße.', asOf: '2026-09-19' } },
        default: { source: 'GDPR Art. 7 + ePrivacy Directive 2002/58', penalty: 'up to €20M or 4% of turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'national-pending' , penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 20000000, currency: 'EUR' }, basis: 'DSGVO Art. 83 Abs. 5 Buchst. a', asOf: '2026-09-17' } },
    },
    'mktg-health-claims': {
        default: { source: 'EU Reg. 1924/2006 (Health Claims)', penalty: 'national fines + mandatory withdrawal', penaltyMaxEur: 50000, due: 'Ongoing', scope: 'eu' },
        US: { source: 'FTC Act §5 + FTC Health Products Compliance Guidance', penalty: 'bis zu $53,088 je Verstoß + consumer redress', penaltyMaxEur: 46325, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 53088, currency: 'USD', basis: '16 CFR § 1.98 Buchst. e (FTC Act § 5 Buchst. m Nr. 1 Buchst. B, 15 U.S.C. 45), Stand 90 FR 5581 vom 17.1.2025. Die Rückerstattung an Verbraucher nach § 19 kommt hinzu und kennt keine Obergrenze.', asOf: '2026-09-19' } },
    },
    'data-privacy': {
        UK: { source: 'UK GDPR / DPA 2018 Art. 13', penalty: 'up to £17.5M or 4% of turnover', penaltyMaxEur: 20377271, due: 'Ongoing', penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 17500000, currency: 'GBP' }, basis: 'UK-DSGVO Art. 83 Abs. 5 Buchst. b (Art. 12 bis 21) i.V.m. DPA 2018 s. 157 Abs. 5 Buchst. a — der höhere der beiden Werte', asOf: '2026-09-19' } },
        US: { source: 'CCPA/CPRA + state privacy acts', penalty: '$2,500–$7,500 per violation', penaltyMaxEur: 50000, due: 'Ongoing', penaltyCeiling: { kind: 'subnational', level: 'statesWithPrivacyActs', basis: 'Cal. Civ. Code § 1798.155 (CCPA/CPRA) und die Parallelgesetze der übrigen Staaten', note: 'Es gibt kein allgemeines Bundesdatenschutzgesetz; jeder Staat mit eigenem Gesetz setzt eigene Sätze. Die geführten stehen in `states`. New York fällt aus der Reihe: es hat KEIN umfassendes Datenschutzgesetz. Der SHIELD Act regelt die Datensicherheit und verweist für die Buße zwei Stufen weiter ins allgemeine Lauterkeitsrecht.' }, states: {
            CA: { source: 'CCPA/CPRA, Cal. Civ. Code § 1798.155', penaltyCeiling: { kind: 'amount', value: 7500, currency: 'USD', basis: 'Cal. Civ. Code § 1798.155 Buchst. a — 2.500 USD je Verstoß, 7.500 USD je vorsätzlichem Verstoß oder bei Daten Minderjähriger unter 16. Nur der Sockel: nach § 1798.199.95 Buchst. d passt die California Privacy Protection Agency die Beträge zum 1. Januar jedes ungeraden Jahres an den Verbraucherpreisindex an und veröffentlicht die geltenden Werte selbst; im Gesetzestext stehen sie nicht. Nächste Anpassung 1.1.2027.', asOf: '2026-09-19' } },
            FL: { source: 'Florida Digital Bill of Rights, Fla. Stat. § 501.72', penaltyCeiling: { kind: 'amount', value: 150000, currency: 'USD', basis: 'Fla. Stat. § 501.72 Abs. 1 — 50.000 USD je Verstoß, verdreifacht bei Daten eines bekannten Kindes, bei Missachtung einer bestätigten Löschanfrage und bei fortgesetztem Verkauf nach Widerspruch. Ein Verstoß ist zugleich unfair and deceptive trade practice nach Teil II des Kapitels; durchsetzungsbefugt ist allein das Department of Legal Affairs.', asOf: '2026-09-19' } },
            NY: { source: 'SHIELD Act, N.Y. Gen. Bus. Law § 899-bb', penaltyCeiling: { kind: 'amount', value: 5000, currency: 'USD', basis: 'N.Y. Gen. Bus. Law § 899-bb Abs. 2 Buchst. d i.V.m. § 349 und § 350-d Buchst. a', basisNote: 'nyShieldChain', asOf: '2026-09-19' } },
            TX: { source: 'Texas Data Privacy and Security Act, Tex. Bus. & Com. Code § 541.155', penaltyCeiling: { kind: 'amount', value: 7500, currency: 'USD', basis: 'Tex. Bus. & Com. Code § 541.155 Buchst. a — 7.500 USD je Verstoß. Anders als Kalifornien und Florida kennt Texas keine Staffelung: EIN Satz, aber erst NACH der Heilungsfrist des § 541.154 oder bei Bruch einer ihm gegenüber abgegebenen schriftlichen Zusage. Durchsetzung allein durch den Attorney General (§ 541.151), ein privates Klagerecht besteht nicht (§ 541.156).', basisNote: 'txCurePeriod', asOf: '2026-09-19' } },
        } },
        TR: { source: 'KVKK No. 6698 Art. 10', penalty: 'up to ₺13,000,000', penaltyMaxEur: 380000, due: 'Ongoing' },
        default: { source: 'GDPR Art. 13 / Art. 6', penalty: 'up to €20M or 4% of turnover', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'eu' , penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 20000000, currency: 'EUR' }, basis: 'DSGVO Art. 83 Abs. 5 Buchst. a und b', asOf: '2026-09-17' } },
    },
    'data-hosting': {
        default: { source: 'GDPR Chapter V (transfers) + SCCs', penalty: 'transfer suspension + GDPR fines', penaltyMaxEur: 50000, due: 'One-off', dueDays: 90, scope: 'eu' , penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 20000000, currency: 'EUR' }, basis: 'DSGVO Art. 83 Abs. 5 Buchst. c', asOf: '2026-09-17' } },
        US: { source: 'EU-US Data Privacy Framework', penalty: 'Streichung von der Liste; Wegfall der Uebermittlungsgrundlage', penaltyMaxEur: 30000, due: 'Annual', dueDays: 180, penaltyCeiling: { kind: 'none', basis: 'Durchführungsbeschluss (EU) 2023/1795 EG 61 und 72 sowie Anhang I Abschnitt 7 Buchst. a', note: 'Der Rahmen selbst sieht keine Geldbuße vor: die Grundsätze verlangen in Anhang I Abschnitt 7 nur "hinreichend strenge" Sanktionen, ohne einen Betrag zu nennen. Die Folge eines Verstoßes ist die Streichung von der Datenschutzrahmen-Liste nach 30-tägiger Anhörung und damit der Wegfall der Uebermittlungsgrundlage (EG 72). Eine Geldbuße entsteht erst eine Stufe später: die FTC erwirkt zunächst eine Anordnung, und erst deren Missachtung kostet Geld (EG 61) — dann nach FTC Act § 5 Buchst. l je Verstoß, bei Luftverkehrsgesellschaften nach 49 U.S.C. § 41712 mit 37.377 USD.' } },
    },
    'corp-registration': {
        DE: { source: 'HGB §29 / GewO §14', penalty: 'coercive fines up to €5,000', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 5000, currency: 'EUR', basis: 'HGB § 14 Satz 2 (einzelnes Zwangsgeld)', asOf: '2026-09-17' } },
        UK: { source: 'Companies Act 2006 §9', penalty: 'late-filing penalties up to £15,000', penaltyMaxEur: 17466, due: 'One-off', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 15000, currency: 'GBP', basis: 'Companies Act 2006 s. 453 i.V.m. SI 2008/497 Reg. 4 Abs. 2', basisNote: 'ukLateFilingTiers', asOf: '2026-09-19' } },
        FR: {
            source: 'Code de commerce Art. L123 (RCS / Guichet unique)',
            penalty: 'amende pénale (fausses déclarations) + injonction sous astreinte',
            penaltyMaxEur: 22500,
            due: 'One-off',
            dueDays: 30,
            // Vorsicht bei der Zuordnung: Art. L123-5 bestraft die FALSCHE
            // Angabe in boesem Glauben, nicht die unterlassene Eintragung.
            // Letztere laeuft ueber Art. L123-5-1 — Anordnung unter Zwangsgeld,
            // ohne Betragsobergrenze. Die 4.500 EUR im Text gelten fuer
            // natuerliche Personen; Code penal Art. 131-38 verfuenffacht sie
            // fuer juristische („le quintuple“).
            penaltyCeiling: {
                kind: 'amount',
                value: 22500,
                statutoryValue: 4500,
                currency: 'EUR',
                basis: 'Code de commerce Art. L123-5 i.V.m. Code pénal Art. 131-38', basisNote: 'frQuintuple4500',
                asOf: '2012-03-24',
            },
        },
        IT: { source: 'Registro delle Imprese (CCIAA), Art. 2196 c.c.', penalty: 'sanzioni EUR 103 bis 1.032', penaltyMaxEur: 1032, due: 'One-off', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 1032, currency: 'EUR', basis: 'Codice civile Art. 2630 Abs. 1 (unterlassene Anmeldung zum Handelsregister); innerhalb von 30 Tagen nachgeholt auf ein Drittel ermäßigt, bei unterlassener Bilanzhinterlegung um ein Drittel erhöht', asOf: '2026-09-19' } },
        ES: { source: 'Registro Mercantil (RRM)', penalty: 'multas + cierre registral', penaltyMaxEur: 300000, due: 'One-off', dueDays: 30, penaltyCeiling: { kind: 'amount', value: 300000, currency: 'EUR', basis: 'RDLeg 1/2010 (LSC) Art. 283 Abs. 1', basisNote: 'itAccountsTiers', asOf: '2026-09-17' } },
        NL: { source: 'Handelsregisterwet (KVK-inschrijving)', penalty: 'boete + niet-inschrijving', penaltyMaxEur: 27500, due: 'One-off', dueDays: 8, penaltyCeiling: { kind: 'amount', value: 27500, currency: 'EUR', basis: 'WED Art. 6 Abs. 1 Nr. 5 i.V.m. Art. 1 Nr. 4 und Sr Art. 23 Abs. 4', basisNote: 'nlFourthCategory', asOf: '2026-09-17' } },
        US: { source: 'State incorporation + foreign qualification', penalty: 'loss of good standing + back fees', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30, penaltyCeiling: { kind: 'subnational', level: 'states50AndDc', basis: 'Gesellschaftsrecht der Einzelstaaten, z.B. Del. Code tit. 8 § 502 Buchst. c', note: 'Die Gründung und die Registrierung einer auswärtigen Gesellschaft sind Landesrecht; der Bund kennt dafür keine Vorschrift. Die Folge ist zudem meist nicht eine Buße, sondern der Verlust des good standing und die Nachzahlung rückständiger Gebühren.' } },
        default: { source: 'National commercial register act', penalty: 'administrative fines', penaltyMaxEur: 5000, due: 'One-off', dueDays: 30, scope: 'placeholder' },
    },
    'monitor-kyb': {
        DE: { source: 'GwG §10 / §20 (Transparenzregister)', penalty: '€1,000–€5,000, serious cases up to €1M', penaltyMaxEur: 1000000, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 1000000, currency: 'EUR', basis: 'GwG § 56 Abs. 3 Satz 1 Nr. 1', basisNote: 'seriousRepeated', asOf: '2026-09-17' } },
        FR: {
            source: 'Code monétaire et financier Art. L561-46 (RBE)',
            penalty: 'amende pénale de 200.000 € (personnes physiques), x5 pour les personnes morales',
            penaltyMaxEur: 1000000,
            due: 'Ongoing',
            // Die alte Fundstelle nannte AMF/ACPR. Das ist die falsche Ebene:
            // jene Sanktionen treffen die personnes assujetties — Banken,
            // Notare —, nicht das meldepflichtige Unternehmen. Fuer dieses
            // gilt die RBE-Meldung nach Art. L561-46, sanktioniert in
            // Art. L574-5. Derselbe Ebenenfehler wie zuvor bei Italien.
            penaltyCeiling: {
                kind: 'amount',
                value: 1000000,
                statutoryValue: 200000,
                currency: 'EUR',
                basis: 'Code monétaire et financier Art. L574-5 i.V.m. Code pénal Art. 131-38', basisNote: 'frQuintuple200k',
                asOf: '2026-05-28',
            },
        },
        IT: { source: 'D.Lgs. 231/2007 (antiriciclaggio, Registro TE)', penalty: 'sanzioni EUR 103 bis 1.032', penaltyMaxEur: 1032, due: 'Ongoing', penaltyCeiling: { kind: 'amount', value: 1032, currency: 'EUR', basis: 'D.Lgs. 231/2007 Art. 21 Abs. 1 Satz 2 — verweist für die unterlassene Mitteilung des wirtschaftlich Berechtigten auf Codice civile Art. 2630. Die Sätze von 2.000 bis 1 Mio. EUR aus Art. 56 und 62 gelten nur für soggetti obbligati (Banken, Berufsträger), nicht für die meldende Gesellschaft selbst.', asOf: '2026-09-19' } },
        default: { source: 'EU AMLD5 (2018/843)', penalty: 'national AML fines', penaltyMaxEur: 100000, due: 'Ongoing', scope: 'national-pending' },
    },
    'log-eori': {
        UK: { source: 'UK EORI (HMRC, post-Brexit)', penalty: 'goods held at border; storage costs', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14, penaltyCeiling: { kind: 'none', basis: 'FA 2003 s. 26 i.V.m. SI 2003/3113 Reg. 3 und Anhang', note: 'Der Anhang zählt die bußgeldbewehrten Zollpflichten abschließend auf (Spalte 3: 1.000 oder 2.500 GBP je Zuwiderhandlung). Eine fehlende EORI-Nummer steht nicht darunter. Die Folge ist operativ: die Ware wird nicht abgefertigt, es entstehen Lager- und Standgelder — keine Geldbuße, die man zitieren könnte.' } },
        TR: { source: 'Gümrük Kanunu No. 4458', penalty: 'clearance refusal + customs fines', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14 },
        default: { source: 'UCC Reg. 952/2013 Art. 9', penalty: 'customs clearance blocked', penaltyMaxEur: 10000, due: 'One-off', dueDays: 14, scope: 'eu' },
    },
    'log-customs-classification': {
        US: { source: '19 U.S.C. §1592 (CBP)', penalty: 'up to the domestic value of the goods', penaltyMaxEur: 60000, due: 'Ongoing', penaltyCeiling: { kind: 'proportional', percent: 100, of: 'domesticValue', basis: '19 CFR § 162.73 Buchst. a Nr. 1; bei grober Fahrlässigkeit das Geringere aus Inlandswert und dem Vierfachen des Abgabenausfalls, bei einfacher Fahrlässigkeit dem Zweifachen', basisNote: 'deliberateNoDisclosure', asOf: '2026-09-19' } },
        default: { source: 'UCC Reg. 952/2013 + Combined Nomenclature', penalty: 'back duties + up to 3× duty difference', penaltyMaxEur: 30000, due: 'Ongoing', scope: 'eu' },
    },
    'log-intrastat': {
        DE: { source: 'Intrastat (EBS Reg. 2019/2152), threshold €500k arrivals', penalty: 'up to €5,000 per missed report', penaltyMaxEur: 50000, due: 'Monthly', dueDays: 20, penaltyCeiling: { kind: 'amount', value: 50000, currency: 'EUR', basis: 'AHStatG § 19 (verdrängt BStatG § 23 Abs. 3)', asOf: '2026-09-17' } },
        IT: { source: 'Intrastat (Agenzia Dogane), modelli INTRA', penalty: 'sanzioni EUR 500 bis 1.000 je Liste', penaltyMaxEur: 1000, due: 'Monthly', dueDays: 25, penaltyCeiling: { kind: 'amount', value: 1000, currency: 'EUR', basis: 'Testo unico delle sanzioni tributarie (D.Lgs. 173/2024) Art. 36 Abs. 7 — je Liste; auf die Hälfte ermäßigt bei Vorlage binnen 30 Tagen nach Aufforderung', asOf: '2026-09-19' } },
        ES: { source: 'Intrastat (AEAT), umbral €400k', penalty: 'multas estadísticas hasta €30.000', penaltyMaxEur: 30050.61, due: 'Monthly', dueDays: 12, penaltyCeiling: { kind: 'amount', value: 30050.61, currency: 'EUR', basis: 'Ley 12/1989 Art. 51 Abs. 1', basisNote: 'esPesetaLegacy', asOf: '2026-09-17' } },
        NL: { source: 'Intrastat (CBS aangifte)', penalty: 'bestuurlijke boetes CBS', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 10, penaltyCeiling: { kind: 'amount', value: 5000, currency: 'EUR', basis: 'Wet op het CBS Art. 43 Abs. 2 i.V.m. Art. 38b (Intrastat-Meldung)', asOf: '2026-09-17' } },
        default: { source: 'EBS Reg. 2019/2152 (Intrastat)', penalty: 'national statistical fines', penaltyMaxEur: 5000, due: 'Monthly', dueDays: 20, scope: 'eu' },
    },
    // ─── Umwelt ──────────────────────────────────────────────────────────────
    // Alle drei Rechtsakte delegieren die Sanktion an die Mitgliedstaaten. Es
    // GIBT dort keinen Betrag zu zitieren, deshalb 'delegated' und kein
    // penaltyMaxEur — nach derselben Regel, die bei PPWR Art. 68 gilt.
    'env-weee-registration': {
        DE: { source: 'ElektroG §6 (stiftung ear)', penalty: 'up to €100,000 + distribution ban', penaltyMaxEur: 100000, due: 'Annual', dueDays: 60, penaltyCeiling: { kind: 'amount', value: 100000, currency: 'EUR', basis: 'ElektroG §45 Abs. 2', asOf: '2026-09-18' } },
        default: { source: 'WEEE Directive 2012/19/EU Art. 16(2)', penalty: 'national penalties; registration is a market-access condition', due: 'Annual', dueDays: 60, scope: 'national-pending', penaltyCeiling: { kind: 'delegated', basis: 'WEEE-Richtlinie 2012/19/EU Art. 22', note: 'Die Richtlinie nennt keinen Betrag: nach Art. 22 legen die Mitgliedstaaten die Sanktionen fest, sie müssen wirksam, verhältnismäßig und abschreckend sein. Als Richtlinie gilt sie ohnehin nur über das nationale Umsetzungsgesetz.' } },
    },
    'env-batteries-epr': {
        default: { source: 'EU Batteries Regulation 2023/1542 Art. 56 (EPR)', penalty: 'national penalties; registration is a market-access condition', due: 'Annual', dueDays: 60, scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'Batterieverordnung (EU) 2023/1542 Art. 93', note: 'Die Verordnung nennt keinen Betrag: nach Art. 93 erlassen die Mitgliedstaaten die Sanktionsvorschriften. Die Verordnung selbst gilt unmittelbar, die Sanktion nicht.' } },
    },
    'env-reach-substances': {
        default: { source: 'REACH Regulation (EC) 1907/2006 Art. 33 (SVHC information duty)', penalty: 'national penalties up to a market ban', due: 'Ongoing', scope: 'eu', penaltyCeiling: { kind: 'delegated', basis: 'REACH-Verordnung (EG) 1907/2006 Art. 126', note: 'Die Verordnung nennt keinen Betrag: nach Art. 126 legen die Mitgliedstaaten die Sanktionen fest und teilen sie der Kommission mit.' } },
    },
    'legal-consumer-terms': {
        DE: { source: 'BGB §312g / EGBGB Art. 246a', penalty: 'competitor warnings (Abmahnung) + injunctions', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45, penaltyCeiling: { kind: 'turnover', percent: 4, basis: 'UWG § 19 Abs. 2 Satz 3 i.V.m. § 5c Abs. 1', basisNote: 'widespreadOnly', asOf: '2026-09-17' } },
        UK: { source: 'Consumer Rights Act 2015', penalty: 'CMA: £300k oder 10% des Umsatzes', penaltyMaxEur: 349325, due: 'One-off', dueDays: 45, penaltyCeiling: { kind: 'turnover', percent: 10, orAmount: { value: 300000, currency: 'GBP' }, basis: 'DMCCA 2024 s. 182 Abs. 6 (Final infringement notice der CMA) i.V.m. Sch. 16 (CRA 2015 Teil 1 und 2 als relevant infringement; in Kraft 6.4.2025, SI 2025/272) — der höhere der beiden Werte', asOf: '2026-09-19' } },
        FR: {
            source: 'Code de la consommation Art. L221 (droit de rétractation)',
            penalty: 'amende administrative jusqu’à 75.000 € (personnes morales)',
            penaltyMaxEur: 75000,
            due: 'One-off',
            dueDays: 45,
            // Art. L242-13 ist der Sanktionsartikel ZUM Ruecktrittsrecht: er
            // verweist genau auf L221-18, L221-21 und L221-23 bis L221-27.
            // Die 15.000 EUR, die wir fuehrten, sind der Satz fuer natuerliche
            // Personen — fuer ein Unternehmen gilt das Fuenffache.
            penaltyCeiling: {
                kind: 'amount',
                value: 75000,
                currency: 'EUR',
                basis: 'Code de la consommation Art. L242-13', basisNote: 'frTwoRates75k',
                asOf: '2022-05-28',
            },
        },
        IT: { source: 'Codice del Consumo D.Lgs. 206/2005', penalty: 'AGCM: EUR 5.000 bis 10.000.000; Klauseln nichtig', penaltyMaxEur: 10000000, due: 'One-off', dueDays: 45, penaltyCeiling: { kind: 'amount', value: 10000000, currency: 'EUR', basis: 'Codice del Consumo Art. 37-bis Abs. 1 Satz 2 — für Feststellung und Sanktion missbräuchlicher Klauseln gilt Art. 27; dessen Abs. 9 nennt 5.000 bis 10.000.000 EUR', asOf: '2026-09-19' } },
        ES: { source: 'RDL 1/2007 (Ley General Consumidores)', penalty: 'sanciones de consumo + cláusulas nulas', penaltyMaxEur: 1000000, due: 'One-off', dueDays: 45, penaltyCeiling: { kind: 'amount', value: 1000000, currency: 'EUR', basis: 'RDL 1/2007 Art. 49 Abs. 1 Buchst. c', basisNote: 'esGainMultiple', asOf: '2026-09-17' } },
        default: { source: 'Consumer Rights Directive 2011/83/EU', penalty: 'national enforcement + void clauses', penaltyMaxEur: 15000, due: 'One-off', dueDays: 45, scope: 'national-pending' },
    },
    'legal-commercial-contracts': {
        DE: { source: 'BGB/HGB + Rom-I-VO 593/2008', penalty: 'unwirksame Klauseln; Prozessrisiko', penaltyMaxEur: 10000, due: 'One-off', dueDays: 60, penaltyCeiling: { kind: 'none', basis: 'BGB §§ 305 ff. / Rom-I-VO (EG) 593/2008', note: 'Keine Geldbuße vorgesehen. Die Folge ist zivilrechtlich: unwirksame Klausel, Prozess- und Vollstreckungsrisiko. Eine Eurozahl hat hier keine gesetzliche Entsprechung.' } },
        default: { source: 'Rome I Reg. 593/2008', penalty: 'unenforceable clauses; dispute exposure', penaltyMaxEur: 10000, due: 'One-off', dueDays: 60, scope: 'national-pending' },
    },
};

/** Resolve the enrichment for a subdomain: first requested country with an
 *  override wins, otherwise the 'default' entry. Returns null when a subdomain
 *  has no editorial data yet (callers should degrade gracefully). */
export function resolveEnrichment(
    subdomainId: string,
    countries: CountryCode[],
): ObligationEnrichment | null {
    const entry = ObligationEnrichmentMap[subdomainId];
    if (!entry) return null;
    for (const c of countries) {
        const hit = entry[c];
        if (hit) return hit;
    }
    return entry.default ?? null;
}
