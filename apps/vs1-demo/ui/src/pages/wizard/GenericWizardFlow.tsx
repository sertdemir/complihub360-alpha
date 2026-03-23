import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
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
import { YesNoToggle } from "../../components/wizard/questions/YesNoToggle";
import { Typography } from "../../components/ui/Typography";
import type { WizardCategory } from "../../components/wizard/WizardContext";

// ─── Data ─────────────────────────────────────────────────────────────────────

const getBusinessTypes = (t: TFunction) => [
    { value: "ecommerce", label: t('wizard.businessTypes.ecommerce.label', "E-Commerce Brand"), description: t('wizard.businessTypes.ecommerce.desc', "Sell own products via your website or marketplace."), icon: "storefront" },
    { value: "marketplace", label: t('wizard.businessTypes.marketplace.label', "Marketplace Seller"), description: t('wizard.businessTypes.marketplace.desc', "Sell via Amazon, Shopify, eBay, Etsy, etc."), icon: "shopping_bag" },
    { value: "saas", label: t('wizard.businessTypes.saas.label', "SaaS / Software"), description: t('wizard.businessTypes.saas.desc', "Digital products, subscriptions, or software services."), icon: "cloud" },
    { value: "agency", label: t('wizard.businessTypes.agency.label', "Agency / Consultant"), description: t('wizard.businessTypes.agency.desc', "Services, consulting, or creative work for clients."), icon: "groups" },
    { value: "other", label: t('wizard.businessTypes.other.label', "Other"), description: t('wizard.businessTypes.other.desc', "Tell us a bit more about your business."), icon: "more_horiz" },
];

const getMarketScopes = (t: TFunction) => [
    { value: "local", label: t('wizard.marketScopes.local.label', "Local Only"), description: t('wizard.marketScopes.local.desc', "I only operate within my primary country."), icon: "home" },
    { value: "eu", label: t('wizard.marketScopes.eu.label', "EU / Europe"), description: t('wizard.marketScopes.eu.desc', "I sell to or operate across multiple EU countries."), icon: "public" },
    { value: "global", label: t('wizard.marketScopes.global.label', "Global"), description: t('wizard.marketScopes.global.desc', "I operate in markets outside Europe."), icon: "travel_explore" },
];

const getRevenueBands = (t: TFunction) => [
    { value: "lt-10k", label: t('wizard.revenueBands.lt10k', "< €10k"), sublabel: t('wizard.revenueBands.perYear', "per year") },
    { value: "10k-100k", label: t('wizard.revenueBands.mid1', "€10k–100k"), sublabel: t('wizard.revenueBands.perYear', "per year") },
    { value: "100k-1m", label: t('wizard.revenueBands.mid2', "€100k–1M"), sublabel: t('wizard.revenueBands.perYear', "per year") },
    { value: "gt-1m", label: t('wizard.revenueBands.gt1m', "> €1M"), sublabel: t('wizard.revenueBands.perYear', "per year") },
];

const getIntents = (t: TFunction) => [
    { value: "self-check", label: t('wizard.intents.selfCheck.label', "Quick self-check"), description: t('wizard.intents.selfCheck.desc', "Get immediate feedback on basic requirements."), icon: "fact_check" },
    { value: "expert", label: t('wizard.intents.expert.label', "Expert advice"), description: t('wizard.intents.expert.desc', "Speak with a specialist for complex cases."), icon: "psychology" },
    { value: "full-service", label: t('wizard.intents.fullService.label', "Full service"), description: t('wizard.intents.fullService.desc', "End-to-end management by our team."), icon: "verified_user" },
];

const getUrgencies = (t: TFunction) => [
    { value: "today", label: t('wizard.urgencies.today', "Today") },
    { value: "week", label: t('wizard.urgencies.week', "This week") },
    { value: "month", label: t('wizard.urgencies.month', "This month") },
    { value: "researching", label: t('wizard.urgencies.researching', "Just researching") },
];

interface ChipOption { value: string; label: string; icon?: string; }

