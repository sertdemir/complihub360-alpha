import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { WizardReviewPanel } from "../../components/wizard/WizardReviewPanel";

interface FlowStep {
    label: string;
    content: ReactNode;
    isValid: boolean;
    isOptional?: boolean;
}

interface WizardFlowShellProps {
    steps: FlowStep[];
    currentStep: number;
    onNext: () => void;
    onBack: () => void;
    onSkip?: () => void;
    categoryRoute: string;
    title?: string;
    subtitle?: string;
}

export function WizardFlowShell({
    steps,
    currentStep,
    onNext,
    onBack,
    onSkip,
    title,
    subtitle,
}: WizardFlowShellProps) {
    const navigate = useNavigate();
    const { profile } = useWizard();
    const isReviewStep = currentStep === steps.length;
    const totalSteps = steps.length;

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col text-slate-100 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <WizardStepper
                        currentStep={Math.min(currentStep + 1, totalSteps + 1)}
                        totalSteps={totalSteps + 1}
                        stepLabel={isReviewStep ? "Review" : steps[currentStep]?.label ?? ""}
                    />
                    <div className="px-8 py-6 flex flex-col gap-6">
                        {!isReviewStep && (
                            <>
                                {(title || subtitle) && (
                                    <div>
                                        {title && (
                                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                                                {title}
                                            </h1>
                                        )}
                                        {subtitle && (
                                            <p className="text-slate-400 text-sm mt-2">{subtitle}</p>
                                        )}
                                    </div>
                                )}
                                {steps[currentStep]?.content}
                            </>
                        )}
                        {isReviewStep && (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#137fec]/10 border border-[#137fec]/30 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#137fec] text-xl">checklist</span>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-100">Confirm your answers</h1>
                                        <p className="text-slate-400 text-xs">Review all details before we generate your results.</p>
                                    </div>
                                </div>
                                <WizardReviewPanel
                                    onGenerateResults={() => navigate("/results", { state: { searchProfile: profile } })}
                                    isGuest={true}
                                />
                            </>
                        )}
                    </div>
                    {!isReviewStep && (
                        <WizardFooter
                            onBack={currentStep === 0 ? () => navigate("/wizard/category") : onBack}
                            onNext={onNext}
                            onSkip={steps[currentStep]?.isOptional ? onSkip : undefined}
                            nextDisabled={!steps[currentStep]?.isValid}
                            showBack={true}
                        />
                    )}
                    {isReviewStep && (
                        <div className="px-8 py-4 border-t border-slate-800 bg-slate-900/50">
                            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                Back
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
