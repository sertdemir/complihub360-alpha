import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Region = "de" | "eu" | "uk" | "us" | "ca" | "au" | "row";

interface RegionOption {
    value: Region;
    label: string;
    code: string;
    flag?: string;
    icon?: string;
    wide?: boolean;
}

const REGIONS: RegionOption[] = [
    { value: "de", label: "Germany", code: "DE", flag: "🇩🇪" },
    { value: "eu", label: "European Union", code: "EU", flag: "🇪🇺" },
    { value: "uk", label: "United Kingdom", code: "UK", flag: "🇬🇧" },
    { value: "us", label: "United States", code: "US", flag: "🇺🇸" },
    { value: "ca", label: "Canada", code: "CA", flag: "🇨🇦" },
    { value: "au", label: "Australia", code: "AU", flag: "🇦🇺" },
    { value: "row", label: "Rest of World", code: "ROW", icon: "public", wide: true },
];

export function WizardStep1() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState<Set<Region>>(new Set(["eu", "us"]));

    const toggle = (region: Region) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(region) ? next.delete(region) : next.add(region);
            return next;
        });
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#020617] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-['Inter',sans-serif]">
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
                {/* Header */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 px-10 py-4 bg-white dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="size-6 text-[#137fec]">
                            <span className="material-symbols-outlined text-[24px]">verified_user</span>
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-tight">CompliHub360</h2>
                    </div>
                    <button
                        onClick={() => navigate("/results")}
                        className="flex items-center justify-center rounded-lg h-9 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        Skip Wizard
                    </button>
                </header>

                {/* Main */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
                    <div className="w-full max-w-[720px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
                        {/* Progress */}
                        <div className="px-8 pt-8 pb-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Step 1 of 4: Market Scope
                                    </p>
                                    <p className="text-sm font-medium text-[#137fec]">25%</p>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full bg-[#137fec] rounded-full transition-all duration-300"
                                        style={{ width: "25%" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Question */}
                        <div className="px-8 py-4 flex flex-col gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                Where are your primary users located?
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                                Select the regions where your business operates to help us tailor compliance requirements.
                            </p>
                        </div>

                        {/* Region Grid */}
                        <div className="px-8 py-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {REGIONS.map(r => {
                                    const isChecked = selected.has(r.value);
                                    return (
                                        <label
                                            key={r.value}
                                            onClick={() => toggle(r.value)}
                                            className={`relative flex flex-col p-4 cursor-pointer rounded-lg border transition-colors ${r.wide ? "md:col-span-3" : ""
                                                } ${isChecked
                                                    ? "border-[#137fec] bg-blue-50 dark:bg-blue-900/10"
                                                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <div className={`flex items-center mb-3 ${r.wide ? "flex-row gap-3" : "justify-between"}`}>
                                                {r.flag && <span className="text-2xl" role="img">{r.flag}</span>}
                                                {r.icon && (
                                                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
                                                        {r.icon}
                                                    </span>
                                                )}
                                                {r.wide && (
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{r.label}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {r.code} – Global coverage beyond primary regions
                                                        </p>
                                                    </div>
                                                )}
                                                <div
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked
                                                            ? "bg-[#137fec] border-[#137fec]"
                                                            : "border-slate-300 dark:border-slate-600"
                                                        } ${r.wide ? "" : "ml-auto"}`}
                                                >
                                                    {isChecked && (
                                                        <span className="material-symbols-outlined text-[14px] text-white">check</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!r.wide && (
                                                <div className="mt-auto">
                                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{r.label}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.code}</p>
                                                </div>
                                            )}
                                            {isChecked && (
                                                <div className="absolute inset-0 border-2 border-[#137fec] rounded-lg pointer-events-none" />
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Nav */}
                        <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center mt-auto">
                            <button
                                onClick={() => navigate("/")}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => navigate("/results")}
                                className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-[#137fec] hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2"
                            >
                                Next Step
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
