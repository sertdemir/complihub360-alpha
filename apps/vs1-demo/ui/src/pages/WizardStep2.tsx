import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Marketplace = "amazon" | "shopify" | "own" | "multiple" | "";

const MARKETPLACES: { value: Marketplace; label: string; icon: string }[] = [
    { value: "amazon", label: "Amazon", icon: "shopping_bag" },
    { value: "shopify", label: "Shopify", icon: "storefront" },
    { value: "own", label: "Own store", icon: "language" },
    { value: "multiple", label: "Multiple", icon: "layers" },
];

export function WizardStep2() {
    const navigate = useNavigate();
    const [revenue, setRevenue] = useState("");
    const [marketplace, setMarketplace] = useState<Marketplace>("");
    const [warehousing, setWarehousing] = useState(false);

    return (
        <div className="bg-[#f7f7f7] dark:bg-[#191919] font-['Inter',sans-serif] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-[#191919] border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="bg-slate-900 text-white p-1 rounded">
                            <span className="material-symbols-outlined block">shield_person</span>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight">CompliHub360</h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <a className="hover:text-slate-600 transition-colors" href="#">Product</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Solutions</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Pricing</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Resources</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            Login
                        </button>
                        <button className="px-4 py-2 text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity">
                            Sign up
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
                {/* Breadcrumb */}
                <div className="w-full max-w-[720px] mb-6 flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Tax & VAT Flow</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-900 font-medium">Step 2: Tax Exposure</span>
                    </div>
                    <div className="font-medium">Step 2 of 4</div>
                </div>

                {/* Card */}
                <div className="w-full max-w-[720px] bg-white dark:bg-[#191919] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-8 md:p-10 space-y-8">
                        {/* Header */}
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined text-base">flag</span>
                                UNITED STATES
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Your tax exposure</h2>
                            <p className="text-slate-500">Configure your business details to help us determine your tax liabilities in the US market.</p>
                        </div>

                        <div className="space-y-10">
                            {/* Revenue */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                    Annual revenue range
                                </label>
                                <div className="relative">
                                    <select
                                        value={revenue}
                                        onChange={e => setRevenue(e.target.value)}
                                        className="w-full appearance-none bg-white dark:bg-[#191919] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none text-slate-700 dark:text-slate-300"
                                    >
                                        <option value="" disabled>Select range...</option>
                                        <option value="0-50k">$0 – $50,000</option>
                                        <option value="50k-250k">$50,000 – $250,000</option>
                                        <option value="250k-1m">$250,000 – $1,000,000</option>
                                        <option value="1m+">$1,000,000+</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            {/* Marketplace */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                    Marketplace usage
                                </label>
                                <div className="grid gap-3">
                                    {MARKETPLACES.map(m => (
                                        <label
                                            key={m.value}
                                            onClick={() => setMarketplace(m.value)}
                                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors group ${marketplace === m.value
                                                    ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800"
                                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${marketplace === m.value
                                                            ? "border-slate-900 dark:border-white bg-slate-900 dark:bg-white"
                                                            : "border-slate-300 dark:border-slate-600"
                                                        }`}
                                                >
                                                    {marketplace === m.value && (
                                                        <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900" />
                                                    )}
                                                </div>
                                                <span className="font-medium">{m.label}</span>
                                            </div>
                                            <span className={`material-symbols-outlined transition-colors ${marketplace === m.value ? "text-slate-900 dark:text-white" : "text-slate-300"}`}>
                                                {m.icon}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Warehousing Toggle */}
                            <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                                        Warehousing in a foreign country?
                                    </label>
                                    <p className="text-sm text-slate-500">Do you store inventory in centers outside your home country?</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold transition-colors ${!warehousing ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>NO</span>
                                    <button
                                        onClick={() => setWarehousing(!warehousing)}
                                        className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${warehousing ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white dark:bg-slate-900 shadow transition-transform ${warehousing ? "translate-x-5" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                    <span className={`text-xs font-bold transition-colors ${warehousing ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>YES</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-1/3 space-y-2">
                            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-900 dark:bg-white w-2/4 rounded-full" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Profile Completion: 50%</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => navigate("/wizard")}
                                className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => navigate("/wizard/3")}
                                className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        Your data is secure and encrypted.
                    </p>
                </div>
            </main>

            <footer className="p-6 text-center text-slate-400 text-xs">
                © 2024 CompliHub360. All rights reserved.
            </footer>
        </div>
    );
}
