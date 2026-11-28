-- ─── Hat das angemeldete Konto ein Passwort? ────────────────────────────────
--
-- Unternehmen melden sich ab jetzt mit E-Mail und Passwort an (Canvas
-- "Unternehmens-Login mit Passwort", Wahl L1-A / L2-B / L3-A, 28.11.2026).
-- Konten, die ueber den alten Anmeldelink oder Google entstanden sind, haben
-- keins. Ihnen bietet das Dashboard ein Overlay an, eins festzulegen (L3-A).
--
-- Supabase gibt diese Information nicht an den Browser: Das User-Objekt
-- kennt kein "hat Passwort", und ein Flag in user_metadata kennen die
-- Konten nicht, die sich vor heute mit Passwort registriert haben. Die
-- Wahrheit steht nur in auth.users.encrypted_password.
--
-- Die Funktion antwortet ausschliesslich fuer den eigenen Nutzer
-- (auth.uid()) und gibt nur einen Wahrheitswert heraus, nie den Hash.

CREATE OR REPLACE FUNCTION public.current_user_has_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT u.encrypted_password IS NOT NULL AND u.encrypted_password <> ''
       FROM auth.users u
      WHERE u.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_password() TO authenticated, service_role;

COMMENT ON FUNCTION public.current_user_has_password() IS
  'true, wenn das angemeldete Konto ein Passwort hat. Nur fuer den eigenen Nutzer, nur ein Wahrheitswert. Steuert das Overlay "Passwort festlegen" im Unternehmens-Dashboard.';
