import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";

export function CountriesPage() {
    const navigate = useNavigate();

    const COUNTRIES = [
        {
            id: "de",
            name: "Germany",
            code: "DE",
            flag: "🇩🇪",
            features: [
                "Strict GDPR default policies",
                "Critical EPR Packaging Laws (VerpackG)",
                "Specific cross-border VAT thresholds"
            ],
            risk: "High / Strict",
            description: "Germany is a high-compliance market with complex producer responsibilities and strict data protection enforcement."
        },
        {
            id: "fr",
            name: "France",
            code: "FR",
            flag: "🇫🇷",
            features: [
                "EPR obligations for multiple product streams",
                "Intra-EU VAT registration requirements",
                "Localized consumer protection rules"
            ],
            risk: "Moderate to High",
            description: "A primary market for EU expansion, France requires localized EPR registrations and careful VAT management."
        },
        {
            id: "uk",
            name: "United Kingdom",
            code: "UK",
            flag: "🇬🇧",
            features: [
                "Post-Brexit customs & VAT rules",
                "Corporate governance requirements",
                "Distinct data transfer regulations"
            ],
            risk: "Moderate",
            description: "The UK offers unique opportunities post-Brexit but requires distinct corporate structuring and VAT strategy compared to the EU."
        },
        {
            id: "us",
            name: "United States",
            code: "US",
            flag: "🇺🇸",
            features: [
                "State-level Nexus & Sales Tax",
                "Transatlantic data transfer (EU-US Data Privacy Framework)",
                "Complex liability and advertising laws"
            ],
            risk: "Variable (State dependent)",
            description: "The US market involves navigating both federal and state-level laws, particularly for sales tax and data privacy."
        }
    ];

    return (
        <AppShell>
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-slate-100 mb-4">Supported Countries & Jurisdictions</h1>
                    <p className="text-slate-400 text-lg max-w-3xl">
                        CompliHub360 helps you navigate the regulatory fragmentation of global markets. 
                        Each jurisdiction comes with its own Country Policy Matrix for data, tax, and product compliance.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {COUNTRIES.map((country) => (
                        <div key={country.id} className="bg-slate-900 border border-slate-800 rounded-xl p-8 hover:border-[#137fec]/30 transition-all">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-4xl">{country.flag}</span>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100">{country.name}</h2>
                                    <span className="text-sm font-mono text-[#137fec]">{country.code} Matrix</span>
                                </div>
                                <div className="ml-auto px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-slate-400">
                                    Risk: {country.risk}
                                </div>
                            </div>
                            
                            <p className="text-slate-300 mb-8 leading-relaxed">
                                {country.description}
                            </p>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Key Regulatory Features</h3>
                                <ul className="space-y-3">
                                    {country.features.map((feature, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-400">
                                            <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <button 
                                onClick={() => navigate("/wizard")}
                                className="mt-8 w-full py-3 bg-[#137fec]/10 hover:bg-[#137fec]/20 text-[#137fec] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">map</span>
                                Analyze Market Requirements
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
