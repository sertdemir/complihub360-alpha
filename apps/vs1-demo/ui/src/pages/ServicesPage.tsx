import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    ComplianceDomain, 
} from "@complihub/compliance-engine";

// Detailed NotebookLM Content
const DOMAIN_DATA = [
    {
        id: ComplianceDomain.TAX,
        icon: "payments",
        title: "VAT & Tax",
        short: "Umsatzsteuer & Steuern",
        desc: "Monitoring delivery thresholds and identifying registration obligations for cross-border commerce. Physical vs. digital goods regulations and revenue band checks.",
        features: ["Threshold Monitoring", "Digital Goods Nexus", "Revenue Band Analysis"],
        risk: 7
    },
    {
        id: ComplianceDomain.PRODUCT,
        icon: "inventory_2",
        title: "Product & Packaging (EPR)",
        short: "Produkthaftung & Verpackung",
        desc: "Structured navigation through local packaging laws and Extended Producer Responsibility (EPR). Categorization for manufacturers, resellers, and dropshippers.",
        features: ["EPR Registration", "Local Labeling Laws", "Packaging Act (VerpackG)"],
        risk: 8
    },
    {
        id: ComplianceDomain.DATA,
        icon: "admin_panel_settings",
        title: "Data & Privacy",
        short: "Datenschutz & DSGVO",
        desc: "Risk analysis regarding the GDPR, cookie compliance, tracking tools, and international data transfers. Evaluation of GA4, Meta, and Consent Systems.",
        features: ["GDPR Risk Audit", "PII Redaction Control", "Cookie Compliance"],
        risk: 9
    },
    {
        id: ComplianceDomain.MARKETING,
        icon: "ads_click",
        title: "Marketing & Advertising",
        short: "Werberecht",
        desc: "Validation of advertising claims (e.g., Health Claims) and prevention of legal warnings. Risk assessment based on marketing channels and industry sensitivity.",
        features: ["Claim Validation", "Ad-Channel Liability", "Sector-Specific Checks"],
        risk: 6
    },
    {
        id: ComplianceDomain.CORPORATE,
        icon: "balance",
        title: "Corporate & Structure",
        short: "Gesellschaftsrecht",
        desc: "Support for selecting the right legal entity and handling registrations in new target markets. Structural compliance for international expansion.",
        features: ["Entity Search", "Cross-Border Registration", "Operating Agreements"],
        risk: 5
    },
    {
        id: "full_compliance",
        icon: "hub",
        title: "Full Compliance Support",
        short: "Holistische Begleitung",
        desc: "Holistic compliance guidance for businesses planning rapid, low-risk expansions into multiple markets simultaneously.",
        features: ["Multi-Market Roadmap", "Expansion Strategy", "Risk Aggregation"],
        risk: 4
    }
];

const PILLARS = [
    {
        icon: "psychology",
        title: "Intelligent Risk Analysis",
        desc: "Complete an adaptive wizard to receive a structured overview of legal duties based on validated sources."
    },
    {
        icon: "handshake",
        title: "Orchestrated Expert Matching",
        desc: "Pre-qualified specialists via structured Engagement Requests. Guaranteed SLA confirmation and response times."
    },
    {
        icon: "dashboard_customize",
        title: "Monitoring & Dashboard",
        desc: "Save profiles, track request status, and export PDF reports for team sharing and internal audits."
    }
];

const TRUST_SIGNALS = [
    { icon: "fingerprint", title: "Privacy-First AI", text: "AI structures info, but local redaction strips PII before processing." },
    { icon: "verified", title: "SLA Monitoring", text: "Continuous monitoring of partner response times and quality." },
    { icon: "menu_book", title: "No Hallucinations", text: "Every recommendation is grounded in direct links to validated legal sources." }
];

