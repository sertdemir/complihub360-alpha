# CompliHub360 — Marketing Briefing: Journey · Daten · Matching

> **Zweck:** Direkte, weiterleitbare Antworten auf drei Marketing-/Stakeholder-Fragen (#8 Journey, #9 Risk-Map-Daten, #10 Matching-Logik).
> **Stand:** 2026-08-04 · intern, vor externer Nutzung freigeben. Kontext: `docs/backlog/user-flow-matchmaking-v2-spec.md`, `GoogleDrive_Docs/Search & Ranking Logic.md`.

---

## 8 · Walk me through a user's journey — John, Klick für Klick

**John** betreibt einen Cross-Border-Onlineshop (Möbel, D2C, verkauft nach IT über eigenen Shop + Amazon). Er googelt „VAT verkaufen Italien" und landet auf der Homepage.

1. **Homepage.** John sieht die Headline *„Erfahre in Minuten, welche Compliance-Pflichten dich treffen."* und **zwei gleichwertige Wege**: ein **Suchfeld** („Beschreibe dein Anliegen…") **oder** den Button *„Geführte Risk-Map-Analyse starten"*. Trust-Zeile: „Kostenlos · anonym · in unter 3 Minuten."
2. **Klick: „Analyse starten".** Der **Wizard** öffnet sich (Vollbild, keine Ablenkung, Fortschrittsbalken).
   - *(Alternativer Weg: John tippt seine Frage ins Suchfeld → er bekommt eine direkte, quellenbelegte **Antwort-Seite** ohne Risk Map, mit einem Nudge „Für deinen personalisierten Plan → Analyse starten". Beide Wege münden ins selbe Matchmaking.)*
3. **Wizard-Schritt 1 — Märkte.** John wählt sein Sitzland und die **Zielmärkte** (Italien, evtl. weitere).
4. **Wizard-Schritt 2 — Betrieb.** Geschäftsmodell (D2C), **Vertriebskanäle** (eigener Shop + Amazon), Produktart, grobe Umsatz-/Volumengröße.
5. **Wizard-Schritt 3 — Themen.** Relevante **Compliance-Domänen** (Steuer/VAT, Verpackung/EPR, …) — vorbelegt aus seinen Angaben, anpassbar.
6. **Review & Start.** John sieht seine Antworten gebündelt, klickt *„Ergebnisse anzeigen"*.
7. **Risk Map (Teilansicht).** In Sekunden: *„Dein Compliance-Risiko ist **hoch**."* Die **wichtigste Pflicht** (VAT-Registrierung IT) voll sichtbar, **weitere Pflichten angedeutet/gesperrt**, Teaser: *„12 geprüfte Provider gematcht."*
8. **Register-Gate.** Um die **volle** Risk Map + Provider zu sehen, registriert John sich (E-Mail, „ohne Kreditkarte · 30 Sek.").
9. **Volle Risk Map + Provider-Liste.** Alle Pflichten (wichtigste offen, Rest in einem **Akkordion** → Provider erscheinen weit oben). Rechts eine **Liste anonymer, vorgeprüfter Spezialisten** mit **Filter** (Domain, Land, Sprache, Abrechnung, Bewertung) und **Sortierung** (Best Match / Rating / Antwortzeit).
10. **Klick: „Details".** John öffnet die **Provider-Detail-Page** — anonymisierte Credentials, verifizierte Bewertungen, Abrechnungs-Modell + volle Preisübersicht, Verfügbarkeit. **Noch immer ohne Name/Kontakt** („Identität nach dem Termin sichtbar").
11. **Klick: „Termin buchen →".** John kommt auf die **Scheduling-Seite**.
12. **Scheduling.** Er wählt Tag + Uhrzeit im Kalender, optional eine Kurz-Nachricht, klickt *„Verbindlich buchen"*.
13. **Buchung bestätigt.** **Name & Kontaktdaten des Providers werden sichtbar**, beide erhalten eine Kalendereinladung.
14. **Ende.** John hat ein **gebuchtes Erstgespräch** mit einem geprüften Spezialisten und ein Dashboard, in dem seine Risk Map + Buchung gespeichert sind. **CompliHub tritt ab**; nur ein **Monitoring/Reminder** bleibt aktiv.

**Wo landet er?** Bei einem konkreten, terminierten Erstgespräch mit dem passendsten geprüften Spezialisten — plus einer gespeicherten, personalisierten Compliance-Landkarte.

---

## 9 · Welche Daten sammelt die Risk Map? (Alles — jede Frage)

Die Risk Map baut ein strukturiertes **Search-Profil** aus jeder Wizard-Antwort. Das ist zugleich unser **Segmentierungs-/Targeting-Schatz** — jede Achse ist ein Marketing-Filter.

| # | Datenpunkt | Was wir fragen | Marketing-/Targeting-Wert |
|---|---|---|---|
| 1 | **Sitzland** | Wo ist das Unternehmen ansässig (EU / Nicht-EU)? | Geo-Segmentierung, Jurisdiktions-Kampagnen |
| 2 | **Zielmärkte** | In welche Länder wird verkauft? | Länder-spezifische Ads (z. B. „VAT Italien") |
| 3 | **Vertriebskanäle / Marktplätze** | Eigener Shop, Amazon, eBay, Etsy, B2B-Portale…? | Kanal-Lookalikes, Marktplatz-Partnerschaften |
| 4 | **Geschäftsmodell** | D2C, B2B, Marketplace-Seller, Dropshipping, SaaS? | Persona-/Modell-Targeting |
| 5 | **Produktarten / -kategorien** | Physische Güter, Verpackung, Elektronik, Kosmetik, Lebensmittel, Digital? | Produkt-Vertical-Kampagnen |
| 6 | **Umsatz-/Turnover-Band** | Grobe Umsatzgröße | Größen-Segmentierung (SMB vs. Mid-Market) |
| 7 | **Volumen / Bestellmenge** | Größenordnung der Transaktionen | Reifegrad-/Skalierungs-Signale |
| 8 | **Lager / Fulfillment** | Wo liegt Ware (FBA, eigenes Lager, Dropship)? | Logistik-/EPR-Relevanz, Cross-Border-Trigger |
| 9 | **Compliance-Domänen** | Welche Themen betreffen ihn (VAT, EPR, Datenschutz, …)? | Themen-basierte Nurture-Strecken |
| 10 | **Risiko-Signale** | Über Schwellen? Grenzüberschreitend? Sensible Daten? | Hoch-Intent-Segmente |
| 11 | **Unternehmensstruktur** | Rechtsform, EU-/Nicht-EU-Niederlassung | Fiskalvertreter-/Struktur-Angebote |
| 12 | **Timeline / Dringlichkeit** | Wann ist Handlungsbedarf? | Sales-Priorisierung, Retargeting-Timing |
| 13 | **Freitext-Anliegen** (Search-Weg) | Eigene Worte des Users | Intent-Mining, Keyword-/SEO-Insights |

**Deterministisch vs. AI:** Fakten (Land, Kanal, Modell, Größe) sind hart erfasst; die AI reichert sie zu Risiko-Labels + priorisierten Pflichten an (immer mit Quellen).
**Privacy-Hinweis für Marketing:** Für Provider/Dossiers werden Angaben **anonymisiert** geteilt; personenbezogene Nutzung folgt der Privacy-Pipeline (Consent, Redaction). Marketing-Nutzung der Profile aggregiert/segmentbasiert, nicht personenbezogen ohne Einwilligung.

---

## 10 · Wie funktioniert der Matching-Algorithmus? (ohne Betriebsgeheimnisse)

Kurz: Wir **matchen das Search-Profil des Users gegen die Attribute geprüfter Provider** und **ranken** das Ergebnis. Die genaue Formel/Gewichtung ist unser Secret Sauce — hier die **Kategorien von Faktoren**, die einfließen:

**A. Relevanz (passt der Provider zum konkreten Fall?)**
- **Land / Jurisdiktion** — deckt der Provider Sitz- **und** Zielländer ab?
- **Marktplatz / Kanal** — Erfahrung mit dem Vertriebsweg (z. B. Amazon-FBA-Spezifika)?
- **Geschäftsmodell** — D2C vs. B2B vs. Marketplace-Fit.
- **Produkte** — Kategorie-Expertise (Verpackung/EPR, Elektronik, Lebensmittel…).
- **Lager / Fulfillment** — Logistik-/Zoll-/EPR-Bezug.
- **Umsatz / Turnover** — passt der Provider zur Unternehmensgröße?
- **Compliance-Komplexität** — Anzahl/Schwere der Pflichten ↔ Spezialisierungstiefe des Providers.
- **Sprache** — gemeinsame Arbeitssprache.

**B. Qualität (wie gut liefert der Provider?)**
- Antwortzeit · Bestätigungsrate · verifizierte Bewertungen · Einhaltung von SLAs.

**C. Marktplatz-Priorität (unser Modell)**
- Geprüfte Partner erhalten einen definierten, transparenten Vorrang — **immer ehrlich als solcher signalisiert**, nie versteckt.

**Prinzipien:**
- **Deterministisch** bei Fakten (Abdeckung, Rating, Reihenfolge) — reproduzierbar, nicht „Blackbox-Willkür".
- Der User sieht einen **Match-Score** (z. B. „96% Match"), aber **nie** interne Gewichte oder Provider-Identitäten.
- **Leakage-Schutz:** Kontaktwege sind verborgen; Kontakt entsteht nur über den Plattform-Flow — schützt beide Seiten und die Match-Qualität.

**Für Marketing verwertbar:** „Neutrales, geprüftes Matchmaking nach deinem echten Bedarf" — kein Verzeichnis, keine Zufalls-Leads. Der Match-Score ist ein kommunizierbarer Vertrauens-/Relevanz-Beweis.

---

*Ergänzend: die vollständige Station-für-Station-Journey mit Botschaften & CTAs in `docs/marketing/user-journey-v2.md`. Screens (Light+Dark) im Figma „CompliHub-360" → Page „Landingpages".*
