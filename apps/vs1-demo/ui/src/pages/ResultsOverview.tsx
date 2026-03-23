import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Typography } from "../components/ui/Typography";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { EngagementModal } from "../components/EngagementModal";
import { getSearchResults, SearchResults, LawInfo, ArticleInfo, TipInfo, ProviderInfo } from "../services/resultsService";
import { SearchProfile } from "../components/wizard/WizardContext";

export function ResultsOverview() {
    const navigate = useNavigate();
    const location = useLocation();
    const profile = location.state?.searchProfile as SearchProfile | undefined;

    const [modalProvider, setModalProvider] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<SearchResults | null>(null);

    useEffect(() => {
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

        return () => { isMounted = false; };
    }, [profile]);

    return (
        <div className="min-h-screen bg-neutral-50 font-sans pt-24">
            {modalProvider && (
                <EngagementModal
                    providerName={modalProvider}
                    onClose={() => setModalProvider(null)}
                />
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-32 px-4">
                    <div className="w-16 h-16 rounded-full bg-primary-50 border-2 border-primary-200 flex items-center justify-center mb-6 animate-pulse">
                        <span className="material-symbols-outlined text-3xl text-primary-500">search</span>
                    </div>
                    <Typography variant="h2" weight="semibold" className="mb-2 text-center">
                        Generating Compliance Overview…
                    </Typography>
                    <Typography variant="body" className="text-neutral-500 text-center max-w-md">
                        Connecting to legal databases and processing your wizard profile.
                    </Typography>
                </div>
            )}

            {!loading && results && (
                <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                        <div className="flex flex-col gap-1">
                            <Typography variant="h1" weight="bold">
                                Compliance Overview
                            </Typography>
                            <Typography variant="body" className="text-neutral-500">
                                AI Summary based on your provided context: <span className="font-semibold text-neutral-700">{results.queryText}</span>
                            </Typography>
                        </div>
                        <RiskBadge level={results.riskLevel} />
                    </div>

                    {/* Content + Sidebar */}
                    <div className="flex flex-col lg:flex-row gap-10">
                        {/* Main Content — all sections stacked */}
                        <div className="flex-1 min-w-0 flex flex-col gap-10">

                            {/* ─── Section 1: Key Findings ─────────────────────── */}
                            <section>
                                <SectionHeader icon="auto_awesome" title="Key Findings" />
                                <Card>
                                    <CardContent className="pt-6">
                                        <ul className="space-y-5 list-none pl-0">
                                            {results.findings.map(item => (
                                                <li key={item.n} className="flex gap-4">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center font-bold text-ui-small border border-primary-200">
                                                        {item.n}
                                                    </span>
                                                    <div>
                                                        <Typography variant="body" weight="semibold" as="strong" className="block mb-1">
                                                            {item.title}
                                                        </Typography>
                                                        <Typography variant="ui-small" className="text-neutral-600">
                                                            {item.text}{" "}
                                                            <a className="text-primary-500 hover:underline font-medium" href="#">
                                                                {item.ref}
                                                            </a>
                                                        </Typography>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-8 p-4 bg-accent-50 rounded-lg border border-accent-200">
                                            <Typography variant="caption" weight="semibold" className="text-accent-700 mb-2 block">
                                                Recommended Immediate Action
                                            </Typography>
                                            <Typography variant="ui-small" className="text-neutral-700">
                                                {results.actionRecommendation}
                                            </Typography>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>

                            {/* ─── Section 2: Laws & Regulations ──────────────── */}
                            {results.laws.length > 0 && (
                                <section>
                                    <SectionHeader icon="account_balance" title="Laws & Regulations" />
                                    <div className="flex flex-col gap-3">
                                        {results.laws.map((law, idx) => (
                                            <Card key={idx}>
                                                <CardContent className="pt-5">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-9 h-9 rounded-md bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-lg text-primary-500">account_balance</span>
                                                            </div>
                                                            <div>
                                                                <Typography variant="body" weight="semibold">{law.title}</Typography>
                                                                <Typography variant="ui-small" className="text-neutral-500 mt-0.5">{law.description}</Typography>
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 px-2 py-1 bg-neutral-100 text-neutral-600 rounded-sm text-caption font-semibold">
                                                            {law.level}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── Section 3: Articles & Tutorials ────────────── */}
                            {results.articles.length > 0 && (
                                <section>
                                    <SectionHeader icon="menu_book" title="Articles & Tutorials" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.articles.map((article, idx) => (
                                            <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between">
                                                <CardContent className="pt-5 flex-1">
                                                    <Typography variant="body" weight="semibold" className="mb-2 line-clamp-2">
                                                        {article.title}
                                                    </Typography>
                                                    <Typography variant="ui-small" className="text-neutral-500 line-clamp-3">
                                                        {article.excerpt}
                                                    </Typography>
                                                </CardContent>
                                                <div className="flex items-center gap-2 text-caption text-neutral-400 px-6 pb-4 pt-2 border-t border-neutral-100">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    {article.readTime}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── Section 4: Actionable Tips ─────────────────── */}
                            {results.tips.length > 0 && (
                                <section>
                                    <SectionHeader icon="lightbulb" title="Actionable Tips" />
                                    <div className="flex flex-col gap-3">
                                        {results.tips.map((tip, idx) => {
                                            const iconMap = { action: "build", warning: "warning", info: "lightbulb" };
                                            const bgMap = {
                                                action: "bg-primary-50 text-primary-500 border-primary-200",
                                                warning: "bg-warning-bg text-warning-700 border-warning-500/30",
                                                info: "bg-neutral-100 text-neutral-600 border-neutral-200",
                                            };
                                            return (
                                                <Card key={idx}>
                                                    <CardContent className="pt-5 flex items-start gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${bgMap[tip.type]}`}>
                                                            <span className="material-symbols-outlined text-[20px]">{iconMap[tip.type]}</span>
                                                        </div>
                                                        <div>
                                                            <Typography variant="body" weight="semibold" className="mb-1">{tip.title}</Typography>
                                                            <Typography variant="ui-small" className="text-neutral-500">{tip.description}</Typography>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Provider Sidebar */}
                        <aside className="w-full lg:w-[360px] shrink-0">
                            <div className="sticky top-28 flex flex-col gap-4">
                                <Typography variant="h3" weight="semibold" className="px-1">
                                    Top Matching Providers
                                </Typography>
                                {results.providers.map(p => (
                                    <ProviderCard key={p.name} provider={p} onRequest={() => setModalProvider(p.name)} />
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-primary-500">{icon}</span>
            <Typography variant="h3" weight="semibold">{title}</Typography>
        </div>
    );
}

function RiskBadge({ level }: { level: "Low" | "Medium" | "High" }) {
    const styles = {
        Low:    "bg-success-bg text-success-700 border-success-500/30",
        Medium: "bg-warning-bg text-warning-700 border-warning-500/30",
        High:   "bg-error-bg text-error-700 border-error-500/30",
    };
    const icons = { Low: "check_circle", Medium: "warning", High: "error" };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-pill border text-ui-small font-semibold ${styles[level]}`}>
            <span className="material-symbols-outlined text-[16px]">{icons[level]}</span>
            Risk Level: {level}
        </div>
    );
}

function ProviderCard({ provider, onRequest }: { provider: ProviderInfo; onRequest: () => void }) {
    return (
        <Card className="hover:border-primary-300 transition-colors">
            <CardContent className="pt-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-500 font-bold text-h3">
                            {provider.initial}
                        </div>
                        <div>
                            <Typography variant="ui-small" weight="semibold" as="h4" className="text-neutral-900">
                                {provider.name}
                            </Typography>
                            <Typography variant="caption" className="text-neutral-400 normal-case tracking-normal">
                                {provider.type}
                            </Typography>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-success-bg text-success-700 px-2 py-1 rounded-sm text-caption font-bold">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        {provider.match}%
                    </div>
                </div>
                <Typography variant="ui-small" className="text-neutral-500 mb-4 line-clamp-2">
                    {provider.desc}
                </Typography>
                {provider.primary ? (
                    <Button variant="primary" fullWidth onClick={onRequest} className="gap-2">
                        Request Proposal
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Button>
                ) : (
                    <Button variant="outline" fullWidth className="gap-2">
                        View Profile
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
