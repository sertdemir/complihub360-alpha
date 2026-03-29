const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'apps/vs1-demo/ui/public/locales');

// Define deep merge function
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

const newEN = {
    wizard: {
        businessTypes: {
            ecommerce: { label: "E-Commerce Brand", desc: "Sell own products via your website or marketplace." },
            marketplace: { label: "Marketplace Seller", desc: "Sell via Amazon, Shopify, eBay, Etsy, etc." },
            saas: { label: "SaaS / Software", desc: "Digital products, subscriptions, or software services." },
            agency: { label: "Agency / Consultant", desc: "Services, consulting, or creative work for clients." },
            other: { label: "Other", desc: "Tell us a bit more about your business." }
        },
        marketScopes: {
            local: { label: "Local Only", desc: "I only operate within my primary country." },
            eu: { label: "EU / Europe", desc: "I sell to or operate across multiple EU countries." },
            global: { label: "Global", desc: "I operate in markets outside Europe." }
        },
        revenueBands: {
            lt10k: "< €10k", mid1: "€10k–100k", mid2: "€100k–1M", gt1m: "> €1M", perYear: "per year"
        },
        intents: {
            selfCheck: { label: "Quick self-check", desc: "Get immediate feedback on basic requirements." },
            expert: { label: "Expert advice", desc: "Speak with a specialist for complex cases." },
            fullService: { label: "Full service", desc: "End-to-end management by our team." }
        },
        urgencies: {
            today: "Today", week: "This week", month: "This month", researching: "Just researching"
        },
        riskSignals: {
            taxVat: {
                marketplace: "Marketplace seller", crossBorder: "Cross-border shipping", warehouse: "Warehouse abroad",
                digitalGoods: "Digital goods / services", highVolume: "High transaction volume", vatRegistered: "Already VAT registered"
            },
            epr: {
                physicalGoods: "Sells physical goods", ownPackaging: "Uses custom packaging", dropshipper: "Dropshipper / unbranded",
                electronics: "Electronics category", importer: "Imports from outside EU", recyclingFee: "Not paying recycling fee"
            },
            privacy: {
                ga4: "Google Analytics (GA4)", metaPixel: "Meta Pixel", tiktokPixel: "TikTok Pixel", emailMarketing: "Email marketing",
                crmTool: "CRM / contact data", noConsent: "No consent management"
            },
            marketing: {
                healthClaims: "Health / supplement claims", guaranteed: "\"Guaranteed\" or \"#1\" claims", googleAds: "Google Ads",
                metaAds: "Meta / Facebook Ads", influencer: "Influencer marketing", cookiePopup: "No cookie consent"
            },
            corporate: {
                individual: "No legal entity yet", foreign: "Registering abroad", multiEntity: "Multiple entities",
                remoteTeam: "Remote / international team", investorReady: "Preparing for investment"
            },
            full: {
                multiCountry: "Operating in 3+ countries", allCategories: "Multiple compliance areas", fastNeeded: "Urgent / fast turnaround",
                noTeam: "No in-house compliance", auditNeeded: "Need compliance audit"
            }
        },
        headlines: {
            taxVat: "What are your main tax risk factors?", epr: "What are your main packaging or product situations?",
            privacy: "Which data tools or practices apply to you?", marketing: "What are your main marketing risk areas?",
            corporate: "What best describes your corporate situation?", fullSupport: "What are your main challenges?",
            default: "What are your main risk areas?"
        },
        steps: {
            context: { label: "Business Context", title: "How would you describe your business?", subtitle: "This helps us tailor the right compliance questions for your situation.", freeTextLabel: "Tell us more about your business", freeTextDesc: "Optional — helps us suggest the most relevant providers.", freeTextPlaceholder: "e.g. I run a drop-shipping business across EU markets..." },
            markets: { label: "Market Scope", title: "Where do you sell or operate?", subtitle: "Compliance requirements differ significantly based on your operating scope.", globalNotice: "Compliance rules differ significantly outside the EU. Consider our Full Support package for broader coverage.", showMarkets: "Select specific additional markets (Optional)", hideMarkets: "Hide specific markets" },
            risk: { label: "Risk Signals", subtitle: "Select all that apply — this helps us calculate your risk level and find the best providers.", signalsDetected: "risk signals", signalsWeight: "detected — we'll weight provider results accordingly." },
            complexity: { label: "Complexity & Intent", title: "Last step — tell us your scale & goal.", subtitle: "This helps rank providers by relevance and match the right service tier.", revenueLabel: "ANNUAL REVENUE", intentLabel: "WHAT DO YOU NEED RIGHT NOW?", urgencyLabel: "HOW URGENT IS THIS?" }
        },
        review: "Review",
        reviewAnswers: "Review your answers",
        reviewDesc: "Confirm everything looks right before we generate your results.",
        reviewAnswersButton: "Review Answers",
        backToPrevious: "Back to previous step"
    }
};

