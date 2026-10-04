---
title: "Tarifwahl im Anbieterportal — Oberfläche zu #240"
assignee: "Claude"
status: "doing"
---

# Tarifwahl im Anbieterportal

Das Backend steht seit **#240** (`TKT-PROV-07`): `GET`/`POST
/api/v1/provider/:key/subscription` und `POST /api/v1/admin/provider-subscriptions`.
Im Produkt gibt es die Fläche nicht — ein Anbieter kann keinen Tarif wählen und
ist damit **nie buchbar**, weil `billingReadiness` ein laufendes Abo verlangt.

Das war offener Punkt 1 aus `TKT-PROV-07`.

## Canvas-Wahl (Nutzer, 2026-10-04)

Sieben Flächen, je drei Varianten, in einem Canvas bei 1440 px mit den Werten
aus `index.css`. Der Nutzer hat die Empfehlung komplett übernommen:

| Fläche | Wahl | Was das heißt |
|---|---|---|
| A Seitenkopf | **A3** | „Welcher Tarif passt zu Ihrem Angebot?" plus Hinweis auf die freigegebenen Hauptkategorien des Anbieters. Macht aus „kaufen" ein „passen". |
| B Zahlweise | **B1** | Umschalter monatlich/jährlich über den Tarifen, die Regel („zwölf Monate zum Preis von zehn") steht **einmal** darunter. |
| C Die drei Tarife | **C1** | Drei Karten mit gleichem Gewicht. Kein „beliebtester Tarif" — die Zahl dafür haben wir nicht, ein erfundenes Siegel wäre Druck. |
| D Was ein Tarif nicht ändert | **D2** | Eigene Fläche, die vier Punkte aus Spec B **einzeln** benannt. |
| E Beim Wählen | **E2** | Bestätigungsschritt mit Preis, Beginn, erster Rechnung und Verlängerung — plus dem Satz, dass ein Tarif allein nicht buchbar macht. |
| F Tarif läuft schon | **F2** | Fläche mit dem laufenden Tarif und dem **echten Grund**, warum ein Wechsel hier nicht geht. |
| G Konto kann nicht | **G3** | Grund beim Namen, dazu was *nicht* betroffen ist und wann es weitergeht. |

Verworfen und warum — damit niemand es später „verbessert":

- **C3** (Empfehlung zuerst) ist Lenkung, auch begründet. Spec B: *„we do not
  create needs."*
- **D3** (Zusage in jeder Karte) klingt dreimal wiederholt wie eine
  Rechtfertigung statt wie eine Selbstverständlichkeit.
- **F3** (alle Tarife sichtbar, nicht benutzbar) weckt die Erwartung eines
  Wechsels, dessen Weg eine Mail ist — genau die Reibung, die die DNA
  ausschließt.
- **G1** („geht nicht, frag nach" ohne Grund) ist die Vagheit, die die DNA
  ausschließt.
- **E3** (Hinweis erst nach dem Abschluss) kollidiert mit *„show value before
  asking for commitment."*

## Die drei Tatsachen, die E2 tragen muss

1. Der Tarif beginnt **sofort**.
2. Die Rechnung kommt mit dem Periodenlauf (`POST /admin/billing/run`,
   `send_invoice`) und ist in **14 Tagen** fällig. Es gibt **kein Stripe-Abo** —
   wer hier eines einbaut, rechnet doppelt ab.
3. **Ein Tarif allein macht nicht buchbar.** Dafür braucht es zusätzlich ein
   hinterlegtes Zahlungsmittel (`billingReadiness`, eine von sieben
   Bedingungen). Ohne diesen Satz wartet jemand auf Buchungen, die nie kommen.

## Stand im UI-Workflow

- [x] **Stufe 1 Canvas** — abgenommen 2026-10-04 (Wahl oben).
- [ ] **Stufe 2 Figma** — finaler Screen mit Compass-Komponenten und -Variablen.
- [ ] **Stufe 3 lokal** — Feature-Branch, `npm run dev:ui`, Screenshots, Review.
- [ ] **Stufe 4 Staging**.

## Was unabhängig von der Wahl entsteht

1. Seite unter `/partner-dashboard/subscription`, im `ProviderShell` wie
   `/billing`, mit `useApiData` gegen `GET /provider/:key/subscription`.
2. Copy in vier Sprachen (en, de, es, tr). **Noch nicht abgenommen** — die
   Abnahme ist ein eigener Schritt.
3. Vier Zustände: ohne Abo · mit laufendem Abo · nicht berechtigt
   (`409 PROVIDER_NOT_ELIGIBLE`) · Stripe nicht konfiguriert.
4. Tests samt Gegenproben und Mock-Daten für den lokalen Lauf.

## DNA-Check

Auslöser: **Monetarisierung**, **Copy/Microcopy**, **Registrierung/Gating**.
`KN-BRAND-001` vor dem Canvas gelesen.

- **„We do not create needs. We identify them."** — A3 fragt nach Passung statt
  nach Kaufabsicht, und die Zahl dafür kommt aus den freigegebenen Bereichen des
  Anbieters. C3 wurde genau deshalb verworfen.
- **Angst wird nie zur Conversion eingesetzt.** — Keine Frist, kein Countdown,
  kein „beliebtester Tarif", kein Prozent-Rabatt-Siegel. Der Jahresvorteil steht
  in **Monaten**, wie Spec B ihn nennt.
- **Kein bezahltes Ranking.** — D2 benennt die vier Punkte aus Spec B einzeln.
  Technisch ist es ohnehin gesichert (pgTAP-Wächter hält jede Preis-Tabelle aus
  `matchable_provider_services`), aber gesagt hat es dem Anbieter bisher niemand.
- **Show value before asking for commitment.** — Ein Anbieter kann sein Dossier
  füllen, einreichen und aktiviert werden, ohne zu zahlen (TKT-PROV-05). Der
  Tarif steht am Ende des Weges, nicht als Tor davor.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken.** — F2 nennt
  den echten Grund: die Regeln für anteilige Abrechnung und Kündigungsfristen
  sind in Spec B reserviert, bis dahin macht es ein Mensch.
- **Nie Reibung, um den Zugang zu einem Menschen zu verhindern.** — F2 und G3
  nennen die Adresse, ohne Formular davor.
- **Respekt unabhängig von der Größe.** — Preise aus `plan_catalog`, für alle
  dieselben; keine Staffel, kein Sonderpfad.
- **Never make the user feel small.** — G3 sagt „ein Hinweis wird geprüft",
  nicht „Ihr Konto ist gesperrt", und nennt, was *nicht* betroffen ist.

Nicht berührt: Risk Map, Wizard, Ranking, AI-Verhalten.

## Offen, nicht Teil dieser Fläche

1. **Die Kulanzfrist** bei offener Rechnung — steht faktisch auf null
   (`overdueInvoices > 0`), Spec A §21.1 sieht eine „configured cure period"
   vor. Entscheidung des Nutzers, ausdrücklich geparkt.
2. **Tarifwechsel und Kündigung** durch den Anbieter selbst — erst nach den
   Regeln, die Spec B unter „Configurable items requiring final decision"
   reserviert.
3. **`provider_subscriptions` hat weiterhin keinen Weg aus der Oberfläche** —
   genau das baut dieses Ticket.
