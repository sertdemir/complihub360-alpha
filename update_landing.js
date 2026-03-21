const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, 'apps/vs1-demo/ui/public/locales');

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
    landing: {
        services: {
            badge: "Tailored Focus",
            title: "Built for Your Role",
            coreDomains: "Core Domains",
            founder: {
                title: "For Founders",
                tags: ["Product Launches", "Investor Readiness", "Market Entry"],
                description: "Get immediate clarity on regulatory barriers before entering a new market. Fast, actionable, and cost-effective."
            },
            ops: {
                title: "For Operations",
                tags: ["Daily Compliance", "Risk Monitoring", "Vendor Checks"],
                description: "Automate the day-to-day. Get clear answers on packaging, data privacy, and employment variations across borders."
            },
            advisors: {
                title: "For In-house Advisors",
                tags: ["Initial Triage", "Policy Drafts", "Regulatory Updates"],
                description: "Cut research time by 90%. Use our AI engine for first-draft assessments, then assign verified local counsel for final sign-off."
            },
            partners: {
                title: "For Partners",
                tags: ["Lead Gen", "Qualified Intel", "Client Success"],
                description: "Connect with high-intent businesses that have pre-mapped their compliance needs, ready for your specific legal or tax expertise."
            },
            builtForRole: "Built for Your Role",
            cta: "Find the right setup for you"
        },
        snapshot: {
            headerOverline: "Live Output",
            headerTitle: "Instant Risk Identification",
            description: "Provide your business details and instantly receive a traffic-light risk rating across major compliance topics.",
            feature1Title: "Smart Checks",
            feature1Desc: "Instantly checks VAT thresholds, EPR requirements, and data privacy rules.",
            feature2Title: "Clear Rating",
            feature2Desc: "See exactly which areas are critical (Red) and which are compliant (Green).",
            bannerWhy: "Why it matters",
            bannerDesc: "A red flag on packaging laws can stop your goods at customs. We catch it early.",
            card1Overline: "Tax / VAT",
            card1Desc: "Approaching threshold",
            card1Foot: "Needs attention",
            card2Overline: "Data Privacy",
            card2Desc: "Cookie policy missing",
            card2Foot: "Critical",
            card3Overline: "EPR Packaging",
            card3Desc: "Fully compliant",
            card3Foot: "All good",
            statusValue: "Action Required",
            systemStatus: "System Status",
            titleEnd: "Risk Snapshot"
        },
        stepper: {
            badge: "How it works",
            titleEnd: "From Risk to Resolution in Hours",
            stepLabel: "STEP",
            step1: {
                title: "Enter Your Scenario",
                body: "Tell the AI what you sell, where you sell it, and your current setup in less than 2 minutes."
            },
            step2: {
                title: "Instantly See Risks",
                body: "Our engine maps your data against live regulations and flags 'Red', 'Yellow', or 'Green' risk areas."
            },
            step3: {
                title: "Get an Action Plan",
                body: "Receive a step-by-step checklist of exactly what needs to be fixed—from GDPR to EPR to VAT."
            },
            step4: {
                title: "Match with a Local Expert",
                body: "If needed, instantly connect with a verified local attorney or tax advisor for actual execution."
            },
            step5: {
                title: "Stay Compliant",
                body: "Monitor changes in the law and receive alerts if your business needs to adapt to new rules."
            },
            actionPlanActive: "Action Plan Active",
            partnerAssigned: "Partner Assigned",
            description: "A radically faster way to handle international compliance."
        },
        servicesZone: {
            badge: "Services Breakdown",
            title2: "Key Compliance Areas",
            description: "We focus on the four critical pillars that block cross-border scaling.",
            ctaCardTitle: "Not sure what applies?",
            ctaCardDesc: "Take our 2-minute diagnostic to find out exactly which compliance areas affect your business.",
            ctaButton: "Start Diagnostic"
        },
        heroZone: {
            badge: "The CompliHub360 Promise",
            titleStart: "Your Compliance",
            titleHighlight: "Shortcut",
            titleEnd: "to Global Markets",
            description: "Identify legal gaps instantly and find vetted local experts for execution.",
            ctaButton: "Find my compliance shortcut",
            ctaSub: "Takes 2 minutes. No credit card required.",
            cardTitle: "Instant Risk Check",
            cardDesc: "Enter your market and category to see immediate risk flags."
        },
        aiEngine: {
            badge: "AI-Powered Analysis",
            title2: "The AI Compliance Engine",
            description: "Our proprietary engine reads thousands of regulatory changes so you don't have to.",
            step: "Step"
        },
        valueProgression: {
            badge: "Value Proposition",
            title2: "Why Companies Choose Us",
            description: "Traditional legal consulting takes weeks. We do the heavy lifting in minutes.",
            mostPopular: "Most Popular"
        },
        socialProof: {
            title: "Trusted by Innovative Teams"
        },
        footer: {
            platform: "Platform",
            platformLinks: ["Home", "Solutions", "Pricing", "Partners"],
            legal: "Legal",
            legalLinks: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Disclaimer"],
            copyright: "CompliHub360",
            description: "Your shortcut to global compliance.",
            privacyBadge: "Privacy First",
            subscribeButton: "Subscribe",
            subscribed: "Subscribed!"
        }
    }
};

