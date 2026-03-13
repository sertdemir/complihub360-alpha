import { useNavigate } from "react-router-dom";
import { useWizard, WizardCategory } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { MultiSelectChips } from "../../components/wizard/questions/MultiSelectChips";
import { Typography } from "../../components/ui/Typography";

interface ChipOption { value: string; label: string; icon?: string; }

const RISK_SIGNALS: Record<WizardCategory | string, ChipOption[]> = {
    "tax-vat": [
        { value: "marketplace_seller", label: "Marketplace seller", icon: "shopping_bag" },
        { value: "cross_border_shipping", label: "Cross-border shipping", icon: "local_shipping" },
        { value: "warehouse_abroad", label: "Warehouse abroad", icon: "warehouse" },
        { value: "digital_goods", label: "Digital goods / services", icon: "cloud" },
        { value: "high_volume", label: "High transaction volume", icon: "trending_up" },
        { value: "vat_registered", label: "Already VAT registered", icon: "receipt_long" },
    ],
    "epr": [
        { value: "physical_goods", label: "Sells physical goods", icon: "inventory_2" },
        { value: "own_packaging", label: "Uses custom packaging", icon: "package_2" },
        { value: "dropshipper", label: "Dropshipper / unbranded", icon: "swap_horiz" },
        { value: "electronics", label: "Electronics category", icon: "devices" },
        { value: "importer", label: "Imports from outside EU", icon: "flight_land" },
        { value: "recycling_fee", label: "Not paying recycling fee", icon: "recycling" },
    ],
    "data-privacy": [
        { value: "ga4", label: "Google Analytics (GA4)", icon: "analytics" },
        { value: "meta_pixel", label: "Meta Pixel", icon: "thumb_up" },
        { value: "tiktok_pixel", label: "TikTok Pixel", icon: "music_note" },
        { value: "email_marketing", label: "Email marketing", icon: "mail" },
        { value: "crm_tool", label: "CRM / contact data", icon: "contacts" },
        { value: "no_consent_banner", label: "No consent management", icon: "block" },
    ],
    "marketing-seo": [
        { value: "health_claims", label: "Health / supplement claims", icon: "medication" },
        { value: "guaranteed_claims", label: '"Guaranteed" or "#1" claims', icon: "workspace_premium" },
        { value: "google_ads", label: "Google Ads", icon: "ads_click" },
        { value: "meta_ads", label: "Meta / Facebook Ads", icon: "thumb_up" },
        { value: "influencer", label: "Influencer marketing", icon: "star" },
        { value: "cookie_popup", label: "No cookie consent", icon: "block" },
    ],
    "corporate": [
        { value: "individual_seller", label: "No legal entity yet", icon: "person" },
        { value: "foreign_register", label: "Registering abroad", icon: "flight_takeoff" },
        { value: "multi_entity", label: "Multiple entities", icon: "account_tree" },
        { value: "remote_team", label: "Remote / international team", icon: "groups" },
        { value: "investor_ready", label: "Preparing for investment", icon: "trending_up" },
    ],
    "full-support": [
        { value: "multi_country", label: "Operating in 3+ countries", icon: "public" },
        { value: "all_categories", label: "Multiple compliance areas", icon: "category" },
        { value: "fast_needed", label: "Urgent / fast turnaround", icon: "bolt" },
        { value: "no_team", label: "No in-house compliance", icon: "person_off" },
        { value: "audit_needed", label: "Need compliance audit", icon: "fact_check" },
    ],
    "": [],
};

const CATEGORY_HEADLINE: Record<string, string> = {
    "tax-vat": "What are your main tax risk factors?",
    "epr": "What are your main packaging or product situations?",
    "data-privacy": "Which data tools or practices apply to you?",
    "marketing-seo": "What are your main marketing risk areas?",
    "corporate": "What best describes your corporate situation?",
    "full-support": "What are your main challenges?",
};

export function WizardRiskStep() {
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();

    const options = RISK_SIGNALS[profile.category] || [];
    const headline = CATEGORY_HEADLINE[profile.category] || "What are your main risk areas?";

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={5} totalSteps={6} stepLabel="Risk Signals" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">
                                {headline}
                            </Typography>
                            <Typography variant="body" className="text-neutral-600">
                                Select all that apply — this helps us calculate your risk level and find the best providers.
                            </Typography>
                        </div>
                        <MultiSelectChips
                            options={options}
                            value={profile.riskSignals}
                            onChange={v => dispatch({ type: "SET_RISK_SIGNALS", payload: v })}
                        />
                        {profile.riskSignals.length > 0 && (
                            <div className="p-4 rounded-lg bg-primary-50 border border-primary-200 text-xs text-primary-900 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary-600 text-[18px]">info</span>
                                <div>
                                    <span className="font-semibold">{profile.riskSignals.length} risk signal{profile.riskSignals.length > 1 ? "s" : ""}</span> detected — we'll weight provider results accordingly.
                                </div>
                            </div>
                        )}
                    </div>
                    <WizardFooter
                        onBack={() => navigate("/wizard/markets")}
                        onNext={() => navigate("/wizard/complexity")}
                        onSkip={() => navigate("/wizard/complexity")}
                        nextDisabled={false}
                        nextLabel="Continue"
                    />
                </div>
            </main>
        </div>
    );
}
