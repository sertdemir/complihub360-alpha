# CompliHub360 · USt-Handling der Plattform-Rechnungen — Entscheidungsvorlage

**Stand: 09.08.2026 · Status: zur Entscheidung · Vorbedingung für die erste echte Rechnung**

> **Kein Steuerberatungs-Ersatz.** Diese Vorlage strukturiert die Optionen und
> die technische Umsetzung. Die steuerliche Einordnung (insb. Kleinunternehmer-
> Frage und ZM-Pflichten) vor dem Live-Gang einmal vom Steuerberater bestätigen
> lassen.

## 1 · Ausgangslage

CompliHub360 (deutsches Unternehmen) fakturiert **Provider** (= Unternehmen:
Steuerkanzleien, Legal-/Compliance-Dienstleister) über den monatlichen
Stripe-Invoice-Run: Lead-Fees (120 €), Partner-Abos (149 €/M bzw. 1.490 €/J),
Detail-Opens (3 €). Die Leistung ist eine **elektronisch erbrachte
B2B-Dienstleistung** (Plattform-/Vermittlungsleistung). Kundenkreis Phase 1:
DE + EU (IT, ES, NL, …), perspektivisch UK/TR.

Später relevant: **Assistant Pro** (Abo für End-User, auch Verbraucher = B2C)
— ruht als Post-MVP, ändert aber die Steuerlogik, sobald es kommt (→ OSS).

## 2 · Steuerliche Einordnung (B2B-Grundfall)

B2B-Dienstleistungen gelten am **Sitz des Leistungsempfängers** als erbracht
(§ 3a Abs. 2 UStG / Art. 44 MwStSystRL). Daraus ergeben sich drei Kundenklassen:

