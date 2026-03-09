import { useState } from "react";

interface CountryOption {
    code: string;
    label: string;
    flag: string;
}

const COUNTRIES: CountryOption[] = [
    { code: "DE", label: "Germany", flag: "🇩🇪" },
    { code: "EU", label: "European Union", flag: "🇪🇺" },
    { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
    { code: "US", label: "United States", flag: "🇺🇸" },
    { code: "CA", label: "Canada", flag: "🇨🇦" },
    { code: "AU", label: "Australia", flag: "🇦🇺" },
    { code: "FR", label: "France", flag: "🇫🇷" },
    { code: "NL", label: "Netherlands", flag: "🇳🇱" },
    { code: "AT", label: "Austria", flag: "🇦🇹" },
    { code: "CH", label: "Switzerland", flag: "🇨🇭" },
    { code: "ES", label: "Spain", flag: "🇪🇸" },
    { code: "IT", label: "Italy", flag: "🇮🇹" },
    { code: "PL", label: "Poland", flag: "🇵🇱" },
    { code: "ROW", label: "Rest of World", flag: "🌍" },
];

interface CountryMultiSelectProps {
    primaryCountry: string;
    value: string[];
    onChange: (value: string[]) => void;
}

export function CountryMultiSelect({ primaryCountry, value, onChange }: CountryMultiSelectProps) {
    const [search, setSearch] = useState("");

    const toggle = (code: string) => {
        if (code === primaryCountry) return;
        onChange(value.includes(code) ? value.filter(x => x !== code) : [...value, code]);
    };

    const filtered = COUNTRIES.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-[18px]">
                    search
                </span>
                <input
                    type="text"
                    placeholder="Search countries..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm placeholder-slate-500 focus:outline-none focus:border-[#137fec] transition-colors"
                />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {filtered.map(c => {
                    const isPrimary = c.code === primaryCountry;
                    const isSelected = isPrimary || value.includes(c.code);
                    return (
                        <button
                            key={c.code}
                            onClick={() => toggle(c.code)}
                            disabled={isPrimary}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                                isPrimary
                                    ? "border-[#137fec] bg-[#137fec]/10 text-slate-200 cursor-default"
                                    : isSelected
                                    ? "border-[#137fec] bg-[#137fec]/8 text-slate-200"
                                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                            }`}
                        >
                            <span className="text-lg">{c.flag}</span>
                            <span className="font-medium truncate">{c.label}</span>
                            {isPrimary && (
                                <span className="ml-auto text-[10px] font-bold text-[#137fec] uppercase">Primary</span>
                            )}
                            {isSelected && !isPrimary && (
                                <span className="ml-auto material-symbols-outlined text-[#137fec] text-[14px]">check</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {value.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                    {value.length} additional market{value.length > 1 ? "s" : ""} selected
                </p>
            )}
        </div>
    );
}
