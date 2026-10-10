# Runbook: Beta-Supabase einrichten (Beta-Plan Mo 19.10.)

Stand 10.10.2026. Ziel: ein eigenes Supabase-Projekt für die geschlossene
Beta, aus dem Repo herstellbar, mit Sicherung inklusive `auth`. Staging bleibt
unverändert und für Tests da.

## Was geprüft ist

- **Schema aus dem Repo:** Alle Migrationen laufen in Reihenfolge auf einer
  leeren Datenbank durch, 208 pgTAP-Tests sind grün (`npm run db:test`, in CI
  bei jedem PR).
- **Stammdaten aus dem Repo:** Zehn Stammdaten-Tabellen sind auf Staging und
  aus den Migrationen Zeile für Zeile gleich, IDs und Zeitstempel ausgenommen:
  `attendance_policy`, `billing_policy`, `booking_acknowledgements`,
  `jurisdiction_facts`, `lead_band_config`, `lead_fee_eligibility`,
  `plan_catalog`, `provider_field_visibility`, `service_categories`,
  `user_discount_policy`.
  Die elfte, `ai_compliance_frameworks`, weicht in einer Zeile ab: Auf Staging
  steht ein Gedankenstrich als Zeichensalat („‚Äî"), das Repo hat ihn richtig.
- **Nicht im Repo, bewusst Konfiguration:** `lead_band_rules`, also die 28
  Regeln der Band-Zuordnung v1, und `knowledge_chunks` mit den 438 Abschnitten
  des EY-Korpus. Beide überträgt `scripts/beta/copy-config.mjs`.
- **Edge Functions:** Auf Staging ist keine deployt. `supabase/functions/` ist
  Altbestand und spielt für die Beta keine Rolle.
- **Erweiterungen:** `vector`, `pgcrypto`, `uuid-ossp`. Auf Supabase sind sie
  vorhanden; die Migrationen legen sie an.

## Ablauf

| # | Wer | Schritt |
|---|---|---|
| 1 | Nutzer | Projekt anlegen: Organisation wie Staging, **Pro**, Region **eu-central-1** (Frankfurt), Name `complihub360-beta`. DB-Passwort in den Passwort-Manager, nicht in den Chat. Optional: PITR (Add-on, kostet extra). |
| 2 | Claude | Migrationen der Reihe nach einspielen (MCP `apply_migration`, Dateiname = Version). Danach `list_migrations` gegen die Dateiliste abgleichen. |
| 3 | Claude | Stammdaten-Zählung gegen die Liste oben, dazu `get_advisors` (security) für RLS-Lücken. |
| 4 | Nutzer, auf dem VPS | `copy-config.mjs` als **Probelauf**, dann mit `--apply`. Die Schlüssel kommen aus der Umgebung, nicht aus dem Chat (Abschnitt „Konfiguration kopieren"). |
| 5 | Nutzer, im Dashboard | Auth-Einstellungen (Abschnitt „Auth"). |
| 6 | Nutzer, auf dem VPS | Sicherung einrichten (Abschnitt „Backup"), einen Lauf von Hand, eine Wiederherstellung zur Probe. |
| 7 | Claude, Di 20.10. | Beta-Deploy mit den Beta-Werten in der Env (eigener Runbook-Teil am Dienstag). |

## Konfiguration kopieren

```bash
# auf dem VPS, im Repo-Checkout
export SOURCE_SUPABASE_URL=https://kqylqwogxbiwpnomkzsn.supabase.co
export SOURCE_SERVICE_ROLE_KEY=…   # aus /docker/complihub-backup/.env
export TARGET_SUPABASE_URL=https://<beta-ref>.supabase.co
export TARGET_SERVICE_ROLE_KEY=…   # Dashboard → Settings → API
node scripts/beta/copy-config.mjs          # zählt nur
node scripts/beta/copy-config.mjs --apply  # Upsert per id, prüft die Zahlen
```

Kopiert werden genau drei Dinge: `lead_band_rules`, `knowledge_chunks` und
das Mail-Logo `assets/logo-lockup-email.png`. Das Logo kommt aus dem Repo
(`docs/email-templates/assets/`), nicht von Staging.

**Keine Nutzer, keine Anbieter, keine Buchungen.** Die Beta beginnt leer.
Pilot-Anbieter bewerben sich dort neu.

Der Mailer lädt das Logo aus `SUPABASE_URL`, also aus dem Projekt, mit dem die
API spricht. Mit der Beta-Env zeigen die Mails damit auf den Beta-Bucket.

## Auth (Dashboard → Authentication)

- **Site URL:** `https://<beta-domain>`. Diese Domain legt der Di-20.10.-Schritt fest.
- **Redirect URLs** (je Sprache `en|de|es|tr`):
  - `https://<beta-domain>/*/auth/callback` für Login, Registrierung und Google
  - `https://<beta-domain>/*/reset-password` für das Zurücksetzen des Passworts
  - `https://<beta-domain>/*/results` für den Magic Link aus dem Markt-Drawer
- **SMTP:** Resend, mit derselben Absender-Domain wie `MAIL_FROM`.
  Host `smtp.resend.com`, Port 465, User `resend`, Passwort = Resend-API-Key.
  Ohne eigenes SMTP drosselt Supabase den Versand stark (wenige Mails pro
  Stunde). Für eine Beta reicht das nicht.
- **Vorlagen:**
  - „Confirm signup" und „Magic Link": `docs/email-templates/supabase-confirm-signup.html` und `docs/email-templates/supabase-magic-link.html`. Vor dem Einfügen in beiden Dateien die Logo-URL auf `https://<beta-ref>.supabase.co/storage/v1/object/public/assets/logo-lockup-email.png` ändern.
  - **„Reset password" fehlt im Repo.** Ohne Vorlage verschickt Supabase seinen englischen Standardtext. Die Copy geht über den Canvas zur Abnahme.
- **Google-Login:** Die Login-Seite bietet ihn an. Für das Beta-Projekt einen eigenen OAuth-Client in Google anlegen, mit der Callback-URL des Beta-Projekts. Bis dahin den Knopf ausblenden oder den Provider aus lassen.
- **JWT:** `SUPABASE_JWT_SECRET` der Beta in die API-Env. Die API prüft Tokens damit und über JWKS.

## Backup

Supabase Pro sichert täglich und behält die Sicherungen 7 Tage, inklusive
`auth`. Dazu kommt eine Kopie außerhalb von Supabase:
`scripts/vps/supabase-pgdump.sh`.

Was das Skript tut:
- `pg_dump` aus dem Image `postgres:17`, Schemata `public`, `auth` und `storage`
- verschlüsselt mit `age`
- behält 14 Sicherungen

```bash
# einmalig, auf dem eigenen Rechner (NICHT auf dem VPS):
age-keygen -o beta-backup.key     # privaten Schlüssel sicher aufbewahren
# der „public key" (age1…) kommt in die .env auf dem VPS

# VPS
apt install age
mkdir -p /docker/complihub-backup-beta && chmod 700 /docker/complihub-backup-beta
cp scripts/vps/supabase-pgdump.sh /docker/complihub-backup-beta/
cat > /docker/complihub-backup-beta/.env <<'ENV'
DATABASE_URL=postgresql://postgres.<beta-ref>:<pw>@<pooler-host>:5432/postgres
BACKUP_AGE_RECIPIENT=age1…
BACKUP_LABEL=beta
ENV
chmod 600 /docker/complihub-backup-beta/.env
/docker/complihub-backup-beta/supabase-pgdump.sh && tail -1 /docker/complihub-backup-beta/pgdump.log
# Cron: 45 3 * * *  /docker/complihub-backup-beta/supabase-pgdump.sh
```

`DATABASE_URL` steht im Dashboard unter **Connect → Session pooler**. Der
Session-Modus ist Pflicht, denn `pg_dump` braucht eine Sitzung.

**Ohne `BACKUP_AGE_RECIPIENT` sichert das Skript nicht.** Die Sicherung
enthält personenbezogene Daten (E-Mail-Adressen in `auth`, Nachrichten). Sie
gehört weder ins Repo noch in den Vault.

### Wiederherstellen (Probe, und im Ernstfall)

1. Neues Projekt anlegen und die Migrationen einspielen. Damit steht das Schema, und die Supabase-eigenen `auth`- und `storage`-Tabellen sind da.
2. Sicherung entschlüsseln. Das geschieht auf dem Rechner mit dem privaten Schlüssel:
   `age -d -i beta-backup.key beta-<stamp>.dump.age > beta.dump`
3. Nur die Daten einspielen, das Schema kommt aus den Migrationen:
   `pg_restore --data-only --disable-triggers -d "$DATABASE_URL_NEU" --schema=public --schema=auth beta.dump`
4. Stichproben zählen: `auth.users`, `providers`, `scheduling`. Danach `beta.dump` löschen.

Geprobt am 10.10.2026 lokal (PG 16):
- dump, verschlüsseln, entschlüsseln und einspielen laufen durch
- ohne Schlüssel verweigert das Skript
- **Offen:** eine Probe gegen das echte Beta-Projekt nach Schritt 6

## Gefunden beim Vorbereiten

- **Der EY-Korpus war öffentlich lesbar.** Die Policy „globally readable“ auf
  `knowledge_chunks` gab jedem den ganzen Leitfaden, der den anon-Key aus dem
  Browser-Bundle nimmt. Behoben mit Migration `20261011000100`: Die Policy ist
  weg, die RPC dürfen nur noch der `service_role` aufrufen, abgesichert durch
  einen pgTAP-Test. **Staging bleibt offen, bis die Migration dort eingespielt
  ist.**
- **Bucket `assets` ohne Migration.** Er wurde auf Staging von Hand angelegt.
  Jetzt legt ihn Migration `20261011000200` an.
- **Mail-Logo fest auf Staging.** Es kommt jetzt aus `SUPABASE_URL`.
