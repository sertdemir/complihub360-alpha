import json
import os

locales_dir = "/Users/salur-labs/Documents/UX/CompliHub360/plattform/complihub360-alpha/apps/vs1-demo/ui/public/locales"

translations = {
    "en": {
        "nav_aiGovernance": "AI Governance",
        "nav_aiGovDesc": "Our framework for transparent and compliant AI.",
        "aiGov": {
            "trustCenter": "CompliHub360 Trust Center",
            "heroTitle": "AI Governance Framework",
            "heroDesc": "We believe in responsible innovation. Our platform integrates AI strictly within the bounds of global regulations, ethics, and transparency. Discover how we implement the 6 dimensions of AI Governance.",
            "dimTitle": "The 6 Dimensions of AI Governance",
            "dimDesc": "A comprehensive approach to building trustworthy AI systems for enterprise compliance.",
            "dimEthicsTitle": "Ethical Guidelines",
            "dimEthicsDesc": "Our AI features respect human autonomy and are designed to augment professionals, not replace them. We prevent systemic bias through continuous monitoring.",
            "dimTranspTitle": "Transparency & Explainability",
            "dimTranspDesc": "Users deserve to know when they are interacting with AI. Every AI-generated output on CompliHub360 is clearly marked, and its data sources are traceable.",
            "dimOrgTitle": "Organizational Accountability",
            "dimOrgDesc": "Clear governance pipelines dictate who can deploy, access, and audit AI features. We maintain comprehensive audit logs for all AI interactions.",
            "dimTechTitle": "Technical Robustness",
            "dimTechDesc": "Our infrastructure ensures zero downtime and resilient fallbacks. Dedicated Privacy Gates sanitize all inputs before they reach any LLM.",
            "dimRegTitle": "Regulatory Compliance",
            "dimRegDesc": "Built for the EU AI Act and ISO 42001. We map global standards directly into our Code, prioritizing strict EU and UK privacy rules.",
            "dimRiskTitle": "Risk Management",
            "dimRiskDesc": "Continuous risk assessment of AI models. We classify features by risk tiers (e.g., EU AI Act High-Risk vs. Minimal-Risk) and apply proportional security controls.",
            "featTitle": "Active AI Features on CompliHub360",
            "featDesc": "How we leverage AI today, wrapped in our strict governance framework.",
            "featPrivacyTitle": "Privacy Redaction Pipeline",
            "featPrivacyDesc": "Before any business context is analyzed, our local NLP models strip out all Personally Identifiable Information (PII). Emails, names, and phone numbers never leave our secure European servers.",
            "featIntentTitle": "Intent Analysis Engine",
            "featIntentDesc": "Transforms unstructured client input into a structured risk profile. The AI is restricted to analyzing compliance context and cannot make binding legal decisions on its own.",
            "featGateTitle": "Triple AI Gate Validator",
            "featGateDesc": "Every AI action must pass three checks: Data Sanitization, Explicit Consent, and Domain Restriction. If any check fails, the workflow gracefully falls back to a deterministic, non-AI process."
        }
    },
    "de": {
        "nav_aiGovernance": "KI Governance",
        "nav_aiGovDesc": "Unser Framework für transparente und rechtskonforme KI.",
        "aiGov": {
            "trustCenter": "CompliHub360 Trust Center",
            "heroTitle": "KI Governance Framework",
            "heroDesc": "Wir glauben an verantwortungsvolle Innovation. Unsere Plattform integriert KI streng im Rahmen globaler Vorschriften, Ethik und Transparenz. Entdecken Sie, wie wir die 6 Dimensionen der KI-Governance umsetzen.",
            "dimTitle": "Die 6 Dimensionen der KI Governance",
            "dimDesc": "Ein umfassender Ansatz zum Aufbau vertrauenswürdiger KI-Systeme für Unternehmens-Compliance.",
            "dimEthicsTitle": "Ethische Richtlinien",
            "dimEthicsDesc": "Unsere KI-Funktionen respektieren die menschliche Autonomie und sollen Experten ergänzen, nicht ersetzen. Wir verhindern systemische Vorurteile durch kontinuierliche Überwachung.",
            "dimTranspTitle": "Transparenz & Erklärbarkeit",
            "dimTranspDesc": "Nutzer haben das Recht zu wissen, wann sie mit einer KI interagieren. Jedes KS-generierte Ergebnis auf CompliHub360 ist klar gekennzeichnet und seine Datenquellen sind nachvollziehbar.",
            "dimOrgTitle": "Organisatorische Verantwortung",
            "dimOrgDesc": "Klare Governance-Richtlinien definieren, wer KI-Funktionen einsetzen, darauf zugreifen und diese prüfen darf. Wir führen umfassende Audit-Protokolle für alle KI-Interaktionen.",
            "dimTechTitle": "Technische Robustheit",
            "dimTechDesc": "Unsere Infrastruktur gewährleistet null Ausfallzeiten und belastbare Fallbacks. Dedizierte Privacy Gates bereinigen alle Eingaben, bevor sie ein LLM erreichen.",
            "dimRegTitle": "Regulatorische Compliance",
            "dimRegDesc": "Entwickelt für den EU AI Act und ISO 42001. Wir verankern globale Standards direkt in unserem Code und priorisieren strenge EU- und UK-Datenschutzregeln.",
            "dimRiskTitle": "Risikomanagement",
            "dimRiskDesc": "Kontinuierliche Risikobewertung von KI-Modellen. Wir stufen Funktionen nach Risikostufen ein (z. B. EU AI Act High-Risk vs. Minimal-Risk) und wenden proportionale Sicherheitskontrollen an.",
            "featTitle": "Aktive KI-Funktionen auf CompliHub360",
            "featDesc": "Wie wir KI heute nutzen, eingebettet in unser strenges Governance-Framework.",
            "featPrivacyTitle": "Privacy Redaction Pipeline",
            "featPrivacyDesc": "Bevor jeglicher Geschäftskontext analysiert wird, entfernen unsere lokalen NLP-Modelle alle personenbezogenen Daten (PII). E-Mails, Namen und Telefonnummern verlassen niemals unsere sicheren europäischen Server.",
            "featIntentTitle": "Intent Analysis Engine",
            "featIntentDesc": "Wandelt unstrukturierte Kundeneingaben in ein strukturiertes Risikoprofil um. Die KI ist auf die Analyse des Compliance-Kontexts beschränkt und kann keine rechtsverbindlichen Entscheidungen treffen.",
            "featGateTitle": "Dreifacher KI-Gate-Validator",
            "featGateDesc": "Jede KI-Aktion muss drei Prüfungen bestehen: Datenbereinigung, ausdrückliche Zustimmung und Domänenbeschränkung. Schlägt eine Prüfung fehl, greift der Workflow auf einen deterministischen Nicht-KI-Prozess zurück."
        }
    },
    "es": {
        "nav_aiGovernance": "Gobernanza de IA",
        "nav_aiGovDesc": "Nuestro marco para una IA transparente y conforme a la ley.",
        "aiGov": {
            "trustCenter": "CompliHub360 Trust Center",
            "heroTitle": "Marco de Gobernanza de IA",
            "heroDesc": "Creemos en la innovación responsable. Nuestra plataforma integra la IA estrictamente dentro de los límites de las regulaciones globales, la ética y la transparencia. Descubra cómo implementamos las 6 dimensiones de la Gobernanza de IA.",
            "dimTitle": "Las 6 Dimensiones de la Gobernanza de IA",
            "dimDesc": "Un enfoque integral para construir sistemas de IA confiables para el cumplimiento empresarial.",
            "dimEthicsTitle": "Pautas Éticas",
            "dimEthicsDesc": "Nuestras características de IA respetan la autonomía humana y están diseñadas para aumentar a los profesionales, no para reemplazarlos. Prevenimos el sesgo sistémico mediante monitoreo continuo.",
            "dimTranspTitle": "Transparencia y Explicabilidad",
            "dimTranspDesc": "Los usuarios merecen saber cuándo interactúan con IA. Cada resultado generado por IA está claramente marcado y sus fuentes de datos son rastreables.",
            "dimOrgTitle": "Responsabilidad Organizacional",
            "dimOrgDesc": "Las pautas de gobernanza claras dictan quién puede implementar, acceder y auditar las características de IA. Mantenemos registros de auditoría completos para todas las interacciones de IA.",
            "dimTechTitle": "Robustez Técnica",
            "dimTechDesc": "Nuestra infraestructura garantiza cero tiempo de inactividad y alternativas resilientes. Las Privacy Gates dedican a sanitizar todas las entradas antes de que lleguen a cualquier LLM.",
            "dimRegTitle": "Cumplimiento Normativo",
            "dimRegDesc": "Desarrollado para la Ley de IA de la UE y la norma ISO 42001. Mapeamos estándares globales directamente en nuestro código, priorizando las estrictas reglas de privacidad de la UE y el Reino Unido.",
            "dimRiskTitle": "Gestión de Riesgos",
            "dimRiskDesc": "Evaluación continua de riesgos de los modelos de IA. Clasificamos las características por niveles de riesgo y aplicamos controles de seguridad proporcionales.",
            "featTitle": "Características activas de IA en CompliHub360",
            "featDesc": "Cómo aprovechamos la IA hoy, envuelta en nuestro estricto marco de gobernanza.",
            "featPrivacyTitle": "Pipeline de Redacción de Privacidad",
            "featPrivacyDesc": "Antes de analizar cualquier contexto comercial, nuestros modelos eliminan toda la Información de Identificación Personal (PII). Los correos electrónicos, nombres y números de teléfono nunca salen de nuestros servidores europeos seguros.",
            "featIntentTitle": "Motor de Análisis de Intenciones",
            "featIntentDesc": "Transforma la entrada no estructurada del cliente en un perfil de riesgo estructurado. La IA está restringida y no puede tomar decisiones legales vinculantes por sí sola.",
            "featGateTitle": "Validador Triple de Puertas de IA",
            "featGateDesc": "Cada acción de IA debe pasar tres controles: Sanitización de datos, Consentimiento explícito y Restricción de dominio. Si falla algún control, el flujo de trabajo recurre elegantemente a un proceso determinista sin IA."
        }
    },
    "tr": {
        "nav_aiGovernance": "Yapay Zeka Yönetişimi",
        "nav_aiGovDesc": "Şeffaf ve uyumlu yapay zeka için çerçevemiz.",
        "aiGov": {
            "trustCenter": "CompliHub360 Trust Center",
            "heroTitle": "Yapay Zeka Yönetişimi Çerçevesi",
            "heroDesc": "Sorumlu inovasyona inanıyoruz. Platformumuz, yapay zekayı küresel düzenlemeler, etik ve şeffaflık sınırları içinde sıkı bir şekilde entegre eder. Yapay Zeka Yönetişiminin 6 boyutunu nasıl uyguladığımızı keşfedin.",
            "dimTitle": "Yapay Zeka Yönetişiminin 6 Boyutu",
            "dimDesc": "Kurumsal uyumluluk için güvenilir yapay zeka sistemleri oluşturmaya yönelik kapsamlı bir yaklaşım.",
            "dimEthicsTitle": "Etik Kurallar",
            "dimEthicsDesc": "Yapay zeka özelliklerimiz insan özerkliğine saygı duyar ve profesyonellerin yerini almak değil, onları desteklemek için tasarlanmıştır. Sürekli izleme ile sistemik önyargıları önleriz.",
            "dimTranspTitle": "Şeffaflık ve Açıklanabilirlik",
            "dimTranspDesc": "Kullanıcılar bir yapay zeka ile etkileşime girdiklerinde bunu bilmeyi hak ederler. Üretilen her sonuç açıkça işaretlenir ve veri kaynakları izlenebilir.",
            "dimOrgTitle": "Kurumsal Hesap Verebilirlik",
            "dimOrgDesc": "Yapay zeka özelliklerini kimin devreye alabileceğini, erişebileceğini ve denetleyebileceğini net yönetişim hatları belirler. Tüm yapay zeka etkileşimleri için kapsamlı denetim günlükleri (audit logs) tutuyoruz.",
            "dimTechTitle": "Teknik Sağlamlık",
            "dimTechDesc": "Altyapımız sıfır kesinti süresi ve dayanıklı yedekler sağlar. Özel Gizlilik Kapıları, herhangi bir LLM'ye ulaşmadan önce tüm girdileri temizler.",
            "dimRegTitle": "Mevzuat Uyumluluğu",
            "dimRegDesc": "AB Yapay Zeka Yasası (EU AI Act) ve ISO 42001 için oluşturulmuştur. Küresel standartları doğrudan kodumuza haritalıyor, sıkı AB ve Birleşik Krallık kurallarını önceliklendiriyoruz.",
            "dimRiskTitle": "Risk Yönetimi",
            "dimRiskDesc": "Yapay zeka modellerinin sürekli risk değerlendirmesi. Özellikleri risk seviyelerine göre sınıflandırır ve orantılı güvenlik kontrolleri uygularız.",
            "featTitle": "CompliHub360'taki Aktif Yapay Zeka Özellikleri",
            "featDesc": "Bugün yapay zekadan nasıl yararlandığımız, sıkı yönetişim çerçevemizle sarmalanmış durumda.",
            "featPrivacyTitle": "Gizlilik Redaksiyon Hattı",
            "featPrivacyDesc": "Herhangi bir iş bağlamı analiz edilmeden önce, yerel NLP modellerimiz tüm Kişisel Olarak Tanımlanabilir Bilgileri (PII) çıkarır. E-postalar, isimler ve telefon numaraları güvenli Avrupa sunucularımızdan asla çıkmaz.",
            "featIntentTitle": "Niyet Analizi Motoru",
            "featIntentDesc": "Yapılandırılmamış müşteri girdisini yapılandırılmış bir risk profiline dönüştürür. Yapay zeka yalnızca uyumluluk bağlamını analiz etmekle sınırlıdır ve yasal olarak bağlayıcı kararlar alamaz.",
            "featGateTitle": "Üçlü Yapay Zeka Kapısı Doğrulayıcı",
            "featGateDesc": "Her yapay zeka eylemi üç kontrolden geçmelidir: Veri Temizliği, Açık Rıza ve Etki Alanı Kısıtlaması. Herhangi bir kontrol başarısız olursa, iş akışı yapay zeka olmayan deterministik bir sürece geri döner."
        }
    }
}

for lang, data in translations.items():
    file_path = os.path.join(locales_dir, lang, "common.json")
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = json.load(f)
        
    # Inject nav
    if "nav" not in content:
        content["nav"] = {}
    content["nav"]["aiGovernance"] = data["nav_aiGovernance"]
    content["nav"]["aiGovDesc"] = data["nav_aiGovDesc"]
    
    # Inject aiGov
    content["aiGov"] = data["aiGov"]
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

print("Translations successfully updated for en, de, es, tr!")
