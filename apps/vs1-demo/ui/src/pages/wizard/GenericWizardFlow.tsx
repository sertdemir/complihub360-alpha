import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWizard, BusinessType, RevenueBand } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { WizardReviewPanel } from "../../components/wizard/WizardReviewPanel";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../components/wizard/questions/MultiSelectChips";
import { CountryMultiSelect } from "../../components/wizard/questions/CountryMultiSelect";
import { RangeSelector } from "../../components/wizard/questions/RangeSelector";
import { FreeText } from "../../components/wizard/questions/FreeText";
import { Typography } from "../../components/ui/Typography";
import type { WizardCategory } from "../../components/wizard/WizardContext";

// ─── Data ─────────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
    { value: "ecommerce", label: "E-Commerce Brand", description: "Sell own products via your website or marketplace.", icon: "storefront" },
    { value: "marketplace", label: "Marketplace Seller", description: "Sell via Amazon, Shopify, eBay, Etsy, etc.", icon: "shopping_bag" },
    { value: "saas", label: "SaaS / Software", description: "Digital products, subscriptions, or software services.", icon: "cloud" },
    { value: "agency", label: "Agency / Consultant", description: "Services, consulting, or creative work for clients.", icon: "groups" },
    { value: "other", label: "Other", description: "Tell us a bit more about your business.", icon: "more_horiz" },
];

const MARKET_SCOPES = [
    { value: "local", label: "Local Only", description: "I only operate within my primary country.", icon: "home" },
    { value: "eu", label: "EU / Europe", description: "I sell to or operate across multiple EU countries.", icon: "public" },
    { value: "global", label: "Global", description: "I operate in markets outside Europe.", icon: "travel_explore" },
];

const REVENUE_BANDS = [
    { value: "lt-10k", label: "< €10k", sublabel: "per year" },
    { value: "10k-100k", label: "€10k–100k", sublabel: "per year" },
    { value: "100k-1m", label: "€100k–1M", sublabel: "per year" },
    { value: "gt-1m", label: "> €1M", sublabel: "per year" },
];

const INTENTS = [
    { value: "self-check", label: "Quick self-check", description: "Get immediate feedback on basic requirements.", icon: "fact_check" },
    { value: "expert", label: "Expert advice", description: "Speak with a specialist for complex cases.", icon: "psychology" },
    { value: "full-service", label: "Full service", description: "End-to-end management by our team.", icon: "verified_user" },
];

const URGENCIES = [
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "researching", label: "Just researching" },
];

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

