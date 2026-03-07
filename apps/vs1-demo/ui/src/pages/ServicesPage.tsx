import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    ComplianceDomain, 
    DomainTemplateLibrary 
} from "@complihub/compliance-engine/domain-schema";
import { 
    CountryRiskMatrix, 
    CountryCode 
} from "@complihub/compliance-engine/country-profile";

// Map domain keys to material symbols
const DOMAIN_ICONS: Record<string, string> = {
    [ComplianceDomain.TAX]: "payments",
    [ComplianceDomain.PRODUCT]: "inventory_2",
    [ComplianceDomain.MARKETING]: "ads_click",
    [ComplianceDomain.DATA]: "admin_panel_settings",
    [ComplianceDomain.CORPORATE]: "balance",
    [ComplianceDomain.ONGOING_MONITORING]: "visibility"
};

// Map domain keys to primary wizard routes or #
const DOMAIN_LINKS: Record<string, string> = {
    [ComplianceDomain.TAX]: "/wizard",
    [ComplianceDomain.DATA]: "/privacy",
    [ComplianceDomain.PRODUCT]: "#",
    [ComplianceDomain.MARKETING]: "#",
    [ComplianceDomain.CORPORATE]: "#",
    [ComplianceDomain.ONGOING_MONITORING]: "#",
};

// Map domain keys to descriptions
const DOMAIN_DESCRIPTIONS: Record<string, string> = {
    [ComplianceDomain.TAX]: "Navigate cross-border VAT obligations, registration thresholds, and marketplace taxation rules. We orchestrate your tax likelihood assessment and connect you with verified specialists for safe global expansion.",
    [ComplianceDomain.PRODUCT]: "Manage Extended Producer Responsibility (EPR) and packaging laws across jurisdictions. Ensure your products and packaging meet localized environmental standards to prevent border rejections and fines.",
    [ComplianceDomain.MARKETING]: "Validate advertising claims, SEO, and influencer marketing compliance. Protect your budget by ensuring your digital campaigns follow competitive and consumer protection laws in sensitive industries.",
    [ComplianceDomain.DATA]: "Achieve GDPR/CCPA compliance with privacy audits and secure tracking assessments. Our strict privacy pipeline sanitizes your data before AI processing, linking you with certified DPOs.",
    [ComplianceDomain.CORPORATE]: "Strategic legal entity formation and cross-border structuring. Select the correct corporate form in new markets to ensure long-term stability, liability protection, and operational handlers.",
    [ComplianceDomain.ONGOING_MONITORING]: "Your Compliance Operating System. Benefit from continuous regulatory tracking, automated partner SLA monitoring, and maturity audits to maintain long-term regulatory safety.",
};

// Organized services by domain
const ORGANIZED_SERVICES = Object.entries(DomainTemplateLibrary).map(([domain, templates]) => ({
    id: domain,
    label: domain.replace('_', ' '),
    description: DOMAIN_DESCRIPTIONS[domain] || "Specialized compliance modules for this domain.",
    icon: DOMAIN_ICONS[domain] || "policy",
    items: (templates as any[]).map(template => ({
        id: template.id,
        label: template.label,
        badge: domain === ComplianceDomain.TAX ? "Trending" : null,
        desc: template.description,
        href: DOMAIN_LINKS[domain] || "#",
        models: template.applicableBusinessModels || [],
        risk: template.riskWeight || 5
    }))
}));

const JURISDICTIONS = [
    "Global Jurisdiction",
    ...Object.keys(CountryRiskMatrix).map(code => {
        const names: Record<string, string> = {
            DE: "Germany",
            FR: "France",
            US: "United States",
            UK: "United Kingdom"
        };
        return names[code] || code;
    })
];

