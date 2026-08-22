# Self-hosted Runner auf dem Staging-VPS

**Stand:** 2026-08-22 · **Host:** 76.13.159.221 (Hostinger) · **Repository:** `sertdemir/complihub360-alpha` (öffentlich)

Der Staging-Deploy läuft nicht mehr über SSH von einem GitHub-Runner zum VPS,
sondern über einen Runner **auf** dem VPS, der sich seine Jobs über ausgehendes
HTTPS abholt. Damit gibt es keine eingehende Verbindung mehr, die scheitern kann.

---

## 1. Warum

Vier von 31 Deploys sind rot geworden mit

```
ssh: connect to host 76.13.159.221 port 22: Connection timed out
```

— in Clustern, nicht vereinzelt (zwei davon am 21.08. innerhalb von fünf
Minuten). Der Server war dabei nachweislich gesund: 66 Tage Uptime, HTTPS
antwortete in 0,13 s, kein fail2ban, `ufw` inaktiv, `iptables INPUT` leer mit
Policy ACCEPT, Port 22 von außerhalb GitHubs erreichbar. Ein Re-Run desselben
Commits ging Minuten später in 18 Sekunden durch.

Das Retry-Fenster im Workflow wurde erst von ~105 s auf ~5 min verbreitert. Das
kuriert das Symptom. Der Runner auf dem VPS entfernt die Ursache: die Strecke,
die ausfiel, wird gar nicht mehr benutzt.

**Was der Umbau nicht löst:** ob die Timeouts von Hostingers DDoS-Filter oder
von `sshd` kamen, ist weiterhin unbeantwortet. Für den Deploy ist es
gegenstandslos — für einen manuellen SSH-Zugang nicht. Beim nächsten Vorfall
beantwortet `journalctl -u sshd --since -10min` die Frage: Einträge vorhanden
= `sshd`, gar nichts = die Pakete kamen nie an.

---

## 2. Vorher: die Sicherheitsschranke setzen (Pflicht)

> **Dieses Repository ist öffentlich und Forks sind erlaubt.** GitHub rät
> ausdrücklich davon ab, self-hosted Runner an öffentliche Repositories zu
> hängen: wer einen Fork-PR öffnet, liefert Code *und* Workflow-Datei mit — und
> beides liefe dann auf dem eigenen Server.

Der Umbau ist so zugeschnitten, dass diese Tür zu ist. Drei Riegel, alle drei
werden gebraucht:

**a) Fork-PRs brauchen Freigabe.** GitHub → Settings → Actions → General →
*Fork pull request workflows from outside collaborators* → **„Require approval
for all outside collaborators"**. Ohne diesen Schalter genügt ein einziger
späterer `pull_request`-Trigger, um die Konstruktion aufzuheben.

**b) Der Deploy-Workflow ist nicht durch Forks auslösbar.** `deploy-staging.yml`
läuft auf `push` auf `main` (plus `workflow_dispatch`). Ein Fork kann keinen
Push auf `main` erzeugen, und Fork-PRs bekommen keine Secrets.

**c) Die self-hosted Jobs führen keinen Repository-Code aus.** Sie laden ein
fertig gebautes Artefakt herunter und kopieren es an seinen Platz — kein
`actions/checkout`, kein `npm`, kein `postinstall`. Gebaut wird auf
`ubuntu-latest`, also auf GitHubs Wegwerf-Maschine.

Riegel b) und c) hält `scripts/check-workflow-runners.mjs`, das in `ci.yml`
mitläuft und den Build rot macht, sobald ein Workflow beides verbindet. Riegel
a) lässt sich aus dem Repository heraus nicht prüfen — der ist von Hand zu
setzen und beim nächsten Audit zu kontrollieren.

**Wenn dieser Zuschnitt zu eng wird** — etwa weil ein Deploy-Schritt doch
Repository-Code braucht — ist der Runner die falsche Lösung, nicht der Wächter.
Dann ist der Pull-Weg (VPS zieht sich per Cron ein Release-Artefakt über HTTPS)
die sichere Variante; er kommt ganz ohne Code-Ausführung durch GitHub aus.

---

## 3. Einrichten

Das Registrierungs-Token holen: GitHub → Settings → Actions → Runners →
*New self-hosted runner* → Linux / x64. Aus dem angezeigten `config.sh`-Aufruf
nur den `--token`-Wert nehmen (gültig ~60 Minuten).

Dann auf dem VPS als `root`:

```bash
git clone --depth 1 https://github.com/sertdemir/complihub360-alpha /tmp/ch360
RUNNER_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXX \
  bash /tmp/ch360/scripts/vps/install-github-runner.sh
```

Das Skript ist idempotent — ein zweiter Lauf ersetzt die Registrierung, statt
einen zweiten Runner zu hinterlassen. Es legt an:

| Was | Wo |
| :-- | :-- |
| Systembenutzer `github-runner` (kein Login-Shell, **nicht** in der `docker`-Gruppe) | `/opt/github-runner` |
| Schreibrecht auf genau zwei Verzeichnisse | `/docker/complihub/site`, `/docker/complihub-api/app` |
| Drei root-eigene sudo-Wrapper ohne Argumente | `/usr/local/sbin/complihub-api-{restart,health,logs}` |
| sudoers-Eintrag auf genau diese drei (mit `visudo -c` vorgeprüft) | `/etc/sudoers.d/github-runner` |
| systemd-Dienst mit `Restart=always`, `After=docker.service` | `actions.runner.*.service` |

Warum Wrapper statt `sudo docker …`: Mitgliedschaft in der `docker`-Gruppe ist
root-äquivalent (`docker run -v /:/host` genügt), und ein sudo-Recht auf das
`docker`-Binary ebenso. Feste Skripte ohne Argumente lassen dem Aufrufer keinen
Spielraum.

Zum Schluss läuft ein Selbsttest: Health-Wrapper erreichbar, beide
Verzeichnisse beschreibbar. Danach steht der Runner unter
`Settings → Actions → Runners` als `complihub-staging` auf *Idle*.

**Prüfen:** Actions → *Deploy Staging* → *Run workflow*. `build-api` und
`build-ui` laufen auf `ubuntu-latest`, `deploy-api` und `deploy-ui` müssen auf
dem VPS landen.

---

## 4. Wie der Deploy jetzt aussieht

```
build-api ─┐                        ubuntu-latest, parallel
build-ui  ─┤
           ├─→ deploy-api ─→ deploy-ui ─→ verify
              (VPS)          (VPS)        (ubuntu-latest)
```

Die Reihenfolge API-vor-UI bleibt: `deploy-ui` wartet auf `deploy-api`. Ein
halber Fehlschlag kann so nur die harmlose Kombination hinterlassen (neue API,
alte UI) — umgekehrt hat es am 09.08. still die Risikokarte degradiert.

`verify` prüft am Ende bewusst von **außen** (`ubuntu-latest`, HTTP 401 hinter
der Auth-Schranke). Ein Test vom Server selbst würde Traefik und DNS überspringen.

`concurrency: deploy-staging` erzwingt einen Deploy zur Zeit — zwei
gleichzeitige Läufe würden sich um dasselbe Site-Verzeichnis streiten.

---

## 5. Betrieb

```bash
SVC=$(systemctl list-unit-files --no-legend 'actions.runner.*' | awk '{print $1}' | head -1)
systemctl status "$SVC"       # läuft er?
journalctl -u "$SVC" -f       # was tut er gerade?
systemctl restart "$SVC"      # nach Netz-/Docker-Problemen
```

Nach einem Reboot kommt der Dienst von selbst hoch (`Restart=always`,
`enable`), und zwar erst nach Docker.

### Die eine neue Fehlerart

Ist der Runner offline, werden Jobs **nicht rot — sie stehen in der
Warteschlange**, bis zu 24 Stunden. Das ist meistens das gewünschte Verhalten
(VPS kurz weg, Deploy holt es nach), aber es fällt nicht auf. `deploy-api` und
`deploy-ui` haben deshalb `timeout-minutes: 10`; das greift allerdings erst,
wenn ein Job *läuft*, nicht während er wartet. Ein Deploy, der „seit einer
Stunde in Queued" steht, heißt: Runner tot.

**Notweg, solange der Runner steht:** `./scripts/deploy-staging.sh` vom Laptop
aus — der geht weiterhin über SSH und braucht `~/.ssh/complihub_vps`.

### Zurück auf den SSH-Weg

`git revert` des Commits, der diese Datei eingeführt hat. `VPS_SSH_KEY` liegt
weiterhin als Repository-Secret bereit; der Workflow benutzt es nur nicht mehr.

### Runner entfernen

```bash
cd /opt/github-runner
./svc.sh stop && ./svc.sh uninstall
sudo -u github-runner ./config.sh remove --token <frisches Token>
```

---

## 6. Was bewusst nicht getan wurde

**Kein `--ephemeral`.** Ein Wegwerf-Runner pro Job ist strenger, braucht aber
für jede Neuregistrierung ein Token und damit einen PAT auf dem Server. Da die
Deploy-Jobs ohnehin keinen Repository-Code ausführen, kauft die Ephemeralität
hier wenig — und ein PAT auf dem VPS kostet mehr, als sie einbringt.

**Keine Container-Isolation der Jobs.** Der Job *ist* der Deploy; er soll ja
gerade an die Verzeichnisse des Hosts.

**Kein zweiter Runner.** Einer genügt für Staging, und `concurrency` serialisiert
ohnehin. Ein zweiter würde nur die Frage aufwerfen, welcher gerade schreibt.
