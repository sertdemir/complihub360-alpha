# Stack-Audit: 13-Layer-Abgleich (2026-08-07)

Abgleich des CompliHub360-Stacks gegen die 13-Layer-Full-Stack-Checkliste
(gemerkt 2026-08-04). Methode: Code-/Config-Inspektion (Repo, CI-Workflows,
VPS per SSH, Supabase) — read-only, keine Änderungen. Bewertungsskala:

- ✅ **da** — Layer produktionsreif für die aktuelle Phase (Alpha/Staging)
- 🟡 **teilweise** — vorhanden, mit benannten Lücken
- 🔴 **fehlt** — nicht vorhanden und vor Beta nötig
- ⚪ **bewusst offen** — nicht vorhanden und für Alpha korrekt so

## Ergebnis-Überblick

| # | Layer | Stand | Kern-Gap |
|---|-------|-------|----------|
| 1 | Frontend foundations | ✅ | — |
| 2 | APIs & backend logic | 🟡 | keine API-Test-Suite |
| 3 | Database & storage | 🟡 | nur Staging-Projekt, Free-Tier-Pause |
| 4 | Auth & permissions | 🟡 | API-Key im Staging-FE-Bundle |
| 5 | Hosting & deployment | 🟡 | API-Deploy manuell |
| 6 | Cloud & compute | ✅ | — (Alpha-Maßstab) |
| 7 | CI/CD & version control | 🟡 | Feature-Branch ≠ main → Pipelines inaktiv |
| 8 | Security & RLS | ✅ | P0s aus Konzil-Audit remediert |
| 9 | Rate limiting | ✅ | in-memory (Alpha ok) |
| 10 | Caching & CDN | ⚪ | nginx-Immutable-Caching da, CDN bewusst offen |
| 11 | Load balancing & scaling | ⚪ | Single-VPS, für Alpha korrekt |
| 12 | Error tracking & logs | 🟡 | kein Alerting, keine Log-Aggregation |
| 13 | Availability & recovery | 🔴 | Supabase-Auto-Pause, keine Backup-Strategie |

**Bottom line:** 8 von 13 Layern sind für die Alpha-Phase solide. Das einzige
echte 🔴 ist Layer 13 (Availability & Recovery) — die Staging-DB hat sich
bereits einmal selbst pausiert, und es gibt keine getestete Backup/Restore-
Routine. Die restlichen Gaps sind P1-Härtungen vor Beta.

---

## Detail pro Layer

### 1 · Frontend foundations — ✅
Vite + React + TypeScript + Tailwind; i18n in 4 Sprachen (8 Namespaces,
Key-Parität); Light/Dark-Theme-Engine; Compass-DS-Spiegel mit 74 Storybook-
Stories (+ Storybook-Vitest via Playwright/Chromium konfiguriert); 4
Unit-Test-Dateien. Fixture-first-Pattern (`useApiData`) hält die App auch
ohne Backend demo-fähig.

### 2 · APIs & backend logic — 🟡
`services/compliance-api`: Node-http-Server (bewusst framework-frei) mit
~30 Endpoints (Search, Scheduling, Reviews, Intake, Admin, Billing,
Assistant), SLA-/Review-Watchers, Mailer (Resend + Outbox-Fallback),
strukturiertem Logging mit Correlation-IDs. Deterministische Engine als
eigenes Package (`@complihub/compliance-engine`, 8 Vitest-Tests grün).
**Gap:** die API selbst hat keine Test-Suite (0 Testdateien) — Verhalten
wird bisher per manueller E2E-Verifikation gesichert.

### 3 · Database & storage — 🟡
Supabase Postgres, ~20 Migrationen (zuletzt `matchmaking_v2`), RLS-Deny-All
auf neuen Tabellen, Storage-Bucket für E-Mail-Assets, `event_log` als
Ereignis-Rückgrat (Marker-Idempotenz der Watchers).
**Gaps:** (a) es existiert nur das **Staging**-Projekt `kqylqwogxbiwpnomkzsn`
auf dem Free Tier — **pausiert sich bei Inaktivität selbst** (bereits 1×
passiert); (b) kein dediziertes Produktions-Projekt.

