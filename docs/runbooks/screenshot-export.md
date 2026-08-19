# Runbook: Screenshot-Export für externe Reviews

Eingerichtet 2026-08-19. Zweck: die komplette Web-App einem **externen
Reviewer** (z. B. ChatGPT, Stakeholder ohne Staging-Zugang) zugänglich machen,
**ohne** die Basic-Auth-Wall von Staging zu öffnen und ohne die SPA-Hürde
(einfache Crawler sehen nur die leere `index.html`-Hülle).

Der Export läuft komplett lokal: Build → Headless-Chromium (Playwright) fährt
alle Routen ab → Full-Page-PNGs. Geschützte Bereiche werden über die
Demo-Logins betreten (localStorage-Seed, siehe `useAuthStore.ts`) — es sind
also ausschließlich **Fixture-Daten** im Bild, keine Echtdaten.

## Bedienung

```bash
# 1 · Workspace-Pakete + UI bauen (gleiche Env wie deploy-preview.sh)
npm install
for p in packages/types packages/compliance-engine packages/agent-core \
         packages/agent-registry packages/policy-engine packages/task-orchestrator \
         services/redaction; do npm run build --workspace "$p" --if-present; done
VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… VITE_DEMO_LOGIN=1 \
  npm run build --workspace apps/vs1-demo/ui

# 2 · Screenshots erzeugen (Standard: de, Desktop 1440px, Light Mode)
node scripts/export-screenshots.mjs --locale de

# Varianten
node scripts/export-screenshots.mjs --locale en           # andere Sprache
node scripts/export-screenshots.mjs --locale de --dark    # Dark Mode
node scripts/export-screenshots.mjs --locale de --mobile  # 390px-Viewport

# 3 · Für den Upload packen
zip -r complihub360-screenshots-de.zip screenshots-de
```

Ergebnis: `screenshots-<locale>/` mit ~38 nummerierten PNGs
(`NN-<rolle>-<route>.png`) — 20 öffentliche Routen, 8 User-Dashboard-,
7 Partner-Dashboard- und 3 Admin-Screens. Das Verzeichnis ist gitignored.

## Warum nicht einfach die Staging-URL teilen?

1. **Basic Auth**: ChatGPTs Browsing kann den Auth-Dialog nicht ausfüllen
   (nur der Agent-Modus kann das — dann Credentials danach rotieren).
2. **SPA**: Ohne JS-Ausführung liefert Staging nur `<div id="root">` —
   inhaltlich wertlos für eine Analyse.
3. **Exposure**: Screenshots geben nichts frei — kein offener Host, keine
   Credentials bei Dritten, Demo-Logins bleiben hinter der Wall.

## Grenzen

- Statische Momentaufnahmen: Flows (Wizard-Schritte, Modals, Drawer) sind nur
  als Einstiegsseite erfasst. Für interaktive Reviews bleibt der ChatGPT-
  Agent-Modus mit Staging-Credentials die Alternative.
- Der Chromium-Fallback (`/opt/pw-browsers/chromium`) greift nur in der
  Remote-Sandbox; lokal genügt `npx playwright install chromium`.
