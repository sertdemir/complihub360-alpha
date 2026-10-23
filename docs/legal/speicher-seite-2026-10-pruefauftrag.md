# Speicher-Seite 2026-10 · Prüfauftrag an die Rechtsprüfung

**Stand: 23.10.2026 · Absender: CompliHub360 (Produkt) · Empfänger: Rechtsprüfung über die Partnerin · Seite: `/de/cookies` und `/en/cookies` (Quelle `apps/vs1-demo/ui/src/pages/legal/LegalPages.tsx`, `CookiePage` und `STORAGE_KEYS`)**

> Kein Rechtsrat. Dieses Blatt sagt, was die Seite heute behauptet, was der
> Code tatsächlich tut und welche drei Fragen wir beantwortet brauchen,
> damit die Prüfung in einem Durchgang geht.

## Worum es geht

Die Seite „Cookies & Speicher" beschreibt, was die Anwendung im Browser
ablegt. Ein Test vergleicht sie seit 18.10.2026 mit dem Code, und zwar in
beide Richtungen. Jeder Eintrag auf der Seite existiert also im Code, und
jeder Schlüssel im Code steht auf der Seite. Die Fakten sind damit belegt.

Drei Aussagen sind keine Fakten, sondern Einschätzungen. Die Seite kennzeichnet
die erste ausdrücklich als „unsere eigene und nicht anwaltlich geprüft", und
die ganze Seite trägt den Entwurfshinweis. Diese drei brauchen eine Prüfung:

1. **Einstufung nach § 25 TDDDG:** Alle Einträge sind „unbedingt erforderlich" (Abs. 2 Nr. 2), deshalb gibt es kein Einwilligungsbanner.
2. **Drittinhalte:** Was der Browser außer unserem Server kontaktiert.
3. **Datenschutz-Adresse:** Wohin Fragen zu dieser Seite gehen.

## Was wir zurückbrauchen

1. **Je Eintrag in Teil A:** trägt / trägt nicht / trägt mit folgender Änderung.
   - Am wichtigsten sind A3 (Gast-Kennung) und A2 (Angaben im Assistenten). Dort ist unsere Einstufung am wenigsten sicher.
   - Trägt eine Einstufung nicht, brauchen wir die Folge: Einwilligung vor dem Schreiben, oder das Speichern erst nach einer ausdrücklichen Handlung des Nutzers? Die zweite Variante können wir bauen, ohne ein Banner einzuführen.
2. **Teil B:** Ist der korrigierte Absatz zu Drittinhalten so richtig? Zählt ein Auftragsverarbeiter (Supabase) hier als „Dritter"?
3. **Teil C:** Genügt `dataprivacy@complihub360.com` als Kontakt, oder muss die Seite die Verantwortliche wie in der Datenschutzerklärung nennen?
4. **Den Text des Abschnitts „Einwilligung"** freigegeben, korrigiert oder ersetzt. Erst dann entfällt der Satz „nicht anwaltlich geprüft".

## Bis wann

Die Seite ist live (Staging und geschlossene Beta) und trägt den
Entwurfshinweis. Eine Antwort **vor dem öffentlichen Start** genügt. Für
die Beta mit eingeladenen Testern bleibt der heutige Stand mit
Kennzeichnung stehen.

Hilfreich ist schon eine Teilantwort zu A2 und A3: Daran hängt, ob wir vor
dem Start etwas am Ablauf ändern müssen.

## Teil A · Einstufung je Eintrag (§ 25 Abs. 2 Nr. 2 TDDDG)

Unsere Einstufung: Alle Einträge dienen einer vom Nutzer gewünschten
Funktion. Keiner dient der Reichweitenmessung, der Profilbildung oder der
Werbung. Die Spalte „Unsicherheit" sagt, wo wir selbst zweifeln.

### A1 · Anmeldung und Sitzung

| Schlüssel | Ablage | Wann geschrieben | Lebensdauer | Unsicherheit |
| --- | --- | --- | --- | --- |
| `sb-…-auth-token` | local | bei der Anmeldung (Supabase-SDK) | bis zur Abmeldung | gering |
| `sb-…-auth-token-code-verifier` | local | beim Anfordern eines Anmelde-Links | einmal verwendet | gering |
| `ch360_logout_at` | local | bei der Abmeldung | wird 10 s ausgewertet, bleibt liegen | gering |
| `ch360_return_to` | local | wenn die Sitzung abläuft | gelöscht nach Gebrauch, nach 1 h ignoriert | mittel: Komfort beim Wiedereinstieg |
| `ch360_session_expired` | session | wenn die Sitzung abläuft; **enthält die E-Mail-Adresse** | bis der Tab geschlossen wird | mittel: Komfort, mit personenbezogenem Inhalt |

