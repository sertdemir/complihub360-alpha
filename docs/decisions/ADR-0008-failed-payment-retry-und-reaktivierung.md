# ADR-0008: Gescheiterte Zahlung und Reaktivierung

**Status:** PROPOSED — Entscheidungsvorlage, nichts davon ist umgesetzt
**Date:** 2026-10-10
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Configurable items requiring final decision": *„Subscription proration, cancellation notice, grace period, failed-payment retry, and reactivation rules."* · *Spec A* §21.1 (Billing Readiness) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) · ADR-0003 (Pricing v2) · ADR-0005 (Buchung → Belastung) · ADR-0006 (Kulanzfrist, Wechsel, Kündigung) · `TKT-PROV-11`
**Was ADR-0006 offen gelassen hat:** Dort wurden drei der fünf Spec-B-Punkte entschieden (A2 · B2 · C2). Die beiden letzten — `failed-payment retry` und `reactivation rules` — blieben ausdrücklich liegen. Diese Vorlage holt sie nach.
**Warum erst eine Vorlage:** Beide haben Geldfolge für den Anbieter. [`CLAUDE.md`](../../CLAUDE.md) verbietet, einen solchen Punkt im Code aufzulösen. Die Abschnitte *Context* und *Optionen* bleiben nach einer Entscheidung unverändert stehen — sie sind der Beleg, was abgewogen wurde.

---

## Context — was heute gilt

### 0. „Gescheiterte Zahlung" sind zwei verschiedene Dinge

Der Begriff aus Spec B trifft im Code auf zwei getrennte Vorgänge. Wer sie
zusammenwirft, entscheidet eine Frage zweimal falsch:

| | Was es ist | Wann | Was heute passiert |
|---|---|---|---|
| **Lead-Belastung** | Ein `PaymentIntent` off-session im Moment der Buchung (ADR-0005). | Je gebuchtem Lead. | Scheitert sie, **gibt es keine Buchung** — kein Termin, kein Slot belegt, kein Zähler. |
| **Abo-Rechnung** | Eine Stripe-Rechnung je Periode (`send_invoice`, 14 Tage Zahlungsziel). | Monatlich bzw. jährlich. | Verstreicht `due_at`, greift seit ADR-0006 (A2) die **Kulanzfrist von sieben Tagen**, dann sperrt `overdue_invoice`. |

**Für die Lead-Belastung ist „retry" im Wortsinn gegenstandslos.** Die Buchung
kam nicht zustande, der Slot ist frei, der Nutzer hat eine Absage gelesen und
ist weitergezogen. Es gibt nichts nachzubelasten — eine Leistung, die nie
erbracht wurde, lässt sich nicht nachträglich in Rechnung stellen. Die einzige
sinnvolle Frage lautet hier: **was hebt die Sperre für die NÄCHSTE Buchung
auf?**

Für die Abo-Rechnung ist „retry" dagegen wörtlich gemeint: dieselbe Forderung
noch einmal einziehen.

### 1. Gescheiterte Lead-Belastung — es gibt keinen Wiederholungsversuch

`recordPaymentFailure` (`leadCharge.ts`) setzt `billing_ready = false`, den
Grund `payment_failed` und `last_payment_failure` mit der verwendeten
Zahlungsmittel-ID. Aufgehoben wird die Sperre an genau einer Stelle:

```ts
// leadCharge.ts — syncBillingReadiness
lastPaymentFailed: !!failure && !!pmId && failure.payment_method_id === pmId,
```

Der Grund verschwindet also **nur, wenn das Standard-Zahlungsmittel ein anderes
ist als das gescheiterte**. Dieselbe Karte bleibt gesperrt — auch dann, wenn
sie inzwischen wieder gedeckt wäre. Es gibt keinen Knopf, keinen Lauf und
keinen Zeitablauf, der das ändert.

