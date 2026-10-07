# ADR-0006: Kulanzfrist, Tarifwechsel und Kündigung

**Status:** ACCEPTED
**Date:** 2026-10-06 (Vorlage) · **2026-10-07 (Entscheidung)**
**Entscheidung des Nutzers (2026-10-07):** **A2** Kulanzfrist 7 Tage · **B2** Tarifwechsel zum Periodenende · **C2** Kündigung zum Periodenende
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Configurable items requiring final decision": *„Subscription proration, cancellation notice, grace period, failed-payment retry, and reactivation rules."* · *Spec A* §21 (Billing Readiness), §21.1 (Legal configuration) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) · ADR-0003 (Pricing v2) · ADR-0005 (Buchung → Belastung) · `TKT-PROV-09`
**Warum erst eine Vorlage:** Spec B führt diese Regeln ausdrücklich als offen. [`CLAUDE.md`](../../CLAUDE.md) verbietet, einen solchen Punkt im Code aufzulösen — eine still erfundene Pro-rata-Regel wäre genau die Entscheidung, die nicht beim Agenten liegt. Sie haben Geldfolge für den Anbieter. Die Abschnitte *Context* und *Optionen* bleiben unverändert stehen: sie sind der Beleg, was abgewogen wurde.

## Context — was heute gilt

Alle drei Regeln sind **nicht** „noch nicht gebaut". Sie sind gebaut, nur hat sie niemand entschieden: der Code hat bei jeder einen Default, und der wirkt.

### 1. Kulanzfrist bei offener Rechnung — faktisch **null**

`billingReadiness()` (`billing.ts:274`) nimmt `overdueInvoices` entgegen und setzt:

```ts
if (i.overdueInvoices > 0) reasons.push('overdue_invoice');
```

`syncBillingReadiness` (`leadCharge.ts:318`) zählt sie so:

```ts
const overdue = openInvoices.filter((i) => i.due_at && Date.parse(String(i.due_at)) < now).length;
```

**Wirkung:** In der Sekunde, in der `due_at` verstreicht, ist `billing_ready = false` — und der Anbieter nimmt keine Buchungen mehr an. Die Rechnung hat 14 Tage Zahlungsziel (`days_until_due: '14'`), danach ist sofort Schluss. Es gibt keinen Puffer, keine Vorwarnung, keine Staffel.

Spec A §21.1 sieht an dieser Stelle eine **„configured cure period"** vor. Der Wert dafür ist nie gesetzt worden; `0` ist kein Beschluss, sondern das, was herauskommt, wenn man nichts einträgt.

Nicht betroffen: die **Sichtbarkeit**. Spec A §14 verbietet, dass der Zahlungsstatus über das Ranking entscheidet, und der pgTAP-Wächter hält `billing_ready` aus `matchable_provider_services` heraus. Gesperrt ist die Buchung, nicht das Erscheinen.

### 2. Tarifwechsel — **gibt es nicht**

`startSubscription()` verweigert, solange eine nicht beendete Zeile besteht:

```ts
if (await openRow(i.providerKey)) return { ok: false, code: 'SUBSCRIPTION_EXISTS' };
```

Der Partial Unique Index `provider_subscriptions_one_open` sagt dasselbe auf Datenbankebene. Ein Wechsel ist heute **zwei getrennte Verwaltungsakte** — beenden, neu beginnen — und nur ein Admin kann sie ausführen. Bewusst so: damit niemand eine Pro-rata-Regel erfindet, die nicht beschlossen ist.

Die Oberfläche (`TKT-PROV-09`, Zustand F2) nennt diesen Grund inzwischen offen, statt den Knopf wegzulassen.

### 3. Kündigung durch den Anbieter — **gibt es nicht**

`endSubscription()` ist nur über `handleAdminSubscription` erreichbar (Server-Key oder Admin). Sie setzt `status = 'ended'` und `ended_at` **sofort**:

```ts
await supabaseApi.update('provider_subscriptions', { id: row.id }, {
    status: 'ended', ended_at: new Date().toISOString(),
});
```