### A2 · Eingaben erhalten

| Schlüssel | Ablage | Wann geschrieben | Lebensdauer | Unsicherheit |
| --- | --- | --- | --- | --- |
| `ch360_last_profile` | local | **automatisch**, sobald die Risk Map angezeigt wird; zusätzlich im Markt-Dialog | **unbegrenzt** | **hoch:** Die Angaben aus dem Assistenten (Unternehmenskontext) liegen ohne Ablauf im Browser, ohne eigene Handlung des Nutzers. |
| `ch360_booking_confirmed_<id>` | session | nach einer Buchung, **samt Nachricht** | bis der Tab geschlossen wird | gering |
| `complihub360.compliance.country` | session | Auswahl auf „Compliance-Bereiche" | bis der Tab geschlossen wird | gering |

### A3 · Speichern vor der Registrierung

| Schlüssel | Ablage | Wann geschrieben | Lebensdauer | Unsicherheit |
| --- | --- | --- | --- | --- |
| `ch360_guest_key` | local | **automatisch**, wenn die Risk Map als Gast gespeichert wird | unbegrenzt; **wird bei Anfragen mitgeschickt** | **hoch:** Die Zufallskennung wird ohne ausdrückliche Handlung angelegt und an den Server übertragen. Sie hat keinen Bezug zu Name oder E-Mail, verknüpft aber Sitzungen über Besuche hinweg. |
| `ch360_adopted_for` | local | wenn eine Gast-Sitzung dem Konto zugeordnet wurde | unbegrenzt | gering |

### A4 · Darstellung und Bedienung

| Schlüssel | Ablage | Wann geschrieben | Unsicherheit |
| --- | --- | --- | --- |
| `ch360-theme` | local | Wahl hell/dunkel | gering |
| `i18nextLng` | local | Sprachwahl (i18next) | gering |
| `c360_nav_domains_open` | local | Seitenmenü auf- oder zugeklappt | gering |
| `ch360_keep_waiting` | local | „Weiter warten" bei einer Anfrage | gering |

### A5 · Technik

| Schlüssel | Ablage | Wann geschrieben | Unsicherheit |
| --- | --- | --- | --- |
| `c360_chunk_reload_at` | session | wenn sich die Seite nach einem Update neu lädt (Schutz vor einer Neulade-Schleife) | gering |
| `ch360_assistant` | local | nur beim Öffnen eines Links mit diesem Parameter | gering |
| `demo_is_logged_in`, `demo_user_role`, `demo_user_name` | local | **nur im Demo-Modus**, nie im Produktivstand | entfällt im Produktivstand |

**Prüffragen zu Teil A**

