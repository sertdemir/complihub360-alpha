# CompliHub360 · VAT/USt-Handling der Plattform-Rechnungen — Entscheidungsvorlage

**Stand: 09.08.2026 (rev. 2 — korrigiert auf US-Entity) · Status: zur Entscheidung · Vorbedingung für die erste echte Rechnung**

> **Kein Steuerberatungs-Ersatz.** CompliHub360 ist eine Gesellschaft mit
> Hauptsitz **USA/Delaware**. Diese Vorlage strukturiert Optionen und Umsetzung;
> die Einordnung gehört vor dem Live-Gang zu einem Berater mit US+EU-Praxis.
> **Frage Nr. 1 dort: begründet die operative Tätigkeit aus Deutschland eine
> „feste Niederlassung" (fixed establishment) im USt-Sinn?** Falls ja, kippt
> die gesamte Logik zurück Richtung deutscher Registrierung.

## 1 · Ausgangslage

CompliHub360 **(US/Delaware, Annahme: keine EU-Betriebsstätte — zu bestätigen)**
fakturiert **Provider** (B2B: Steuerkanzleien, Legal-/Compliance-Dienstleister)
via monatlichem Stripe-Invoice-Run: Lead-Fees (120 €), Partner-Abos (149 €/M
bzw. 1.490 €/J), Detail-Opens (3 €) — elektronisch erbrachte
B2B-Dienstleistungen, fakturiert in EUR. Kundenkreis Phase 1: DE + EU,
perspektivisch UK/TR. Später: **Assistant Pro** (B2C-Abo für End-User, ruht).

## 2 · Steuerliche Einordnung (US-Entity ohne EU-Niederlassung)

**Die gute Nachricht: der reine B2B-Fall ist einfacher als beim DE-Szenario.**
B2B-Dienstleistungen gelten am Sitz des Leistungsempfängers als erbracht
(Art. 44 MwStSystRL); bei einem Drittlands-Anbieter schuldet der
EU-Geschäftskunde die Steuer selbst:

| Kundenklasse | USt auf unserer Rechnung | Mechanik |
|---|---|---|
| **DE-Provider** | **0 % — Reverse Charge** (§ 13b UStG) | DE-Kunde versteuert selbst (und zieht Vorsteuer) — KEINE deutsche USt-Registrierung nötig |
| **EU-Provider (andere Länder)** | **0 % — Reverse Charge** (Art. 196 MwStSystRL) | analog; Nachweis der Unternehmereigenschaft via USt-IdNr |
| **UK-Provider** | 0 % — Reverse Charge (UK-Regelung) | analog |
| **US-Kunden (später)** | State Sales Tax je Bundesstaat | Delaware selbst: keine Sales Tax; Economic-Nexus-Schwellen anderer Staaten beobachten |

Entfällt gegenüber rev. 1: deutsche USt-Voranmeldung, **ZM** (nur für
EU-ansässige Leistende) und die **Kleinunternehmerfrage** (§ 19 UStG gilt nur
für inländische Unternehmer).

**Pflicht bleibt:** Die **Unternehmereigenschaft des Kunden belegen** — sonst
gilt er als Verbraucher und es greifen B2C-Regeln (→ § 3). Praktisch: USt-IdNr
im Intake erheben + validieren und auf der Rechnung den RC-Hinweis führen
(für DE-Kunden ideal mit „Steuerschuldnerschaft des Leistungsempfängers,
§ 13b UStG").

## 3 · Die zwei echten Risiken

**a) Feste Niederlassung in DE (die Gretchenfrage).** Wird die Plattform
faktisch aus Deutschland betrieben (Personal, Infrastruktur, Entscheidungen),
kann eine feste Niederlassung vorliegen — dann wären Leistungen ggf. deutsch
zu versteuern (19 % an DE-Kunden, Registrierung, Voranmeldung). Das ist
Sachverhalts-, nicht Softwarefrage → **Beraterklärung vor Live-Gang, schriftlich.**

**b) B2C (Assistant Pro).** Elektronische Leistungen eines
Drittlands-Anbieters an EU-Verbraucher sind **ab dem ersten Euro** im
Verbrauchsland steuerpflichtig — Registrierung via **Non-Union-OSS** (ein
EU-Mitgliedstaat als Anlaufstelle) nötig, BEVOR der erste EU-Consumer zahlt.
Assistant Pro darf also nicht „einfach angeschaltet" werden; das ist der
Moment, in dem Stripe Tax von nice-to-have auf notwendig springt.