const newDE = {
    landing: {
        services: {
            badge: "Maßgeschneiderter Fokus",
            title: "Für Ihre Rolle entwickelt",
            coreDomains: "Kernbereiche",
            founder: {
                title: "Für Gründer",
                tags: ["Produktlaunches", "Investorenbereitschaft", "Markteintritt"],
                description: "Erhalten Sie sofortige Klarheit über regulatorische Hürden, bevor Sie einen neuen Markt betreten. Schnell, umsetzbar und kostengünstig."
            },
            ops: {
                title: "Für Operations",
                tags: ["Tägliche Compliance", "Risikoüberwachung", "Lieferantenprüfung"],
                description: "Automatisieren Sie den Alltag. Erhalten Sie klare Antworten zu Verpackung, Datenschutz und Beschäftigungsunterschieden über Grenzen hinweg."
            },
            advisors: {
                title: "Für In-house Berater",
                tags: ["Initiale Einstufung", "Richtlinienentwürfe", "Regulatorische Updates"],
                description: "Reduzieren Sie die Recherchezeit um 90 %. Nutzen Sie unsere KI für Ersteinschätzungen und weisen Sie diese dann verifizierten lokalen Anwälten zur Freigabe zu."
            },
            partners: {
                title: "Für Partner",
                tags: ["Lead-Generierung", "Qualifizierte Intel", "Kundenerfolg"],
                description: "Verbinden Sie sich mit hochmotivierten Unternehmen, die ihre Compliance-Bedürfnisse bereits vorab skizziert haben."
            },
            builtForRole: "Für Ihre Rolle entwickelt",
            cta: "Finden Sie das richtige Setup für Sie"
        },
        snapshot: {
            headerOverline: "Live-Ergebnis",
            headerTitle: "Sofortige Risikoerkennung",
            description: "Geben Sie Ihre Geschäftsdaten ein und erhalten Sie sofort eine Ampel-Risikobewertung zu wichtigen Compliance-Themen.",
            feature1Title: "Smarte Checks",
            feature1Desc: "Prüft sofort USt-Schwellen, EPR-Anforderungen und Datenschutzregeln.",
            feature2Title: "Klare Bewertung",
            feature2Desc: "Sehen Sie genau, welche Bereiche kritisch (Rot) und welche konform (Grün) sind.",
            bannerWhy: "Warum es wichtig ist",
            bannerDesc: "Ein rotes Fähnchen bei Verpackungsgesetzen kann Ihre Waren am Zoll aufhalten. Wir erkennen es frühzeitig.",
            card1Overline: "Steuern / USt",
            card1Desc: "Schwelle fast erreicht",
            card1Foot: "Aufgepasst",
            card2Overline: "Datenschutz",
            card2Desc: "Cookie-Richtlinie fehlt",
            card2Foot: "Kritisch",
            card3Overline: "EPR-Verpackungen",
            card3Desc: "Voll konform",
            card3Foot: "Alles gut",
            statusValue: "Handlung erforderlich",
            systemStatus: "Systemstatus",
            titleEnd: "Risiko-Schnappschuss"
        },
        stepper: {
            badge: "Wie es funktioniert",
            titleEnd: "Vom Risiko zur Lösung in Stunden",
            stepLabel: "SCHRITT",
            step1: {
                title: "Szenario eingeben",
                body: "Sagen Sie der KI in weniger als 2 Minuten, was Sie verkaufen, wo Sie es verkaufen und wie Ihr aktuelles Setup aussieht."
            },
            step2: {
                title: "Risiken sofort erkennen",
                body: "Unsere Engine gleicht Ihre Daten mit Live-Vorschriften ab und markiert fehlerhafte oder grüne Risikobereiche."
            },
            step3: {
                title: "Aktionsplan erhalten",
                body: "Erhalten Sie eine Checkliste mit den genauen Schritten, die behoben werden müssen."
            },
            step4: {
                title: "Mit Experten matchen",
                body: "Verbinden Sie sich bei Bedarf sofort mit geprüften lokalen Anwälten oder Steuerberatern zur tatsächlichen Umsetzung."
            },
            step5: {
                title: "Konform bleiben",
                body: "Überwachen Sie Gesetzesänderungen und erhalten Sie Warnungen."
            },
            actionPlanActive: "Aktionsplan aktiv",
            partnerAssigned: "Partner zugewiesen",
            description: "Ein radikal schnellerer Weg zur internationalen Compliance."
        },
        servicesZone: {
            badge: "Aufschlüsselung der Dienste",
            title2: "Wichtige Compliance-Bereiche",
            description: "Wir konzentrieren uns auf die vier kritischen Säulen.",
            ctaCardTitle: "Nicht sicher, was zutrifft?",
            ctaCardDesc: "Machen Sie unsere 2-Minuten-Diagnostik, um genau herauszufinden, welche Compliance-Bereiche Ihr Geschäft betreffen.",
            ctaButton: "Diagnostik starten"
        },
        heroZone: {
            badge: "Das CompliHub360 Versprechen",
            titleStart: "Ihre Compliance",
            titleHighlight: "Abkürzung",
            titleEnd: "zu globalen Märkten",
            description: "Rechtliche Lücken sofort erkennen und mit lokalen Beratern verknüpfen.",
            ctaButton: "Finde meine Compliance-Abkürzung",
            ctaSub: "Dauert 2 Minuten. Keine Kreditkarte erforderlich.",
            cardTitle: "Sofort-Risikocheck",
            cardDesc: "Geben Sie Markt und Kategorie ein, um sofort Risiken zu sehen."
        },
        aiEngine: {
            badge: "KI-gestützte Analyse",
            title2: "Die KI-Compliance-Engine",
            description: "Unsere proprietäre Engine liest Änderungen ab, damit Sie es nicht tun müssen.",
            step: "Schritt"
        },
        valueProgression: {
            badge: "Wertversprechen",
            title2: "Warum Unternehmen uns wählen",
            description: "Traditionelle rechtliche Beratung dauert Wochen. Wir machen es in Minuten.",
            mostPopular: "Am beliebtesten"
        },
        socialProof: {
            title: "Vertraut von innovativen Teams"
        },
        footer: {
            platform: "Plattform",
            platformLinks: ["Home", "Lösungen", "Preise", "Partner"],
            legal: "Rechtliches",
            legalLinks: ["Datenschutz", "AGB", "Cookie-Richtlinie", "Haftungsausschluss"],
            copyright: "CompliHub360",
            description: "Ihre Abkürzung zur globalen Compliance.",
            privacyBadge: "Datenschutz im Fokus",
            subscribeButton: "Abonnieren",
            subscribed: "Abonniert!"
        }
    }
};