Keine Frist, keine Erstattung, kein Periodenende. Die Periode, die schon in Rechnung steht, bleibt in Rechnung.

**Das ist die unangenehmste der drei Lücken:** ein Anbieter kann sein Abo nicht selbst beenden. Er muss schreiben, und ein Mensch tut es für ihn. Das erhöht zugleich das Gewicht der Tarifwahl — weshalb der Bestätigungsschritt (E2) überhaupt eine eigene Fläche bekam.

## Optionen

### A · Kulanzfrist

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **A1** | **Bleibt null.** `due_at` verstreicht → Buchungen gesperrt. | Hart und vorhersehbar. Wer am 15. nicht zahlt, nimmt am 15. keine Leads mehr an. | Eine verlegte Rechnung kostet sofort Umsatz. Der Anbieter erfährt es womöglich erst an der ausbleibenden Anfrage. |
| **A2** | **Feste Frist**, z. B. 7 Tage nach `due_at`, plus Hinweis auf `/billing` ab Tag 1. | Zeit zu reagieren, ohne dass jemand eingreifen muss. Spec A §21.1 nennt genau das. | Sieben Tage Leads, die womöglich nie bezahlt werden. Braucht einen Wert in der Konfiguration und einen Test, der ihn belegt. |
| **A3** | **Gestaffelt**: Hinweis ab Tag 1, Warnung Tag 3, Sperre Tag 7. | Die Sperre kommt nie unangekündigt. | Drei Zustände mehr in `billing_block_reasons`, drei Benachrichtigungen, mehr Fläche zum Testen. |

**Mein Hinweis, nicht meine Entscheidung:** A1 ist mit der DNA schwer vereinbar — nicht weil Sperren falsch wäre, sondern weil sie **ohne Vorwarnung** eintritt. „Never make the user feel small" trifft den Fall, in dem jemand nicht versteht, warum seine Anfragen aufgehört haben. Das Minimum wäre, dass der Anbieter die Sperre kommen sieht, auch wenn die Frist null bleibt.

### B · Tarifwechsel

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **B1** | **Bleibt so.** Wechsel nur über einen Menschen. | Ehrlich benannt (F2 nennt den Grund), aber umständlich. | Jeder Wechsel ist Handarbeit. Skaliert nicht. |
| **B2** | **Wechsel zum Periodenende**, ohne anteilige Abrechnung. Der neue Tarif beginnt, wenn der alte ausläuft. | Selbstbedienung, keine Überraschung auf der Rechnung. | Braucht eine geplante Änderung (`gilt ab`-Muster aus `TKT-PROV-10` ist dafür schon da) und einen Lauf, der sie ausführt. |
| **B3** | **Sofort mit anteiliger Abrechnung.** | Sofort wirksam. | **Das ist die Pro-rata-Regel, die Spec B offen lässt.** Braucht eine Entscheidung zu Gutschrift vs. Verrechnung, zum Rabattzähler beim Wechsel mitten im Zyklus, und zum Fall „Downgrade unter die genutzten Kategorien". Die teuerste Option, mit der größten Fläche für stille Fehler. |

**Hinweis:** B2 nutzt ein Muster, das es im Repo bereits gibt — `TKT-PROV-08`/`TKT-PROV-10` haben „gilt ab"-Daten für Konditionsänderungen gebaut, samt der Regel „was ungünstiger wird, wartet". Ein Tarifwechsel zum Periodenende fügt sich dort ein, ohne eine neue Geldregel zu erfinden.

### C · Kündigung

| | Regel | Für den Anbieter | Kosten |
|---|---|---|---|
| **C1** | **Bleibt so.** Nur per Mail an `partners@`. | Ein Mensch antwortet — das ist nicht per se schlecht. | Ein Abo, das man nicht selbst beenden kann, ist eine Hürde beim Eingehen. Wer das weiß, zögert beim Wählen. |
| **C2** | **Zum Periodenende, selbst auslösbar**, mit Bestätigungsschritt. Läuft bis `renewal_date`, dann `ended`. | Symmetrisch zum Beginnen. Nimmt dem Tarif das Endgültige. | Braucht einen geplanten Zustand (`cancels_at`), einen Lauf, der ihn ausführt, und eine Fläche dafür. Keine Erstattungsfrage — die Periode ist bezahlt. |
| **C3** | **Sofort, mit anteiliger Erstattung.** | Maximale Freiheit. | Dieselbe Pro-rata-Frage wie B3, dazu Rückabwicklung über Stripe. |

