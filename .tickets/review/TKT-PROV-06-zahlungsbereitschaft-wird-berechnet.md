---
title: "Zahlungsbereitschaft wird berechnet, nicht gepflegt — und ohne sie gibt es keinen Buchen-Knopf"
assignee: "Claude"
status: "review"
---

# Zahlungsbereitschaft wird berechnet

Nachlauf zu TKT-PROV-05. Dort stand der größere Befund als offener Punkt:
`providers.billing_ready` hatte `DEFAULT false` und **keinen Schreiber**. Jeder
Buchungsversuch bei jedem Anbieter endete deshalb in 409 `BILLING_NOT_READY`.

## Vier Entscheidungen des Nutzers (2026-10-01)

| | Entscheidung |
|---|---|
| Buchbarkeit | **Ein laufender bezahlter Tarif ist Voraussetzung.** |
| Kulanzfrist bei offener Rechnung | **OFFEN — muss besprochen werden.** Keine Zahl im Code. |
| Oberfläche | **Kein Buchen-Knopf**, wenn nicht gebucht werden kann. |
| Ermittlung | **Jedes Mal neu berechnen**, nie als Flag pflegen. |

## Was gebaut ist

**Die Regel, an einer Stelle und rein:** `chargeableFromSubscription(sub, today)`
in `billing.ts`. Abrechenbar ist, wer ein Abo mit Status `active` und einer
Periode hat, die heute noch läuft. Sonst `inactive_subscription` — ein Grundcode
aus der Sprache von §21.1, damit die Oberfläche ihn ohne neue Übersetzung
anzeigt.

**Die Spalte verlässt den View.** Naheliegend wäre, `bookable_chargeable` im
View zu berechnen. Das scheitert an einem Wächter, den jemand aus guten Gründen
gesetzt hat: `04_provider_pricing_test.sql` prüft, dass
`matchable_provider_services` von **keiner** Pricing-Tabelle abhängt — „wer das
Abo je in die Sichtbarkeit zieht, scheitert hier". Der Wächter kann SELECT-Liste
und WHERE nicht unterscheiden. Ihn zu lockern, um die eigene Lösung
durchzulassen, wäre das Falscheste gewesen: dahinter steht §14. Also trägt der
View jetzt **gar keine** Abrechnungsinformation mehr, und die API beantwortet
die Frage. Der View behält genau eine Aufgabe: darf dieser Anbieter erscheinen.

**Drei Aufrufer, eine Quelle:** die Buchung (`POST /scheduling`, weiter 409 mit
Grund), das Aktivierungs-Gate (meldet, sperrt nicht — TKT-PROV-05) und die
Detailseite, die das Ergebnis mitliefert.

**Kein Knopf ohne Buchbarkeit.** `BookingRail` kehrt früh zurück: keine
Terminliste, kein Knopf, stattdessen zwei Sätze. Die Terminliste fällt mit weg —
eine Liste freier Zeiten lädt zum Klick ein, der ins Nichts führt. Der Grund
bleibt beim Anbieter: dass sein Tarif fehlt, ist nicht Sache des Nutzers.

## Acceptance Criteria

- [x] Migration `20261001000000`: `bookable_chargeable` verlässt den View
  (DROP + CREATE, ohne CASCADE); `security_invoker = true` und die Rechte neu
  gesetzt; `providers.billing_ready` als abgelöst kommentiert, nicht gelöscht.
- [x] `chargeableFromSubscription` rein und getestet; `MatchableProviderService`
  trägt das Feld nicht mehr, mit Begründung am Typ.
- [x] Buchung, Gate und Detail holen die Antwort von dort.
- [x] `ProviderDetailPage`: früher Rücksprung ohne Knopf und ohne Slots; zwei
  neue Copy-Schlüssel in en/de/es/tr (unter `results:detail.*`, also noch
  **nicht abgenommene** Copy — `common:states.*` duldet nur Abgenommenes).
