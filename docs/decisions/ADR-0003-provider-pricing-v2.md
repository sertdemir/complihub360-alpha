# ADR-0003: Provider Pricing v2 — Pläne, Lead-Bänder, und das Abo ist nie ein Ranking-Merkmal

**Status:** ACCEPTED
**Date:** 2026-09-22
**Bezug:** *Provider Dashboard Pricing and Operations Implementation Specification* v1.0 (09/2026, „Spec B") · *Provider Verification and Dashboard Implementation Specification* v1.0 (20.09.2026, „Spec A") · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §3 · ADR-0002
**Löst ab:** den Beschluss vom 2026-08-09 in [`docs/pricing/pricing-benchmarks-2026-08.md`](../pricing/pricing-benchmarks-2026-08.md) („Pricing Phase 1")

## Context

Seit dem 09.08.2026 rechnete die Plattform nach *Pricing Phase 1*: Partner-Abo 149 €/Monat oder 1.490 €/Jahr, 120 € je Lead, die ersten zwei Leads gratis, 3 € je Detail-Öffnung mit Deckel 50 €/Monat, alles in EUR über eine monatliche Stripe-Sammelrechnung. Das war eine Ableitung aus Marktvergleichen, kein Produktbeschluss.

Spec B legt das Modell jetzt fest — und anders:

| | Phase 1 (09.08.) | Spec B (09/2026) |
|---|---|---|
| Pläne | ein Abo | Essential $59 · Growth $99 · Global $189 je Monat; Jahr = zehn Monate |
| Lead-Gebühr | 120 € flat, 2 gratis | vier Bänder nach **Opportunity**: $99 / $149 / $299 / $499 |
| Rabatte | 1 Lead/Monat im Abo | Growth 10 % auf die ersten 3, Global 15 % auf die ersten 6 Leads je Zyklus, kein Rollover |
| Detail-Öffnung | 3 €, gedeckelt | **keine Gebühr**; Klicks nach bezahlter Buchung kosten nie etwas |
| Kategorien | unbegrenzt | Hauptkategorie ist die abo-kontrollierte Einheit: 1 / bis 5 / alle |
| Belastung | Monatsrechnung | Karte bei der Buchung, Guthaben statt Rückzahlung |
| Währung | EUR | USD |

Dazu kommt ein Widerspruch in der eigenen Doku: `GoogleDrive_Docs/Monetization Model (Deep Dive).md` §2.3, `Search & Ranking Logic.md` §5.3/§8/§10, `Provider Flows (Complete).md` §8 und `docs/backlog/user-flow-matchmaking-v2-spec.md` §6 beschreiben, dass zahlende Partner im Ranking bevorzugt werden („priority ranking", „sponsored placements", „partner boost"). Das widerspricht der DNA (§3: *Quality before brand recognition*, Decision Filter: *Fairness zwischen Providern*), Spec A §14 („Subscription tier … must not improve organic ranking") und Spec B („Ranking benefit: Never"). Nach ADR-0002 gewinnt die DNA; die Stellen sind zu korrigieren, nicht zu umgehen.

## Decision

1. **Spec B ersetzt Pricing Phase 1 vollständig, in USD.** Die Gebühr je Detail-Öffnung und die Gratis-Leads entfallen ersatzlos. Das Ereignis `provider_detail_opened` bleibt als Analytik, es wird nicht mehr abgerechnet. (Entscheidung des Nutzers, 2026-09-22.)

2. **Preise sind Konfiguration, nicht Code.** `plan_catalog`, `lead_band_config`, `lead_band_rules` und `lead_fee_eligibility` tragen Version und Gültigkeitsdatum. `billing.ts` enthält nur die Regeln — als reine Funktionen mit Tests. Die Zuordnung Kategorie/Land/Komplexität → Band ist beim Start **leer** (Default Band 1); sie liefert das Business, nicht der Code.

3. **Das Abo ist nie ein Ranking-Merkmal.** Keine der Pricing-Tabellen darf in `matchable_provider_services` oder in den Scorer. Zwei Tests halten das fest: pgTAP prüft über `pg_depend`, dass die View von keiner Pricing-Tabelle abhängt; ein API-Test prüft, dass bis auf den Plan identische Anbieter denselben Score bekommen und ein Planwechsel die Reihenfolge nicht ändert. Auf dem Draht der Suche steht kein Plan-Feld.

4. **Lead-Gebühren sind je Kategorie × Land schaltbar und für regulierte Berufe AUS.** Legal Support startet ohne Gebühr (u. a. § 49b Abs. 3 BRAO), bis die Rechtsberatung je Land freigibt (Spec A §21). Das ist eine Ausnahmeliste, kein Flag am Anbieter.

5. **Das Ledger ist append-only.** Jede Lead-Belastung ist eine Zeile mit allen Audit-Feldern aus Spec B; UPDATE und DELETE scheitern per Trigger. Korrekturen und Guthaben sind neue Zeilen, die auf die Ursprungszeile zeigen; der Zahlungsstatus wandert als Ereignisspur.

6. **Der Rabattzähler hängt am Anbieter und am Zyklus, nicht am Abo.** Ein Planwechsel im Zyklus findet den Zähler vor und kann das Kontingent nur bis zur eigenen Grenze ausschöpfen — nie von vorn (Spec B: „A plan change must not generate duplicate discounted allowances").

7. **Es gibt genau eine Verified-Stufe.** Die Tiers Gold und Platinum in `VerifiedProviderBadge` werden entfernt: Verifikation ist ein Fakt, keine kaufbare Stufe, und kein Plan darf wie ein Rang aussehen.

8. **Die widersprechende Doku wird korrigiert**, nicht gelöscht: Die vier Stellen bekommen einen datierten Korrekturvermerk mit Verweis auf diesen ADR, damit die Historie lesbar bleibt.

## Consequences

- `providers.subscription_plan` / `subscription_since` sind abgelöst und werden von nichts mehr gelesen. **Kein automatischer Umzug** von Bestandsabos: Welchem der drei Pläne ein Phase-1-Abo entspricht, sagt die Spec nicht; das entscheidet der Admin je Anbieter (Staging: vier Anbieter).
- Die Monatsrechnung (`POST /admin/billing/run`) stellt nur noch die **Abo-Zeile** aus. Leads werden je Buchung belastet — das ist Phase 4; bis dahin schreibt niemand ins Ledger, und die Vorschau zeigt Nullen. Sichtbar leer ist besser als unsichtbar falsch.
- Das Kategorie-Kontingent (`categoryAllowanceCheck`) existiert als Regel mit Tests, hat aber noch keine Durchsetzungsstelle: Es greift, sobald Leistungen angelegt oder veröffentlicht werden (Phase 2) und beim Planwechsel.
- Offen und konfigurierbar, ohne Code-Änderung: Band-Zuordnung, Proration, Kündigungsfrist, Kulanzzeit, Zahlungs-Retry, Freigabe der Lead-Gebühr je regulierter Beruf und Land.
- Blog-Artikel und CPC (Spec B) sind **nicht** Teil dieses Beschlusses. `included_blog_articles` wird gespeichert, wirkt aber nicht — Phase 8 bleibt blockiert, bis die DNA-Frage (bezahlte Sichtbarkeit auf einer Wissensplattform) mit dem Menschen geklärt ist.
- Die Rechnungs-UI zeigt jetzt Plan, Kontingent (genutzt/offen), Standardgebühr → Rabatt → Endbetrag und Guthaben. Die Beträge tragen ihre Währung; Alt-Rechnungen aus Phase 1 bleiben in EUR lesbar.

## DNA-Check

Betroffen: Monetarisierung (Pläne, Rabatte, Lead-Bänder), Ranking (Neutralität), Provider-Policies (regulierte Berufe).

- **Wahrt es die Fairness zwischen Providern?** Ja — das Band folgt der Opportunity, nie der Größe oder dem Plan des Anbieters; ein Solo-Anbieter zahlt für denselben Lead dasselbe wie ein Konzern. Und das Abo kann das Ranking nicht kaufen, das ist getestet, nicht nur behauptet.
- **Würden wir diese Empfehlung auch ohne Transaktion geben?** Ja — die Ergebnisliste weiß nichts vom Plan; was sie zeigt, ist dasselbe, ob ein Anbieter zahlt oder nicht.
- **Bekäme ein kleines Unternehmen denselben Respekt wie ein Enterprise?** Ja — Support ist in jedem Plan gleich, und für regulierte Berufe fällt die Lead-Gebühr weg, statt sie in Grauzonen zu erheben.
- **Stärkt es das Vertrauen der User, statt es auszugeben?** Ja — die alte Doku versprach Partnern bezahlten Vorrang. Dass das jetzt ausdrücklich nicht gilt und geprüft wird, ist der Teil dieser Entscheidung, der beim User ankommt.