## 4 · Die Optionen

### Option A — Stripe Tax (automatisiert) · **Empfehlung**

- Erkennt B2B (USt-IdNr, Validierung gegen VIES/HMRC-Datenbanken) und wendet
  Reverse Charge/Zero-Rating samt Hinweistexten automatisch an; überwacht
  Registrierungsschwellen (EU-B2C, US-States, UK …).
- **Kosten: praktisch 0 € in Phase 1** — die 0,5 % fallen nur an, wo Steuer
  berechnet wird; im reinen RC-B2B-Betrieb wird keine berechnet.
- Wert: Absicherung der B2B-Klassifizierung heute + fertige Schiene für
  B2C/US-Nexus morgen.
- Grenze: ersetzt nicht die qualifizierte VIES-Bestätigung mit
  Nachweisprotokoll (einmalig pro Provider im Vetting archivieren).

### Option B — Manuell

Alle Rechnungen 0 % mit RC-Hinweis, USt-IdNr-Prüfung im Intake, Schwellen
selbst beobachten. Im reinen B2B-Betrieb vertretbar (alle Rechnungen sehen
gleich aus) — aber ohne Sicherheitsnetz gegen die B2C-/Nexus-Falle und ohne
automatische ID-Validierung.

### Option C — Aufschieben

Nur bis zur ersten echten Rechnung. Auch eine RC-Rechnung braucht die
formal korrekten Angaben (Hinweistext, IDs) ab Rechnung Nr. 1.

## 5 · Technische Umsetzung bei uns

1. **USt-IdNr + Rechnungsland als Pflichtfelder im Provider-Intake**
   (+ `providers.vat_id`, `billing_country`); qualifizierte VIES-Prüfung im
   Vetting archivieren. **B2B-Nachweis ist jetzt die tragende Säule.**
2. **Stripe-Customer anreichern**: `tax_ids` + Adresse → RC-Erkennung + Pflichttext.
3. **US-Entity-Daten im Stripe-Konto** (Live-Aktivierung muss auf die
   Delaware-Gesellschaft laufen — Adresse/EIN; das aktuelle Sandbox-Konto ist
   davon unabhängig).
4. Nur Option A: `automatic_tax` im Invoice-Run + Tax-Berechtigungen im
   Restricted Key.
5. Aufwand unverändert: ein überschaubarer PR + Sandbox-Test.

## 6 · Empfehlung & Checkliste

**Empfehlung: Option A** — in dieser Konstellation quasi kostenlos (reiner
RC-Betrieb = keine 0,5 %-Gebühr) und gleichzeitig die Versicherung gegen die
beiden echten Risiken (Niederlassungs-Kippschalter, B2C-Start).

| # | Schritt | Wer |
|---|---|---|
| 1 | Berater (US+EU): feste Niederlassung DE ja/nein — **schriftlich** · US-Steuerpflichten (Delaware Franchise, Federal) | User |
| 2 | Stripe-Live-Konto auf die Delaware-Entity aktivieren (EIN, US-Adresse) | User |
| 3 | Stripe Tax aktivieren + Tax-Berechtigungen im Restricted Key | User |
| 4 | Intake-Felder + Migration + Customer-Sync + `automatic_tax` im Run | Claude (PR) |
| 5 | Sandbox-Test: DE-Provider (RC § 13b-Text) + IT-Provider (RC) + Kunde ohne USt-IdNr (Fehlerpfad) | Claude |
| 6 | Vor Assistant-Pro-Aktivierung: Non-Union-OSS-Registrierung | User (mit Berater) |

## Quellen

- Stripe Tax Pricing (0,5 % nur bei berechneter Steuer): stripe.com/tax/pricing
- Stripe Tax × Invoicing, Tax-IDs & Reverse Charge: docs.stripe.com/tax/invoicing/tax-ids
- Stripe Tax EU (RC bei USt-IdNr, Non-Union-Fälle): docs.stripe.com/tax/supported-countries/european-union
- MwStSystRL Art. 44/196 (B2B-Leistungsort/RC) · § 13b UStG (RC bei Drittlands-Leistendem)