/* Orbital/glow SVG graphic for the hero */
function OrbitalGraphic() {
    return (
        <div className="relative w-[360px] h-[360px] flex items-center justify-center shrink-0">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[spin_30s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-cyan-500/15 animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute inset-16 rounded-full border border-cyan-400/10 animate-[spin_15s_linear_infinite]" />

            {/* Center glow */}
            <div className="absolute w-32 h-32 rounded-full bg-cyan-500/5 blur-2xl" />
            <div className="absolute w-20 h-20 rounded-full bg-cyan-400/10 blur-xl" />

            {/* Center icon */}
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-slate-800/80 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <span className="material-symbols-outlined text-cyan-400 text-[40px]">policy</span>
            </div>

            {/* Orbiting badges */}
            {[
                { icon: "payments", label: "Tax", angle: 60, r: 140 },
                { icon: "admin_panel_settings", label: "Privacy", angle: 150, r: 140 },
                { icon: "ads_click", label: "Marketing", angle: 240, r: 140 },
                { icon: "balance", label: "Corporate", angle: 330, r: 140 },
            ].map((item) => {
                const rad = (item.angle * Math.PI) / 180;
                const x = Math.cos(rad) * item.r;
                const y = Math.sin(rad) * item.r;
                return (
                    <div
                        key={item.label}
                        className="absolute flex flex-col items-center gap-1"
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center shadow-md">
                            <span className="material-symbols-outlined text-cyan-400 text-[20px]">{item.icon}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide whitespace-nowrap">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function ServicesPage() {
    const navigate = useNavigate();
    const [jurisdiction, setJurisdiction] = useState("Global Jurisdiction");
    const [query, setQuery] = useState("");

    const handleServicesClick = () => {
        if (window.location.pathname === "/" || window.location.pathname === "/services") {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-[#060b14] text-slate-100 font-['Inter',sans-serif] flex flex-col">

            {/* Navigation - EXACTLY matched to original LandingPage aesthetics */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-800 px-10 py-4 max-w-7xl mx-auto w-full bg-[#060b14] sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
                <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => navigate("/")}
                >
                    <div className="size-6 text-[#137fec] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">verified_user</span>
                    </div>
                    <h2 className="text-slate-100 text-xl font-bold leading-tight tracking-[-0.015em]">CompliHub360</h2>
                </div>

                <div className="flex flex-1 justify-end gap-8">
                    <nav className="hidden md:flex items-center gap-9">
                        <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer" onClick={handleServicesClick}>Services</a>
                        <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer" onClick={() => navigate("/countries")}>Countries</a>
                        <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer" onClick={() => navigate("/advisory")}>Advisory</a>
                    </nav>

                    <div className="flex gap-3 items-center">
                        <button className="text-slate-400 hover:text-slate-100 text-sm font-medium leading-normal transition-colors px-4 py-2">
                            Login
                        </button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-[#137fec] hover:bg-[#137fec]/90 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]">
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center relative overflow-hidden">
                {/* Ambient background glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 max-w-6xl w-full">
                    {/* Left: Text */}
                    <div className="flex-1 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-6">
                            <span className="material-symbols-outlined text-cyan-400 text-[14px]">auto_awesome</span>
                            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">AI-Powered Compliance</span>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
                            Global Compliance.{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                Orchestrated.
                            </span>
                        </h1>

                        <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
                            The first AI-native platform for cross-border legal and tax navigation.
                            Enterprise-grade intelligence for the modern global economy.
                        </p>

                        <button
                            onClick={() => navigate("/wizard")}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#137fec] hover:bg-[#137fec]/90 text-white rounded-xl font-bold text-base transition-all hover:scale-105 shadow-lg shadow-[#137fec]/20"
                        >
                            Launch Wizard
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                    </div>

                    {/* Right: Orbital graphic */}
                    <div className="hidden lg:flex items-center justify-center">
                        <OrbitalGraphic />
                    </div>
                </div>
            </section>

            {/* Search + Jurisdiction bar */}
            <section className="px-8 pb-12 max-w-4xl mx-auto w-full">
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Jurisdiction dropdown */}
                        <div className="relative md:w-56 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">public</span>
                            <select
                                value={jurisdiction}
                                onChange={e => setJurisdiction(e.target.value)}
                                className="appearance-none w-full h-12 pl-9 pr-8 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer"
                            >
                                {JURISDICTIONS.map(j => (
                                    <option key={j} value={j}>{j}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search regulations, legal precedents, or tax frameworks..."
                                className="w-full h-12 pl-11 pr-4 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                        </div>

                        {/* Ask AI button */}
                        <button
                            onClick={() => navigate("/results")}
                            className="h-12 px-6 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shrink-0"
                        >
                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            Ask AI
                        </button>
                    </div>
                </div>
            </section>

            {/* Categorized Services */}
            <div className="px-8 pb-20 max-w-6xl mx-auto w-full space-y-16">
                {ORGANIZED_SERVICES.map(domain => (
                    <section key={domain.id} className="space-y-8">
                        <header className="flex flex-col gap-2 px-2 border-l-2 border-cyan-500/50 pl-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-cyan-400 text-[28px]">{domain.icon}</span>
                                <h2 className="text-white text-2xl font-bold tracking-tight">{domain.label}</h2>
                            </div>
                            <p className="text-slate-400 text-sm max-w-2xl">{domain.description}</p>
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {domain.items.map(cat => (
                                <a
                                    key={cat.id}
                                    href={cat.href}
                                    onClick={e => { if (cat.href.startsWith("/")) { e.preventDefault(); navigate(cat.href); } }}
                                    className="group block p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:border-cyan-500/40 hover:bg-slate-800/40 transition-all duration-300 backdrop-blur-sm relative overflow-hidden"
                                >
                                    {/* Decorative gradient corner */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />

                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                                            <span className="material-symbols-outlined text-cyan-400 text-[24px]">{domain.icon}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {cat.badge && (
                                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                                                    {cat.badge}
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.risk > 7 ? 'text-red-400' : 'text-slate-500'}`}>
                                                Risk: {cat.risk}/10
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-cyan-50 transition-colors">
                                        {cat.label}
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">{cat.desc}</p>

                                    <div className="flex flex-wrap gap-1.5 mb-6">
                                        {cat.models.slice(0, 3).map((m: string) => (
                                            <span key={m} className="px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-slate-500 text-[10px] whitespace-nowrap">
                                                {m.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                        <div className="flex items-center gap-1.5 text-cyan-400/60 group-hover:text-cyan-400 transition-colors text-xs font-bold uppercase tracking-widest">
                                            <span>Configure</span>
                                            <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </div>
                                        <span className="text-slate-600 text-[10px] font-mono">{domain.id}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                <span>© 2024 CompliHub360. All rights reserved.</span>
                <div className="flex gap-6">
                    <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
                    <a href="#" className="hover:text-slate-300 transition-colors">API Docs</a>
                </div>
            </footer>
        </div>
    );
}
