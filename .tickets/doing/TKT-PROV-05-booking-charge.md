---
title: "Provider Phase 4 — Buchung, Bestätigung, Belastung, Offenlegung"
assignee: "Claude"
status: "doing"
---

# Provider Phase 4 — Buchung, Bestätigung, Belastung, Offenlegung

Fünfte Phase des Provider-Plans (Spec B „Booking confirmation and data
handover", „Lead pricing and automatic charging", „Mandatory CompliHub360 user
discount"; Spec A §20, §21.1; ADR-0003, ADR-0004;
[ADR-0005](../../docs/decisions/ADR-0005-booking-charge.md)).
Nutzer-Entscheidungen 2026-10-01: **sofort belasten** (PaymentIntent
off-session, synchron) · **Billing-Portal plus Readiness-Sync** · **Fehlerfall
ohne Buchung**, neutral benannt.

Backend, Canvas, Figma und lokale UI nach dem UI-Workflow (Canvas → Figma →
lokal; Staging nach dem Review des Nutzers).

## Objective

1. Vor der Offenlegung steht eine Bestätigung des Nutzers mit Version, die
   offen nennt, was fließt und dass der Anbieter nachfassen darf — auch wenn
   der Nutzer nicht mehr antwortet.
2. Die Buchung füllt `price_snapshot`, `shared_fields`,
   `sharing_confirmed_at`; nichts davon bleibt leer.
3. Band und Rabatt kommen aus `quoteLeadFee`; die Belastung läuft über ein
   Ledger, das vor Stripe existiert (Idempotency-Key = Ledger-ID), und der
   Status steht als Ereignisspur.
4. Offenlegung nur nach erfolgreicher Belastung. Scheitert sie, gibt es keine
   Buchung, der Nutzer liest einen neutralen Satz, der Anbieter erfährt den
   Grund und den Weg zur Behebung.
5. `billing_ready` wird endlich gesetzt — aus Stripe und Datenbank, beim
   Rückweg aus dem Portal und im Watcher, nie im Buchungspfad.
6. Der 10 %-Nutzerrabatt steht an jedem Lead; der Anbieter bestätigt
   „Angebot erstellt" und „Rabatt gezeigt". Wiederkehrende Leistungen bleiben
   `undecided` (Entscheidung Nr. 6).

## Acceptance Criteria

### Backend

- [ ] `stripe.ts`: ein Modul für `stripeRequest` (Idempotency-Key),
  `ensureStripeCustomer`, `getCustomerBilling`, `createPaymentIntent`
  (off-session, `confirm=true`), `refundPaymentIntent`; billing.ts,
  assistant.ts und Portal-Route nutzen es.
- [ ] Migration `20261001000000_booking_charge.sql`: `booking_acknowledgements`
  (v1 in en/de/es/tr, öffentlich lesbar), `user_discount_policy` (v1 10 %
  `undecided`), `lead_proposal_reports`, `scheduling` +
  `acknowledgement_version`, `lead_ledger_id`, `user_discount_pct`,
  `user_discount_policy_version`, Partial Unique Index auf bestätigte Slots;
  `providers` + `billing_synced_at`, `last_payment_failure`. pgTAP 08.
- [ ] `billingReadiness()` rein mit den sechs §21.1-Gründen plus
  `payment_failed`; `handleBillingPreview` zählt nur `captured`/`n/a` und
  trägt `readiness`.
- [ ] `leadCharge.ts`: `deriveOpportunity` (Area nur aus dem Angebot des
  Anbieters), `priceSnapshotFrom`, `currentAcknowledgement`,
  `resolveLedgerStatus`, `chargeLeadFee` (Ledger → Stripe → Event),
  `recordPaymentFailure`, `syncBillingReadiness`.
- [ ] `POST /scheduling`: Version Pflicht (409 `ACKNOWLEDGEMENT_OUTDATED`),
  Slot-Kollision (409 `SLOT_TAKEN`), Opportunity aus `session_id` oder Body,
  Zahlungsmittel-Check, Ledger → Stripe → `scheduling` mit allen Feldern,
  Zähler, Events `scheduling_confirmed`, `provider_lead_charged`,
  `lead.revealed`; Fehler Karte → 409 `BOOKING_NOT_COMPLETED` ohne Buchung,
  Fehler Stripe → 502 ohne `billing_ready`-Änderung; Kompensation per
  Erstattung bei Insert-Fehler nach Capture. Kein Band, keine Gebühr auf
  dem Nutzer-Draht.