### 4 · Auth & permissions — 🟡
Deutlich besser als der Konzil-Stand vom 25.06.: JWT-Verifikation ist
gehärtet (HS256-Pinning gegen alg-Confusion, timing-safe Signaturvergleich,
exp/nbf-Prüfung, Ablehnung des öffentlichen anon-Keys), Admin-Rolle über
`app_metadata` (gleiche Präzedenz wie FE), Server-zu-Server per `x-api-key`,
Magic-Links mit `magic_link_tokens`-Tabelle (token_hash, Single-Use via
`used_at`) — die P0-Lücke „Magic-Link ungesichert" ist remediert
(Merge `7e2a2c1f`).
**Gap (P1):** `VITE_DEV_API_KEY` / `STAGING_API_KEY` wird ins Staging-
Frontend-Bundle gebacken (deploy-staging.yml nennt das explizit). Ein
Shared Secret im Client ist für jeden Staging-Besucher extrahierbar und
authentifiziert als vollwertiger Caller. Hinter der Basic-Auth-Wall ist das
für Alpha tragbar, vor Beta muss der FE-Pfad auf echte User-JWTs +
definierte Public-Endpoints umgestellt werden.

### 5 · Hosting & deployment — 🟡
Hostinger KVM2 VPS hinter (bestehendem) Traefik; SPA via nginx-Container,
API als eigener Container (`restart: unless-stopped`); Staging hinter
Basic Auth; `scripts/deploy-staging.sh` + GitHub-Action für den UI-Deploy.
**Gap:** der **API**-Deploy ist manuell (esbuild-Bundle → scp → compose
restart) und nicht in CI abgebildet — fehleranfällig und personengebunden.

### 6 · Cloud & compute — ✅ (Alpha-Maßstab)
VPS: 8 GB RAM (1,1 GB genutzt), 96 GB Disk (10 % belegt), 5 Container
stabil (api, web, traefik, uptime-kuma, hermes). Supabase als Managed-DB.
Für Alpha angemessen dimensioniert; Skalierungsfragen siehe Layer 11.

### 7 · CI/CD & version control — 🟡
GitHub mit zwei Workflows: `ci.yml` (Quality Gates: Build + Workspace-
Typechecks auf PR/Push nach main) und `deploy-staging.yml` (UI-Auto-Deploy).
**Gaps:** (a) die gesamte v2-Arbeit (~60+ Commits) liegt auf
`feature/COM-5-frontend-design-iteration-2` — die Pipelines triggern nur auf
**main**, laufen also faktisch nicht; der PR nach main ist der eigentliche
Hebel; (b) CI führt Typechecks, aber keine Tests aus (Engine-Vitest wäre
gratis dazuzunehmen); (c) API-Deploy fehlt im CD (siehe Layer 5).

### 8 · Security & RLS — ✅
RLS-Statements in 10 Migrationen; strikte Security-Header (nosniff,
X-Frame-Options DENY, HSTS); CORS im Prod-Modus auf Allowlist; Fehler-
antworten opak in production; Redaction-Pipeline (`redactText`) aktiv im
Mail-Pfad (anonymisiertes Dossier); Secrets via .env (gitignored) bzw.
Repo-Secrets. Die 5 P0-Blocker aus dem Backend-Konzil-Audit sind laut
Merge-Historie remediert; Einzel-Nachprüfung der übrigen vier (Schema-Drift,
FE-BE-Call, Backend-Surfaces, Privacy-Pipeline) war nicht Teil dieses
Audits — Stichprobe (Redaction, Magic-Links) positiv.

### 9 · Rate limiting — ✅
Vorhanden (entgegen der Vorab-Hypothese): globaler IP-Limiter
(100 req/min, `x-forwarded-for`-aware hinter Traefik) mit 429-Antworten,
plus separates Limit im Assistant-Pfad.
**Einschränkung (bewusst ok für Alpha):** in-memory — Reset bei Restart,
nicht instanzübergreifend. Erst relevant, wenn Layer 11 real wird.

