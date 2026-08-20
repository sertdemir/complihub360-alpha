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
