# CompliHub360 · Struktur-Addendum: US C-Corp + deutsche DevCo

**Stand: 09.08.2026 · Addendum zur VAT-Entscheidungsvorlage · Status: Empfehlung zur Beraterprüfung**

> **Kein Rechts-/Steuerberatungs-Ersatz.** Dieses Addendum beschreibt das
> empfohlene Strukturmuster und die Punkte, die ein Berater mit US+DE-Praxis
> verbindlich klären muss.

## 1 · Ausgangslage & Rollen

- **Gründung C-Corp (Delaware)** durch Co-Founder A (USA) — Geschäftsleitung/CEO.
- **Co-Founder B (Deutschland)** — CTO, ausschließlich technische Verantwortung.
- Technische Entwicklung zunächst aus Deutschland, später ggf. Türkei o.a.
- Hosting in der EU (Privacy-Positionierung).

**Kernrisiken dieser Konstellation:** (a) Ort der Geschäftsleitung wandert
faktisch nach Deutschland → deutsche Körperschaftsteuerpflicht der C-Corp;
(b) Scheinselbstständigkeit bei Freelancer-Konstruktion; (c) informelle
(„inoffizielle") Beteiligungsabreden → verdeckte Beteiligung,
Verrechnungspreis-Korrekturen, DD-Risiko.

## 2 · Empfohlene Struktur (Kombination)

### 2.1 Cap Table: Co-Founder B steht offiziell im Gründungsdokument

- **Founder-Shares mit Vesting** (marktüblich 4 Jahre / 1 Jahr Cliff) direkt
  bei Gründung — getrennt von jeder Dienstleistungsbeziehung.
- Kein „Verstecken" des Gründers: die C-Corp meldet ausländische
  ≥25 %-Eigner ohnehin (**Form 5472**; Versäumnis: 25.000 $ Strafe je Filing);
  verdeckte Gründer scheitern spätestens in der Investor-Due-Diligence.
- Privatsteuerlich für B (DE): Dividenden/Exit in DE steuerpflichtig; bei
  späterem Wegzug ggf. Wegzugsbesteuerung → Beraterpunkt.

### 2.2 Leistungserbringung: deutsche DevCo (UG/GmbH), offiziell dokumentiert

Zwei saubere Varianten — beide funktionieren, **keine informelle Mischform**:

| Variante | Eigentum | Charakter |
|---|---|---|
| **B1 · Echte Tochter** | C-Corp hält die GmbH-Anteile | Konzernstruktur, konsolidiert; Verrechnungspreise zwischen verbundenen Unternehmen |
| **B2 · DevCo des Gründers** | Co-Founder B hält die Anteile | unabhängiger Dienstleister mit schriftlichem Entwicklungsvertrag |

**Nicht empfohlen:** GmbH formal unabhängig, wirtschaftlich aber per
Treuhand/Side-Letter der C-Corp zugeordnet („inoffizielle Tochter") —
verdeckte Beteiligung, Steuer- und Haftungsrisiken, DD-Killer.
**Gestuft ist okay, verdeckt nicht.**

### 2.3 Der Entwicklungsvertrag (DevCo ↔ C-Corp)

- **Cost-Plus-Vergütung** (branchenüblich ~5–10 % Aufschlag auf die Kosten) =
  Verrechnungspreis-Standard für Auftragsentwicklung; monatliche Rechnungen.
- **USt:** B2B-Leistung an US-Kunden → in DE nicht steuerbar, Vorsteuerabzug
  der DevCo bleibt erhalten.
- **IP-Assignment:** sämtlicher Code/Arbeitsergebnisse gehen vertraglich auf
  die C-Corp über (inkl. Alt-IP-Einbringung bei Gründung). Ohne lückenlose
  IP-Kette ist die C-Corp in jeder DD wertlos.
- Leistungsbeschreibung: technische Ausführung, **keine
  Geschäftsführungsbefugnis** für die C-Corp.

### 2.4 Geschäftsleitungs-Nachweis (USA)

Board-Beschlüsse, Vertragszeichnungen, strategische Entscheidungen
(Pricing, Partnerschaften, Personal) dokumentiert bei Co-Founder A in den
USA. Faustregel: **Titel schützen nicht — gelebte, dokumentierte Praxis
entscheidet** über den Ort der Geschäftsleitung (§ 10 AO).

### 2.5 Später Türkei / anderes Land

Muster wiederholen: lokale DevCo (oder Sitzverlegung der bestehenden) mit
identischem Vertragswerk. Die Struktur ist bewusst portabel.

## 3 · Warum nicht die Alternativen?

- **Freelancer direkt für die C-Corp:** Ein Auftraggeber + volle Integration
  = Lehrbuchfall **Scheinselbstständigkeit** (Statusfeststellung DRV,
  SV-Nachzahlungen rückwirkend für Jahre). Die GmbH-Zwischenschicht ist die
  etablierte Absicherung.
- **Anstellung bei der C-Corp:** deutsche Arbeitgeber-Registrierung
  (Lohnsteuer/SV) der US-Corp + erhöhtes Betriebsstätten-Risiko.

## 4 · Privacy-Anmerkung (EU-Hosting)

EU-Hosting ist für DSGVO-Praxis und Latenz richtig — aber **kein Schutz vor
US-Behördenzugriff**: Solange die C-Corp Verantwortlicher ist, greift der
**CLOUD Act** unabhängig vom Serverstandort. Nicht mit „Daten sind vor den
USA sicher" werben (irreführend, abmahnbar). Wer das Privacy-Argument voll
ausspielen will, legt die Datenverantwortung in die EU-Einheit
(Variante B1 mit der GmbH als Controller) → Beraterthema.

## 5 · Berater-Checkliste

| # | Punkt | Ziel |
|---|---|---|
| 1 | Ort der Geschäftsleitung: Rollen-/Prozessdokumentation ausreichend? | schriftliche Einschätzung |
| 2 | Variante B1 (Tochter) vs. B2 (Gründer-DevCo) für unseren Fall | Entscheidung |
| 3 | Entwicklungsvertrag: Cost-Plus-Satz, IP-Klauseln, Leistungsbild | Vertragsentwurf |
| 4 | Form 5472 / Delaware Franchise / Federal Filings der C-Corp | Compliance-Kalender |
| 5 | Vergütung Co-Founder B (GmbH-Geschäftsführergehalt vs. Entnahmen) | Gestaltung |
| 6 | Anteile B: DE-Besteuerung, Vesting, ggf. Wegzug | Gestaltung |
| 7 | Datenverantwortung C-Corp vs. EU-Einheit (CLOUD Act / DSGVO-Positionierung) | Entscheidung |
| 8 | Impressum/Legal Pages auf tatsächliche Verantwortliche anpassen · RDG-Absegnung der Risk Map | Umsetzung |
