import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { PageFooter } from "../components/layout/PageFooter";

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="bg-[#0b1117] font-['Inter'] text-slate-100 min-h-screen flex flex-col antialiased">
            <PageHeader />

            <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-10 py-16 md:py-24 max-w-5xl mx-auto w-full">
                <div className="text-center max-w-3xl mb-12">
                    <h1 className="text-slate-100 tracking-tight text-4xl md:text-6xl font-extrabold leading-tight mb-6">
                        Compliance Orchestrated for Global Scale.
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed">
                        Navigate tax, privacy, and legal risks across markets with precision.
                    </p>
                </div>
                <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg mb-16">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex flex-col md:w-1/4">
                            <label className="text-slate-400 text-sm font-medium mb-2 pl-1 block">Country Context</label>
                            <div className="relative">
                                <select className="form-select appearance-none w-full bg-[#0b1117] border border-slate-800 text-slate-100 rounded-lg h-12 px-4 pr-10 focus:ring-[#137fec] focus:border-[#137fec] transition-colors cursor-pointer">
                                    <option value="de">Germany (DE)</option>
                                    <option value="eu">European Union (EU)</option>
                                    <option value="uk">United Kingdom (UK)</option>
                                    <option value="us">United States (US)</option>
                                    <option value="global">Global Default</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col md:w-3/4">
                            <label className="text-slate-400 text-sm font-medium mb-2 pl-1 block">Search Compliance Knowledge</label>
                            <div className="flex gap-3 flex-col md:flex-row">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <input className="form-input block w-full pl-10 pr-4 h-12 bg-[#0b1117] border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-[#137fec] focus:border-[#137fec] transition-colors" placeholder="Search compliance records, policies, or requirements..." type="text" />
                                </div>
                                <button
                                    onClick={() => navigate("/wizard")}
                                    className="h-12 px-6 bg-[#137fec] hover:bg-[#137fec]/90 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
                                    <span className="material-symbols-outlined text-[20px]">magic_button</span>
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full max-w-5xl">
                    <h3 className="text-slate-100 text-xl font-semibold mb-6">Browse Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { icon: "account_balance", title: "Tax & VAT", desc: "Cross-border tax obligations, VAT registration and marketplace tax rules.", category: "tax-vat" },
                            { icon: "inventory_2", title: "Product & Packaging", desc: "EPR registration, packaging obligations, and product category rules.", category: "epr" },
                            { icon: "shield_locked", title: "Data & Privacy", desc: "GDPR, CCPA, tracking consent, and personal data processing.", category: "data-privacy" },
                            { icon: "campaign", title: "Marketing & SEO", desc: "Advertising standards, health claims, cookie laws, and influencer rules.", category: "marketing-seo" },
                            { icon: "business_center", title: "Corporate & Structure", desc: "Legal entity formation, foreign registration, and business structure.", category: "corporate" },
                            { icon: "verified_user", title: "Full Support", desc: "End-to-end compliance management across all categories.", category: "full-support" },
                        ].map(cat => (
                            <button
                                key={cat.category}
                                onClick={() => navigate(`/wizard?category=${cat.category}`)}
                                className="group text-left p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-[#137fec]/50 hover:bg-slate-800/50 transition-all duration-200"
                            >
                                <div className="h-12 w-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">{cat.icon}</span>
                                </div>
                                <h4 className="text-slate-100 font-semibold text-lg mb-2">{cat.title}</h4>
                                <p className="text-slate-400 text-sm">{cat.desc}</p>
                                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#137fec]">
                                    Start wizard
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter />
        </div>
    );
}