export function ServicesPage() {
    const navigate = useNavigate();
    const [jurisdiction, setJurisdiction] = useState("Global Jurisdiction");

    return (
        <div className="min-h-screen bg-[#060b14] text-slate-100 font-['Inter',sans-serif] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/5 px-10 py-4 max-w-7xl mx-auto w-full bg-[#060b14]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/")}>
                    <div className="size-6 text-[#137fec] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">verified_user</span>
                    </div>
                    <h2 className="text-slate-100 text-xl font-bold leading-tight tracking-[-0.015em]">CompliHub360</h2>
                </div>

                <div className="flex flex-1 justify-end gap-8">
                    <nav className="hidden md:flex items-center gap-9">
                        <a 
                            className="text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            Services
                        </a>
                        <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer" onClick={() => navigate("/countries")}>Countries</a>
                        <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal cursor-pointer" href="#">Advisory</a>
                    </nav>

                    <div className="flex gap-3 items-center">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center justify-center rounded-lg h-9 px-5 bg-[#137fec] hover:bg-[#137fec]/90 transition-colors text-white text-sm font-bold">
                            Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center justify-center overflow-hidden border-b border-white/5">
                {/* Generated Hero Background */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/assets/compliance_orchestration_hero.png" 
                        alt="Compliance Orchestration"
                        className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#060b14]/50 via-[#060b14]/80 to-[#060b14]" />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-8">
                        <span className="material-symbols-outlined text-cyan-400 text-[14px]">hub</span>
                        <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest">Compliance Orchestration Layer</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8">
                        From regulatory uncertainty to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                            structured decisions.
                        </span>
                    </h1>
                    
                    <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
                        CompliHub360 orchestrates the transition from vague legal requirements 
                        to executable, expert-backed expansion strategies.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={() => navigate("/wizard")} className="w-full sm:w-auto px-8 py-3.5 bg-[#137fec] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all">
                            Start Risk Analysis
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                        <a href="#pillars" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 text-white rounded-xl font-bold border border-white/10 hover:bg-white/10 transition-all">
                            How it works
                        </a>
                    </div>
                </div>
            </section>

            {/* The 6 Domains Grid */}
            <section className="max-w-7xl mx-auto px-10 py-24 w-full">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Core Compliance Domains</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">Precise, structured navigation through specialized regulatory fields tailored for international expansión.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DOMAIN_DATA.map((domain) => (
                        <div key={domain.id} className="group p-8 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-cyan-500/30 transition-all backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="size-12 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[28px]">{domain.icon}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk: {domain.risk}/10</span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">{domain.title}</h3>
                            <p className="text-xs text-cyan-500/70 font-medium mb-4 uppercase tracking-wide">{domain.short}</p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">{domain.desc}</p>
                            
                            <div className="flex flex-wrap gap-1.5 pt-6 border-t border-white/5">
                                {domain.features.map(f => (
                                    <span key={f} className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] text-slate-300 font-medium">{f}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* The 3 Pillars / Flow Section */}
            <section id="pillars" className="bg-slate-950 px-10 py-32 border-y border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="mb-20">
                        <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 block">The Platform Infrastructure</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            A triple-layered orchestration <br /> for absolute certainty.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        {PILLARS.map((p, idx) => (
                            <div key={p.title} className="flex flex-col gap-6 relative">
                                {idx < 2 && (
                                    <div className="hidden lg:block absolute -right-8 top-12 w-16 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                                )}
                                <div className="size-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center text-cyan-400 border border-cyan-400/30">
                                    <span className="material-symbols-outlined text-[32px]">{p.icon}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-snug">{p.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{p.desc}</p>
                                
                                <div className="mt-4 flex items-center gap-2 text-cyan-500 text-xs font-bold uppercase tracking-widest cursor-pointer hover:gap-4 transition-all">
                                    Learn More <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Simple Visualization of Flow */}
                    <div className="mt-24 p-10 bg-[#060b14] border border-white/5 rounded-3xl relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                            <div className="text-center p-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">1. Input</span>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium">Business Context</div>
                            </div>
                            <div className="flex justify-center text-slate-700">
                                <span className="material-symbols-outlined text-[40px] animate-pulse">arrow_forward</span>
                            </div>
                            <div className="md:col-span-1 text-center bg-cyan-500/10 border border-cyan-500/30 p-8 rounded-2xl">
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 block">2. Orchestration Layer</span>
                                <div className="text-white font-bold text-lg">AI Gate + Risk Matrix</div>
                            </div>
                            <div className="flex justify-center text-slate-700">
                                <span className="material-symbols-outlined text-[40px] animate-pulse">arrow_forward</span>
                            </div>
                            <div className="text-center p-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">3. Result</span>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium">Expert Matching</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Signals Footer */}
            <section className="max-w-7xl mx-auto px-10 py-24 w-full border-b border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {TRUST_SIGNALS.map(s => (
                        <div key={s.title} className="flex gap-5">
                            <span className="material-symbols-outlined text-cyan-500 shrink-0">{s.icon}</span>
                            <div>
                                <h4 className="text-white font-bold mb-1">{s.title}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-10 py-12 w-full flex flex-col md:flex-row items-center justify-between gap-8 text-slate-600 text-xs">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-400">CompliHub360</span>
                    <span>/ Orchestrator Marketplace Model v1.0</span>
                </div>
                <div className="flex gap-8 uppercase tracking-widest font-bold">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Legal Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Partner Program</a>
                </div>
            </footer>
        </div>
    );
}
