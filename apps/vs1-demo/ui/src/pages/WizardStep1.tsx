import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWizard } from "../components/wizard/WizardContext";
import { WizardHeader } from "../components/wizard/WizardHeader";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { WizardFooter } from "../components/wizard/WizardFooter";
import { CountryMultiSelect } from "../components/wizard/questions/CountryMultiSelect";

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
    const [primaryCountry, setPrimaryCountry] = useState(profile.country || preCountry);

    const handleNext = () => {
        if (!primaryCountry) return;
        dispatch({ type: "SET_COUNTRY", payload: primaryCountry });
        dispatch({ type: "SET_MARKETS", payload: [primaryCountry, ...additionalMarkets.filter(m => m !== primaryCountry)] });
        navigate("/wizard/category");
    };

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper currentStep={1} totalSteps={6} stepLabel="Market Scope" />
                    <div className="px-8 py-6 flex flex-col gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                                Where is your business based?
                            </h1>
                            <p className="text-slate-400 text-sm mt-2">
                                Select your primary country to define your regulatory context.
                            </p>
                        </div>

                        {/* Primary Country Grid */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                                Primary Market (Required)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {PRIMARY_COUNTRIES.map(c => {
                                    const selected = primaryCountry === c.code;
                                    return (
                                        <button
                                            key={c.code}
                                            onClick={() => setPrimaryCountry(c.code)}
                                            className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 ${
                                                selected
                                                    ? "border-[#137fec] bg-[#137fec]/10 shadow-lg shadow-[#137fec]/10"
                                                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                                            }`}
                                        >
                                            <span className="text-2xl">{c.flag}</span>
                                            <span className={`text-xs font-semibold ${selected ? "text-slate-100" : "text-slate-400"}`}>
                                                {c.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Additional Markets */}
                        {primaryCountry && (
                            <div className="border-t border-slate-800 pt-5">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                                    Additional Markets (Optional)
                                </p>
                                <CountryMultiSelect
                                    primaryCountry={primaryCountry}
                                    value={additionalMarkets}
                                    onChange={setAdditionalMarkets}
                                />
                                {additionalMarkets.length >= 5 && (
                                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                                        <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                                        Many markets selected — consider our Full Support package for optimal coverage.
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
