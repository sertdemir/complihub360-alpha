import { useNavigate } from "react-router-dom";
import { useWizard, RevenueBand } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { RangeSelector } from "../../components/wizard/questions/RangeSelector";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";

const REVENUE_BANDS = [
    { value: "lt-10k", label: "< €10k", sublabel: "per year" },
    { value: "10k-100k", label: "€10k–100k", sublabel: "per year" },
    { value: "100k-1m", label: "€100k–1M", sublabel: "per year" },
    { value: "gt-1m", label: "> €1M", sublabel: "per year" },
];

const INTENTS = [
    { value: "self-check", label: "Quick self-check", description: "Get immediate feedback on basic requirements.", icon: "fact_check" },
    { value: "expert", label: "Expert advice", description: "Speak with a specialist for complex cases.", icon: "psychology" },
    { value: "full-service", label: "Full service", description: "End-to-end management by our team.", icon: "verified_user" },
];

const URGENCIES = [
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "researching", label: "Just researching" },
];

export function WizardComplexityStep() {
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();

    const handleNext = () => {
        navigate("/wizard/review");
    };

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper currentStep={6} totalSteps={6} stepLabel="Complexity & Intent" />
                    <div className="px-8 py-6 flex flex-col gap-8">
                        {/* Revenue */}
                        <div className="flex flex-col gap-4">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                                    Last step — tell us your scale & goal.
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">
                                    This helps rank providers by relevance and match the right service tier.
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Annual Revenue</p>
                                <RangeSelector
                                    bands={REVENUE_BANDS}
                                    value={profile.revenueBand}
                                    onChange={v => dispatch({ type: "SET_REVENUE_BAND", payload: v as RevenueBand })}
                                />
                            </div>
                        </div>

                        {/* Intent */}
                        <div className="border-t border-slate-800 pt-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">What do you need right now?</p>
                            <SingleSelectCardGroup
                                options={INTENTS}
                                value={profile.intent}
                                onChange={v => dispatch({ type: "SET_INTENT", payload: v as "self-check" | "expert" | "full-service" })}
                            />
                        </div>

                        {/* Urgency */}
                        <div className="border-t border-slate-800 pt-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">How urgent is this?</p>
                            <div className="flex flex-wrap gap-2">
                                {URGENCIES.map(u => (
                                    <button
                                        key={u.value}
                                        onClick={() => dispatch({ type: "SET_URGENCY", payload: u.value as "today" | "week" | "month" | "researching" })}
                                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                                            profile.urgency === u.value
                                                ? "bg-[#137fec] border-[#137fec] text-white"
                                                : "border-slate-700 text-slate-400 hover:border-slate-600"
                                        }`}
                                    >
                                        {u.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <WizardFooter
                        onBack={() => navigate("/wizard/risk")}
                        onNext={handleNext}
                        nextDisabled={!profile.revenueBand}
                        nextLabel="Review Answers"
                    />
                </div>
            </main>
        </div>
    );
}
