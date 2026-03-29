import json
import os

locales_dir = "/Users/salur-labs/Documents/UX/CompliHub360/plattform/complihub360-alpha/apps/vs1-demo/ui/public/locales"
languages = ['en', 'de', 'es', 'tr']

new_landing_en = {
    "resolution": {
      "badge": "Sample Output — Page 1 of 3",
      "titleStart": "UK Compliance",
      "titleEnd": "Risk Snapshot",
      "description": "You have your risk profile. Now fix it. Here is what a typical UK expansion dossier looks like — and the three paths to resolving it.",
      "risk": {
        "title": "Overall Risk Level",
        "highLevel": "High",
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "critical": "Critical"
      },
      "findings": {
        "title": "Key Findings",
        "item1Title": "VAT Registration threshold exceeded",
        "item1Desc": "Mandatory registration — HMRC threshold £85,000",
        "item2Title": "EPR Packaging Producer Obligation",
        "item2Desc": "PRN registration required by Q1 2025",
        "item3Title": "MTD for VAT — Digital Records Gap",
        "item3Desc": "Phase 2 compliance gap in current workflow",
        "item4Title": "UK GDPR — Privacy Policy",
        "item4Desc": "Meets baseline UK GDPR requirements"
      },
      "status": {
        "actionReq": "Action Req.",
        "review": "Review",
        "compliant": "Compliant"
      },
      "unlock": {
        "title": "You have your risk profile.",
        "subtitle": "Choose how you want to resolve it.",
        "page1Label": "Page 1",
        "page1Value": "Risk Snapshot",
        "page2Label": "Page 2",
        "page2Value": "Action Plan",
        "page3Label": "Page 3",
        "page3Value": "Expert Match"
      },
      "cta": {
        "primary": "Create Profile — Unlock Action Plan",
        "secondary": "Skip to Expert Match"
      },
      "or": "or",
      "disclaimer": "Expert Match connects you with a verified local tax or legal specialist who executes the action plan on your behalf."
    },
    "testimonials": {
      "badge": "Real Results",
      "titleStart": "Trusted by founders and",
      "titleEnd": "operations teams",
      "u1": {
        "persona": "U1 — E-Commerce Founder",
        "name": "Sarah K.",
        "role": "Founder & CEO, D2C Brand",
        "quote": "We saved 3 weeks of legal research in 30 minutes. CompliHub360 flagged our EPR packaging obligation early. The structured dossier was sent to our solicitor the same day, preventing a €20k compliance penalty.",
        "result": "Prevented €20k Penalty",
        "tag": "E-Commerce · EPR + VAT"
      },
      "u2": {
        "persona": "U2 — SaaS Operations Manager",
        "name": "Marcus L.",
        "role": "Head of Operations, B2B SaaS",
        "quote": "Navigating post-Brexit UK GDPR differences was stalling our enterprise deals. CompliHub360 gave us a grounded, cited analysis we could defend in front of our board. We closed our biggest deal 40% faster.",
        "result": "Deal Closed 40% Faster",
        "tag": "SaaS · UK GDPR"
      },
      "u3": {
        "persona": "U3 — Agency Director",
        "name": "Elena R.",
        "role": "Managing Director, Creative Hub",
        "quote": "We were expanding into Germany. The AI mapped exactly what was needed for a subsidiary versus a branch, saving us over €15k in consulting fees and 2 months of waiting for preliminary legal advice.",
        "result": "Saved €15k in Consulting",
        "tag": "Agency · Corporate"
      },
      "u4": {
        "persona": "U4 — FinTech Compliance",
        "name": "David P.",
        "role": "Compliance Officer, FinPay",
        "quote": "The speed at which CompliHub360 mapped our product against FCA thresholds was astonishing. Having live references to legislation built immense trust, allowing us to launch our UK pilot 3 months ahead of schedule.",
        "result": "Launched 3 Months Early",
        "tag": "FinTech · Regulatory"
      }
    },
    "trustedLogos": {
      "trustedBy": "Trusted by compliance teams at"
    }
}

