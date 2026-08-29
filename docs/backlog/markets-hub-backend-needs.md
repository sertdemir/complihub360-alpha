# Märkte-Bereich + Sitzungs-Verlauf — was das Backend dafür braucht

Stand 2026-08-29 · Sammelnotiz, wird Schritt für Schritt abgearbeitet.
Diese Datei ist eine **Anforderungsliste**, kein Bauplan. Sie hält fest, was
im Frontend bereits entworfen ist, aber ohne Backend nur Attrappe bleibt.

Zugehörig: `docs/market-page-spec.md` (öffentliche Marktseite, Marketing —
davon ist der hier beschriebene Bereich getrennt: er sitzt **im Arbeits-
bereich**, hinter dem Login, und lebt von laufend aktualisierten Inhalten).

---

## 1 · Nav-Bereich „Märkte" (neu, im Arbeitsbereich)

Pro Markt, den wir bedienen, eine Seite mit **laufend aktualisierten** Inhalten:

| Inhalt | Was der Nutzer erwartet | Was das Backend liefern muss |
|---|---|---|
| Richtlinien | die geltenden Regelwerke des Marktes | kuratierte Liste je `market_code`, versioniert |
| Nachrichten | News **nur** aus diesem Land/dieser Region | Ingest + Geo-Filter + Dedup + Ranking |
| Gesetze | aktueller Stand **und** laufende Änderungen | Normen-Register mit Fassungs-Historie und Diff |
| Videos | YouTube, von fachlich Qualifizierten | Kanal-Whitelist, Metadaten-Abruf, Freigabe |
| Blogbeiträge | Fachbeiträge Dritter | Feed-Ingest, Quellen-Whitelist |
| Webinare | kommende und aufgezeichnete Termine | Termin-Objekt mit Zeitzone und Status |

### Offene Punkte, die vor dem Bau entschieden werden müssen

1. **Quellen.** Es gibt heute keine. Wer liefert News und Gesetzestexte —
   ein bezahlter Aggregator (LexisNexis, Wolters Kluwer, EUR-Lex-Webservice),
   RSS/Atom von Behörden, oder redaktionelle Handarbeit? Davon hängt alles
   Weitere ab: Kosten, Aktualisierungstakt, Rechtslage.
2. **Recht.** Nachrichten-Volltexte und Blogbeiträge sind fremdes Werk.
   Zulässig ist in aller Regel nur Titel + Kurzabriss + Link zur Quelle.
   YouTube-Videos nur per offiziellem Embed. Das muss die Datenhaltung
   erzwingen, nicht der Redakteur.
3. **Qualität.** „von wirklichen Professionellen" heißt: eine gepflegte
   Whitelist von Kanälen/Autoren, kein offener Crawl. Wer pflegt sie?
4. **Aktualisierungstakt.** Stündlich, täglich, wöchentlich? Bestimmt
   Job-Infrastruktur und Kosten.
5. **Verhältnis zum Abo.** Laut Addendum *Knowledge & Retention Layer* §2/§6
   ist Monitoring/„Live News" **Phase 2, Milestone D, kostenpflichtig**.
   Der Märkte-Bereich ist genau dieses Feature. Also: was sieht ein Nutzer
   ohne Abo?

### Datenmodell (Vorschlag, noch nicht gebaut)

```
market_resource
  id, market_code, kind ('directive'|'news'|'law'|'video'|'post'|'webinar')
  title, summary, source_name, source_url, published_at, language
  areas text[]          -- Bereichsbezug: 'vat', 'epr', 'privacy', …
  relevance jsonb       -- Rohsignale fürs Ranking
  status ('draft'|'published'|'retired'), curated_by, created_at, updated_at

market_law_version     -- nur für kind='law': die Fassungs-Historie
  law_id, valid_from, valid_to, change_summary, diff_url

market_source          -- die Whitelist
  id, market_code, kind, feed_url|channel_id, trust ('official'|'pro'|'partner')
  active, last_fetched_at, last_error
```

