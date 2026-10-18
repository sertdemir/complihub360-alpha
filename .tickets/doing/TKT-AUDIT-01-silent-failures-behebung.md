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
- [ ] **B8** Doppelklick → zwei Ledger-Zeilen, zwei PaymentIntents.
- [ ] **B7** Monatslauf: Stripe-Rechnung vor DB-Zeile; outer `catch {}` bricht den Lauf ab.
- [ ] **B6** 30-%-Guthaben: `credit_decided_at` vor dem Insert.
- [ ] **B4** `quoteLeadFee` findet den Plan nur bei exakter `plan_version`.

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