**Hinweis:** C2 wirft keine der Fragen auf, die Spec B reserviert — keine anteilige Abrechnung, keine Erstattung, keine Reaktivierungsregel. Es ist die Option, die am wenigsten neu entscheidet.

## Decision

Der Nutzer hat am 2026-10-07 **A2 · B2 · C2** gewählt. Damit ist jede der drei Regeln beschlossen; was unten steht, präzisiert sie so weit, wie die Umsetzung es braucht — und benennt die Stellen, an denen die Wahl allein noch nicht reicht.

### 1 · Kulanzfrist: 7 Tage (A2)

Eine offene Rechnung sperrt die Buchung **erst 7 Tage nach `due_at`**, nicht mehr in der Sekunde des Verstreichens. Zusammen mit den 14 Tagen Zahlungsziel sind das 21 Tage ab Rechnungsstellung.

Drei Festlegungen, die zur Wahl gehören:

- **Konfiguriert, nicht einprogrammiert.** Spec A §21.1 spricht von einer *„configured cure period"*; eine `7` im Quelltext wäre genau das, was die Spec nicht will. Der Wert gehört in dieselbe Konfiguration wie die übrigen Abrechnungsgrößen, mit 7 als Vorgabe.
- **Ab Tag 1 sichtbar, ab Tag 8 sperrend.** Der Anbieter sieht die offene Rechnung und das Datum, ab dem gesperrt wird, von der ersten Stunde an auf `/billing` — als Hinweis, nicht als Sperre. Eine Sperre, die unangekündigt eintritt, ist der Teil, den die DNA ausschließt; die Frist allein behebt das nicht.
- **Die Sichtbarkeit bleibt unberührt.** Spec A §14; der pgTAP-Wächter hält `billing_ready` aus `matchable_provider_services` heraus. Gesperrt ist die Buchung, nie das Erscheinen.

### 2 · Tarifwechsel zum Periodenende (B2)

Ein Wechsel wird **vorgemerkt** und tritt zum Ende der laufenden Periode in Kraft. Keine anteilige Abrechnung, keine Gutschrift, keine Rückabwicklung — damit bleibt die Pro-rata-Frage, die Spec B reserviert, auch weiterhin unbeantwortet, und das ist Absicht.

