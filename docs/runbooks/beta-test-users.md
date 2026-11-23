# Runbook: Test-Nutzerkonten in der Beta

Stand 15.11.2026. Für Testläufe, in denen niemand eine Bestätigungsmail
anklicken kann. Der erste Fall ist **Halime**, der Test-Agent der
Mitgründerin (ChatGPT, Agent-Modus). Briefing:
[`docs/testing/halime-briefing.md`](../testing/halime-briefing.md).

Die Test-Provider beschreibt [beta-test-providers.md](beta-test-providers.md).

## Was das Skript anlegt

`scripts/vps/seed-test-users.sh` legt normale Nutzerkonten an:

- Adresse `<lokal>+<label>-uNN@<domain>`, also z. B.
  `demet+halime-u01@complihub360.com`. Alle Mails landen im Postfach der
  Mitgründerin.
- Mail **bereits bestätigt**, keine Rolle. Die Beta-Vereinbarung kommt beim
  ersten Login wie bei jedem neuen Konto.
- **Anmeldung mit Passwort über den Reiter „Anbieter“.** Nutzer melden sich
  in der Oberfläche per Magic Link an (Reiter „Unternehmen“). Der Reiter
  „Anbieter“ ruft `signInWithPassword` auf und leitet auf
  `/provider-dashboard`; der `AuthGuard` erkennt dort die Rolle `user` und
  leitet in den Nutzerbereich weiter. Testkonten mit Passwort kommen so ohne
  Postfach und ohne Browserwechsel hinein, auch nach dem Abmelden. Kein Code,
  keine Konfiguration: Der Weg bestand schon und steht jedem Konto mit
  Passwort offen, auch Nutzern, die sich mit Passwort registriert haben. Der
  Anmeldelink im Reiter „Unternehmen“ bleibt unverändert.
- Der Magic-Link-Weg für einen Agenten-Browser (Link kopieren, im
  Übernahme-Modus einfügen) scheiterte am 19.11.: Der ChatGPT-Browser nahm
  den eingefügten Link nicht an.
- Die vorab angelegten Konten bleiben trotzdem sinnvoll: Sie tragen die
  Markierung, über die `--remove` sie wiederfindet.
- Ein gemeinsames Passwort je Label, verdeckt abgefragt.
- Markierung `app_metadata.test_label = <label>`. Darüber findet `--remove`
  die Konten wieder, nie über die Adresse allein.

Schutz: Die Schlüssel kommen aus der Beta-Env auf dem VPS, Staging
(`kqylqwogxbiwpnomkzsn`) wird abgewiesen, das Passwort steht nie in der
Prozessliste. Ein zweiter `--apply` legt nichts doppelt an.

## Ausführen

```bash
# Mac, im Repo
git pull
scp scripts/vps/seed-test-users.sh vps:/root/ch360/vps/
ssh vps

# VPS
cd /root/ch360/vps
bash seed-test-users.sh halime 3            # Probelauf: zeigt die drei Adressen
bash seed-test-users.sh halime 3 --apply    # anlegen, fragt das Passwort verdeckt ab
```

Das Passwort kommt in den Passwort-Manager (`Beta Halime · Nutzer`) und wird
mit der Mitgründerin geteilt. Es gehört nicht in den Chat und nicht ins Repo.

Dazu braucht Halime einen eigenen Zugang durch die Wand:

```bash
STAGING_SSH_HOST=vps ./scripts/beta-auth.sh add halime   # Mac, Passwort wird einmal ausgegeben
```

## Zugangslink statt Anmeldefenster

Der Browser von ChatGPT kann das Basic-Auth-Fenster der Wand nicht bedienen
(Demet, 15.11.). Dafür gibt es einen persönlichen Zugangslink:

```bash
STAGING_SSH_HOST=vps ./scripts/beta-pass.sh add halime      # Mac; Link wird einmal ausgegeben
STAGING_SSH_HOST=vps ./scripts/beta-pass.sh list
STAGING_SSH_HOST=vps ./scripts/beta-pass.sh remove halime   # entzieht ihn sofort
```

- Der Link `https://beta.complihub360.com/__zugang/<token>` setzt ein Cookie
  (HttpOnly, Secure, 30 Tage) und leitet auf `/de` weiter.
- Ein eigener Traefik-Router nimmt Anfragen mit diesem Cookie ohne Basic Auth
  an. `/api` bleibt beim API-Router, `noindex` gilt weiter.
- Ein erneutes `add` erzeugt ein neues Token, das alte gilt dann nicht mehr.
- Das Skript prüft auf der VPS: ohne Cookie 401, mit Cookie 200, mit falschem
  Cookie 401, Link setzt Cookie und leitet weiter, `/api` liefert JSON. Bei
  einem Fehler stellt es die vorige Compose-Datei wieder her.
- Der Link ist ein Passwort: Passwort-Manager (`Beta Zugangslink · halime`),
  nicht in den Chat. Das Token steht im Klartext nur in den Container-Labels
  auf der VPS.

## Zuschnitt für Halime

| Was | Wert |
|---|---|
| Wand | Zugangslink `halime` (`beta-pass.sh`), für Menschen zusätzlich der Basic-Auth-Zugang `halime` |
| Nutzer | `demet+halime-u01..u03@complihub360.com`, Anmeldung mit Passwort über den Reiter „Anbieter“ (`Beta Halime · Nutzer`) |
| Provider | `demet+p21..p25@complihub360.com`, gemeinsames Passwort `Beta Test-Provider · gemeinsam`. `p01` bis `p20` bleiben bei der Mitgründerin. |
| Admin | keiner |

**Provider-Seite und DNA.** Laut Entscheidung vom 15.10. antwortet auf der
Provider-Seite ein Mensch; die AI gibt sich nie als Fachperson aus
(`KN-BRAND-001`). Halime bedient `p21` bis `p25` deshalb nur, solange auf der
Beta ausschließlich interne Konten unterwegs sind, und schreibt als Provider
nur an die eigenen Halime-Nutzer. **Bevor externe Tester eingeladen werden:**
`beta-pass.sh remove halime` und `beta-auth.sh remove halime` (ohne beides
erreicht Halime die Beta nicht mehr) und Provider `p21` bis `p25` zurück an die Mitgründerin.

## Entfernen

```bash
bash seed-test-users.sh halime --remove
```

Entfernt alle Konten mit `test_label = halime`. Hängen Buchungen an einem
Konto, scheitert das Löschen für dieses Konto und wird gemeldet. Diese
Buchungen zuerst klären.
