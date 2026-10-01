---
title: "Ein Abo kann entstehen — provider_subscriptions bekommt einen Schreiber"
assignee: "Claude"
status: "review"
---

# Ein Abo kann entstehen

Nachlauf zu TKT-PROV-05 und TKT-PROV-06. Dort stand als offener Punkt 3:
`provider_subscriptions` hat keinen Schreiber — kein Checkout, keine
Admin-Zuweisung. Weil `billingReadiness` ein laufendes Abo verlangt, war damit
**niemand buchbar**. Das Datenmodell war seit dem 2026-09-22 vollständig
(Migration `20260923000000`), der Weg hinein fehlte.

## Was ich zuerst falsch vorhatte

Mein erster Plan war ein Stripe-Checkout im Abo-Modus, nach dem Muster von
Assistant Pro (`assistant.ts`: inline `price_data`, Verify-on-Return, weil
Staging hinter Basic Auth liegt und Webhooks nicht erreicht).

**Das wäre doppelt abgerechnet worden.** Die Plattform hat schon eine eigene
Abo-Abrechnung: `handleBillingRun` (`billing.ts`, `POST /admin/billing/run`)
liest `provider_subscriptions`, bestimmt über `subscriptionChargeForPeriod` den
Betrag und stellt je Periode eine Stripe-**Rechnung** aus
(`collection_method: 'send_invoice'`, 14 Tage Zahlungsziel). Es gibt kein
Stripe-Abo-Objekt. Ein Checkout-Abo wäre eine zweite Abrechnung derselben
Gebühr geworden.

Darum schreibt dieser PR nur den Datensatz. Die Rechnung stellt weiter der Lauf.
Ein Kommentar an `provider_subscriptions.stripe_subscription_id` hält das fest,
damit der nächste nicht in dieselbe Falle läuft.

## Was Spec B ausdrücklich nicht entschieden hat

Unter **„Configurable items requiring final decision"** steht wörtlich:

> Subscription proration, cancellation notice, grace period, failed-payment
> retry, and reactivation rules.

Entsprechend gibt es hier **keinen Tarifwechsel und keine Kündigung**:

- Die Tarifwahl legt das **erste** Abo an. Läuft schon eines, antwortet sie mit
  409 `SUBSCRIPTION_EXISTS`.
- Die Admin-Zuweisung kennt zwei getrennte Vorgänge — `start` und `end`. Ein
  Wechsel sind damit zwei sichtbare Verwaltungsakte, jeder einzeln im
  Entscheidungsprotokoll. So muss niemand eine Pro-rata-Regel annehmen, die
  noch nicht beschlossen ist.
- Es bewegt sich dabei kein Geld: keine Erstattung, keine Pro rata. Die Periode,
  die schon in Rechnung steht, bleibt in Rechnung.

Das ist keine Bequemlichkeit: eine stillschweigend erfundene Kulanz- oder
Pro-rata-Regel wäre genau die Entscheidung, die nicht im Code fallen darf —
derselbe Punkt, der bei der Kulanzfrist aus TKT-PROV-06 noch offen ist.

## Was jetzt im Repo ist

