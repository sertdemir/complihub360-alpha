import { Button } from "../ui/Button";

interface WizardFooterProps {
    onBack?: () => void;
    onNext: () => void;
    onSkip?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
    showBack?: boolean;
}

export function WizardFooter({
    onBack,
    onNext,
    onSkip,
    nextLabel = "Next Step",
    nextDisabled = false,
    showBack = true,
}: WizardFooterProps) {
    return (
        <div className="px-8 py-5 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
                {showBack && onBack && (
                    <Button variant="secondary" onClick={onBack} className="gap-2">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back
                    </Button>
                )}
                {onSkip && (
                    <Button variant="ghost" onClick={onSkip} className="underline underline-offset-2 text-neutral-500">
                        Skip
                    </Button>
                )}
            </div>
            <Button
                variant="primary"
                onClick={onNext}
                disabled={nextDisabled}
                className="gap-2 px-6"
            >
                {nextLabel}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Button>
        </div>
    );
}
