# Marktseite — Bauplan

Canvas: https://claude.ai/code/artifact/3b6e8234-b4f4-4781-ae0d-bcd028c81b18
Arbeitsdateien: `Main.dc.html`, `Hero.dc.html`, `Mobile.dc.html`, `canvas.json`
Route: `/:locale/markets/:code` (existiert, `MarketsPage.tsx` → `MarketPage`)

Dieses Dokument ist die Referenz zwischen Canvas und Implementierung. Wenn
Canvas und Code auseinanderlaufen, gewinnt der Canvas — außer bei den unter
**Abweichungen** genannten Punkten, die bewusst und einmal begründet abweichen.

## Die Grundidee

**Die Marktseite ist die Transponierte der Bereichsseite.**

| | Bereichsseite | Marktseite |
|---|---|---|
| Frage | Diese Pflicht — über acht Märkte | Dieser Markt — über acht Bereiche |
| Achse | `AreaProfile.marketWeights` | `MarketProfile.weights` |
| Detail | Pflichten des Bereichs, je Markt | Pflichten des Marktes, je Bereich |

Daraus folgt die Bauregel: **Wo unten „= X" steht, wird die bestehende
Komponente mit anderen Daten verwendet, nicht neu gebaut.** Nur Section 08
(Deckung) hat auf der Bereichsseite kein Gegenstück.

## Datenlage — gemessen, nicht geschätzt

Alle acht Märkte, Stand der Messung:

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

Quellen: `CountryRiskMatrix` (Vollzug, Strenge, Domänengewichte) und
`ObligationEnrichmentMap[subdomain][code]` (Quelle, Bußgeld, Turnus, Vorlauf).

**Der Canvas zeichnet Deutschland.** Jede Zahl darin ist aus dieser Tabelle.
Beim Bau nichts hart verdrahten — alles kommt aus `getMarketProfile(code)`.

### Zwei Lücken im Datenmodell, vor dem Bau zu schließen

1. `MarketObligation` lässt `penalty` / `penaltyMaxEur` fallen, obwohl die
   Enrichment-Map beides pro Land führt. Ohne sie gibt es weder Kennzahl 2
   noch Section 06. → Felder in `marketProfiles.ts` durchreichen, wie es bei
   `celex` auf der Bereichsseite schon geschehen ist.
2. `MarketObligation` führt kein `severity`. Die Risiko-Pillen im Explorer
   brauchen es. → `SUBDOMAIN_META[...].riskWeight` durch
   `severityFromRiskWeight` schicken, wie `areaProfiles.ts` es tut.

## Sections

Reihenfolge und Aufbau, wie im Canvas gezeichnet.

### 01 · Wechsler — 56px, sticky
= `AreaSwitcher`, Achsen getauscht. Links „Alle Märkte" + Markt-Dropdown,
rechts Bereichsfilter. Daten: `MARKET_CODES`, `DOMAINS`.

### 02 · Hero
Links: Eyebrow `tone="brand" dot={false}`, H1 = Marktname, Lead, Faktenzeile
(mit `·` getrennt), zwei CTAs (Assessment primär, „Frage stellen" outline auf
weißem Grund), Quellenzusage mit Häkchen.

Rechts die **Marktprofil-Karte**, 340px — Transponierte von `AreaRiskCard`:

| Element | Datenquelle |
|---|---|
| Große Zahl | `enforcementIntensity`, Farbe über `severityFromRiskWeight` |
| Pille | dieselbe Severity |
| Balken 1 | `strictnessScore` / 10 |
| Balken 2 | `byDomain.length` / 8 — abgedeckte Bereiche |
| Fußchart | alle 8 Märkte nach Vollzug, eigener hervorgehoben |

### 03 · Kennzahlenband
= `AreaMetrics`, unverändert übernehmen — full-bleed Grau, Kacheln im
Container, Inhalt zentriert, `px-[1rem]`, Zeile ab `desktop-m`.

Vier Kacheln, jede fällt weg wenn leer:
1. Pflichten mit lokaler Quelle · Note: „von 21, die die Engine führt"
2. Bußgeld-Exposition (Summe `penaltyMaxEur`) · Note: „Summe der Obergrenzen"
3. Tage bis zur nächsten Frist (min `dueDays`) · Note: die Quelle
4. Bereiche mit eigener Quelle (n von 8) · Note: „m laufen über EU-Recht"

### 04 · Gewichtung — Eyebrow „Gewichtung"
= `AreaMarketHeatmap`, transponiert. Links 340px-Schiene, rechts Karte mit
8 Zeilen: Name / Balken / Wert mit einer Dezimale / Severity-Wort.

Jede Zeile verlinkt auf die **Bereichsseite**. Pfeil auf `opacity-0`, sichtbar
bei `hover` **und** `focus-visible`.

Lead wird abgeleitet: schwerster Bereich gegen zweitschwersten, mit eigener
Formulierung bei Gleichstand — nicht die Sortierreihenfolge entscheiden lassen.
Daten: `profile.weights` (bereits absteigend sortiert).