**Migration `20261001190000_subscription_writer.sql`** — Zeitstempel bewusst
**nach** `20261001184141_market_request_notify`. Dessen Version ist die, unter
der es auf Staging schon eingespielt ist (#241 hat die Datei genau darauf
umbenannt). Eine früher nummerierte Migration würde lokal **vor** ihm und auf
Staging **danach** eingespielt — dieselbe Reihenfolge-Drift, die #241 gerade
beseitigt hat. (Die erste Fassung dieses PRs nannte als Grund noch die
Versionskollision `20261001000000`; die ist mit #241 behoben.)

- `provider_review_log.subject` kennt `'subscription'`. Spec B: *„All sensitive
  actions create audit logs."* Ein Tarifwechsel gehört in die Historie, die der
  Anbieter **selbst** sieht (`GET /application` liefert `history`), nicht nur
  ins `event_log`, das nur wir lesen.
- `provider_subscriptions.source` (`provider_self_serve` | `admin`) — reine
  Herkunft, entscheidet nichts.

**`services/compliance-api/src/subscriptions.ts`** — ein Abo entsteht hier und
nur hier:

- `addMonths` / `periodEndFor` — Datums-Mathematik, rein und ohne Netz prüfbar.
  Der Tagesüberlauf wird **gekürzt**: 31.01. + 1 Monat ist der 28.02., nicht der
  03.03. Sonst wäre die Periode länger als ein Monat und der Rabattzyklus
  verschoben.
- `startSubscription` / `endSubscription` — mit Protokolleintrag, `event_log`
  und anschließendem `syncBillingReadiness`, damit die Buchbarkeit nicht erst
  beim nächsten Watcher nachzieht.
- `rollPeriod` / `runSubscriptionPeriodTick` — **die zweite fehlende Hälfte.**
  Niemand hat die Periode je weitergerollt. `current_period_end` wäre für immer
  in der Vergangenheit stehen geblieben, und weil `cycleStartFor` den
  Rabattzyklus am Periodenbeginn festmacht, hätte der Zähler der Lead-Rabatte
  **nie zurückgesetzt**. Der Pass läuft im Watcher und respektiert Shadow.
  Deckel bei 400 Monatsschritten: eine Zeile, die 33 Jahre alt ist, ist ein
  Datenfehler und keine Periode, die man nachrollt.

**Routen** — `GET`/`POST /api/v1/provider/{key}/subscription` und
`POST /api/v1/admin/provider-subscriptions`.

## Eine Lücke, die beim Verdrahten aufgefallen ist

An der Guard-Stelle in `index.ts` steht: *„eine neue Route unter dem Pfad ist
damit von Anfang an geschützt."* Das gilt nur, solange der Pfad auch in
`OWN_PROVIDER_ROUTE` (`providerAuth.ts`) auftaucht — und **diese Zusage war
selbst nicht abgesichert.** Wer eine Route `/provider/:key/neu` verdrahtet und
den Regex vergisst, baut eine Route ohne Ownership-Prüfung; sichtbar wird das
erst, wenn jemand fremde Daten abruft.

Dafür jetzt `ownershipRoutes.guard.test.ts`: liest beide Quelldateien und
vergleicht die Pfadsegmente. Der Test sagt selbst, was er beweist (jedes in
`index.ts` genannte Segment steht im Guard) und was nicht (dass der Regex die
Route wirklich trifft — das prüft die 404-Tabelle in `api.test.ts` Route für
Route, jetzt um beide Abo-Routen erweitert).

## Korrektur: der Rabattzyklus — ich hatte es zuerst umgedreht

Die erste Fassung dieses Tickets meldete einen Fehler in `cycleStartFor`
(`billing.ts`): der Rabattzyklus hänge am Abo-Periodenbeginn, bei einem
Jahresabo also an einem Jahr. **Das war falsch, und der Fehler war meiner.**

Was mich in die Irre geführt hat, war der Spaltenkommentar in
`20260923000000`: *„Der Zyklus, gegen den Rabattzähler und Abo-Rechnung
laufen."* Ich las „Periode" als Abo-**Laufzeit** und setzte sie beim Jahresabo
auf zwölf Monate. Damit hätte der Zähler einmal im Jahr zurückgesetzt — der
Anbieter hätte seine 3 bzw. 6 rabattierten Leads **pro Jahr** bekommen statt
pro Monat. Genau den Schaden, den ich gemeldet hatte, hätte ich eingebaut.

Drei Belege, dass die Spalten anders gemeint sind:

1. **Spec B, wörtlich:** *„The counter resets on the **monthly billing-cycle
   date** and does not roll over."* Es gibt einen monatlichen Zyklustermin.
2. **Spec B, Backend-Anforderungen:** dort steht die *„renewal date"* als
   eigenes zu speicherndes Feld. Gäbe `current_period_end` die Verlängerung an,
   wäre `renewal_date` leer — und genau das hatte meine erste Fassung getan
   (`renewal_date = current_period_end`).
3. **Die zwei Zeilen, die es auf Staging schon gibt** (von Hand angelegt, nicht
   aus Repo-Code): `schmidt-partner` ist **jährlich**, hat aber
   `current_period_end` einen **Monat** nach Beginn und `renewal_date`
   `2027-08-05`, ein Jahr nach `started_at`. `studio-bianchi` ist monatlich,
   dort fallen beide zusammen. Beide passen genau auf die Regel unten.

Deshalb jetzt zwei getrennte Termine:

| Feld | Bedeutung | Länge |
|---|---|---|
| `current_period_start` / `_end` | der **Rabatt**-Zyklus, daran hängt `provider_discount_counter` | **immer ein Monat**, bei jeder Zahlweise |
| `renewal_date` | der Verlängerungstermin | Jahresabo ein Jahr, Monatsabo ein Monat |

Im Code: `cycleEndFor(start)` (ohne Zahlweise) und
`renewalAfter(startedOn, cadence, today)` — letzteres rechnet vom **Abo-Beginn**
und nicht vom letzten Termin, damit der Tag nach einer Lücke im Watcher-Lauf
stimmt und nicht durch wiederholtes Kürzen nach vorne wandert. Der Watcher rollt
den Zyklus in Monatsschritten, unabhängig von der Zahlweise.

`cycleStartFor` selbst bleibt **unverändert** — es war richtig. Die
Spaltenkommentare sagen jetzt, was welcher Termin bedeutet, und an
`cycleStartFor` steht, was passiert, wenn jemand den Zyklus doch auf die
Laufzeit setzt.

Die Abo-**Rechnung** läuft übrigens an keinem der beiden Termine:
`handleBillingRun` vergleicht die angefragte Periode mit dem Monat von
`started_at`. Der alte Spaltenkommentar behauptete das Gegenteil.

## Geprüft

`typecheck` · UI-`tsc` · `i18n:check` · `terminology:check` · `build` grün.
**354 API-Tests** (davon 15 reine Datums-Tests und 3 Guard-Tests),
**259 UI-Tests**, **173 DB-Checks** (`Result: PASS`, davon 9 neu).

Gegenproben gefahren:

- `subscription` aus `OWN_PROVIDER_ROUTE` entfernt → 2 Guard-Tests und die
  beiden 404-Tests fallen. Die Lücke war echt.
- Migration neutralisiert (`subject`-CHECK ohne `'subscription'`, `source` ohne
  NOT NULL/Default/CHECK) → `10_subscription_writer_test.sql` fällt am ersten
  Insert. Die neuen Zusicherungen hängen wirklich an der Migration.
- Eigene Fehler dabei gefunden: zwei falsche Test-Erwartungen (eine Rollung
  statt zwei; der Deckel-Test prüfte den Deckel gar nicht und ist jetzt ein
  echter Fall von 1900) und eine falsche Spaltenannahme (`to` statt `to_value`).

## DNA-Check

Auslöser: **Monetarisierung** und **Registrierung/Gating**.
`KN-BRAND-001` vor der Umsetzung gelesen.

- **„We do not create needs. We identify them."** — Der Tarif wird nirgends als
  Compliance-Pflicht dargestellt. `GET /subscription` liefert die Tarife als
  Preisangabe, ohne Dringlichkeit und ohne Andeutung, ohne Tarif sei etwas
  unsicher oder unvollständig. Backend-Antworten, keine Copy.
- **„Show value before asking for commitment."** — Ein Anbieter kann sein
  Dossier füllen, einreichen und **aktiviert werden**, ohne zu zahlen (so
  entschieden in TKT-PROV-05). Der Tarif steht am Ende des Weges, nicht als Tor
  davor.
- **Angst wird nie zur Conversion eingesetzt.** — Es gibt keine Frist, keine
  Warnung, keinen Countdown an der Tarifwahl. Die 409 bei einem laufenden Abo
  sagt sachlich, dass ein Wechsel noch nicht geht.
- **„Businesses should not pay for services they do not need."** — Beim
  Durchlesen des eigenen Diffs aufgefallen: so wie die Route zuerst dastand,
  hätte ein **beendetes** (`terminated`) oder **gesperrtes** (`suspended`) Konto
  einen bezahlten Tarif beginnen können — Geld von jemandem, der nicht
  vermittelt werden kann. Jetzt 409 `PROVIDER_NOT_ELIGIBLE`, und zwar **auch
  für die Admin-Zuweisung**: wer dort ein Abo braucht, ändert zuerst den
  Lebenszyklus, und das ist selbst protokolliert. Eine stille Ausnahme für
  Admins wäre der bequemere, aber schlechtere Weg. `draft`, `submitted` und
  `paused` bleiben ausdrücklich erlaubt — Abrechnung und Aktivierung sind zwei
  Achsen, das ist der Kern von TKT-PROV-05.
- **Fairness zwischen Providern.** — Die Preise kommen aus `plan_catalog` und
  sind für alle dieselben; `source` ändert nichts an der Geltung. Ein Abo aus
  der Admin-Zuweisung wirkt genauso wie eines aus der Tarifwahl.
- **Respekt unabhängig von der Größe.** — Keine Sonderbehandlung, keine
  Staffel, kein „Enterprise"-Pfad in diesen Routen.
- **Kein bezahltes Ranking.** — Der entscheidende Punkt. Das Abo bleibt aus dem
  Matching heraus: `matchable_provider_services` liest keine Abo-Spalte, und
  pgTAP-Test 9 in `10_subscription_writer_test.sql` nagelt das fest. Ein
  Integrationstest sichert zusätzlich ab, dass ein Tarif **allein** nicht
  buchbar macht — sonst würde ein bezahlter Tarif Buchbarkeit kaufen.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken.** — Die
  reservierten Regeln (Pro rata, Kündigungsfrist, Reaktivierung) sind als 409
  benannt, nicht stillschweigend erfunden.

Nicht berührt: Risk Map, Wizard, Ranking, AI-Verhalten, Provider-Policies.

## Offen

1. **Kein Weg für die Tarifwahl in der Oberfläche.** Der UI-Workflow verlangt
   Canvas → Figma → lokal → Staging; ein Tarifwahl-Screen ist ein neuer Screen
   und wartet auf diesen Weg. Die Routen stehen.
2. **Die Kulanzfrist** aus TKT-PROV-06 ist weiter offen und steht faktisch auf
   null.
3. **Tarifwechsel und Kündigung durch den Anbieter selbst** — erst nach den
   Entscheidungen, die Spec B reserviert.