const newDE = {
    wizard: {
        businessTypes: {
            ecommerce: { label: "E-Commerce Marke", desc: "Eigener Verkauf über Website oder Marktplatz." },
            marketplace: { label: "Marktplatz-Verkäufer", desc: "Verkauf via Amazon, Shopify, eBay, Etsy, etc." },
            saas: { label: "SaaS / Software", desc: "Digitale Produkte, Abos oder Software." },
            agency: { label: "Agentur / Berater", desc: "Dienstleistungen oder Beratung für Kunden." },
            other: { label: "Sonstiges", desc: "Erzählen Sie uns mehr über Ihr Geschäft." }
        },
        marketScopes: {
            local: { label: "Nur lokal", desc: "Ich agiere nur in meinem Hauptland." },
            eu: { label: "EU / Europa", desc: "Ich verkaufe oder agiere in mehreren EU-Ländern." },
            global: { label: "Global", desc: "Ich agiere auch außerhalb Europas." }
        },
        revenueBands: {
            lt10k: "< 10.000 €", mid1: "10.000–100.000 €", mid2: "100.000–1 Mio. €", gt1m: "> 1 Mio. €", perYear: "pro Jahr"
        },
        intents: {
            selfCheck: { label: "Schneller Selbst-Check", desc: "Sofortiges Feedback zu Basis-Anforderungen." },
            expert: { label: "Expertenrat", desc: "Sprechen Sie mit einem Spezialisten für komplexe Fälle." },
            fullService: { label: "Full-Service", desc: "End-to-End-Management durch unser Team." }
        },
        urgencies: {
            today: "Heute", week: "Diese Woche", month: "Diesen Monat", researching: "Recherchiere nur"
        },
        riskSignals: {
            taxVat: {
                marketplace: "Marktplatz-Verkäufer", crossBorder: "Grenzüberschreitender Versand", warehouse: "Lager im Ausland",
                digitalGoods: "Digitale Güter / Services", highVolume: "Hohes Transaktionsvolumen", vatRegistered: "Bereits USt-registriert"
            },
            epr: {
                physicalGoods: "Verkauft physische Güter", ownPackaging: "Nutzt eigene Verpackung", dropshipper: "Dropshipper / White-Label",
                electronics: "Kategorie Elektronik", importer: "Importiert von außerhalb EU", recyclingFee: "Zahlt keine Recyclinggebühr"
            },
            privacy: {
                ga4: "Google Analytics (GA4)", metaPixel: "Meta Pixel", tiktokPixel: "TikTok Pixel", emailMarketing: "E-Mail-Marketing",
                crmTool: "CRM / Kontaktdaten", noConsent: "Kein Consent-Management"
            },
            marketing: {
                healthClaims: "Gesundheits- / Nahrungsergänzungs-Aussagen", guaranteed: "\"Garantiert\" oder \"#1\" Aussagen", googleAds: "Google Ads",
                metaAds: "Meta / Facebook Ads", influencer: "Influencer Marketing", cookiePopup: "Kein Cookie-Consent"
            },
            corporate: {
                individual: "Noch keine juristische Person", foreign: "Gründung im Ausland", multiEntity: "Mehrere juristische Personen",
                remoteTeam: "Remote / internationales Team", investorReady: "Vorbereitung auf Investments"
            },
            full: {
                multiCountry: "Aktiv in 3+ Ländern", allCategories: "Mehrere Compliance-Bereiche", fastNeeded: "Dringend / schnelle Lösung",
                noTeam: "Kein In-house Compliance", auditNeeded: "Compliance-Audit benötigt"
            }
        },
        headlines: {
            taxVat: "Was sind Ihre steuerlichen Hauptrisikofaktoren?", epr: "Was sind Ihre Hauptsituationen bei Verpackung / Produkten?",
            privacy: "Welche Daten-Tools oder Praktiken treffen auf Sie zu?", marketing: "Was sind Ihre Haupt-Marketing-Risiken?",
            corporate: "Was beschreibt Ihre Unternehmenssituation am besten?", fullSupport: "Was sind Ihre größten Herausforderungen?",
            default: "Was sind Ihre Hauptrisikobereiche?"
        },
        steps: {
            context: { label: "Geschäftskontext", title: "Wie würden Sie Ihr Geschäft beschreiben?", subtitle: "Dies hilft uns, die richtigen Compliance-Fragen für Ihre Situation anzupassen.", freeTextLabel: "Erzählen Sie uns mehr über Ihr Geschäft", freeTextDesc: "Optional — hilft uns, die relevantesten Anbieter vorzuschlagen.", freeTextPlaceholder: "z.B. Ich betreibe ein Dropshipping-Business in der EU..." },
            markets: { label: "Marktabdeckung", title: "Wo verkaufen oder agieren Sie?", subtitle: "Compliance-Anforderungen unterscheiden sich stark je nach Operationsgebiet.", globalNotice: "Compliance-Regeln außerhalb der EU unterscheiden sich stark. Erwägen Sie unser Full-Support-Paket für breitere Abdeckung.", showMarkets: "Spezifische weitere Märkte auswählen (Optional)", hideMarkets: "Spezifische Märkte ausblenden" },
            risk: { label: "Risikosignale", subtitle: "Wählen Sie alle zutreffenden aus — das hilft uns, Ihr Risiko zu berechnen und die besten Anbieter zu finden.", signalsDetected: "Risikosignale", signalsWeight: "erkannt — wir werden die Anbieter-Ergebnisse entsprechend gewichten." },
            complexity: { label: "Komplexität & Absicht", title: "Letzter Schritt — verraten Sie uns Ihre Größe & Ihr Ziel.", subtitle: "Das hilft dabei, Anbieter nach Relevanz zu ordnen und die passende Service-Stufe zu finden.", revenueLabel: "JAHRESUMSATZ", intentLabel: "WAS BRAUCHEN SIE GERADE?", urgencyLabel: "WIE DRINGEND IST DAS?" }
        },
        review: "Überprüfen",
        reviewAnswers: "Antworten überprüfen",
        reviewDesc: "Bestätigen Sie, dass alles richtig aussieht, bevor wir Ihre Ergebnisse generieren.",
        reviewAnswersButton: "Antworten überprüfen",
        backToPrevious: "Zurück zum vorherigen Schritt"
    }
};