new_landing_de = {
    "resolution": {
      "badge": "Beispielausgabe — Seite 1 von 3",
      "titleStart": "UK Compliance",
      "titleEnd": "Risiko-Schnappschuss",
      "description": "Sie haben Ihr Risikoprofil. Jetzt beheben Sie es. So sieht ein typisches UK-Expansionsdossier aus — und die drei Wege zur Lösung.",
      "risk": {
        "title": "Gesamtrisikostufe",
        "highLevel": "Hoch",
        "low": "Niedrig",
        "medium": "Mittel",
        "high": "Hoch",
        "critical": "Kritisch"
      },
      "findings": {
        "title": "Wichtigste Erkenntnisse",
        "item1Title": "Umsatzsteuerschwelle überschritten",
        "item1Desc": "Pflichtregistrierung — HMRC-Schwelle £85.000",
        "item2Title": "EPR Verpackungshersteller-Verpflichtung",
        "item2Desc": "PRN-Registrierung bis Q1 2025 erforderlich",
        "item3Title": "MTD für VAT — Lücke in digitalen Aufzeichnungen",
        "item3Desc": "Phase 2 Compliance-Lücke im aktuellen Workflow",
        "item4Title": "UK GDPR — Datenschutzrichtlinie",
        "item4Desc": "Erfüllt grundlegende UK GDPR-Anforderungen"
      },
      "status": {
        "actionReq": "Aktion Erf.",
        "review": "Prüfen",
        "compliant": "Konform"
      },
      "unlock": {
        "title": "Sie haben Ihr Risikoprofil.",
        "subtitle": "Wählen Sie, wie Sie es lösen möchten.",
        "page1Label": "Seite 1",
        "page1Value": "Risiko-Schnappschuss",
        "page2Label": "Seite 2",
        "page2Value": "Aktionsplan",
        "page3Label": "Seite 3",
        "page3Value": "Experten-Match"
      },
      "cta": {
        "primary": "Profil erstellen — Aktionsplan freischalten",
        "secondary": "Weiter zum Experten-Match"
      },
      "or": "oder",
      "disclaimer": "Das Experten-Match verbindet Sie mit einem verifizierten lokalen Steuer- oder Rechtsexperten, der den Aktionsplan in Ihrem Namen ausführt."
    },
    "testimonials": {
      "badge": "Echte Ergebnisse",
      "titleStart": "Vertraut von Gründern und",
      "titleEnd": "Operations-Teams",
      "u1": {
        "persona": "U1 — E-Commerce Gründerin",
        "name": "Sarah K.",
        "role": "Gründerin & CEO, D2C Marke",
        "quote": "Wir haben 3 Wochen juristische Recherche in 30 Minuten gespart. CompliHub360 hat unsere EPR-Verpackungspflicht frühzeitig erkannt. Das strukturierte Dossier ging am selben Tag an unseren Anwalt und verhinderte eine Compliance-Strafe von 20.000 €.",
        "result": "20.000 € Strafe verhindert",
        "tag": "E-Commerce · EPR + VAT"
      },
      "u2": {
        "persona": "U2 — SaaS Operations Manager",
        "name": "Marcus L.",
        "role": "Leiter Operations, B2B SaaS",
        "quote": "Das Navigieren durch die UK GDPR-Unterschiede nach dem Brexit brachte unsere Enterprise-Deals zum Stillstand. CompliHub360 gab uns eine fundierte, zitierte Analyse, die wir vor unserem Vorstand verteidigen konnten. Wir haben unseren größten Deal 40% schneller abgeschlossen.",
        "result": "Deal 40% schneller abgeschlossen",
        "tag": "SaaS · UK GDPR"
      },
      "u3": {
        "persona": "U3 — Agenturdirektorin",
        "name": "Elena R.",
        "role": "Geschäftsführerin, Creative Hub",
        "quote": "Wir expandierten nach Deutschland. Die KI hat genau abgebildet, was für eine Tochtergesellschaft im Vergleich zu einer Niederlassung erforderlich war, und uns über 15.000 € an Beratungskosten und 2 Monate Wartezeit auf vorläufige Rechtsberatung erspart.",
        "result": "15.000 € an Beratung gespart",
        "tag": "Agentur · Corporate"
      },
      "u4": {
        "persona": "U4 — FinTech Compliance",
        "name": "David P.",
        "role": "Compliance-Beauftragter, FinPay",
        "quote": "Die Geschwindigkeit, mit der CompliHub360 unser Produkt gegen FCA-Schwellenwerte abgeglichen hat, war erstaunlich. Live-Verweise auf die Gesetzgebung bauten enormes Vertrauen auf und ermöglichten es uns, unser UK-Pilotprojekt 3 Monate vor dem Zeitplan zu starten.",
        "result": "3 Monate früher gestartet",
        "tag": "FinTech · Regulatorik"
      }
    },
    "trustedLogos": {
      "trustedBy": "Vertraut von Compliance-Teams bei"
    }
}

