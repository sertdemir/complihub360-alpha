import { useWizard } from "../../components/wizard/WizardContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { Button } from "../ui/Button";
import { Typography } from "../ui/Typography";

const getCategoryLabels = (t: TFunction): Record<string, string> => ({
    "tax-vat": t('wizard.categories.taxVat', "Tax & VAT"),
    "epr": t('wizard.categories.epr', "Product & Packaging"),
    "data-privacy": t('wizard.categories.privacy', "Data & Privacy"),
    "marketing-seo": t('wizard.categories.marketing', "Marketing & SEO"),
    "corporate": t('wizard.categories.corporate', "Corporate & Structure"),
    "full-support": t('wizard.categories.fullSupport', "Full Support"),
});

const getBusinessLabels = (t: TFunction): Record<string, string> => ({
    ecommerce: t('wizard.businessTypes.ecommerce.label', "E-Commerce Brand"),
    marketplace: t('wizard.businessTypes.marketplace.label', "Marketplace Seller"),
    saas: t('wizard.businessTypes.saas.label', "SaaS / Software"),
    agency: t('wizard.businessTypes.agency.label', "Agency / Consultant"),
    other: t('wizard.businessTypes.other.label', "Other"),
});

const getRevenueLabels = (t: TFunction): Record<string, string> => ({
    "lt-10k": t('wizard.revenueLabels.lt10k', "< €10,000 / year"),
    "10k-100k": t('wizard.revenueLabels.mid1', "€10k–100k / year"),
    "100k-1m": t('wizard.revenueLabels.mid2', "€100k–1M / year"),
    "gt-1m": t('wizard.revenueLabels.gt1m', "> €1M / year"),
});

const getIntentLabels = (t: TFunction): Record<string, string> => ({
    "self-check": t('wizard.intents.selfCheck.label', "Quick self-check"),
    "expert": t('wizard.intents.expert.label', "Expert advice"),
    "full-service": t('wizard.intents.fullService.label', "Full service"),
});

const getScopeLabels = (t: TFunction): Record<string, string> => ({
    local: t('wizard.marketScopes.local.label', "Local Only"),
    eu: t('wizard.marketScopes.eu.label', "EU / Europe"),
    global: t('wizard.marketScopes.global.label', "Global"),
});

interface ReviewRowProps {
    label: string;
    value: string | string[];
    stepPath: string;
}

function ReviewRow({ label, value, stepPath }: ReviewRowProps) {
    const navigate = useNavigate();
    const displayValue = Array.isArray(value) ? value.join(", ") : value;
    if (!displayValue) return null;
    return (
        <div className="flex items-start justify-between py-3 border-b border-neutral-200 last:border-0 gap-4">
            <div className="flex flex-col gap-0.5">
                <Typography variant="caption" className="text-neutral-500">{label}</Typography>
                <Typography variant="body" weight="medium" className="text-neutral-900">{displayValue}</Typography>
            </div>
            <button
                onClick={() => navigate(stepPath)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline shrink-0 mt-1 transition-colors"
            >
                Edit
            </button>
        </div>
    );
}

interface WizardReviewPanelProps {
    onGenerateResults: () => void;
    isGuest?: boolean;
}

export function WizardReviewPanel({ onGenerateResults, isGuest = true }: WizardReviewPanelProps) {
    const { t } = useTranslation('common');
    const { profile } = useWizard();

    const CATEGORY_LABELS = getCategoryLabels(t);
    const BUSINESS_LABELS = getBusinessLabels(t);
    const REVENUE_LABELS = getRevenueLabels(t);
    const INTENT_LABELS = getIntentLabels(t);
    const SCOPE_LABELS = getScopeLabels(t);

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 divide-y divide-neutral-200 overflow-hidden px-4">
                <ReviewRow label={t('wizard.reviewPanel.primaryCountry', "Primary Country")} value={profile.country} stepPath="/wizard" />
                <ReviewRow label={t('wizard.reviewPanel.additionalMarkets', "Additional Markets")} value={profile.markets.filter(m => m !== profile.country)} stepPath="/wizard" />
                <ReviewRow label={t('wizard.reviewPanel.category', "Compliance Category")} value={CATEGORY_LABELS[profile.category] || ""} stepPath="/wizard/category" />
                <ReviewRow label={t('wizard.reviewPanel.businessType', "Business Type")} value={BUSINESS_LABELS[profile.businessType] || ""} stepPath="/wizard/context" />
                <ReviewRow label={t('wizard.reviewPanel.marketScope', "Market Scope")} value={SCOPE_LABELS[profile.marketScope] || ""} stepPath="/wizard/markets" />
                {profile.riskSignals.length > 0 && (
                    <ReviewRow label={t('wizard.reviewPanel.riskSignals', "Risk Signals")} value={profile.riskSignals.map(s => s.replace(/_/g, " "))} stepPath="/wizard/risk" />
                )}
                <ReviewRow label={t('wizard.reviewPanel.revenue', "Annual Revenue")} value={REVENUE_LABELS[profile.revenueBand] || ""} stepPath="/wizard/complexity" />
                <ReviewRow label={t('wizard.reviewPanel.intent', "Intent")} value={INTENT_LABELS[profile.intent] || ""} stepPath="/wizard/complexity" />
            </div>

            {/* CTA */}
            <Button
                variant="primary"
                onClick={onGenerateResults}
                className="w-full gap-2 py-3"
            >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                {t('wizard.reviewPanel.generateCTA', "Generate My Compliance Results")}
            </Button>

            {isGuest && (
                <p className="text-center text-xs text-neutral-500">
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">lock</span>
                    <a href="/register?next=wizard/review" className="text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                        {t('wizard.reviewPanel.register', "Register")}
                    </a>{" "}
                    {t('wizard.reviewPanel.registerDesc', "to save and edit these answers later in your dashboard.")}
                </p>
            )}
        </div>
    );
}
