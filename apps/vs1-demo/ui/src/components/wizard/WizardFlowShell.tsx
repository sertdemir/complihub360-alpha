import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useWizard } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { WizardReviewPanel } from "../../components/wizard/WizardReviewPanel";
import { Typography } from "../ui/Typography";
import { Button } from "../ui/Button";

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
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper
                        currentStep={Math.min(currentStep + 1, totalSteps + 1)}
                        totalSteps={totalSteps + 1}
                        stepLabel={isReviewStep ? "Review" : steps[currentStep]?.label ?? ""}
                    />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        {!isReviewStep && (
                            <>
                                {(title || subtitle) && (
                                    <div className="flex flex-col gap-2">
                                        {title && (
                                            <Typography variant="h2">
                                                {title}
                                            </Typography>
                                        )}
                                        {subtitle && (
                                            <Typography variant="body" className="text-neutral-600">
                                                {subtitle}
                                            </Typography>
                                        )}
                                    </div>
                                )}
                                {steps[currentStep]?.content}
                            </>
                        )}
                        {isReviewStep && (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-primary-600 text-xl">checklist</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Typography variant="h3">Confirm your answers</Typography>
                                        <Typography variant="ui-small" className="text-neutral-600">Review all details before we generate your results.</Typography>
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
                        <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50">
                            <Button variant="ghost" onClick={onBack} className="gap-2">
                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                Back
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
