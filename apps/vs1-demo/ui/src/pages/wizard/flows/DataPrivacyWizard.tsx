import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";

const TRACKING_TOOLS = [
    { value: "ga4", label: "Google Analytics 4", icon: "analytics" },
    { value: "meta_pixel", label: "Meta / Facebook Pixel", icon: "thumb_up" },
    { value: "tiktok_pixel", label: "TikTok Pixel", icon: "music_video" },
    { value: "google_ads", label: "Google Ads Conversion", icon: "ads_click" },
    { value: "linkedin_insight", label: "LinkedIn Insight Tag", icon: "work" },
    { value: "hotjar", label: "Hotjar / Clarity", icon: "touch_app" },
    { value: "klaviyo", label: "Klaviyo / E-Mail-Marketing", icon: "mail" },
    { value: "hubspot", label: "HubSpot / CRM", icon: "contacts" },
    { value: "no_tools", label: "Keine der oben genannten", icon: "block" },
];

const DATA_CATEGORIES = [
    { value: "email_addresses", label: "E-Mail-Adressen", icon: "mail" },
    { value: "purchase_history", label: "Kaufhistorie / Bestelldaten", icon: "shopping_cart" },
    { value: "location_data", label: "Standortdaten", icon: "location_on" },
    { value: "ip_addresses", label: "IP-Adressen / Cookies", icon: "dns" },
    { value: "health_data", label: "Gesundheitsdaten", icon: "favorite" },
    { value: "financial_data", label: "Finanzdaten / Zahlungsdaten", icon: "credit_card" },
    { value: "behavioral_data", label: "Nutzerverhalten & Klicks", icon: "mouse" },
    { value: "none", label: "Keine personenbezogenen Daten", icon: "person_off" },
];

const PROCESSING_LOCATIONS = [
    { value: "eu_only", label: "Nur EU / EWR", description: "Alle Server und Tools liegen in der EU oder dem EWR.", icon: "language" },
    { value: "us_transfers", label: "USA-Datenübertragung", description: "Ich nutze US-Dienste (Google, Meta, AWS US etc.).", icon: "flight_takeoff" },
    { value: "mixed", label: "Gemischt / Unbekannt", description: "Ich bin mir nicht sicher, wo alle Tools verarbeiten.", icon: "help" },
];

const CONSENT_STATUS = [
    { value: "yes_full", label: "Ja — vollständiges Consent-Management", description: "Cookie-Banner mit Opt-In aktiv (z.B. Cookiebot, OneTrust).", icon: "verified" },
    { value: "yes_basic", label: "Ja — einfaches Cookie-Banner", description: "Hinweis-Banner ohne richtiges Opt-In implementiert.", icon: "info" },
    { value: "no", label: "Nein — kein Consent-Tool", description: "Keine aktive Einwilligungsverwaltung vorhanden.", icon: "cancel" },
];

