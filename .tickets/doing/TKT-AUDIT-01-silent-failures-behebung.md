---
title: "Silent-Failure-Befunde beheben (Buchung, Abrechnung, Privacy)"
assignee: "Claude (Umsetzung) · Nutzer (Review je PR)"
status: "doing"
---

# Silent-Failure-Befunde beheben

Befundliste: [`docs/audits/silent-failures-buchung-billing-privacy-2026-10-16.md`](../../docs/audits/silent-failures-buchung-billing-privacy-2026-10-16.md)
(29 Befunde, PR #326). Reihenfolge vom Nutzer bestätigt (2026-10-18): wie vorgeschlagen, Geld zuerst.
Ein PR je Befund, jeder mit Test, der den stillen Fehler vorher sichtbar gemacht hätte.

## Fortschritt

### 1 · Geld, das verloren geht oder doppelt fließt

- [x] **B1** Stripe ohne Timeout, Netzabbruch nach Capture → `failed`, Retry belastet doppelt.
  Timeout (`STRIPE_TIMEOUT_MS`), Ausgang `unknown` im Ledger, Sperre `payment_unresolved`,
  Abgleich-Tick `runChargeReconcileTick` (Liste der PaymentIntents, Erstattung ohne Buchung).
  Migration `20261018000000`, pgTAP 17, ADR-0005 „Offen" aktualisiert.
- [x] **B2** Erstattung scheitert unsichtbar / gelungene Erstattung als Fehler protokolliert.
  `reverseOrphanCharge` in `leadCharge.ts`: Refund → Ledger-Ereignis → event_log, jeder Schritt
  einzeln mit `structuredLog('error')`; was halb bleibt, sperrt `payment_unresolved`, und der
  Abgleich-Tick erstattet `captured` ohne Buchung mit demselben Idempotency-Key nach. Keine Migration.
- [x] **B8** Doppelklick → zwei Ledger-Zeilen, zwei PaymentIntents.
  Client schickt `request_id` je Versuch (`newBookingRequestId`, nach Fehler neu, bei „läuft noch“
  gleich); Ledger-Spalte `request_key` mit Unique `(user_id, request_key)`. Wiederholung nach
  Erfolg → dieselbe 201 (`replay: true`); Zeile ohne Buchung oder 23505 → 409 `BOOKING_IN_PROGRESS`
  ohne Stripe. Migration `20261018000100`, pgTAP 18, Mock mit Gedächtnis je Session.
- [x] **B7** Monatslauf: Stripe-Rechnung vor DB-Zeile; outer `catch {}` bricht den Lauf ab.
  `issueInvoiceFor` in `billing.ts`: Stripe-Create → Zeile `draft` (mit `stripe_invoice_id`) → Positionen
  → finalisieren → senden → Zeile `open` → Guthaben (einmal, Notiz trägt die Stripe-Kennung). Ein `draft`
  wird beim nächsten Lauf wieder aufgenommen, nie neu ausgestellt; Anbieterlisten zeigen keine Entwürfe.
  Je Anbieter `try/catch` → Ergebniszeile `error: issue_failed`, `errors` in der Antwort, `invoice_run_failed`.
  Migration `20261018000200` (Status `draft`), pgTAP 19.
- [x] **B6** 30-%-Guthaben: `credit_decided_at` vor dem Insert.
  Reihenfolge gedreht: erst `provider_credits`, dann `credit_decided_at`. Nicht-Unique-Fehler lässt die
  Frist offen (nächster Tick versucht es erneut); Unique-Verletzung = Guthaben steht schon → nur die Frist
  schließen, `lead.credit_issued` mit `resumed: true`, keine zweite Meldung. Ledger-Spur ohne leeres `catch`.
- [x] **B4** `quoteLeadFee` findet den Plan nur bei exakter `plan_version`.
  `PricingConfig.planVersions` hält alle geltenden Versionen; `planFor(cfg, sub)` liefert die gebundene
  Version, sonst die jüngste des Codes mit `exact: false`. `quoteLeadFee` trägt `planVersionExact`; die
  Buchung loggt und protokolliert `plan_version_fallback`. Monatslauf und Vorschau rechnen die gebundene
  Version (ein Abo zahlt, was es abgeschlossen hat; Versionswechsel über den geplanten Wechsel).

### 2 · Zustände, die kippen und nie wiederkommen

- [ ] B5 · [ ] B11 · [ ] B12 · [ ] B9 · [ ] B10 · [ ] B13

### 3 · Audit und Offenlegung

- [ ] P4 · [ ] P1 · [ ] P2 · [ ] P5 · [ ] P7 · [ ] P8 (P3 = B2)

### 4 · Kleinkram mit klarer Korrektur

- [ ] B3 · [ ] B14 · [ ] B15 · [ ] P9 · [ ] P10 · [ ] P11 · [ ] P12 · [ ] P13 · [ ] P14

## DNA-Check

Kein Zielkonflikt. B1 schützt den Anbieter vor einer Doppelbelastung und sagt dem Nutzer
die Wahrheit („nichts gebucht, nichts zu zahlen") statt „gescheitert" zu behaupten, wenn
niemand es weiß. Die Sperre ist neutral formuliert und löst sich von selbst.