Das ist eine bewusste Entscheidung aus ADR-0005 („dieselbe Karte bleibt
gesperrt"), aber sie beantwortet nur den Normalfall *Karte dauerhaft
ungültig*. Der Fall *Karte war an einem Tag nicht gedeckt* hat heute keinen
Ausgang außer: ein anderes Zahlungsmittel hinterlegen.

### 2. Reaktivierung — nicht geregelt, aber folgenreich

Nach `endSubscription` ist die Zeile `ended`, der Partial Unique Index
`provider_subscriptions_one_open` gibt den Platz frei, und `startSubscription`
legt ohne weitere Prüfung ein neues Abo an. Es gibt **keine Wartezeit, keine
Bedingung und keinen Hinweis darauf, was ein Neustart mitnimmt.**

Mitgenommen wird faktisch:

| | Was damit passiert |
|---|---|
| Freigegebene Leistungen (`provider_services`) | bleiben; die Verifikation ist an das Konto gebunden, nicht ans Abo. |
| Nachweise, Vereinbarungen, Lebenszyklus | bleiben. |
| Bewertungen, Historie, Protokoll | bleiben. |
| **Lead-Rabattzähler** | **beginnt von vorn**, sobald der neue Zyklus an einem anderen Tag beginnt. |

Der letzte Punkt ist der einzige mit Geldfolge und verdient den genauen
Wortlaut. `provider_discount_counter` ist auf `(provider_key, cycle_start)`
geschlüsselt, und `cycleStartFor` nimmt `sub.currentPeriodStart`. Ein neues Abo
setzt `current_period_start = heute`. Beginnt der Anbieter also **mitten im
Monat** neu, zählt er ab null — Growth bekäme seine drei rabattierten Leads ein
zweites Mal im selben Kalendermonat.

Über den Selbstbedienungsweg ist das seit ADR-0006 (C2) kaum erreichbar: die
Kündigung wirkt zum `renewal_date`, und der Neustart an diesem Tag beginnt
ohnehin einen neuen Zyklus. **Offen bleibt der Admin-Weg** — `endSubscription`
wirkt sofort, auch mitten im Zyklus.

Der Kommentar an `applyMonthlyDiscount` sagt die Absicht ausdrücklich: *„Der
Zähler hängt am Anbieter und am Zyklus, nicht am Abo — ein Planwechsel im
Zyklus findet ihn vor und kann das Kontingent nur bis zur eigenen Grenze
ausschöpfen, nie von vorn."* Für den **Planwechsel** hält der Code das ein.
Für **Ende plus Neuanfang** nicht, weil dabei der Zyklus selbst neu beginnt.

### 3. Die Oberfläche behauptet heute drei Dinge, die nicht stimmen

Auf `/billing` stehen diese Texte (`providerws.billing.*`):

| Schlüssel | Text | Warum er falsch ist |
|---|---|---|
| `statusFailedGrace` | „fehlgeschlagen · **Kulanzfrist**" | Es gibt keine Kulanzfrist nach gescheiterter Zahlung. Seit ADR-0006 bezeichnet dasselbe Wort auf derselben Seite eine Frist, die es wirklich gibt — für offene Rechnungen. |
| `paymentFailedBanner` | „… fehlgeschlagen · **Kulanzfrist läuft**" | Dieselbe erfundene Frist, als laufende Uhr formuliert. |
| `paymentFailedBody` | „Bitte **erneut versuchen** oder die Zahlungsmethode aktualisieren, um eine **Workspace-Sperre** zu vermeiden." | Zwei Fehler: Es gibt **kein** erneutes Versuchen (dieselbe Karte bleibt gesperrt), und es droht **keine Workspace-Sperre** — der Anbieter behält vollen Zugang, nur die kostenpflichtige Buchung ist gesperrt, und die Sichtbarkeit bleibt unberührt (Spec A §14). |

Die Readiness-Box auf derselben Seite sagt es bereits richtig: *„Die letzte
Lead-Belastung ist gescheitert. Ein anderes Zahlungsmittel hebt die Sperre auf
— dieselbe Karte nicht."* Die drei Texte oben widersprechen ihr.

**Nach dem DNA-Filter sind zwei davon nicht nur ungenau, sondern Verstöße:**
„Workspace-Sperre" ist eine Drohung mit einer Folge, die nicht eintritt —
Angst als Antrieb. Und „Kulanzfrist läuft" versteckt Unsicherheit hinter
selbstsicherer Sprache: Es läuft nichts.

---

## Optionen

### A · Was hebt die Sperre nach einer gescheiterten Lead-Belastung auf?

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **A1** | **Bleibt wie es ist.** Nur ein anderes Standard-Zahlungsmittel hebt die Sperre auf. | Vorhersehbar und schon gebaut. Der Satz dazu ist heute schon wahr. | Eine einmal nicht gedeckte Karte sperrt dauerhaft, obwohl sie morgen wieder zahlen würde. Der Ausgang ist „neue Karte hinterlegen" — für manche Anbieter eine echte Hürde. |
| **A2** | **Prüfung auf Anstoß des Anbieters.** Ein Knopf „Zahlungsmittel erneut prüfen" legt einen `SetupIntent` über 0 € an; bestätigt Stripe das Mittel, fällt `payment_failed` weg. | Der Weg zurück ohne Kartenwechsel. Der Anbieter entscheidet, wann. | Eine Stripe-Route mehr, ein Zustand mehr auf `/billing`, und die Frage, wie oft das versucht werden darf. Eine bestätigte Karte kann bei der nächsten echten Belastung trotzdem scheitern. |
| **A3** | **Automatischer Wiederholungsplan.** Ein Lauf prüft das Mittel nach n Tagen selbst. | Der Anbieter muss gar nichts tun. | Die größte Fläche: Zeitplan, Abbruchbedingung, Webhook-Behandlung, und ein Zustand, der sich ohne Zutun ändert — schwer zu erklären, wenn er schiefgeht. Für die Lead-Belastung bringt es wenig: der verlorene Lead kommt nicht zurück. |

**Mein Hinweis, nicht meine Entscheidung:** A2 ist der kleinste Schritt, der
den Fall *vorübergehend nicht gedeckt* löst, ohne eine Automatik zu bauen, die
niemand beobachtet. A3 löst ein Problem, das es bei Lead-Belastungen nicht gibt
— dort ist nichts nachzuholen, nur freizugeben.

### B · Wird eine offene Abo-Rechnung erneut eingezogen?

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **B1** | **Nein.** Die Rechnung bleibt offen, nach der Kulanzfrist sperrt `overdue_invoice`. Bezahlt wird über das Portal. | Klar: die Rechnung liegt beim Anbieter. | Eine Rechnung, die nur an einem Tag nicht durchging, kostet sieben Tage später Umsatz — obwohl nie jemand nachgefasst hat. |
| **B2** | **Stripes eigene Wiederholung aktivieren** (`collection_method` bleibt `send_invoice`, zusätzlich Smart Retries auf dem hinterlegten Mittel), begrenzt auf die Kulanzfrist. | Der häufigste Fall löst sich von selbst, innerhalb einer Frist, die schon beschlossen ist. | Braucht Webhook-Behandlung (`invoice.payment_failed`, `invoice.paid`) und eine Entscheidung, ob eine Wiederholung den Kulanz-Stichtag verschiebt. Sie darf es **nicht** — sonst wandert eine beschlossene Frist unbemerkt. |
| **B3** | **Eigener Wiederholungsplan im Monatslauf.** | Volle Kontrolle über Zeitpunkte und Protokoll. | Baut nach, was Stripe schon kann, inklusive aller Fehlerfälle. Teuerste Option ohne erkennbaren Gewinn. |

**Hinweis:** B2 fügt sich in eine Frist, die bereits entschieden ist — die
sieben Tage aus ADR-0006 begrenzen die Wiederholungen von selbst. Wichtig ist
die eine Regel daneben: **Der Stichtag wird von einer Wiederholung nie
verschoben.** Sonst wäre die Frist nicht mehr sieben Tage, sondern „sieben Tage
plus so viele, wie Stripe probiert".

### C · Was gilt bei einem Neustart nach dem Ende?

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **C1** | **Bleibt wie es ist.** Jederzeit neu beginnen, nichts wird mitgenommen, der Rabattzähler beginnt mit dem neuen Zyklus von vorn. | Keine Hürde beim Wiederkommen. | Über den Admin-Weg (sofortiges `endSubscription` mitten im Zyklus) lässt sich das Rabattkontingent im selben Kalendermonat ein zweites Mal ausschöpfen. Heute unbemerkt und ungezählt. |
| **C2** | **Jederzeit neu beginnen; der Rabattzähler des laufenden Kalendermonats wird mitgenommen.** Beim Anlegen wird ein Zählerstand desselben Monats übernommen. | Unverändert niedrigschwellig. Der Zähler tut, was der Kommentar an `applyMonthlyDiscount` ohnehin behauptet. | Eine Regel mehr beim Anlegen und ein Test dafür. Der Zähler ist dann nicht mehr rein am Zyklus geschlüsselt — das gehört dokumentiert, sonst widerspricht es ADR-0003. |
| **C3** | **Sperrfrist**: kein Neustart vor dem nächsten Zyklusbeginn. | — | **Reibung auf dem Weg zurück.** Wer wiederkommen will, wird ausgebremst, ohne dass jemand davor geschützt wird. Das kollidiert mit der DNA („nie Reibung erzeugen, um Zugang zu verhindern") und löst das Zählerproblem nur als Nebenwirkung. |

**Mein Hinweis:** C2 löst genau das eine, was Geldfolge hat, und lässt den
Zugang unangetastet. C3 würde ich nicht wählen — es bestraft das Wiederkommen,
um einen Zähler zu schützen, und dafür gibt es mit C2 einen direkten Weg.

### D · Die Copy auf `/billing`

Sie muss sich ändern, **egal wie A, B und C ausgehen** — drei ihrer Aussagen
sind schon heute unwahr. Die Frage ist nur, wann und wie weit.

| | Regel | Kosten |
|---|---|---|
| **D1** | **Nur begradigen.** Die drei Texte sagen, was wirklich passiert; das Wort „Kulanzfrist" verschwindet dort, „Workspace-Sperre" ebenso. | Vier Sprachen, eine halbe Stunde. Muss nach einer Entscheidung zu A noch einmal angefasst werden. |
| **D2** | **Begradigen und das Wort reservieren.** Zusätzlich festhalten, dass „Kulanzfrist" auf dieser Seite ausschließlich die beschlossene Frist für offene Rechnungen bezeichnet — als Zeile in der abgenommenen Zustands-Copy, damit `copy:check` es hält. | Wie D1, plus ein Eintrag im Copy-Vertrag. |
| **D3** | **Warten, bis A entschieden ist**, dann in einem Zug. | Bis dahin stehen drei falsche Aussagen auf einer Seite, die Geld betrifft — darunter eine Drohung mit einer Folge, die nicht eintritt. |

**Mein Hinweis:** D3 ist die einzige Option, die den heutigen Zustand
verlängert, und der heutige Zustand verstößt gegen die DNA. D1 ist sofort
möglich und unabhängig von allem anderen.

---

## Was zusammenhängt

- **A und D hängen zusammen, aber nicht voneinander ab.** Gibt es A2, bekommt
  die Fläche einen Knopf; gibt es ihn nicht, bleibt der Satz „ein anderes
  Zahlungsmittel hebt die Sperre auf". Beides ist wahr — die heutige Copy ist
  es in keiner der beiden Welten.
- **B und ADR-0006 A2 hängen zusammen.** Die sieben Tage sind der Rahmen, in
  dem eine Wiederholung stattfinden kann. Sie dürfen durch eine Wiederholung
  nicht wandern.
- **C und ADR-0003 hängen zusammen.** Wird C2 gewählt, ist der Rabattzähler
  nicht mehr rein am Abo-Zyklus geschlüsselt. Das ist kein Widerspruch, aber
  es muss an derselben Stelle stehen wie die heutige Begründung.

## Nicht Gegenstand dieser Vorlage

- **Die Sichtbarkeit.** Keine der Optionen berührt sie. `billing_ready` ist
  kein Filter in `matchable_provider_services` (Spec A §14), und ein pgTAP-
  Wächter hält jede Preis-Tabelle aus dem View heraus.
- **Anteilige Abrechnung und Erstattung.** Mit ADR-0006 (B2/C2) entschieden:
  es fällt nichts an, was zu teilen wäre.
- **Mahnwesen, Inkasso, Kontoschließung.** Nichts davon existiert, und nichts
  davon wird hier eingeführt.

## Consequences

Nach der Entscheidung:

- **A2 oder A3** brauchen eine Stripe-Route und einen Zustand mehr auf
  `/billing`; **A1** braucht nur D.
- **B2** braucht Webhook-Behandlung und einen Test, der belegt, dass der
  Kulanz-Stichtag unverändert bleibt.
- **C2** braucht eine Regel beim Anlegen und einen Test auf den Fall
  „beendet und am selben Tag neu begonnen".
- **D1/D2** brauchen Copy in vier Sprachen; D2 zusätzlich eine Zeile im
  Copy-Vertrag.

Was in jedem Fall bleibt: Solange hier nichts entschieden ist, darf keiner
dieser Punkte im Code beantwortet werden. Das gilt besonders für Texte — ein
Satz, der eine Frist behauptet, ist eine Regel, auch wenn er nur in einer
Sprachdatei steht. Genau so ist der heutige Zustand entstanden.
