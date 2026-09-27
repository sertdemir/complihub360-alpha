# ADR-0004: Anonymes Matching — opaker Ref, Titel vom System, Scan blockiert, Verifikationstiefe statt Status

**Status:** ACCEPTED
**Date:** 2026-09-27
**Bezug:** *Provider Verification and Dashboard Implementation Specification* v1.0 (20.09.2026, „Spec A") §13 (Sichtbarkeitsklassen), §14 (kein kommerzieller Einfluss auf das organische Ranking), §15 (Anonymous Match Card, Identity Protection) · [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §3 („Quality before brand recognition") · ADR-0002 · ADR-0003 (Punkt 3 und 8) · Addendum Dossier Handover & Anonymization (2026-07-10)
**Entscheidungen des Nutzers (2026-09-27):** Titel = Buchstabe plus Beschreibung · Scan blockiert und benennt · Prioritätsanteil = Verifikationstiefe

## Context

Die DNA verspricht, dass ein Unternehmen Fit, Qualität und Preis eines Anbieters bewertet, **bevor** es seine Identität sieht. Die Migration vom 20.09. legte dafür ein Register `provider_field_visibility` an. Beim Inventar für Phase 3 zeigte sich, dass das Versprechen nur an der Oberfläche galt:

- **`provider_key` verriet den Namen.** Der Schlüssel wird beim Intake aus dem Firmennamen gebildet („Testkanzlei Schmidt GmbH" → `testkanzlei-schmidt-gmbh`) und lag in jeder Antwort an den Nutzer: Suche, Detail, Buchung, Termine, Benachrichtigungen. Die Karte zeigte ihn nicht, die Netzwerkkonsole schon. Anonymität war eine CSS-Eigenschaft.
- **Das Pseudonym schrieb der Anbieter.** `pseudonym_label` war ungeprüfter Freitext aus Intake und Einstellungen. Spec §15 verbietet „unique wording … that reasonably reveals identity"; nichts prüfte das.
- **Das Register las niemand.** Die API serialisierte nach handgeschriebenen Listen; `/detail` lieferte `confirmation_rate` und `countries_supported` (Klasse `internal`) und Spezialisierungen aus dem Altfeld `categories` statt aus der View.
- **Freitexte waren ungeprüft.** Leistungsbeschreibungen, Qualifikationen, Preistabellen und Bewertungstexte gingen ungescannt an den Nutzer. Die Redaction kannte E-Mail, Telefon und IBAN, aber keine Domain, keine Rechtsform, keinen Firmennamen.
- **Das Ranking hing an `partner_status`.** Prioritätsanteil 0.1 für `active`, Faktor 0.4 bei `downgraded`; Detail und Buchung antworteten 404, wenn der Status nicht `active` war, obwohl die View entscheidet, wer matchbar ist. ADR-0003 hatte angekündigt, den Faktor in Phase 3 auf eine verifizierte Grundlage zu stellen.
- **Die Reihenfolge war unerklärt.** Sortiert wurde nach Gesamtscore, gezeigt nur die Relevanz. Eine Karte mit 87 % konnte über einer mit 100 % stehen, ohne dass der Nutzer erfuhr, warum.

## Decision

1. **`public_ref` ist der einzige Anbieter-Bezeichner, der einen Nutzer erreicht.** Zwölf Hex-Zeichen aus Zufall (`providers.public_ref`, UNIQUE, Backfill für den Bestand). Alle Nutzer-Routen laufen über `/p/{ref}/…`; `POST /scheduling` nimmt den Ref; Termine und Benachrichtigungen tragen ihn. `provider_key` bleibt intern und der Pfad der Anbieter-eigenen Routen hinter dem Ownership-Guard. Die alten Pfade `/provider/{key}/(detail|slots|reviews|website)` antworten 404, weil sie außerhalb des Guards ein Rückkanal vom Ref zum Namen wären.

2. **Der Titel vor der Buchung entsteht im System.** „Verified Provider A/B/C" je Ergebnisliste (der Buchstabe ist die Position in *dieser* Antwort, nicht über Sitzungen stabil), darunter eine Beschreibung aus höchstens zwei freigegebenen Bereichen (`service_categories.label_en`) und der groben Region. `pseudonym_label` wird nicht mehr angenommen und nicht mehr gelesen; die Spalte fällt mit den anderen Altbestands-Spalten in einem eigenen Schritt.

3. **Der Serializer liest das Register.** `serializeProvider(row, register, stage)` gibt je Stufe (`anonymous`, `revealed`) nur Felder der erlaubten Klassen aus; ein Feld ohne Eintrag fällt weg. `provider_key` und `pseudonym_label` kommen nie durch, auch wenn jemand das Register ändert. Die Dossier-Felder bekommen Einträge; `confirmation_rate` bleibt `internal` und erreicht die Karte nur als Aussage in `rank_basis`.

4. **Ein deterministischer Identitäts-Scan blockiert beim Schreiben und benennt den Fund.** Regex und feste Heuristiken, kein LLM (Privacy-Regel): E-Mail und Telefon aus der Redaction, dazu Domain, Social-Handle, Rechtsform *nach* einem Firmenwort, Registernummern (HRB, REA, RCS, CIF/NIF, KvK, P.IVA, UID) und die Tokens des eigenen Firmennamens sowie die eigene Domain. Speichern scheitert mit 422 `IDENTITY_IN_TEXT`, die Antwort nennt Feld, Typ und Stelle — in Worten ohne Verstoß-Sprache („Bitte ohne Firmenname"). Beim Lesen maskiert dasselbe Modul als Netz für Altbestand und für Bewertungstexte, in denen ein Mandant den Anbieter nennt.

5. **Der Prioritätsanteil ist die Verifikationstiefe.** Anteil der Pflichtnachweise (aus `requiredEvidence`) mit `independently_verified` (1) oder `reviewed` (0.5). Jeder neue Anbieter kann ihn sofort erreichen; Größe, Alter und Plan zählen nicht. `partner_status` und der Watchdog-Faktor sind aus dem Scorer entfernt; Verstöße zählen über `breach_count` in der Qualität, und ein Konto, das gesperrt gehört, ist über den Lifecycle nicht in der View. Bewertungen zählen nur aus Buchungen. Die Gewichte 0.6 / 0.3 / 0.1 bleiben; sie zu ändern ist eine eigene Entscheidung.

6. **Die Reihenfolge wird erklärt.** Neben `match_basis` (Fit: Markt, Bereiche) trägt jede Karte `rank_basis` mit den Fakten hinter dem Rang: Verifikationsstufe mit Zähler, Antwortzeit, Bestätigungsrate, Bewertung aus Buchungen mit Anzahl. Fakten, keine Gewichte.

7. **Buchbar heißt matchbar und zahlungsbereit.** `POST /scheduling` prüft die View statt `partner_status`; fehlt `billing_ready`, antwortet 409 `BILLING_NOT_READY` statt still 404. Das Gate sperrt die Buchung, nie das Matching (§14, §21.1).

## Consequences

- Der Browser kennt keinen `provider_key` mehr. Alle UI-Clients, Routen (`p/:ref`), Mocks und Fixtures wechseln auf `public_ref`; die Karte zeigt `title` und `descriptor`, das Pseudonym-Feld verschwindet aus Intake und Einstellungen und wird durch eine Vorschau „So erscheinen Sie vor der Buchung" ersetzt.
- Ein Leak-Guard-Test prüft für Suche, Detail, Bewertungen, Slots, Termine und Benachrichtigungen, dass weder Schlüssel noch Name, Domain oder Kontaktdaten im JSON stehen — auch nicht als Wert in einem Freitext. Der Neutralitäts-Test deckt jetzt Plan **und** `partner_status`.
- Der Buchstabe ist nicht über Sitzungen stabil; wer einen Anbieter wiedererkennen will, braucht die Buchung. Das ist die Merklisten-Entscheidung vom 22.09. als Konsequenz, nicht als Nebenwirkung.
- Der Scan kennt falsche Positive (ein Ortsname, der wie ein Firmenwort vor „AG" steht). Die 422-Antwort nennt die Stelle, der Anbieter formuliert um; der Reviewer sieht in seinem Dossier `identity_findings` für den Altbestand. Eine Ausnahmeliste ist Konfiguration, kein Umgehen des Scans.
- `partner_status`, `categories`, `countries_supported` und `pseudonym_label` liest jetzt nichts mehr auf der Nutzerseite. Ihr Entfernen ist der nächste Schritt und braucht eine eigene Migration.
- Die Doku-Stellen aus ADR-0003 Punkt 8 bekommen den Vermerk „umgesetzt in ADR-0004" (`docs/backlog/user-flow-matchmaking-v2-spec.md` §5/§6).

## DNA-Check

Betroffen: Ranking und Matching (Reihenfolge, Erklärbarkeit), Copy (Titel, Scan-Feedback), Provider-Policies (was ein Anbieter über sich schreiben darf), AI-Verhalten (keins: der Scan ist deterministisch).

- **Stellt es die echten Bedürfnisse des Users an erste Stelle?** Ja — der Nutzer vergleicht Fit und Leistung, bevor ein Name die Wahl färbt; und er erfährt, warum B über C steht, statt eine Prozentzahl zu glauben.
- **Wahrt es die Fairness zwischen Providern?** Ja — der Titel ist für alle gleich gebaut, kein Anbieter kann sich einen klingenden Namen geben; das Rangmerkmal Verifikationstiefe ist am ersten Tag erreichbar, unabhängig von Größe, Alter und Plan.
- **Kommunizieren wir ehrlich, ohne Angst?** Ja — der Scan sagt „bitte ohne Firmenname: ‚Bianchi' in Zeile 2", nicht „Verstoß"; er blockiert, statt still zu ändern, damit der Anbieter weiß, was ankommt.
- **Würden wir diese Empfehlung auch ohne Transaktion geben?** Ja — Billing sperrt nur die Buchung und sagt das jetzt auch (409 mit Grund).
- **Never make the user feel small:** Die Anonymität wird erklärt (neutrale Auswahl, Gegenseitigkeit: der Anbieter sieht den Nutzer ebenfalls erst mit dem Termin), nicht verordnet.