export function DataPrivacyWizard() {
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [euCustomers, setEuCustomers] = useState<"yes" | "no" | "">("");
    const [dataCategories, setDataCategories] = useState<string[]>([]);
    const [trackingTools, setTrackingTools] = useState<string[]>([]);
    const [processingLocation, setProcessingLocation] = useState("");
    const [consentStatus, setConsentStatus] = useState("");

    const hasRisk = trackingTools.length > 0 && !trackingTools.includes("no_tools");
    const usesUSTools = trackingTools.some(t => ["ga4", "meta_pixel", "tiktok_pixel", "google_ads"].includes(t));
    const noConsent = consentStatus === "no";
    const mismatch = dataCategories.includes("none") && hasRisk;

    const steps = [
        {
            label: "EU-Kundschaft",
            isValid: !!euCustomers,
            content: (
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Hast du Kunden in der EU / im EWR?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Die DSGVO gilt für jedes Unternehmen, das personenbezogene Daten von EU-Bürgern verarbeitet — unabhängig vom Firmensitz.
                        </p>
                    </div>
                    <YesNoToggle value={euCustomers} onChange={setEuCustomers} />
                    {euCustomers === "no" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">check_circle</span>
                            Ohne EU-Kundschaft gilt die DSGVO nicht direkt. Lokale Datenschutzgesetze (z.B. CCPA) können trotzdem relevant sein.
                        </div>
                    )}
                    {euCustomers === "yes" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                            Die DSGVO ist für dich verpflichtend. Bußgelder können bis zu 4% des weltweiten Jahresumsatzes betragen.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Data Categories",
            isValid: dataCategories.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Welche Daten erfasst du von Nutzern?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Verschiedene Datenkategorien erfordern unterschiedliche Schutzmaßnahmen. Gesundheits- und Finanzdaten sind besonders sensibel.
                        </p>
                    </div>
                    <MultiSelectChips
                        options={DATA_CATEGORIES}
                        value={dataCategories}
                        onChange={v => {
                            setDataCategories(v);
                            dispatch({ type: "SET_RISK_SIGNALS", payload: [...profile.riskSignals.filter(s => !DATA_CATEGORIES.map(d => d.value).includes(s)), ...v] });
                        }}
                    />
                    {dataCategories.includes("health_data") && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            <strong>Gesundheitsdaten sind besondere Datenkategorien (Art. 9 DSGVO).</strong> Hierfür gelten verschärfte Anforderungen: explizite Einwilligung, Datenschutz-Folgenabschätzung (DSFA) und regelmäßige Audits.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Tracking & Tools",
            isValid: trackingTools.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Welche Tracking- und Marketing-Tools nutzt du?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Jedes Tool, das Nutzerdaten erfasst oder an Dritte überträgt, muss in deiner Datenschutzerklärung genannt und per Einwilligung aktiviert werden.
                        </p>
                    </div>
                    <MultiSelectChips
                        options={TRACKING_TOOLS}
                        value={trackingTools}
                        onChange={setTrackingTools}
                    />
                    {mismatch && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            <strong>Widerspruch erkannt:</strong> Du nutzt Tracking-Tools, hast aber angegeben, keine personenbezogenen Daten zu erfassen. Tracking-Pixel übertragen per Definition Nutzerdaten (IP, Verhalten).
                        </div>
                    )}
                    {usesUSTools && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">flight_takeoff</span>
                            US-Dienste (Google, Meta, TikTok) übertragen Daten in die USA. Dies erfordert Standardvertragsklauseln (SCCs) und einen Verarbeitungsvertrag (DPA).
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Consent & Verarbeitung",
            isValid: !!processingLocation && !!consentStatus,
            content: (
                <div className="flex flex-col gap-7">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Datenverarbeitung & Einwilligungsmanagement</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Zwei kritische DSGVO-Anforderungen: Wo liegen deine Daten, und holst du rechtsgültige Einwilligung ein?
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Wo werden deine Daten verarbeitet?</p>
                        <SingleSelectCardGroup
                            options={PROCESSING_LOCATIONS}
                            value={processingLocation}
                            onChange={setProcessingLocation}
                        />
                    </div>
                    <div className="border-t border-slate-800 pt-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Nutzt du ein Consent-Management-Tool?</p>
                        <SingleSelectCardGroup
                            options={CONSENT_STATUS}
                            value={consentStatus}
                            onChange={setConsentStatus}
                        />
                    </div>
                    {noConsent && hasRisk && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
                            <strong>Hohes DSGVO-Risiko:</strong> Du verwendest Tracking-Tools ohne Einwilligungsbanner. Jeder Seitenaufruf eines EU-Nutzers stellt eine Datenschutzverletzung dar. Sofortiger Handlungsbedarf.
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <WizardFlowShell
            steps={steps}
            currentStep={step}
            categoryRoute="/wizard/data-privacy"
            onNext={() => setStep(s => s + 1)}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
