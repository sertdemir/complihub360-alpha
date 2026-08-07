# Runbook: Staging-Backup & Restore (Supabase)

Eingerichtet 2026-08-07 (13-Layer-Audit, P0 #1+#2). Ziel: Die Staging-DB
(Supabase Free Tier, Projekt `kqylqwogxbiwpnomkzsn`) darf weder unbemerkt
pausieren noch der einzige Datenbestand sein.

## Architektur

- **Schema** ist in git versioniert: `supabase/migrations/*.sql`.
- **Daten** werden täglich als JSONL-Export (PostgREST, alle exponierten
  Tabellen) auf dem VPS archiviert.
- Restore = Migrationen anwenden (Schema) + JSONL-Upsert (Daten).

Alles liegt auf dem VPS (`root@76.13.159.221`, SSH-Key `~/.ssh/complihub_vps`)
unter `/docker/complihub-backup/`:

| Datei | Zweck |
|---|---|
| `supabase-keepalive.sh` | Alle 6 h ein REST-Read → Projekt bleibt aktiv, Erreichbarkeit geloggt |
| `supabase-backup.sh` | Täglich 03:30 UTC: alle Tabellen → `archive/staging-<stamp>.tar.gz`, Rotation: 14 Archive |
| `supabase-restore.sh` | Upsert eines Archivs (ganz oder eine Tabelle) zurück in die DB |
| `.env` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (chmod 600) |
| `keepalive.log` / `backup.log` | eine Zeile pro Lauf; non-200 im Keepalive-Log = DB war nicht erreichbar |

Quellcode der Skripte im Repo: `scripts/vps/supabase-{backup,keepalive,restore}.sh`
(Änderungen dort machen, dann per scp deployen — das Repo ist die Source of Truth).

Cron (root):
```
0 */6 * * * /docker/complihub-backup/supabase-keepalive.sh
30 3 * * *  /docker/complihub-backup/supabase-backup.sh
```

## Verifizierter Stand (2026-08-07)

- Keepalive: HTTP 200 ✓
- Backup: 21 Tabellen, 638 Zeilen, 2,0 MB ✓
- Restore-Test: `providers` aus dem Archiv zurück-upserted, Zeilenzahl
  unverändert (4/4) ✓ — non-destruktiv bestätigt

## Restore-Prozeduren

### Fall A — Projekt pausiert (kein Datenverlust)
1. Supabase Dashboard → Projekt → **Restore project** (oder MCP
   `restore_project`). Dauert einige Minuten.
2. Warten bis REST antwortet: `supabase-keepalive.sh` manuell laufen lassen
   → HTTP 200.
3. `docker compose restart api` in `/docker/complihub-api` (Watchers neu
   verbinden). Fertig — kein Restore nötig.

### Fall B — Datenverlust / einzelne Tabelle kaputt
```bash
ssh -i ~/.ssh/complihub_vps root@76.13.159.221
ls -lt /docker/complihub-backup/archive/ | head        # Archiv wählen
/docker/complihub-backup/supabase-restore.sh \
  /docker/complihub-backup/archive/staging-<stamp>.tar.gz [tabelle]
```
Upsert per Primary Key (`Prefer: resolution=merge-duplicates`): vorhandene
Zeilen werden überschrieben, fehlende neu angelegt, **zusätzliche Zeilen
werden NICHT gelöscht** (kein destruktiver Sync).

### Fall C — Projekt komplett weg (neues Projekt)
1. Neues Supabase-Projekt anlegen, `SUPABASE_URL`/Keys in `.env.staging`
   (Repo), `/docker/complihub-backup/.env` und `/docker/complihub-api`-Env
   aktualisieren.
2. **Schema**: alle `supabase/migrations/*.sql` in Reihenfolge anwenden
   (Supabase MCP `apply_migration` oder SQL-Editor).
3. **Daten**: `supabase-restore.sh <letztes Archiv>` (ohne Tabellen-Arg =
   alle Tabellen).
4. Auth-User existieren in `auth.users` und sind NICHT im Datenexport —
   Nutzer müssen sich neu registrieren (Alpha-akzeptabel; ab Beta: Paid
   Tier mit echten DB-Backups, siehe unten).
5. API-Container neu starten, `deploy-staging.sh` für die UI (falls sich
   der Anon-Key änderte).

## Grenzen dieses Setups (bewusst, Alpha-Phase)

- Export ist **Datenebene** via PostgREST: keine Sequenzen/Funktionen/
  Trigger (kommen aus den Migrationen), kein `auth.users`.
- Konsistenz ist "eventual": Tabellen werden nacheinander exportiert, kein
  Snapshot-Isolat. Bei 600 Zeilen irrelevant.
- **Ab Beta / Prod-Projekt**: Supabase Pro (kein Auto-Pause, tägliche echte
  DB-Backups, optional PITR) — Entscheidung siehe Audit-Report.
