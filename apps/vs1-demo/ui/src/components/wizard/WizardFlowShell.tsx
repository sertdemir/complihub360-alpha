import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

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
    const [direction, setDirection] = useState(1);
    const isReviewStep = currentStep === steps.length;
    const totalSteps = steps.length;

    const handleNext = () => {
        setDirection(1);
        onNext();
    };

    const handleBack = () => {
        setDirection(-1);
        if (currentStep === 0) {
            navigate("/wizard/category");
        } else {
            onBack();
        }
    };

    const handleSkip = () => {
        setDirection(1);
        onSkip?.();
    };

    return (
        <div className="w-full flex flex-col items-center justify-center text-neutral-900 font-['Inter',sans-serif]">
            <main className="w-full flex flex-col items-center justify-center px-4 py-8">
                <motion.div 
                    layout
                    transition={{ layout: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }}
                    className="w-full max-w-3xl bg-white border border-white/20 rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col wizard-card cursor-auto"
                >
                    <WizardStepper
                        currentStep={Math.min(currentStep + 1, totalSteps + 1)}
                        totalSteps={totalSteps + 1}
                        stepLabel={isReviewStep ? "Review" : steps[currentStep]?.label ?? ""}
                    />

                    {/* Animated content area */}
                    <div className="relative overflow-hidden w-full flex-1">
                        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                            <motion.div
                                key={currentStep}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                className="w-full px-8 py-8 flex flex-col gap-6"
                            >
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
                                            onGenerateResults={() => {
                                                const locale = window.location.pathname.split('/')[1] || 'en';
                                                navigate(`/${locale}/results`, { state: { searchProfile: profile } });
                                            }}
                                            isGuest={true}
                                        />
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Fixed footer */}
                    {!isReviewStep && (
                        <WizardFooter
                            onBack={handleBack}
                            onNext={handleNext}
                            onSkip={steps[currentStep]?.isOptional ? handleSkip : undefined}
                            nextDisabled={!steps[currentStep]?.isValid}
                            showBack={true}
                        />
                    )}
                    {isReviewStep && (
                        <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50">
                            <Button variant="ghost" onClick={handleBack} className="gap-2">
                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                Back
                            </Button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
