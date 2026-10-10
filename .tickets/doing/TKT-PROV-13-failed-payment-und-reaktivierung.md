---
title: "Gescheiterte Zahlung und Reaktivierung entscheiden (ADR-0008)"
assignee: "Nutzer (Entscheidung) · Claude (Umsetzung)"
status: "doing"
---

# Gescheiterte Zahlung und Reaktivierung

[`ADR-0008`](../../docs/decisions/ADR-0008-failed-payment-retry-und-reaktivierung.md)
ist entschieden (2026-10-10): **A2 · B2 · C2 · D2**. Stand der Umsetzung
unten unter *Fortschritt*.

Damit sind die letzten beiden der fünf Spec-B-Punkte aufbereitet, die unter
„Configurable items requiring final decision" standen. Die ersten drei sind
mit ADR-0006 (A2 · B2 · C2) entschieden und gebaut.

## Zu entscheiden

| | Frage | Optionen |
| --- | --- | --- |
| **A** | Was hebt die Sperre nach einer gescheiterten **Lead-Belastung** auf? | A1 bleibt wie es ist · A2 Prüfung auf Anstoß · A3 automatischer Plan |
| **B** | Wird eine offene **Abo-Rechnung** erneut eingezogen? | B1 nein · B2 Stripes Wiederholung in der Kulanzfrist · B3 eigener Plan |
| **C** | Was gilt bei einem **Neustart** nach dem Ende? | C1 bleibt wie es ist · C2 Rabattzähler des Monats wird mitgenommen · C3 Sperrfrist |
| **D** | Die **Copy** auf `/billing` | D1 begradigen · D2 begradigen und das Wort reservieren · D3 warten |

## Der Teil, der nicht warten sollte

Unabhängig von A, B und C stehen auf `/billing` heute **drei Aussagen, die
nicht stimmen**:

- `statusFailedGrace` und `paymentFailedBanner` nennen eine **Kulanzfrist nach
  gescheiterter Zahlung** — die gibt es nicht. Seit ADR-0006 bezeichnet
  dasselbe Wort auf derselben Seite eine Frist, die es gibt.
- `paymentFailedBody` sagt „bitte **erneut versuchen**" — das geht nicht,
  dieselbe Karte bleibt gesperrt — und droht mit einer **Workspace-Sperre**,
  die nicht eintritt.

Die Readiness-Box auf derselben Seite sagt es bereits richtig und widerspricht
diesen dreien.

**Nach dem DNA-Filter sind zwei davon Verstöße, nicht nur Ungenauigkeiten:**
eine Drohung mit einer Folge, die nicht eintritt (*Angst wird nie zur
Conversion eingesetzt*), und eine behauptete laufende Frist (*Unsicherheit
wird nie hinter selbstsicherer Sprache versteckt*). Deshalb ist D3 — warten —
die einzige Option, die den Verstoß verlängert.

## Was beim Umsetzen nicht verrutschen darf

- **Eine Wiederholung verschiebt den Kulanz-Stichtag nie.** Sonst sind die
  sieben Tage aus ADR-0006 nicht mehr sieben Tage, sondern „sieben plus so
  viele, wie Stripe probiert".
- **Bei einer gescheiterten Lead-Belastung gibt es nichts nachzubelasten.**
  Die Buchung kam nicht zustande (ADR-0005). Zu klären ist nur, was die Sperre
  für die NÄCHSTE Buchung aufhebt.
- **Die Sichtbarkeit bleibt unberührt** (Spec A §14) — keine der Optionen
  berührt sie, und ein pgTAP-Wächter hält jede Preis-Tabelle aus
  `matchable_provider_services` heraus.

## DNA-Check

Auslöser: **Monetarisierung**, **Copy/Microcopy**. `KN-BRAND-001` gelesen.

- **Angst wird nie zur Conversion eingesetzt.** Die heutige „Workspace-Sperre"
  ist genau das; sie fällt in jeder D-Option außer D3 weg.
- **Nie Reibung, um den Zugang zu einem Menschen oder zurück zu verhindern.**
  Deshalb ist C3 (Sperrfrist nach Kündigung) in der Vorlage ausdrücklich als
  DNA-kritisch markiert, nicht nur als teuer.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken.** „Kulanzfrist
  läuft" behauptet eine laufende Uhr, die es nicht gibt.
- **Keine Entscheidung im Code.** Die Vorlage legt Optionen vor und beantwortet
  nichts — auch nicht nebenbei in einer Sprachdatei. Genau so ist der heutige
  Zustand entstanden.

Nicht berührt: Risk Map, Wizard, Ranking, AI-Verhalten.

## Fortschritt (2026-10-10)

- [x] **D2** — drei Texte in vier Sprachen wahr gemacht, Hinweis als Warnung
  mit Weg ins Portal; `copy:check` reserviert „Kulanzfrist"/„grace" auf
  `providerws.billing.*` für `grace*`-Schlüssel.
- [x] **C2** — `carriedDiscountCount` + Übernahme in `startSubscription`;
  Unit- und Routentest.
- [x] **A2 Backend** — `POST /provider/:key/billing/recheck`
  (`verifyPaymentMethod` per SetupIntent, `recheckPaymentMethod`, drei
  Prüfungen in 24 h); fünf Routentests, OpenAPI.
- [ ] **A2 Oberfläche** — Canvas mit je drei Varianten für Knopf-Ort und
  Ergebnisanzeige liegt beim Nutzer; danach Figma → lokal → Review.
- [ ] **B2** — so nicht baubar: Smart Retries gelten nur für
  `charge_automatically`, die Abo-Rechnungen laufen als `send_invoice`.
  Umsetzungsweg liegt beim Nutzer; bis dahin gilt B1. Vorher zu prüfen: ob
  das Zahlungsmandat (`billing_authorization`, Fassung 2026-09) auch die
  Belastung von Abo-Rechnungen abdeckt — der Text liegt nicht im Repo.
- [ ] Auf Staging prüfen, ob der Stripe-Key SetupIntents anlegen darf
  (Restricted Key, vgl. Befund 2026-10-04).
