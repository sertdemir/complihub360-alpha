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
        <div className="px-8 py-5 border-t border-slate-800 bg-[#0b1117]/60 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
                {showBack && onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back
                    </button>
                )}
                {onSkip && (
                    <button
                        onClick={onSkip}
                        className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                    >
                        Skip
                    </button>
                )}
            </div>
            <button
                onClick={onNext}
                disabled={nextDisabled}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    nextDisabled
                        ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-[#137fec] hover:bg-[#137fec]/90 text-white shadow-lg shadow-[#137fec]/20"
                }`}
            >
                {nextLabel}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
        </div>
    );
}
