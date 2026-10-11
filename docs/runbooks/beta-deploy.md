# Runbook: Beta-Umgebung (Beta-Plan Di 20.10.)

Stand 11.10.2026. Entscheidungen vom 11.10.:
- Adresse `beta.complihub360.com`
- geschlossen über eine **Basic-Auth-Wand je Tester**
- Ausliefern **von Hand je Release-Kandidat**

Datenbank und Auth: [beta-supabase.md](beta-supabase.md).

## Aufbau

| Teil | Staging | Beta |
|---|---|---|
| Adresse | `staging.complihub360.com` | `beta.complihub360.com` |
| Site | `/docker/complihub` | `/docker/complihub-beta` (nginx, eigene Wand `complihub-beta-auth`) |
| API | `/docker/complihub-api` | `/docker/complihub-beta-api` (eigene `.env`, Container `complihub-beta-api-api-1`) |
| Supabase | `kqylqwogxbiwpnomkzsn` | eigenes Projekt (`complihub360-beta`) |
| Demo-Login | an | **aus**, damit ist auch TEMP-DEMO-DATEN aus |
| Deploy | automatisch bei jedem `main`-Push | **von Hand**: Actions → „Deploy Beta“ → Ref |
| Zugang | `scripts/staging-auth.sh` | `scripts/beta-auth.sh` (getrennte Liste) |

Beide laufen auf demselben VPS, hinter demselben Traefik und mit demselben
self-hosted Runner. Die Regeln für den Runner gelten unverändert: Er lädt nur
Artefakte und führt keinen Repo-Code aus (`scripts/check-workflow-runners.mjs`).

## Einrichten (einmalig)

| # | Wer | Schritt |
|---|---|---|
| 1 | Nutzer | DNS: A-Record `beta` → `76.13.159.221`, **vor** Schritt 3. Sonst holt Traefik kein Zertifikat (siehe Preview-Runbook, Abschnitt Zertifikat). |
| 2 | Nutzer | Beta-Supabase nach `beta-supabase.md` steht (Migrationen, Konfig-Kopie, Auth). |
| 3 | Nutzer, VPS | `bash scripts/vps/setup-beta.sh` als Probelauf. Den diff der abgeleiteten API-Compose-Datei lesen. Dann mit `--apply`. Den einmal ausgegebenen Haupt-Zugang in den Passwort-Manager legen. |
| 4 | Nutzer, VPS | `/docker/complihub-beta-api/.env` aus `scripts/vps/beta.env.example` anlegen (chmod 600). Jede Zeile setzen, `API_KEY` neu erzeugen. |
| 5 | Nutzer, GitHub | **Variables:** `BETA_SUPABASE_URL`, `BETA_SUPABASE_ANON_KEY`. **Secrets:** `BETA_VERIFY_AUTH` (`complihub:<passwort>`), `BETA_API_URL` (`https://beta.complihub360.com`), `BETA_API_KEY` (= `API_KEY` aus Schritt 4). |
| 6 | Nutzer, Nylas | Callback `https://beta.complihub360.com/api/v1/nylas/callback` eintragen. |
| 7 | Claude oder Nutzer | Actions → „Deploy Beta“ → Ref = Release-Kandidat. Der erste Lauf legt den API-Container an. |
| 8 | Nutzer, VPS | `alert-watchdog.sh` neu kopieren (prüft die Beta mit, sobald `/docker/complihub-beta` existiert). |
| 9 | Nutzer | Uptime-Kuma: Monitore anlegen (Abschnitt unten). |

## Ausliefern

Actions → **Deploy Beta** → *Run workflow* → `ref` = Tag oder Commit des
Release-Kandidaten. Ablauf:
1. bauen
2. API installieren und auf Gesundheit prüfen
3. Site installieren
4. von außen prüfen:
   - `401` (geschlossen)
   - `noindex`
   - mit `BETA_VERIFY_AUTH` zusätzlich die SHA in `build-info.json`

**Ein `200` von außen lässt den Lauf rot werden.** Die Beta darf nie offen
stehen.

Der Build bricht ab, wenn `BETA_SUPABASE_URL` fehlt oder auf Staging zeigt.

## Tester

```bash
./scripts/beta-auth.sh list
./scripts/beta-auth.sh add tester-anna     # Passwort einmalig, über den Passwort-Manager weitergeben
./scripts/beta-auth.sh remove tester-anna
```

Ein Zugang je Person, so lässt sich einer einzeln entziehen. Hinter der Wand
registriert sich jeder Tester normal. Die Auth-Mails führen zurück auf die Beta,
und der Browser hat die Wand dann schon passiert.

Die API (`/api/*`) liegt nicht hinter der Wand, wie auf Staging auch. So
erreichen Stripe-Webhooks und der Nylas-Callback sie. Geschützt ist sie über
JWT oder Server-Key.

## Uptime-Kuma

Kuma läuft schon auf dem VPS. Zwei Monitore anlegen:

| Monitor | Typ | Ziel | Erwartet |
|---|---|---|---|
| Beta · Site | HTTP(s) | `https://beta.complihub360.com/` | Status **401** (unter „Accepted Status Codes“ nur 401) |
| Beta · API | HTTP(s) | `https://beta.complihub360.com/api/v1/acknowledgement` (öffentliche GET-Route, liest aus der Beta-Datenbank) | 200 |

Dazu läuft `alert-watchdog.sh` alle 5 Minuten. Er prüft `beta_ui` (401) und
`beta_api` (Health im Container) und schickt eine Mail, wenn sich ein Zustand
ändert.

## Gesehen beim Einrichten

`alert-watchdog.sh` erwartet für **Staging** weiter `401`. Die Wand dort ist
aber seit dem 30.08. abgenommen (`deploy-staging.yml`, verify). Er dürfte
`ui` also dauerhaft als FAIL führen. Weil er nur bei Zustandswechseln mailt,
fällt das nicht auf. Das ist nicht Teil dieses Schritts.
