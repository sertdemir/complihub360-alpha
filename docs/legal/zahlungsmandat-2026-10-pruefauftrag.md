# Zahlungsmandat 2026-10 · Prüfauftrag an die Rechtsprüfung

**Stand: 20.10.2026 · Absender: CompliHub360 (Produkt) · Empfänger: Rechtsprüfung über die Partnerin · Entwurf: `zahlungsmandat-2026-10-entwurf.md` (de, maßgeblich) und `payment-mandate-2026-10-draft.md` (en)**

> Kein Rechtsrat. Dieses Blatt sagt, was wir brauchen, bis wann und warum —
> damit die Prüfung in einem Durchgang beantwortet werden kann.

## Worum es geht

Anbieter auf CompliHub360 hinterlegen eine Karte bei Stripe und nehmen eine
Abrechnungsermächtigung an. Zwei Belastungen laufen ohne Anwesenheit des
Karteninhabers: die Lead-Gebühr im Moment einer Buchung (heute live) und
der Einzug einer offenen Abo-Rechnung am 1., 3. und 6. Tag nach Fälligkeit
(gebaut, ausgeschaltet). Der Text, den der Anbieter vor dem Klick liest,
steht seit 15.10.2026 als **Platzhalter** im Produkt (Fassung `2026-10`, mit
dem Hinweis, dass die Rechtsprüfung läuft). Wir brauchen die Freigabe, eine
Korrektur oder einen Ersatztext.

## Was wir zurückbrauchen

1. **Antwort auf die sieben Prüffragen** in Teil A des Entwurfs — je Frage:
   trägt / trägt nicht / trägt mit folgender Änderung. Am wichtigsten sind
   Frage 1 (Reichweite beider Belastungsarten) und Frage 2 (off-session,
   PSD2/SCA, reicht die Karte aus dem Portal oder braucht es einen eigenen
   Schritt mit `SetupIntent usage: off_session`).
2. **Den Text in Teil B als freigegeben, korrigiert oder ersetzt.**
   Korrekturen bitte im Text selbst; wir hinterlegen genau diese Fassung in
   vier Sprachen und lassen jeden Anbieter neu annehmen.
3. **Eine Aussage zum Platzhalter `[Betreiber]`**: Welche Gesellschaft ist
   Vertragspartner, solange die Struktur (US C-Corp plus deutsche DevCo)
   nicht final ist? Im Produkt steht bis dahin „CompliHub360".
4. **Eine Aussage zur Textform des Widerrufs** (Abschnitt 7): reicht der
   Klick unter „Einstellungen", oder braucht es E-Mail oder Brief?

## Bis wann

Der Beta-Plan sieht den **21.10.2026** für das Befüllen der Rechtsseiten aus
dem Anwalts-Input vor. Für das Mandat genügt uns eine Antwort bis zum
**Beta-Start Ende Oktober**; bis dahin bleibt der Einzug offener
Abo-Rechnungen ausgeschaltet und der Platzhalter mit Hinweis stehen. Eine
Teilantwort (nur Frage 1 und 2) hilft schon: damit können wir entscheiden,
ob der Einzug für die Beta überhaupt in Frage kommt.

## Was sich seit dem Entwurf vom 15.10. geändert hat

- **Abschnitt 6, neuer Absatz:** Bleibt bei einer Belastung offen, ob sie
  gelungen ist (Verbindungsabbruch), kommt die Buchung nicht zustande; wir
  klären den Ausgang innerhalb weniger Minuten und erstatten eine Belastung
  ohne Buchung von selbst; bis dahin keine neuen Buchungen, Sichtbarkeit
  bleibt. Das ist seit PR #329 so gebaut (Silent-Failure-Befund B1).
- Sonst keine Änderung am Verhalten, das der Text beschreibt. Der
  Rechnungsbeleg im Anbieterkonto sagt seit PR #351 dasselbe wie Abschnitt
  5 (Profil bleibt sichtbar, Buchungen pausieren 7 Tage nach Fälligkeit).

## Was wir nach der Antwort tun

Teil D des Entwurfs: Fassung ins Annahme-Modal in vier Sprachen, Kurzfassung
über dem Volltext, Neuannahme für alle Anbieter auf einer älteren Fassung,
dann `INVOICE_RETRY_ENABLED`, Ticket TKT-PROV-13 nach `done`. Kommt ein
Ersatztext, ist das eine neue Fassung mit Neuannahme; Annahmen des
Platzhalters gelten weiter nur für das, was der Platzhalter beschrieb.

## Anhang · Kurztext zum Weiterleiten

> Hallo, anbei unser Zahlungsmandat für Anbieter als Entwurf (de und en).
> Wir brauchen eine Prüfung auf sieben Fragen in Teil A, vor allem: Deckt
> der Text beide Belastungsarten (Lead-Gebühr bei Buchung, Einzug offener
> Abo-Rechnungen an Tag 1/3/6), und trägt die Annahme im Konto plus die
> Karte im Stripe-Portal den off-session-Einzug nach PSD2, oder braucht es
> einen eigenen Zustimmungsschritt? Korrekturen gern direkt im Text in Teil
> B; genau diese Fassung hinterlegen wir dann. Eine Antwort bis Ende Oktober
> reicht; bis dahin bleibt der Einzug aus und der Text steht als Platzhalter
> mit Hinweis im Produkt.
