import fs from 'fs';
import path from 'path';

const localesDir = path.join(process.cwd(), 'src', 'locales');
const newTranslations = {
  "wizard": {
    "epr": {
      "categories": {
         "electronics": "Elektronik / Elektrogeräte",
         "batteries": "Batterien / Akkus",
         "textiles": "Textilien / Kleidung",
         "packaging": "Nur Verpackung (Eigenmarke)",
         "food": "Lebensmittel / Nahrungsergänzung",
         "cosmetics": "Kosmetik / Beauty",
         "furniture": "Möbel / Haushaltsprodukte",
         "toys": "Spielzeug / Kinderprodukte"
      },
      "roles": {
         "manufacturer": { "label": "Hersteller", "desc": "Sie produzieren oder beziehen von außerhalb der EU und verkaufen unter eigenem Markennamen." },
         "resellerEu": { "label": "EU Händler / Wiederverkäufer", "desc": "Sie kaufen innerhalb der EU und verkaufen weiter (EPR-Pflicht bleibt beim Hersteller)." },
         "importer": { "label": "Importeur (nicht-EU → EU)", "desc": "Sie importieren aus China, USA, etc. und sind somit Erstinverkehrbringer für EPR." },
         "dropshipper": { "label": "Dropshipper", "desc": "Sie verkaufen ohne das Produkt selbst zu besitzen oder zu lagern." }
      },
      "status": {
         "registeredDe": { "label": "Registriert (z.B. LUCID / stif.de)", "desc": "Sie haben eine EPR-Registrierung für Elektronik, Verpackung oder Batterien." },
         "partly": { "label": "Teilweise registriert", "desc": "Registriert für einige Kategorien, aber nicht alle." },
         "notRegistered": { "label": "Nicht registriert", "desc": "Noch keine EPR-Registrierung vorhanden." },
         "notSure": { "label": "Nicht sicher", "desc": "Ich bin mir nicht sicher, ob eine Registrierungspflicht besteht." }
      },
      "steps": {
         "physical": {
            "label": "Physische Produkte?",
            "title": "Verkaufen Sie physische Produkte?",
            "subtitle": "EPR (Erweiterte Herstellerverantwortung) gilt nur für Unternehmen, die physische Waren oder Verpackungen in Verkehr bringen.",
            "noNotice": "EPR-Pflichten gelten grundsätzlich nicht für rein digitale Produkte und Dienstleistungen. Sie können den Assistenten dennoch fortsetzen, um sicherzugehen."
         },
         "categories": {
            "label": "Produktkategorien",
            "title": "In welchen Produktkategorien sind Sie aktiv?",
            "subtitle": "EPR-Anforderungen unterscheiden sich je nach Kategorie erheblich. Elektronik und Batterien unterliegen dem WEEE/ElektroG, Textilien den Lieferkettensorgfaltspflichtengesetzen.",
            "electronicsNotice": "Elektrogeräte — WEEE / ElektroG: Registrierungspflicht im LUCID-Register und bei der stiftung ear (stif.de). Rücknahmepflichten für Altgeräte gelten.",
            "textilesNotice": "Für Textilien gilt das Lieferkettensorgfaltspflichtengesetz (LkSG) ab bestimmten Schwellenwerten. Frankreich hat bereits ein erweitertes Textil-EPR-System."
         },
         "role": {
            "label": "Ihre Rolle",
            "title": "Was ist Ihre Rolle in der Lieferkette?",
            "subtitle": "EPR-Pflichten hängen stark von Ihrer Rolle ab. Importeure und Hersteller tragen die Hauptverantwortung.",
            "riskNotice": "Hohes Risiko: Als Importeur von Elektronik/Batterien sind Sie voll verantwortlich für Rücknahme, Entsorgung und Registrierung. Eine Sperrung auf Marktplätzen ohne Nachweis ist möglich."
         },
         "status": {
            "label": "EPR-Status",
            "title": "Sind Sie bereits EPR-registriert?",
            "subtitle": "In Deutschland sind Hersteller/Importeure verpflichtet, sich im LUCID-Portal (Verpackung) und im Elektro-Register (stif.de) zu registrieren.",
            "riskNotice": "Dringender Handlungsbedarf: Fehlende Registrierungen können zu Abmahnungen, Marktplatzsperrungen (Amazon, Zalando) und Bußgeldern bis zu 100.000 € führen. Lassen Sie uns das schnell lösen.",
            "successNotice": "Großartig! Wir prüfen trotzdem, ob Ihre Registrierungen für alle Kategorien und Zielmärkte vollständig sind."
         }
      }
    },
    "privacy": {
      "tools": {
         "ga4": "Google Analytics 4",
         "metaPixel": "Meta / Facebook Pixel",
         "tiktokPixel": "TikTok Pixel",
         "googleAds": "Google Ads Conversion",
         "linkedinInsight": "LinkedIn Insight Tag",
         "hotjar": "Hotjar / Clarity",
         "klaviyo": "Klaviyo / E-Mail Marketing",
         "hubspot": "HubSpot / CRM",
         "noTools": "Nichts davon"
      },
      "data": {
         "email": "E-Mail Adressen",
         "purchase": "Kaufhistorie / Bestelldaten",
         "location": "Standortdaten",
         "ip": "IP-Adressen / Cookies",
         "health": "Gesundheitsdaten",
         "financial": "Finanz- / Zahlungsdaten",
         "behavioral": "Nutzerverhalten & Klick-Tracking",
         "none": "Keine personenbezogenen Daten"
      },
      "locations": {
         "euOnly": { "label": "Nur EU / EWR", "desc": "Alle Server und Tools befinden sich innerhalb der EU oder des EWR." },
         "usTransfers": { "label": "US-Datentransfers", "desc": "Ich nutze US-Dienste (Google, Meta, AWS US, etc.)." },
         "mixed": { "label": "Gemischt / Unbekannt", "desc": "Ich bin mir nicht sicher, wo alle Tools Daten verarbeiten." }
      },
      "consent": {
         "yesFull": { "label": "Ja — volles Consent Management", "desc": "Cookie-Banner mit aktivem Opt-in (z.B. Cookiebot, OneTrust)." },
         "yesBasic": { "label": "Ja — einfaches Cookie-Banner", "desc": "Hinweis-Banner ohne richtige Opt-in-Implementierung." },
         "no": { "label": "Nein — kein Consent Tool", "desc": "Kein aktives Consent Management vorhanden." }
      },
      "steps": {
         "euCustomers": {
            "label": "EU Kunden",
            "title": "Haben Sie Kunden in der EU / im EWR?",
            "subtitle": "Die DSGVO gilt für jedes Unternehmen, das personenbezogene Daten von EU-Bürgern verarbeitet — unabhängig vom Sitz Ihres Unternehmens.",
            "noNotice": "Ohne EU-Kunden gilt die DSGVO nicht direkt. Lokale Datenschutzgesetze (z.B. CCPA) können dennoch relevant sein.",
            "yesNotice": "Die DSGVO ist für Sie verpflichtend. Bußgelder können bis zu 4 % des weltweiten Jahresumsatzes oder 20 Mio. € betragen — je nachdem, welcher Betrag höher ist."
         },
         "dataCategories": {
            "label": "Datenkategorien",
            "title": "Welche Daten erfassen Sie von Nutzern?",
            "subtitle": "Unterschiedliche Datenkategorien erfordern unterschiedliche Schutzmaßnahmen. Gesundheits- und Finanzdaten sind nach DSGVO Art. 9 besonders sensibel.",
            "healthNotice": "Gesundheitsdaten sind eine besondere Kategorie (DSGVO Art. 9). Es gelten strengere Anforderungen: ausdrückliche Einwilligung, Datenschutz-Folgenabschätzung (DSFA) und regelmäßige Audits sind obligatorisch."
         },
         "tracking": {
            "label": "Tracking & Tools",
            "title": "Welche Tracking- und Marketing-Tools nutzen Sie?",
            "subtitle": "Jedes Tool, das Nutzerdaten erfasst oder an Dritte überträgt, muss in Ihrer Datenschutzerklärung aufgeführt und per Einwilligung aktiviert werden.",
            "mismatchNotice": "Widerspruch erkannt: Sie nutzen Tracking-Tools, haben aber angegeben, keine personenbezogenen Daten zu erfassen. Tracking-Pixel übertragen zwangsläufig Nutzerdaten (IP, Verhalten).",
            "usToolsNotice": "US-Dienste (Google, Meta, TikTok) übertragen Daten in die USA. Dies erfordert Standardvertragsklauseln (SCCs) und einen Auftragsverarbeitungsvertrag (AVV)."
         },
         "consent": {
            "label": "Einwilligung & Verarbeitung",
            "title": "Datenverarbeitung & Consent Management",
            "subtitle": "Zwei entscheidende DSGVO-Anforderungen: Wo werden Ihre Daten gespeichert und holen Sie eine gültige Einwilligung ein?",
            "processingQ": "WO WERDEN IHRE DATEN VERARBEITET?",
            "consentQ": "NUTZEN SIE EIN CONSENT MANAGEMENT TOOL?",
            "noConsentNotice": "Hohes DSGVO-Risiko: Sie nutzen Tracking-Tools ohne Cookie-Banner. Jeder EU-Besucher auf Ihrer Seite stellt einen Datenschutzverstoß dar. Sofortiger Handlungsbedarf."
         }
      }
    }
  }
};

