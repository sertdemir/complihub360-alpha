import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EngagementModal } from "../components/EngagementModal";
import { getSearchResults, SearchResults, Finding, LawInfo, ArticleInfo, TipInfo, ProviderInfo } from "../services/resultsService";
import { SearchProfile } from "../components/wizard/WizardContext";

type TabId = "overview" | "laws" | "articles" | "tips";

const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview (AI)" },
    { id: "laws", label: "Laws & Regulations" },
    { id: "articles", label: "Articles & Tutorials" },
    { id: "tips", label: "Actionable Tips" },
];

export function ResultsOverview() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Extract profile from router state (passed from wizard)
    const profile = location.state?.searchProfile as SearchProfile | undefined;

    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [modalProvider, setModalProvider] = useState<string | null>(null);

    // Data state
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<SearchResults | null>(null);

    useEffect(() => {
        // Fetch dynamic results based on the wizard profile
        let isMounted = true;
        setLoading(true);

        getSearchResults(profile || null)
            .then(data => {
                if (isMounted) {
                    setResults(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Error fetching results", err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [profile]);

    return (
        <div className="bg-[#f5f7f8] dark:bg-[#101922] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-['Inter',sans-serif]">
            {modalProvider && (
                <EngagementModal
                    providerName={modalProvider}
                    onClose={() => setModalProvider(null)}
                />
            )}
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
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 transition-colors">
                                    <div className="text-slate-500 dark:text-slate-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <div className="flex items-center pl-3 w-full text-sm text-slate-700 dark:text-slate-300 truncate">
                                        {loading ? "Analyzing profile..." : (results?.queryText || "Search compliance requirements...")}
                                    </div>
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
                        
                        {/* Loading State */}
                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center py-24 min-w-0">
                                <span className="material-symbols-outlined text-4xl text-[#0a7ff5] animate-spin mb-4">progress_activity</span>
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Generating AI Compliance Overview...</h2>
                                <p className="text-slate-500 mt-2">Connecting to legal databases and processing your wizard profile.</p>
                            </div>
                        )}

                        {!loading && results && (
                            <>
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

                                    {/* Content Routing based on Tabs */}
                                    <div className="py-6 flex flex-col gap-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold leading-tight">
                                                Compliance Overview
                                            </h1>
                                            {results.riskLevel === "High" && (
                                                <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-4 border border-red-200 dark:border-red-800/50">
                                                    <span className="material-symbols-outlined text-sm">error</span>
                                                    <p className="text-sm font-semibold leading-normal">Risk Level: High</p>
                                                </div>
                                            )}
                                            {results.riskLevel === "Medium" && (
                                                <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-4 border border-amber-200 dark:border-amber-800/50">
                                                    <span className="material-symbols-outlined text-sm">warning</span>
                                                    <p className="text-sm font-semibold leading-normal">Risk Level: Medium</p>
                                                </div>
                                            )}
                                            {results.riskLevel === "Low" && (
                                                <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 border border-green-200 dark:border-green-800/50">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    <p className="text-sm font-semibold leading-normal">Risk Level: Low</p>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-relaxed">
                                            AI Summary based on your provided context: <span className="font-semibold text-slate-800 dark:text-slate-200">{results.queryText}</span>.
                                        </p>

                                        {/* Tab Content Rendering */}
                                        {activeTab === "overview" && <OverviewTabContent results={results} />}
                                        {activeTab === "laws" && <LawsTabContent laws={results.laws} />}
                                        {activeTab === "articles" && <ArticlesTabContent articles={results.articles} />}
                                        {activeTab === "tips" && <TipsTabContent tips={results.tips} />}

                                    </div>
                                </div>

                                {/* Right Pane: Provider Sidebar */}
                                <div className="w-full lg:w-1/3 xl:w-[400px] flex-shrink-0">
                                    <div className="sticky top-[88px] flex flex-col gap-4">
                                        <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight px-1">
                                            Top Matching Providers
                                        </h2>
                                        <div className="flex flex-col gap-4">
                                            {results.providers.map(p => (
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
                                                        <button
                                                            onClick={() => setModalProvider(p.name)}
                                                            className="w-full bg-[#0a7ff5] hover:bg-[#0a7ff5]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                                        >
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
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------------------
// Sub-Components for Tabs
// --------------------------------------------------------------------------------------

function OverviewTabContent({ results }: { results: SearchResults }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Key Findings</h3>
                <ul className="space-y-4 list-none pl-0">
                    {results.findings.map(item => (
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
                        {results.actionRecommendation}
                    </p>
                </div>
            </div>
        </div>
    );
}

function LawsTabContent({ laws }: { laws: LawInfo[] }) {
    return (
        <div className="flex flex-col gap-4">
            {laws.map((law, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#0a7ff5] text-[20px]">account_balance</span>
                                {law.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{law.description}</p>
                        </div>
                        <span className="shrink-0 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold">
                            {law.level}
                        </span>
                    </div>
                </div>
            ))}
            {laws.length === 0 && (
                <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No laws found mapping directly to your profile.
                </div>
            )}
        </div>
    );
}

function ArticlesTabContent({ articles }: { articles: ArticleInfo[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                            {article.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-4">
                            {article.excerpt}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {article.readTime}
                    </div>
                </div>
            ))}
            {articles.length === 0 && (
                <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl col-span-full">
                    No articles currently map to your specific scenario.
                </div>
            )}
        </div>
    );
}

function TipsTabContent({ tips }: { tips: TipInfo[] }) {
    return (
        <div className="flex flex-col gap-4">
            {tips.map((tip, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tip.type === 'action' ? 'bg-[#0a7ff5]/10 text-[#0a7ff5]' : 
                        tip.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                        <span className="material-symbols-outlined text-[20px]">
                            {tip.type === 'action' ? 'build' : tip.type === 'warning' ? 'warning' : 'lightbulb'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                            {tip.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {tip.description}
                        </p>
                    </div>
                </div>
            ))}
            {tips.length === 0 && (
                <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No actionable tips found for your specific profile yet.
                </div>
            )}
        </div>
    );
}
