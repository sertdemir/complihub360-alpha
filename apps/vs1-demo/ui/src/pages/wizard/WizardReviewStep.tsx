import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardReviewPanel } from "../../components/wizard/WizardReviewPanel";
import { Typography } from "../../components/ui/Typography";

export function WizardReviewStep() {
    const navigate = useNavigate();
    const { profile } = useWizard();

    const handleGenerate = () => {
        const locale = window.location.pathname.split('/')[1] || 'en';
        navigate(`/${locale}/results`, { state: { searchProfile: profile } });
    };

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={5} totalSteps={5} stepLabel="Review" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary-600 text-2xl">checklist</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Typography variant="h2">Review your answers</Typography>
                                <Typography variant="body" className="text-neutral-600">
                                    Confirm everything looks right before we generate your results.
                                </Typography>
                            </div>
                        </div>
                        <WizardReviewPanel onGenerateResults={handleGenerate} isGuest={true} />
                    </div>
                    <div className="px-8 py-5 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                        <button
                            onClick={() => navigate("/wizard/complexity")}
                            className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-primary-600 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                            Back to previous step
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
