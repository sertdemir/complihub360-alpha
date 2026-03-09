interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: string;
}

interface SingleSelectCardGroupProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
}

export function SingleSelectCardGroup({ options, value, onChange }: SingleSelectCardGroupProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map(opt => {
                const selected = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 group ${
                            selected
                                ? "border-[#137fec] bg-[#137fec]/8 shadow-lg shadow-[#137fec]/10"
                                : "border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800"
                        }`}
                    >
                        {opt.icon && (
                            <span className={`material-symbols-outlined text-2xl transition-colors ${
                                selected ? "text-[#137fec]" : "text-slate-400 group-hover:text-slate-300"
                            }`}>
                                {opt.icon}
                            </span>
                        )}
                        <div>
                            <div className={`font-semibold text-sm transition-colors ${
                                selected ? "text-slate-100" : "text-slate-300"
                            }`}>
                                {opt.label}
                            </div>
                            {opt.description && (
                                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                    {opt.description}
                                </div>
                            )}
                        </div>
                        {selected && (
                            <div className="absolute top-3 right-3">
                                <span className="material-symbols-outlined text-[#137fec] text-lg">
                                    check_circle
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