const getRiskSignals = (t: TFunction): Record<WizardCategory | string, ChipOption[]> => ({
    "tax-vat": [
        { value: "marketplace_seller", label: t('wizard.riskSignals.taxVat.marketplace', "Marketplace seller"), icon: "shopping_bag" },
        { value: "cross_border_shipping", label: t('wizard.riskSignals.taxVat.crossBorder', "Cross-border shipping"), icon: "local_shipping" },
        { value: "warehouse_abroad", label: t('wizard.riskSignals.taxVat.warehouse', "Warehouse abroad"), icon: "warehouse" },
        { value: "digital_goods", label: t('wizard.riskSignals.taxVat.digitalGoods', "Digital goods / services"), icon: "cloud" },
        { value: "high_volume", label: t('wizard.riskSignals.taxVat.highVolume', "High transaction volume"), icon: "trending_up" },
        { value: "vat_registered", label: t('wizard.riskSignals.taxVat.vatRegistered', "Already VAT registered"), icon: "receipt_long" },
    ],
    "epr": [
        { value: "physical_goods", label: t('wizard.riskSignals.epr.physicalGoods', "Sells physical goods"), icon: "inventory_2" },
        { value: "own_packaging", label: t('wizard.riskSignals.epr.ownPackaging', "Uses custom packaging"), icon: "package_2" },
        { value: "dropshipper", label: t('wizard.riskSignals.epr.dropshipper', "Dropshipper / unbranded"), icon: "swap_horiz" },
        { value: "electronics", label: t('wizard.riskSignals.epr.electronics', "Electronics category"), icon: "devices" },
        { value: "importer", label: t('wizard.riskSignals.epr.importer', "Imports from outside EU"), icon: "flight_land" },
        { value: "recycling_fee", label: t('wizard.riskSignals.epr.recyclingFee', "Not paying recycling fee"), icon: "recycling" },
    ],
    "data-privacy": [
        { value: "ga4", label: t('wizard.riskSignals.privacy.ga4', "Google Analytics (GA4)"), icon: "analytics" },
        { value: "meta_pixel", label: t('wizard.riskSignals.privacy.metaPixel', "Meta Pixel"), icon: "thumb_up" },
        { value: "tiktok_pixel", label: t('wizard.riskSignals.privacy.tiktokPixel', "TikTok Pixel"), icon: "music_note" },
        { value: "email_marketing", label: t('wizard.riskSignals.privacy.emailMarketing', "Email marketing"), icon: "mail" },
        { value: "crm_tool", label: t('wizard.riskSignals.privacy.crmTool', "CRM / contact data"), icon: "contacts" },
        { value: "no_consent_banner", label: t('wizard.riskSignals.privacy.noConsent', "No consent management"), icon: "block" },
    ],
    "marketing-seo": [
        { value: "health_claims", label: t('wizard.riskSignals.marketing.healthClaims', "Health / supplement claims"), icon: "medication" },
        { value: "guaranteed_claims", label: t('wizard.riskSignals.marketing.guaranteed', '"Guaranteed" or "#1" claims'), icon: "workspace_premium" },
        { value: "google_ads", label: t('wizard.riskSignals.marketing.googleAds', "Google Ads"), icon: "ads_click" },
        { value: "meta_ads", label: t('wizard.riskSignals.marketing.metaAds', "Meta / Facebook Ads"), icon: "thumb_up" },
        { value: "influencer", label: t('wizard.riskSignals.marketing.influencer', "Influencer marketing"), icon: "star" },
        { value: "cookie_popup", label: t('wizard.riskSignals.marketing.cookiePopup', "No cookie consent"), icon: "block" },
    ],
    "corporate": [
        { value: "individual_seller", label: t('wizard.riskSignals.corporate.individual', "No legal entity yet"), icon: "person" },
        { value: "foreign_register", label: t('wizard.riskSignals.corporate.foreign', "Registering abroad"), icon: "flight_takeoff" },
        { value: "multi_entity", label: t('wizard.riskSignals.corporate.multiEntity', "Multiple entities"), icon: "account_tree" },
        { value: "remote_team", label: t('wizard.riskSignals.corporate.remoteTeam', "Remote / international team"), icon: "groups" },
        { value: "investor_ready", label: t('wizard.riskSignals.corporate.investorReady', "Preparing for investment"), icon: "trending_up" },
    ],
    "full-support": [
        { value: "multi_country", label: t('wizard.riskSignals.full.multiCountry', "Operating in 3+ countries"), icon: "public" },
        { value: "all_categories", label: t('wizard.riskSignals.full.allCategories', "Multiple compliance areas"), icon: "category" },
        { value: "fast_needed", label: t('wizard.riskSignals.full.fastNeeded', "Urgent / fast turnaround"), icon: "bolt" },
        { value: "no_team", label: t('wizard.riskSignals.full.noTeam', "No in-house compliance"), icon: "person_off" },
        { value: "audit_needed", label: t('wizard.riskSignals.full.auditNeeded', "Need compliance audit"), icon: "fact_check" },
    ],
    "": [],
});

const getCategoryHeadline = (t: TFunction): Record<string, string> => ({
    "tax-vat": t('wizard.headlines.taxVat', "What are your main tax risk factors?"),
    "epr": t('wizard.headlines.epr', "What are your main packaging or product situations?"),
    "data-privacy": t('wizard.headlines.privacy', "Which data tools or practices apply to you?"),
    "marketing-seo": t('wizard.headlines.marketing', "What are your main marketing risk areas?"),
    "corporate": t('wizard.headlines.corporate', "What best describes your corporate situation?"),
    "full-support": t('wizard.headlines.fullSupport', "What are your main challenges?"),
});

