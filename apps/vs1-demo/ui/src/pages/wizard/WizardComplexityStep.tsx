import { useNavigate } from "react-router-dom";
import { useWizard, RevenueBand } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { RangeSelector } from "../../components/wizard/questions/RangeSelector";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";
import { Typography } from "../../components/ui/Typography";

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
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={6} totalSteps={6} stepLabel="Complexity & Intent" />
                    <div className="px-8 py-8 flex flex-col gap-8">
                        {/* Revenue */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <Typography variant="h2">
                                    Last step — tell us your scale & goal.
                                </Typography>
                                <Typography variant="body" className="text-neutral-600">
                                    This helps rank providers by relevance and match the right service tier.
                                </Typography>
                            </div>
                            <div>
                                <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                    ANNUAL REVENUE
                                </Typography>
                                <RangeSelector
                                    bands={REVENUE_BANDS}
                                    value={profile.revenueBand}
                                    onChange={v => dispatch({ type: "SET_REVENUE_BAND", payload: v as RevenueBand })}
                                />
                            </div>
                        </div>

                        {/* Intent */}
                        <div className="border-t border-neutral-200 pt-8">
                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                WHAT DO YOU NEED RIGHT NOW?
                            </Typography>
                            <SingleSelectCardGroup
                                options={INTENTS}
                                value={profile.intent}
                                onChange={v => dispatch({ type: "SET_INTENT", payload: v as "self-check" | "expert" | "full-service" })}
                            />
                        </div>

                        {/* Urgency */}
                        <div className="border-t border-neutral-200 pt-8">
                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                HOW URGENT IS THIS?
                            </Typography>
                            <div className="flex flex-wrap gap-3">
                                {URGENCIES.map(u => {
                                    const isSelected = profile.urgency === u.value;
                                    return (
                                        <button
                                            key={u.value}
                                            onClick={() => dispatch({ type: "SET_URGENCY", payload: u.value as "today" | "week" | "month" | "researching" })}
                                            className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                                                isSelected
                                                    ? "bg-primary-600 border-primary-600 text-white shadow-sm ring-2 ring-primary-100 ring-offset-1"
                                                    : "border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-neutral-50"
                                            }`}
                                        >
                                            {u.label}
                                        </button>
                                    );
                                })}
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
