interface ChipOption {
    value: string;
    label: string;
    icon?: string;
}

interface MultiSelectChipsProps {
    options: ChipOption[];
    value: string[];
    onChange: (value: string[]) => void;
}

export function MultiSelectChips({ options, value, onChange }: MultiSelectChipsProps) {
    const toggle = (v: string) => {
        onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
    };

    return (
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const selected = value.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        onClick={() => toggle(opt.value)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                            selected
                                ? "bg-[#137fec] border-[#137fec] text-white shadow-md shadow-[#137fec]/20"
                                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                        }`}
                    >
                        {opt.icon && (
                            <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                        )}
                        {opt.label}
                        {selected && (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