// ─── Slide variants ───────────────────────────────────────────────────────────

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GenericWizardFlow() {
    const { t } = useTranslation('common');
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [noteOpen, setNoteOpen] = useState(false);
    const [showAdditionalMarkets, setShowAdditionalMarkets] = useState(false);

    const totalSteps = 5; // Context, Markets, Risk, Complexity, Review

    const BUSINESS_TYPES = getBusinessTypes(t);
    const MARKET_SCOPES = getMarketScopes(t);
    const REVENUE_BANDS = getRevenueBands(t);
    const INTENTS = getIntents(t);
    const URGENCIES = getUrgencies(t);
    const RISK_SIGNALS = getRiskSignals(t);
    const CATEGORY_HEADLINE = getCategoryHeadline(t);

    const riskOptions = Array.from(new Map(
        profile.categories.flatMap(cat => RISK_SIGNALS[cat] || []).map(opt => [opt.value, opt])
    ).values());
    
    const riskHeadline = profile.categories.length === 1 
        ? (CATEGORY_HEADLINE[profile.categories[0]] || t('wizard.headlines.default', "What are your main risk areas?"))
        : t('wizard.headlines.default', "What are your main risk areas?");

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
            label: t('wizard.steps.context.label', "Business Context"),
            isValid: !!profile.businessType,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.steps.context.title', "How would you describe your business?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.steps.context.subtitle', "This helps us tailor the right compliance questions for your situation.")}
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={BUSINESS_TYPES}
                        value={profile.businessType}
                        onChange={handleTypeChange}
                    />
                    {(profile.businessType === "other" || noteOpen) && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 mb-6">
                            <FreeText
                                label={t('wizard.steps.context.freeTextLabel', "Tell us more about your business")}
                                description={t('wizard.steps.context.freeTextDesc', "Optional — helps us suggest the most relevant providers.")}
                                value={profile.businessTypeNote}
                                onChange={v => dispatch({ type: "SET_BUSINESS_TYPE_NOTE", payload: v })}
                                placeholder={t('wizard.steps.context.freeTextPlaceholder', "e.g. I run a drop-shipping business across EU markets...")}
                            />
                        </div>
                    )}
                    <div className="pt-6 border-t border-neutral-100">
                        <div className="flex flex-col gap-2 mb-4">
                            <Typography variant="h3" className="font-semibold text-lg">
                                Already have a provider?
                            </Typography>
                            <Typography variant="body" className="text-sm text-neutral-600">
                                Are you looking to switch from your current compliance service provider?
                            </Typography>
                        </div>
                        <YesNoToggle
                            value={profile.existingProvider ? "yes" : "no"}
                            onChange={(val: "yes" | "no") => dispatch({ type: "SET_EXISTING_PROVIDER", payload: val === "yes" })}
                        />
                    </div>
                </div>
            ),
        },
        {
            label: t('wizard.steps.markets.label', "Market Scope"),
            isValid: !!profile.marketScope,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.steps.markets.title', "Where do you sell or operate?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.steps.markets.subtitle', "Compliance requirements differ significantly based on your operating scope.")}
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
                            <span>{t('wizard.steps.markets.globalNotice', "Compliance rules differ significantly outside the EU. Consider our Full Support package for broader coverage.")}</span>
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
                                    {showAdditionalMarkets ? t('wizard.steps.markets.hideMarkets', "Hide specific markets") : t('wizard.steps.markets.showMarkets', "Select specific additional markets (Optional)")}
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
            label: t('wizard.steps.risk.label', "Risk Signals"),
            isValid: true,
            isOptional: true,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{riskHeadline}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.steps.risk.subtitle', "Select all that apply — this helps us calculate your risk level and find the best providers.")}
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
                                <span className="font-semibold">{profile.riskSignals.length} {t('wizard.steps.risk.signalsDetected', "risk signals")}</span> {t('wizard.steps.risk.signalsWeight', "detected — we'll weight provider results accordingly.")}
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.steps.complexity.label', "Complexity & Intent"),
            isValid: !!profile.revenueBand,
            content: (
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">{t('wizard.steps.complexity.title', "Last step — tell us your scale & goal.")}</Typography>
                            <Typography variant="body" className="text-neutral-600">
                                {t('wizard.steps.complexity.subtitle', "This helps rank providers by relevance and match the right service tier.")}
                            </Typography>
                        </div>
                        <div>
                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                {t('wizard.steps.complexity.revenueLabel', "ANNUAL REVENUE")}
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
                            {t('wizard.steps.complexity.intentLabel', "WHAT DO YOU NEED RIGHT NOW?")}
                        </Typography>
                        <SingleSelectCardGroup
                            options={INTENTS}
                            value={profile.intent}
                            onChange={v => dispatch({ type: "SET_INTENT", payload: v as "self-check" | "expert" | "full-service" })}
                        />
                    </div>
                    <div className="border-t border-neutral-200 pt-8">
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            {t('wizard.steps.complexity.urgencyLabel', "HOW URGENT IS THIS?")}
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
                        stepLabel={isReview ? t('wizard.review', "Review") : currentConfig?.label ?? ""}
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
                                                <Typography variant="h2">{t('wizard.reviewAnswers', "Review your answers")}</Typography>
                                                <Typography variant="body" className="text-neutral-600">
                                                    {t('wizard.reviewDesc', "Confirm everything looks right before we generate your results.")}
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
                            nextLabel={step === 3 ? t('wizard.reviewAnswersButton', "Review Answers") : undefined}
                        />
                    )}
                    {isReview && (
                        <div className="px-8 py-5 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-primary-600 transition-colors group"
                            >
                                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                                {t('wizard.backToPrevious', "Back to previous step")}
                            </button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
