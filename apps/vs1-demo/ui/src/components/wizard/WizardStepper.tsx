interface WizardStepperProps {
    currentStep: number;
    totalSteps: number;
    stepLabel: string;
}

export function WizardStepper({ currentStep, totalSteps, stepLabel }: WizardStepperProps) {
    const pct = Math.round((currentStep / totalSteps) * 100);

    return (
        <div className="px-8 pt-6 pb-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Step {currentStep} of {totalSteps}: {stepLabel}
                </p>
                <p className="text-xs font-bold text-[#137fec]">{pct}%</p>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                            i < currentStep
                                ? "bg-[#137fec]"
                                : i === currentStep - 1
                                ? "bg-[#137fec]"
                                : "bg-slate-800"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
