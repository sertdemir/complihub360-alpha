---
title: "Kulanzfrist, Tarifwechsel und Kündigung umsetzen (ADR-0006)"
assignee: "Claude"
status: "doing"
---

# Kulanzfrist, Tarifwechsel und Kündigung

Umsetzung von [`ADR-0006`](../../docs/decisions/ADR-0006-abo-kulanz-wechsel-kuendigung.md),
Entscheidung des Nutzers vom 2026-10-07: **A2 · B2 · C2**.

Spec B führte die drei unter „Configurable items requiring final decision". Sie
waren nie Lücken, sondern wirksame Defaults, die niemand beschlossen hatte —
null Kulanz, kein Wechsel, keine Selbstkündigung. Jetzt sind sie beschlossen.

## Die drei Regeln

| | Regel | „Periodenende" |
|---|---|---|
| **Kulanzfrist** | Eine offene Rechnung sperrt die Buchung erst **7 Tage nach `due_at`**. Ab Tag 1 sichtbar, ab Tag 8 sperrend. Der Wert ist Konfiguration (Spec A §21.1: *„configured cure period"*), nicht ein Literal. | — |
| **Tarifwechsel** | Wird vorgemerkt, tritt zum Periodenende in Kraft. Keine anteilige Abrechnung. | `renewal_date` |
| **Kündigung** | Der Anbieter kündigt selbst, das Abo läuft bis zum Stichtag. Keine Erstattung. Bis dahin rücknehmbar. | `renewal_date` |

**`renewal_date`, nicht `current_period_end`.** Die beiden sind nur bei
monatlicher Zahlweise dasselbe. Wer sie verwechselt, beendet ein bezahltes
Jahresabo nach vier Wochen. Dieselbe Verwechslung hat schon einmal fast die
Rabatt-Leads von Monat auf Jahr gestreckt (`TKT-PROV-07`, #240).

## Stufen

Bewusst getrennt, weil Stufe 1 heute schon Schaden verhindert und ohne
Migration auskommt.

### Stufe 1 — Kulanzfrist  ✅ gemergt (PR #268, `4cc2dd29`)

- [x] `billingReadiness` wird zeitabhängig: die Frist kommt als Eingabe, die
      Funktion bleibt rein. Heute zählt `syncBillingReadiness` nur
      `due_at < now`; künftig `due_at + Frist < now`.
- [x] Der Wert als Konfiguration mit Vorgabe 7, nicht als Literal.
- [x] `/billing` zeigt ab Tag 1 die offene Rechnung **und das Datum, ab dem
      gesperrt wird** — als Hinweis, nicht als Sperre. Ohne diesen Teil ist die
      Frist nur eine stillere Sperre.
- [x] Copy in en, de, es, tr.
- [x] Tests samt Gegenproben: Tag 0, Tag 7, Tag 8; und dass die **Sichtbarkeit**
      unberührt bleibt (Spec A §14).

### Stufe 2 — Wechsel und Kündigung  ✅ Backend, Figma und Oberfläche fertig

- [x] Migration: `provider_subscriptions` bekommt den vorgemerkten Zustand
      (Stichtag + Zieltarif). Versionsnummer **nach** allem, was auf Staging
      liegt — sonst sortiert sie davor (vgl. #241).
- [x] Vormerken, zurücknehmen, ausführen. Ausgeführt wird im selben Lauf, der
      die Perioden weiterrollt (`runSubscriptionPeriodTick`) — beides passiert
      an derselben Grenze.
- [x] **Downgrade unter die genutzten Hauptkategorien wird abgelehnt**, nicht
      vorgemerkt. `categoryAllowanceCheck` fließt über `verificationRules` in
      `missing` ein; ein vorgemerkter Downgrade würde den Anbieter zum Stichtag
      still deaktivieren. Ablehnung mit konkretem Grund.
- [x] **Eine offene Rechnung darf die Kündigung nicht blockieren** — sonst
      verstellt die Sperre den Ausgang.
- [x] Oberfläche: Zustand F in `/subscription` bekommt Wechsel und Kündigung
      mit Stichtag. **Der heutige Text dort wird falsch** und muss weg — er
      sagt, dass es beides nicht gibt.
- [x] Benachrichtigungen (`subscription_scheduled`, `subscription_schedule_done`)
      und Copy in vier Sprachen (`subscription.manage.*`, 30 Schlüssel).
- [x] Tests samt Gegenproben, besonders: Jahresabo kündigen endet zur
      Verlängerung, nicht zum Monatsende. 23 + 5 Tests.

## Zwei Funde aus Stufe 2

**`status = 'cancelled'` heißt im Code „jetzt inaktiv", nicht „gekündigt".**
`billingReadiness` setzt daraufhin `inactive_subscription`,
`subscriptionChargeForPeriod` liefert keine Abo-Zeile mehr. Eine vorgemerkte
Kündigung über den Status abzubilden hätte dem Anbieter Buchbarkeit und
Abrechnung in der Sekunde genommen, in der er kündigt — für eine Periode, die
er bezahlt hat. Der Zustand liegt deshalb in eigenen Spalten.

**Der Ownership-Guard deckte `/subscription/schedule` nicht ab.** Der Regex in
`providerAuth.ts` endete bei `subscription`; jeder Eingeloggte hätte fremde
Abos kündigen können. Nachgetragen und gegengeprobt (ohne den Eintrag fallen
zwei Tests, und der fremde Login kommt bis in den Handler).

## DNA-Check

Auslöser: **Monetarisierung**, **Copy/Microcopy**, **Registrierung/Gating**.
`KN-BRAND-001` gelesen.

- **Angst wird nie zur Conversion eingesetzt.** Die Kulanzfrist-Anzeige nennt
  Datum und Folge, ohne Countdown und ohne Drohton. Sie steht, weil der
  Anbieter es wissen soll — nicht, damit er schneller zahlt.
- **Never make the user feel small.** Der eigentliche Fehler am heutigen
  Zustand ist nicht die Sperre, sondern dass sie **unangekündigt** eintritt:
  der Anbieter merkt sie an ausbleibenden Anfragen. Der Hinweis ab Tag 1 ist
  deshalb nicht Beiwerk, sondern der Kern von Stufe 1.
- **Nie Reibung, um den Zugang zu einem Menschen zu verhindern.** Die
  Selbstkündigung nimmt die Mail an `partners@` als Pflichtweg weg. Der Weg
  zum Menschen bleibt, er ist nur nicht mehr der einzige.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken.** Was Spec B
  weiterhin offen lässt — `failed-payment retry`, `reactivation rules` —
  bleibt offen und wird nicht nebenbei miterfunden.
- **Respekt unabhängig von der Größe.** Eine Frist für alle, kein Ermessen.

Nicht berührt: Risk Map, Wizard, Ranking, AI-Verhalten. Die **Sichtbarkeit**
bleibt ausdrücklich unberührt (Spec A §14).

## Befund aus Stufe 1 — „Kulanzfrist" bedeutet auf `/billing` zweierlei

Zwei bestehende Texte benutzen das Wort schon:

- `billing.statusFailedGrace` — „fehlgeschlagen · Kulanzfrist"
- `billing.paymentFailedBanner` — „Zahlung zu {{invoice}} fehlgeschlagen · Kulanzfrist läuft"

Beide meinen etwas **anderes** als die jetzt beschlossene Frist: sie sprechen
von einer Nachfrist nach einer **gescheiterten Zahlung**. Das ist in Spec B
`failed-payment retry` — und das ist **nicht entschieden**. Der Text nennt also
eine Regel, die es nicht gibt, und seit Stufe 1 steht dasselbe Wort auf
derselben Seite für eine Regel, die es gibt.

Nicht eigenmächtig geändert: das ist Produkt-Copy und berührt einen offenen
Spec-B-Punkt. Vorschlag zur Entscheidung — die beiden Texte sagen künftig, was
wirklich passiert („Zahlung fehlgeschlagen · ein anderes Zahlungsmittel hebt die
Sperre auf"), ohne eine Frist zu behaupten. Oder `failed-payment retry` wird
entschieden, dann darf das Wort bleiben.

## Offen, nicht Teil dieses Tickets

`failed-payment retry` und `reactivation rules` aus derselben Spec-B-Liste.
A2/B2/C2 entscheiden sie **nicht** mit; beide brauchen je eine eigene Vorlage.
