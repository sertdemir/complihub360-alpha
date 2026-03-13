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
        <div className="flex flex-col sm:flex-row gap-3">
            {bands.map((band, i) => {
                const selected = value === band.value;
                const pct = Math.round(((i + 1) / bands.length) * 100);
                return (
                    <button
                        key={band.value}
                        onClick={() => onChange(band.value)}
                        className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border text-center transition-all duration-200 ${
                            selected
                                ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm"
                                : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50"
                        }`}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            selected ? "text-primary-700" : "text-neutral-500"
                        }`}>
                            {pct === 25 ? "Starter" : pct === 50 ? "Growing" : pct === 75 ? "Scale" : "Enterprise"}
                        </span>
                        <span className={`text-sm font-semibold ${selected ? "text-primary-900" : "text-neutral-900"}`}>
                            {band.label}
                        </span>
                        {band.sublabel && (
                            <span className={`text-xs ${selected ? "text-primary-700" : "text-neutral-600"}`}>{band.sublabel}</span>
                        )}
                        {selected && (
                            <div className="absolute top-2 right-2">
                                <span className="material-symbols-outlined text-primary-500 text-base">check_circle</span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
