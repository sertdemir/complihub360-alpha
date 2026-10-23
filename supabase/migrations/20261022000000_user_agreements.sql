-- ─── Nutzer-Vereinbarungen: die Beta-Vereinbarung als versionierter Text und
-- die Annahme je Nutzer ────────────────────────────────────────────────────
--
-- Canvas-Wahl 22.10.2026 (1A · 2A · 3A+3C · 4C): In der geschlossenen Beta
-- ersetzt ein Blatt in neun Saetzen die AGB. Der Nutzer bestaetigt es in einem
-- eigenen Schritt nach dem ersten Login; die Annahme steht im Konto mit
-- Fassung, Zeitpunkt und Sprache.
--
--   1. user_agreements            — der Text, versioniert, je Sprache; wie
--                                   booking_acknowledgements oeffentlich lesbar
--   2. user_agreement_acceptance  — wer wann welche Fassung angenommen hat;
--                                   append-only wie provider_agreement_acceptance
--
-- Fassung beta-2026-10 ist OHNE anwaltliche Pruefung erstellt; das sagt der
-- Text selbst (Punkt 09 und die Kopfzeile im Produkt). Eine neue Fassung =
-- neue Zeilen mit neuem effective_from; alte Annahmen bleiben als Nachweis.

CREATE TABLE IF NOT EXISTS public.user_agreements (
  agreement      text        NOT NULL CHECK (agreement IN ('beta', 'terms')),
  version        text        NOT NULL,
  language       char(2)     NOT NULL,
  title          text        NOT NULL,
  -- [{ lead, text }] — der Satz, der die Pointe traegt, und die Erklaerung.
  points         jsonb       NOT NULL,
  effective_from date        NOT NULL DEFAULT current_date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agreement, version, language),
  CHECK (jsonb_typeof(points) = 'array' AND jsonb_array_length(points) > 0)
);

COMMENT ON TABLE public.user_agreements IS
  'Vereinbarungen fuer Nutzer (Beta-Vereinbarung, spaeter AGB), versioniert je Sprache. Oeffentlich lesbar: Rechtstext, kein Geheimnis. Neue Fassung = neue Zeilen mit neuem effective_from.';

CREATE TABLE IF NOT EXISTS public.user_agreement_acceptance (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  agreement   text        NOT NULL,
  version     text        NOT NULL,
  language    char(2)     NOT NULL DEFAULT 'en',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  audit_ref   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (agreement, version, language) REFERENCES public.user_agreements(agreement, version, language)
);

CREATE INDEX IF NOT EXISTS user_agreement_acceptance_user_idx
  ON public.user_agreement_acceptance(user_id, agreement, accepted_at DESC);

COMMENT ON TABLE public.user_agreement_acceptance IS
  'Welche Fassung ein Nutzer wann in welcher Sprache angenommen hat. Append-only: eine neue Fassung ersetzt die alte nicht, sonst ist der Stand zum Zeitpunkt nicht mehr belegbar.';

CREATE OR REPLACE FUNCTION public.user_agreement_acceptance_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'user_agreement_acceptance ist append-only: % nicht erlaubt (Zeile %)', TG_OP, OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS user_agreement_acceptance_no_update ON public.user_agreement_acceptance;
CREATE TRIGGER user_agreement_acceptance_no_update
  BEFORE UPDATE OR DELETE ON public.user_agreement_acceptance
  FOR EACH ROW EXECUTE FUNCTION public.user_agreement_acceptance_immutable();

-- ─── Fassung beta-2026-10 ────────────────────────────────────────────────────

