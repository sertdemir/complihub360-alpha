import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";
import { CountryMultiSelect } from "../../components/wizard/questions/CountryMultiSelect";

const MARKET_SCOPES = [
    { value: "local", label: "Local Only", description: "I only operate within my primary country.", icon: "home" },
    { value: "eu", label: "EU / Europe", description: "I sell to or operate across multiple EU countries.", icon: "public" },
    { value: "global", label: "Global", description: "I operate in markets outside Europe.", icon: "travel_explore" },
];

export function WizardMarketsStep() {
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();

    const handleScope = (val: string) => {
        dispatch({ type: "SET_MARKET_SCOPE", payload: val as "local" | "eu" | "global" });
    };

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper currentStep={4} totalSteps={6} stepLabel="Market Scope" />
                    <div className="px-8 py-6 flex flex-col gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                                Where do you sell or operate?
                            </h1>
                            <p className="text-slate-400 text-sm mt-2">
                                Compliance requirements differ significantly based on your operating scope.
                            </p>
                        </div>

                        <SingleSelectCardGroup
                            options={MARKET_SCOPES}
                            value={profile.marketScope}
                            onChange={handleScope}
                        />

                        {/* Global hint */}
                        {profile.marketScope === "global" && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                                <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">tips_and_updates</span>
                                <span>Compliance rules differ significantly outside the EU. Consider our Full Support package for broader coverage.</span>
                            </div>
                        )}

                        {/* Additional markets for EU/Global only */}
                        {(profile.marketScope === "eu" || profile.marketScope === "global") && profile.country && (
                            <div className="border-t border-slate-800 pt-5">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                                    Select Specific Additional Markets (Optional)
                                </p>
                                <CountryMultiSelect
                                    primaryCountry={profile.country}
                                    value={profile.markets.filter(m => m !== profile.country)}
                                    onChange={countries => dispatch({ type: "SET_MARKETS", payload: [profile.country, ...countries] })}
                                />
                            </div>
                        )}
                    </div>
                    <WizardFooter
                        onBack={() => navigate("/wizard/context")}
                        onNext={() => navigate("/wizard/risk")}
                        nextDisabled={!profile.marketScope}
                    />
                </div>
            </main>
        </div>
    );
}
