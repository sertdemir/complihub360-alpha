# **CompliHub360 — Provider Dashboard Pricing and Operations Implementation Specification**

Version: 1.0 · 20. September 2026 · Status: Approved operational specification for implementation

> **Dieses Dokument liegt bewusst nicht in diesem Repository.**
> Es enthält die vollständige Preisliste — Abo-Preise, Lead-Bänder,
> Plan-Rabatte, Guthaben-Sätze und den CPC der Tracked Links. Dieses
> Repository ist öffentlich, und über die Git-Historie ließe sich eine
> Veröffentlichung nicht zurücknehmen. Entscheidung des Nutzers vom
> 2026-09-27.

**Wo es liegt:** im privaten Obsidian-Vault `sertdemir/complihub360-vault`:

- Markdown: `Complihub360/12 Repo-Referenz/GoogleDrive_Docs/Provider Dashboard Pricing & Operations Implementation Specification.md`
- Original: `Complihub360/14 Anhänge/provider-dashboard-pricing-operations-spec-v1.0.docx`
- Einordnung beider Specs: `Complihub360/03 Produkt/Provider-Specs — Verifikation, Dashboard, Pricing.md`

Dieselbe Trennung gilt für den EY Global VAT Guide: Vault ja, Repository nein.

## Was drinsteht — ohne die Zahlen

Damit hier nachlesbar bleibt, *dass* es die Regel gibt, und wo sie steht:

- **Abo-Konfiguration** — Essential, Growth, Global; Kategorie-Kontingente,
  Abrechnungszyklus, Jahres- gegen Monatszahlung.
- **Lead-Bänder und automatische Abrechnung** — vier Bänder mit Standardgebühr.
  Die Gebühr richtet sich nach der Opportunity, **nie nach der Größe des
  Anbieters** („Provider size must never change the standard band"). Die
  Zuordnung Kategorie → Band bleibt konfigurierbar und ist absichtlich nicht
  Repo-Inhalt (Tabelle `lead_band_rules`).
- **Plan-Rabatte auf Lead-Gebühren** — je Abrechnungsmonat eine begrenzte
  Anzahl verbilligter Leads, kein Übertrag, Zähler auf dem Zyklusdatum.
- **Teilnahme, Absage, Guthaben** — Zehn-Minuten-Regel, drei Erinnerungen,
  vierzehn Tage Neubuchungsfrist, Plattform-Guthaben statt Barerstattung.
- **Pflicht-Rabatt für Nutzer** — jeder gematchte Anbieter gewährt einen festen
  Rabatt auf Honorare, unabhängig vom eigenen Abo. Kein Aufblähen des
  Normalpreises, kein Zurückholen über versteckte Gebühren.
- **Blog und Tracked Links** — enthaltene Artikel je Plan, redaktioneller
  Ablauf, ein freigegebener Link je Artikel, Abrechnung je gültigem Klick.
- **Support** — für alle Abos gleich; Grenze zwischen technischem Support und
  den fachlichen Angelegenheiten zwischen Anbieter und Nutzer.
- **Enterprise-API** — nur unter Global, und auch dann nicht automatisch: sie
  braucht eine eigene Freigabe je Anwendungsfall.
- **Analytics und Performance** — das Abo darf die Analyse-Tiefe steuern, aber
  nie die Fakten, die Bewertung oder das Ranking: „Performance, not payment,
  affects ranking."
- **Legal- und Policy-Register** — welche Regel in welches Dokument gehört
  (Partner Agreement, User Terms, Privacy Notice, Lead Fee and Credit Policy,
  Blog and Link Policy, API Terms, Support Policy).

Wie Spec A ist auch dieses Dokument ausdrücklich **keine Vertragssprache**,
sondern eine Umsetzungsvorgabe.
