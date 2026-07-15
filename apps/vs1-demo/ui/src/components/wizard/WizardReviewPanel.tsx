import { useWizard } from "../../components/wizard/WizardContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { ArrowRight } from "lucide-react";

// ─── Wizard · Step 4 Review · Figma 1660:162 ────────────────────────────────
// "Your situation, summarized." A gold-framed summary card (Markets · Operations
// · Compliance domains, each editable) + the gold "Generate my risk map" CTA.

const getCategoryLabels = (t: TFunction): Record<string, string> => ({
    "tax-vat": t('wizard.categories.taxVat', "VAT & Tax"),
    "epr": t('wizard.categories.epr', "EPR & Packaging"),
    "data-privacy": t('wizard.categories.privacy', "GDPR & Privacy"),
    "marketing-seo": t('wizard.categories.marketing', "Marketing & SEO"),
    "corporate": t('wizard.categories.corporate', "Corporate & Structure"),
    "full-support": t('wizard.categories.fullSupport', "Full Support"),
});

const getBusinessLabels = (t: TFunction): Record<string, string> => ({
    ecommerce: t('wizard.businessTypes.ecommerce.label', "D2C e-commerce"),
    marketplace: t('wizard.businessTypes.marketplace.label', "Marketplace seller"),
    saas: t('wizard.businessTypes.saas.label', "SaaS / software"),
    agency: t('wizard.businessTypes.agency.label', "Agency / consultant"),
    other: t('wizard.businessTypes.other.label', "Other"),
});

const getRevenueLabels = (t: TFunction): Record<string, string> => ({
    "lt-10k": t('wizard.revenueLabels.lt10k', "< €10,000"),
    "10k-100k": t('wizard.revenueLabels.mid1', "€10k – 100k"),
    "100k-1m": t('wizard.revenueLabels.mid2', "€100k – 1M"),
    "gt-1m": t('wizard.revenueLabels.gt1m', "> €1M"),
});

// Country code → display name (pre-gate + common additional markets).
const COUNTRY_NAMES: Record<string, string> = {
    DE: "Germany", EU: "European Union", GB: "United Kingdom", UK: "United Kingdom",
    US: "United States", CA: "Canada", AU: "Australia", CH: "Switzerland", AT: "Austria",
    NL: "Netherlands", FR: "France", IT: "Italy", ES: "Spain", BE: "Belgium", SE: "Sweden",
    DK: "Denmark", PL: "Poland", NO: "Norway", IE: "Ireland", FI: "Finland", PT: "Portugal", TR: "Türkiye",
};
const countryName = (c: string) => COUNTRY_NAMES[c] || c;

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
    if (!value) return null;
    return (
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 py-5 last:border-0">
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
                <p className="mt-1.5 text-[15px] font-medium text-neutral-900">{value}</p>
            </div>
            <button
                onClick={onEdit}
                className="shrink-0 text-[13px] font-semibold text-primary-600 transition-colors hover:text-primary-700"
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
    const navigate = useNavigate();
    const locale = window.location.pathname.match(/^\/([a-z]{2})(?=\/|$)/)?.[1] || 'en';
    const go = (sub: string) => navigate(`/${locale}/wizard${sub}`);

    const CATEGORY_LABELS = getCategoryLabels(t);
    const BUSINESS_LABELS = getBusinessLabels(t);
    const REVENUE_LABELS = getRevenueLabels(t);

    const markets = (profile.markets?.length ? profile.markets : [profile.country]).filter(Boolean);
    const operations = [BUSINESS_LABELS[profile.businessType], REVENUE_LABELS[profile.revenueBand]]
        .filter(Boolean)
        .join(" · ");
    const domains = profile.categories.map((c) => CATEGORY_LABELS[c]).filter(Boolean).join(" · ");

    return (
        <div className="flex flex-col gap-6">
            {/* Gold-framed summary card */}
            <div className="rounded-2xl border-2 border-accent-400 bg-white px-6">
                <SummaryRow label="Markets" value={markets.map(countryName).join(" · ")} onEdit={() => go("")} />
                <SummaryRow label="Operations" value={operations} onEdit={() => go("/context")} />
                <SummaryRow label="Compliance domains" value={domains} onEdit={() => go("/category")} />
            </div>

            {/* Generate CTA */}
            <button
                type="button"
                onClick={onGenerateResults}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14a89a] px-6 py-3.5 text-[15px] font-semibold text-[#04140f] transition-transform duration-200 hover:-translate-y-0.5"
            >
                {t('wizard.reviewPanel.generateCTA', "Generate my risk map")} <ArrowRight size={17} />
            </button>

            {isGuest && (
                <p className="text-center text-[13px] text-neutral-500">
                    Anonymous · No account required to see your risk map · Processed in ~4 seconds
                </p>
            )}
        </div>
    );
}