- **A-1:** Trägt Abs. 2 Nr. 2 für `ch360_last_profile` und `ch360_guest_key`, wenn beide ohne eigene Handlung des Nutzers entstehen?
  - Wenn nicht: Genügt es, das Speichern an eine ausdrückliche Handlung zu binden (etwa „Risk Map speichern")?
  - Und: Bräuchte `ch360_last_profile` einen Ablauf, etwa 30 Tage?
- **A-2:** Ist ein Komfort-Eintrag mit E-Mail-Adresse (`ch360_session_expired`, nur bis der Tab geschlossen wird) noch „unbedingt erforderlich"?
- **A-3:** Fallen Darstellungs- und Bedienwahl (A4) unter Abs. 2 Nr. 2? Wir gehen davon aus, weil der Nutzer sie selbst trifft.
- **A-4:** Plausible (selbst betrieben, keine Cookies, nichts im Browser) liest über das Skript Angaben wie Bildschirmbreite und Verweisquelle aus. Ist das ein Zugriff auf das Endgerät im Sinne von § 25 Abs. 1?

## Teil B · Drittinhalte

**Was die Seite bis 23.10.2026 sagte:** Beim Aufruf gehe die IP-Adresse an
keinen Dritten außer dem Hosting-Anbieter.

**Was der Code tut:**
- Schriften und Symbole kommen vom eigenen Server (`@fontsource`, gebündelt). Es gibt keine Karten, Videos oder fremden Skripte. Plausible läuft auf unserem Server.
- Für die Anmeldung, und solange man angemeldet ist, spricht der Browser **direkt** mit Supabase (Frankfurt), dem Anmelde- und Datenbankdienst. Das gilt für die Anmeldung selbst und für die Erneuerung der Anmeldung.
- Für Zahlungen und den USt-Assistenten-Kauf sowie für die Kalenderverbindung führt die Anwendung auf Seiten von Stripe bzw. Nylas. Das ist eine Weiterleitung, kein eingebetteter Inhalt, und sie geschieht nur auf Klick.

**Korrigierter Absatz (seit 23.10.2026 auf der Seite, de):**

> Wir binden keine Inhalte Dritter ein: keine Karten, keine Videos, keine
> Schriften von fremden Servern. Schriftarten und Symbole liefern wir von
> unserem eigenen Server aus. Beim bloßen Aufruf dieser Website geht Ihre
> IP-Adresse deshalb nur an unseren Hosting-Anbieter. Während Sie sich
> anmelden und solange Sie angemeldet sind, verbindet sich Ihr Browser
> zusätzlich mit unserem Anmeldedienst Supabase (Frankfurt). Für eine Zahlung
> und für die Kalenderverbindung wechseln Sie auf eine Seite von Stripe bzw.
> Nylas, nur wenn Sie das selbst auslösen (siehe Datenschutzerklärung).

**Prüffrage:**
- **B-1:** Ist der Absatz so richtig?
  - Muss Supabase hier genannt sein, oder genügt die Liste der Empfänger in der Datenschutzerklärung? Dort steht Supabase schon als Auftragsverarbeiter.

## Teil C · Datenschutz-Adresse

Die Seite nennt als Kontakt `dataprivacy@complihub360.com`. Das ist dieselbe
Adresse wie in der Datenschutzerklärung. Dort stehen außerdem die
Verantwortliche und ihre Anschrift. Das Impressum nennt eine andere Adresse.

**Prüffragen:**
- **C-1:** Genügt auf dieser Seite die Adresse, oder gehört die Verantwortliche dazu, etwa als Verweis auf die Datenschutzerklärung?
- **C-2:** Die Verantwortliche hat keine Niederlassung in der EU. Muss ein Vertreter nach Art. 27 DSGVO auch hier genannt werden, sobald es einen gibt? Für die geschlossene Beta gibt es laut Datenschutzerklärung keinen.

## Was wir nach der Antwort tun

- **Trägt A-1 nicht:** Gast-Kennung und letzte Angaben entstehen erst nach einer ausdrücklichen Handlung. Das ist ein eigenes Ticket mit UI-Änderung, die DNA-Prüfung läuft dabei mit: keine Reibung, die vom Ergebnis abhält. Dazu kommt ein Ablauf für `ch360_last_profile`.
- **Abschnitt „Einwilligung":** in der freigegebenen Fassung, in vier Sprachen. Der Satz „nicht anwaltlich geprüft" entfällt, der Entwurfshinweis bleibt, bis alle Rechtsseiten durch sind.
- **Der Test zwischen Seite und Code bleibt.** Jeder neue Schlüssel muss mit Zweck auf die Seite. Die Einstufung des neuen Schlüssels bekommt dann einen Vermerk.

## Anhang · Kurztext zum Weiterleiten

> Hallo, anbei unsere Seite „Cookies & Speicher" mit einem Prüfauftrag. Die
> Fakten sind gegen den Code geprüft; offen sind drei Einschätzungen: ob alle
> Einträge nach § 25 Abs. 2 Nr. 2 TDDDG unbedingt erforderlich sind (vor
> allem eine Gast-Kennung und die letzten Angaben im Assistenten, die ohne
> eigene Handlung entstehen), ob der Absatz zu Drittinhalten richtig ist
> (Supabase wird bei der Anmeldung direkt kontaktiert), und welche Angaben
> als Datenschutz-Kontakt auf die Seite gehören. Eine Antwort vor dem
> öffentlichen Start reicht; schneller hilft uns eine Teilantwort zu den
> beiden automatisch entstehenden Einträgen.
