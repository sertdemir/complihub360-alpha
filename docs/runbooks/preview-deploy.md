# Runbook: Preview-Deploy (parallele Version neben Staging)

Eingerichtet 2026-08-09. Zweck: eine **neue Frontend-Version parallel** zur
laufenden Staging-Version testen — ohne die alte anzufassen. Umschalten =
einfach die andere URL aufrufen; „Rollback" ist damit kostenlos.

| Kanal | URL | Inhalt | Deploy |
|---|---|---|---|
| **Staging** (stabil) | `https://staging.complihub360.com` | Stand von **main** | automatisch bei jedem main-Push (GitHub Action) |
| **Preview** (neu) | `https://next.staging.complihub360.com` | Stand des **aktuellen Branches** | manuell: `./scripts/deploy-preview.sh` |

Beide liegen hinter derselben Basic-Auth-Wall (Credentials: `.env.staging` →
`STAGING_BASIC_AUTH`) und tragen `X-Robots-Tag: noindex`.

## Voraussetzung (einmalig, User-Aktion)

**DNS-A-Record anlegen** — solange er fehlt, ist die Preview nur intern
erreichbar (der Container läuft, aber Let's Encrypt kann kein Zertifikat
ausstellen und der Browser findet den Host nicht):

```
Typ: A   ·   Name: next.staging   ·   Wert: 76.13.159.221   ·   TTL: Standard
```

(Beim DNS-Anbieter der Domain complihub360.com, dort wo auch `staging`
eingetragen ist.) Nach dem Anlegen holt Traefik das Zertifikat automatisch
innerhalb weniger Minuten — kein weiterer Eingriff nötig.

## Bedienung

```bash
# Aktuellen Branch als Preview veröffentlichen
./scripts/deploy-preview.sh

# Welche Version liegt wo?
curl -u "$STAGING_BASIC_AUTH" https://next.staging.complihub360.com/build-info.json
curl -u "$STAGING_BASIC_AUTH" https://staging.complihub360.com/build-info.json
```

`build-info.json` der Preview enthält `sha`, `branch`, `builtAt` und
`channel: "preview"` — so ist jederzeit eindeutig, welcher Stand läuft.

## Wie „zurückschalten"?

Gar nicht nötig: Die alte Version läuft durchgehend unter
`staging.complihub360.com` weiter. Wer die alte sehen will, nutzt die alte URL.

**Wenn die neue Version main werden soll:** Branch mergen — der bestehende
Auto-Deploy bringt sie nach Staging. Die Preview kann danach entweder den
nächsten Branch zeigen oder abgeschaltet werden:

```bash
ssh -i ~/.ssh/complihub_vps root@76.13.159.221 \
  "cd /docker/complihub-next && docker compose down"
```

## Technik (VPS)

- Verzeichnis `/docker/complihub-next/` (eigene compose-Datei + `site/`),
  erzeugt/aktualisiert vom Deploy-Script.
- Eigener nginx-Container `complihub-next-web-1`, eigener Traefik-Router
  `complihub-next`; nutzt die **nginx.conf und die Middlewares von Staging**
  mit (kein Duplikat, keine Drift).
- Traefik erkennt Container über den Docker-Socket — kein gemeinsames
  Docker-Netzwerk nötig (Traefik läuft im host-Netz).
- Der Preview-Build enthält **keinen** API-Key (wie Staging seit Audit P1 #4);
  Demo-Logins zeigen Fixture-Daten, echte Accounts Live-Daten.
