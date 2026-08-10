# Umsetzung · Brand & Marketing Map V1

**Stand: 10.08.2026 · Quelle: `CompliHub360_Brand_Marketing_Map_V1.docx` (Marketing-Handoff)
· Status: Entscheidungen A + B getroffen und umgesetzt · Stufen 2/3/5/6 offen**

Übersetzt den Marketing-Report in konkrete Code-Änderungen. Jede Zeile nennt die
betroffene Datei bzw. den Screen. Die beiden Entscheidungen, die alles Weitere
blockiert hatten (§1 Claim, §2 Domain-Namen), sind am 10.08.2026 gefallen und
umgesetzt — die Abschnitte dokumentieren jetzt, **was** entschieden wurde und warum.

---

## 0 · Befund: Die Architektur stimmt bereits

Die vollständige **KEEP-Liste** des Reports (§14) ist gebaut und live. Das ist der
wichtigste Befund — es steht kein Architektur-Umbau an, sondern eine Sprach- und
Reihenfolge-Korrektur.

| Report §14 KEEP | Umsetzung | Stand |
|---|---|---|
| Zwei gleichrangige Einstiege (Prosa-Frage + geführte Risk Map) | `HomeHero` mit `entry="search"` | ✅ (Branch `feat/landing-search-v2`) |
| Teil-Risk-Map → Registrierung → Vollergebnis | `ResultsRiskMap` + Register-Gate | ✅ live |
| Anonyme Provider-Bewertung vor Identitäts-Reveal | Stage 1/2/3-Modell | ✅ live |
| Integriertes Scheduling + Provider-Handoff | `ProviderSchedulePage`, `TerminePage` | ✅ live |
| „Answer first; sell later" (§8) | `SearchResultPage` — Antworten ohne Risk Map, ohne Gate | ✅ (Branch) |
| Kein Pay-to-Rank (§7, §15) | Ranking unverkäuflich, bewusst dokumentiert | ✅ Beschluss + Code |
| Begrenzte relevante Auswahl statt Masse (§7) | gescorte Shortlist 0.6R+0.3Q+0.1P | ✅ live |

---

## 1 · ✅ ENTSCHEIDUNG A — Claim unter dem Logo — **entschieden 10.08.2026: ersetzen**

Report §5/§14: **„Always on your side." direkt unter dem Logo platzieren.**
Aktuell steht dort **„Compliance. Simplified."**

| Betroffen | Datei / Ort |
|---|---|
| Logo-Komponente (Quelle der Wahrheit) | `src/components/ui/Logo.tsx:70` |
| Story + Doku-Kommentar | `Logo.stories.tsx:8`, `Logo.tsx:12` |
| **Compass-DS in Figma** | Logo-Lockup-Komponente — Parity-Regel: gleiche Sitzung nachziehen |
| E-Mail-Logo-Asset | `logo-lockup-email.png` (Supabase Storage) trägt den alten Claim eingebrannt |

