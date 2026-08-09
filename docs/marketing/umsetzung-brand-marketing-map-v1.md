# Umsetzung · Brand & Marketing Map V1

**Stand: 09.08.2026 · Quelle: `CompliHub360_Brand_Marketing_Map_V1.docx` (Marketing-Handoff)
· Status: Umsetzungsplan, zwei Entscheidungen offen**

Übersetzt den Marketing-Report in konkrete Code-Änderungen. Jede Zeile nennt die
betroffene Datei bzw. den Screen. Offene Entscheidungen sind mit **⚠️ ENTSCHEIDUNG**
markiert und blockieren die jeweils zugeordneten Arbeitspakete.

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

## 1 · ⚠️ ENTSCHEIDUNG A — Claim unter dem Logo

Report §5/§14: **„Always on your side." direkt unter dem Logo platzieren.**
Aktuell steht dort **„Compliance. Simplified."**

| Betroffen | Datei / Ort |
|---|---|
| Logo-Komponente (Quelle der Wahrheit) | `src/components/ui/Logo.tsx:70` |
| Story + Doku-Kommentar | `Logo.stories.tsx:8`, `Logo.tsx:12` |
| **Compass-DS in Figma** | Logo-Lockup-Komponente — Parity-Regel: gleiche Sitzung nachziehen |
| E-Mail-Logo-Asset | `logo-lockup-email.png` (Supabase Storage) trägt den alten Claim eingebrannt |

**Zu entscheiden:** Ersetzen oder ergänzen? Der Report sagt „place under the logo",
nicht „replace". Beide Claims nebeneinander wären zu viel.
**Empfehlung:** ersetzen — „Always on your side." ist der Markenkern laut §16
(„Non-negotiable foundation"), „Compliance. Simplified." beschreibt nur das Produkt.
Aufwand: Code klein, Figma + E-Mail-Asset je ein eigener Schritt.

---

## 2 · ⚠️ ENTSCHEIDUNG B — Namen der 8 Compliance-Bereiche

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

**Vorschlag: 2 von 6 Abweichungen übernehmen** (EPR & Packaging, Marketing Compliance),
die übrigen begründet beibehalten und dem Marketing zurückmelden.

**Blast-Radius einer Umbenennung** (falls mehr übernommen wird):
`lib/domains.ts` (Quelle) · 19 Dateien mit Domain-Labels · 8 i18n-Keys × 4 Sprachen ·
Engine-Mapping `SLUG_TO_ENGINE` · Figma-Sidebar + Domain-Bar.
**Wichtig:** Nur die **Labels** ändern, nicht die **Slugs** — Slugs stecken in Routen,
gespeicherten Sessions und der DB. Ein Slug-Wechsel würde bestehende Daten brechen.

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
| 1 | Entscheidungen A (Claim) + B (Domain-Namen) | **User** |
| 2 | Copy-Layer Landing + Search-Page, 4 Sprachen | Stufe 1 |
| 3 | Problem-Recognition-Sektion + Homepage-Reihenfolge | Stufe 2 |
| 4 | Risk-Map-Reframing (Stats + Zeilen) | — (unabhängig, jederzeit) |
| 5 | `/how-it-works` nach 5-Stufen-Gerüst | Stufe 2 |
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
