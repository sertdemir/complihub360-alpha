# CompliHub360 — User Journey (Marketing-Handoff)

> **Zweck:** Übergabe an Marketing. Beschreibt die vollständige User Journey vom ersten Kontakt bis zum gebuchten Spezialisten-Termin — mit dem, was der User an jeder Station *sieht*, *fühlt*, *tut*, den passenden **Botschaften**, **CTAs** und **Conversion-Momenten**.
> **Stand:** 2026-08-04 · Quelle: User-Flow v2 (`docs/backlog/user-flow-matchmaking-v2-spec.md`). Nicht für externe Veröffentlichung ohne Freigabe.

---

## 0. Positionierung in einem Satz

**CompliHub360 verwandelt regulatorische Unsicherheit in strukturierte Compliance-Handlung** — es sagt Unternehmen in Minuten, welche Pflichten sie wo treffen, und bringt sie mit geprüften, anonymen Spezialisten zusammen.

- **Nicht** ein Verzeichnis, **nicht** ein Blog, **nicht** eine Kanzlei — die **Compliance-Orchestrierungs-Schicht** zwischen Unternehmen und regulatorischer Komplexität.
- **Markenversprechen:** *„Von Unsicherheit zu strukturierter Compliance."*
- **Tonalität:** ruhig, strukturiert, präzise, autoritativ — **nie alarmistisch, nie Rechtsberatung**.

---

## 1. Für wen (Personas)

| Persona | Kurz | Kern-Bedürfnis |
|---|---|---|
| **U1 · Cross-Border-E-Commerce-Operator** (primär) | Verkauft international über eigenen Shop + Marktplätze | „Was muss ich in welchem Land erfüllen — ohne wochenlange Recherche?" |
| **U2 · SaaS-Expansion-Manager** | Skaliert SaaS in neue Märkte | Klarheit über Datenschutz/Steuer beim Markteintritt |
| **U3 · Agentur-Operator** | Betreut regulierte Kunden | Schnelle, verlässliche Antworten + geprüfte Spezialisten |
| **U4 · Research-orientierter User** | Will erst verstehen | Strukturiertes Wissen vor dem Erstkontakt |

**Job-to-be-Done (Kern):** *„Wenn ich Compliance-Hilfe brauche, will ich vertrauenswürdige Spezialisten, ohne Zeit mit deren Bewertung zu verschwenden."*

---

## 2. Die Journey auf einen Blick

```
LANDING (zwei gleichwertige Wege)
   ├─ (A) Prosa-Search  → Antwort-Seite (nur Antworten)  ──► Brücke zum Wizard
   └─ (B) Wizard starten → Risk Map (Teilansicht)
                                   │
                          REGISTER-GATE  ("volle Risk Map + Provider sehen")
                                   ▼
                 Volle Risk Map  +  anonyme Provider-Liste (Filter/Sort)
                                   ▼
                 Provider-Detail (anonym, tiefer)  ──►  Termin buchen
                                   ▼
                 Scheduling (Kalender)  ──►  gebuchter Termin
                                   ▼
                 Identität + Kontakt sichtbar · CompliHub tritt ab · Monitoring bleibt
```

**Zwei Einstiege, ein Ziel:** Der schnelle User sucht in Prosa und bekommt eine Antwort; der gründliche User macht den Wizard und bekommt seine personalisierte Risk Map. Beide münden in dasselbe Matchmaking.

---

## 3. Station für Station

