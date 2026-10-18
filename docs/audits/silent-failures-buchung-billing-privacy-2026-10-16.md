# Silent-Failure-Durchgang · Buchung, Abrechnung, Privacy — 16.10.2026

**Stand: 16.10.2026 · Status: Befundliste, nichts geändert · aus dem Beta-Plan (28.10.) vorgezogen**

**Fortschritt:** B1, B2, B8 behoben (2026-10-18). Reihenfolge wie vorgeschlagen, Geld zuerst.

Zwei lesende Durchgänge mit dem Projekt-Agenten `silent-failure-hunter`
(`.claude/agents/silent-failure-hunter.md`), Stichproben der schwersten
Befunde am Code bestätigt. Geprüft: `leadCharge.ts`, `stripe.ts`, `billing.ts`,
`invoiceRetry.ts`, `attendance*.ts`, `subscriptions.ts`, `watchers.ts`,
`notifications.ts`, `mailer.ts`, `assistant.ts`, `anonymity.ts`,
`sharedSnapshot.ts`, `apiRoutes.ts`, `providerAuth.ts`, `accessDenied.ts`,
`storage.ts`, `packages/storage/src/*`, die Routen `scheduling`, `bookings`,
`search`, `p/:ref/*`, `engagement`, `reviews`, `notifications`, `admin/events`
in `index.ts`. Zeilen beziehen sich auf `main` `e051cf08`.

Keine DNA-Eskalation nötig. Zwei Befunde berühren die DNA als Bug, nicht als
Zielkonflikt: P1 (AI sagt selbstsicher „keine Pflichten", wenn die Datenbank
nicht antwortet) und B14 (der Nutzer erfährt den Zahlungszustand des Anbieters).

## Reihenfolge, die ich vorschlage

1. **Geld, das verloren geht oder doppelt fließt:** B1, B2, B8, B7, B6, B4.
2. **Zustände, die kippen und nie wiederkommen:** B5, B11, B12, B9, B10, B13.
3. **Audit und Offenlegung:** P4, P1, P2, P3 (= B2), P5, P7, P8.
4. **Kleinkram mit klarer Korrektur:** B3, B14, B15, P9 bis P14.