new_landing_es = {
    "resolution": {
      "badge": "Ejemplo de Salida — Página 1 de 3",
      "titleStart": "Cumplimiento UK",
      "titleEnd": "Instantánea de Riesgo",
      "description": "Tienes tu perfil de riesgo. Ahora soluciónalo. Así es como se ve un dossier típico de expansión en el Reino Unido — y los tres caminos para resolverlo.",
      "risk": {
        "title": "Nivel de Riesgo General",
        "highLevel": "Alto",
        "low": "Bajo",
        "medium": "Medio",
        "high": "Alto",
        "critical": "Crítico"
      },
      "findings": {
        "title": "Hallazgos Clave",
        "item1Title": "Umbral de registro de IVA superado",
        "item1Desc": "Registro obligatorio — umbral HMRC £85,000",
        "item2Title": "Obligación de Productor de Envases EPR",
        "item2Desc": "Registro PRN requerido para el T1 2025",
        "item3Title": "MTD para IVA — Brecha de Registros Digitales",
        "item3Desc": "Brecha de cumplimiento de la fase 2 en el flujo de trabajo actual",
        "item4Title": "UK GDPR — Política de Privacidad",
        "item4Desc": "Cumple con los requisitos básicos de UK GDPR"
      },
      "status": {
        "actionReq": "Acción Req.",
        "review": "Revisar",
        "compliant": "Conforme"
      },
      "unlock": {
        "title": "Tienes tu perfil de riesgo.",
        "subtitle": "Elige cómo quieres resolverlo.",
        "page1Label": "Página 1",
        "page1Value": "Instantánea de Riesgo",
        "page2Label": "Página 2",
        "page2Value": "Plan de Acción",
        "page3Label": "Página 3",
        "page3Value": "Emparejamiento Experto"
      },
      "cta": {
        "primary": "Crear Perfil — Desbloquear Plan de Acción",
        "secondary": "Saltar al Emparejamiento Experto"
      },
      "or": "o",
      "disclaimer": "El Emparejamiento Experto te conecta con un especialista fiscal o legal local verificado que ejecuta el plan de acción en tu nombre."
    },
    "testimonials": {
      "badge": "Resultados Reales",
      "titleStart": "La confianza de fundadores y",
      "titleEnd": "equipos de operaciones",
      "u1": {
        "persona": "U1 — Fundadora de E-Commerce",
        "name": "Sarah K.",
        "role": "Fundadora y CEO, Marca D2C",
        "quote": "Ahorramos 3 semanas de investigación legal en 30 minutos. CompliHub360 detectó a tiempo nuestra obligación de embalaje EPR. El dossier estructurado se envió a nuestro abogado el mismo día, evitando una multa de cumplimiento de 20.000 €.",
        "result": "Evitó Multa de 20.000 €",
        "tag": "E-Commerce · EPR + IVA"
      },
      "u2": {
        "persona": "U2 — Gerente de Operaciones SaaS",
        "name": "Marcus L.",
        "role": "Jefe de Operaciones, B2B SaaS",
        "quote": "Navegar por las diferencias de la UK GDPR post-Brexit estaba paralizando nuestros acuerdos empresariales. CompliHub360 nos dio un análisis fundamentado y citado que pudimos defender ante nuestra junta. Cerramos nuestro mayor acuerdo un 40% más rápido.",
        "result": "Acuerdo Cerrado 40% Más Rápido",
        "tag": "SaaS · UK GDPR"
      },
      "u3": {
        "persona": "U3 — Directora de Agencia",
        "name": "Elena R.",
        "role": "Directora General, Centro Creativo",
        "quote": "Estábamos expandiéndonos a Alemania. La IA detalló exactamente qué se necesitaba para una filial frente a una sucursal, ahorrándonos más de 15.000 € en honorarios de consultoría y 2 meses de espera para asesoramiento legal preliminar.",
        "result": "Ahorró 15.000 € en Consultoría",
        "tag": "Agencia · Corporativo"
      },
      "u4": {
        "persona": "U4 — Cumplimiento FinTech",
        "name": "David P.",
        "role": "Oficial de Cumplimiento, FinPay",
        "quote": "La velocidad a la que CompliHub360 mapeó nuestro producto con los umbrales de la FCA fue sorprendente. Tener referencias en vivo a la legislación generó una inmensa confianza, lo que nos permitió lanzar nuestro piloto en el Reino Unido 3 meses antes de lo programado.",
        "result": "Lanzado 3 Meses Antes",
        "tag": "FinTech · Regulatorio"
      }
    },
    "trustedLogos": {
      "trustedBy": "Confiado por los equipos de cumplimiento en"
    }
}

