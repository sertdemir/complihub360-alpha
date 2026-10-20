-- ─── Acknowledgement v2: dieselben Saetze, jetzt mit Umlauten, Akzenten und
-- tuerkischen Zeichen ────────────────────────────────────────────────────────
--
-- v1 (20261001000000) ist ASCII-only seeded worden ("fuer Sie sichtbar",
-- "direccion de correo electronico", "saglayicinin adi"). Das ist der eine
-- Rechtstext, den der Nutzer vor der Buchung bestaetigt — er soll in seiner
-- Sprache stehen (DNA-Copy-Durchgang 2026-10-18, Nit). Inhalt unveraendert,
-- deshalb neue Version mit neuem effective_from; v1 bleibt fuer bestehende
-- Buchungen stehen (scheduling.acknowledgement_version zeigt darauf).

INSERT INTO public.booking_acknowledgements (version, language, body, shared_fields, effective_from) VALUES
  ('booking-ack-v2', 'en',
   E'With this booking, the provider''s name and contact details become visible to you, and the provider receives your company name, your e-mail address and your message.\n\nThe provider may contact you about this request — including scheduling, a proposal and reasonable follow-up — even if you cancel, do not attend or stop responding. Marketing on other topics requires your separate permission.\n\nYou receive a 10 % discount on the provider''s professional fees for this request because you booked through CompliHub360. The booking itself costs you nothing.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-20'),
  ('booking-ack-v2', 'de',
   E'Mit dieser Buchung werden Name und Kontakt des Anbieters für Sie sichtbar; der Anbieter erhält Ihren Firmennamen, Ihre E-Mail-Adresse und Ihre Nachricht.\n\nDer Anbieter darf Sie zu diesem Anliegen kontaktieren — zu Terminen, einem Angebot und angemessenen Rückfragen — auch wenn Sie absagen, nicht erscheinen oder nicht mehr antworten. Werbung zu anderen Themen braucht Ihre gesonderte Erlaubnis.\n\nSie erhalten 10 % Rabatt auf das Honorar des Anbieters für dieses Anliegen, weil Sie über CompliHub360 buchen. Die Buchung selbst kostet Sie nichts.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-20'),
  ('booking-ack-v2', 'es',
   E'Con esta reserva, el nombre y los datos de contacto del proveedor pasan a ser visibles para usted, y el proveedor recibe el nombre de su empresa, su dirección de correo electrónico y su mensaje.\n\nEl proveedor puede contactarle sobre esta solicitud — citas, una propuesta y consultas razonables — aunque usted cancele, no asista o deje de responder. La publicidad sobre otros temas requiere su permiso por separado.\n\nUsted recibe un 10 % de descuento sobre los honorarios del proveedor para esta solicitud porque reserva a través de CompliHub360. La reserva en sí no le cuesta nada.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-20'),
  ('booking-ack-v2', 'tr',
   E'Bu rezervasyonla sağlayıcının adı ve iletişim bilgileri sizin için görünür olur; sağlayıcı şirket adınızı, e-posta adresinizi ve mesajınızı alır.\n\nSağlayıcı bu talep hakkında sizinle iletişime geçebilir — randevular, bir teklif ve makul takip soruları dahil — iptal etseniz, katılmasanız veya yanıt vermeyi kesseniz bile. Başka konulardaki reklamlar için ayrı izniniz gerekir.\n\nCompliHub360 üzerinden rezervasyon yaptığınız için bu talep için sağlayıcının ücretlerinde % 10 indirim alırsınız. Rezervasyonun kendisi size hiçbir maliyet getirmez.',
   ARRAY['email', 'company_name', 'message'], DATE '2026-10-20')
ON CONFLICT (version, language) DO NOTHING;
