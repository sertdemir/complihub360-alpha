import { useNavigate, useSearchParams } from "react-router-dom";
import { useWizard, WizardCategory } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
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
        selected: "border-blue-500 bg-blue-500/10 shadow-blue-500/10",
        icon: "text-blue-400",
        badge: "bg-blue-500/20 text-blue-300",
    },
    orange: {
        selected: "border-orange-500 bg-orange-500/10 shadow-orange-500/10",
        icon: "text-orange-400",
        badge: "bg-orange-500/20 text-orange-300",
    },
    emerald: {
        selected: "border-emerald-500 bg-emerald-500/10 shadow-emerald-500/10",
        icon: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-300",
    },
    purple: {
        selected: "border-purple-500 bg-purple-500/10 shadow-purple-500/10",
        icon: "text-purple-400",
        badge: "bg-purple-500/20 text-purple-300",
    },
    yellow: {
        selected: "border-yellow-500 bg-yellow-500/10 shadow-yellow-500/10",
        icon: "text-yellow-400",
        badge: "bg-yellow-500/20 text-yellow-300",
    },
    pink: {
        selected: "border-pink-500 bg-pink-500/10 shadow-pink-500/10",
        icon: "text-pink-400",
        badge: "bg-pink-500/20 text-pink-300",
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
    }, []);

    const handleSelect = (cat: WizardCategory) => {
        dispatch({ type: "SET_CATEGORY", payload: cat });
    };

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper currentStep={2} totalSteps={6} stepLabel="Compliance Category" />
                    <div className="px-8 py-6 flex flex-col gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                                What do you need help with?
                            </h1>
                            <p className="text-slate-400 text-sm mt-2">
                                Choose your primary area of concern. This determines which questions we'll ask next.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => {
                                const selected = profile.category === cat.id;
                                const colors = COLOR_MAP[cat.color];
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleSelect(cat.id)}
                                        className={`relative flex flex-col gap-3 p-5 rounded-xl border-2 text-left transition-all duration-200 group ${
                                            selected
                                                ? `${colors.selected} shadow-lg`
                                                : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-800/80"
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? colors.badge : "bg-slate-700"}`}>
                                            <span className={`material-symbols-outlined text-xl ${selected ? colors.icon : "text-slate-400"}`}>
                                                {cat.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <p className={`font-semibold text-sm ${selected ? "text-slate-100" : "text-slate-300"}`}>
                                                {cat.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                                {cat.description}
                                            </p>
                                        </div>
                                        {selected && (
                                            <div className="absolute top-3 right-3">
                                                <span className={`material-symbols-outlined text-base ${colors.icon}`}>check_circle</span>
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