Fast alles sind kleine, lokale Änderungen (Reihenfolge zweier Schreibvorgänge,
ein `catch` mit Log statt leer, ein Timeout). Die drei größeren: B1 (Ausgang
„unbekannt" plus Stripe-Abgleich), B8 (Idempotency-Key vom Client), B7
(Monatslauf in zwei Schritten mit Zwischenstand).

---

## A · Buchung und Abrechnung

| Nr. | Schwere | Stelle | Befund |
|---|---|---|---|
| B1 | hoch | `stripe.ts:54-61`, `leadCharge.ts:212-231`, `index.ts:1871-1875` | Stripe-`fetch` ohne Timeout. Netzabbruch **nach** Capture wird als `failed`/502 verbucht, kein Refund; der Retry des Nutzers belastet mit neuem Ledger-Key ein zweites Mal. **Behoben 2026-10-18:** Timeout, Ausgang `unknown`, Sperre `payment_unresolved`, Abgleich-Tick mit Erstattung (ADR-0005 „Offen"). |
| B2 | hoch | `index.ts:1915-1925` | Scheitert die Erstattung, bleibt nur ein `event_log`-Insert mit `.catch(() => {})`; Ledger bleibt `captured`, kein Log, keine Admin-Spur. Umgekehrt wird eine **gelungene** Erstattung als `lead_charge_reversed_failed` protokolliert, wenn der Payment-Event-Insert danach wirft. **Behoben 2026-10-18:** `reverseOrphanCharge` (Schritte einzeln, `structuredLog('error')`, `payment_unresolved` bei allem Halben), Abgleich-Tick erstattet `captured` ohne Buchung mit demselben Key nach. |
| B3 | hoch | `index.ts:1958-1971`, `2004-2007` | Nach erfolgreichem Scheduling-Insert sind vier `event_log`-Inserts ungeschützt; wirft einer, bekommt der Nutzer 500, obwohl Buchung, Belastung und Offenlegung stehen — und `lead.revealed` fehlt im Audit. |
| B4 | hoch | `billing.ts:408` vs. `443-451`, `554`, `672` | `quoteLeadFee` findet den Plan nur bei exakter `plan_version`; `loadPricingConfig` behält je Code nur die neueste. Nach einem Versionssprung im Katalog zahlen alle Bestandsabos still den vollen Preis. Unsicher, ob schon ausgelöst. |
| B5 | hoch | `subscriptions.ts:548-573`, `627-660` | Tarifwechsel am Stichtag: altes Abo beendet und `scheduled_*` geleert, **bevor** das neue eingefügt wird; wirft der Insert, ist der Anbieter ohne Abo, ohne Retry, ohne Benachrichtigung. Kein per-Zeile-`catch` im Tick. |
| B6 | hoch | `attendanceWatch.ts:171-177` | `credit_decided_at` wird gesetzt, **bevor** `provider_credits` eingefügt wird; wirft der Insert, ist das 30-%-Guthaben endgültig weg. |
| B7 | hoch | `billing.ts:558-563`, `581-625`, `641-645` | Monatslauf: Stripe-Rechnung finalisiert und gesendet, DB-Zeile erst danach; scheitert sie, stellt der nächste Lauf eine zweite aus. Outer `catch {}` ohne Detail bricht den Lauf für alle weiteren Anbieter ab. |
| B8 | mittel | `index.ts:1806-1815`, `1859-1865`; `leadCharge.ts:184-219` | Zwei parallele Requests (Doppelklick, Client-Retry) passieren beide Prüfungen, zwei Ledger-Zeilen, zwei PaymentIntents; nur der Refund-Pfad (B2) kompensiert. **Behoben 2026-10-18:** `request_id` vom Client, `request_key` am Ledger (Unique je Nutzer), Wiederholung bekommt dieselbe Buchung (`replay: true`), Zwilling 409 `BOOKING_IN_PROGRESS` ohne Stripe. |
| B9 | mittel | `index.ts:1933-1935`, `1834` | Rabattzähler: Upsert mit `.catch(() => {})`, Read-before-write ohne Sperre; dieselbe Rabattstufe mehrfach. |
| B10 | mittel | `leadCharge.ts:248-257`, `index.ts:1868` | `recordPaymentFailure`: wirft das `providers`-Update, antwortet der Handler 500 „Scheduling create failed"; Anbieter weder gesperrt noch informiert. |
| B11 | mittel | `invoiceRetry.ts:84-96` | Marker vor der Aktion; wirft `sendNotice` oder `attempt`, gilt die Stufe als erledigt — ein Einzugstag entfällt still. |
| B12 | mittel | `billing.ts:628-631` | Guthaben-Verbrauch mit `.catch(() => {})`: scheitert er, wird dasselbe Guthaben im nächsten Monat erneut verrechnet. |
| B13 | mittel | `index.ts:1661` | `recordProviderNoShow(...).catch(() => {})`: Nutzer meldet Anbieter-No-Show, bekommt 200; Vorfall und Benachrichtigung können komplett entfallen. |
| B14 | niedrig | `index.ts:1785`, `1854`, `1870` | Nutzer-Draht erhält `BILLING_NOT_READY` und `reason: 'provider_billing'` — verrät den Zahlungszustand des Anbieters; ADR-0005 sieht einen neutralen Code vor. |
| B15 | niedrig | `stripe.ts:175` | `stripeRef` bei Kartenfehler immer `null` (`paymentIntentId` existiert auf `StripeError` nicht; Stripe liefert `error.payment_intent.id`). |

### Vorschläge A

- **B1:** `fetch` mit `AbortSignal.timeout`; bei `kind: 'stripe'` den Ausgang als `unknown` verbuchen, Abgleich über `metadata.ledger_id` oder Wiederholung mit demselben Key, bevor eine 502 geht; `unknown` blockiert den Anbieter bis zum Abgleich.
- **B2:** Nach erfolgreichem Refund zuerst das Payment-Event `refunded` schreiben, Fehler dort als eigenes Ereignis; bei Refund-Fehler `structuredLog('error')`, Payment-Event `refund_pending`, Admin-Benachrichtigung. Nie hinter `.catch(() => {})`.
- **B3:** Ab dem Scheduling-Insert gilt die Buchung: `lead.revealed` als erstes Ereignis (oder im selben RPC), die übrigen Inserts best-effort mit Log, immer 201.
- **B4:** `loadPricingConfig` alle gültigen Versionen behalten oder `quoteLeadFee` auf den Code zurückfallen und den Unterschied loggen; Test: Abo v1 gegen Katalog v2.
- **B5:** Ende und Neuanfang in einer RPC; `scheduled_*` erst nach erfolgreichem Insert leeren; per-Zeile-`try/catch` mit `providerKey` im Log.
- **B6:** Erst `provider_credits` (Unique-Index auf `booking_id` macht es idempotent), dann `credit_decided_at`.
- **B7:** DB-Zeile direkt nach dem Stripe-Create (`draft`, `stripe_invoice_id`), danach aktualisieren; per-Anbieter-`try/catch` mit Ergebniszeile.
- **B8:** Client-`Idempotency-Key` als Spalte am Ledger (Unique `(user_id, request_id)`), zweite Anfrage nutzt die bestehende Zeile.
- **B9:** Zähler per RPC atomar (`used = used + 1 RETURNING used`).
- **B10:** `recordPaymentFailure` intern `try/catch` mit Log; Handler antwortet unabhängig davon 409.
- **B11:** Marker nach der Aktion, oder bei Fehler `outcome: 'error'` und Wiederholung am selben Tag.
- **B12:** `consumed`-Zeile vor dem Stripe-Aufruf, bei Fehler Gegenbuchung; nie schlucken.
- **B13:** Fehler loggen und als Ereignis festhalten; 200 bleibt, die Lücke wird sichtbar.
- **B14:** Für den Nutzer `PROVIDER_NOT_BOOKABLE` ohne `reason`; der Grund nur im `event_log` und beim Anbieter.
- **B15:** `StripeError.paymentIntentId` aus `body.error.payment_intent.id`.

### Sauber (geprüft)

`INVOICE_RETRY_ENABLED`-Gate (ohne Flag endet der Tick; im Shadow kein Geld; `due_at` nie geschrieben; Idempotency je Stufe) · Ownership-Guard fail-closed · Nutzer-Buchungsliste ohne Band, Gebühr, Ledger, Stripe · Anbieter-Mail bei Kartenfehler ohne Nutzer und Decline-Code · `notify` und Mailer werfen nie nach außen und protokollieren jeden Ausgang · Refund-Idempotenz · Neubuchung in der Frist ohne zweites Ledger · Shadow-Ticks schreiben nur Marker.

---

## B · Privacy, Anonymität, AI-Gates

| Nr. | Schwere | Stelle | Befund |
|---|---|---|---|
| P1 | hoch | `assistant.ts:181` | DB-Fehler beim Laden der Sitzungen wird zu „keine Sitzungen"; die AI sagt dem Nutzer selbstsicher, er habe keine gespeicherten Pflichten. **DNA: Unsicherheit hinter sicherer Sprache.** |
| P2 | hoch | `assistant.ts:238-241` | Audit `assistant_chat` für den AI-Grenzübertritt per `.catch(() => {})` verschluckt, kein Log. |
| P3 | hoch | `index.ts:1917-1928` | = B2, aus Privacy-Sicht: bei Slot-Kollision nach gescheiterter Erstattung bleibt gar keine Spur. |
| P4 | hoch | `index.ts:2762-2765` | `GET /engagement/:id` gibt der Anbieterseite die rohe Zeile mit `user_id`, `session_id`, `requester_email`, `company` vor jeder Offenlegung. Die Pipeline ist seit Phase 6 stillgelegt, die Route antwortet weiter. |
| P5 | mittel | `assistant.ts:162-235` | Nutzerfrage, Historie und Sitzungs-Labels gehen ohne deterministische Redaction an das Modell; `redactText` existiert und wird im Mailer benutzt, hier nicht. |
| P6 | mittel | `packages/storage/src/auditLog.ts:19-24` | Das „immutable Audit Log" ist ein `console.log`; `queryEvents` liefert `[]`; `RawVault.getRawDocument` liefert `"MOCK_RAW_DATA"`. Kein Produktivcode importiert das Paket, aber die Stubs bestehen still. |
| P7 | mittel | `leadCharge.ts:254-257` | Audit `lead_payment_failed` fire-and-forget mit leerem `catch`; Glocke und Mail laufen trotzdem. |
| P8 | mittel | `apiRoutes.ts:120-127`, `watchers.ts:383` | Retention-Löschung `api_request_log` ohne Audit-Event; Fehler mitten in der Schleife nur `errors++`. |
| P9 | mittel | `index.ts:3213-3216` | `console.error` mit rohem PostgREST-Fehler (kann Spaltenwerte tragen); jeder Fehler wird 400 „Invalid payload". |
| P10 | niedrig | `index.ts:1034, 1047, 1222, 1229` | `region` geht in Detail und `/bookings` unmaskiert raus, `/search` maskiert; Altbestand mit Identität in der Region ist vor der Buchung sichtbar. |
| P11 | niedrig | `anonymity.ts:64-75` | Nur `provider_key`/`pseudonym_label` hart gesperrt; `name`, `website_url`, `contact_email`, `vat_id`, `stripe_customer_id` hängen allein am Register. |
| P12 | niedrig | `index.ts:2064-2073` | Review-Text ohne `identityScan` gespeichert; nur das Lese-Netz fängt ihn. |
| P13 | niedrig | `mailer.ts:430-434, 699, 760, 805, 897` | `email_failed` trägt Empfängeradresse plus ungekappten Fehlertext ins `event_log`. |
| P14 | niedrig | `assistant.ts:63, 80` | Modell-`fetch` ohne Timeout. |

### Vorschläge B

- **P1:** Fehler nicht abfangen: 502 `ASSISTANT_CONTEXT_UNAVAILABLE`, oder dem Modell ausdrücklich „unavailable, say so" mitgeben; mindestens `structuredLog('error')`.
- **P2:** Audit vor dem AI-Aufruf schreiben und bei Fehler den Aufruf verweigern; bis dahin `structuredLog('error', 'assistant_chat audit lost')`.
- **P4:** Serializer für Seite `provider` ohne `user_id`, `session_id`, `requester_email`, `company`; oder die Route für Anbieter auf 404, solange die Pipeline tot ist.
- **P5:** `message` und `history[].content` durch `redactText(…, { profile: 'strict' })`; Labels kürzen.
- **P6:** Stubs werfen statt still bestehen (`AuditLog not configured`), oder `logEvent` auf `event_log` legen.
- **P7:** `catch` mit Log; Muster `accessDenied.ts`.
- **P8:** Nach der Schleife `retention_deleted` mit `table`, `count`, `cutoff`; Muster für künftige Retention-Ticks.
- **P9:** `structuredLog` mit gekapptem Detail; Parse-Fehler 400 von DB-Fehlern 500 trennen (wie `/search`).
- **P10:** `region` einmal maskiert berechnen und überall verwenden.
- **P11:** Feste Deny-Liste in Stufe `anonymous`, unabhängig vom Register, mit Test.
- **P12:** `identityScan` vor dem Insert, 422 mit Benennung.
- **P13:** `error` auf 200 Zeichen kappen, `to` durch `providerKey`/`bookingId` ersetzen.
- **P14:** `AbortSignal.timeout(20_000)`.

### Sauber (geprüft)

Signierte URLs fail-closed (503, keine Roh-URL) · Visibility-Register fail-closed · `/search`, `/detail`, `/slots`, `/reviews` nur `public_ref`, Dossier maskiert bis `identity_revealed` · Shared Snapshot eine Quelle · `/ext/leads`, `/ext/events` filtern nach `shared_fields` und `EVENT_FIELDS` · Ownership-Guard 404 bei DB-Fehler · Notifications mit Allow-List · Magic-Link-Mail redigiert · keine `raw://`-Refs im Dienst · Fehlertexte an den Client ohne Stripe-Codes und SQL.
