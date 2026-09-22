---
title: "Provider Phase 1 — Pricing v2 (Pläne, Lead-Bänder, Ledger, Neutralität)"
assignee: "Claude"
status: "review"
---

# Provider Phase 1 — Pricing v2

Zweite Phase des Provider-Plans. Grundlage: Spec B *Provider Dashboard
Pricing and Operations* v1.0, Entscheidung des Nutzers vom 2026-09-22 (Spec B
ersetzt Pricing Phase 1 vollständig, in USD). Begründung:
[ADR-0003](../../docs/decisions/ADR-0003-provider-pricing-v2.md).

## Objective

1. Die Preise aus Spec B als **Konfiguration** mit Version und Gültigkeit —
   nicht als Konstanten im Code.
2. Die Regeln (Band, Rabatt, Jahrespreis, Kontingent, regulierte Berufe) als
   reine Funktionen mit Tests.
3. Ein Ledger, in das Phase 4 schreibt: append-only, alle Audit-Felder aus
   Spec B.
4. Der Beweis, dass das Abo nie ins Ranking kommt — als Test, nicht als
   Kommentar.
5. Die alte Doku mit bezahltem Ranking-Vorrang korrigiert (DNA gewinnt).

## Acceptance Criteria

- [x] Migration `20260923000000_provider_pricing_v2.sql`: `plan_catalog` (3 Pläne, Jahr = 10 Monate), `provider_subscriptions` (ein offenes Abo je Anbieter), `lead_band_config` (4 Bänder), `lead_band_rules` (leer), `lead_fee_eligibility` (Legal Support AUS), `provider_lead_ledger` (append-only per Trigger) + Zahlungs-Ereignisspur, `provider_credits`, `provider_discount_counter`; alles deny-all RLS.
- [x] pgTAP `04_provider_pricing_test.sql` (28 Checks): Zahlen, Jahrespreis, Unique-Abo, Ledger-Unveränderlichkeit, Legal Support, anon liest nichts, View hängt von keiner Pricing-Tabelle ab (`pg_depend`).
- [x] `billing.ts` neu: `annualPriceCents`, `computeLeadBand`, `applyMonthlyDiscount`, `categoryAllowanceCheck`, `leadFeeEnabled`, `subscriptionChargeForPeriod`, `quoteLeadFee`; `PRICING`-Konstanten, Detail-Open-Gebühr und Gratis-Leads entfernt. 28 Tests.
- [x] `POST /admin/billing/run` stellt nur noch die Abo-Zeile aus; `GET /provider/:key/billing/preview` liefert Plan, Kontingent, Ledger-Summen, Guthaben, Preisliste.
- [x] Neutralitäts-Guard in `api.test.ts`: identische Anbieter mit Essential/Global → gleicher Score; Planwechsel ändert die Reihenfolge nicht; kein Plan-Feld auf dem Draht.
- [x] UI: `BillingPage` zeigt Plan, Kontingent (genutzt/offen), Standard → Rabatt → Endbetrag, Guthaben; Beträge mit Währung (`money()`); Locales in 4 Sprachen; `VerifiedProviderBadge` ohne Gold/Platinum.
- [x] ADR-0003; `pricing-benchmarks-2026-08.md` als abgelöst markiert; Korrekturvermerke in `Monetization Model` §2.3, `Search & Ranking Logic` §5.3/§8/§10, `Provider Flows` §8, `user-flow-matchmaking-v2-spec` §6.
- [x] OpenAPI ergänzt.

## DNA-Check

Betroffen: Monetarisierung (Pläne, Rabatte, Lead-Bänder), Ranking und Matching
(Neutralität), Provider-Policies (regulierte Berufe), Copy (Billing-Untertitel).

- **Fairness zwischen Providern:** Das Band folgt der Opportunity, nie der
  Größe oder dem Plan; `computeLeadBand` nimmt gar keinen Anbieter als
  Eingang. Das Abo kann das Ranking nicht kaufen — zwei Tests halten das
  fest (pgTAP über `pg_depend`, API-Test über Score und Reihenfolge).
- **Ohne Transaktion dieselbe Empfehlung:** Die Suche weiß nichts vom Plan;
  auf dem Draht steht kein Plan-Feld.
- **Gleicher Respekt für kleine Unternehmen:** Für regulierte Berufe fällt
  die Lead-Gebühr weg, statt sie in Grauzonen zu erheben; Support ist in
  jedem Plan gleich.
- **Vertrauen stärken:** Vier Stellen der eigenen Doku versprachen Partnern
  bezahlten Vorrang. Sie sind korrigiert, nicht gelöscht — mit Datum und
  Verweis. Der neue Billing-Untertitel sagt dem Provider ausdrücklich: „Your
  plan never affects your ranking."

Keine DNA-Spannung festgestellt. Blog/CPC (Spec B) bleibt ausgeklammert bis
zur eigenen Klärung.

## Nicht in diesem Ticket

- Belastung der Karte, Schreiben ins Ledger, Rabattzähler hochzählen →
  Phase 4 (Buchung). Bis dahin zeigt die Vorschau bei Leads Nullen.
- Durchsetzung des Kategorie-Kontingents beim Anlegen/Veröffentlichen von
  Leistungen → Phase 2 (es gibt noch keine Service-Endpoints).
- Umzug der Bestandsabos (`providers.subscription_plan`) → Admin je Anbieter.
- Self-Service-Planwahl, Proration, Kündigung, Retry → konfigurierbar, offen.
- Band-Zuordnung Kategorie/Land → `lead_band_rules`, liefert das Business.

## Verifikation

- `npm run db:test` → 5 Dateien, 98 Tests.
- `compliance-api`: 150 Tests (28 Billing, 2 Neutralität).
- `typecheck`, `build`, `i18n:check`, `terminology:check`, `tokens:check`, UI-Tests, E2E.