### Jobs

- `ingest_market_sources` — pro aktiver Quelle abrufen, normalisieren,
  deduplizieren, `market_resource` schreiben. Idempotent über
  (`source_id`, externe id).
- `detect_law_changes` — Normfassungen vergleichen, `market_law_version`
  fortschreiben, Änderung als `news`-Eintrag ausspielen.
- Fehlerpfad: eine tote Quelle darf die Seite nicht leeren. Letzter guter
  Stand bleibt sichtbar, mit Datum.

### API

```
GET /api/v1/markets                       -> bediente Märkte + Zählwerte
GET /api/v1/markets/{code}                -> Kopfdaten
GET /api/v1/markets/{code}/resources      -> ?kind=&area=&limit=&cursor=
GET /api/v1/markets/{code}/laws/{id}/history
```

---

## 2 · Markt-Teaser in der Sitzung („Morning Band")

Der Snapshot einer Sitzung soll **aus diesem Pool** herausgreifen, was für
genau diese Sitzung gerade relevant ist — als Teaser bzw. schmales Band.
Die Navigation wird dafür später im Layout umgebaut, damit der Teaser Platz
hat (Nutzer-Festlegung 2026-08-29).

Damit das kein Zufallsgenerator wird, braucht es einen **Relevanzschnitt**:

```
GET /api/v1/session/{id}/market-highlights?limit=1..3
```

Der Server kennt die Sitzung (Märkte, Bereiche, offene Pflichten) und
schneidet `market_resource` danach:

1. `market_code` ∈ Märkte der Sitzung
2. `areas` ∩ Bereiche der Sitzung ≠ ∅
3. bevorzugt `kind='law'` mit Änderung, die eine Pflicht der Sitzung berührt
4. sonst neueste `news`/`webinar` aus 1+2
5. nichts Passendes → **leere Antwort**, und das Band wird nicht gerendert.
   Kein Füllmaterial.

