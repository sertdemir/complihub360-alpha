# Beta-Volltest · Montag, 26.10.2026

Stand 24.10.2026. Umgebung: **beta.complihub360.com** auf dem Stand des
letzten „Deploy Beta" (Lauf 8, `77740bd3`, plus alles, was bis Montag von
Hand nachgezogen wird). Zwei Rollen, vier Sprachen, Desktop und Mobil.
Ergebnis: eine abgehakte Liste und ein Fehlerprotokoll, aus dem am Dienstag
die Bug-Reihenfolge entsteht.

Grundlage: [KN-PRODUCT-001](../../.knowledge/memory/nodes/KN-PRODUCT-001-technical-ux-acceptance-checklist.md)
(abgenommene Copy, Privacy-Tests, Terminologie), die E2E-Flows unter
`apps/vs1-demo/ui/e2e/flows/` (was dort grün ist, muss auf Beta von Hand
genauso laufen) und die Runbooks [beta-deploy.md](../runbooks/beta-deploy.md),
[beta-test-providers.md](../runbooks/beta-test-providers.md).

## Regeln für den Tag

- **Ein Durchlauf, ein Protokoll.** Jeder Punkt bekommt ✅ / ⚠️ / ❌ und bei
  ⚠️ oder ❌ eine Zeile im Fehlerprotokoll unten. Kein Fehler wird am Montag
  behoben, nur notiert; Dienstag ist Bugfix-Tag.
- **Testdaten sind erfunden.** Keine echten Firmen, keine echten Kundendaten,
  keine echten Dokumente. Beta-Vereinbarung Punkt 05 gilt auch für uns.
- **Zeit stoppen, nicht schätzen.** Bei Lade- und Antwortzeiten die Sekunden
  notieren, sonst gibt es Dienstag Streit über „fühlte sich langsam an".
- **Screenshots bei jedem ❌**, Dateiname `Bx-<Nummer>-<Route>-<Sprache>.png`.
- **DNA-Blick in jedem Schritt** (`KN-BRAND-001`): Macht ein Text Druck?
  Wird eine Option als Pflicht dargestellt? Verbirgt ein Text Unsicherheit?
  Das ist ein ❌, auch wenn technisch alles läuft.

## Vorbereitung (Sonntag oder Montag früh, 30 Minuten)

| # | Was | Wie | Erledigt |
|---|---|---|---|
| V1 | Beta auf aktuellem `main` | Actions → „Deploy Beta" mit vollem Commit-Hash; Lauf grün inkl. Migrations-Check | ☐ |
| V2 | Tester-Zugang für die Wand | `./scripts/beta-auth.sh add volltest-<name>` je Person; Passwörter über den Passwort-Manager | ☐ |
| V3 | Zwei frische Nutzer-Adressen | Je Rolle und Durchlauf eine neue Mailadresse (Plus-Adressen reichen), damit Registrierung und Beta-Vereinbarung wirklich zum ersten Mal kommen | ☐ |
| V4 | Ein Test-Provider-Login | Aus `demet+p01..p25@`, Passwort aus dem Passwort-Manager (Runbook beta-test-providers) | ☐ |
| V5 | Geräte | Desktop-Browser (Chrome und Safari oder Firefox), ein echtes Smartphone (kein Emulator) mit ~390 px Breite | ☐ |
| V6 | Postfächer | Testerkonten müssen Auth-Mails empfangen; Spam-Ordner im Blick | ☐ |
| V7 | Datenbank-Blick vorbereitet | Supabase-Projekt `complihub360-beta`: `user_agreement_acceptance`, `event_log`, Buchungen; nur lesen | ☐ |
| V8 | Fehlerprotokoll geöffnet | Abschnitt unten kopieren, Nummern ab B1 | ☐ |

## Durchlauf A · Nutzer, Desktop, Deutsch (Hauptweg, ~60 Minuten)

Der Hauptweg entspricht `user-booking.spec.ts` und `beta-agreement.spec.ts`.