const newES = {
    landing: {
        services: {
            badge: "Enfoque Adaptado",
            title: "Construido para tu Rol",
            coreDomains: "Dominios Centrales",
            founder: {
                title: "Para Fundadores",
                tags: ["Lanzamiento de Productos", "Preparación para Inversores", "Entrada al Mercado"],
                description: "Obtenga claridad inmediata sobre las barreras regulatorias antes de entrar en un nuevo mercado. Rápido, práctico y rentable."
            },
            ops: {
                title: "Para Operaciones",
                tags: ["Compliance Diario", "Monitoreo de Riesgos", "Comprobación de Proveedores"],
                description: "Automatice el día a día. Obtenga respuestas claras sobre embalaje, privacidad de datos y variaciones laborales transfronterizas."
            },
            advisors: {
                title: "Para Asesores Internos",
                tags: ["Triaje Inicial", "Borradores de Políticas", "Actualizaciones Regulatorias"],
                description: "Reduzca el tiempo de investigación en un 90 %. Use nuestro motor de IA para evaluaciones de primer borrador y luego asigne a abogados locales verificados para la aprobación final."
            },
            partners: {
                title: "Para Socios",
                tags: ["Generación de Leads", "Inteligencia Cualificada", "Éxito del Cliente"],
                description: "Conéctese con empresas de alta intención que ya han mapeado sus necesidades de cumplimiento."
            },
            builtForRole: "Construido para tu Rol",
            cta: "Encuentre la configuración adecuada para ti"
        },
        snapshot: {
            headerOverline: "Salida en Vivo",
            headerTitle: "Identificación de Riesgos Instantánea",
            description: "Proporcione los detalles de su empresa y reciba al instante una calificación de riesgo en forma de semáforo.",
            feature1Title: "Controles Inteligentes",
            feature1Desc: "Comprueba instantáneamente umbrales de IVA, requisitos de EPR y reglas de privacidad de datos.",
            feature2Title: "Calificación Clara",
            feature2Desc: "Vea exactamente qué áreas son críticas (Rojo) y cuáles cumplen (Verde).",
            bannerWhy: "Por qué importa",
            bannerDesc: "Una señal roja en leyes de embalaje puede detener sus bienes en la aduana. Nosotros lo detectamos temprano.",
            card1Overline: "Impuestos / IVA",
            card1Desc: "Acercándose al umbral",
            card1Foot: "Requiere atención",
            card2Overline: "Privacidad",
            card2Desc: "Falta política de cookies",
            card2Foot: "Crítico",
            card3Overline: "Embalaje EPR",
            card3Desc: "Totalmente compatible",
            card3Foot: "Todo bien",
            statusValue: "Requerido Acción",
            systemStatus: "Estado del Sistema",
            titleEnd: "Resumen de Riesgos"
        },
        stepper: {
            badge: "Cómo Funciona",
            titleEnd: "Del Riesgo a la Resolución en Horas",
            stepLabel: "PASO",
            step1: {
                title: "Ingrese su Escenario",
                body: "Dígale a la IA qué vende, dónde lo vende y su configuración actual en menos de 2 minutos."
            },
            step2: {
                title: "Vea Riesgos al Instante",
                body: "Nuestro motor cruza sus datos con regulaciones en vivo y marca áreas de riesgo."
            },
            step3: {
                title: "Obtenga un Plan de Acción",
                body: "Reciba una lista de verificación paso a paso de exactamente qué necesita solución."
            },
            step4: {
                title: "Encuentre a un Experto Local",
                body: "Si es necesario, conéctese al instante con abogados o asesores locales verificados."
            },
            step5: {
                title: "Manténgase en Cumplimiento",
                body: "Monitoree cambios en la ley y reciba alertas."
            },
            actionPlanActive: "Plan de Acción Activo",
            partnerAssigned: "Socio Asignado",
            description: "Una forma radicalmente más rápida de gestionar el cumplimiento internacional."
        },
        servicesZone: {
            badge: "Desglose de Servicios",
            title2: "Áreas Clave de Cumplimiento",
            description: "Nos enfocamos en los cuatro pilares críticos.",
            ctaCardTitle: "¿No está seguro de qué aplica?",
            ctaCardDesc: "Realice nuestro diagnóstico de 2 minutos para averiguarlo.",
            ctaButton: "Iniciar Diagnóstico"
        },
        heroZone: {
            badge: "La Promesa CompliHub360",
            titleStart: "Su Cumplimiento",
            titleHighlight: "Atajo",
            titleEnd: "hacia los Mercados Globales",
            description: "Identifique lagunas legales al instante y conéctese con expertos locales.",
            ctaButton: "Encontrar mi atajo de cumplimiento",
            ctaSub: "Toma 2 minutos. No se requiere tarjeta de crédito.",
            cardTitle: "Chequeo de Riesgo Instantáneo",
            cardDesc: "Ingrese el mercado y la categoría para ver riesgos al instante."
        },
        aiEngine: {
            badge: "Análisis Impulsado por IA",
            title2: "El Motor de Cumplimiento de IA",
            description: "Nuestro motor propietario lee regulaciones para que usted no tenga que hacerlo.",
            step: "Paso"
        },
        valueProgression: {
            badge: "Propuesta de Valor",
            title2: "Por qué las Empresas Nos Eligen",
            description: "La consulta legal tradicional toma semanas. Nosotros lo hacemos en minutos.",
            mostPopular: "Más Popular"
        },
        socialProof: {
            title: "Con la Confianza de Equipos Innovadores"
        },
        footer: {
            platform: "Plataforma",
            platformLinks: ["Inicio", "Soluciones", "Precios", "Socios"],
            legal: "Legal",
            legalLinks: ["Privacidad", "Términos", "Política de Cookies", "Aviso Legal"],
            copyright: "CompliHub360",
            description: "Su atajo al cumplimiento global.",
            privacyBadge: "Privacidad Primero",
            subscribeButton: "Suscribirse",
            subscribed: "Suscrito!"
        }
    }
};

