import { useState } from "react";
import { useNavigate } from "react-router-dom";

type YesNo = "yes" | "no";

interface SegmentedQuestion {
    id: string;
    label: string;
    value: YesNo;
}

function SegmentedControl({
    value,
    onChange,
}: {
    value: YesNo;
    onChange: (v: YesNo) => void;
}) {
    return (
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit mt-3">
            {(["Yes", "No"] as const).map(opt => {
                const v = opt.toLowerCase() as YesNo;
                const active = value === v;
                return (
                    <button
                        key={v}
                        onClick={() => onChange(v)}
                        className={`px-8 py-2 text-sm font-semibold rounded-md transition-all ${active
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

const QUESTIONS = [
    { id: "q1", label: "Do you process personal data?" },
    { id: "q2", label: "Do you process sensitive data (health, biometric, political)?" },
    { id: "q3", label: "Do you collect children's data?" },
];

export function DataPrivacyStep1() {
    const navigate = useNavigate();
    const [answers, setAnswers] = useState<Record<string, YesNo>>({
        q1: "yes",
        q2: "no",
        q3: "no",
    });

    const steps = [true, false, false, false];

    const setAnswer = (id: string, v: YesNo) =>
        setAnswers(prev => ({ ...prev, [id]: v }));

    return (
        <div className="bg-[#f7f7f7] dark:bg-[#191919] font-['Inter',sans-serif] text-slate-900 dark:text-slate-100 min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-white dark:bg-[#191919] border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="bg-slate-900 text-white p-1 rounded">
                            <span className="material-symbols-outlined text-xl">security</span>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight">CompliHub360</h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <a className="hover:text-slate-600 transition-colors" href="#">Product</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Solutions</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Resources</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Pricing</a>
                    </nav>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Login / Sign up
                    </button>
                </div>
            </header>

            <main className="min-h-[calc(100vh-64px)] py-12 px-6 flex flex-col items-center">
                <div className="w-full max-w-[720px]">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-8 md:p-12">
                            {/* Location badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                                <span className="material-symbols-outlined text-sm">flag</span>
                                <span className="text-xs font-bold uppercase tracking-wider">United States</span>
                            </div>

                            <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">
                                Data collection scope
                            </h2>

                            <div className="space-y-10">
                                {QUESTIONS.map(q => (
                                    <div key={q.id} className="flex flex-col gap-2">
                                        <label className="text-base font-medium text-slate-700 dark:text-slate-300">
                                            {q.label}
                                        </label>
                                        <SegmentedControl
                                            value={answers[q.id] as YesNo}
                                            onChange={v => setAnswer(q.id, v)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => navigate("/wizard")}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Back
                            </button>

                            {/* Dot progress */}
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    Step 1 of 4
                                </span>
                                <div className="flex gap-1">
                                    {steps.map((filled, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 w-6 rounded-full ${filled
                                                    ? "bg-slate-900 dark:bg-white"
                                                    : "bg-slate-200 dark:bg-slate-700"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate("/results")}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Continue
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-6 text-xs text-slate-400 font-medium">
                        <a className="hover:text-slate-600 transition-colors" href="#">Privacy Policy</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Terms of Service</a>
                        <a className="hover:text-slate-600 transition-colors" href="#">Contact Support</a>
                    </div>
                </div>
            </main>
        </div>
    );
}