| Kundenklasse | USt auf unserer Rechnung | Pflichten |
|---|---|---|
| **DE-Provider** | 19 % deutsche USt | normale USt-Voranmeldung |
| **EU-Provider mit USt-IdNr** | 0 % — **Reverse Charge** („Steuerschuldnerschaft des Leistungsempfängers") | USt-IdNr prüfen (VIES) · Hinweis auf Rechnung · **Zusammenfassende Meldung (ZM)** |
| **Drittland (UK/TR/US…)** | nicht steuerbar in DE | ggf. lokale Regeln des Ziellands beobachten |

**Vorfrage an den Steuerberater — Kleinunternehmerregelung (§ 19 UStG):**
Seit 2025 gelten 25.000 € Vorjahres- / 100.000 € laufender Umsatz. Solange
CompliHub darunter liegt, könnte ohne USt fakturiert werden (einfachster
Start), **aber**: kein Vorsteuerabzug (Stripe-Gebühren, Tools, VPS …) und
Wechselaufwand beim Überschreiten. Bei Wachstumsabsicht ist der direkte
Regelbesteuerungs-Start meist sauberer — Entscheidung mit StB.

## 3 · Die Optionen

### Option A — Stripe Tax (automatisiert) · **Empfehlung**

Stripe berechnet Steuern automatisch pro Rechnung: erkennt die Kundenklasse,
**validiert EU-/UK-USt-IdNrn gegen Behörden-Datenbanken**, wendet Reverse
Charge bzw. 19 % automatisch an, setzt die Hinweistexte und überwacht
Registrierungsschwellen in anderen Ländern.

- **Kosten:** 0,5 % **nur auf Transaktionen, in denen Steuer berechnet wird**
  (praktisch: nur DE-Anteil; Reverse-Charge-Rechnungen mit 0 % kosten nichts
  extra). Bei z. B. 10 Providern × ~300 €/Monat, davon die Hälfte DE:
  **~7,50 €/Monat**. Vernachlässigbar.
- **Grenze:** Die USt-IdNr-Prüfung ersetzt keine qualifizierte VIES-Bestätigung
  mit Nachweisprotokoll — für den ZM-nachweispflichtigen Ernstfall einmalig
  pro Provider eine qualifizierte VIES-Abfrage archivieren (Intake-Schritt).
- **ZM bleibt bei uns/StB** (Stripe meldet nicht ans BZSt).

### Option B — Manuell (Stripe Tax Rates + eigene Pflege)

Feste Tax Rates in Stripe (19 % DE / 0 % RC mit Hinweistext), Zuordnung pro
Provider von Hand, USt-IdNr-Prüfung via VIES im Intake-/Vetting-Prozess.

- **Kosten:** 0 € Stripe-Gebühr — dafür laufende Pflege und Fehlerrisiko
  (falsche Klasse = falsche Rechnung), Schwellen-Überwachung manuell.
- Bei aktuell 4 Demo- und einer Handvoll Phase-1-Providern beherrschbar,
  skaliert aber schlecht und spart real fast nichts (s. o. ~7,50 €/M).

### Option C — Aufschieben

Nur haltbar, solange ausschließlich Sandbox-Rechnungen existieren. **Mit der
ersten echten Rechnung nicht mehr zulässig** — eine Rechnung ohne korrekten
USt-Ausweis/RC-Hinweis ist formal fehlerhaft (§ 14 UStG).

## 4 · Technische Umsetzung bei uns (gilt für A und B)

1. **USt-IdNr + Rechnungsland im Provider-Intake** als Pflichtfelder
   (+ `providers.vat_id`, `providers.billing_country`), im Vetting einmalig
   qualifizierte VIES-Prüfung archivieren.
2. **Stripe-Customer anreichern:** `tax_ids` (USt-IdNr) + Adresse — Basis für
   RC-Erkennung und den Pflichttext auf der Rechnung.
3. **Eigene USt-IdNr** im Stripe-Konto hinterlegen (erscheint auf Rechnungen).
4. **Nur Option A:** `automatic_tax` im Invoice-Run aktivieren + den
   Restricted Key um die **Tax-Berechtigungen** erweitern (bewusst noch nicht
   vergeben).
5. Aufwand: Punkte 1–3 ≈ ein überschaubarer PR (Intake-Feld, Migration,
   Customer-Sync im Billing-Run); Punkt 4 ≈ wenige Zeilen.

## 5 · Radar: E-Rechnungspflicht Deutschland (B2B)

- **Empfang** von E-Rechnungen: für alle Unternehmen **seit 01.01.2025 Pflicht**
  (betrifft uns als Empfänger von Lieferanten-Rechnungen).
- **Ausstellung**: ab 2027 Pflicht für Unternehmen > 800 T€ Vorjahresumsatz,
  **ab 01.01.2028 für alle** (EN-16931-Format: XRechnung/ZUGFeRD).
- Konsequenz: Stripe-PDF-Rechnungen an DE-Provider sind **bis Ende 2027**
  zulässig (wir liegen unter 800 T€). Bis dahin braucht es einen
  EN-16931-Pfad (Stripe-Partner-App oder Export an StB-Software). **Watch-Item,
  keine heutige Entscheidung.**

## 6 · Empfehlung & Checkliste

**Empfehlung: Option A (Stripe Tax)** — bei unserem Volumen kostet die
Automatisierung Centbeträge und eliminiert die fehleranfälligste Stelle
(Kundenklassen-Zuordnung). Kombiniert mit USt-IdNr-Pflicht im Intake.

| # | Schritt | Wer |
|---|---|---|
| 1 | StB-Termin: Kleinunternehmer ja/nein · ZM-Turnus · Voranmeldung | User |
| 2 | Eigene USt-IdNr beantragen (falls noch nicht vorhanden) + in Stripe hinterlegen | User |
| 3 | Stripe Tax im Dashboard aktivieren (Einstellungen → Tax) | User |
| 4 | Restricted Key um Tax-Berechtigungen erweitern | User (2 Klicks) |
| 5 | Intake + Migration + Customer-Sync + `automatic_tax` im Run | Claude (PR) |
| 6 | Test in der Sandbox: DE-Provider (19 %) + IT-Provider mit USt-IdNr (RC-Text) | Claude |

## Quellen

- Stripe Tax Pricing (0,5 % nur bei berechneter Steuer): stripe.com/tax/pricing
- Stripe Tax × Invoicing, Tax-IDs & Reverse Charge: docs.stripe.com/tax/invoicing/tax-ids
- Stripe Tax EU (RC-Anwendung bei USt-IdNr): docs.stripe.com/tax/supported-countries/european-union
- E-Rechnungspflicht Fristen 2025/2027/2028: e-rechnungen.org/e-rechnung-pflicht-fristen · IHK Frankfurt
