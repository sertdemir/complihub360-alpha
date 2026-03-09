interface YesNoToggleProps {
    value: "yes" | "no" | "";
    onChange: (value: "yes" | "no") => void;
    label?: string;
    description?: string;
}

export function YesNoToggle({ value, onChange, label, description }: YesNoToggleProps) {
    return (
        <div className="flex flex-col gap-3">
            {(label || description) && (
                <div>
                    {label && <p className="text-sm font-semibold text-slate-200">{label}</p>}
                    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                </div>
            )}
            <div className="flex gap-3">
                {(["yes", "no"] as const).map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                            value === opt
                                ? opt === "yes"
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                    : "border-rose-500 bg-rose-500/10 text-rose-400"
                                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {opt === "yes" ? "check_circle" : "cancel"}
                        </span>
                        {opt === "yes" ? "Yes" : "No"}
                    </button>
                ))}
            </div>
        </div>
    );
}
