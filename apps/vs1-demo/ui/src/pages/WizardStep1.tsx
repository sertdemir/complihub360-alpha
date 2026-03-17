import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWizard } from "../components/wizard/WizardContext";
import { WizardHeader } from "../components/wizard/WizardHeader";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { WizardFooter } from "../components/wizard/WizardFooter";
import { CountryMultiSelect } from "../components/wizard/questions/CountryMultiSelect";
import { Typography } from "../components/ui/Typography";

const PRIMARY_COUNTRIES = [
    { code: "DE", label: "Germany", flag: "🇩🇪" },
    { code: "EU", label: "European Union", flag: "🇪🇺" },
    { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
    { code: "US", label: "United States", flag: "🇺🇸" },
    { code: "CA", label: "Canada", flag: "🇨🇦" },
    { code: "AU", label: "Australia", flag: "🇦🇺" },
    { code: "CH", label: "Switzerland", flag: "🇨🇭" },
    { code: "AT", label: "Austria", flag: "🇦🇹" },
];

export function WizardStep0() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { profile, dispatch } = useWizard();
    const [additionalMarkets, setAdditionalMarkets] = useState<string[]>(profile.markets);

    const preCountry = searchParams.get("country") || "";
    const preCategory = searchParams.get("category") || "";
    const [primaryCountry, setPrimaryCountry] = useState(profile.country || preCountry);

    const handleNext = () => {
        if (!primaryCountry) return;
        dispatch({ type: "SET_COUNTRY", payload: primaryCountry });
        dispatch({ type: "SET_MARKETS", payload: [primaryCountry, ...additionalMarkets.filter(m => m !== primaryCountry)] });
        if (preCategory) {
            dispatch({ type: "SET_CATEGORY", payload: preCategory as any });
            navigate(`/wizard/${preCategory}`);
        } else {
            navigate("/wizard/category");
        }
    };

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={1} totalSteps={6} stepLabel="Market Scope" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">
                                Where is your business based?
                            </Typography>
                            <Typography variant="body" className="text-neutral-600">
                                Select your primary country to define your regulatory context.
                            </Typography>
                        </div>

                        {/* Primary Country Grid */}
                        <div>
                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                PRIMARY MARKET (REQUIRED)
                            </Typography>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {PRIMARY_COUNTRIES.map(c => {
                                    const selected = primaryCountry === c.code;
                                    return (
                                        <button
                                            key={c.code}
                                            onClick={() => setPrimaryCountry(c.code)}
                                            className={`flex flex-col items-center gap-3 py-4 rounded-xl border-2 transition-all duration-200 ${
                                                selected
                                                    ? "border-primary-600 bg-primary-50 ring-2 ring-primary-100 ring-inset"
                                                    : "border-neutral-100 bg-neutral-50 hover:border-neutral-200 hover:bg-white"
                                            }`}
                                        >
                                            <span className="text-3xl">{c.flag}</span>
                                            <span className={`text-xs font-semibold ${selected ? "text-primary-900" : "text-neutral-500"}`}>
                                                {c.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Additional Markets */}
                        {primaryCountry && (
                            <div className="border-t border-neutral-200 pt-6">
                                <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                    ADDITIONAL MARKETS (OPTIONAL)
                                </Typography>
                                <CountryMultiSelect
                                    primaryCountry={primaryCountry}
                                    value={additionalMarkets}
                                    onChange={setAdditionalMarkets}
                                />
                                {additionalMarkets.length >= 5 && (
                                    <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                                        <span className="material-symbols-outlined text-primary-600 text-[18px]">tips_and_updates</span>
                                        <span>Many markets selected — consider our Full Support package for optimal coverage.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <WizardFooter
                        showBack={false}
                        onNext={handleNext}
                        nextDisabled={!primaryCountry}
                        nextLabel="Set Country & Continue"
                    />
                </div>
            </main>
        </div>
    );
}