| # | Schritt | Erwartung | Status |
|---|---|---|---|
| A1 | `beta.complihub360.com` öffnen | Wand fragt nach Zugang; danach Startseite in der Browsersprache; Beta-Banner sichtbar, ehrlich formuliert | ☐ |
| A2 | Startseite lesen | Kein Hype, keine Angst, keine Versprechen über Reichweite; Gradient-Flächen ohne Varianten; Fonts laden ohne Fremdhost (Netzwerk-Tab: nur beta.complihub360.com, Supabase, Plausible) | ☐ |
| A3 | Als Gast in den Wizard | Fragen in Reihenfolge, Abbruch jederzeit möglich, kein Zwang zur Registrierung vor der Risk Map | ☐ |
| A4 | Risk Map als Gast | Pflichten nach Beleg in drei klappbaren Cards (F1); Prioritäten mit Zeitwort, oberste Stufe „Immediate", nie „Urgent"; Hinweis „30 Minuten gehalten", kein Countdown-Druck | ☐ |
| A5 | Anbieter als Gast | Treffer sichtbar, aber **anonym**: kein Name, kein Logo, kein Link, auch nicht im Browser-Payload (Netzwerk-Tab prüfen) | ☐ |
| A6 | Registrieren | Mail kommt innerhalb 1 Minute; Link in **anderem** Browser öffnen funktioniert (token_hash); Fehlerseite nur bei echtem Fehler | ☐ |
| A7 | Beta-Vereinbarung | Schritt kommt genau einmal, nach dem ersten Login; neun Sätze im Kasten, kein Volltext-Link; ohne Haken: Hinweis ohne Vorwurf; mit Haken: weiter ans Ziel | ☐ |
| A8 | Nachweis im Konto | `/de/dashboard/account`: Fassung `beta-2026-10`, Zeitpunkt, Sprache Deutsch, Badge „aktuell" | ☐ |
| A9 | Datenbank | `user_agreement_acceptance` hat eine Zeile, `event_log` ein `agreement_accepted` mit gleicher userId; Zeitabstand unter 1 s | ☐ |
| A10 | Risk Map gespeichert | Die Gast-Map ist nach dem Login die eigene; Sitzung unter `/dashboard/sessions` | ☐ |
| A11 | Ranking | Kein Hinweis auf Tarif oder Gebühr am Rang; ohne Bereichs-Überschneidung **kein** Prozentwert, Anbieter ohne Passung eingeklappt unter der Lücke (F2); „neutral" heißt „ohne Daten", nie „nicht buchbar" | ☐ |
| A12 | Anbieterprofil `/p/:ref` | Noch anonym; Buchen führt zu `/p/:ref/schedule` | ☐ |
| A13 | Termin buchen | Offenlegungsdialog **wörtlich** nach abgenommener Copy (Acknowledgement v2: drei Absätze, 10 % Rabatt, „Buchung kostet Sie nichts"); Haken Pflicht; Abbruch ohne Folgen | ☐ |
| A14 | Bestätigung | Jetzt erst Name und Kontakt des Anbieters; Hinweis „Offenlegung folgt in Kürze" bis Audit geschrieben; Bestätigungsmail | ☐ |
| A15 | Datenbank | Buchung vorhanden, `shared_released_at` gesetzt, Audit `lead.revealed` genau einmal; keine Stripe-Belastung außerhalb Testmodus | ☐ |
| A16 | Termine und Nachrichten | `/dashboard/termine` zeigt die Buchung; Nachricht an den Anbieter senden; Absage-Dialog sagt „Ihnen wird nichts berechnet" | ☐ |
| A17 | Übrige Flächen | `/dashboard/library`, `/alerts`, `/notifications`, `/saved-providers`, `/requests`, `/calendar`: laden, Leerzustände mit abgenommener Copy, keine Platzhalter | ☐ |
| A18 | Konto und Ausstieg | Abmelden aus dem Konto; erneutes Anmelden fragt **nicht** noch einmal nach der Vereinbarung | ☐ |
| A19 | Löschen anfragen | Weg zum Löschen oder zur Anfrage sichtbar, kein Vortäuschen einer Sofortlöschung | ☐ |

## Durchlauf B · Anbieter, Desktop, Deutsch (~40 Minuten)

Entspricht `provider-ops.spec.ts`. Login mit einem Test-Provider aus V4.

| # | Schritt | Erwartung | Status |
|---|---|---|---|
| B1 | Login als Anbieter | Direkt ins `/provider-dashboard/overview`; **kein** Beta-Vereinbarungs-Schritt (Entscheidung 4C) | ☐ |
| B2 | Übersicht | Zahlen stimmen mit der Datenbank überein; keine erfundenen Kennzahlen | ☐ |
| B3 | Anfragen / Leads | Die Buchung aus A13 ist da; Nutzerdaten erst **nach** Freigabe sichtbar, vorher „nicht freigegeben"; Band und Gebühr am Lead | ☐ |
| B4 | Termine | Anwesenheit setzen, Angebot anlegen (PATCH), Nachricht aus A16 lesen und beantworten | ☐ |
| B5 | Abrechnung | Pause ehrlich benannt; Karte prüfen auf Anstoß; Rechnungen mit Status, Entwurf als Entwurf | ☐ |
| B6 | Abo | Plan sichtbar, Wechsel angekündigt, kein Druck; Plan-Effekt im Ranking nirgends als Vorteil beworben | ☐ |
| B7 | Einstellungen | Firmierung, Bio, Avatar aus der Bewerbung; Pausieren an `availability`; Löschen ist eine Anfrage | ☐ |
| B8 | Nachweise / Verifizierung | Zulassungen je Land, Status nachvollziehbar, keine Fristen als Drohung | ☐ |
| B9 | Benachrichtigungen | Lead und Nachricht ausgelöst; SLA-Erinnerung genau eine je Anfrage (nicht doppelt) | ☐ |
| B10 | Bewerbung (neuer Anbieter) | `/provider-apply` als Gast: Abrechnungsermächtigung zeigt Fassung 2026-10 (Platzhalter-Text noch gekennzeichnet) | ☐ |

## Durchlauf C · Öffentliche Seiten und Rechtsseiten, vier Sprachen (~45 Minuten)

Je Sprache die Spalte abhaken. Sprache über den Umschalter wechseln **und**
einmal direkt per URL (`/en/…`, `/es/…`, `/tr/…`) aufrufen.

| Seite | de | en | es | tr | Prüfpunkte |
|---|---|---|---|---|---|
| `/` Startseite | ☐ | ☐ | ☐ | ☐ | kein englischer Rückfalltext in de/es/tr; Title Case nur en; Layout hält lange deutsche und türkische Wörter |
| `/how-it-works`, `/pricing`, `/platform`, `/solutions` | ☐ | ☐ | ☐ | ☐ | Preise ohne Druck; nichts beworben, was nicht live ist |
| `/compliance`, `/compliance/:area` (2 Bereiche) | ☐ | ☐ | ☐ | ☐ | neun Bereiche als echte Links; Texte ohne Rechtsberatungs-Ton |
| `/markets`, `/markets/:code` (2 Märkte) | ☐ | ☐ | ☐ | ☐ | Abdeckung aus echten Daten, nie „weltweit verfügbar" |
| `/terms` Beta-Vereinbarung | ☐ | ☐ | ☐ | ☐ | neun Punkte in Landessprache; Kontaktsatz vollständig mit Adresse im Satz (#399) |
| `/privacy` | ☐ | ☐ | ☐ | ☐ | Frankfurt, Supabase, **Scaleway Paris**, Resend, Plausible; kein Google als KI-Dienst |
| `/imprint`, `/cookies` | ☐ | ☐ | ☐ | ☐ | Betreiberin, Adresse, Postfächer; Cookies: „keine Inhalte Dritter" |
| `/login`, `/register`, `/reset-password` | ☐ | ☐ | ☐ | ☐ | Auth-Mails in der gewählten Sprache; Betreff und Ablaufzeit (30 min) stimmen |
| Footer | ☐ | ☐ | ☐ | ☐ | Link heißt „Beta-Vereinbarung" (übersetzt), führt auf `/:lang/terms` |

Für `/wizard` und die Risk Map zusätzlich **en** einmal komplett (Release
Decision „EN first"): Durchlauf A3 bis A5 auf Englisch wiederholen.

## Durchlauf D · Mobil (~45 Minuten)

Echtes Smartphone, Hochformat, Beta-Wand passiert. Deutsch, dazu Englisch
für D1 bis D4.

| # | Schritt | Erwartung | Status |
|---|---|---|---|
| D1 | Startseite | Kein horizontales Scrollen; Menü erreichbar; Gradient-Flächen bündig | ☐ |
| D2 | Wizard | Jede Frage ohne Zoomen bedienbar; Tastatur verdeckt keinen Weiter-Knopf | ☐ |
| D3 | Risk Map | Cards klappen; Prioritäten lesbar ohne Hover (kein Tooltip-only) | ☐ |
| D4 | Registrierung + Mail-Link am Handy | Link aus der Mail-App öffnet die Beta und meldet an | ☐ |
| D5 | Beta-Vereinbarung | Linke Seite oben, Blatt scrollt im Kasten (`max-h 40vh`), Knopf weiß auf Petrol, Seite nicht höher als nötig | ☐ |
| D6 | Buchung | Offenlegungsdialog vollständig lesbar, Haken treffbar (≥ 44 px) | ☐ |
| D7 | Workspace | Tönung reicht bis unten, keine weiße Leiste; Navigation unten oder im Menü erreichbar | ☐ |
| D8 | Anbieter-Dashboard | Tabellen scrollen in sich, nicht die Seite | ☐ |
| D9 | Rechtsseiten | Lesbar, Kontaktadresse antippbar | ☐ |

## Querschnitt (während aller Durchläufe)

| # | Prüfung | Status |
|---|---|---|
| Q1 | **Tastatur**: Tab-Reihenfolge sinnvoll, Fokus sichtbar, Dialoge schließen mit Esc | ☐ |
| Q2 | **Farbe nie allein**: Status und Priorität auch per Text oder Symbol erkennbar | ☐ |
| Q3 | **Fehlertexte** nennen den Grund und den nächsten Schritt, keine Codes allein | ☐ |
| Q4 | **Ladezustände** ruhig („wird geladen …"), keine springenden Layouts | ☐ |
| Q5 | **Terminologie**: keine verbotenen Begriffe (Liste in `scripts/check-terminology.mjs`), „Risk Map" als Produktname | ☐ |
| Q6 | **Privacy**: vor der Buchung kein Anbietername im Payload; nach der Buchung nur der gebuchte Anbieter | ☐ |
| Q7 | **Assistent** (wenn eingeschaltet): nennt sich als KI, keine Rechtsberatung, antwortet in der Sprache der Frage, 502 statt stiller Ausweich bei Ausfall | ☐ |
| Q8 | **Zeiten**: Startseite < 2 s, Risk Map < 5 s, Buchungsbestätigung < 3 s (gestoppt, nicht geschätzt) | ☐ |

## Fehlerprotokoll

Schweregrade: **S1** Blocker (Weg endet, Daten falsch, DNA-Verstoß) · **S2**
Fehler (Weg geht, aber falsch oder verwirrend) · **S3** Schönheit.

| Nr | Durchlauf/Schritt | Route | Sprache | Gerät | Schwere | Was passiert, was erwartet | Screenshot |
|---|---|---|---|---|---|---|---|
| B1 | | | | | | | |
| B2 | | | | | | | |

## Go/No-Go für Freitag, 30.10.

- **Go**, wenn: kein offener S1; Durchlauf A und B in Deutsch und Englisch
  vollständig ✅; Rechtsseiten in allen vier Sprachen ✅; D1 bis D6 ✅.
- **No-Go**, wenn: ein S1 offen ist oder ein Privacy-Punkt (A5, A14, B3, Q6)
  nicht sauber ist. Dann verschiebt sich der Start, nicht der Anspruch.
- S2 und S3 werden am Dienstag priorisiert; was bis Donnerstag nicht
  behoben ist, steht als bekannte Einschränkung in der Tester-Einladung.