### Station 0 — Landing: der Doppel-Einstieg
- **User-Ziel:** In Sekunden verstehen „ist das für mich?" und starten.
- **Was er sieht:** Headline *„Erfahre in **Minuten**, welche Compliance-Pflichten dich treffen."* · darunter **zwei Wege**: (A) ein **Prosa-Suchfeld** („Beschreibe dein Anliegen…") mit *Antworten finden*, (B) *Geführte Risk-Map-Analyse starten*. Trust-Zeile: „Kostenlos · anonym · in unter 3 Minuten."
- **Emotion:** Neugier statt Überforderung — kein Formular-Wall, kein Fachjargon.
- **Botschaften:** Geschwindigkeit („in Minuten"), Einfachheit („in eigenen Worten"), Vertrauen („geprüfte Spezialisten").
- **Primär-CTA:** *Antworten finden* **oder** *Analyse starten* (bewusst gleichrangig).
- **Conversion-Moment:** die erste Eingabe (Suchfeld-Fokus oder Wizard-Klick).

### Station 1A — Search-Result-Page (der schnelle Weg)
- **User-Ziel:** Eine konkrete Frage schnell beantwortet bekommen.
- **Was er sieht:** Eine **direkte, quellenbelegte Antwort** auf seine Frage + relevante Pflichten/Gesetze + weiterführende Guides. **Keine** Risk Map, kein Verkaufsdruck.
- **Emotion:** „Endlich eine klare Antwort" → Vertrauen in die Kompetenz.
- **Botschaft:** „Kompetente Antworten, mit Quellen — kein Blabla."
- **Brücken-CTA:** *„Für deine personalisierte Risk Map + passende Spezialisten → Analyse starten."*
- **Conversion-Moment:** der Wechsel in den Wizard/Provider-Flow.

### Station 1B — Risk Map (Teilansicht, der geführte Weg)
- **User-Ziel:** Sein Risiko sehen, ohne sich schon zu binden.
- **Was er sieht:** Sein **Gesamt-Risiko** („Dein Compliance-Risiko ist **hoch**"), die **wichtigste Pflicht** vollständig, weitere Pflichten **angedeutet/gesperrt**, ein Teaser: „X geprüfte Provider gematcht".
- **Emotion:** Aha-Moment + Sog („da ist mehr, das will ich sehen").
- **Botschaft:** „Das ist real und relevant für **dich** — und wir haben schon die passenden Leute."
- **Primär-CTA:** *Kostenlos registrieren, um die volle Risk Map + Provider zu sehen.*
- **Conversion-Moment:** **das Register-Gate** — der wichtigste Funnel-Übergang.

### Station 2 — Register-Gate
- **User-Ziel:** Den vollen Wert freischalten.
- **Was er sieht:** Minimales Registrierungsformular, klarer Nutzen daneben („alle Pflichten + deine 12 Provider"). „Ohne Kreditkarte · in 30 Sekunden."
- **Emotion:** geringe Reibung, klarer Gegenwert.
- **Botschaft:** „Ein Schritt trennt dich von deinem vollständigen Plan."
- **Conversion-Moment:** Registrierung abgeschlossen → sofort auf die volle Ergebnis-Seite (keine leere Dashboard-Landung).

### Station 3 — Volle Risk Map + anonyme Provider-Liste
- **User-Ziel:** Überblick + die richtigen Spezialisten finden.
- **Was er sieht:** Alle Pflichten (die wichtigste offen, der Rest in einem **Akkordion** — Provider erscheinen dadurch weit oben) · eine **Liste anonymer, vorgeprüfter Spezialisten** mit **Filter** (Domain, Land, Sprache, Abrechnung, Bewertung) und **Sortierung** (Best Match, Rating, Antwortzeit).
- **Der Twist (Differenzierer):** **Provider sind anonym** — kein Name, nur Eigenschaften, Bewertung, Abrechnungs-Modell und **Match-Score**. „Verifiziert von CompliHub360."
- **Emotion:** Kontrolle + Vertrauen („kuratiert, nicht überladen").
- **Botschaft:** „Geprüfte Spezialisten, neutral gematcht — nach deinem echten Bedarf."
- **Primär-CTA:** *Details ansehen* an einer Provider-Karte.

### Station 4 — Provider-Detail (anonym, tiefer)
- **User-Ziel:** Genug erfahren, um Vertrauen zu fassen.
- **Was er sieht:** Anonymisierte **Credentials & Zertifizierungen**, **verifizierte Bewertungen**, **Abrechnungs-Modell + volle Preisübersicht**, Verfügbarkeit — **weiterhin ohne Namen/Kontakt**. Klarer Hinweis: „Identität wird nach dem Termin sichtbar."
- **Emotion:** wachsende Sicherheit; Neugier auf den Menschen dahinter.
- **Botschaft:** „Tiefe Einblicke, geprüfte Qualität — Identität schützt beide Seiten bis zum echten Interesse."
- **Primär-CTA:** *Termin buchen →*

### Station 5 — Scheduling
- **User-Ziel:** Verbindlich einen Termin sichern.
- **Was er sieht:** **Kalender** mit freien Slots + Buchungs-Zusammenfassung; Hinweis: „Nach der Buchung werden Name & Kontaktdaten sichtbar — inkl. Kalendereinladung." Optionale Kurz-Nachricht. „Kostenlos & unverbindlich."
- **Emotion:** Erleichterung + Vorfreude (der Kreis schließt sich).
- **Botschaft:** „Ein Klick zum Erstgespräch — unverbindlich, sofort im Kalender."
- **Conversion-Moment:** **verbindliche Buchung** → hier entsteht der Wert für alle.

### Station 6 — Handoff & Monitoring
- **Was passiert:** Identität + Kontakt werden **beidseitig** sichtbar, beide erhalten die Kalendereinladung. CompliHub hat seine Aufgabe erfüllt und **tritt ab** — es bleibt nur der **SLA-Watchdog** aktiv (erinnert an Termine, triggert später beidseitige Bewertungen, die das Ranking verbessern).
- **Emotion:** „Das lief reibungslos — hier komme ich wieder her."
- **Botschaft:** „Wir haben dich zur richtigen Person gebracht. Den Rest übernehmt ihr — wir passen auf, dass es klappt."

---

## 4. Botschafts-Säulen (für Copy & Kampagnen)

1. **Geschwindigkeit** — „In Minuten, nicht in Wochen." (Zeit ist der größte Schmerz.)
2. **Klarheit** — „Deine Pflichten, priorisiert und mit Quellen." (Struktur statt Rechtsdickicht.)
3. **Neutrales, geprüftes Matchmaking** — „Kuratierte Spezialisten, nach echtem Bedarf gematcht."
4. **Anonymität als Vertrauen** — „Wir schützen dich vor Direktakquise; du entscheidest, wann Identität sichtbar wird."
5. **Zwei Wege, kein Zwang** — „Frag in eigenen Worten oder lass dich führen."

---

## 5. Anonymität & Vertrauen (ein Kommunikations-Asset, kein Bug)

Die schrittweise Enthüllung ist ein **Verkaufsargument**, kein Hindernis:
- **Liste:** Eigenschaften + Match, aber kein Name → wirkt wie eine **geprüfte Shortlist**, nicht wie ein Adressverkauf.
- **Detail:** tiefe, verifizierte Infos → Kompetenz beweist sich **vor** dem Namen.
- **Nach Buchung:** Identität → als **Belohnung** echter Absicht.
Analogie fürs Marketing: „Wie ein Experten-Netzwerk — erst die Qualität, dann der Name."

---

## 6. Conversion-Momente (worauf Kampagnen/Funnel optimieren)

| Moment | KPI | Marketing-Hebel |
|---|---|---|
| Landing → erste Eingabe | Engagement-Rate | Klare Doppel-CTA, minimale Reibung |
| Teil-Risk-Map → **Registrierung** | **Haupt-Conversion** | Wert *zeigen* vor der Registrierung |
| Provider-Detail geöffnet | Qualifiziertes Interesse | Reiche Liste → qualifizierte Klicks |
| **Termin gebucht** | **North-Star (Lead)** | Reibungsloses, unverbindliches Scheduling |

---

## 7. Domänen, die wir abdecken (Nutzen kommunizieren, nicht Fachbegriffe)

Tax & VAT · EPR & Packaging · Data & Privacy · Marketing Compliance · Corporate & Structure · Product Compliance · Logistics & Customs · Legal Advisory.
→ In Copy immer als **Nutzen** übersetzen („verkauf grenzüberschreitend, ohne Steuer-Fallen"), nicht als Kürzel.

---

## 8. Do & Don't (Markenstimme)

**Do:** ruhig, konkret, quellenbewusst, partnerschaftlich; Nutzen vor Feature; „du"-Ansprache.
**Don't:** Angst-Marketing („Bußgelder drohen!"), Rechtsberatungs-Ton („Sie müssen …"), Übertreibung, Knappheits-Tricks („nur noch 3 Slots!"), Fachjargon ohne Übersetzung.

---

*Screens zu jeder Station liegen im Figma (CompliHub-360, Page „Landingpages") als Light- und Dark-Variante vor — auf Wunsch als annotierte Klickstrecke für die Kampagnen-Planung.*
