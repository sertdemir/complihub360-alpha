import { useNavigate, useSearchParams } from "react-router-dom";
import { useWizard, WizardCategory } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { Typography } from "../../components/ui/Typography";
import { useEffect } from "react";

interface CategoryCard {
    id: WizardCategory;
    title: string;
    description: string;
    icon: string;
    color: string;
}

const CATEGORIES: CategoryCard[] = [
    {
        id: "tax-vat",
        title: "Tax & VAT",
        description: "Cross-border tax obligations, VAT registration, and marketplace tax rules.",
        icon: "account_balance",
        color: "blue",
    },
    {
        id: "epr",
        title: "Product & Packaging",
        description: "EPR registration, packaging obligations, and product category rules.",
        icon: "inventory_2",
        color: "orange",
    },
    {
        id: "data-privacy",
        title: "Data & Privacy",
        description: "GDPR, CCPA, tracking consent, and personal data processing.",
        icon: "shield_locked",
        color: "emerald",
    },
    {
        id: "marketing-seo",
        title: "Marketing & SEO",
        description: "Advertising standards, health claims, cookie laws, and influencer rules.",
        icon: "campaign",
        color: "purple",
    },
    {
        id: "corporate",
        title: "Corporate & Structure",
        description: "Legal entity formation, foreign registration, and business structure.",
        icon: "business_center",
        color: "yellow",
    },
    {
        id: "full-support",
        title: "Full Support",
        description: "End-to-end compliance management across all categories.",
        icon: "verified_user",
        color: "pink",
    },
];

const COLOR_MAP: Record<string, { selected: string; icon: string; badge: string }> = {
    blue: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    orange: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    emerald: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    purple: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    yellow: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    pink: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
};

export function WizardCategoryStep() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { profile, dispatch } = useWizard();

    // Pre-select category from URL param (e.g., from LandingPage cards)
    useEffect(() => {
        const cat = searchParams.get("category") as WizardCategory | null;
        if (cat && !profile.category) {
            dispatch({ type: "SET_CATEGORY", payload: cat });
        }
    }, [searchParams, profile.category, dispatch]);

    const handleSelect = (cat: WizardCategory) => {
        dispatch({ type: "SET_CATEGORY", payload: cat });
    };

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={2} totalSteps={6} stepLabel="Compliance Category" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">
                                What do you need help with?
                            </Typography>
                            <Typography variant="body" className="text-neutral-600">
                                Choose your primary area of concern. This determines which questions we'll ask next.
                            </Typography>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {CATEGORIES.map(cat => {
                                const selected = profile.category === cat.id;
                                const colors = COLOR_MAP[cat.color];
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleSelect(cat.id)}
                                        className={`relative flex flex-col gap-4 p-5 rounded-xl border transition-all duration-200 text-left ${
                                            selected
                                                ? `${colors.selected}`
                                                : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${selected ? colors.badge : "bg-neutral-100 text-neutral-500"}`}>
                                            <span className={`material-symbols-outlined text-2xl`}>
                                                {cat.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <Typography variant="body" weight="semibold" className={selected ? "text-primary-900" : "text-neutral-900"}>
                                                {cat.title}
                                            </Typography>
                                            <Typography variant="ui-small" className="text-neutral-600 mt-1">
                                                {cat.description}
                                            </Typography>
                                        </div>
                                        {selected && (
                                            <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-200">
                                                <span className={`material-symbols-outlined text-xl text-primary-500`}>check_circle</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <WizardFooter
                        onBack={() => navigate("/wizard")}
                        onNext={() => navigate("/wizard/context")}
                        nextDisabled={!profile.category}
                    />
                </div>
            </main>
        </div>
    );
}
