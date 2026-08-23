# Marktseite — Bauplan

Canvas: https://claude.ai/code/artifact/3b6e8234-b4f4-4781-ae0d-bcd028c81b18
Route: `/:locale/markets/:code` (existiert, `MarketsPage.tsx` → `MarketPage`)

## Die Arbeitsteilung

Alles andere folgt hieraus:

> **Die Bereichsseite ist der Ort, an dem eine Pflicht erklärt wird.
> Die Marktseite ist der Ort, an dem ein Markt geplant wird.**

Eine Pflicht *gehört* zu einem Bereich, nicht zu einem Markt — VerpackG §9 ist
EPR, aus welcher Richtung man auch kommt. Faktenraster, Rechtsgrundlage,
Bußgeldrahmen und Staffelung stehen deshalb auf der Bereichsseite und **nur**
dort. Die Marktseite trägt, was keine Bereichsseite je zusammenstellen kann:
die Zusammenschau über Bereiche hinweg.

### Warum das nötig war

Die erste Fassung spiegelte die Bereichsseite Section für Section. Ergebnis:
6 von 11 Sections waren dasselbe Möbel, und der einzige sichtbare Unterschied
war die H1. Der Grund liegt im Datenmodell — es ist **eine Quelle, zweimal
geschnitten**:

| | Bereichsseite | Marktseite |
|---|---|---|
| `CountryRiskMatrix` | eine **Spalte** (ein Bereich, 8 Märkte) | eine **Zeile** (ein Markt, 8 Bereiche) |
| `ObligationEnrichmentMap` | Zeilenschnitt (Pflichten *eines* Bereichs) | Spaltenschnitt (Pflichten *eines* Landes) |

Erschwerend: die Bereichsseite hat bereits einen Länderwähler. Die
Marktdimension ist dort also schon vorhanden. Eine Marktseite rechtfertigt sich
nur über das, was ein einzelner Bereich strukturell nicht zeigen kann.

## Sections — sechs, nicht elf

### 01 · Wechsler — 56px, sticky
= `AreaSwitcher`, Achsen getauscht. Links „Alle Märkte" + Markt-Dropdown,
rechts Bereichsfilter.

### 02 · Hero
Links: Eyebrow, H1 = Marktname, Lead, **Pillenzeile** mit den vier Marktzahlen
(Pflichten · Bereiche n von 8 · Exposition · Tage bis zur nächsten Frist),
zwei CTAs, Quellenzusage.

**Bewusst kein Kennzahlenband.** Das Band ist die Signatur der Bereichsseite;
ein zweites davon war der stärkste Grund, warum beide Seiten gleich aussahen.
Dieselben Zahlen, andere Form.

Rechts die **Marktprofil-Karte**, 340px:

| Element | Datenquelle |
|---|---|
| Große Zahl | `enforcementIntensity`, Farbe über `severityFromRiskWeight` |
| Balken 1 | `strictnessScore` / 10 |
| Balken 2 | `byDomain.length` / 8 |
| Fußchart | alle 8 Märkte nach Vollzug, eigener hervorgehoben |

### 03 · Gewichtung — das Rückgrat
= `AreaMarketHeatmap`, transponiert. 8 Zeilen: Bereich / Balken / Gewicht /
Pflichtenzahl **oder** „EU-Quelle" / Pfeil.

**Jede Zeile ist ein Link auf die Bereichsseite.** Hier endet die Marktseite
und die Bereichsseite übernimmt — die Stelle, an der die Arbeitsteilung
sichtbar wird.

Die rechte Spalte ersetzt das Severity-Wort der Bereichsseite: dort beantwortet
sie „ist 7 von 10 hier hoch", hier „führen wir dafür überhaupt etwas".

Daten: `profile.weights` + `profile.byDomain`.

### 04 · Kalender — das Herzstück, existiert nur hier
Alle Pflichten dieses Marktes über **alle** Bereiche, gruppiert nach **Turnus**
und sortiert danach, wie oft der Kalender klingelt: Monatlich, Vierteljährlich,
Jährlich, Laufend, Einmalig.

Je Eintrag: Bereichs-Chip, Name, Quelle, Vorlauf. Die häufigste Spalte ist
petrol hinterlegt — dort liegt die operative Last. Eine Turnus-Gruppe ohne
Pflichten wird nicht gerendert.

**Keine Detailkarten, kein Faktenraster** — eine Pflicht wird auf ihrer
Bereichsseite erklärt.

Darunter eine Zeile mit höchstem Einzelbußgeld und Summe. Das ersetzt das
gesamte Durchsetzungsband: zwei Zahlen sind keine Section.

Daten: `profile.obligations`, gruppiert nach `due`.

### 05 · Deckung — bedingt, existiert nur hier

Was die Engine für diesen Markt **nicht** lokal führt — und nur, wo das
tatsächlich eine Lücke ist.

**Auf der deutschen Seite fehlt diese Section, und das ist richtig.**
Deutschland hat null echte Lücken. Was der erste Entwurf hier zeigte — Daten &
Datenschutz, Produkt-Compliance — sind DSGVO und GPSR: Verordnungen, die
unmittelbar gelten. Es gibt keinen deutschen Text zu führen; das **ist** die
geltende Norm. Sie als Lücke auszuweisen hieß, das Recht als Loch in unseren
Daten auszugeben.

Wie sie aussieht, wenn sie greift: eigenes Artboard, Türkei (4 von 4).

Zwei Kartenarten, weil es zwei Fälle sind:

| `kind` | Karte sagt | Quelle |
|---|---|---|
| `placeholder` | „Keine Quelle" | keine — es wird auch keine gezeigt |
| `national-pending` | „EU-Quelle steht ein" | die EU-Norm, benannt |