const newTR = {
    landing: {
        services: {
            badge: "Özel Odak",
            title: "Rolünüz İçin Tasarlandı",
            coreDomains: "Temel Alanlar",
            founder: {
                title: "Kurucular İçin",
                tags: ["Ürün Lansmanları", "Yatırıma Hazırlık", "Pazara Giriş"],
                description: "Yeni bir pazara girmeden önce yasal engeller hakkında netlik kazanın. Hızlı, eyleme geçirilebilir ve uygun maliyetli."
            },
            ops: {
                title: "Operasyonlar İçin",
                tags: ["Günlük Uyum", "Risk İzleme", "Tedarikçi Kontrolleri"],
                description: "Gündelik işleri otomatikleştirin. Sınır ötesi veri gizliliği ve istihdam farklılıkları hakkında net yanıtlar alın."
            },
            advisors: {
                title: "Kurum İçi Danışmanlar İçin",
                tags: ["İlk Değerlendirme", "Politika Taslakları", "Mevzuat Güncellemeleri"],
                description: "Araştırma süresini %90 azaltın. İlk taslaklar için yapay zeka motorumuzu kullanın, ardından onay için uzman avukatlara atayın."
            },
            partners: {
                title: "Ortaklar İçin",
                tags: ["Müşteri Kazanımı", "Nitelikli İstihbarat", "Müşteri Başarısı"],
                description: "Uyum ihtiyaçlarını halihazırda belirlemiş, niyet oranı yüksek işletmelerle bağlantı kurun."
            },
            builtForRole: "Rolünüz İçin Tasarlandı",
            cta: "Sizin için doğru kurulumu bulun"
        },
        snapshot: {
            headerOverline: "Canlı Çıktı",
            headerTitle: "Anında Risk Tespiti",
            description: "İşletme ayrıntılarınızı girin ve ana uyumluluk konularında hemen trafik lambası risk derecelendirmesi alın.",
            feature1Title: "Akıllı Kontroller",
            feature1Desc: "Anında KDV eşiklerini, EPR gereksinimlerini ve veri gizliliği kurallarını kontrol eder.",
            feature2Title: "Net Derecelendirme",
            feature2Desc: "Hangi alanların kritik (Kırmızı) hangilerinin uyumlu (Yeşil) olduğunu tam olarak görün.",
            bannerWhy: "Neden Önemli?",
            bannerDesc: "Ambalaj yasalarındaki kırmızı bayrak, mallarınızın gümrükte kalmasına neden olabilir. Biz bunu önceden yakalarız.",
            card1Overline: "Vergi / KDV",
            card1Desc: "Eşiğe yaklaşıyor",
            card1Foot: "Dikkat gerektirir",
            card2Overline: "Veri Gizliliği",
            card2Desc: "Çerez politikası eksik",
            card2Foot: "Kritik",
            card3Overline: "EPR Ambalaj",
            card3Desc: "Tamamen uyumlu",
            card3Foot: "Her şey yolunda",
            statusValue: "İşlem Gerekiyor",
            systemStatus: "Sistem Durumu",
            titleEnd: "Risk Özeti"
        },
        stepper: {
            badge: "Nasıl Çalışır?",
            titleEnd: "Saatler İçinde Riskten Çözüme",
            stepLabel: "ADIM",
            step1: {
                title: "Senaryonuzu Girin",
                body: "Yapay zekaya ne sattığınızı, nereye sattığınızı ve mevcut kurulumunuzu 2 dakikadan kısa sürede anlatın."
            },
            step2: {
                title: "Riskleri Anında Görün",
                body: "Sistemimiz verilerinizi canlı mevzuatlarla eşleştirir ve kırmızı ile yeşil bölgeleri işaretler."
            },
            step3: {
                title: "Aksiyon Planı Edinin",
                body: "Nelerin düzeltilmesi gerektiğine dair adım adım bir kontrol listesi alın."
            },
            step4: {
                title: "Uzmanlarla Eşleşin",
                body: "Gerekirse, onaylı yerel avukatlarla veya mali müşavirlerle anında bağlantı kurun."
            },
            step5: {
                title: "Uyumlu Kalın",
                body: "Yasadaki değişiklikleri izleyin ve uyarılar alın."
            },
            actionPlanActive: "Aksiyon Planı Aktif",
            partnerAssigned: "Ortak Atandı",
            description: "Uluslararası uyumluluğu yönetmenin çok daha hızlı bir yolu."
        },
        servicesZone: {
            badge: "Hizmet Dökümü",
            title2: "Temel Uyumluluk Alanları",
            description: "Biz dört kritik ayağa odaklanıyoruz.",
            ctaCardTitle: "Nelerin geçerli olduğundan emin değil misiniz?",
            ctaCardDesc: "Öğrenmek için 2 dakikalık profil oluşturma testini yapın.",
            ctaButton: "Teşhisi Başlat"
        },
        heroZone: {
            badge: "CompliHub360 Sözü",
            titleStart: "Uluslararası Pazarlara",
            titleHighlight: "Kısa Yol",
            titleEnd: " ",
            description: "Yasal boşlukları hemen tespit edin ve yerel uzmanlarla bağlantı kurun.",
            ctaButton: "Uyumluluk Kısayolumu Bul",
            ctaSub: "2 dakika sürer. Kredi kartı gerekmez.",
            cardTitle: "Anında Risk Kontrolü",
            cardDesc: "Pazarı ve kategoriyi girin ve hemen riskleri görün."
        },
        aiEngine: {
            badge: "Yapay Zeka Analizi",
            title2: "Yapay Zeka Uyumluluk Motoru",
            description: "Benzersiz motorumuz düzenleyici değişiklikleri sizin yerinize okur.",
            step: "Adım"
        },
        valueProgression: {
            badge: "Değer Teklifi",
            title2: "Neden Bizi Seçiyorlar",
            description: "Geleneksel hukuki danışmanlık haftalar sürer. Biz dakikalar içinde hallediyoruz.",
            mostPopular: "En Popüler"
        },
        socialProof: {
            title: "Yenilikçi Ekipler Tarafından Güveniliyor"
        },
        footer: {
            platform: "Platform",
            platformLinks: ["Ana Sayfa", "Çözümler", "Fiyatlandırma", "Ortaklar"],
            legal: "Yasal",
            legalLinks: ["Gizlilik Politikası", "Hizmet Şartları", "Çerez Politikası", "Sorumluluk Reddi"],
            copyright: "CompliHub360",
            description: "Küresel uyumluluğa giden kısayolunuz.",
            privacyBadge: "Önce Gizlilik",
            subscribeButton: "Abone Ol",
            subscribed: "Abone Olundu!"
        }
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
