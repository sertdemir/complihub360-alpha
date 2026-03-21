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
    wizard: {
        reviewPanel: {
            primaryCountry: "Primary Country",
            additionalMarkets: "Additional Markets",
            category: "Compliance Category",
            businessType: "Business Type",
            marketScope: "Market Scope",
            riskSignals: "Risk Signals",
            revenue: "Annual Revenue",
            intent: "Intent",
            generateCTA: "Generate My Compliance Results",
            register: "Register",
            registerDesc: "to save and edit these answers later in your dashboard."
        }
    }
};

const newDE = {
    wizard: {
        reviewPanel: {
            primaryCountry: "Hauptland",
            additionalMarkets: "Weitere Märkte",
            category: "Compliance-Kategorie",
            businessType: "Geschäftstyp",
            marketScope: "Marktabdeckung",
            riskSignals: "Risikosignale",
            revenue: "Jahresumsatz",
            intent: "Absicht",
            generateCTA: "Meine Compliance-Ergebnisse generieren",
            register: "Registrieren",
            registerDesc: "um diese Antworten später in Ihrem Dashboard zu speichern und zu bearbeiten."
        }
    }
};

const newES = {
    wizard: {
        reviewPanel: {
            primaryCountry: "País Principal",
            additionalMarkets: "Mercados Adicionales",
            category: "Categoría de Cumplimiento",
            businessType: "Tipo de Negocio",
            marketScope: "Alcance del Mercado",
            riskSignals: "Señales de Riesgo",
            revenue: "Ingresos Anuales",
            intent: "Intención",
            generateCTA: "Generar Mis Resultados de Cumplimiento",
            register: "Registrarse",
            registerDesc: "para guardar y editar estas respuestas más tarde en su panel de control."
        }
    }
};

const newTR = {
    wizard: {
        reviewPanel: {
            primaryCountry: "Ana Ülke",
            additionalMarkets: "Ek Pazarlar",
            category: "Uyumluluk Kategorisi",
            businessType: "İşletme Türü",
            marketScope: "Pazar Kapsamı",
            riskSignals: "Risk Sinyalleri",
            revenue: "Yıllık Gelir",
            intent: "Niyet",
            generateCTA: "Uyumluluk Sonuçlarımı Oluştur",
            register: "Kayıt Ol",
            registerDesc: "bu cevapları daha sonra panelinizde kaydetmek ve düzenlemek için."
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
