import { describe, expect, it } from 'vitest';
import { FX_STAND, ObligationEnrichmentMap, type PenaltyCeiling } from '@complihub/compliance-engine';
import { ceilingBasis, ceilingInEuro, describeCeiling, provenance } from './penaltyCeiling';

// Die Anzeige der belegten Obergrenze. Der Punkt dieser Tests ist NICHT, dass
// Intl richtig formatiert — das tut es. Es geht darum, dass keine der acht
// Formen stumm zu einer anderen wird: eine anteilige Sanktion darf nicht als
// Betrag erscheinen, ein Betrag je Einheit nicht als Obergrenze.
describe('Obergrenze anzeigen', () => {
  const L = 'de-DE';

  it('nennt jede der acht Formen bei ihrer eigenen', () => {
    const faelle: [PenaltyCeiling, string][] = [
      [{ kind: 'amount', value: 7500, currency: 'USD', basis: 'x 1', asOf: '2026-01-01' }, 'amount'],
      [{ kind: 'turnover', percent: 4, basis: 'x 1', asOf: '2026-01-01' }, 'turnover'],
      [{ kind: 'delegated', basis: 'x 1', note: 'n' }, 'delegated'],
      [{ kind: 'none', basis: 'x 1', note: 'n' }, 'none'],
      [{ kind: 'proportional', percent: 80, of: 'Steuer', basis: 'x 1', asOf: '2026-01-01' }, 'proportional'],
      [{ kind: 'unlimited', basis: 'x 1', note: 'n' }, 'unlimited'],
      [{ kind: 'subnational', level: 'Staaten', basis: 'x 1', note: 'n' }, 'subnational'],
      [{ kind: 'perUnit', value: 7500, currency: 'EUR', per: 'Tonne', basis: 'x 1', asOf: '2026-01-01' }, 'perUnit'],
    ];
    for (const [c, form] of faelle) {
      expect(describeCeiling(c, L).form, `${c.kind} wird als ${form} angezeigt`).toBe(form);
    }
    // Faellt eine Form dazu und niemand denkt an die Anzeige, muss das hier
    // auffallen — nicht erst in der Oberflaeche.
    expect(faelle.length, 'Neue Form? Dann auch hier eintragen.').toBe(8);
  });

  it('haelt den Betrag in SEINER Waehrung, nicht in Euro', () => {
    const d = describeCeiling(
      { kind: 'amount', value: 15000, currency: 'GBP', basis: 'Companies Act 2006 s. 453', asOf: '2026-09-19' },
      L,
    );
    expect(d).toMatchObject({ form: 'amount' });
    if (d.form !== 'amount') throw new Error('Form');
    expect(d.amount, 'Die Waehrung des Gesetzes muss dranstehen').toMatch(/£|GBP/);
    expect(d.amount).not.toMatch(/€/);
  });

  it('trennt den Betrag je Einheit vom Betrag', () => {
    const d = describeCeiling(
      { kind: 'perUnit', value: 7500, currency: 'EUR', per: 'Einheit oder Tonne', basis: 'L541-9-5', asOf: '2021-08-25' },
      L,
    );
    if (d.form !== 'perUnit') throw new Error('Form');
    // Ohne die Bezugseinheit liest sich 7.500 EUR wie eine Obergrenze und ist
    // das genaue Gegenteil. Sie MUSS mitreisen.
    expect(d.per.length).toBeGreaterThan(5);
  });

  it('sortiert die Gliedstaaten nach Betrag, nicht alphabetisch', () => {
    const eintrag = ObligationEnrichmentMap['data-privacy']?.US;
    expect(eintrag?.penaltyCeiling?.kind).toBe('subnational');
    const d = describeCeiling(eintrag!.penaltyCeiling!, L, eintrag!.states);
    if (d.form !== 'subnational') throw new Error('Form');
    // Florida nennt das Zwanzigfache von Kalifornien. Alphabetisch sortiert
    // stuende CA oben und die Spanne — die eigentliche Aussage — verschwaende.
    expect(d.states[0]?.code, 'Der groesste Betrag gehoert nach oben').toBe('FL');
    // Alle vier gefuehrten Staaten sind seit dem 19.09. belegt. Waechst die
    // Liste der gefuehrten Staaten, faellt dieser Test — und das ist die
    // Absicht: ein neuer Staat ohne Zahl soll nicht stumm durchrutschen.
    expect(d.states.length, 'CA, FL, NY und TX sind belegt').toBe(4);
    for (const s of d.states) {
      expect(s.amount, `${s.code}: kein Betrag`).toMatch(/\d/);
      expect(s.source, `${s.code}: keine Vorschrift`).toMatch(/\d/);
    }
  });

  it('haelt jeden basisNote-Schluessel an einer Uebersetzung', async () => {
    // `basisNote` traegt einen Schluessel, keinen Satz. Ein Schluessel ohne
    // Eintrag faellt in der Oberflaeche NICHT auf: i18next gibt bei fehlendem
    // Treffer den defaultValue zurueck, und der ist hier der leere String —
    // die Zeile verschwaende lautlos. Genau deshalb prueft das ein Test und
    // nicht das Auge.
    const en = (await import('../../public/locales/en/common.json')).default as
      { compliance: { area: { ceiling: { basisNote: Record<string, string> } } } };
    const vorhanden = en.compliance.area.ceiling.basisNote;
    const benutzt = new Set<string>();
    for (const byCountry of Object.values(ObligationEnrichmentMap)) {
      for (const e of Object.values(byCountry)) {
        const n = e?.penaltyCeiling?.basisNote;
        if (n) benutzt.add(n);
        for (const st of Object.values(e?.states ?? {})) {
          if (st?.penaltyCeiling?.basisNote) benutzt.add(st.penaltyCeiling.basisNote);
        }
      }
    }
    const ohne = [...benutzt].filter((k) => !vorhanden[k]);
    expect(ohne, `basisNote ohne Uebersetzung: ${ohne.join(', ')}`).toEqual([]);

    // `of`, `per` und `level` tragen aus demselben Grund Schluessel. Ein
    // fehlender faellt hier genauso lautlos aus wie ein basisNote, nur steht
    // dann der Schluessel selbst auf dem Bildschirm ("80% of taxDue").
    const ceiling = (en.compliance.area as unknown as {
      ceiling: Record<string, Record<string, string>>;
    }).ceiling;
    for (const [feld, schluesselfeld] of [['of', 'ofKey'], ['per', 'perKey'], ['level', 'levelKey']] as const) {
      const da = ceiling[schluesselfeld] ?? {};
      const gebraucht = new Set<string>();
      for (const byCountry of Object.values(ObligationEnrichmentMap)) {
        for (const e of Object.values(byCountry)) {
          const v = (e?.penaltyCeiling as Record<string, unknown> | undefined)?.[feld];
          if (typeof v === 'string') gebraucht.add(v);
        }
      }
      const fehlt = [...gebraucht].filter((k) => !da[k]);
      expect(fehlt, `${feld}: Schluessel ohne Uebersetzung: ${fehlt.join(', ')}`).toEqual([]);
      expect(gebraucht.size, `${feld}: kein Eintrag nutzt das Feld`).toBeGreaterThan(0);
    }
    // Und andersherum: ein Schluessel, den niemand mehr benutzt, ist toter
    // Text in vier Sprachen.
    const tot = Object.keys(vorhanden).filter((k) => !benutzt.has(k));
    expect(tot, `Uebersetzt, aber nirgends benutzt: ${tot.join(', ')}`).toEqual([]);
    expect(benutzt.size, 'Kein Eintrag nutzt basisNote — Test ohne Gegenstand').toBeGreaterThan(0);
  });

  it('gibt Fundstelle und Stand heraus, wo es einen gibt', () => {
    const mit = ceilingBasis({ kind: 'amount', value: 1, currency: 'EUR', basis: 'HGB § 14', asOf: '2026-09-17' });
    expect(mit.asOf).toBe('2026-09-17');
    // `delegated` und `none` haben keinen Stand — dort gibt es nichts zu
    // datieren, und ein erfundenes Datum waere schlimmer als keines.
    const ohne = ceilingBasis({ kind: 'delegated', basis: 'PPWR Art. 68', note: 'n' });
    expect(ohne.asOf).toBeUndefined();
    expect(ohne.basis).toMatch(/\d/);
  });
});

