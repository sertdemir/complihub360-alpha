import { Typography } from "../ui/Typography";

interface WizardStepperProps {
    currentStep: number;
    totalSteps: number;
    stepLabel: string;
}

export function WizardStepper({ currentStep, totalSteps, stepLabel }: WizardStepperProps) {
    const pct = Math.round((currentStep / totalSteps) * 100);

    return (
        <div className="px-8 pt-6 pb-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <Typography variant="body" weight="semibold" className="uppercase tracking-widest text-neutral-500 text-[10px]">
                    Step {currentStep} of {totalSteps}: {stepLabel}
                </Typography>
                <Typography variant="body" weight="bold" className="text-primary-600 text-[10px]">
                    {pct}%
                </Typography>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                            i < currentStep
                                ? "bg-primary-500"
                                : i === currentStep - 1
                                ? "bg-primary-500"
                                : "bg-neutral-100"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