const newTranslationsEs = {
  "wizard": {
    "epr": {
      "categories": {
         "electronics": "Electrónica / Equipos Eléctricos",
         "batteries": "Baterías / Acumuladores",
         "textiles": "Textiles / Ropa",
         "packaging": "Solo embalaje (marca propia)",
         "food": "Alimentos / Suplementos Dietéticos",
         "cosmetics": "Cosméticos / Belleza",
         "furniture": "Muebles / Productos para el Hogar",
         "toys": "Juguetes y Productos Infantiles"
      },
      "roles": {
         "manufacturer": { "label": "Fabricante", "desc": "Usted produce o se abastece de fuera de la UE y vende bajo su propia marca." },
         "resellerEu": { "label": "Minorista / Revendedor de la UE", "desc": "Usted compra dentro de la UE y revende (la responsabilidad EPR permanece con el fabricante)." },
         "importer": { "label": "Importador (no UE → UE)", "desc": "Usted importa de China, EE. UU., etc. y, por lo tanto, es la primera parte de EPR." },
         "dropshipper": { "label": "Dropshipper", "desc": "Usted vende sin poseer o almacenar el producto usted mismo." }
      },
      "status": {
         "registeredDe": { "label": "Registrado (ej. LUCID / stif.de)", "desc": "Usted tiene un registro EPR para electrónica, embalajes o baterías." },
         "partly": { "label": "Parcialmente registrado", "desc": "Registrado para algunas categorías pero no para todas." },
         "notRegistered": { "label": "No registrado", "desc": "Aún no hay registro EPR vigente." },
         "notSure": { "label": "No estoy seguro", "desc": "No estoy seguro de si se aplica una obligación de registro." }
      },
      "steps": {
         "physical": {
            "label": "¿Productos Físicos?",
            "title": "¿Vende productos físicos?",
            "subtitle": "EPR (Responsabilidad Ampliada del Productor) solo se aplica a empresas que introducen bienes físicos o embalajes en el mercado.",
            "noNotice": "Las obligaciones EPR generalmente no se aplican a productos y servicios puramente digitales. Todavía puede continuar con el asistente para estar seguro."
         },
         "categories": {
            "label": "Categorías de Productos",
            "title": "¿En qué categorías de productos está activo?",
            "subtitle": "Los requisitos de EPR difieren significativamente según la categoría. La electrónica y las baterías están sujetas a RAEE/ElektroG, los textiles a leyes de diligencia debida en la cadena de suministro.",
            "electronicsNotice": "Equipos eléctricos — RAEE / ElektroG: registro obligatorio en el directorio LUCID y en stif.de. Se aplican obligaciones de recogida para dispositivos antiguos.",
            "textilesNotice": "Para los textiles, se aplica la Ley Alemana de Diligencia Debida en la Cadena de Suministro (LkSG) por encima de ciertos umbrales. Francia ya cuenta con un sistema EPR textil ampliado."
         },
         "role": {
            "label": "Su Rol",
            "title": "¿Cuál es su papel en la cadena de suministro?",
            "subtitle": "Las obligaciones de EPR dependen en gran medida de su función. Los importadores y fabricantes tienen la responsabilidad principal.",
            "riskNotice": "Alto riesgo: como importador de productos electrónicos/baterías, es totalmente responsable de la devolución, la eliminación y el registro. Es posible suspender el mercado sin prueba de cumplimiento."
         },
         "status": {
            "label": "Estado EPR",
            "title": "¿Ya está registrado en EPR?",
            "subtitle": "En Alemania, los fabricantes o importadores deben registrarse en el portal LUCID (embalaje) y en el registro electrónico (stif.de).",
            "riskNotice": "Acción urgente requerida: La falta de registro puede dar lugar a advertencias, suspensiones del mercado (Amazon, Zalando) y multas de hasta €100,000. Resolvamos esto rápidamente.",
            "successNotice": "¡Estupendo! Seguiremos verificando que sus registros estén completos para todas las categorías y mercados objetivo."
         }
      }
    },
    "privacy": {
      "tools": {
         "ga4": "Google Analytics 4",
         "metaPixel": "Meta / Facebook Pixel",
         "tiktokPixel": "TikTok Pixel",
         "googleAds": "Google Ads Conversion",
         "linkedinInsight": "LinkedIn Insight Tag",
         "hotjar": "Hotjar / Clarity",
         "klaviyo": "Klaviyo / Email Marketing",
         "hubspot": "HubSpot / CRM",
         "noTools": "Ninguno de los anteriores"
      },
      "data": {
         "email": "Direcciones de correo electrónico",
         "purchase": "Historial de compras / datos de pedidos",
         "location": "Datos de ubicación",
         "ip": "Direcciones IP / cookies",
         "health": "Datos de salud",
         "financial": "Datos financieros / de pago",
         "behavioral": "Comportamiento del usuario y seguimiento de clics",
         "none": "Sin datos personales"
      },
      "locations": {
         "euOnly": { "label": "Solo UE / EEE", "desc": "Todos los servidores y herramientas se encuentran dentro de la UE o del EEE." },
         "usTransfers": { "label": "Transferencias de datos en EE. UU.", "desc": "Utilizo servicios con sede en EE. UU. (Google, Meta, AWS US, etc.)." },
         "mixed": { "label": "Mixto / Desconocido", "desc": "No estoy seguro de dónde procesan los datos todas las herramientas." }
      },
      "consent": {
         "yesFull": { "label": "Sí — gestión de consentimiento total", "desc": "Banner de cookies con opción de participar activa (por ejemplo, Cookiebot, OneTrust)." },
         "yesBasic": { "label": "Sí — banner básico de cookies", "desc": "Banner de aviso sin aceptación adecuada implementada." },
         "no": { "label": "No — no hay herramienta de consentimiento", "desc": "No existe una gestión de consentimiento activa." }
      },
      "steps": {
         "euCustomers": {
            "label": "Clientes de la UE",
            "title": "¿Tiene clientes en la UE / EEE?",
            "subtitle": "El RGPD se aplica a cualquier empresa que procese datos personales de ciudadanos de la UE, independientemente de dónde tenga su sede.",
            "noNotice": "Sin clientes de la UE, el RGPD no se aplica directamente. Las leyes locales de protección de datos (por ejemplo, la CCPA) aún pueden ser relevantes.",
            "yesNotice": "El RGPD es obligatorio para usted. Las multas pueden alcanzar hasta el 4% de la facturación anual global o 20 millones de euros, lo que sea mayor."
         },
         "dataCategories": {
            "label": "Categorías de Datos",
            "title": "¿Qué datos recopila de los usuarios?",
            "subtitle": "Diferentes categorías de datos requieren diferentes medidas de seguridad. Los datos sanitarios y financieros son especialmente sensibles según el artículo 9 del RGPD.",
            "healthNotice": "Los datos de salud son una categoría especial (RGPD art. 9). Se aplican requisitos más estrictos: el consentimiento explícito, la evaluación de impacto en la protección de datos (EIPD) y las auditorías periódicas son obligatorias."
         },
         "tracking": {
            "label": "Seguimiento y Herramientas",
            "title": "¿Qué herramientas de seguimiento y marketing utiliza?",
            "subtitle": "Cada herramienta que captura o transfiere datos de usuarios a terceros debe figurar en su política de privacidad y activarse mediante consentimiento.",
            "mismatchNotice": "Contradicción detectada: utiliza herramientas de seguimiento, pero indicó que no recopila datos personales. Los píxeles de seguimiento transmiten inherentemente datos del usuario (IP, comportamiento).",
            "usToolsNotice": "Los servicios estadounidenses (Google, Meta, TikTok) transfieren datos a Estados Unidos. Esto requiere cláusulas contractuales tipo (SCC) y un acuerdo de procesamiento de datos (DPA)."
         },
         "consent": {
            "label": "Consentimiento y Procesamiento",
            "title": "Procesamiento de datos y gestión de consentimiento",
            "subtitle": "Dos requisitos críticos del RGPD: ¿dónde se almacenan sus datos y usted cuenta con un consentimiento válido?",
            "processingQ": "¿DÓNDE SE PROCESAN SUS DATOS?",
            "consentQ": "¿UTILIZA UNA HERRAMIENTA DE GESTIÓN DEL CONSENTIMIENTO?",
            "noConsentNotice": "Alto riesgo de RGPD: estás utilizando herramientas de seguimiento sin un banner de consentimiento. Cada visitante de la UE a su sitio constituye una violación de la protección de datos. Acción urgente requerida."
         }
      }
    }
  }
};

