# Plausible CE — Einbindung

Zwei Hälften. Die Serverhälfte stand seit jeher, die Clienthälfte fehlte bis
zum 20.08.2026 — es wurde also nie ein Pageview erfasst.

## Server

`compose.override.yml` (Kopfkommentar dort erklärt Traefik, TLS und warum es
keine `ports:` gibt). Deploy-Ziel `/docker/plausible/` auf der VPS.

## Client

`apps/vs1-demo/ui/index.html` injiziert das Skript **nur**, wenn beide
Variablen gesetzt sind:

| Variable | Bedeutung |
|---|---|
| `VITE_PLAUSIBLE_DOMAIN` | der Site-Name, wie er **in Plausible** angelegt ist |
| `VITE_PLAUSIBLE_HOST` | Origin der Instanz, z. B. `https://plausible.complihub360.com` |

Fehlt eine, ersetzt Vite den `%VITE_…%`-Platzhalter nicht; der Wächter im
Snippet erkennt das und bricht ab. Ergebnis: kein Skript-Tag, keine Requests,
keine Events — in Entwicklung, Tests und unkonfigurierten Builds.

**Für Staging eine eigene `data-domain` nehmen.** Sonst mischen sich
Staging-Klicks unter die echten Zahlen. Gesetzt wird sie in `.env.staging`
(`PLAUSIBLE_DOMAIN`) bzw. als Repository-Variable für die CI.

**Die Beta hat ebenfalls eine eigene Site** (seit 18.10.2026): Repository-Variable
`BETA_PLAUSIBLE_DOMAIN` = `beta.complihub360.com`, in Plausible als Site angelegt.
`deploy-beta.yml` nimmt den Host aus `PLAUSIBLE_HOST`. Ist die Variable leer,
bleibt Plausible in der Beta aus.

## Seitenaufrufe ohne Kennungen (seit 22.11.2026)

`index.html` lädt `script.manual.js`, nicht `script.js`. Das Standard-Skript
liest die Adresszeile selbst und meldet sie mit Kennung, Query und Hash. Am
20.11. fiel auf, dass die Bestätigungsseite `/dashboard/booking/<Buchungs-ID>`
so die Buchungs-ID in jeden Seitenaufruf schrieb. Über unsere Datenbank lässt
sich eine Buchungs-ID einem Konto zuordnen.

Die manuelle Variante meldet von sich aus nichts. Die App schickt jeden
Seitenaufruf selbst (`trackPageview` in `src/lib/analytics.ts`, aufgerufen in
`App.tsx` bei jedem Routenwechsel) und baut die Adresse dafür neu:

| Was | Regel |
|---|---|
| Pfad mit Kennung | Das Kennungs-Segment entfällt: `/de/dashboard/booking/<id>` → `/de/dashboard/booking`, `/de/p/<ref>` → `/de/p`, `/de/p/<ref>/schedule` → `/de/p/schedule`, `/de/admin/providers/<key>` → `/de/admin/providers` |
| Unbekannte Route | Ein Segment, das wie eine UUID oder ein langer Hex-Wert aussieht, entfällt ebenfalls |
| Query | Nur `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Token aus Mail-Links, Sitzungs- und Thread-IDs bleiben im Browser |
| Hash | entfällt |
| Pfad ohne Sprache (`/`) | kein Seitenaufruf, er leitet nur weiter |

Dieselbe Adresse hängt an jedem eigenen Event (`track`), auch an `Scroll Depth`.

**Eine neue Route mit Kennung im Pfad gehört in `IDENTIFIER_ROUTES`.** Der Test
`analytics.test.ts` hält fest, was den Browser verlassen darf.

Zwei Folgen für die Auswertung:

- Weiterleitungen mit `replace` zählen jetzt mit (Login nach dem Guard,
  `/beta-agreement`). Das Standard-Skript sah sie nicht.
- Ziele in Plausible stehen auf den gekürzten Pfaden: `/*/dashboard/booking`,
  `/*/p`, `/*/p/schedule`.

**Sperre als Netz:** In Plausible unter *Site Settings → Shields → Pages* bleibt
`/*/dashboard/booking/*` gesperrt. Der gekürzte Pfad hat kein Segment hinter
`booking` und fällt nicht darunter. Die Sperre fängt nur noch ab, was ein alter
Stand im Browser-Cache oder ein späterer Fehler schicken würde.

Geprüft ist das über die Tests und am 22.11.2026 im Browser gegen den lokalen
Dev-Server (Aufrufe in `window.plausible.q` gelesen). Gegen die echte Instanz
ist es nicht geprüft; dass `script.manual.js` ausgeliefert wird und `u`
übernimmt, stammt aus dem Quelltext von Plausible (Tracker v3.0.1 und v3.2.0).

## Scrolltiefe

`src/lib/analytics.ts` meldet `Scroll Depth` bei 25 / 50 / 75 / 90 %, einmal je
Meilenstein und Seitenaufruf, mit dem Pfad als Property.

Der Anlass: am 20.08. ließ sich die Frage „kommen Nutzer überhaupt unten an?"
nicht beantworten. Die Startseite maß 44.300 px — 56 Bildschirme — und der
einzige bedienbare Assistent saß bei 83,9 % Tiefe, bis PR #57 ihn auf 10,7 %
holte. Diese Entscheidung war aus Geometrie begründet, nicht aus Verhalten,
weil es keine Verhaltensdaten gab.

Verifiziert ist der Mechanismus über `src/lib/analytics.test.ts`, **nicht** im
Browser: die headless-Umgebung verschiebt `window.scrollY`, ohne Scroll-Events
zu feuern, und führt `requestAnimationFrame` nicht aus. Eine Handprobe dort
meldet „keine Events", egal ob der Code funktioniert oder nicht.
