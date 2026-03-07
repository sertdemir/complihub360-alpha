import { useState } from "react";
import { useNavigate } from "react-router-dom";

type TabId = "overview" | "laws" | "articles" | "tips";

const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview (AI)" },
    { id: "laws", label: "Laws & Regulations" },
    { id: "articles", label: "Articles & Tutorials" },
    { id: "tips", label: "Actionable Tips" },
];

const PROVIDERS = [
    {
        initial: "S",
        name: "SecureComply Inc.",
        type: "Fintech Data Specialists",
        match: 98,
        desc: "Specialized legal consulting firm with deep expertise in EU financial regulations and GDPR alignment.",
        primary: true,
    },
    {
        initial: "L",
        name: "LexTech Solutions",
        type: "Compliance Software",
        match: 95,
        desc: "Automated data retention mapping software tailored for banking and fintech platforms.",
        primary: true,
    },
    {
        initial: "G",
        name: "Global Data Law",
        type: "Legal Advisory",
        match: 89,
        desc: "Global law firm providing comprehensive data protection officer (DPO) services and audits.",
        primary: false,
    },
];

export function ResultsOverview() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [query, setQuery] = useState("GDPR data retention policies for fintech");

    return (
        <div className="bg-[#f5f7f8] dark:bg-[#101922] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-['Inter',sans-serif]">
            <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">

                    {/* Top Nav */}
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 sticky top-0 z-10">
                        <div className="flex items-center gap-8 w-full max-w-[1440px] mx-auto">
                            <div
                                className="flex items-center gap-4 text-[#0a7ff5] cursor-pointer"
                                onClick={() => navigate("/")}
                            >
                                <div className="size-6 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">policy</span>
                                </div>
                                <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">
                                    CompliHub360
                                </h2>
                            </div>

                            {/* Search */}
                            <div className="flex flex-col min-w-40 h-10 w-full max-w-xl mx-auto hidden md:flex">
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-300 dark:border-slate-700 focus-within:border-[#0a7ff5] transition-colors">
                                    <div className="text-slate-500 dark:text-slate-400 flex border-none bg-slate-50 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <input
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-slate-50 dark:bg-slate-800 placeholder:text-slate-500 dark:placeholder:text-slate-400 px-4 text-base font-normal leading-normal"
                                        placeholder="Search compliance requirements..."
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-4 ml-auto">
                                <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-[#0a7ff5] transition-colors hidden sm:block">
                                    <span className="material-symbols-outlined">notifications</span>
                                </button>
                                <div
                                    className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                                    onClick={() => navigate("/dashboard")}
                                >
                                    U
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <div className="flex flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 gap-6 flex-col lg:flex-row">

                        {/* Left Pane */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Tabs */}
                            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 sticky top-[65px] bg-[#f5f7f8] dark:bg-[#101922] z-10 pt-2">
                                <div className="flex gap-6 overflow-x-auto">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 whitespace-nowrap transition-colors text-sm font-semibold tracking-[0.015em] ${activeTab === tab.id
                                                    ? "border-b-[#0a7ff5] text-[#0a7ff5] font-bold"
                                                    : "border-b-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="py-6 flex flex-col gap-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold leading-tight">
                                        Compliance Overview
                                    </h1>
                                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-4 border border-amber-200 dark:border-amber-800/50">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        <p className="text-sm font-semibold leading-normal">Risk Level: Medium</p>
                                    </div>
                                </div>

                                <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-relaxed">
                                    AI Summary based on your query regarding {query}.
                                </p>

                                {/* AI Summary */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                                    <div className="max-w-none">
                                        <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Key Findings</h3>
                                        <ul className="space-y-4 list-none pl-0">
                                            {[
                                                {
                                                    n: 1,
                                                    title: "Storage Limitation Principle",
                                                    text: "Personal data must not be kept longer than necessary for the purposes for which it is processed. Fintechs must define clear retention periods.",
                                                    ref: "[Article 5(1)(e) GDPR]",
                                                },
                                                {
                                                    n: 2,
                                                    title: "Financial Records Exemptions",
                                                    text: "While GDPR requires minimization, national laws often mandate retaining financial records for 5–10 years for tax and AML purposes, overriding immediate deletion requests.",
                                                    ref: "[AMLD5 Guidelines]",
                                                },
                                                {
                                                    n: 3,
                                                    title: "Right to Erasure (Right to be Forgotten)",
                                                    text: "Users can request data deletion, but fintechs must balance this against legal obligations to retain transaction histories.",
                                                    ref: "[Article 17 GDPR]",
                                                },
                                            ].map(item => (
                                                <li key={item.n} className="flex gap-4">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a7ff5]/10 text-[#0a7ff5] flex items-center justify-center font-bold">
                                                        {item.n}
                                                    </span>
                                                    <div>
                                                        <strong className="text-slate-900 dark:text-slate-100 block mb-1">{item.title}</strong>
                                                        <p className="text-slate-600 dark:text-slate-300 m-0">
                                                            {item.text}{" "}
                                                            <a className="text-[#0a7ff5] hover:underline font-medium" href="#">
                                                                {item.ref}
                                                            </a>
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                                Recommended Immediate Action
                                            </h4>
                                            <p className="text-slate-700 dark:text-slate-300 m-0">
                                                Review and update your Data Retention Policy document to explicitly map specific data categories to their legal retention requirements (e.g., AML vs. Marketing data).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Pane: Provider Sidebar */}
                        <div className="w-full lg:w-1/3 xl:w-[400px] flex-shrink-0">
                            <div className="sticky top-[88px] flex flex-col gap-4">
                                <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight px-1">
                                    Top Matching Providers
                                </h2>
                                <div className="flex flex-col gap-4">
                                    {PROVIDERS.map(p => (
                                        <div
                                            key={p.name}
                                            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-[#0a7ff5]/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#0a7ff5] font-bold text-lg">
                                                        {p.initial}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-slate-900 dark:text-white font-semibold">{p.name}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{p.type}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    {p.match}%
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{p.desc}</p>
                                            {p.primary ? (
                                                <button className="w-full bg-[#0a7ff5] hover:bg-[#0a7ff5]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                                    Request Proposal
                                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                </button>
                                            ) : (
                                                <button className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
                                                    View Profile
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
