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
                                ? "bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-500/20"
                                : "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
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
