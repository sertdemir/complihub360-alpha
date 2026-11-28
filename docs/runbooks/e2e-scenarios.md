# Runbook: Szenarien zwischen Nutzer und Anbieter (Stufe A)

Eingerichtet 2026-11-24. Der Systemcheck hatte ergeben, dass der Buchungsweg
auf Staging seit dem 11.10. und auf der Beta seit dem 23.10. nicht gelaufen
war. `scripts/e2e/scenarios.mjs` spielt ihn ohne Browser gegen die echte API
durch: ein Nutzer, ein Mitglied eines Test-Anbieters, ein Gast.

## Was geprüft wird

**smoke** (liest nur, Staging und Beta):

- Der Bericht der Anbindungen ist grün (`system-check.md`).
- Gast: Die Suche antwortet, und kein Anbieter trägt vor der Buchung Name,
  Schlüssel, Adresse oder Website.
- Gast: Termine, Buchen und der Bericht sind ohne Anmeldung zu.
- Nutzer: angemeldet, Stand der Beta-Vereinbarung lesbar, kein Anbieter, kein Admin.
- Anbieter: angemeldet und mit seinem Anbieterkonto verbunden, liest seine Leads.
- Rechte: Der Nutzer und der Gast kommen nicht an die Leads des Anbieters.
- Der Test-Anbieter hat freie Zeitfenster.

**full** (dazu, nur Staging):

- Der Nutzer nimmt die Beta-Vereinbarung an, falls sie fehlt.
- Sitzung anlegen, Buchungstext lesen, buchen: bestätigt, und der Anbieter
  wird erst jetzt genannt. Gebühr und Zahlungsweg stehen nicht in der Antwort
  an den Nutzer.
- Dieselbe Anfrage noch einmal legt nichts Zweites an; derselbe Termin ist
  für eine zweite Anfrage vergeben.
- Der Nutzer sieht die Buchung, der Anbieter den Lead mit der Nachricht.
- Der Gast kann nicht absagen; der Nutzer sagt ab.
- Am Ende steht keine bestätigte Testbuchung mehr, auch keine, die die API
  unerwartet zusätzlich angelegt hat.

## Was ein voller Lauf hinterlässt

- **Eine Belastung im Stripe-Testmodus.** Die Buchung zieht die Lead-Gebühr
  von der Testkarte des Test-Anbieters. Sie wird bei der Absage nicht
  erstattet (so ist das Produkt gebaut). Echtes Geld fließt nicht.
- **Eine abgesagte Buchung**, eine Sitzung und ein Eintrag im Ledger des
  Test-Anbieters. Die Nachricht beginnt mit `[E2E-Test]`.
- **Mails** an die Kontaktadresse des Test-Anbieters (Buchung, Absage).
- **Ein Eintrag im Zugriffsprotokoll** je Lauf, auch bei smoke: Der Lauf
  versucht absichtlich, als Nutzer fremde Leads zu lesen.

Deshalb läuft `full` nur einmal am Tag und von Hand, nie auf der Beta.

## Wann er läuft (`e2e-scenarios.yml`)

| Auslöser | Staging | Beta |
|---|---|---|
| nach jedem grünen Staging-Deploy | smoke | nichts |
| täglich 03:41 UTC (kommt oft Stunden später) | full | smoke |
| von Hand (Actions → E2E Scenarios → Run workflow) | smoke oder full | smoke |

## Einmal einrichten

