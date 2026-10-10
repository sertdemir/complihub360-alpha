-- ─── Oeffentlicher Bucket `assets` (Beta-Plan Mo 19.10.) ─────────────────────
--
-- Die Mails (mailer.ts) laden ihr Logo aus `assets/logo-lockup-email.png`.
-- Auf Staging wurde der Bucket von Hand angelegt; keine Migration kannte ihn.
-- Ein neues Projekt (Beta) haette ihn nicht, und die Mails zeigten ein
-- kaputtes Bild — oder hingen, wie bis heute, fest an Staging.
--
-- Oeffentlich, weil Mail-Programme ohne Anmeldung laden. Darum nur Bilder und
-- hoechstens 1 MB: hier liegen Markenbilder, nie Kundendokumente (die gehoeren
-- in `provider-evidence` bzw. die Laufzeit-Vaults, Zonen C/D).
-- Die Objekte selbst kopiert scripts/beta/copy-config.mjs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assets', 'assets', true, 1048576, ARRAY['image/png', 'image/svg+xml', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
