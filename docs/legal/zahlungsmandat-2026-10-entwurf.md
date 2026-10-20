# CompliHub360 · Zahlungsmandat für Anbieter — Entwurf Fassung 2026-10

**Stand: 20.10.2026 (Nachtrag zu Abschnitt 6: offener Ausgang einer Belastung, seit PR #329) · Status: Entwurf zur Rechtsprüfung · seit 15.10.2026 als Fassung `2026-10` im Annahme-Modal (Interim, Entscheidung des Nutzers) · ersetzt die textlose Fassung `2026-09`; im Produkt steht statt `[Betreiber]` bis zur Freigabe „CompliHub360“**

> **Kein Rechtsrat.** Dieser Entwurf stammt aus der Produktentwicklung. Er
> beschreibt, was die Plattform heute tatsächlich tut, in Worten, die ein
> Anbieter vor dem Klick lesen soll. Ob diese Worte als Zahlungsmandat
> genügen, entscheidet die Rechtsprüfung. Erst danach wird der Text als neue
> Fassung hinterlegt; jede Anbieterin und jeder Anbieter nimmt ihn dann neu an
> (Spec A §23, Neuannahme bei wesentlicher Änderung).

## Warum es diesen Entwurf gibt

Die heutige Fassung `2026-09` ist eine Versionsnummer ohne Text. Im Annahme-
Modal liest der Anbieter genau einen Satz: *„Sie erlaubt uns, Abo und
Lead-Gebühren über die hinterlegte Zahlungsmethode abzurechnen."* Dann
bestätigt er mit Name und Rolle. Das genügt für das, was Phase 4 tut (eine
Lead-Gebühr im Moment der Buchung). Es ist zu dünn für das, was ADR-0008 B2a
vorsieht: offene Abo-Rechnungen an Tag 1, 3 und 6 nach Fälligkeit ohne
Anwesenheit des Anbieters von der hinterlegten Karte einzuziehen. Bis die
Rechtsprüfung das Mandat bestätigt, bleibt dieser Einzug ausgeschaltet
(`INVOICE_RETRY_ENABLED` nicht gesetzt).

---

## Teil A · Was die Rechtsprüfung klären soll

1. **Reichweite.** Deckt der Text in Teil B beide Belastungsarten: die
   Lead-Gebühr im Moment der Buchung und den Einzug einer offenen
   Abo-Rechnung bis zu drei Mal nach Fälligkeit?
2. **Off-session und starke Kundenauthentifizierung.** Beide Belastungen
   laufen ohne Anwesenheit des Karteninhabers (Stripe `off_session`,
   Merchant-Initiated Transaction). Trägt die Annahme im Dossier plus die
   Hinterlegung der Karte im Stripe-Portal die dafür nötige Vereinbarung
   (PSD2/SCA-Ausnahme für händlerinitiierte Zahlungen)? Reicht die bisherige
   Kartenhinterlegung, oder braucht es ein `SetupIntent` mit
   `usage: off_session` als eigenen Schritt?
3. **AGB-Recht.** Der Text wird jeder Anbieterin und jedem Anbieter gestellt,
   also AGB. Hält er der Inhaltskontrolle stand (Transparenz, keine
   überraschende Klausel, Höhe und Zeitpunkt vorhersehbar)? Betrifft vor
   allem Abschnitt 3 (Wann) und 4 (Wie viel).
4. **Anwendbares Recht und Vertragspartner.** Der Betreiber ist noch nicht
   final festgelegt (siehe `struktur-addendum-2026-08.md`: US C-Corp plus
   deutsche DevCo). Der Platzhalter `[Betreiber]` ist vor der Hinterlegung
   zu füllen; Gerichtsstand und Recht gehören in den Anbietervertrag, nicht
   in dieses Mandat.
5. **Widerruf.** Abschnitt 7 sagt, der Widerruf wirkt sofort auf neue
   Buchungen und lässt offene Rechnungen bestehen. Ist das so haltbar, und
   braucht der Widerruf eine Textform?
6. **Gutschriften.** Abschnitt 4 nennt Plattform-Guthaben, das mit der
   nächsten Abo-Rechnung verrechnet wird und nie ausgezahlt wird
   (ADR-0007). Ist die Formulierung ausreichend, oder gehört das in die
   kommerziellen Bedingungen statt ins Mandat?
7. **Sprache.** Erstfassung Deutsch. Englisch, Spanisch und Türkisch folgen
   nach der Freigabe als Übersetzungen derselben Fassung; die Annahme
   speichert die Sprache, in der gelesen wurde.

---

## Teil B · Der Mandatstext (Anbieter-Copy, zur Prüfung)

### Zahlungsmandat · Fassung 2026-10

**1. Worum es geht**

Mit dieser Erklärung erlauben Sie `[Betreiber]` („CompliHub360"), die in
Abschnitt 2 genannten Beträge über das Zahlungsmittel einzuziehen, das Sie
bei unserem Zahlungsdienstleister Stripe hinterlegt haben. Ihre Kartendaten
liegen ausschließlich bei Stripe; CompliHub360 sieht und speichert sie nicht.

**2. Welche Beträge**

Nur diese beiden, nichts anderes:

- **Ihre Abo-Rechnung** für den gewählten Tarif, in dem Turnus, den Sie beim
  Abschluss gewählt haben.
- **Die Lead-Gebühr** für eine Buchung, die ein Unternehmen bei Ihnen
  vornimmt. Sie fällt je Buchung an und steht vor jeder Buchung mit Betrag in
  Ihrem Konto unter *Abrechnung*.

**3. Wann wir belasten**

- **Abo-Rechnung:** Sie erhalten die Rechnung mit 14 Tagen Zahlungsziel und
  können sie selbst bezahlen. Ist sie am Fälligkeitstag noch offen, sagen
  wir Ihnen das per E-Mail und in Ihrem Konto. Danach versuchen wir den
  Einzug über Ihr hinterlegtes Zahlungsmittel am 1., 3. und 6. Tag nach
  Fälligkeit, je Tag höchstens einmal. Bezahlen Sie zwischendurch selbst,
  entfällt jeder weitere Versuch.
- **Lead-Gebühr:** im Moment der Buchung, bevor dem Unternehmen Ihre
  Kontaktdaten gezeigt werden.

**4. Wie viel**

- Die Abo-Rechnung entspricht dem Tarifpreis, den Sie beim Abschluss oder
  beim letzten Wechsel bestätigt haben. Ein Tarifwechsel oder eine Kündigung
  wirkt zum Ende der laufenden Periode.
- Die Lead-Gebühr richtet sich nach der Größe der Anfrage und Ihrem Tarif.
  Betrag und Berechnung sehen Sie vor jeder Buchung unter *Abrechnung*;
  Rabatte Ihres Tarifs sind bereits abgezogen.
- Plattform-Guthaben, das Ihnen gutgeschrieben wurde (zum Beispiel nach
  einem nicht wahrgenommenen Termin), verrechnen wir mit Ihrer nächsten
  Abo-Rechnung. Es wird nicht ausgezahlt.

**5. Wenn eine Belastung nicht gelingt**

- **Lead-Gebühr:** Dann kommt die Buchung nicht zustande. Es entsteht keine
  Gebühr, und dem Unternehmen werden keine Daten von Ihnen gezeigt. Sie
  bleiben weiterhin sichtbar und können das Zahlungsmittel prüfen oder ein
  anderes hinterlegen. Bis dahin nehmen Sie keine neuen Buchungen an.
- **Abo-Rechnung:** Die Rechnung bleibt offen, die Frist bleibt, wie sie ist.
  Sie können jederzeit selbst bezahlen. Ist die Rechnung 7 Tage nach
  Fälligkeit noch offen, pausieren neue Buchungen, bis sie bezahlt ist. Sie
  bleiben auch dann sichtbar.
- CompliHub360 erhebt für einen gescheiterten Versuch keine eigene Gebühr.
  Ob Ihr Kartenanbieter Gebühren erhebt, richtet sich nach Ihrem Vertrag mit
  ihm.

**6. Wenn wir etwas rückgängig machen**

Kommt eine Buchung nach erfolgter Belastung doch nicht zustande (zum
Beispiel, weil derselbe Termin gleichzeitig vergeben wurde), erstatten wir
die Lead-Gebühr von selbst auf dasselbe Zahlungsmittel. Sie müssen dafür
nichts tun; der Vorgang steht in Ihrem Abrechnungsverlauf.

Bleibt bei einer Belastung offen, ob sie gelungen ist (etwa weil die
Verbindung zum Zahlungsdienstleister abbrach), kommt die Buchung nicht
zustande. Wir klären den Ausgang innerhalb weniger Minuten; eine Belastung,
die ohne Buchung durchging, erstatten wir von selbst. Bis zur Klärung nehmen
Sie keine neuen Buchungen an; Sie bleiben sichtbar.

**7. Widerruf**

Sie können dieses Mandat jederzeit in Ihrem Konto unter *Einstellungen*
widerrufen. Ab dann belasten wir nichts mehr und Sie nehmen keine neuen
Buchungen an, bis Sie eine aktuelle Fassung erneut annehmen. Rechnungen, die
vor dem Widerruf entstanden sind, bleiben fällig und bezahlen Sie selbst.

**8. Was wir festhalten**

Zu jeder Annahme speichern wir Fassung und Sprache dieses Textes, Name und
Rolle der annehmenden Person, Zeitpunkt und eine technische Referenz. Eine
neue Fassung ersetzt die alte nicht rückwirkend: Für jede Buchung bleibt
nachvollziehbar, welche Fassung zu diesem Zeitpunkt galt.

**9. Änderungen**

Ändern wir diesen Text in einem Punkt, der Sie betrifft, legen wir Ihnen die
neue Fassung zur Annahme vor. Bis Sie sie annehmen, belasten wir nichts
Neues über die alte Fassung hinaus.

---

## Teil C · Jeder Satz hat eine Stelle im Code

| Abschnitt | Aussage | Wo das heute gilt |
|---|---|---|
| 1 | Kartendaten nur bei Stripe | Billing-Portal und `SetupIntent` laufen bei Stripe; `stripe.ts` hält nur `customer_id` und `payment_method_id` |
| 2 | nur Abo-Rechnung und Lead-Gebühr | `billing.ts` (Rechnungen), `leadCharge.ts` (PaymentIntent je Buchung); keine weitere Belastungsstelle im Dienst |
| 3 | 14 Tage Zahlungsziel | `days_until_due: 14`, ADR-0006 |
| 3 | Hinweis am Fälligkeitstag, Versuche Tag 1/3/6 | `invoiceRetry.ts`: `invoice_retry_notice`, `retryStage`, Idempotency je Rechnung und Tag; ADR-0008 B2a |
| 3 | Lead-Gebühr vor der Offenlegung | ADR-0005: Belastung entscheidet die Offenlegung; `lead.revealed` erst nach `captured` |
| 4 | Betrag vor der Buchung sichtbar, Rabatte abgezogen | `quoteLeadFee`, Vorschau unter `/billing`; ADR-0003 |
| 4 | Wechsel und Kündigung zum Periodenende | ADR-0006 B2 und C2 |
| 4 | Guthaben mit nächster Rechnung, keine Auszahlung | ADR-0007, `provider_credits` |
| 5 | Lead: keine Buchung, keine Offenlegung, sichtbar bleiben | ADR-0005 Entscheidung 3, `payment_failed`-Copy („Sie bleiben sichtbar") |
| 5 | Abo: Frist unverändert, Pause 7 Tage nach Fälligkeit | ADR-0006 A2, `due_at` wird nie geschrieben |
| 5 | keine eigene Gebühr für einen gescheiterten Versuch | kein Posten im Code; **zur Bestätigung durch die Prüfung** |
| 6 | automatische Erstattung bei Doppelbuchung | ADR-0005 Punkt 9, `refundPaymentIntent`, Ereignis `lead_charge_reversed` |
| 6 | offener Ausgang: keine Buchung, Abgleich, Erstattung von selbst, bis dahin keine neuen Buchungen | Silent-Failure-Befund B1 (PR #329), Ledger-Status `unknown`, Sperrgrund `payment_unresolved`, `runChargeReconcileTick` alle zwei Minuten, Ereignisse `lead_charge_reconciled` / `lead_charge_reversed` |
| 7 | Widerruf in den Einstellungen, Folge: keine Buchungen | `withdrawn_authorization`, `billingReadiness` verlangt eine nicht abgelöste Annahme |
| 8 | Fassung, Sprache, Name, Rolle, Zeit, Referenz | `provider_agreement_acceptance`: `version`, `language`, `accepted_by_name`, `accepted_by_title`, `accepted_at`, `audit_ref`; alte Fassung bleibt (`superseded_at`) |
| 9 | Neuannahme bei Änderung | Spec A §23, Annahme-Modal zeigt immer die aktuelle Fassung |

Ein Satz, der hier keine Stelle hätte, gehört nicht in den Text.

## Teil D · Was nach der Freigabe passiert

1. Text als Fassung `2026-10` in das Annahme-Modal (`application.agreements.*`,
   Kapitel 5 des Dossiers) in vier Sprachen; der Satz `billingNote` wird zur
   Kurzfassung über dem Volltext.
2. Alle Anbieter mit Fassung `2026-09` sehen die Neuannahme; bis dahin bleibt
   `INVOICE_RETRY_ENABLED` aus (faktisch ADR-0008 B1).
3. Ticket `TKT-PROV-13` nach `done`.