1. **Ein Nutzerkonto je Umgebung** in Supabase anlegen (Authentication →
   Users → Add user, „Auto Confirm User" an), ohne Rolle, mit einem Passwort
   aus dem Passwort-Manager. Als Adresse eignet sich ein Postfach, das nichts
   zustellen muss; das Konto bekommt aus dem Lauf keine Mail, die jemand
   lesen müsste.
2. **Ein Anbieter-Konto je Umgebung.** Zum Start gilt: ein Login je Anbieter
   und ein Anbieter je Login (Unique-Index auf `provider_members`). Ein
   zweites Mitglied lässt sich also nicht dazulegen. Zwei Wege:
   - das bestehende Login des Test-Anbieters nehmen und ihm ein Passwort aus
     dem Passwort-Manager geben (Supabase → Users → Reset password), oder
   - ein neues Konto anlegen und es an Stelle des bisherigen mit dem
     Test-Anbieter verbinden (`POST /api/v1/admin/provider/:key/member` mit
     dem Server-Schlüssel, vorher den alten Eintrag in `provider_members`
     entfernen).
   Auf Staging ist der Test-Anbieter `dahlmann-cpa` (Tax and VAT, DE und NL,
   zahlungsbereit, `public_ref` steht im Workflow). Auf der Beta eignet sich
   einer der Test-Provider `p21` bis `p25`.
3. **Secrets** eintragen (Settings → Secrets → Actions):
   `E2E_STAGING_USER_EMAIL`, `E2E_STAGING_USER_PASSWORD`,
   `E2E_STAGING_PROVIDER_EMAIL`, `E2E_STAGING_PROVIDER_PASSWORD`, für die Beta
   dieselben vier mit `E2E_BETA_…`. Passwörter gehören nicht in den Chat und
   nicht ins Repo.
4. **Schalter** setzen (Settings → Variables), je Umgebung einer:
   `E2E_ENABLED=true` für Staging, `E2E_BETA_ENABLED=true` für die Beta. So
   kann Staging laufen, bevor die Beta-Konten stehen. Für die Beta optional
   `E2E_BETA_PROVIDER_REF` (der `public_ref` eines Test-Anbieters); ohne ihn
   entfällt dort die Prüfung der Zeitfenster.
5. Von Hand mit `smoke` auslösen und das Ergebnis lesen.

Ohne ihren Schalter ist eine Umgebung übersprungen. Mit Schalter ist ein
fehlendes Secret rot: Es wurde nichts geprüft.

## Lokal oder gegen einen eigenen Stand

```bash
API_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… \
E2E_USER_EMAIL=… E2E_USER_PASSWORD=… E2E_PROVIDER_EMAIL=… E2E_PROVIDER_PASSWORD=… \
E2E_PROVIDER_REF=… E2E_LEVEL=smoke node scripts/e2e/scenarios.mjs
```

`E2E_LEVEL=full` verlangt zusätzlich `E2E_ALLOW_FULL=true`. Das ist die
Sicherung dagegen, dass ein voller Lauf versehentlich gegen die Beta geht.

## Wenn ein Schritt rot ist

Die Zeile nennt den Schritt, den Status und den Fehlercode der API, nie
einen Schlüssel oder eine Adresse. Schritte, die von einem gescheiterten
abhängen, stehen als übersprungen da, nicht als bestanden.

| Befund | Bedeutung |
|---|---|
| „Anmeldung der Testkonten" | Passwort geändert, Konto gelöscht oder Supabase nicht erreichbar |
| „Anbieter: … verbunden" mit 404 | das Konto ist kein Mitglied des Test-Anbieters mehr |
| „Termine: …" mit „Buchung nicht offen" | der Test-Anbieter ist pausiert oder nicht zahlungsbereit |
| „Buchung: …" mit `PROVIDER_NOT_BOOKABLE` | Karte oder Abrechnungsdaten des Test-Anbieters fehlen |
| „Buchung: …" mit `ACKNOWLEDGEMENT_OUTDATED` oder `AGREEMENT_REQUIRED` | der Lauf liest beide Fassungen frisch; das wäre ein Fehler der API |
| „Rechte: …" | **ernst**: die API lässt etwas durch, das sie nicht durchlassen darf |
| „Aufräumen: …" gescheitert | eine bestätigte Testbuchung steht noch; von Hand absagen |

## Grenzen

- Kein Browser. Was nur die Oberfläche tut, prüft dieser Lauf nicht; das ist Stufe B.
- Nachrichten zwischen Nutzer und Anbieter, Umbuchen, Anwesenheit und der
  Monatslauf sind noch nicht dabei.
- Die Formen der Antworten hält die API-Suite fest (`api.test.ts`, „Stufe A"):
  Dort läuft derselbe Läufer gegen die echten Routen mit einer Datenbank im
  Speicher. Gegen Staging selbst ist er am 24.11.2026 noch nicht gelaufen;
  das geht erst mit den Testkonten.
