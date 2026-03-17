import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { Typography } from "../../../components/ui/Typography";

const TRACKING_TOOLS = [
    { value: "ga4", label: "Google Analytics 4", icon: "analytics" },
    { value: "meta_pixel", label: "Meta / Facebook Pixel", icon: "thumb_up" },
    { value: "tiktok_pixel", label: "TikTok Pixel", icon: "music_video" },
    { value: "google_ads", label: "Google Ads Conversion", icon: "ads_click" },
    { value: "linkedin_insight", label: "LinkedIn Insight Tag", icon: "work" },
    { value: "hotjar", label: "Hotjar / Clarity", icon: "touch_app" },
    { value: "klaviyo", label: "Klaviyo / Email Marketing", icon: "mail" },
    { value: "hubspot", label: "HubSpot / CRM", icon: "contacts" },
    { value: "no_tools", label: "None of the above", icon: "block" },
];

const DATA_CATEGORIES = [
    { value: "email_addresses", label: "Email addresses", icon: "mail" },
    { value: "purchase_history", label: "Purchase history / order data", icon: "shopping_cart" },
    { value: "location_data", label: "Location data", icon: "location_on" },
    { value: "ip_addresses", label: "IP addresses / cookies", icon: "dns" },
    { value: "health_data", label: "Health data", icon: "favorite" },
    { value: "financial_data", label: "Financial / payment data", icon: "credit_card" },
    { value: "behavioral_data", label: "User behavior & click tracking", icon: "mouse" },
    { value: "none", label: "No personal data", icon: "person_off" },
];

const PROCESSING_LOCATIONS = [
    { value: "eu_only", label: "EU / EEA only", description: "All servers and tools are located within the EU or EEA.", icon: "language" },
    { value: "us_transfers", label: "US data transfers", description: "I use US-based services (Google, Meta, AWS US, etc.).", icon: "flight_takeoff" },
    { value: "mixed", label: "Mixed / Unknown", description: "I'm not sure where all tools are processing data.", icon: "help" },
];

const CONSENT_STATUS = [
    { value: "yes_full", label: "Yes — full consent management", description: "Cookie banner with opt-in active (e.g. Cookiebot, OneTrust).", icon: "verified" },
    { value: "yes_basic", label: "Yes — basic cookie banner", description: "Notice banner without proper opt-in implemented.", icon: "info" },
    { value: "no", label: "No — no consent tool", description: "No active consent management in place.", icon: "cancel" },
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
            label: "EU Customers",
            isValid: !!euCustomers,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Do you have customers in the EU / EEA?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            GDPR applies to any company processing personal data of EU citizens — regardless of where your company is based.
                        </Typography>
                    </div>
                    <YesNoToggle value={euCustomers} onChange={setEuCustomers} />
                    {euCustomers === "no" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                            <span>Without EU customers, GDPR doesn't apply directly. Local data protection laws (e.g. CCPA) may still be relevant.</span>
                        </div>
                    )}
                    {euCustomers === "yes" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">info</span>
                            <span>GDPR is mandatory for you. Fines can reach up to 4% of global annual turnover or €20M — whichever is higher.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Data Categories",
            isValid: dataCategories.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">What data do you collect from users?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Different data categories require different safeguards. Health and financial data are especially sensitive under GDPR Article 9.
                        </Typography>
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
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
                            <span><strong>Health data is a special category (GDPR Art. 9).</strong> Stricter requirements apply: explicit consent, data protection impact assessment (DPIA), and regular audits are mandatory.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Tracking & Tools",
            isValid: trackingTools.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Which tracking and marketing tools do you use?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Every tool that captures or transfers user data to third parties must be listed in your privacy policy and activated via consent.
                        </Typography>
                    </div>
                    <MultiSelectChips
                        options={TRACKING_TOOLS}
                        value={trackingTools}
                        onChange={setTrackingTools}
                    />
                    {mismatch && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
                            <span><strong>Contradiction detected:</strong> You use tracking tools but indicated you collect no personal data. Tracking pixels inherently transmit user data (IP, behavior).</span>
                        </div>
                    )}
                    {usesUSTools && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">flight_takeoff</span>
                            <span>US services (Google, Meta, TikTok) transfer data to the United States. This requires Standard Contractual Clauses (SCCs) and a Data Processing Agreement (DPA).</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Consent & Processing",
            isValid: !!processingLocation && !!consentStatus,
            content: (
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Data processing & consent management</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Two critical GDPR requirements: where is your data stored, and are you collecting valid consent?
                        </Typography>
                    </div>
                    <div>
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            WHERE IS YOUR DATA PROCESSED?
                        </Typography>
                        <SingleSelectCardGroup
                            options={PROCESSING_LOCATIONS}
                            value={processingLocation}
                            onChange={setProcessingLocation}
                        />
                    </div>
                    <div className="border-t border-neutral-100 pt-8">
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            DO YOU USE A CONSENT MANAGEMENT TOOL?
                        </Typography>
                        <SingleSelectCardGroup
                            options={CONSENT_STATUS}
                            value={consentStatus}
                            onChange={setConsentStatus}
                        />
                    </div>
                    {noConsent && hasRisk && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                            <span><strong>High GDPR risk:</strong> You're using tracking tools without a consent banner. Every EU visitor to your site constitutes a data protection violation. Immediate action required.</span>
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