- [x] Mock-API (`src/mock/demoApi.ts`, nach dem Umzug in #230): `p2Gate` liefert
  `billing` mit, das Detail `bookable_chargeable`. Im Mock sind **alle** drei
  Anbieter buchbar, und das mit Absicht — von den Anbietern mit Detailseite ist
  `madrid-tax` der einzige ohne Termin, also genau der, den man anklickt, um die
  Buchung zu sehen. Ihn zu sperren hätte dem Datensatz seinen Zweck genommen.
  Für den lokalen Blick auf den gesperrten Fall genügt eine Zeile; abgesichert
  ist er durch die drei Wächter.
- [x] `openapi.yaml`: das Detailfeld dokumentiert.
- [x] Tests: 5 neue Regel-Tests (inkl. letzter Tag der Periode und einer
  Gegenprobe, dass eine offene Rechnung NICHT sperrt), 3 UI-Wächter, pgTAP auf
  `hasnt_column` verschärft, Teststore auf einen echten Tarif umgestellt.
  Gegenproben gefahren: Zweig entfernt → 3 UI-Tests fallen.
- [x] `build`, `typecheck`, UI-`tsc`, `i18n:check`, `terminology:check` grün;
  **276 API-, 253 UI-Tests, 139 DB-Checks.**

## DNA-Check

Betroffen: Monetarisierung (Zahlungsstatus als Zugangsbedingung), Copy und
Microcopy (der gesperrte Zweig), Provider-Policies.

- **Echte Bedürfnisse des Users zuerst:** Ein Termin, den wir nicht bestätigen
  können, wird nicht angeboten. Der Nutzer wählt nicht länger eine Zeit, um
  dann abgewiesen zu werden — das war die Variante, die seine Zeit kostet und
  uns nichts.
- **Technologie erhält den Zugang, statt eine Barriere davor zu bauen:** Die
  Angaben bleiben sichtbar, der Vergleich bleibt möglich. Es verschwindet nur
  die Handlung, die nicht funktioniert.
- **Fairness zwischen Providern:** Die Buchbarkeit hängt am Tarif, die
  **Sichtbarkeit nicht** — und das ist durch zwei Wächter festgenagelt (pgTAP
  `hasnt_column`, API-Test „matcht trotzdem ohne Tarif"). Ein Anbieter ohne
  Tarif verschwindet nicht aus dem Matching.
- **Niemanden kleiner machen:** Der Nutzer erfährt nicht, dass dem Anbieter ein
  Tarif fehlt. Das ist unsere Vertragsangelegenheit, keine Information, die
  einen Anbieter vor Kunden klein macht.
- **Unsicherheit nicht hinter sicherer Sprache verstecken:** Drei der sechs
  Fälle aus §21.1 können wir heute nicht prüfen, weil niemand Meldungen vom
  Zahlungsdienstleister annimmt. Das steht so im Code, in der Migration und
  hier — statt eine Prüfung zu behaupten, die nicht stattfindet.
- **Stärkt es Vertrauen:** Ein gespeichertes Flag, das niemand pflegt, ist ein
  stilles Versprechen. Eine Regel, die bei jeder Abfrage neu rechnet, kann
  nicht veralten.

Nicht betroffen: Dringlichkeitssprache, Ranking, AI-Verhalten.

## Offen

**1. Die Kulanzfrist bei einer offenen Rechnung — zu besprechen.**
Festgehalten auf Wunsch des Nutzers (2026-10-01). §21.1 nennt „overdue invoice
beyond the configured cure period" und lässt die Zahl offen. Bis sie entschieden
ist, sperrt eine offene Rechnung **nicht**, und ein Test hält das fest, damit
niemand still eine Frist erfindet. Zu klären: wie viele Tage, ab Fälligkeit oder
ab erster fehlgeschlagener Abbuchung, und ob eine bestehende Buchung davon
unberührt bleibt.

**2. `provider_subscriptions` hat selbst noch keinen Schreiber.** Es gibt keinen
Weg, einen Tarif anzulegen — kein Checkout, keine Zuweisung durch einen Admin.
Diese Änderung macht damit noch niemanden buchbar; sie ersetzt ein totes Flag
durch eine Regel, die greift, sobald ein Tarif entstehen kann. Das ist der
nächste Schritt und der größte verbleibende.

**3. Drei der sechs §21.1-Fälle fehlen:** gültige Zahlungsmethode, Mandat,
zurückgezogene Ermächtigung. Dafür müsste der Zahlungsdienstleister Meldungen
schicken; es gibt keine Stelle, die sie annimmt. `stripe_customer_id` wird
bereits angelegt, die Gegenrichtung fehlt vollständig.

**4. Die neue Copy ist nicht abgenommen.** Zwei Sätze auf der Detailseite,
bewusst unter `results:detail.*` statt `common:states.*`.
