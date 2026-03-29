import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { PageFooter } from "../components/layout/PageFooter";

export function CountriesPage() {
    const navigate = useNavigate();
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const regions = [
        {
            id: "eu",
            name: "European Union (EU)",
            flag: "🇪🇺",
            description: "Full support for the highly regulated single market. Specialized expertise in GDPR standards and local EPR laws.",
            focus: ["GDPR Compliance", "EPR Packaging Laws", "EU-wide VAT", "Digital Services Act"],
            status: "Full Coverage",
            riskLevel: "High Complexity"
        },
        {
            id: "uk",
            name: "United Kingdom (UK)",
            flag: "🇬🇧",
            description: "Dedicated navigation through post-Brexit compliance landscapes and UK-specific data protection rules.",
            focus: ["UK GDPR", "HMRC VAT Compliance", "Product Safety (UKCA)", "Employment Law"],
            status: "Full Coverage",
            riskLevel: "Medium Complexity"
        },
        {
            id: "us",
            name: "USA & Canada",
            flag: "🇺🇸",
            description: "Scale your business into North America with streamlined support for federal and state-level requirements.",
            focus: ["Nexus & Sales Tax", "CCPA/CPRA Privacy", "FDA/Labeling", "Trade Compliance"],
            status: "Expanding",
            riskLevel: "High Complexity"
        },
        {
            id: "au",
            name: "Australia (APAC)",
            flag: "🇦🇺",
            description: "Gateway to the APAC region with core support for Australian consumer law and tax regulations.",
            focus: ["GST Compliance", "Privacy Act 1988", "Product Liability", "Import/Export"],
            status: "Core Support",
            riskLevel: "Medium Complexity"
        }
    ];

    const features = [
        {
            icon: "location_on",
            title: "Country Gate",
            description: "Our adaptive wizard acts as a filter, ensuring every subsequent requirement is perfectly adapted to your specific target jurisdiction."
        },
        {
            icon: "gavel",
            title: "Jurisdiction Matching",
            description: "We guarantee pairing with experts legally admitted and verified to advise on the specific laws of your selected target country."
        },
        {
            icon: "security",
            title: "Localized Data Security",
            description: "The Country Policy Matrix ensures data residency and retention rules are applied per regional laws, including strict GDPR anonymization."
        }
    ];

    return (
        <div className="min-h-screen bg-[#060b14] text-slate-100 font-['Inter',sans-serif] flex flex-col">
            <PageHeader />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-24 px-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
                        <img 
                            src="/assets/global_compliance_hero.png" 
                            alt="Global Compliance Background" 
                            className="object-cover w-full h-full mask-linear-gradient"
                        />
                    </div>
                    
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Global Compliance Network
                            </div>
                            <h1 className="text-slate-100 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
                                Your Expansion, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#137fec]">Locally Secured.</span>
                            </h1>
                            <p className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed mb-10">
                                Legal requirements are strictly bound to specific jurisdictions. We translate country-specific complexity into structured clarity, enabling safe international growth.
                            </p>
                            <button 
                                onClick={() => navigate("/wizard")}
                                className="h-14 px-8 bg-[#137fec] hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-blue-600/20 group hover:scale-105"
                            >
                                Start Country Risk Assessment
                                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Regions Grid */}
                <section className="py-24 px-10 bg-slate-900/30">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                            <div>
                                <h2 className="text-slate-100 text-3xl font-bold mb-4">Covered Markets & Regions</h2>
                                <p className="text-slate-400 max-w-xl">Every search and analysis is deeply rooted in the specific laws of the target country to avoid legal blind flights.</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Live</span>
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Rollout</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {regions.map((region) => (
                                <div 
                                    key={region.id}
                                    className="group p-8 bg-[#0b1117] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden flex flex-col"
                                >
                                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-4xl mb-6">{region.flag}</div>
                                    <h3 className="text-slate-100 text-xl font-bold mb-3">{region.name}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">{region.description}</p>
                                    
                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Focus Areas</div>
                                        <div className="flex flex-wrap gap-2">
                                            {region.focus.map((item) => (
                                                <span key={item} className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-400">{item}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${region.status === 'Full Coverage' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {region.status}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{region.riskLevel}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-24 px-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex gap-6">
                                    <div className="size-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#137fec] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-100 text-xl font-bold mb-3">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Risk Metrics Section */}
                <section className="py-24 px-10 bg-gradient-to-b from-[#0b1117] to-[#060b14]">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div>
                                <h2 className="text-slate-100 text-3xl md:text-4xl font-bold mb-8 leading-tight">Navigating Cross-Border <br />Risk Metrics</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed">Cross-border operations introduce unique legal requirements that generic solutions often miss. We structure these risks into actionable steps.</p>
                                
                                <div className="space-y-6">
                                    {[
                                        { title: "Delivery Thresholds", desc: "Automatic identification of mandatory local VAT registrations based on country-specific revenue thresholds." },
                                        { title: "Localized EPR Rules", desc: "Managing the diverse environmental and packaging law differences between nations (e.g., France vs Germany)." },
                                        { title: "Trans-Border Data Transfer", desc: "Legal mapping for EU-to-US data flows when utilizing global SaaS infrastructures." }
                                    ].map((risk, idx) => (
                                        <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-xl">
                                            <h4 className="text-slate-100 font-semibold mb-2">{risk.title}</h4>
                                            <p className="text-slate-400 text-sm">{risk.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-3xl bg-[#0b1117] flex items-center justify-center p-12 relative group">
                                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                                    <div className="relative z-10 text-center">
                                        <div className="size-24 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-8 text-blue-400 ring-8 ring-blue-500/5">
                                            <span className="material-symbols-outlined text-5xl">language</span>
                                        </div>
                                        <div className="text-slate-100 text-2xl font-bold mb-4">Start Expansion Risk Assessment</div>
                                        <p className="text-slate-500 text-sm mb-8">Generate your jurisdiction-specific risk profile in minutes.</p>
                                        <button 
                                            onClick={() => navigate("/wizard")}
                                            className="px-8 py-3 bg-white text-[#060b14] rounded-lg font-bold hover:bg-slate-200 transition-colors"
                                        >
                                            Generate Risk Report
                                        </button>
                                    </div>
                                    {/* Abstract floating elements */}
                                    <div className="absolute top-10 right-10 size-20 rounded-full border border-blue-500/20 animate-bounce transition-all duration-[3000ms]"></div>
                                    <div className="absolute bottom-20 left-10 size-32 rounded-full border border-blue-500/10 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PageFooter />
        </div>
    );
}
