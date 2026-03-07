import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
    {
        icon: "payments",
        label: "Tax & VAT",
        badge: "Trending",
        desc: "Cross-border tax regulations, VAT compliance, and automated reporting systems for global trade.",
        href: "/wizard",
    },
    {
        icon: "admin_panel_settings",
        label: "Data Privacy",
        badge: null,
        desc: "GDPR, CCPA, and regional data handling frameworks with intelligent user consent management.",
        href: "/privacy",
    },
    {
        icon: "ads_click",
        label: "Marketing & SEO",
        badge: null,
        desc: "Digital advertising standards, cookie governance, and content liability rules for publishers.",
        href: "#",
    },
    {
        icon: "balance",
        label: "Corporate Law",
        badge: null,
        desc: "Legal entity formation, labor law adherence, and corporate governance oversight in 150+ countries.",
        href: "#",
    },
];

const JURISDICTIONS = [
    "Global Jurisdiction",
    "European Union",
    "United States",
    "Germany",
    "United Kingdom",
    "Australia",
    "Canada",
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

    return (
        <div className="min-h-screen bg-[#060b14] text-slate-100 font-['Inter',sans-serif] flex flex-col">

            {/* Navigation */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-slate-800/80 bg-[#060b14]/95 backdrop-blur-sm">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate("/")}
                >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-cyan-400 text-[18px]">verified_user</span>
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">CompliHub360</span>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <button onClick={() => navigate("/services")} className="text-cyan-400 border-b border-cyan-400 pb-0.5">Services</button>
                    <button className="text-slate-400 hover:text-white transition-colors">Countries</button>
                    <button className="text-slate-400 hover:text-white transition-colors">Advisory</button>
                </nav>

                <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
                        Login
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-sm font-bold rounded-lg transition-colors"
                    >
                        Sign Up
                    </button>
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
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-base transition-all hover:scale-105 shadow-lg shadow-cyan-500/20"
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

            {/* Category Cards */}
            <section className="px-8 pb-20 max-w-4xl mx-auto w-full">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                    Browse Intelligence Categories
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CATEGORIES.map(cat => (
                        <a
                            key={cat.label}
                            href={cat.href}
                            onClick={e => { if (cat.href.startsWith("/")) { e.preventDefault(); navigate(cat.href); } }}
                            className="group block p-6 bg-slate-900/50 border border-slate-700/50 rounded-2xl hover:border-cyan-500/40 hover:bg-slate-800/50 transition-all duration-200 backdrop-blur-sm"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-cyan-400 text-[24px]">{cat.icon}</span>
                                </div>
                                {cat.badge && (
                                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold uppercase tracking-wider">
                                        {cat.badge}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-cyan-50 transition-colors">
                                {cat.label}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{cat.desc}</p>
                            <div className="mt-4 flex items-center gap-1 text-cyan-400/60 group-hover:text-cyan-400 transition-colors text-sm font-medium">
                                <span>Explore</span>
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </div>
                        </a>
                    ))}
                </div>
            </section>

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
