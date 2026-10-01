---
title: "Kein Buchen-Knopf ohne Buchbarkeit — und die Regel liegt bei syncBillingReadiness"
assignee: "Claude"
status: "done"
---

# Kein Buchen-Knopf ohne Buchbarkeit

Nachlauf zu TKT-PROV-05. Dort war der offene Punkt: `providers.billing_ready`
hatte `DEFAULT false` und **keinen Schreiber**, also endete jeder
Buchungsversuch bei jedem Anbieter in 409 `BILLING_NOT_READY`.

## Was dazwischenkam — und was daraus folgt

Dieses Ticket hieß zuerst „Zahlungsbereitschaft wird berechnet". Gebaut war das
auch: eine eigene Regel `chargeableFromSubscription`, und
`bookable_chargeable` verließ den View, damit nichts veralten kann. Grundlage
war die Nutzer-Entscheidung vom 2026-10-01: **jedes Mal neu berechnen.**

Während dieser PR offen stand, hat **#234** („Buchung → Bestätigung →
Belastung → Offenlegung, Phase 4 Backend") denselben Punkt gelöst — gründlicher:

- `billingReadiness(...)` in `billing.ts` deckt **alle sieben** Bedingungen ab:
  Zahlungsmethode, vollständige Abrechnungsdaten, Abo-Status, erteilte
  Ermächtigung, offene Rechnung, Kontosperre, gescheiterte letzte Belastung.
- `stripe.ts` bringt die Gegenrichtung zum Zahlungsdienstleister — genau das
  Stück, das ich als fehlend gemeldet und bewusst ausgelassen hatte.
- `syncBillingReadiness` pflegt die Spalten „beim Rückweg aus dem Portal und im
  Watcher — nie im Buchungspfad, der liest nur".

**Entscheidung des Nutzers (2026-10-01): #234 gewinnt.** Mein Teil 2 ist
zurückgebaut. Der Grund ist nicht Höflichkeit, sondern eine Tatsache, die ich
beim Vorschlagen von „neu berechnen" nicht genannt hatte: neu rechnen ist
billig für das Abo (unsere Datenbank) und **teuer für die Zahlungsmethode** —
die liegt bei Stripe, und ein Rundruf dorthin bei jedem Lesen eines
Anbieterprofils ist nicht tragbar. Deshalb ist ein gepflegtes Flag hier die
richtige Wahl, solange es an definierten Punkten nachgezogen wird. Genau das
tut #234.

Was bleibt: die Spalte kann zwischen zwei Synchronisationen veralten. Dagegen
hilft nicht Berechnen-bei-jedem-Lesen, sondern dass der Watcher läuft.

## Was dieses Ticket noch liefert

**Kein Buchen-Knopf ohne Buchbarkeit** (Nutzer-Entscheidung 2026-10-01, der
UI-Teil, den #234 nicht berührt). `BookingRail` kehrt früh zurück: kein Knopf,
**keine Terminliste**, stattdessen zwei Sätze. Die Terminliste fällt mit weg —
eine Liste freier Zeiten lädt zum Klick ein, der ins Nichts führt. Der Grund
bleibt beim Anbieter: dass sein Tarif oder seine Zahlungsmethode fehlt, ist
nicht Sache des Nutzers.

`/p/{ref}/detail` liefert dafür `bookable_chargeable` mit — aus **derselben
Quelle wie der Buchungspfad**, der View-Spalte. Zwei Wege zur selben Antwort
wären der Anfang des nächsten Auseinanderlaufens.

## Acceptance Criteria

- [x] `ProviderDetailPage`: früher Rücksprung ohne Knopf und ohne Slots; drei
  Wächter in `ProviderDetailPage.guard.test.ts` halten den Zweig fest
  (Reihenfolge, echter `return`, kein `onBook` im gesperrten Zweig).
- [x] Zwei Copy-Schlüssel in en/de/es/tr, unter `results:detail.*` — also noch
  **nicht abgenommene** Copy; `common:states.*` duldet nur Abgenommenes.
- [x] `/p/{ref}/detail` liefert `bookable_chargeable` aus der View; `openapi.yaml`
  sagt das und nennt die Quelle.
- [x] Mock (`src/mock/demoApi.ts`): Detail liefert das Feld, `p2Gate` liefert
  `billing`. Alle drei Mock-Anbieter bleiben buchbar — `madrid-tax` ist dort
  bewusst der einzige mit Detailseite **ohne** Termin, also genau der, den man
  anklickt, um die Buchung zu sehen. Für den lokalen Blick auf den gesperrten
  Fall genügt eine Zeile.
- [x] Teil 2 vollständig zurückgebaut: Migration gelöscht,
  `chargeableFromSubscription` entfernt, `MatchableProviderService` und der
  pgTAP-Wächter wieder wie auf `main`, Gate und Anbieter-Dossier lesen die
  gepflegten Spalten.
- [x] `build`, `typecheck`, UI-`tsc`, `i18n:check`, `terminology:check` grün.

## DNA-Check

Betroffen: Copy und Microcopy (der gesperrte Zweig), Monetarisierung (was der
Nutzer über den Zahlungsstand eines Anbieters erfährt).

- **Echte Bedürfnisse des Users zuerst:** Ein Termin, den wir nicht bestätigen
  können, wird nicht angeboten. Niemand wählt mehr eine Zeit, um dann
  abgewiesen zu werden.
- **Technologie erhält den Zugang, statt eine Barriere davor zu bauen:** Die
  Angaben bleiben sichtbar, der Vergleich bleibt möglich. Es verschwindet nur
  die Handlung, die nicht funktioniert.
- **Niemanden kleiner machen:** Der Nutzer erfährt nicht, *warum* nicht gebucht
  werden kann. Das ist unsere Vertragsangelegenheit, keine Information, die
  einen Anbieter vor Kunden klein macht.
- **Fairness zwischen Providern:** Unberührt — die Buchbarkeit hängt am
  Zahlungsstand, die **Sichtbarkeit nicht**. Der pgTAP-Wächter und der
  API-Test, die das festhalten, stehen wieder wie auf `main`.

Nicht betroffen: Dringlichkeitssprache, Ranking, AI-Verhalten.

## Offen

**Die Kulanzfrist bei einer offenen Rechnung — und sie ist jetzt faktisch auf
null.** Der Nutzer hat am 2026-10-01 ausdrücklich gesagt, die Frist sei offen
und müsse besprochen werden. In #234 steht:

```ts
if (i.overdueInvoices > 0) reasons.push('overdue_invoice');
```

Also sperrt **jede** überfällige Rechnung sofort, ohne Kulanz. §21.1 nennt
„overdue invoice beyond the **configured cure period**" — eine Frist ist dort
vorgesehen. Vermutlich wusste die Session, die #234 baute, von der Festlegung
nichts. Zu klären: wie viele Tage, ab Fälligkeit oder ab erster
fehlgeschlagener Abbuchung, und ob eine **bestehende** Buchung davon unberührt
bleibt.

**Zweitens:** `provider_subscriptions` hat weiterhin keinen Schreiber, den ich
finden konnte — #234 bringt Stripe und die Bereitschaftsprüfung, aber ein Weg,
einen Tarif anzulegen (Checkout oder Zuweisung), fehlt. Zu prüfen, bevor
jemand erwartet, dass eine Buchung durchgeht.

**Drittens:** Die neue Copy ist nicht abgenommen.

---

Gemergt am 2026-10-01 mit PR #233 (Squash `1d861061`).
