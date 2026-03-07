import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Intent = "self-check" | "expert" | "full-service";
type Urgency = "today" | "week" | "month" | "researching";

const INTENTS: { value: Intent; label: string; desc: string; icon: string }[] = [
    { value: "self-check", label: "Quick self-check", desc: "Get immediate feedback on basic requirements.", icon: "fact_check" },
    { value: "expert", label: "Expert advice", desc: "Speak with a specialist for complex cases.", icon: "psychology" },
    { value: "full-service", label: "Full service", desc: "End-to-end management by our team.", icon: "verified_user" },
];

const URGENCIES: { value: Urgency; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This week" },
    { value: "month", label: "This month" },
    { value: "researching", label: "Just researching" },
];

export function WizardStep3() {
    const navigate = useNavigate();
    const [intent, setIntent] = useState<Intent>("self-check");
    const [urgency, setUrgency] = useState<Urgency>("today");
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState("");

    const steps = [true, true, true, false]; // step 3 of 4

    return (
        <div className="bg-[#f7f7f7] dark:bg-[#191919] font-['Inter',sans-serif] text-slate-900 dark:text-slate-100 min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-900/10 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-3xl">shield_person</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">CompliHub360</h2>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a className="text-sm font-medium hover:text-slate-600 transition-colors" href="#">Solutions</a>
                        <a className="text-sm font-medium hover:text-slate-600 transition-colors" href="#">Pricing</a>
                        <a className="text-sm font-medium hover:text-slate-600 transition-colors" href="#">About</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 text-sm font-bold border border-slate-900/20 rounded-lg hover:bg-slate-900/5 transition-colors">Login</button>
                        <button className="px-4 py-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-colors">Sign up</button>
                    </div>
                </div>
            </header>

            <main className="py-12 px-6">
                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                        Find the right compliance solution in minutes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Answer a few questions and we'll handle the rest.</p>
                </div>

                {/* Wizard Card */}
                <div className="max-w-[720px] mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-900/5 overflow-hidden">
                    <div className="p-8 md:p-10">
                        {/* Location badge */}
                        <div className="flex items-center gap-2 mb-6">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-900/5">
                                <span className="material-symbols-outlined text-sm text-slate-900 dark:text-white">flag</span>
                                <span className="text-[11px] font-bold tracking-wider uppercase">United States</span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-2">3. What outcome do you want?</h2>
                            <p className="text-slate-500 dark:text-slate-400">We'll tailor results and recommendations based on your intent.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Intent tiles */}
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">What do you need right now?</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {INTENTS.map(item => {
                                        const isSel = intent === item.value;
                                        return (
                                            <div
                                                key={item.value}
                                                onClick={() => setIntent(item.value)}
                                                className={`relative flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all ${isSel
                                                        ? "border-slate-900 bg-slate-900/5 dark:border-white dark:bg-white/5"
                                                        : "border-slate-900/10 hover:border-slate-900/30"
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined mb-3 ${isSel ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                                    {item.icon}
                                                </span>
                                                <span className="font-bold text-sm block">{item.label}</span>
                                                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                                {isSel && (
                                                    <div className="absolute top-3 right-3">
                                                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-lg">check_circle</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Urgency */}
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">How urgent is this?</h3>
                                <div className="flex flex-wrap gap-2">
                                    {URGENCIES.map(u => (
                                        <button
                                            key={u.value}
                                            onClick={() => setUrgency(u.value)}
                                            className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${urgency === u.value
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                                                    : "border-slate-900/10 hover:border-slate-900/30"
                                                }`}
                                        >
                                            {u.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional note */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setNoteOpen(o => !o)}
                                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <span className={`material-symbols-outlined text-lg transition-transform ${noteOpen ? "rotate-90" : ""}`}>
                                        chevron_right
                                    </span>
                                    Add a short note (optional)
                                </button>
                                {noteOpen && (
                                    <div className="mt-4">
                                        <textarea
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            className="w-full min-h-[100px] p-4 rounded-lg border border-slate-900/10 bg-slate-50 dark:bg-zinc-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none outline-none"
                                            placeholder="Enter any additional details about your specific situation..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-12">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Step 3 of 4</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">75% Complete</span>
                            </div>
                            <div className="flex gap-1.5 h-1.5">
                                {steps.map((filled, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-full ${filled ? "bg-slate-900 dark:bg-white" : "bg-slate-900/10 dark:bg-zinc-700"}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-zinc-800/50 border-t border-slate-900/5">
                        <button
                            onClick={() => navigate("/wizard/2")}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold border border-slate-900/10 rounded-lg hover:bg-white dark:hover:bg-zinc-700 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Back
                        </button>
                        <button
                            onClick={() => navigate("/results")}
                            className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 shadow-lg transition-all"
                        >
                            Continue
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </main>

            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900/5 mt-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50 grayscale">
                        <span className="material-symbols-outlined text-xl">shield_person</span>
                        <span className="font-bold">CompliHub360</span>
                    </div>
                    <div className="flex gap-8 text-xs font-medium text-slate-400">
                        <a className="hover:text-slate-600" href="#">Privacy Policy</a>
                        <a className="hover:text-slate-600" href="#">Terms of Service</a>
                        <a className="hover:text-slate-600" href="#">Contact Support</a>
                    </div>
                    <p className="text-xs text-slate-400">© 2024 CompliHub360 Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