const newES = {
    wizard: {
        businessTypes: {
            ecommerce: { label: "Marca E-Commerce", desc: "Vende sus propios productos vía web o marketplace." },
            marketplace: { label: "Vendedor de Marketplace", desc: "Ventas a través de Amazon, Shopify, eBay, Etsy, etc." },
            saas: { label: "SaaS / Software", desc: "Productos digitales, suscripciones o software." },
            agency: { label: "Agencia / Consultor", desc: "Servicios, consultoría o trabajo creativo para clientes." },
            other: { label: "Otro", desc: "Cuéntenos un poco más sobre su negocio." }
        },
        marketScopes: {
            local: { label: "Solo local", desc: "Solo opero dentro de mi país principal." },
            eu: { label: "UE / Europa", desc: "Vendo u opero en varios países de la UE." },
            global: { label: "Global", desc: "Opero en mercados fuera de Europa." }
        },
        revenueBands: {
            lt10k: "< 10.000 €", mid1: "10.000–100.000 €", mid2: "100.000–1 Millón €", gt1m: "> 1 Millón €", perYear: "por año"
        },
        intents: {
            selfCheck: { label: "Auto-comprobación rápida", desc: "Obtenga comentarios inmediatos sobre requisitos básicos." },
            expert: { label: "Consejo experto", desc: "Hable con un especialista para casos complejos." },
            fullService: { label: "Servicio completo", desc: "Gestión integral por nuestro equipo." }
        },
        urgencies: {
            today: "Hoy", week: "Esta semana", month: "Este mes", researching: "Solo investigando"
        },
        riskSignals: {
            taxVat: {
                marketplace: "Vendedor de Marketplace", crossBorder: "Envío transfronterizo", warehouse: "Almacén en el extranjero",
                digitalGoods: "Bienes / servicios digitales", highVolume: "Alto volumen de transacciones", vatRegistered: "Ya registrado en IVA"
            },
            epr: {
                physicalGoods: "Vende bienes físicos", ownPackaging: "Usa empaque personalizado", dropshipper: "Dropshipper / sin marca",
                electronics: "Categoría de electrónica", importer: "Importa de fuera de la UE", recyclingFee: "No paga tarifa de reciclaje"
            },
            privacy: {
                ga4: "Google Analytics (GA4)", metaPixel: "Meta Pixel", tiktokPixel: "TikTok Pixel", emailMarketing: "E-mail marketing",
                crmTool: "CRM / datos de contacto", noConsent: "Sin gestión de consentimiento"
            },
            marketing: {
                healthClaims: "Declaraciones de salud / suplementos", guaranteed: "Declaraciones de \"Garantizado\" o \"#1\"", googleAds: "Google Ads",
                metaAds: "Meta / Facebook Ads", influencer: "Marketing de Influencers", cookiePopup: "Sin consentimiento de cookies"
            },
            corporate: {
                individual: "Aún sin entidad legal", foreign: "Registro en el extranjero", multiEntity: "Múltiples entidades",
                remoteTeam: "Equipo remoto / internacional", investorReady: "Preparándose para la inversión"
            },
            full: {
                multiCountry: "Operando en 3+ países", allCategories: "Múltiples áreas de cumplimiento", fastNeeded: "Urgente / rápida resolución",
                noTeam: "Sin compliance interno", auditNeeded: "Necesita auditoría de cumplimiento"
            }
        },
        headlines: {
            taxVat: "¿Cuáles son sus principales factores de riesgo fiscal?", epr: "¿Cuáles son sus principales situaciones de embalaje o producto?",
            privacy: "¿Qué herramientas o prácticas de datos se aplican a usted?", marketing: "¿Cuáles son sus principales áreas de riesgo de marketing?",
            corporate: "¿Qué describe mejor su situación corporativa?", fullSupport: "¿Cuáles son sus principales desafíos?",
            default: "¿Cuáles son sus principales áreas de riesgo?"
        },
        steps: {
            context: { label: "Contexto del Negocio", title: "¿Cómo describiría su negocio?", subtitle: "Esto nos ayuda a adaptar las preguntas de cumplimiento correctas para su situación.", freeTextLabel: "Cuéntenos más sobre su negocio", freeTextDesc: "Opcional — nos ayuda a sugerir los proveedores más relevantes.", freeTextPlaceholder: "ej. Tengo un negocio de dropshipping en los mercados de la UE..." },
            markets: { label: "Alcance del Mercado", title: "¿Dónde vende u opera?", subtitle: "Los requisitos de cumplimiento difieren significativamente según su alcance de operaciones.", globalNotice: "Las normas de cumplimiento difieren significativamente fuera de la UE. Considere nuestro paquete de Soporte Total para una cobertura más amplia.", showMarkets: "Seleccionar mercados adicionales específicos (Opcional)", hideMarkets: "Ocultar mercados específicos" },
            risk: { label: "Señales de Riesgo", subtitle: "Seleccione todo lo que aplique — esto nos ayuda a calcular su nivel de riesgo y encontrar los mejores proveedores.", signalsDetected: "señales de riesgo", signalsWeight: "detectadas — ponderaremos los resultados de proveedores en consecuencia." },
            complexity: { label: "Complejidad e Intención", title: "Último paso — cuéntenos su escala y objetivo.", subtitle: "Esto ayuda a clasificar proveedores por relevancia y encontrar el nivel de servicio adecuado.", revenueLabel: "INGRESOS ANUALES", intentLabel: "¿QUÉ NECESITA AHORA MISMO?", urgencyLabel: "¿QUÉ TAN URGENTE ES ESTO?" }
        },
        review: "Revisar",
        reviewAnswers: "Revise sus respuestas",
        reviewDesc: "Confirme que todo se ve bien antes de generar sus resultados.",
        reviewAnswersButton: "Revisar Respuestas",
        backToPrevious: "Volver al paso anterior"
    }
};