- [ ] `GET /acknowledgement` öffentlich; `GET /provider/:key/bookings` mit
  `lead`, `user_discount_pct`, `proposal`, `price_snapshot`; `PATCH
  /provider/:key/bookings/:id/proposal`; `POST /provider/:key/billing/sync`;
  Ownership-Regex; `runBillingReadinessTick` (Shadow zuerst).
- [ ] Benachrichtigungen `booking_created`, `payment_failed`; Mails
  `sendBookingMail`, `sendPaymentFailedMail` (ohne Nutzeridentität, ohne
  Decline-Code).
- [ ] Tests: Stripe als Modul-Mock; Happy Path, Rabattfolge, Legal Support
  ohne Gebühr, Karte abgelehnt, Stripe-Fehler, Version veraltet, Slot belegt,
  kein Zahlungsmittel, fremde Session, Kompensation, Neutralität (Band
  unabhängig vom Plan), Leak-Guard, Acknowledgement, Proposal, Sync, Preview,
  Watcher.
- [ ] Typen, OpenAPI, ADR-0005, `docs/stripe-setup.md` (Key-Rechte),
  Korrekturnotizen in `user-flow-matchmaking-v2-spec.md` §8 und
  `Addendum — Dossier Handover` §4.

### UI (Canvas → Figma → lokal)

- [ ] Canvas mit vier Sektionen × drei Varianten; Wahl des Nutzers.
- [ ] Figma-Seite „Buchung & Belastung (Phase 4)" (Compass-Instanzen,
  Uptake-Kandidaten).
- [ ] Drawer und Terminseite: Acknowledgement mit Version vor dem CTA,
  Zustände `BOOKING_NOT_COMPLETED`, `SLOT_TAKEN`, `ACKNOWLEDGEMENT_OUTDATED`.
- [ ] LeadsPage: Band, Standard → Endbetrag, Rabattfolge, 10 %-Pflicht mit
  Bestätigung. BillingPage: Zahlungsbereitschaft mit Gründen, Sync beim
  Rückweg aus dem Portal, Leads-Zeile echt.
- [ ] Mock-Modus (`vite-plugin-mock-api.ts`, `mock/demoApi.ts`), Locales
  en/de/es/tr, Screenshots.

## Nicht in diesem Ticket

No-Show-Regeln, 30 %-Guthaben, Erinnerungen (Phase 5) · Webhooks (Produktion)
· Stripe Elements / SetupIntent im Frontend · Proration, Kündigungsfrist,
Retry (Nr. 2) · 10 % bei wiederkehrenden Leistungen (Nr. 6) · Lead-Fee-
Freigabe Legal Support je Land (Nr. 3) · Staging-Rollout der UI (Stufe 4).

## DNA-Check

Betroffen: Monetarisierung, Registrierung und Gating, Sichtbarkeit der
Provider-Identität, Copy, Provider-Policies. Voller Filter gegen KN-BRAND-001
im ADR-0005; hier die Punkte, die im Code sichtbar sind:

- **Fairness zwischen Providern:** Das Band kommt aus der Opportunity des
  Nutzers (Bereich, Länder, Leistungen), nie aus Plan oder Größe. Der
  Neutralitätstest hält fest, dass Essential und Global dasselbe Band und
  dieselbe Standardgebühr bekommen.
- **Verstehen statt konvertieren:** Die Bestätigung nennt vor dem Klick, was
  fließt, dass der Anbieter nachfassen darf (auch wenn der Nutzer schweigt)
  und dass der Nutzer nichts zahlt. Keine Vorauswahl, keine Dringlichkeit.
- **Ehrlich, ohne Angst:** Scheitert die Belastung, sagt die Oberfläche „das
  liegt nicht an Ihnen" und bietet den Weg zum nächsten Anbieter. Kein
  Decline-Code, keine Schuldzuweisung auf keiner Seite.
- **Verantwortung, wenn etwas schiefgeht:** Scheitert der Buchungs-Insert
  nach der Belastung, wird erstattet und protokolliert; der Anbieter sieht
  den Grund einer Blockade und den Weg ins Portal.
- **Keine Transaktion entscheidet über Sichtbarkeit (§14):**
  `billing_ready` bleibt Spalte in der View, kein Filter; der Scorer liest
  weiterhin nichts aus dem Pricing.
- **Ein Kleinunternehmen bekommt denselben Respekt:** Der 10 %-Rabatt gilt
  für jeden Nutzer, der über CompliHub360 gebucht hat, unabhängig vom Plan
  des Anbieters.