// ─── Slide variants ───────────────────────────────────────────────────────────

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GenericWizardFlow() {
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [noteOpen, setNoteOpen] = useState(false);
    const [showAdditionalMarkets, setShowAdditionalMarkets] = useState(false);

    const totalSteps = 5; // Context, Markets, Risk, Complexity, Review

    const riskOptions = RISK_SIGNALS[profile.category] || [];
    const riskHeadline = CATEGORY_HEADLINE[profile.category] || "What are your main risk areas?";

    const handleTypeChange = (val: string) => {
        dispatch({ type: "SET_BUSINESS_TYPE", payload: val as BusinessType });
        if (val === "other") setNoteOpen(true);
    };

    const handleNext = () => {
        setDirection(1);
        setStep(s => s + 1);
    };

    const handleBack = () => {
        setDirection(-1);
        if (step === 0) {
            navigate("/wizard/category");
        } else {
            setStep(s => s - 1);
        }
    };

    const isReview = step === 4;

    const stepConfigs = [
        {
            label: "Business Context",
            isValid: !!profile.businessType,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">How would you describe your business?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            This helps us tailor the right compliance questions for your situation.
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={BUSINESS_TYPES}
                        value={profile.businessType}
                        onChange={handleTypeChange}
                    />
                    {(profile.businessType === "other" || noteOpen) && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <FreeText
                                label="Tell us more about your business"
                                description="Optional — helps us suggest the most relevant providers."
                                value={profile.businessTypeNote}
                                onChange={v => dispatch({ type: "SET_BUSINESS_TYPE_NOTE", payload: v })}
                                placeholder="e.g. I run a drop-shipping business across EU markets..."
                            />
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Market Scope",
            isValid: !!profile.marketScope,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Where do you sell or operate?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Compliance requirements differ significantly based on your operating scope.
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={MARKET_SCOPES}
                        value={profile.marketScope}
                        onChange={v => dispatch({ type: "SET_MARKET_SCOPE", payload: v as "local" | "eu" | "global" })}
                    />
                    {profile.marketScope === "global" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">tips_and_updates</span>
                            <span>Compliance rules differ significantly outside the EU. Consider our Full Support package for broader coverage.</span>
                        </div>
                    )}
                    <AnimatePresence>
                        {(profile.marketScope === "eu" || profile.marketScope === "global") && profile.country && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="border-t border-neutral-200 pt-6 overflow-hidden flex flex-col items-start"
                            >
                                <button
                                    onClick={() => setShowAdditionalMarkets(!showAdditionalMarkets)}
                                    className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showAdditionalMarkets ? "remove_circle_outline" : "add_circle_outline"}
                                    </span>
                                    {showAdditionalMarkets ? "Hide specific markets" : "Select specific additional markets (Optional)"}
                                </button>
                                
                                <AnimatePresence>
                                    {showAdditionalMarkets && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden w-full"
                                        >
                                            <CountryMultiSelect
                                                primaryCountry={profile.country}
                                                value={profile.markets.filter(m => m !== profile.country)}
                                                onChange={countries => dispatch({ type: "SET_MARKETS", payload: [profile.country, ...countries] })}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ),
        },
        {
            label: "Risk Signals",
            isValid: true,
            isOptional: true,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{riskHeadline}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Select all that apply — this helps us calculate your risk level and find the best providers.
                        </Typography>
                    </div>
                    <MultiSelectChips
                        options={riskOptions}
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
            ),
        },
        {
            label: "Complexity & Intent",
            isValid: !!profile.revenueBand,
            content: (
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">Last step — tell us your scale & goal.</Typography>
                            <Typography variant="body" className="text-neutral-600">
                                This helps rank providers by relevance and match the right service tier.
                            </Typography>
                        </div>
                        <div>
                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                ANNUAL REVENUE
                            </Typography>
                            <RangeSelector
                                bands={REVENUE_BANDS}
                                value={profile.revenueBand}
                                onChange={v => dispatch({ type: "SET_REVENUE_BAND", payload: v as RevenueBand })}
                            />
                        </div>
                    </div>
                    <div className="border-t border-neutral-200 pt-8">
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            WHAT DO YOU NEED RIGHT NOW?
                        </Typography>
                        <SingleSelectCardGroup
                            options={INTENTS}
                            value={profile.intent}
                            onChange={v => dispatch({ type: "SET_INTENT", payload: v as "self-check" | "expert" | "full-service" })}
                        />
                    </div>
                    <div className="border-t border-neutral-200 pt-8">
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            HOW URGENT IS THIS?
                        </Typography>
                        <div className="flex flex-wrap gap-3">
                            {URGENCIES.map(u => {
                                const isSelected = profile.urgency === u.value;
                                return (
                                    <button
                                        key={u.value}
                                        onClick={() => dispatch({ type: "SET_URGENCY", payload: u.value as "today" | "week" | "month" | "researching" })}
                                        className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                                            isSelected
                                                ? "bg-primary-600 border-primary-600 text-white shadow-sm ring-2 ring-primary-100 ring-offset-1"
                                                : "border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-neutral-50"
                                        }`}
                                    >
                                        {u.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    const currentConfig = stepConfigs[step];

    return (
        <div className="w-full flex flex-col items-center justify-center text-neutral-900 font-['Inter',sans-serif]">
            <main className="w-full flex flex-col items-center justify-center px-4 py-8">
                <motion.div 
                    layout
                    transition={{ layout: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }}
                    className="w-full max-w-3xl bg-white border border-white/20 rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col wizard-card cursor-auto"
                >
                    <WizardStepper
                        currentStep={step + 1}
                        totalSteps={totalSteps}
                        stepLabel={isReview ? "Review" : currentConfig?.label ?? ""}
                    />

                    <div className="relative overflow-hidden w-full flex-1">
                        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                className="w-full px-8 py-8 flex flex-col gap-6"
                            >
                                {!isReview && currentConfig?.content}
                                {isReview && (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-primary-600 text-2xl">checklist</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Typography variant="h2">Review your answers</Typography>
                                                <Typography variant="body" className="text-neutral-600">
                                                    Confirm everything looks right before we generate your results.
                                                </Typography>
                                            </div>
                                        </div>
                                        <WizardReviewPanel onGenerateResults={() => navigate("/results", { state: { searchProfile: profile } })} isGuest={true} />
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {!isReview && (
                        <WizardFooter
                            onBack={handleBack}
                            onNext={handleNext}
                            onSkip={currentConfig?.isOptional ? () => { setDirection(1); setStep(s => s + 1); } : undefined}
                            nextDisabled={!currentConfig?.isValid}
                            nextLabel={step === 3 ? "Review Answers" : undefined}
                        />
                    )}
                    {isReview && (
                        <div className="px-8 py-5 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-primary-600 transition-colors group"
                            >
                                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                                Back to previous step
                            </button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