new_landing_tr = {
    "resolution": {
      "badge": "Örnek Çıktı — Sayfa 1 / 3",
      "titleStart": "UK Uyumluluk",
      "titleEnd": "Risk Özeti",
      "description": "Risk profilinize sahipsiniz. Şimdi onu düzeltin. Tipik bir Birleşik Krallık genişleme dosyasının nasıl göründüğü ve bunu çözmenin üç yolu.",
      "risk": {
        "title": "Genel Risk Seviyesi",
        "highLevel": "Yüksek",
        "low": "Düşük",
        "medium": "Orta",
        "high": "Yüksek",
        "critical": "Kritik"
      },
      "findings": {
        "title": "Temel Bulgular",
        "item1Title": "KDV Kayıt eşiği aşıldı",
        "item1Desc": "Zorunlu kayıt — HMRC eşiği £85,000",
        "item2Title": "EPR Ambalaj Üreticisi Yükümlülüğü",
        "item2Desc": "2025'in 1. çeyreğine kadar PRN kaydı gerekiyor",
        "item3Title": "KDV için MTD — Dijital Kayıt Açığı",
        "item3Desc": "Mevcut iş akışında 2. aşama uyumluluk açığı",
        "item4Title": "UK GDPR — Gizlilik Politikası",
        "item4Desc": "Temel UK GDPR gereksinimlerini karşılıyor"
      },
      "status": {
        "actionReq": "İşlem Gerk.",
        "review": "İncele",
        "compliant": "Uyumlu"
      },
      "unlock": {
        "title": "Risk profilinizi aldınız.",
        "subtitle": "Nasıl çözmek istediğinizi seçin.",
        "page1Label": "Sayfa 1",
        "page1Value": "Risk Özeti",
        "page2Label": "Sayfa 2",
        "page2Value": "Eylem Planı",
        "page3Label": "Sayfa 3",
        "page3Value": "Uzman Eşleşmesi"
      },
      "cta": {
        "primary": "Profil Oluştur — Eylem Planını Aç",
        "secondary": "Uzman Eşleşmesine Geç"
      },
      "or": "veya",
      "disclaimer": "Uzman Eşleşmesi, eylem planını sizin adınıza yürütecek onaylı bir yerel vergi veya hukuk uzmanıyla sizi buluşturur."
    },
    "testimonials": {
      "badge": "Gerçek Sonuçlar",
      "titleStart": "Kurucuların ve operasyon",
      "titleEnd": "ekiplerinin güvendiği",
      "u1": {
        "persona": "U1 — E-Ticaret Kurucusu",
        "name": "Sarah K.",
        "role": "Kurucu & CEO, D2C Markası",
        "quote": "30 dakikada 3 haftalık yasal araştırma tasarrufu sağladık. CompliHub360, EPR ambalaj yükümlülüğümüzü erkenden tespit etti. Yapılandırılmış dosya aynı gün avukatımıza gönderildi ve 20.000 €'luk bir uyumluluk cezasını önledi.",
        "result": "20.000 € Ceza Önlendi",
        "tag": "E-Ticaret · EPR + KDV"
      },
      "u2": {
        "persona": "U2 — SaaS Operasyon Yöneticisi",
        "name": "Marcus L.",
        "role": "Operasyon Başkanı, B2B SaaS",
        "quote": "Brexit sonrası Birleşik Krallık GDPR farklılıklarında gezinmek, kurumsal anlaşmalarımızı durduruyordu. CompliHub360 bize yönetim kurulumuzun önünde savunabileceğimiz temelli ve alıntılanmış bir analiz verdi. En büyük anlaşmamızı %40 daha hızlı kapattık.",
        "result": "Anlaşma %40 Daha Hızlı Kapandı",
        "tag": "SaaS · UK GDPR"
      },
      "u3": {
        "persona": "U3 — Ajans Direktörü",
        "name": "Elena R.",
        "role": "Genel Müdür, Yaratıcı Hub",
        "quote": "Almanya'ya açılıyorduk. Yapay zeka, bir şube yerine bağlı kuruluş için tam olarak ne gerektiğini eşleştirdi, bu da bize danışmanlık ücretlerinden 15.000 €'dan fazla tasarruf sağladı ve ön hukuki tavsiye için 2 aylık beklemeyi ortadan kaldırdı.",
        "result": "Danışmanlıktan 15.000 € Tasarruf Edildi",
        "tag": "Ajans · Kurumsal"
      },
      "u4": {
        "persona": "U4 — FinTech Uyumluluğu",
        "name": "David P.",
        "role": "Uyumluluk Sorumlusu, FinPay",
        "quote": "CompliHub360'ın ürünümüzü FCA eşiklerine göre haritalama hızı şaşırtıcıydı. Mevzuata canlı referansların olması büyük bir güven yarattı ve İngiltere pilotumuzu planlanandan 3 ay önce başlatmamıza olanak sağladı.",
        "result": "3 Ay Erken Başlatıldı",
        "tag": "FinTech · Mevzuat"
      }
    },
    "trustedLogos": {
      "trustedBy": "Şu şirketlerin uyumluluk ekipleri tarafından güvenilir:"
    }
}


