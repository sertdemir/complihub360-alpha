import { Typography } from "../ui/Typography";

interface WizardPreGateProps {
    currentDot: 0 | 1;
    label: string;
    countryBadge?: string;
}

const DOT_LABELS = ["Market", "Topic"];

export function WizardPreGate({ currentDot, label, countryBadge }: WizardPreGateProps) {
    return (
        <div className="px-8 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Typography
                    variant="body"
                    weight="semibold"
                    className="uppercase tracking-widest text-neutral-400 text-[10px]"
                >
                    Setting up
                </Typography>
                <span className="text-neutral-300">›</span>
                <Typography
                    variant="body"
                    weight="bold"
                    className="uppercase tracking-widest text-primary-600 text-[10px]"
                >
                    {label}
                </Typography>
            </div>
            <div className="flex items-center gap-4">
                {countryBadge && (
                    <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                        🌍 {countryBadge}
                    </span>
                )}
                <div className="flex items-center gap-2">
                    {DOT_LABELS.map((dotLabel, i) => (
                        <div key={dotLabel} className="flex items-center gap-1.5">
                            <div
                                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                    i <= currentDot ? "bg-primary-500" : "bg-neutral-200"
                                }`}
                            />
                            <span
                                className={`text-[10px] font-medium transition-colors duration-300 ${
                                    i === currentDot ? "text-primary-600" : "text-neutral-400"
                                }`}
                            >
                                {dotLabel}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