const newTR = {
    wizard: {
        businessTypes: {
            ecommerce: { label: "E-Ticaret Markası", desc: "Web siteniz veya pazar yeri üzerinden vlastı ürünlerinizi satın." },
            marketplace: { label: "Pazar Yeri Satıcısı", desc: "Amazon, Shopify, eBay, Etsy vb. üzerinden satın." },
            saas: { label: "SaaS / Yazılım", desc: "Dijital ürünler, abonelikler veya yazılım hizmetleri." },
            agency: { label: "Ajans / Danışman", desc: "Müşteriler için hizmet, danışmanlık veya yaratıcı çalışmalar." },
            other: { label: "Diğer", desc: "Bize işletmeniz hakkında biraz daha bilgi verin." }
        },
        marketScopes: {
            local: { label: "Sadece Yerel", desc: "Sadece ana ülkemde faaliyet gösteriyorum." },
            eu: { label: "AB / Avrupa", desc: "Birden fazla AB ülkesinde satıyor veya faaliyet gösteriyorum." },
            global: { label: "Küresel", desc: "Avrupa dışındaki pazarlarda faaliyet gösteriyorum." }
        },
        revenueBands: {
            lt10k: "< 10.000 €", mid1: "10.000–100.000 €", mid2: "100.000–1 Milyon €", gt1m: "> 1 Milyon €", perYear: "yıllık"
        },
        intents: {
            selfCheck: { label: "Hızlı Otokontrol", desc: "Temel gereksinimler hakkında anında geri bildirim alın." },
            expert: { label: "Uzman tavsiyesi", desc: "Karmaşık durumlar için bir uzmanla konuşun." },
            fullService: { label: "Tam hizmet", desc: "Ekibimiz tarafından uçtan uca yönetim." }
        },
        urgencies: {
            today: "Bugün", week: "Bu hafta", month: "Bu ay", researching: "Sadece araştırıyorum"
        },
        riskSignals: {
            taxVat: {
                marketplace: "Pazar yeri satıcısı", crossBorder: "Sınır ötesi nakliye", warehouse: "Yurtdışında depo",
                digitalGoods: "Dijital ürünler / hizmetler", highVolume: "Yüksek işlem hacmi", vatRegistered: "Zaten KDV kayıtlı"
            },
            epr: {
                physicalGoods: "Fiziksel ürün satıyor", ownPackaging: "Özel ambalaj kullanıyor", dropshipper: "Dropshipper / markasız",
                electronics: "Elektronik kategorisi", importer: "AB dışından ithalat", recyclingFee: "Geri dönüşüm ücreti ödemiyor"
            },
            privacy: {
                ga4: "Google Analytics (GA4)", metaPixel: "Meta Pixel", tiktokPixel: "TikTok Pixel", emailMarketing: "E-posta pazarlama",
                crmTool: "CRM / iletişim verileri", noConsent: "Onay yönetimi yok"
            },
            marketing: {
                healthClaims: "Sağlık / takviye iddiaları", guaranteed: "\"Garantili\" veya \"#1\" iddiaları", googleAds: "Google Ads",
                metaAds: "Meta / Facebook Ads", influencer: "Influencer pazarlama", cookiePopup: "Çerez onayı yok"
            },
            corporate: {
                individual: "Henüz yasal bir kişilik yok", foreign: "Yurtdışında kayıt olma", multiEntity: "Birden fazla kuruluş",
                remoteTeam: "Uzaktan / uluslararası ekip", investorReady: "Yatırıma hazırlanıyor"
            },
            full: {
                multiCountry: "3+ ülkede faaliyette", allCategories: "Birden fazla uyumluluk alanı", fastNeeded: "Acil / hızlı dönüş",
                noTeam: "Kurum içi uyumluluk yok", auditNeeded: "Uyumluluk denetimine ihtiyaç var"
            }
        },
        headlines: {
            taxVat: "Ana vergi risk faktörleriniz nelerdir?", epr: "Ana paketleme veya ürün durumlarınız nelerdir?",
            privacy: "Hangi veri araçları veya uygulamaları sizin için geçerli?", marketing: "Ana pazarlama risk alanlarınız nelerdir?",
            corporate: "Kurumsal durumunuzu en iyi ne tanımlar?", fullSupport: "Ana zorluklarınız nelerdir?",
            default: "Ana risk alanlarınız nelerdir?"
        },
        steps: {
            context: { label: "İş Bağlamı", title: "İşletmenizi nasıl tanımlarsınız?", subtitle: "Bu, durumunuz için doğru uyumluluk sorularını uyarlamamıza yardımcı olur.", freeTextLabel: "Bize işletmeniz hakkında daha fazla bilgi verin", freeTextDesc: "İsteğe bağlı — en alakalı sağlayıcıları önermemize yardımcı olur.", freeTextPlaceholder: "ör. AB pazarlarında bir dropshipping işi yürütüyorum..." },
            markets: { label: "Pazar Kapsamı", title: "Nerede satıyor veya faaliyet gösteriyorsunuz?", subtitle: "Uyumluluk gereksinimleri faaliyet kapsamınıza bağlı olarak önemli ölçüde değişir.", globalNotice: "Uyumluluk kuralları AB dışında önemli ölçüde farklılık gösterir. Daha geniş kapsama alanı için Tam Destek paketimizi düşünün.", showMarkets: "Belirli ek pazarları seçin (İsteğe bağlı)", hideMarkets: "Belirli pazarları gizle" },
            risk: { label: "Risk Sinyalleri", subtitle: "Size uyan tüm seçenekleri işaretleyin — bu, risk seviyenizi hesaplamamıza ve en iyi sağlayıcıları bulmamıza yardımcı olur.", signalsDetected: "risk sinyali", signalsWeight: "tespit edildi — sağlayıcı sonuçlarını buna göre ağırlıklandıracağız." },
            complexity: { label: "Karmaşıklık ve Niyet", title: "Son adım — bize ölçeğinizi ve hedefinizi söyleyin.", subtitle: "Bu, sağlayıcıları uygunluk durumuna göre sıralamamıza ve doğru hizmet kademesiyle eşleştirmemize yardımcı olur.", revenueLabel: "YILLIK GELİR", intentLabel: "ŞU ANDA NEYE İHTİYACINIZ VAR?", urgencyLabel: "BU NE KADAR ACİL?" }
        },
        review: "İncele",
        reviewAnswers: "Cevaplarınızı inceleyin",
        reviewDesc: "Sonuçlarınızı oluşturmadan önce her şeyin doğru göründüğünü onaylayın.",
        reviewAnswersButton: "Cevapları İncele",
        backToPrevious: "Önceki adıma dön"
    }
};

const languages = ['en', 'de', 'es', 'tr'];
const newObjects = { en: newEN, de: newDE, es: newES, tr: newTR };

languages.forEach(lang => {
    const filePath = path.join(localesPath, lang, 'common.json');
    if (fs.existsSync(filePath)) {
        const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const mergedData = deepMerge(currentData, newObjects[lang]);
        fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf8');
        console.log(`Updated ${lang}/common.json`);
    } else {
        console.log(`File not found: ${filePath}`);
    }
});
