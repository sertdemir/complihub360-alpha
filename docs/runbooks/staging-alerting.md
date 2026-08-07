# Runbook: Staging Error-Alerting

Eingerichtet 2026-08-07 (13-Layer-Audit, P1 #5). Selbstgehosteter Watchdog auf
dem VPS — kein externer Dienst; Mails via Resend (Key/Absender aus der
API-.env wiederverwendet).

## Was alarmiert wird

`/docker/complihub-alerts/alert-watchdog.sh`, Cron alle 5 Minuten:

**Availability (Mail bei Zustandswechsel, inkl. Recovery — kein Spam
während laufender Incidents):**

| Check | Bedingung „OK" |
|---|---|
| `ui` | https://staging.complihub360.com antwortet 401 (Auth-Wall) |
| `api` | `/health` im API-Container liefert `"ok":true` |
| `supabase` | REST antwortet 200 (Pause-/Ausfall-Erkennung) |
| `containers` | api-, web- und traefik-Container laufen |

**API-Error-Digest:** neue `"level":"error"`-Zeilen im API-Container-Log
seit dem letzten Scan → max. **1 Digest-Mail pro Stunde** (erste 10 Zeilen
+ Gesamtzahl).

Empfänger: `ALERT_TO` in `/docker/complihub-alerts/.env`
(aktuell complihub360.dev@gmail.com). Log: `watchdog.log` daneben —
eine `tick`-Zeile pro Lauf, `TRANSITION`-/`ERROR-DIGEST`-Zeilen bei Alarmen.

## Verifizierter Stand (2026-08-07)

- Testmail (`--test`): zugestellt ✓ (Resend-ID geloggt)
- Transition-Mechanik: FAIL→OK-Übergang erzeugt Recovery-Mail ✓
- Normal-Tick: `ui=OK api=OK supabase=OK containers=OK` ✓

## Bedienung

```bash
# Zustellweg testen
ssh -i ~/.ssh/complihub_vps root@76.13.159.221 /docker/complihub-alerts/alert-watchdog.sh --test

# Letzte Ticks/Alarme ansehen
ssh -i ~/.ssh/complihub_vps root@76.13.159.221 tail -20 /docker/complihub-alerts/watchdog.log

# Empfänger ändern
# → ALERT_TO in /docker/complihub-alerts/.env editieren
```

Quellcode im Repo: `scripts/vps/alert-watchdog.sh` (Source of Truth; nach
Änderung per scp deployen). Bekannte Eigenheit: Resend blockt den
python-urllib-User-Agent (403) — der Versand läuft deshalb über curl.

## Grenzen / später

- Der Watchdog läuft AUF dem VPS: fällt der ganze Server aus, mailt niemand.
  Externe Zweitmeinung: Uptime-Kuma läuft bereits — in der Kuma-UI eine
  Notification (Mail/Telegram) auf den bestehenden Monitor legen, oder ein
  kostenloser externer Ping-Dienst auf staging.complihub360.com (erwartet 401).
- Ab Beta: Sentry (o.ä.) für Stacktraces/Frontend-Fehler statt Log-Grep.
