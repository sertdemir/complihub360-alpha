interface RangeBand {
    value: string;
    label: string;
    sublabel?: string;
}

interface RangeSelectorProps {
    bands: RangeBand[];
    value: string;
    onChange: (value: string) => void;
}

export function RangeSelector({ bands, value, onChange }: RangeSelectorProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-2">
            {bands.map((band, i) => {
                const selected = value === band.value;
                const pct = Math.round(((i + 1) / bands.length) * 100);
                return (
                    <button
                        key={band.value}
                        onClick={() => onChange(band.value)}
                        className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 text-center transition-all duration-200 ${
                            selected
                                ? "border-[#137fec] bg-[#137fec]/10 shadow-lg shadow-[#137fec]/10"
                                : "border-slate-700 bg-slate-900 hover:border-slate-600"
                        }`}
                    >
                        <span className={`text-xs font-bold uppercase tracking-widest ${
                            selected ? "text-[#137fec]" : "text-slate-500"
                        }`}>
                            {pct === 25 ? "Starter" : pct === 50 ? "Growing" : pct === 75 ? "Scale" : "Enterprise"}
                        </span>
                        <span className={`text-base font-bold ${selected ? "text-slate-100" : "text-slate-300"}`}>
                            {band.label}
                        </span>
                        {band.sublabel && (
                            <span className="text-xs text-slate-500">{band.sublabel}</span>
                        )}
                        {selected && (
                            <div className="absolute top-2 right-2">
                                <span className="material-symbols-outlined text-[#137fec] text-base">check_circle</span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
