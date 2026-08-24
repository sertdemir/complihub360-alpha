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

## Zugänge (Basic Auth)

Die Wall ist **eine** Traefik-Middleware (`complihub-auth`), definiert als
Container-Label in `/docker/complihub/docker-compose.yml` (Zeile mit
`…basicauth.users=`). Sie gilt für Staging **und** Preview — ein Eintrag, beide
Kanäle. Auf der VPS liegen nur bcrypt-Hashes, nie Klartext.

Verwaltet wird das mit `./scripts/staging-auth.sh` (SSH auf die VPS, kein
manuelles Editieren des Labels):

```bash
./scripts/staging-auth.sh list              # wer hat Zugang?
./scripts/staging-auth.sh add partner-acme  # anlegen, Passwort wird einmalig ausgegeben
./scripts/staging-auth.sh remove partner-acme
```

`add` erzeugt das Passwort **auf der VPS** (`openssl rand -base64 18`), hasht es
mit `htpasswd -nbB`, trägt es ins Label ein, startet den Container neu und prüft
den Login per `curl` — erst danach wird das Passwort ausgegeben. Es erscheint
genau einmal; verloren = neu anlegen (`add` mit demselben Namen ersetzt den
Eintrag).

**Ein Account pro Partner**, nicht ein geteiltes Passwort für alle: nur so lässt
sich ein einzelner Zugang wieder entziehen, ohne allen anderen ein neues
Passwort zu geben. Weitergabe über den Passwort-Manager, nicht als Klartext in
einer Mail.

`complihub` ist der Haupt-Account — er steckt in `.env.staging` und in den
Deploy-/Smoke-Scripts. `remove complihub` wird deshalb abgelehnt (nur mit
`--force`).

### Wenn das Passwort verloren ist

Genau das ist am 23.08.2026 passiert: die Wall stand, die Credentials waren
weder im Passwort-Manager noch sonst auffindbar, und `.env.staging` ist (zu
Recht) gitignored — es gibt also keine Kopie im Repo. Der Hash auf der VPS ist
nicht umkehrbar, das Passwort ist damit weg. Lösung ist nicht Suchen, sondern
**Neusetzen**:

```bash
./scripts/staging-auth.sh add complihub     # überschreibt den bestehenden Eintrag
```

Danach den neuen Wert in `.env.staging` (lokal, untracked) und im
Passwort-Manager nachziehen.

Zwei Fallen, die diese Runde gekostet haben:

- **`$` muss im compose-File verdoppelt werden** (`$$2y$$05$$…`). Sonst frisst
  Docker Composes Variablen-Interpolation Teile des bcrypt-Hashes, und der
  Login schlägt mit korrektem Passwort fehl. Im aufgelösten Label
  (`docker inspect`) steht wieder ein einfaches `$` — das ist der Beweis, dass
  es richtig ist.
- **`docker restart` reicht nicht.** Labels werden bei der Container-*Erzeugung*
  gelesen. Nach einer Label-Änderung ist `docker compose up -d` nötig, sonst
  läuft weiter der alte Hash.

Prüfen, was Traefik tatsächlich sieht:

```bash
docker inspect complihub-web-1 \
  --format '{{index .Config.Labels "traefik.http.middlewares.complihub-auth.basicauth.users"}}'
curl -s -o /dev/null -w '%{http_code}\n' -u "complihub:$PW" https://staging.complihub360.com/build-info.json
```

Erwartet: `200`.

## Voraussetzung (einmalig, User-Aktion)

**DNS-A-Record anlegen** — solange er fehlt, ist die Preview nur intern
erreichbar (der Container läuft, aber Let's Encrypt kann kein Zertifikat
ausstellen und der Browser findet den Host nicht):

```
Typ: A   ·   Name: next.staging   ·   Wert: 76.13.159.221   ·   TTL: Standard
```

(Beim DNS-Anbieter der Domain complihub360.com, dort wo auch `staging`
eingetragen ist.)

**Wenn der Preview-Container schon lief, bevor der DNS-Record existierte, holt
Traefik das Zertifikat _nicht_ von selbst nach.** Genau das ist am 10.08.2026
passiert: der letzte ACME-Versuch (09.08., 12:37 UTC) scheiterte mit `NXDOMAIN`,
und danach probierte Traefik es nicht erneut — weder beim Redeploy noch bei
`docker compose up -d --force-recreate` des Preview-Containers. In den
Traefik-Logs stand über Stunden gar nichts, und `acme.json` enthielt nur
`staging.complihub360.com`.

Behoben durch einen Neustart des Reverse Proxy:

```bash
ssh root@76.13.159.221 'docker restart traefik-traefik-1'
```

Das Zertifikat war danach in **15 Sekunden** ausgestellt. Der Neustart
unterbricht kurz **alle** Sites auf der VPS (Staging, API, Kuma, Hermes) —
Traefik war hier ~9 Wochen ohne Neustart gelaufen und kam sauber zurück, alle
übrigen Container blieben unberührt. Prüfen mit:

```bash
echo | openssl s_client -connect 76.13.159.221:443 -servername next.staging.complihub360.com 2>/dev/null | openssl x509 -noout -subject -issuer
```

Erwartet: `subject= /CN=next.staging.complihub360.com`, Issuer Let's Encrypt.

Alternativ ohne Eingriff: Traefiks nächtlicher Renew-Lauf (~22:31 UTC) nimmt den
Host ebenfalls mit. Der Neustart ist nur der schnelle Weg.

**Reihenfolge für neue Hosts:** erst den DNS-Record anlegen, propagieren lassen
(`dig +short <host>`), dann deployen. Dann greift die Automatik wie gedacht.

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
