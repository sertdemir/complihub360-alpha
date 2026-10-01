# ADR-0005: Buchung → Bestätigung → Belastung → Offenlegung

**Status:** ACCEPTED
**Date:** 2026-10-01
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Booking confirmation and data handover" (Schritte 1–6), „Lead pricing and automatic charging", „Monthly subscription discounts", „Mandatory CompliHub360 user discount", „Lead fee audit fields" · *Spec A* §20 (Pricing Snapshot), §21 (Billing Readiness), §21.1 (Legal configuration) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §1, §3, §6 · ADR-0003 (Pricing v2) · ADR-0004 (Punkt 7)
**Entscheidungen des Nutzers (2026-10-01):** sofort belasten (PaymentIntent off-session) · Karte über das Billing-Portal, Readiness-Sync in der API · Fehlerfall ohne Buchung, neutral benannt

## Context

Seit Phase 3 versprach `POST /scheduling` „Buchung ist der bezahlte Lead" und löste die Identität auf. Beim Inventar für Phase 4 zeigte sich, dass das Versprechen nicht eingelöst war:

- **Die „Belastung" war ein Flag.** `lead_charged: true` und ein Event `provider_lead_charged`; nichts berührte `provider_lead_ledger`, `provider_discount_counter`, `quoteLeadFee` oder Stripe. Das Ledger aus Phase 1 hatte alle Audit-Felder und keinen Schreiber.
- **Niemand setzte `billing_ready`.** Die Spalte existierte seit dem 20.09., `bookable_chargeable` war überall falsch; auf Staging antwortete jede echte Buchung 409 `BILLING_NOT_READY`, ohne dass ein Anbieter erfuhr, warum.
- **Die Nutzerseite bestätigte nichts.** Spec B verlangt eine Bestätigung mit Fassung („the user confirms the booking and acknowledgement version"), die nennt, was fließt und dass der Anbieter nachfassen darf — auch wenn der Nutzer nicht mehr antwortet. Der Plan hatte das als DNA-Spannung markiert: offen nennen, nicht im Kleingedruckten.
- **`price_snapshot`, `shared_fields`, `sharing_confirmed_at` blieben leer.** Die Tests „Audit record" und „Data minimization" der Acceptance-Checklist waren damit unbeweisbar.
- **Der 10 %-Nutzerrabatt stand nirgends.** Spec B: auf jedem Lead anzeigen, Anbieter bestätigt Angebot und Rabatt; wiederkehrende Leistungen bleiben Konfiguration bis zur Rechtsprüfung.
- **Stripe lag in drei Kopien** (`billing.ts`, `assistant.ts`, Portal-Route), ohne Idempotency-Key und ohne Fehlertyp, der Karte von Stripe unterscheidet.

Drei Fragen ließ die Spec offen, und an ihnen unterscheidet sich die Arbeit materiell: wie belasten, wie die Karte hinterlegen, was bei Scheitern.

## Decision

1. **Sofort belasten, synchron, kein Webhook.** Ein PaymentIntent off-session mit `confirm=true` auf das Default-Zahlungsmittel des Stripe-Kunden. Das Ergebnis liegt in derselben Anfrage vor und entscheidet, ob es eine Buchung gibt. Spec B sagt „charges the provider's card on file"; die Gebühr bleibt auch bei No-Show (Phase 5 regelt Guthaben), also gibt es nichts, was ein späterer Einzug besser könnte. `requires_action` (SCA) kann off-session niemand beantworten und zählt als Kartenfehler.

2. **Ledger vor Stripe; der Idempotency-Key ist die Ledger-ID; die Buchung zeigt auf das Ledger.** `chargeLeadFee` schreibt die Ledger-Zeile (`pending`, `booking_id NULL`), ruft Stripe mit `Idempotency-Key = ledger.id`, schreibt das Zahlungsereignis (`captured` | `failed`). Erst danach entsteht die Buchung mit `scheduling.lead_ledger_id`. Die Richtung ist zwingend: das Ledger ist append-only (ADR-0003 §5) und kann keine `booking_id` nachtragen; ein Wiederholungsversuch mit demselben Key ist dieselbe Belastung, keine zweite. `provider_lead_ledger.booking_id` bleibt bei Buchungs-Charges NULL.

3. **Scheitert die Karte, gibt es keine Buchung.** Kein Termin, keine Offenlegung, kein Zähler, der Slot bleibt frei. Der Nutzer liest 409 `BOOKING_NOT_COMPLETED` mit Grund `provider_billing` und einem Satz ohne Decline-Code („das liegt nicht an Ihnen"); der Anbieter bekommt `payment_failed` (Benachrichtigung, Mail ohne Nutzeridentität), `billing_ready = false` mit Grund `payment_failed` und `last_payment_failure`. Der Grund verschwindet, wenn das Default-Zahlungsmittel ein anderes ist — dieselbe Karte bleibt gesperrt. Scheitert Stripe selbst (Netz, 5xx), antwortet 502 `BILLING_ERROR`, und `billing_ready` bleibt unberührt: das ist nicht die Schuld des Anbieters.

4. **Die Bestätigung des Nutzers ist versionierte Konfiguration.** `booking_acknowledgements` trägt eine Fassung je Sprache mit derselben Kennung, `effective_from` und der Liste `shared_fields`. `GET /acknowledgement` liefert sie öffentlich; `POST /scheduling` verlangt `acknowledgement_version` und antwortet 409 `ACKNOWLEDGEMENT_OUTDATED` mit der gültigen Fassung, wenn sie nicht stimmt. Die Buchung speichert Fassung, `shared_fields` und `sharing_confirmed_at`; das Event `lead.revealed` trägt dasselbe. Der Text nennt die beidseitige Offenlegung, die drei geteilten Felder, das Follow-up-Recht auch bei Schweigen des Nutzers, und den Rabatt.

5. **Die Opportunity kommt aus der Sitzung des Nutzers, begrenzt auf das Angebot.** Bereich und Länder aus `sessions.categories/markets` (oder ausdrücklich im Body), geschnitten mit den View-Zeilen des Anbieters. Der Bereich MUSS einer sein, den der Anbieter anbietet — sonst würde `leadFeeEnabled` einen Legal-Support-Anbieter über einen fremden Bereich gebührenpflichtig machen. Das Band kennt weiter weder Plan noch Größe; ein Test hält fest, dass Essential und Global für dieselbe Opportunity dasselbe Band und dieselbe Standardgebühr bekommen.

6. **Der 10 %-Nutzerrabatt ist Policy, nicht Code.** `user_discount_policy` (v1: 10 %, `recurring_treatment = 'undecided'` — Entscheidung Nr. 6 des Plans bleibt offen). Die Buchung friert `user_discount_pct` und die Policy-Version ein; der Anbieter sieht die Pflicht an jedem Lead und bestätigt per `PATCH /provider/:key/bookings/:id/proposal` „Angebot erstellt" und „Rabatt gezeigt" (`lead_proposal_reports`, eine Zeile je Buchung, Korrektur per Upsert, Historie im Protokoll).

7. **Die Zahlungsbereitschaft wird berechnet, nicht gesetzt — und nie im Buchungspfad.** `billingReadiness()` (rein) kennt die sechs §21.1-Gründe plus `payment_failed`; `syncBillingReadiness` sammelt die Eingaben aus Stripe (Default-Zahlungsmittel, Rechnungsdaten), Abo, `billing_authorization`-Annahme, überfälligen Rechnungen und `last_payment_failure` und schreibt `billing_ready`, `billing_block_reasons`, `billing_synced_at`. Auslöser: `POST /provider/:key/billing/sync` (Rückweg aus dem Portal mit `?from=portal`, Knopf) und der Watcher (`runBillingReadinessTick`, Shadow zuerst). Die Buchung liest den Zustand nur; fehlt das Zahlungsmittel, stößt sie den Sync an und antwortet 409, ohne eine Ledger-Zeile zu schreiben.

8. **Ein Stripe-Modul.** `stripe.ts` bündelt `stripeRequest` (Idempotency-Key, `StripeError` mit Kartenkennzeichen), `ensureStripeCustomer`, `getCustomerBilling`, `createPaymentIntent`, `refundPaymentIntent`. Abo-Rechnungen, Checkout und Portal laufen darüber; der API-Test ersetzt das Modul als Ganzes und berührt `globalThis.fetch` nicht.

9. **Kompensation statt Hoffnung.** Scheitert der Buchungs-Insert nach erfolgreicher Belastung (Unique Index `scheduling_confirmed_slot_uq` bei gleichzeitiger Buchung, DB-Fehler), wird der PaymentIntent erstattet, das Ereignis `refunded` geschrieben, `lead_charge_reversed` protokolliert; der Nutzer liest 409 `SLOT_TAKEN`. Scheitert die Erstattung selbst, steht `lead_charge_reversed_failed` im Protokoll — ein Fall für den Admin, kein stiller.

## Consequences

- `scheduling` trägt nach jeder Buchung `price_snapshot`, `shared_fields`, `sharing_confirmed_at`, `acknowledgement_version`, `lead_ledger_id`, `user_discount_pct`. Die Checklisten-Tests „Audit record" und „Data minimization" sind beweisbar: `shared_fields` ist dieselbe Liste, die die Fassung nennt (pgTAP 09 und API-Test halten das fest).
- Der Nutzer-Draht trägt kein Band, keine Gebühr, kein Ledger, kein Stripe-Feld (Leak-Guard-Test). `user_discount {pct, policy_version}` ist das einzige Geldwort, das ihn erreicht — es ist sein Rabatt.
- `handleBillingPreview` zählt nur Ledger-Zeilen mit wirksamem Status `captured` oder `n/a`; gescheiterte stehen im Ledger, nicht in der Summe. Die Antwort trägt `readiness`.
- Der erste Live-Tick des Readiness-Watchers setzt jeden Anbieter ohne Karte, Abo oder Mandat auf `billing_ready = false`. Auf Staging sind das heute alle vier. Das ist gewollt und sichtbar zu machen: Shadow zuerst, dann die Anbieter über das Portal und `billing/sync` nachziehen.
- Der Restricted Key auf Staging braucht zusätzlich `payment_intents: write`, `customers: read`, `refunds: write` (`docs/stripe-setup.md`). Ohne sie antwortet die erste Buchung 502 `BILLING_ERROR` — ehrlich, aber rot.
- Zwei ältere Dokumente widersprechen Spec B und tragen jetzt eine Korrekturnotiz: `docs/backlog/user-flow-matchmaking-v2-spec.md` §8 (separater `/confirm`-Schritt) und `GoogleDrive_Docs/Addendum — Dossier Handover & Anonymization` §4 („nach Bestätigung durch den Anbieter").

## Offen (benannt, nicht gelöst)

- **Orphan-Charge bei Timeout.** Antwortet Stripe nicht, obwohl der PaymentIntent gelang, bekommt der Wiederholungsversuch einen neuen Ledger-Key. `metadata.ledger_id` am PaymentIntent ist der Anker für eine Reconciliation; der saubere Weg ist der Webhook, der bewusst auf die Produktion verschoben bleibt.
- **SCA off-session.** Karten aus dem Billing-Portal tragen nicht zwingend ein off-session-Mandat; `requires_action` wird zu `payment_failed`. Ein SetupIntent mit `usage: off_session` im Portal-Flow ist der Folgeschritt.
- **Zähler-Race.** Zwei gleichzeitige Buchungen desselben Anbieters lesen beide `used = 2`. Akzeptiert; eine RPC `increment_discount_counter` ist notiert.
- **Entscheidungen Nr. 2, 3, 6 des Plans** (Retry/Kulanz, Lead-Fee-Freigabe Legal Support je Land, 10 % bei wiederkehrenden Leistungen) bleiben Konfiguration ohne Code-Änderung.

## DNA-Check (KN-BRAND-001 §6)

- **Fairness zwischen Providern:** Band aus der Opportunity, nie aus Plan oder Größe; der Test hält es fest.
- **Verstehen statt konvertieren:** Die Bestätigung steht vor dem Klick, nennt Felder, Follow-up-Recht und Rabatt; keine Vorauswahl, keine Dringlichkeit.
- **Ehrlich, ohne Angst:** Der Fehlersatz an den Nutzer schließt ihn als Ursache aus und öffnet den Weg zum nächsten Anbieter; der Anbieter liest den Grund und den Weg ins Portal, keinen Vorwurf.
- **Verantwortung, wenn etwas schiefgeht:** Erstattung und Protokoll bei Insert-Fehler; `lead_charge_reversed_failed` ruft den Menschen.
- **Keine Transaktion entscheidet über Sichtbarkeit (§14):** `billing_ready` bleibt Spalte, kein Filter; pgTAP prüft, dass die View an keiner neuen Tabelle hängt.
- **Derselbe Respekt für jedes Unternehmen:** Die 10 % gelten für jeden Nutzer, unabhängig vom Plan des Anbieters.
