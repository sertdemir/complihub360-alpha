import { useWizard } from "../../components/wizard/WizardContext";
import { useNavigate } from "react-router-dom";

const CATEGORY_LABELS: Record<string, string> = {
    "tax-vat": "Tax & VAT",
    "epr": "Product & Packaging",
    "data-privacy": "Data & Privacy",
    "marketing-seo": "Marketing & SEO",
    "corporate": "Corporate & Structure",
    "full-support": "Full Support",
};

const BUSINESS_LABELS: Record<string, string> = {
    ecommerce: "E-Commerce Brand",
    marketplace: "Marketplace Seller",
    saas: "SaaS / Software",
    agency: "Agency / Consultant",
    other: "Other",
};

const REVENUE_LABELS: Record<string, string> = {
    "lt-10k": "< €10,000 / year",
    "10k-100k": "€10k–100k / year",
    "100k-1m": "€100k–1M / year",
    "gt-1m": "> €1M / year",
};

const INTENT_LABELS: Record<string, string> = {
    "self-check": "Quick self-check",
    "expert": "Expert advice",
    "full-service": "Full service",
};

const SCOPE_LABELS: Record<string, string> = {
    local: "Local Only",
    eu: "EU / Europe",
    global: "Global",
};

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
        <div className="flex items-start justify-between py-3 border-b border-slate-800 last:border-0 gap-4">
            <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
                <span className="text-sm font-medium text-slate-200">{displayValue}</span>
            </div>
            <button
                onClick={() => navigate(stepPath)}
                className="text-xs text-[#137fec] hover:underline shrink-0 mt-1"
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
    const { profile } = useWizard();

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 divide-y divide-slate-800 overflow-hidden">
                <ReviewRow label="Primary Country" value={profile.country} stepPath="/wizard" />
                <ReviewRow label="Additional Markets" value={profile.markets.filter(m => m !== profile.country)} stepPath="/wizard" />
                <ReviewRow label="Compliance Category" value={CATEGORY_LABELS[profile.category] || ""} stepPath="/wizard/category" />
                <ReviewRow label="Business Type" value={BUSINESS_LABELS[profile.businessType] || ""} stepPath="/wizard/context" />
                <ReviewRow label="Market Scope" value={SCOPE_LABELS[profile.marketScope] || ""} stepPath="/wizard/markets" />
                {profile.riskSignals.length > 0 && (
                    <ReviewRow label="Risk Signals" value={profile.riskSignals.map(s => s.replace(/_/g, " "))} stepPath="/wizard/risk" />
                )}
                <ReviewRow label="Annual Revenue" value={REVENUE_LABELS[profile.revenueBand] || ""} stepPath="/wizard/complexity" />
                <ReviewRow label="Intent" value={INTENT_LABELS[profile.intent] || ""} stepPath="/wizard/complexity" />
            </div>

            {/* CTA */}
            <button
                onClick={onGenerateResults}
                className="w-full py-3.5 bg-[#137fec] hover:bg-[#137fec]/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#137fec]/20 transition-all"
            >
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Generate My Compliance Results
            </button>

            {isGuest && (
                <p className="text-center text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">lock</span>
                    <a href="/register?next=wizard/review" className="text-[#137fec] hover:underline">
                        Register
                    </a>{" "}
                    to save and edit these answers later in your dashboard.
                </p>
            )}
        </div>
    );
}