### 05 · Pflichten-Explorer — Eyebrow „Pflichten"
= `ObligationsExplorer` mit **einer** Änderung: die Liste ist nach Bereich
**gruppiert** (Gruppenkopf `BEREICH · n`), weil das die Achse ist, entlang der
ein Markt gelesen wird.

Zeile: Titel, darunter `Quelle · Turnus`, Risiko-Pille rechts, petrol Kante
links wenn gewählt. Detail: Pille „Risiko: X · gilt heute", H3, Beschreibung,
2×2-Faktenraster, CELEX-Zeile.

**Das Faktenraster weicht in einer Zelle ab:** statt *Geltung* steht dort
*Bereich* mit dem Gewicht dieses Bereichs in diesem Markt — Geltung ist auf
einer Marktseite trivial.

Daten: `profile.byDomain` + `ObligationEnrichmentMap[sub][code]`.

### 06 · Durchsetzung — dunkel `#002E26`
= `AreaEnforcement`, unverändert. Links 380px: Eyebrow (**ohne Icon**), H2,
Lead. Rechts zwei Statkarten (höchstes Einzelbußgeld + zugehörige Pflicht;
Vollzugsintensität X/10 + Rang unter 8 Märkten) und eine Behördenkarte mit
Pillen. Einzige dunkle Fläche neben dem Abschluss.

### 07 · Zeitachse — Eyebrow „Zeitachse"
= `AreaTimeline`, aber **gruppiert nach Turnus statt nach Datum**.

Begründung, gemessen: für Deutschland trägt keine der 9 Pflichten ein
`appliesFrom` — alle gelten heute. Eine Datumsachse hätte genau einen Knoten.
Der Turnus ist das, was einen Markt zeitlich unterscheidet.

Knoten: Monatlich / Vierteljährlich / Jährlich / Laufend & einmalig, je mit
Anzahl und den Pflichtnamen. Petrol-Schiene bis zum ersten Knoten. Schiene auf
**Knotenmitte** legen, nicht darüber (auf der Bereichsseite waren es 9px daneben).

Wo ein Markt Pflichten mit `appliesFrom` führt, kommen die Stichtage als
zusätzliche Knoten dahinter — dieselbe Gruppierungsregel wie dort.

### 08 · Deckung — neu, nur Marktseite
Was die Engine für diesen Markt **nicht** lokal führt. Je fehlendem Bereich
eine Karte: Name, Gewicht als Pille, warum es EU-Recht ist, das geltende
Instrument. Daten: `profile.weights` minus `byDomain`.

Diese Sektion ist der Grund, warum die Seite ehrlich bleibt. Für Deutschland
steht hier Daten & Datenschutz — der Bereich mit dem **höchsten** Gewicht
(10/10), für den wir keine deutsche Quelle führen, weil die DSGVO eine
Verordnung ist. Das gehört gesagt, nicht versteckt.

Fällt weg, wenn ein Markt alle acht Bereiche abdeckt (heute kein Markt).

### 09 · Weiter — andere Märkte
= `RelatedAreas`, transponiert. Drei Karten: Glyph 56px `strokeWidth={1.5}`,
Risiko-Pille, Marktname, ein abgeleiteter Satz, „Markt öffnen".
Auswahl: die drei mit der größten Pflichten-Überschneidung.

### 10 · Frage stellen — einzige Goldfläche
Goldkante 3px links, H3, Lead, petrol Button auf `/search`.
**Keine Spezialisten-Behauptung** — die kommen erst nach Anmeldung.

### 11 · Abschluss — dunkel
Ein Band: `HowOrchestrationWorks tone="inverse"` (vier Schritte, keine
Verbindungspfeile) + Haarlinie + CTA-Zeile links/rechts. Exakt wie auf der
Bereichsseite.

## Abweichungen — bewusst, einmal begründet

| Canvas | Implementierung | Grund |
|---|---|---|
| Radius 14/16px | `rounded-xl` = 10px | Kartendoktrin #73; `designSystem.guard.test.ts` bricht sonst |
| H2 30px | `text-h2` = 24px | 30px ist keine Stufe der Typo-Skala |
| Eyebrow mit Ziffer | nur das Wort | Ziffern zählen Artboards, nicht Sections |

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
  Aliase in `extendTailwindMerge` (`src/lib/utils.ts`) eintragen, sonst
  verschwindet die Klasse lautlos.
- Alle Reveals über `useInViewOnce` — jeder Pfad endet auf `true`.
- Zahlen immer `tabular-nums`.
- Container `size="xl"` = 1200px Kappe, `lg:px-20` = 80px Rand.

## Hub-Seite

`/:locale/markets` ist bereits ein Hub (`MarketsIndexPage`), aber dünn. Nach
den Unterseiten anzugleichen: Kartenraster wie `ComplianceAreasPage`, je Karte
Marktname, Vollzugs-Pille, Pflichtenzahl, abgedeckte Bereiche. Keine
erfundenen Zahlen — dieselbe Regel, die `specialistsCount` gekostet hat.
