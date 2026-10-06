# ADR-0006: Kulanzfrist, Tarifwechsel und Kündigung

**Status:** PROPOSED — **hier ist nichts entschieden.** Diese Vorlage legt offen, was heute faktisch gilt, welche Optionen es gibt und was jede kostet. Die Wahl liegt beim Nutzer.
**Date:** 2026-10-06
**Bezug:** *Provider Dashboard Pricing & Operations Implementation Specification* v1.0 („Spec B") — „Configurable items requiring final decision": *„Subscription proration, cancellation notice, grace period, failed-payment retry, and reactivation rules."* · *Spec A* §21 (Billing Readiness), §21.1 (Legal configuration) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) · ADR-0003 (Pricing v2) · ADR-0005 (Buchung → Belastung) · `TKT-PROV-09`
**Warum eine Vorlage und keine Entscheidung:** Spec B führt diese Regeln ausdrücklich als offen. [`CLAUDE.md`](../../CLAUDE.md) verbietet, einen solchen Punkt im Code aufzulösen — eine still erfundene Pro-rata-Regel wäre genau die Entscheidung, die nicht beim Agenten liegt. Sie haben Geldfolge für den Anbieter.

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

## Was zusammenhängt

Drei Kopplungen, die man nicht einzeln beschließen kann:

1. **B und C teilen sich den Mechanismus.** Ein Wechsel zum Periodenende (B2) ist technisch eine Kündigung zum Periodenende (C2) plus ein geplanter neuer Beginn. Wer eins baut, hat das andere fast.
2. **Der Rabattzähler hängt am Monatszyklus**, nicht am Abo (ADR-0003, [`2026-10-01 current_period ist der Monatszyklus`]). Jede Option, die mitten im Zyklus den Tarif ändert, muss sagen, was mit `provider_discount_counter` geschieht. B2 und C2 umgehen die Frage, B3 und C3 nicht.
3. **Kulanz und Kündigung treffen sich im Sperrgrund.** Ein Anbieter mit offener Rechnung, der kündigen will, darf nicht in einer Schleife landen, in der die Sperre die Kündigung verhindert.

## Nicht Gegenstand dieser Vorlage

Spec B nennt in derselben Liste noch **`failed-payment retry`** und **`reactivation rules`**. Beide berühren dieselben Tabellen, sind aber eigene Entscheidungen; wer A–C beschließt, hat sie nicht mitbeschlossen.

## Consequences — was passiert, wenn nichts entschieden wird

Nicht nichts. Die Defaults bleiben wirksam: null Kulanz, kein Wechsel, keine Selbstkündigung. Dieses Dokument macht aus einer unbemerkten Lage eine bewusste — mehr nicht.

Sobald eine Zeile gewählt ist, wird aus dieser Vorlage ein ADR mit `Status: ACCEPTED`, und die Umsetzung bekommt ein eigenes Ticket.