describe('Herkunft der Eurozahl', () => {
  const L = 'de-DE';

  it('unterscheidet gesetzlich, umgerechnet, ohne Betrag und unbelegt', () => {
    expect(provenance({ penaltyMaxEur: 5000, penaltyCeiling: { kind: 'amount', value: 5000, currency: 'EUR', basis: 'b 1', asOf: '2026-01-01' } }, L).kind).toBe('statutory');
    expect(provenance({ penaltyMaxEur: 17466, penaltyCeiling: { kind: 'amount', value: 15000, currency: 'GBP', basis: 'b 1', asOf: '2026-01-01' } }, L).kind).toBe('converted');
    expect(provenance({ penaltyMaxEur: 20000, penaltyCeiling: { kind: 'proportional', percent: 80, of: 'Steuer', basis: 'b 1', asOf: '2026-01-01' } }, L).kind).toBe('noAmount');
    expect(provenance({ penaltyMaxEur: 50000 }, L).kind).toBe('unproven');
  });

  it('haelt eine Umsatz-Obergrenze MIT Betrag fuer belegt', () => {
    // Im Browser aufgefallen, nicht im Test: unter "20.000.000 EUR oder 4 %
    // des Jahresumsatzes" stand "das Gesetz nennt keinen Betrag". `turnover`
    // mit `orAmount` nennt einen — die DSGVO sagt "je nachdem, was hoeher
    // ist". Die Unterscheidung heisst im Engine-Waechter `nenntBetrag` und
    // muss hier gleich lauten.
    const dsgvo = provenance(
      { penaltyMaxEur: 100000, penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 20000000, currency: 'EUR' }, basis: 'DSGVO Art. 83 Abs. 5', asOf: '2026-09-17' } },
      L,
    );
    expect(dsgvo.kind).toBe('statutory');
    // Die UK-DSGVO fuehrt dieselbe Form mit eigener Zahl in Pfund.
    const uk = provenance(
      { penaltyMaxEur: 20377271, penaltyCeiling: { kind: 'turnover', percent: 4, orAmount: { value: 17500000, currency: 'GBP' }, basis: 'DPA 2018 s. 157', asOf: '2026-09-19' } },
      L,
    );
    expect(uk.kind).toBe('converted');
    // Ohne `orAmount` bleibt es bei "kein Betrag" — ein Prozentsatz allein
    // ist keine Zahl, die man neben eine Eurosumme stellen koennte.
    expect(provenance({ penaltyMaxEur: 1, penaltyCeiling: { kind: 'turnover', percent: 4, basis: 'b 1', asOf: '2026-01-01' } }, L).kind).toBe('noAmount');
  });

  it('nennt bei einer Umrechnung den Ausgangsbetrag und den Kursstand', () => {
    const p = provenance(
      { penaltyMaxEur: 20377271, penaltyCeiling: { kind: 'amount', value: 17500000, currency: 'GBP', basis: 'DPA 2018 s. 157', asOf: '2026-09-19' } },
      L,
    );
    if (p.kind !== 'converted') throw new Error('Herkunft');
    expect(p.from).toMatch(/17\D?500\D?000/);
    // Ohne den Kursstand ist "umgerechnet" keine Auskunft, sondern eine
    // Entschuldigung. Er muss derselbe sein, an dem der Waechter nachrechnet.
    expect(p.rateAsOf).toBe(FX_STAND);
  });

  it('rechnet die Obergrenze zur selben Eurozahl, die der Eintrag fuehrt', () => {
    // Die Probe aufs Ganze: was die Anzeige umrechnet, muss das sein, was
    // schon in `penaltyMaxEur` steht — sonst zeigte die Karte zwei Zahlen fuer
    // dieselbe Sache. Der Engine-Waechter prueft dieselbe Gleichung von der
    // anderen Seite.
    let geprueft = 0;
    for (const byCountry of Object.values(ObligationEnrichmentMap)) {
      for (const e of Object.values(byCountry)) {
        const c = e?.penaltyCeiling;
        if (!e?.penaltyMaxEur || c?.kind !== 'amount' || c.currency === 'EUR') continue;
        expect(ceilingInEuro(c), `${c.basis}: Anzeige und Eintrag gehen auseinander`).toBe(e.penaltyMaxEur);
        geprueft += 1;
      }
    }
    expect(geprueft, 'Kein Fremdwaehrungs-Eintrag mehr — Test ohne Gegenstand').toBeGreaterThan(0);
  });

  it('gibt keine Eurozahl heraus, wo das Gesetz keinen Betrag nennt', () => {
    // `unlimited` und `proportional` haben keinen Betrag. Waere hier eine 0
    // oder NaN zurueckgekommen, stuende gleich wieder eine Zahl auf der Karte,
    // die niemand belegen kann — genau der Zustand, den wir abgeraeumt haben.
    expect(ceilingInEuro({ kind: 'unlimited', basis: 'LASPO 2012 s. 85', note: 'n' })).toBeNull();
    expect(ceilingInEuro({ kind: 'proportional', percent: 80, of: 'Steuer', basis: 'CGI 1728', asOf: '2026-01-01' })).toBeNull();
  });
});