**Entschieden:** ersetzen. „Always on your side." ist der Markenkern laut §16
(„Non-negotiable foundation"), „Compliance. Simplified." beschrieb nur das Produkt.

**Umgesetzt** (Branch `feat/brand-tagline-domains`): `Logo.tsx`, `Logo.stories.tsx`,
`riskMapPdf.ts` (PDF-Kopf), `mailer.ts` + beide Supabase-Templates (Alt-Text),
`compass-reference.md`, `mobile-header-pill-nav.md`. Der Claim bleibt bewusst
**unübersetzt** — er liest sich in jeder Locale gleich.

**Offen (Stufe 7, nicht Code):** Compass-DS in Figma und das E-Mail-Asset
`logo-lockup-email.png` tragen den alten Claim noch eingebrannt. Der Alt-Text nennt
bereits den neuen; die Pixel müssen aus Compass neu exportiert werden.

---

## 2 · ✅ ENTSCHEIDUNG B — Namen der 8 Compliance-Bereiche — **entschieden 10.08.2026: 2 von 6**

Report §5 listet die Kategorien anders als unsere kanonischen Domains (gestern
final durch Wizard, Sidebar, Engine-Mapping und 4 Sprachen gezogen):

| Unser Name (heute) | Report §5 | Empfehlung |
|---|---|---|
| Tax & VAT | VAT & Tax | **behalten** — reine Reihenfolge, bewusst so entschieden |
| Product & Packaging | EPR & Packaging | **übernehmen** — präziser, trennt sauber von „Product Compliance" |
| Data & Privacy | GDPR & Privacy | **behalten** — „Data & Privacy" ist breiter (auch Nicht-EU), GDPR ist ein Gesetz, keine Kategorie |
| Marketing & SEO | Marketing Compliance | **übernehmen** — SEO ist keine Compliance-Disziplin, wirkt auf der Plattform fehl am Platz |
| Corporate & Structure | Corporate & Filings | **behalten** — „Structure" deckt auch Betriebsstätte/Gesellschaftsform ab, nicht nur Meldungen |
| Legal Advisory | Legal Advice | **behalten** — „Advice" grenzt schlechter gegen die RDG-Frage ab als „Advisory" |
| Logistics & Customs | identisch | — |
| Product Compliance | identisch | — |

**Entschieden: 2 von 6 Abweichungen übernommen** (EPR & Packaging, Marketing Compliance),
die übrigen 4 begründet beibehalten — dem Marketing mit den Gründen oben zurückmelden.

**Umgesetzt** (Branch `feat/brand-tagline-domains`) — nur **Labels**, kein Slug:

| Sprache | `product-packaging` | `marketing-seo` |
|---|---|---|
| en | EPR & Packaging | Marketing Compliance |
| de | EPR & Verpackung | Marketing-Compliance |
| es | EPR y envases | Compliance de marketing |
| tr | EPR ve Ambalaj | Pazarlama Uyumu |

Betroffen: `lib/domains.ts` (Quelle) · 13 Code-/Fixture-Dateien · 16 Locale-Dateien.
API und Engine keyen ausschließlich auf Slugs (`SLUG_TO_ENGINE`, `DOMAIN_TO_DB`) —
dort war **keine** Änderung nötig, was die Slug-Regel bestätigt: Slugs stecken in
Routen, gespeicherten Sessions und der DB; ein Slug-Wechsel würde Daten brechen.

**Nebenbefund, mitbereinigt:** Spanisch führte denselben Bereich in zwei Schreibungen
(`RAP y envases` / `EPR y Embalaje` vs. `EPR y envases`, `Cumplimiento de` vs.
`Compliance de marketing`). Vereinheitlicht auf `EPR y envases` — Spaniens
EPR-Gesetz (Ley 7/2022) spricht von „envases" — und auf `Compliance de marketing`.

**Bewusst nicht angefasst:** die Provider-Intake-Liste in `auth.json`
(`complianceAreas` / `specializations`) ist eine eigene Taxonomie mit abweichendem
Wording („Marketing & advertising", „EPR & packaging law") und referenziert
möglicherweise gespeicherte Provider-Datensätze. Sie führt außerdem noch das längst
entfernte „Full Support" → eigener Bereinigungs-Task.

---

## 3 · Copy-Layer (nach Entscheidung A/B)

Der Report liefert die Sprache; unsere Platzhalter werden ersetzt. Alle Änderungen
in **4 Sprachen** (en/de/es/tr).

| Element | Heute (Platzhalter) | Report §5/§10 | Datei |
|---|---|---|---|
| Primär-CTA Hero | „Start guided analysis" | **„Assess My Needs"** / „Start My Risk Map" | `home.json` → `hero.dual.guided` |
| Sekundär-CTA Hero | „Find answers" | **„Ask a Compliance Question"** | `hero.dual.answer` |
| Suchfeld-Placeholder | „Describe your situation…" | beibehalten (report-konform) | `hero.dual.placeholder` |
| Kategorie-Aussage | fehlt | **„Compliance Intelligence & Provider-Matching Platform"** sichtbar platzieren | Hero-Eyebrow |
| Final-CTA | „Start your assessment" | **„Assess My Needs"** primär, „Ask a Compliance Question" sekundär | `EntryDoor.tsx` |
| Search-Page-Copy | Platzhalter-Antworttexte | Report-Sprache §11 | `results.json` → `search.*` |

**Umgesetzt 10.08.2026** in zwei Branches, weil `hero.dual.*` und `search.*` nur
auf dem Dual-Entry-Hero existieren:

- `feat/copy-layer-landing` (auf main) — Hero-Eyebrow, `hero.cta.start`, `entryDoor.cta`
- `feat/copy-layer-search` (auf `feat/landing-search-v2` + Landing-Branch gemerged) —
  `hero.dual.*`, gesamte `search.*`

CTA-Sprache über beide Einstiege identisch: **„Assess My Needs"** (de „Meinen Bedarf
ermitteln", es „Evaluar mis necesidades", tr „İhtiyaçlarımı değerlendir") und
**„Ask a Compliance Question"**. Englisch übernimmt die Ich-Form des Reports wörtlich;
die anderen drei behalten ihr eigenes Button-Register, statt die Ich-Form in Sprachen
zu zwingen, die den Leser siezen.

**Drei Befunde beim Umsetzen:**

1. Die Kategorie-Aussage landete in einem **unsichtbaren** Element. `SectionEyebrow`
   mappte seine Töne auf rohe Palettenstufen, die nicht mit dem Theme kippen —
   `tone="brand"` ergab #002E26 auf dem dunklen Hero, Kontrast **1.01**. Auf
   semantische `fg-*`-Tokens umgestellt: Hero-Eyebrow **1.01 → 6.47** (dark), 9.83
   (light), kein Eyebrow der Seite unter 4.5:1 im Light Mode.
2. Die Platzhalter-Copy **duzte** in de/es/tr, während der Rest jeder Locale siezt
   (159:1 · 69:3 · 93:2). Angeglichen.
3. Der Antworttext trug ein wörtliches `[Placeholder answer]`. Ersatzlos streichen
   hätte ein Gerüst wie eine echte Antwort wirken lassen — der Hinweis sitzt jetzt in
   einem eigenen Badge (`search.previewBadge`) neben dem „Answer"-Eyebrow.

**§11-Prüfung der Bestands-Copy:** sauber. Die einzigen „legal advice"-Treffer sind
das FAQ, das genau das verneint — gewollte Richtung, kein Verstoß.

**Nicht angefasst, gemeldet:** „Log in" im `MarketingHeader` ist hartkodiert und
bleibt auf /de /es /tr englisch · `GlobalNav` baut ein Platzhalter-Logo aus Primitiven
statt der echten `Logo`-Komponente, weshalb der neue Claim nur auf den zwei
Landing-Routen erscheint · das Eyebrow der `brand-code`-Sektion steht mit Kontrast
1.37 gold auf Teal (vorbestehend; Sektion steht in Stufe 3 ohnehin zur Disposition).

**Sprachregeln (§11) als Prüfliste für jeden Text:**
verwenden — *understand, clarity, your needs, informed decision, right fit,
matched to your needs, what applies to your business*;
vermeiden — *best provider, cheapest, guaranteed compliance, „trusted/trust us"
als Behauptung, angstbasierte Strafandrohung, Rechtsberatungs-Wording.*

---

## 4 · Homepage-Architektur (§5)

Ist-Reihenfolge vs. Report. Die Sektionen existieren größtenteils — es fehlt eine,
und die Reihenfolge folgt noch nicht der Journey.

| # | Report fordert | Heutige Sektion | Änderung |
|---|---|---|---|
| 1 | **Hero** — Verstehen statt Anbieterfinden, 2 Wege | `HomeHero` | Copy + Claim + Kategorie-Aussage |
| 2 | **Problem Recognition** — widersprüchliche Auskünfte, Überverkauf, Zeitverlust, Vergleichbarkeit | **FEHLT** | **neue Sektion**, menschliche Sprache, ohne Angst |
| 3 | **How It Works** — Understand → Assess → Decide → Match → Act | `HowItActs` („How CompliHub Acts") | auf das 5-Stufen-Gerüst umbauen, scanbar |
| 4 | **Risk Map als Marketing-Held** | `RiskMapSection` | nach vorne, visuelle Vorschau betonen, CTA = Assessment (nicht Kauf) |
| 5 | **Provider Matching** als Folge des Verstehens | `MatchmakingDifference` | Reframing: Ergebnis der Klarheit, nicht Feature; „Quality before names" |
| 6 | **Compliance-Kategorien** — Breite belegen, nicht Hauptstory | `DomainsKnows` | Namen je Entscheidung B; in Nutzen übersetzen |
| 7 | **Trust Through Experience** — zeigen statt behaupten | `TwoReflexes`, `BrandCodePreview` | **zu prüfen**: ob sie das leisten oder ersetzt werden |
| 8 | **Final CTA** | `EntryDoor` | CTA-Wording |

**Offen zur Prüfung:** `BrandCodePreview` (Nav-Label „Voices") zeigt Design-System-
Vorschauen — das ist Selbstdarstellung, nicht Nutzernutzen. `BeyondAssessment` und
`TwoReflexes` gegen die neue Architektur gegenchecken; Kandidaten für Streichung
oder Zusammenlegung (§14 REMOVE: „provider-first homepage storytelling").

---

## 5 · Risk-Map-Reframing — der einzige echte Zielkonflikt

Report §11 verbietet **„fear-first penalty language"**, §5 fordert „avoid fear-heavy
messaging". Unsere Risk Map führt aber genau damit:

- Stat-Streifen: **„€530k total exposure"** als größte Zahl auf dem Screen
- Jede Zeile beginnt mit „Penalty: bis zu 200.000 €"

Strafmaße sind Fakten und für die Priorisierung nützlich — das Problem ist die
**Prominenz**, nicht die Existenz.

**Vorschlag:**

| Element | Heute | Neu |
|---|---|---|
| Stat 1 | 9 obligations identified | bleibt |
| Stat 2 | **€530k total exposure** | **3 mit Frist in 30 Tagen** (Dringlichkeit ohne Drohung) |
| Stat 3 | 60 days median deadline | bleibt |
| Stat 4 | 3 Verified Partners ready | bleibt |
| Zeilen-Detail | „Penalty: … · Quelle" | Quelle führt, Strafmaß nachgestellt bzw. im Tooltip |

Datei: `src/pages/ResultsRiskMap.tsx` (Stat-Berechnung + Zeilen-Mapping).
Die Daten bleiben unverändert — nur was zuerst ins Auge fällt, ändert sich.

---

## 6 · `/how-it-works` (eigene Seite)

Ersetzt meinen Entwurf vom 09.08. durch das Report-Gerüst §4 — die Abschnitte, die
wir gestern abgestimmt hatten, ordnen sich darunter ein:

| Stufe | Inhalt | aus gestriger Abstimmung |
|---|---|---|
| **Understand** | Prosa-Frage, Antwort mit Quellen, kein Verkaufsdruck | „Die zwei Wege" |
| **Assess** | Wizard → Risk Map, woher die Daten kommen (Engine + EUR-Lex, nicht ChatGPT) | „Deine Risk Map" |
| **Decide** | Prioritäten, welche Unterstützung wirklich nötig ist — inkl. „wenn du alles hast, sagen wir das" (§15) | neu aus Report |
| **Match** | **„Quality before names"** — warum anonym, Fit vor Identität | „Warum die Spezialisten anonym sind" |
| **Act** | Buchung, Reveal, Dossier, danach: Reviews + Monitoring | „Vom Match zum Termin" + „Danach" |

Plus die bereits abgestimmten Blöcke: Kosten („für dich kostenlos", Modell erklären,
**keine Beträge nennen**) und Datenschutz (EU-Hosting, anonym bis Registrierung).

---

## 7 · Reihenfolge der Umsetzung

| Stufe | Paket | Blockiert durch |
|---|---|---|
| 1 | ✅ Entscheidungen A (Claim) + B (Domain-Namen) | erledigt 10.08.2026 |
| 2 | ✅ Copy-Layer Landing + Search-Page, 4 Sprachen | erledigt 10.08.2026 |
| 3 | ✅ Problem-Recognition-Sektion + Homepage-Reihenfolge | erledigt 10.08.2026 |
| 4 | ✅ Risk-Map-Reframing (Stats + Zeilen) | erledigt 10.08.2026 |
| 5 | ✅ `/how-it-works` nach 5-Stufen-Gerüst | erledigt 10.08.2026 |
| 6 | Compliance-Bereiche + Länder-Seiten (Wissensbasis) | Entscheidung B |
| 7 | Claim in Figma/Compass + E-Mail-Asset nachziehen | Entscheidung A |

**Nicht Teil dieses Plans** (Report §16 explizit als „future work"): Mission, Vision,
Core Values, Brand Personality, vollständige Social-Media-Strategie, Content-Kalender.
Die Content-Pillars (§13) und Social-Funnel-Themen (§12) sind Redaktionsplanung —
sie gehören in den Content-Prozess, nicht in die Website-Umsetzung.

---

## 8 · Was der Report bestätigt hat (für die Akte)

Zwei Entscheidungen, die wir unabhängig getroffen hatten und die der Report
ausdrücklich stützt:

1. **Ranking bleibt unverkäuflich** (§7, §15: „commercial relationships must not
   secretly determine objective match ranking") — deckt sich mit unserem
   Pricing-Beschluss, Sichtbarkeits-Boosts nicht zu verkaufen.
2. **Affiliate-Link erst nach Buchung** — §7 verlangt Identität erst nach der
   Buchung; ein Pre-Booking-Outclick hätte das gebrochen.
