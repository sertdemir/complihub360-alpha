import { useNavigate } from "react-router-dom";
import { useWizard } from "./WizardContext";

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
        <header className="sticky top-0 z-50 bg-[#0b1117]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 group"
                >
                    <span className="material-symbols-outlined text-[#137fec] text-2xl">
                        verified_user
                    </span>
                    <span className="text-slate-100 font-bold text-lg tracking-tight">
                        CompliHub360
                    </span>
                </button>

                {/* Context Badges */}
                <div className="flex items-center gap-2">
                    {profile.country && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                            <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                            {profile.country}
                        </span>
                    )}
                    {profile.category && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#137fec]/10 border border-[#137fec]/30 text-xs font-semibold text-[#137fec]">
                            {CATEGORY_LABELS[profile.category]}
                        </span>
                    )}
                </div>

                {/* Exit link */}
                <button
                    onClick={() => navigate("/results")}
                    className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                    Skip to results
                </button>
            </div>
        </header>
    );
}