### 10 · Caching & CDN — ⚪
nginx cached content-hashed Bundles hart (`expires 30d` + `immutable`) —
das Wesentliche für eine SPA. Kein CDN, kein API-/DB-Caching.
**Einstufung:** für Alpha mit einstelligen Nutzerzahlen bewusst offen;
kein Task.

### 11 · Load balancing & scaling — ⚪
Single-VPS, eine API-Instanz, kein Replica-Setup. **Einstufung: bewusst
offen** — bei aktuellem Traffic wäre jedes Scaling-Investment verfrüht.
Vormerken: sobald Skalierung ansteht, zieht sie Layer 9 (verteiltes Rate-
Limiting) und 12 (zentrale Logs) mit.

### 12 · Error tracking & logs — 🟡
Strukturiertes JSON-Logging mit Correlation-IDs und Severities → docker
logs; `event_log`-Tabelle + Admin-Events-Feed als fachliches Audit-Log;
Uptime-Kuma läuft (healthy) für Verfügbarkeits-Monitoring.
**Gaps:** (a) kein Error-**Alerting** — Fehler landen in docker logs, die
niemand aktiv liest (Kuma-Notifications konfigurieren wäre der billigste
erste Schritt, Sentry o.ä. der zweite); (b) keine Log-Aggregation/Retention
(docker logs rotieren weg).

### 13 · Availability & recovery — 🔴
Positiv: `/health` + `/ready`-Endpoints, `restart: unless-stopped`,
Uptime-Kuma. Aber:
- **Supabase Free Tier pausiert die Staging-DB automatisch** — bereits 1×
  eingetreten; jede Pause ist ein Komplettausfall von Search, Scheduling,
  Watchers.
- **Keine Backup/Restore-Strategie:** kein dokumentierter/getesteter
  DB-Dump, kein VPS-Snapshot-Plan, kein Runbook für den Wiederanlauf.
- Kein Prod-Projekt → Staging IST derzeit der einzige Datenbestand.

---

## Priorisierte Gap-Liste

**P0 — vor Beta, unabhängig vom Pricing:**
1. **Supabase-Pause eliminieren** (Layer 13): Upgrade auf Paid Tier für das
   spätere Prod-Projekt; für Staging mindestens ein Keep-Alive-Ping
   (Uptime-Kuma kann das mit-erledigen) + wöchentlicher `pg_dump`-Export
   auf den VPS.
2. **Backup/Restore-Runbook** (Layer 13): DB-Dump-Cron + einmal real
   getesteter Restore; VPS-Snapshot-Zyklus bei Hostinger aktivieren.
3. **PR nach main** (Layer 7): erst damit werden CI-Quality-Gates und
   Auto-Deploy überhaupt wirksam.

**P1 — vor Beta:**
4. **FE-API-Key ablösen** (Layer 4): Staging-Bundle ohne Shared Secret;
   Public-Endpoints explizit definieren (z.B. /search für Gäste), Rest nur
   per User-JWT.
5. **Error-Alerting** (Layer 12): Kuma-Notifications (Mail/Telegram) +
   Sentry (oder Ähnliches) für API und UI.
6. **API-Deploy in CI** (Layer 5/7): esbuild-Bundle + scp/compose-restart
   als Workflow-Job neben dem UI-Deploy.
7. **API-Test-Grundstock** (Layer 2): die manuell verifizierten Flows
   (Search-Scoring, Scheduling-Guards, Review-Watchdog-Ticks) als
   Vitest-Suite gegen eine Test-DB; Engine-Tests in ci.yml aufnehmen.

**P2 — nach Beta:**
8. Log-Aggregation + Retention (Layer 12).
9. Nachprüfung der übrigen Konzil-P0s im Detail (Layer 8).

**Bewusst offen (kein Task):** CDN (10), Load Balancing/Scaling (11),
verteiltes Rate-Limiting (9), Multi-Region.