Daten: `getMarketProfile(code).gaps` — enthält `scope: 'eu'`-Einträge per
Konstruktion nicht. Section fällt komplett weg bei `gaps.length === 0`.

Gemessen, über alle acht Märkte: DE 0 · UK 1 · FR 1 · IT 1 · ES 1 · NL 1 ·
US 2 · TR 4.

### 06 · Weiter — andere Märkte
= `RelatedAreas`, transponiert. Drei Karten mit Glyph 56px, Risiko-Pille,
Marktname, abgeleitetem Satz, „Markt öffnen". Auswahl: größte
Pflichten-Überschneidung.

### 07 · Abschluss — dunkel
= `HowOrchestrationWorks tone="inverse"` + Haarlinie + CTA-Zeile.

Identisch mit der Bereichsseite, und das ist Absicht: der Abschluss ist der
Funnel, nicht der Seiteninhalt. Zwei Seitentypen dürfen sich einen Ausgang
teilen — sie dürfen sich nur nicht den Inhalt teilen.

## Was bewusst fehlt

| Weggelassen | Grund |
|---|---|
| Kennzahlenband | 3 von 4 Kacheln waren dieselbe Aussage; Zahlen leben als Pillen im Hero |
| Pflichten-Explorer | das Faktenraster einer Pflicht gehört auf die Bereichsseite |
| Durchsetzungsband | höchstes Bußgeld und Summe sind zwei Zahlen unter dem Kalender |
| Zeitachse | im Kalender aufgegangen |
| Goldband „Frage stellen" | der Hero hat den Button; Gold bleibt Zeichen der Bereichsseite |

## Datenlage — gemessen

| Markt | Pflichten | Exposition | Höchstes Einzelbußgeld | Vollzug | Strenge | Bereiche | Kürzeste Frist |
|---|---|---|---|---|---|---|---|
| DE | 9 | 720.000 € | 300.000 € · UWG §7 / GDPR Art. 7 | 9 | 9 | 6/8 | 20 T |
| US | 9 | 428.000 € | 110.000 € · CPSA / CPSC | 7 | 6 | 6/8 | 20 T |
| UK | 8 | 227.700 € | 100.000 € · UK GDPR / DPA 2018 | 8 | 7 | 7/8 | 14 T |
| IT | 7 | 253.000 € | 120.000 € · D.Lgs. 231/2007 | 7 | 7 | 5/8 | 25 T |
| FR | 6 | 201.500 € | 120.000 € · Code monétaire L. | 8 | 8 | 4/8 | 24 T |
| ES | 6 | 176.000 € | 100.000 € · RD 1055/2022 | 7 | 7 | 5/8 | 12 T |
| NL | 5 | 52.014 € | 25.000 € · Besluit beheer verpakkingen | 7 | 7 | 4/8 | 8 T |
| TR | 4 | 435.000 € | 380.000 € · KVKK Art. 10 | 6 | 6 | 4/8 | 14 T |

Der Canvas zeichnet Deutschland. Beim Bau nichts hart verdrahten — alles kommt
aus `getMarketProfile(code)`.

### Zwei Lücken im Datenmodell, vor dem Bau zu schließen

1. `MarketObligation` lässt `penalty` / `penaltyMaxEur` fallen, obwohl die
   Enrichment-Map beides pro Land führt. Ohne sie gibt es weder die
   Expositions-Pille noch die Zeile unter dem Kalender. → durchreichen, wie es
   bei `celex` auf der Bereichsseite geschehen ist.
2. `MarketObligation` führt kein `severity`. → `SUBDOMAIN_META[...].riskWeight`
   durch `severityFromRiskWeight` schicken.

`gaps` ist bereits erledigt: `getMarketProfile(code).gaps` liefert die
Deckungslücken, und `ObligationEnrichment.scope` unterscheidet seit dem
Scope-Commit Verordnung / nationale Fassung fehlt / Platzhalter.

## Abweichungen vom Canvas — bewusst

| Canvas | Implementierung | Grund |
|---|---|---|
| Radius 14/16px | `rounded-xl` = 10px | Kartendoktrin #73; `designSystem.guard.test.ts` bricht sonst |
| H2 30px | `text-h2` = 24px | 30px ist keine Stufe der Typo-Skala |

## Fallen dieser Config — jedes Mal messen

Die Spacing-Skala in `tailwind.config.js` ist **nicht** die Standard-Skala:

```
px-10 = 64px   (nicht 40)
mt-12 = 96px   (nicht 48)
h-12  = 96px   (nicht 48)
```

Drei Fehler auf den Bereichsseiten gingen darauf zurück. Vor jedem
Canvas-Wert-Übertrag den berechneten Wert im Browser nachmessen.

Weiter:
- `cn()` verschluckt Config-Aliase, die tailwind-merge nicht kennt — neue
  Aliase in `extendTailwindMerge` (`src/lib/utils.ts`) eintragen.
- Alle Reveals über `useInViewOnce` — jeder Pfad endet auf `true`.
- Zahlen immer `tabular-nums`.
- Container `size="xl"` = 1200px Kappe, `lg:px-20` = 80px Rand.

## Hub-Seite

`/:locale/markets` ist bereits ein Hub (`MarketsIndexPage`), aber dünn. Nach
den Unterseiten anzugleichen: Kartenraster wie `ComplianceAreasPage`, je Karte
Marktname, Vollzugs-Pille, Pflichtenzahl, abgedeckte Bereiche. Keine
erfundenen Zahlen — dieselbe Regel, die `specialistsCount` gekostet hat.
