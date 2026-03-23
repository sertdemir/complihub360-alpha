import { useNavigate } from "react-router-dom";
import { useWizard } from "./WizardContext";
import { Typography } from "../ui/Typography";

const CATEGORY_LABELS: Record<string, string> = {
    "tax-vat": "Tax & VAT",
    "epr": "Product & Packaging",
    "data-privacy": "Data & Privacy",
    "marketing-seo": "Marketing & SEO",
    "corporate": "Corporate & Structure",
    "full-support": "Full Support",
};

export function WizardHeader() {
    const navigate = useNavigate();
    const { profile } = useWizard();

    return (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-6 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 group"
                >
                    <span className="material-symbols-outlined text-primary-600 text-2xl">
                        verified_user
                    </span>
                    <Typography variant="h3" className="tracking-tight">
                        CompliHub360
                    </Typography>
                </button>

                {/* Context Badges */}
                <div className="flex items-center gap-2">
                    {profile.country && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
                            <span className="material-symbols-outlined text-sm text-neutral-500">location_on</span>
                            {profile.country}
                        </span>
                    )}
                    {profile.categories.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-xs font-semibold text-primary-700">
                            {profile.categories.map(c => CATEGORY_LABELS[c]).join(', ')}
                        </span>
                    )}
                </div>

                {/* Exit link */}
                <button
                    onClick={() => {
                        const locale = window.location.pathname.split('/')[1] || 'en';
                        navigate(`/${locale}/results`);
                    }}
                    className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                >
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                    Skip to results
                </button>
            </div>
        </header>
    );
}
