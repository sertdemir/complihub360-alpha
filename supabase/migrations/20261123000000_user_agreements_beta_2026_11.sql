-- ─── Beta-Vereinbarung, Fassung beta-2026-11: zehn Saetze ────────────────────
--
-- Entscheidung des Nutzers vom 22.11.2026: Der Hinweis, dass alle Anbieter der
-- Beta Testkonten sind, steht in der Vereinbarung UND in der Einladung. Die
-- Entscheidung vom 15.10. hatte ihn schon in die Beta-Bedingungen gelegt
-- (docs/runbooks/beta-test-providers.md); beta-2026-10 enthielt ihn in keiner
-- Sprache.
--
-- Was sich gegenueber beta-2026-10 aendert:
--   04  Der Satz "Verified Provider beraten in eigener beruflicher
--       Verantwortung" entfaellt. In der Beta gibt es keine echten Anbieter;
--       der Satz liess Tester das Gegenteil annehmen.
--   05  NEU: Anbieter sind Testkonten. Auf Buchungen und Nachrichten antwortet
--       ein Mensch aus dem Team; was man dort erfaehrt, ist keine Beratung.
--   10  (bisher 09) Das Blatt versprach, das Konto selbst loeschen zu koennen.
--       Das gibt es im Produkt nicht (TKT-BETA-01: Abmelden und uns schreiben).
--       Jetzt: schreiben Sie uns, dann loeschen wir Ihr Konto.
-- Die uebrigen Punkte sind wortgleich uebernommen.
--
-- Eine neue Fassung = neue Zeilen. beta-2026-10 und ihre Annahmen bleiben als
-- Nachweis stehen. Ab dem Stichtag gilt beta-2026-11 als geltende Fassung;
-- wer nur die alte angenommen hat, sieht den Schritt erneut (required = true,
-- services/compliance-api/src/agreements.ts).
--
-- Auch diese Fassung ist OHNE anwaltliche Pruefung erstellt; Punkt 10 sagt es.
-- Die Texte es und tr sind nicht von Muttersprachlern freigegeben.

