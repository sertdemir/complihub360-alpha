import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { WizardReviewPanel } from "../../components/wizard/WizardReviewPanel";

export function WizardReviewStep() {
    const navigate = useNavigate();
    const { profile } = useWizard();

    const handleGenerate = () => {
        navigate("/results", { state: { searchProfile: profile } });
    };

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper currentStep={6} totalSteps={6} stepLabel="Review" />
                    <div className="px-8 py-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-[#137fec]/10 border border-[#137fec]/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#137fec] text-xl">checklist</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-100">Review your answers</h1>
                                <p className="text-slate-400 text-xs">Confirm everything looks right before we generate your results.</p>
                            </div>
                        </div>
                        <WizardReviewPanel onGenerateResults={handleGenerate} isGuest={true} />
                    </div>
                    <div className="px-8 py-4 border-t border-slate-800 bg-slate-900/50">
                        <button
                            onClick={() => navigate("/wizard/complexity")}
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Back to previous step
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