INSERT INTO public.user_agreements (agreement, version, language, title, points, effective_from) VALUES
  ('beta', 'beta-2026-10', 'de', 'Beta-Vereinbarung', $json$[
    {"lead": "Das ist ein Test.", "text": "Sie nutzen eine unfertige Version von CompliHub360, auf Einladung, für eine begrenzte Zeit. Was offen ist, sagen wir Ihnen, bevor Sie es brauchen."},
    {"lead": "Es kostet nichts.", "text": "In der Beta wird nichts berechnet und nichts abgebucht. Zahlungsfunktionen laufen im Testmodus. Sollte sich das je ändern, bestätigen Sie vorher eine neue Fassung dieses Blatts."},
    {"lead": "Es kann schiefgehen.", "text": "Ausfälle, Fehler und Datenverlust sind in einer Beta möglich. Wir übernehmen keine Gewähr für Verfügbarkeit oder Ergebnisse. Wenn etwas passiert ist, sagen wir es Ihnen, ohne dass Sie fragen müssen."},
    {"lead": "Keine Rechtsberatung.", "text": "Risk Map und Antworten sind Orientierung, kein Ersatz für eine Prüfung Ihres Falls. Verified Provider beraten in eigener beruflicher Verantwortung; CompliHub360 ist keine Kanzlei."},
    {"lead": "Ihre Daten.", "text": "Es gilt die Datenschutzerklärung. Laden Sie bitte nur Dokumente hoch, die Sie dafür verwenden dürfen, am besten keine echten Kundendaten."},
    {"lead": "Ihr Feedback hilft.", "text": "Was Sie uns melden, dürfen wir nutzen, um das Produkt zu verbessern, ohne Vergütung und ohne Ihren Namen."},
    {"lead": "Bitte nicht öffentlich.", "text": "Screenshots und Inhalte der Beta bleiben im Kreis der Tester, bis wir starten."},
    {"lead": "Das Ende.", "text": "Die Beta endet mit Ankündigung. Ihr Konto und Ihre Daten löschen wir 30 Tage danach, außer Sie übernehmen das Konto in den Regelbetrieb. Dazu fragen wir Sie rechtzeitig."},
    {"lead": "Jederzeit raus.", "text": "Sie können das Konto jederzeit löschen oder uns schreiben. Ändern wir dieses Blatt, bitten wir Sie neu um Ihre Zustimmung. Dieses Blatt ist ohne anwaltliche Prüfung erstellt."}
  ]$json$::jsonb, DATE '2026-10-22'),
  ('beta', 'beta-2026-10', 'en', 'Beta agreement', $json$[
    {"lead": "This is a test.", "text": "You are using an unfinished version of CompliHub360, by invitation, for a limited time. Whatever is still open, we tell you before you need it."},
    {"lead": "It costs nothing.", "text": "Nothing is charged or debited during the beta. Payment features run in test mode. Should that ever change, you confirm a new version of this sheet first."},
    {"lead": "Things can go wrong.", "text": "Outages, bugs and data loss are possible in a beta. We give no warranty for availability or results. If something has happened, we tell you without you having to ask."},
    {"lead": "No legal advice.", "text": "The risk map and answers are orientation, not a substitute for a review of your case. Verified Providers advise under their own professional responsibility; CompliHub360 is not a law firm."},
    {"lead": "Your data.", "text": "The privacy policy applies. Please upload only documents you are allowed to use for this, ideally no real client data."},
    {"lead": "Your feedback helps.", "text": "What you report to us we may use to improve the product, without payment and without your name."},
    {"lead": "Please keep it private.", "text": "Screenshots and content of the beta stay within the circle of testers until we launch."},
    {"lead": "The end.", "text": "The beta ends with notice. We delete your account and data 30 days after that, unless you take the account into regular operation. We will ask you in good time."},
    {"lead": "Leave any time.", "text": "You can delete your account or write to us at any time. If we change this sheet, we ask for your consent again. This sheet was written without review by legal counsel."}
  ]$json$::jsonb, DATE '2026-10-22'),
  ('beta', 'beta-2026-10', 'es', 'Acuerdo de la beta', $json$[
    {"lead": "Esto es una prueba.", "text": "Usted utiliza una versión inacabada de CompliHub360, por invitación y durante un tiempo limitado. Lo que siga abierto se lo decimos antes de que lo necesite."},
    {"lead": "No cuesta nada.", "text": "Durante la beta no se factura ni se cobra nada. Las funciones de pago funcionan en modo de prueba. Si eso cambiara, confirmaría antes una nueva versión de esta hoja."},
    {"lead": "Algo puede fallar.", "text": "En una beta son posibles caídas, errores y pérdida de datos. No garantizamos disponibilidad ni resultados. Si ha ocurrido algo, se lo decimos sin que tenga que preguntar."},
    {"lead": "Sin asesoramiento jurídico.", "text": "El mapa de riesgos y las respuestas son orientación, no sustituyen una revisión de su caso. Los Verified Providers asesoran bajo su propia responsabilidad profesional; CompliHub360 no es un despacho."},
    {"lead": "Sus datos.", "text": "Se aplica la política de privacidad. Suba solo documentos que pueda usar para ello, preferiblemente sin datos reales de clientes."},
    {"lead": "Su opinión ayuda.", "text": "Lo que nos comunique podemos usarlo para mejorar el producto, sin remuneración y sin su nombre."},
    {"lead": "Por favor, no lo haga público.", "text": "Las capturas y los contenidos de la beta se quedan en el círculo de probadores hasta el lanzamiento."},
    {"lead": "El final.", "text": "La beta termina con aviso. Borramos su cuenta y sus datos 30 días después, salvo que pase la cuenta al servicio regular. Se lo preguntaremos con tiempo."},
    {"lead": "Salir cuando quiera.", "text": "Puede borrar su cuenta o escribirnos en cualquier momento. Si cambiamos esta hoja, le pedimos de nuevo su conformidad. Esta hoja se redactó sin revisión de un abogado."}
  ]$json$::jsonb, DATE '2026-10-22'),
  ('beta', 'beta-2026-10', 'tr', 'Beta sözleşmesi', $json$[
    {"lead": "Bu bir test.", "text": "CompliHub360'ın tamamlanmamış bir sürümünü davetle ve sınırlı bir süre için kullanıyorsunuz. Açık kalan ne varsa ihtiyacınız olmadan önce söyleriz."},
    {"lead": "Hiçbir ücret yok.", "text": "Beta süresince hiçbir şey faturalanmaz ve tahsil edilmez. Ödeme işlevleri test modunda çalışır. Bu değişecek olursa önce bu sayfanın yeni bir sürümünü onaylarsınız."},
    {"lead": "Bir şeyler ters gidebilir.", "text": "Bir betada kesintiler, hatalar ve veri kaybı mümkündür. Erişilebilirlik veya sonuçlar için garanti vermeyiz. Bir şey olduysa siz sormadan söyleriz."},
    {"lead": "Hukuki danışmanlık değil.", "text": "Risk haritası ve yanıtlar yönlendirme amaçlıdır; durumunuzun incelenmesinin yerini tutmaz. Verified Provider'lar kendi mesleki sorumluluklarıyla danışmanlık verir; CompliHub360 bir hukuk bürosu değildir."},
    {"lead": "Verileriniz.", "text": "Gizlilik politikası geçerlidir. Lütfen yalnızca bunun için kullanmanıza izin verilen belgeleri yükleyin; tercihen gerçek müşteri verisi olmasın."},
    {"lead": "Geri bildiriminiz yardımcı olur.", "text": "Bize bildirdiklerinizi ürünü geliştirmek için ücret ödemeden ve adınızı anmadan kullanabiliriz."},
    {"lead": "Lütfen herkese açık paylaşmayın.", "text": "Betanın ekran görüntüleri ve içerikleri lansmana kadar test kullanıcıları arasında kalır."},
    {"lead": "Bitiş.", "text": "Beta duyuruyla sona erer. Hesabınızı ve verilerinizi bundan 30 gün sonra sileriz; hesabı düzenli kullanıma geçirirseniz silmeyiz. Bunu zamanında sorarız."},
    {"lead": "İstediğiniz zaman çıkın.", "text": "Hesabınızı istediğiniz zaman silebilir veya bize yazabilirsiniz. Bu sayfayı değiştirirsek onayınızı yeniden isteriz. Bu sayfa avukat incelemesi olmadan hazırlanmıştır."}
  ]$json$::jsonb, DATE '2026-10-22')
ON CONFLICT (agreement, version, language) DO NOTHING;

-- ─── Zugriff ─────────────────────────────────────────────────────────────────
-- Der Text ist oeffentlich (wie booking_acknowledgements). Die Annahmen
-- schreibt nur die API mit dem Service-Schluessel; RLS ohne Policy = zu.

ALTER TABLE public.user_agreements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agreement_acceptance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agreement text is public" ON public.user_agreements;
CREATE POLICY "Agreement text is public" ON public.user_agreements
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.user_agreements TO anon, authenticated;