Jeder Treffer trägt einen Begründungssatz („betrifft OSS-Quartalsmeldung"),
sonst kann der Nutzer die Auswahl nicht prüfen.

---

## 3 · Sitzungs-Versionen (Verlauf) — heute nicht vorhanden

Der entworfene Verlauf zeigt „Version 3 · aktuell / Version 2 / Version 1"
mit den Links **Ansehen** und **Mit heute vergleichen**. Beides ist ohne
Backend nicht darstellbar:

- `sessions` liefert weder `results_snapshot` noch `version`
  (`src/api/sessions.ts`), obwohl das Datenmodell im Produktpapier §4.1
  beides vorsieht.
- Es gibt keinen Endpunkt, der eine Sitzung neu berechnet.

Gebraucht:

```
session_version
  id, session_id, version int, created_at, reason text
  answers jsonb            -- Eingaben zum Zeitpunkt
  results_snapshot jsonb   -- Ergebnis zum Zeitpunkt (eingefroren)
  ruleset_version text     -- gegen welchen Regelstand gerechnet wurde

GET  /api/v1/session/{id}/versions
GET  /api/v1/session/{id}/versions/{v}          -> eingefrorener Snapshot
GET  /api/v1/session/{id}/versions/{v}/diff?to=current
POST /api/v1/session/{id}/recompute             -> legt neue Version an
```

`ruleset_version` ist der Kern: Ohne ihn kann niemand sagen, ob sich das
Ergebnis geändert hat, weil der Nutzer etwas anders beantwortet hat oder
weil sich das Recht geändert hat. Der Diff muss beides trennen.

Bis das steht, gilt für die Oberfläche: **keine Links, die ins Leere führen.**

---

## 4 · Veraltungs-Hinweis („nicht mehr aktuell")

Die Sitzungen-Seite markiert Sitzungen ab `STALE_DAYS = 90` als veraltet —
eine reine Zeitheuristik, weil es nichts Besseres gibt. Fachlich richtig wäre:
veraltet ist eine Sitzung, wenn sich seit ihrer Berechnung eine **Norm
geändert hat, die eine ihrer Pflichten trägt**. Das setzt §1 (Gesetzes-
Historie) und §3 (`ruleset_version`) voraus. Danach: Heuristik ersetzen,
`STALE_DAYS` entfernen.

---

## 5 · Rechtsgrundlagen-Links

Im Snapshot ist unter jeder Pflicht die Norm verlinkt. Tatsächlich hat heute
nur EU-Recht ein Ziel (EUR-Lex). Nationale Normen — UStG, VerpackG,
UK VATA 1994 — haben **keine** hinterlegte URL; der Code vermerkt das
ausdrücklich. Entweder nationale Quellen ergänzen (pro Markt eine
Fundstellen-Basis, gehört sinnvoll in §1) oder in der Oberfläche ehrlich
unterscheiden: verlinkt, was verlinkbar ist, der Rest bleibt Text.

---

## 6 · Anbieter anfragen

`RequestQuoteModal` braucht zwingend einen `provider` mit `provider_key` und
postet auf `/api/v1/engagement`. Ein Sammel-Button „Anbieter anfragen" ohne
ausgewählten Anbieter hat kein Ziel — deshalb im Snapshot entfernt. Falls er
zurück soll, braucht es entweder eine Mehrfachanfrage
(`POST /api/v1/engagement/batch` mit Anbieterliste) oder einen
Anbieter-Auswahlschritt davor.

---

## Reihenfolge, wie ich sie vorschlage

1. §3 Sitzungs-Versionen — blockiert Verlauf, Vergleich und §4.
2. §1 Quellen- und Rechtsentscheidung — ohne die ist §1/§2 nicht baubar.
3. §1 Datenmodell + Ingest für **eine** Art (Gesetze) und **einen** Markt.
4. §2 Teaser, sobald §1 Daten führt.
5. §5, §6 nebenher.

---

## Festlegungen 2026-08-29 (Nutzer)

- Der Märkte-Bereich wird **erst in Phase 2 gebaut**. Kurzzeitig war
  vorgesehen, ihn schon jetzt anzuteasern (Nav-Eintrag mit BETA-Marke,
  Teaser in der Seitenleiste des Snapshots). Das ist am 2026-08-29
  **zurückgestellt** worden: beides ist aus den auszurollenden Entwürfen
  wieder entfernt und wird zum passenden Zeitpunkt eingesetzt.
  **Verworfen ist nichts** — die Entwürfe liegen im Canvas als eigene,
  mit „Zurückgestellt · …" gekennzeichnete Artboards:
  Teaser als Fläche (Band / rechte Spalte / breite Karte), Teaser in der
  Seitenleiste in vier Abstufungen (D1–D3 gefüllt, D4 Ankündigung) und drei
  Gesamtansichten. Für den Nav-Eintrag ist die vorhandene Gruppe
  *Monitoring* in `UserShell.tsx` der richtige Ort — sie trägt die
  „Bald"-Marke bereits; als Ziel genügt eine `ComingSoonPage` unter
  `dashboard/markets`, dem Muster von `dashboard/alerts` und
  `dashboard/calendar` folgend. Die Ausarbeitung der Punkte 1 und 2 folgt
  später im Detail.
- Im Verlauf einer Sitzung bleibt **nur „Als Variante kopieren"**.
  „Ansehen" und „Mit heute vergleichen" entfallen, bis §3 steht — lieber
  drei ehrliche Zeilen als zwei tote Links.
- **Wichtig für den Teaser:** Solange kein Endpunkt Daten liefert, darf die
  Oberfläche keine erfundenen Meldungen zeigen. Bis §2 steht, entweder hinter
  einem Flag ausgeblendet oder als reiner Ankündigungszustand ohne Inhalte.
  Der Canvas-Entwurf arbeitet mit einem Platzhalter-Fixture.