INSERT INTO public.user_agreements (agreement, version, language, title, points, effective_from) VALUES
  ('beta', 'beta-2026-11', 'de', 'Beta-Vereinbarung', $json$[
    {"lead": "Das ist ein Test.", "text": "Sie nutzen eine unfertige Version von CompliHub360, auf Einladung, für eine begrenzte Zeit. Was offen ist, sagen wir Ihnen, bevor Sie es brauchen."},
    {"lead": "Es kostet nichts.", "text": "In der Beta wird nichts berechnet und nichts abgebucht. Zahlungsfunktionen laufen im Testmodus. Sollte sich das je ändern, bestätigen Sie vorher eine neue Fassung dieses Blatts."},
    {"lead": "Es kann schiefgehen.", "text": "Ausfälle, Fehler und Datenverlust sind in einer Beta möglich. Wir übernehmen keine Gewähr für Verfügbarkeit oder Ergebnisse. Wenn etwas passiert ist, sagen wir es Ihnen, ohne dass Sie fragen müssen."},
    {"lead": "Keine Rechtsberatung.", "text": "Risk Map und Antworten sind Orientierung, kein Ersatz für eine Prüfung Ihres Falls. CompliHub360 ist keine Kanzlei."},
    {"lead": "Anbieter sind Testkonten.", "text": "In der Beta gibt es noch keine echten Anbieter. Alle Anbieter, die Sie sehen und buchen können, sind Testkonten mit erfundenen Namen. Auf Buchungen und Nachrichten antwortet ein Mensch aus unserem Team. Was Sie dort erfahren, ist keine Beratung zu Ihrem Fall."},
    {"lead": "Ihre Daten.", "text": "Es gilt die Datenschutzerklärung. Laden Sie bitte nur Dokumente hoch, die Sie dafür verwenden dürfen, am besten keine echten Kundendaten."},
    {"lead": "Ihr Feedback hilft.", "text": "Was Sie uns melden, dürfen wir nutzen, um das Produkt zu verbessern, ohne Vergütung und ohne Ihren Namen."},
    {"lead": "Bitte nicht öffentlich.", "text": "Screenshots und Inhalte der Beta bleiben im Kreis der Tester, bis wir starten."},
    {"lead": "Das Ende.", "text": "Die Beta endet mit Ankündigung. Ihr Konto und Ihre Daten löschen wir 30 Tage danach, außer Sie übernehmen das Konto in den Regelbetrieb. Dazu fragen wir Sie rechtzeitig."},
    {"lead": "Jederzeit raus.", "text": "Sie können jederzeit aufhören. Schreiben Sie uns, dann löschen wir Ihr Konto. Ändern wir dieses Blatt, bitten wir Sie neu um Ihre Zustimmung. Dieses Blatt ist ohne anwaltliche Prüfung erstellt."}
  ]$json$::jsonb, DATE '2026-11-23'),
  ('beta', 'beta-2026-11', 'en', 'Beta agreement', $json$[
    {"lead": "This is a test.", "text": "You are using an unfinished version of CompliHub360, by invitation, for a limited time. Whatever is still open, we tell you before you need it."},
    {"lead": "It costs nothing.", "text": "Nothing is charged or debited during the beta. Payment features run in test mode. Should that ever change, you confirm a new version of this sheet first."},
    {"lead": "Things can go wrong.", "text": "Outages, bugs and data loss are possible in a beta. We give no warranty for availability or results. If something has happened, we tell you without you having to ask."},
    {"lead": "No legal advice.", "text": "The risk map and answers are orientation, not a substitute for a review of your case. CompliHub360 is not a law firm."},
    {"lead": "Providers are test accounts.", "text": "There are no real providers in the beta yet. Every provider you can see and book is a test account with an invented name. A person on our team answers bookings and messages. What you learn there is not advice on your case."},
    {"lead": "Your data.", "text": "The privacy policy applies. Please upload only documents you are allowed to use for this, ideally no real client data."},
    {"lead": "Your feedback helps.", "text": "What you report to us we may use to improve the product, without payment and without your name."},
    {"lead": "Please keep it private.", "text": "Screenshots and content of the beta stay within the circle of testers until we launch."},
    {"lead": "The end.", "text": "The beta ends with notice. We delete your account and data 30 days after that, unless you take the account into regular operation. We will ask you in good time."},
    {"lead": "Leave any time.", "text": "You can stop at any time. Write to us and we delete your account. If we change this sheet, we ask for your consent again. This sheet was written without review by legal counsel."}
  ]$json$::jsonb, DATE '2026-11-23'),
  ('beta', 'beta-2026-11', 'es', 'Acuerdo de la beta', $json$[
    {"lead": "Esto es una prueba.", "text": "Usted utiliza una versión inacabada de CompliHub360, por invitación y durante un tiempo limitado. Lo que siga abierto se lo decimos antes de que lo necesite."},
    {"lead": "No cuesta nada.", "text": "Durante la beta no se factura ni se cobra nada. Las funciones de pago funcionan en modo de prueba. Si eso cambiara, confirmaría antes una nueva versión de esta hoja."},
    {"lead": "Algo puede fallar.", "text": "En una beta son posibles caídas, errores y pérdida de datos. No garantizamos disponibilidad ni resultados. Si ha ocurrido algo, se lo decimos sin que tenga que preguntar."},
    {"lead": "Sin asesoramiento jurídico.", "text": "El mapa de riesgos y las respuestas son orientación, no sustituyen una revisión de su caso. CompliHub360 no es un despacho."},
    {"lead": "Los proveedores son cuentas de prueba.", "text": "En la beta todavía no hay proveedores reales. Todos los proveedores que puede ver y reservar son cuentas de prueba con nombres inventados. A las reservas y los mensajes responde una persona de nuestro equipo. Lo que le digan allí no es asesoramiento sobre su caso."},
    {"lead": "Sus datos.", "text": "Se aplica la política de privacidad. Suba solo documentos que pueda usar para ello, preferiblemente sin datos reales de clientes."},
    {"lead": "Su opinión ayuda.", "text": "Lo que nos comunique podemos usarlo para mejorar el producto, sin remuneración y sin su nombre."},
    {"lead": "Por favor, no lo haga público.", "text": "Las capturas y los contenidos de la beta se quedan en el círculo de probadores hasta el lanzamiento."},
    {"lead": "El final.", "text": "La beta termina con aviso. Borramos su cuenta y sus datos 30 días después, salvo que pase la cuenta al servicio regular. Se lo preguntaremos con tiempo."},
    {"lead": "Salir cuando quiera.", "text": "Puede dejarlo en cualquier momento. Escríbanos y borramos su cuenta. Si cambiamos esta hoja, le pedimos de nuevo su conformidad. Esta hoja se redactó sin revisión de un abogado."}
  ]$json$::jsonb, DATE '2026-11-23'),
  ('beta', 'beta-2026-11', 'tr', 'Beta sözleşmesi', $json$[
    {"lead": "Bu bir test.", "text": "CompliHub360'ın tamamlanmamış bir sürümünü davetle ve sınırlı bir süre için kullanıyorsunuz. Açık kalan ne varsa ihtiyacınız olmadan önce söyleriz."},
    {"lead": "Hiçbir ücret yok.", "text": "Beta süresince hiçbir şey faturalanmaz ve tahsil edilmez. Ödeme işlevleri test modunda çalışır. Bu değişecek olursa önce bu sayfanın yeni bir sürümünü onaylarsınız."},
    {"lead": "Bir şeyler ters gidebilir.", "text": "Bir betada kesintiler, hatalar ve veri kaybı mümkündür. Erişilebilirlik veya sonuçlar için garanti vermeyiz. Bir şey olduysa siz sormadan söyleriz."},
    {"lead": "Hukuki danışmanlık değil.", "text": "Risk haritası ve yanıtlar yönlendirme amaçlıdır; durumunuzun incelenmesinin yerini tutmaz. CompliHub360 bir hukuk bürosu değildir."},
    {"lead": "Sağlayıcılar test hesaplarıdır.", "text": "Betada henüz gerçek sağlayıcı yok. Görebildiğiniz ve randevu alabildiğiniz tüm sağlayıcılar, uydurma adlar taşıyan test hesaplarıdır. Randevulara ve mesajlara ekibimizden bir kişi yanıt verir. Orada öğrendikleriniz, durumunuza ilişkin danışmanlık değildir."},
    {"lead": "Verileriniz.", "text": "Gizlilik politikası geçerlidir. Lütfen yalnızca bunun için kullanmanıza izin verilen belgeleri yükleyin; tercihen gerçek müşteri verisi olmasın."},
    {"lead": "Geri bildiriminiz yardımcı olur.", "text": "Bize bildirdiklerinizi ürünü geliştirmek için ücret ödemeden ve adınızı anmadan kullanabiliriz."},
    {"lead": "Lütfen herkese açık paylaşmayın.", "text": "Betanın ekran görüntüleri ve içerikleri lansmana kadar test kullanıcıları arasında kalır."},
    {"lead": "Bitiş.", "text": "Beta duyuruyla sona erer. Hesabınızı ve verilerinizi bundan 30 gün sonra sileriz; hesabı düzenli kullanıma geçirirseniz silmeyiz. Bunu zamanında sorarız."},
    {"lead": "İstediğiniz zaman çıkın.", "text": "İstediğiniz zaman bırakabilirsiniz. Bize yazın, hesabınızı silelim. Bu sayfayı değiştirirsek onayınızı yeniden isteriz. Bu sayfa avukat incelemesi olmadan hazırlanmıştır."}
  ]$json$::jsonb, DATE '2026-11-23')
ON CONFLICT (agreement, version, language) DO NOTHING;