- **„Periodenende" heißt `renewal_date`, nicht `current_period_end`.** Die beiden sind nur bei monatlicher Zahlweise dasselbe. Ein Jahreskunde hat zwölf Monate bezahlt; sein Wechsel wird zur Verlängerung wirksam, nicht zum Ende des nächsten Rabattmonats. Wer das verwechselt, beendet ein bezahltes Jahresabo nach vier Wochen.
- **Der Rabattzähler braucht keine neue Regel.** Er hängt am Monatszyklus (ADR-0003); ein Wechsel, der auf eine Periodengrenze fällt, trifft ihn nicht mitten im Zählen.
- **Ein Downgrade unter die genutzten Hauptkategorien wird abgelehnt, nicht vorgemerkt.** `categoryAllowanceCheck` ist kein Anzeigewert: `verificationRules` nimmt `plan.category_allowance` in `missing` auf, und ein Anbieter, der darüber liegt, ist nicht mehr aktivierbar. Ein vorgemerkter Downgrade würde den Anbieter zum Stichtag still deaktivieren. Die Wahl wird deshalb beim Vormerken geprüft und mit dem konkreten Grund abgelehnt („Essential deckt 1 Hauptkategorie ab, Sie nutzen 3"). Das ist keine neue Geldregel, sondern die Weigerung, jemanden in eine Wand laufen zu lassen.

### 3 · Kündigung zum Periodenende (C2)

Der Anbieter kann **selbst kündigen**; das Abo läuft bis `renewal_date` und endet dann. Keine Erstattung — die Periode ist bezahlt und wird geliefert. Bis zum Stichtag ist die Kündigung **rücknehmbar**.

- **Eine offene Rechnung darf die Kündigung nicht blockieren.** Sonst entstünde die Schleife, in der die Sperre den Ausgang verstellt. Kündigen ist kein Vorgang, der `billing_ready` verlangt.
- **Die Pflicht aus der laufenden Periode bleibt.** Die Rechnung, die schon gestellt ist, bleibt fällig; Kündigung beendet das Abo, nicht die Schuld.
- **Nach dem Stichtag ist der Platz frei** — der Anbieter kann ein neues Abo beginnen. Eine eigene *Reaktivierungs*-Regel im Sinne von Spec B entsteht dadurch nicht: es ist derselbe Weg wie beim ersten Mal.

### Was weiterhin offen bleibt

Spec B nennt in derselben Liste **`failed-payment retry`** und **`reactivation rules`**. Beide sind mit A2/B2/C2 **nicht** mitentschieden und brauchen je eine eigene Vorlage.

## Was zusammenhängt

Drei Kopplungen, die man nicht einzeln beschließen kann:

1. **B und C teilen sich den Mechanismus.** Ein Wechsel zum Periodenende (B2) ist technisch eine Kündigung zum Periodenende (C2) plus ein geplanter neuer Beginn. Wer eins baut, hat das andere fast.
2. **Der Rabattzähler hängt am Monatszyklus**, nicht am Abo (ADR-0003, [`2026-10-01 current_period ist der Monatszyklus`]). Jede Option, die mitten im Zyklus den Tarif ändert, muss sagen, was mit `provider_discount_counter` geschieht. B2 und C2 umgehen die Frage, B3 und C3 nicht.
3. **Kulanz und Kündigung treffen sich im Sperrgrund.** Ein Anbieter mit offener Rechnung, der kündigen will, darf nicht in einer Schleife landen, in der die Sperre die Kündigung verhindert.

## Nicht Gegenstand dieser Vorlage

Spec B nennt in derselben Liste noch **`failed-payment retry`** und **`reactivation rules`**. Beide berühren dieselben Tabellen, sind aber eigene Entscheidungen; wer A–C beschließt, hat sie nicht mitbeschlossen.

## Consequences

Was die drei Regeln nach sich ziehen:

- **`provider_subscriptions` bekommt den vorgemerkten Zustand.** Ein Feld für den Stichtag und eines für den Zieltarif; ohne sie gäbe es keinen Ort, an dem „zum Periodenende" steht. Ein Lauf führt sie zum Stichtag aus — derselbe, der die Perioden weiterrollt (`runSubscriptionPeriodTick`), weil beides an derselben Grenze passiert.
- **Die Kulanzfrist macht `billingReadiness` zeitabhängig.** Die Funktion ist heute rein und bekommt `overdueInvoices` als Zahl. Sie braucht künftig das Datum, ab dem gesperrt wird — die Frist gehört in die Eingabe, nicht in die Funktion, damit sie rein und prüfbar bleibt.
- **Die Oberfläche bekommt zwei Flächen**, die `TKT-PROV-09` bewusst ausgelassen hat: den Hinweis auf die laufende Kulanzfrist (`/billing`) und Wechsel/Kündigung mit Stichtag (`/subscription`, Zustand F). Der Text in F2, der heute sagt, dass es beides nicht gibt, wird damit falsch und muss weg.
- **Drei Sätze Copy in vier Sprachen** und je eine Benachrichtigung für: Kulanzfrist läuft, Wechsel vorgemerkt, Kündigung vorgemerkt.
- **Der Wert der Kulanzfrist ist Konfiguration**, kein Literal — und gehört damit in dieselbe versionierte Ablage wie die übrigen Abrechnungsgrößen.

Umsetzung in einem eigenen Ticket; dieses ADR entscheidet, es baut nicht.
