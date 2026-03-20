import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";
import { CountryMultiSelect } from "../../components/wizard/questions/CountryMultiSelect";
import { Typography } from "../../components/ui/Typography";

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
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={2} totalSteps={5} stepLabel="Market Scope" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">
                                Where do you sell or operate?
                            </Typography>
                            <Typography variant="body" className="text-neutral-600">
                                Compliance requirements differ significantly based on your operating scope.
                            </Typography>
                        </div>

                        <SingleSelectCardGroup
                            options={MARKET_SCOPES}
                            value={profile.marketScope}
                            onChange={handleScope}
                        />

                        {/* Global hint */}
                        {profile.marketScope === "global" && (
                            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                                <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">tips_and_updates</span>
                                <span>Compliance rules differ significantly outside the EU. Consider our Full Support package for broader coverage.</span>
                            </div>
                        )}

                        {/* Additional markets for EU/Global only */}
                        {(profile.marketScope === "eu" || profile.marketScope === "global") && profile.country && (
                            <div className="border-t border-neutral-200 pt-6">
                                <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                    SELECT SPECIFIC ADDITIONAL MARKETS (OPTIONAL)
                                </Typography>
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
