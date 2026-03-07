import { useState } from "react";

interface EngagementModalProps {
    providerName?: string;
    market?: string;
    category?: string;
    onClose: () => void;
    onSubmit?: (details: string) => void;
}

export function EngagementModal({
    providerName = "Acme Compliance",
    market = "DE, EU",
    category = "Tax & VAT",
    onClose,
    onSubmit,
}: EngagementModalProps) {
    const [details, setDetails] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        setSubmitted(true);
        onSubmit?.(details);
        setTimeout(onClose, 1500);
    };

    return (
        /* Backdrop */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
            <div className="flex flex-col w-full max-w-[560px] bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-slate-900 dark:text-white text-lg font-semibold tracking-tight">
                        Request Proposal from {providerName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-6">
                    {/* Context summary */}
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-300/50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200">
                            <span className="material-symbols-outlined text-[16px] text-[#137fec]">public</span>
                            <span>Market: {market}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-300/50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200">
                            <span className="material-symbols-outlined text-[16px] text-[#137fec]">account_balance</span>
                            <span>Category: {category}</span>
                        </div>
                    </div>

                    {/* Textarea */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="engagement-details">
                            Additional Details{" "}
                            <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            id="engagement-details"
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Add any specific requirements, timelines, or context for the provider..."
                            className="w-full resize-y min-h-[120px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] p-3 text-sm transition-shadow outline-none"
                        />
                    </div>

                    {/* Privacy notice */}
                    <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-xs">
                        <span className="material-symbols-outlined text-[16px] shrink-0">shield</span>
                        <p>Protected by AI Privacy Gate. Your request is anonymized until you choose to reveal your identity to the provider.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitted}
                        className={`px-5 py-2 rounded-lg text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 ${submitted
                                ? "bg-green-600 cursor-default"
                                : "bg-[#137fec] hover:bg-[#137fec]/90"
                            }`}
                    >
                        <span>{submitted ? "Sent!" : "Submit Request"}</span>
                        <span className="material-symbols-outlined text-[18px]">
                            {submitted ? "check" : "send"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