const newTranslationsTr = {
  "wizard": {
    "epr": {
      "categories": {
         "electronics": "Elektronik / Elektrikli Aletler",
         "batteries": "Piller / Aküler",
         "textiles": "Tekstil / Giyim",
         "packaging": "Sadece Ambalaj (Kendi markası)",
         "food": "Gıda / Diyet Takviyeleri",
         "cosmetics": "Kozmetik / Güzellik",
         "furniture": "Mobilya / Ev Eşyaları",
         "toys": "Oyuncak & Çocuk Ürünleri"
      },
      "roles": {
         "manufacturer": { "label": "Üretici", "desc": "AB dışından üretim yapıyor veya temin ediyor ve markanız altında satıyorsunuz." },
         "resellerEu": { "label": "AB Perakendecisi / Bayisi", "desc": "AB içinden alıp satıyorsunuz (EPR sorumluluğu üreticide kalır)." },
         "importer": { "label": "İthalatçı (AB dışı → AB)", "desc": "Çin, ABD vb. gibi ülkelerden ithalat yapıyorsunuz, bu nedenle EPR için ilk taraf sizsiniz." },
         "dropshipper": { "label": "Dropshipper", "desc": "Ürünün kendisine sahip olmadan veya depolamadan satış yapıyorsunuz." }
      },
      "status": {
         "registeredDe": { "label": "Kayıtlı (Örn. LUCID / stif.de)", "desc": "Elektronik, ambalaj veya pil için EPR kaydınız var." },
         "partly": { "label": "Kısmi Kayıtlı", "desc": "Bazı kategorilerde kaydınız var ancak hepsinde değil." },
         "notRegistered": { "label": "Kayıtlı Değil", "desc": "Henüz EPR kaydı yok." },
         "notSure": { "label": "Emin Değilim", "desc": "Kayıt yükümlülüğünün benim için geçerli olup olmadığından emin değilim." }
      },
      "steps": {
         "physical": {
            "label": "Fiziksel Ürünler?",
            "title": "Fiziksel ürün satıyor musunuz?",
            "subtitle": "EPR (Genişletilmiş Üretici Sorumluluğu), yalnızca piyasaya fiziksel ürün veya ambalaj sunan şirketler için geçerlidir.",
            "noNotice": "EPR yükümlülükleri genellikle yalnızca dijital ürünler ve hizmetler için geçerli değildir. Yine de emin olmak için sihirbaza devam edebilirsiniz."
         },
         "categories": {
            "label": "Ürün Kategorileri",
            "title": "Hangi ürün kategorilerinde aktifsiniz?",
            "subtitle": "EPR gereklilikleri kategoriye göre önemli ölçüde değişir. Elektronik ve piller WEEE/ElektroG'ye, tekstiller ise tedarik zinciri özen yükümlülüğü (LkSG) yasalarına tabidir.",
            "electronicsNotice": "Elektrikli ekipmanlar — WEEE / ElektroG: LUCID kayıtları ve stif.de zorunludur. Eski cihazların geri alma zorunluluğu geçerlidir.",
            "textilesNotice": "Tekstiller için Belirli eşiklerin üzerindeki Alman Tedarik Zinciri Özen Yükümlülüğü Yasası (LkSG) geçerlidir. Fransa zaten genişletilmiş bir tekstil EPR planına sahiptir."
         },
         "role": {
            "label": "Rolünüz",
            "title": "Tedarik zincirindeki rolünüz nedir?",
            "subtitle": "EPR yükümlülükleri büyük ölçüde rolünüze bağlıdır. İthalatçılar ve üreticiler asıl sorumluluğu üstlenir.",
            "riskNotice": "Yüksek risk: Bir elektronik/pil ithalatçısı olarak, geri alma, bertaraf ve kayıttan tamamen siz sorumlusunuz. Uyum kanıtı olmadan pazaryeri engellemesi mümkündür."
         },
         "status": {
            "label": "EPR Durumu",
            "title": "Genişletilmiş Üretici Sorumluluğu sistemine kayıtlı mısınız?",
            "subtitle": "Almanya'da, üreticiler / ithalatçılar LUCID portalına (ambalaj) ve elektronik kayıt sistemine (stif.de) kaydolmak zorundadır.",
            "riskNotice": "Acil eylem planı gerekli: Kayıt eksikliği uyarılar, pazaryeri hesaplarınızın (Amazon, Zalando) askıya alınmasına ve 100.000 € 'ya kadar para cezalarına yol açabilir. Bunu hızlıca çözelim.",
            "successNotice": "Harika! Kayıtlarınızın tüm kategoriler ve hedef pazarlar için eksiksiz olup olmadığını yine de doğrulayacağız."
         }
      }
    },
    "privacy": {
      "tools": {
         "ga4": "Google Analytics 4",
         "metaPixel": "Meta / Facebook Pikseli",
         "tiktokPixel": "TikTok Pikseli",
         "googleAds": "Google Ads Dönüşümleri",
         "linkedinInsight": "LinkedIn Insight Tag",
         "hotjar": "Hotjar / Clarity",
         "klaviyo": "Klaviyo / E-Posta Pazarlama",
         "hubspot": "HubSpot / CRM",
         "noTools": "Hiçbiri"
      },
      "data": {
         "email": "E-Posta adresleri",
         "purchase": "Satın alma geçmişi / sipariş verileri",
         "location": "Konum verileri",
         "ip": "IP Adresleri / Çerezler",
         "health": "Sağlık verileri",
         "financial": "Finansal / Ödeme verileri",
         "behavioral": "Kullanıcı davranışı & Tıklama izleme",
         "none": "Kişisel veri yok"
      },
      "locations": {
         "euOnly": { "label": "Sadece AB / AEA (Avrupa Ekonomik Alanı)", "desc": "Tüm sunucular ve araçlar AB veya AEA sınırları içinde bulunmaktadır." },
         "usTransfers": { "label": "ABD veri transferleri", "desc": "ABD tabanlı hizmetler (Google, Meta, AWS US vb.) kullanıyorum." },
         "mixed": { "label": "Karışık / Bilinmeyen", "desc": "Tüm araçların veriyi nerede işlediğinden emin değilim." }
      },
      "consent": {
         "yesFull": { "label": "Evet — tam onay yönetimi (Consent Management)", "desc": "Aktif katılımlı çerez bildirimi kullanıyorum (Örn. Cookiebot, OneTrust)." },
         "yesBasic": { "label": "Evet — temel çerez bildirimi", "desc": "Sadece bildirim amaçlı çerez bildirimi, katılım uygulaması yok." },
         "no": { "label": "Hayır — onay aracı (Consent Tool) yok", "desc": "Aktif bir onay (consent) yönetimi bulunmuyor." }
      },
      "steps": {
         "euCustomers": {
            "label": "AB Müşterileri",
            "title": "AB / AEA bölgesinde müşterileriniz var mı?",
            "subtitle": "Şirketinizin merkezi nerede olursa olsun, AB vatandaşlarının kişisel verilerini işleyen her şirket, Genel Veri Koruma Yönetmeliği'ne (GDPR) tabidir.",
            "noNotice": "AB müşterileriniz yoksa GDPR doğrudan geçerli değildir. Yine de yerel veri koruma yasaları (ör. CCPA) geçerli olabilir.",
            "yesNotice": "GDPR sizin için zorunludur. Para cezaları, dünya çapındaki yıllık ciro'nunuzun %4'üne veya 20 milyon € 'ya (hangisi yüksekse) kadar ulaşabilir."
         },
         "dataCategories": {
            "label": "Veri Kategorileri",
            "title": "Kullanıcılarınızdan hangi verileri topluyorsunuz?",
            "subtitle": "Farklı veri kategorileri farklı önlemler gerektirir. Sağlık ve finans verileri, GDPR Madde 9 kapsamında özellikle hassastır.",
            "healthNotice": "Sağlık verileri özel bir kategoridir (GDPR Md. 9). Daha katı kurallar geçerlidir: açık rıza, veri koruma etki değerlendirmesi (DPIA) ve düzenli denetimler zorunludur."
         },
         "tracking": {
            "label": "İzleme ve Araçlar",
            "title": "Hangi izleme ve pazarlama araçlarını kullanıyorsunuz?",
            "subtitle": "Kullanıcı verilerini toplayan veya üçüncü taraf sistemlere aktaran her aracın gizlilik politikanızda listelenmesi ve onaya dayalı olarak aktifleştirilmesi gerekir.",
            "mismatchNotice": "Uyumsuzluk saptandı: İzleme aracı kullanıyorsunuz, fakat kişisel veri toplamadığınızı bildirdiniz. İzleme pikselleri doğal olarak kullanıcı verilerini iletir (Örn. IP, Uygulama içi hareketler).",
            "usToolsNotice": "ABD hizmetleri (Google, Meta, TikTok vb.) verileri Amerika'ya aktarır. Bunun için Standart Sözleşme Maddelerine (SCC'ler) ve bir Veri İşleme Sözleşmesine (DPA) ihtiyaç vardır."
         },
         "consent": {
            "label": "Rıza & Veri İşleme (Consent & Processing)",
            "title": "Veri İşleme ve Onay Yönetimi (Consent Management)",
            "subtitle": "İki kritik GDPR gereksinimi: Verileriniz nerede saklanıyor ve geçerli bir onay alıyor musunuz?",
            "processingQ": "VERILERINIZ NEREDE IŞLENIYOR?",
            "consentQ": "ONAY YÖNETİMİ (CONSENT MANAGEMENT TOOL) KULLANIYOR MUSUNUZ?",
            "noConsentNotice": "Yüksek GDPR riski: Takip (tracking) araçlarını çerez onay bildirimi (cookie banner) olmadan kullanıyorsunuz. Sitenize giren her AB ziyaretçisi bir veri koruma ihlalidir. Acil müdahale gerekiyor."
         }
      }
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

function updateLocale(lang, updates) {
  const filePath = path.join(localesDir, lang, 'common.json');
  console.log(`Updating ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(content);
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return;
  }
  
  const merged = deepMerge(json, updates);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Successfully updated ${filePath}`);
}

updateLocale('de', newTranslations);
updateLocale('es', newTranslationsEs);
updateLocale('tr', newTranslationsTr);
