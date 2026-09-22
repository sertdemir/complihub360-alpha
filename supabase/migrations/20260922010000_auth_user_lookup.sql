-- ════════════════════════════════════════════════════════════════════════════
-- Eine Adresse nachschlagen, wo die Logins tatsaechlich liegen
-- ════════════════════════════════════════════════════════════════════════════
--
-- BEFUND 22.09.2026: `POST /api/v1/admin/provider/:key/member` nimmt laut
-- eigener Fehlermeldung "user_id or a known email". Die Adresse suchte es aber
-- in `public.users` (providerAuth.ts:110) — und dort steht ein frisch
-- angelegter Login NICHT.
--
-- `public.users` entsteht faul: `adoption.ts` schreibt die Zeile erst, wenn ein
-- registrierter Nutzer eine Gast-Sitzung uebernimmt. Ein Anbieter, der noch nie
-- den Assistenten benutzt hat, hat also keine. Auf Staging lief genau das auf:
-- vier Logins in `auth.users`, bestaetigt und anmeldefaehig, und der
-- Admin-Endpunkt antwortete "user_id or a known email required".
--
-- Der Fehler war nicht die fehlende Profilzeile, sondern die Tabelle, in der
-- gesucht wurde. Wer einen Login meint, muss `auth.users` fragen.
--
-- ─── Warum eine Funktion und kein direkter Zugriff ──────────────────────────
--
-- Die API spricht ueber PostgREST (`/rest/v1`), und das Schema `auth` liegt
-- dort nicht offen — aus gutem Grund: `auth.users` traegt Passwort-Hashes,
-- Wiederherstellungs-Token und Bestaetigungs-Token. Es freizuschalten, um eine
-- E-Mail aufzuloesen, waere ein Scheunentor fuer eine Klinke.
--
-- Stattdessen diese eine Funktion. Sie nimmt eine Adresse und gibt eine
-- UUID zurueck — sonst nichts. Kein Hash, kein Token, keine Zeile.
--
-- ─── Genau eine, oder keine ─────────────────────────────────────────────────
--
-- Die abgeloeste Stelle verlangte `users.length === 1` und verknuepfte sonst
-- nicht. Das bleibt so, und zwar hier in SQL statt beim Aufrufer: bei zwei
-- Treffern kommt NULL zurueck, nicht der erste. Eine Mitgliedschaft an die
-- falsche Person zu haengen ist schlimmer, als sie gar nicht zu haengen —
-- dieselbe Haltung wie im Backfill von 20260922000000.
--
-- Soft-geloeschte Logins (`deleted_at`) zaehlen nicht mit. Sonst koennte ein
-- geloeschtes Konto eine lebende Adresse mehrdeutig machen und die
-- Verknuepfung blockieren.

CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Fest verdrahtet, weil SECURITY DEFINER sonst mit dem search_path des
-- Aufrufers laeuft: wer `auth` vorne einhaengt, bestimmt, welche Tabelle
-- "auth.users" meint. Der Datenbank-Linter meldet das zu Recht als Befund.
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
  SELECT t.id
  FROM (
    SELECT u.id, count(*) OVER () AS treffer
    FROM auth.users u
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.deleted_at IS NULL
  ) t
  WHERE t.treffer = 1
$$;

COMMENT ON FUNCTION public.auth_user_id_by_email(text) IS
  'Adresse -> Login-UUID aus auth.users, fuer den Admin-Endpunkt, der eine Anbieter-Mitgliedschaft setzt. Gibt NULL zurueck, wenn keine ODER mehr als eine Zeile passt — lieber keine Verknuepfung als die falsche. Liefert ausschliesslich die UUID; das Schema auth bleibt sonst zu.';

-- Nur die Service-Rolle. `public` schliesst PUBLIC-Default-Rechte mit ein,
-- deshalb steht es zuerst — ohne das duerfte jede Rolle ausfuehren.
REVOKE ALL ON FUNCTION public.auth_user_id_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(text) TO service_role;
