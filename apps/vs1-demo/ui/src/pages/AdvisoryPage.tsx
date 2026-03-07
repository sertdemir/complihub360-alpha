import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";

export function AdvisoryPage() {
    const navigate = useNavigate();

    return (
        <AppShell>
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-16 text-center">
                    <h1 className="text-4xl font-extrabold text-slate-100 mb-6">Curated Compliance Advisory</h1>
                    <p className="text-slate-400 text-xl max-w-4xl mx-auto leading-relaxed">
                        CompliHub360 is more than a tool—it's an orchestrator. We bridge the gap between regulatory uncertainty 
                        and verified specialists, ensuring high-quality, accountable engagements via our partner network.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                        <div className="size-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[28px]">verified</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mb-4">Partner Qualification</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Every provider in our network must pass a rigorous identity and service-scope validation. 
                            Partners are required to explicitly agree to our performance-based SLAs.
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                        <div className="size-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[28px]">lock_person</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mb-4">Privacy-First Requests</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            We use a "Structured Engagement" model. No direct emails or data leakage. Your context is 
                            sanitized via our local AI Redaction Pipeline before reaching any advisor.
                        </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                        <div className="size-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[28px]">bolt</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mb-4">SLA Watchdog</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Automated accountability: Partners must confirm receipt within 24 hours and provide a structured reply within 48 hours, or face automated downgrades.
                        </p>
                    </div>
                </div>

                <div className="bg-[#137fec]/5 border border-[#137fec]/20 rounded-2xl p-10 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold text-slate-100 mb-4">Need Personalized Compliance Guidance?</h2>
                    <p className="text-slate-400 mb-8 max-w-2xl">
                        Our network includes boutique consultants, DPOs, international law firms, and tax specialists ready to handle your specific cross-border challenges.
                    </p>
                    <button 
                        onClick={() => navigate("/wizard")}
                        className="px-8 py-4 bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#137fec]/20 flex items-center gap-2">
                        <span className="material-symbols-outlined">magic_button</span>
                        Start Selection Wizard
                    </button>
                </div>
            </div>
        </AppShell>
    );
}