components_en = {
    "engagementModal": {
      "title": "Request Proposal from {{providerName}}",
      "market": "Market: {{providerName}}",
      "category": "Category: {{category}}",
      "detailsLabel": "Additional Details",
      "optional": "Optional",
      "detailsPlaceholder": "Add any specific requirements, timelines, or context for the provider...",
      "privacyNotice": "Protected by AI Privacy Gate. Your request is anonymized until you choose to reveal your identity to the provider.",
      "cancel": "Cancel",
      "submit": "Submit Request",
      "sent": "Sent!"
    }
}
components_de = {
    "engagementModal": {
      "title": "Angebot von {{providerName}} anfordern",
      "market": "Markt: {{market}}",
      "category": "Kategorie: {{category}}",
      "detailsLabel": "Zusätzliche Details",
      "optional": "Optional",
      "detailsPlaceholder": "Fügen Sie spezifische Anforderungen, Zeitpläne oder Kontext für den Anbieter hinzu...",
      "privacyNotice": "Geschützt durch das AI Privacy Gate. Ihre Anfrage wird anonymisiert, bis Sie sich entscheiden, Ihre Identität gegenüber dem Anbieter offenzulegen.",
      "cancel": "Abbrechen",
      "submit": "Anfrage senden",
      "sent": "Gesendet!"
    }
}
components_es = {
    "engagementModal": {
      "title": "Solicitar Propuesta a {{providerName}}",
      "market": "Mercado: {{market}}",
      "category": "Categoría: {{category}}",
      "detailsLabel": "Detalles Adicionales",
      "optional": "Opcional",
      "detailsPlaceholder": "Añade requisitos específicos, plazos o contexto para el proveedor...",
      "privacyNotice": "Protegido por AI Privacy Gate. Tu solicitud es anónima hasta que elijas revelar tu identidad al proveedor.",
      "cancel": "Cancelar",
      "submit": "Enviar Solicitud",
      "sent": "¡Enviado!"
    }
}
components_tr = {
    "engagementModal": {
      "title": "{{providerName}}'dan Teklif İste",
      "market": "Pazar: {{market}}",
      "category": "Kategori: {{category}}",
      "detailsLabel": "Ek Detaylar",
      "optional": "İsteğe bağlı",
      "detailsPlaceholder": "Sağlayıcı için spesifik gereksinimler, zaman çizelgeleri veya bağlam ekleyin...",
      "privacyNotice": "Yapay Zeka Gizlilik Kapısı ile korunmaktadır. Sağlayıcıya kimliğinizi açıklamayı seçene kadar isteğiniz anonimleştirilir.",
      "cancel": "İptal",
      "submit": "İsteği Gönder",
      "sent": "Gönderildi!"
    }
}

landing_data = {
    'en': new_landing_en,
    'de': new_landing_de,
    'es': new_landing_es,
    'tr': new_landing_tr
}
components_data = {
    'en': components_en,
    'de': components_de,
    'es': components_es,
    'tr': components_tr
}

for lang in languages:
    filepath = os.path.join(locales_dir, lang, "common.json")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Merge landing
    if 'landing' not in data:
        data['landing'] = {}
    for k, v in landing_data[lang].items():
        data['landing'][k] = v

    # Merge components
    if 'components' not in data:
        data['components'] = {}
    for k, v in components_data[lang].items():
        data['components'][k] = v
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Locales updated with RiskResolution, TestimonialTicker, TrustedLogosTicker, and EngagementModal.")
