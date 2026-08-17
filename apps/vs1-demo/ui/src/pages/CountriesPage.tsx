import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/layout/PageHeader";
import { PageFooter } from "../components/layout/PageFooter";

// Copy lives in the 'countries' namespace. These tables carry only what is NOT
// language-dependent — id, flag, icon and the tier/complexity keys. The tier is
// a key rather than a label because it also drives the badge colour; comparing
// against translated text would break the styling in every non-English locale.
type Tier = "full" | "expanding" | "core";
type Complexity = "high" | "medium";

const REGIONS: { id: string; flag: string; tier: Tier; complexity: Complexity }[] = [
    { id: "eu", flag: "🇪🇺", tier: "full", complexity: "high" },
    { id: "uk", flag: "🇬🇧", tier: "full", complexity: "medium" },
    { id: "us", flag: "🇺🇸", tier: "expanding", complexity: "high" },
    { id: "au", flag: "🇦🇺", tier: "core", complexity: "medium" },
];

const FEATURES: { key: string; icon: string }[] = [
    { key: "countryGate", icon: "location_on" },
    { key: "jurisdictionMatching", icon: "gavel" },
    { key: "dataSecurity", icon: "security" },
];

const RISK_ITEMS = ["thresholds", "epr", "dataTransfer"];

export function CountriesPage() {
    const navigate = useNavigate();
    const { t } = useTranslation("countries");
    const { locale } = useParams();
    // Routes live under /:locale — navigating to a bare "/wizard" matches the
    // locale segment instead, so LocaleLayout rejects it and bounces home.
    const wizardPath = `/${locale ?? "en"}/wizard`;

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
                                {t("hero.badge")}
                            </div>
                            <h1 className="text-slate-100 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
                                {t("hero.titlePre")} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#137fec]">{t("hero.titleAccent")}</span>
                            </h1>
                            <p className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed mb-10">
                                {t("hero.lead")}
                            </p>
                            <button
                                onClick={() => navigate(wizardPath)}
                                className="h-14 px-8 bg-[#137fec] hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-blue-600/20 group hover:scale-105"
                            >
                                {t("hero.cta")}
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
                                <h2 className="text-slate-100 text-3xl font-bold mb-4">{t("regions.title")}</h2>
                                <p className="text-slate-400 max-w-xl">{t("regions.lead")}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> {t("regions.legend.live")}</span>
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t("regions.legend.rollout")}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {REGIONS.map((region) => (
                                <div 
                                    key={region.id}
                                    className="group p-8 bg-[#0b1117] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden flex flex-col"
                                >
                                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-4xl mb-6">{region.flag}</div>
                                    <h3 className="text-slate-100 text-xl font-bold mb-3">{t(`regions.items.${region.id}.name`)}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">{t(`regions.items.${region.id}.description`)}</p>

                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{t("regions.focusAreas")}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {(t(`regions.items.${region.id}.focus`, { returnObjects: true }) as string[]).map((item) => (
                                                <span key={item} className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-400">{item}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${region.tier === 'full' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {t(`regions.tiers.${region.tier}`)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{t(`regions.complexity.${region.complexity}`)}</span>
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
                            {FEATURES.map((feature) => (
                                <div key={feature.key} className="flex gap-6">
                                    <div className="size-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#137fec] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-100 text-xl font-bold mb-3">{t(`features.${feature.key}.title`)}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{t(`features.${feature.key}.description`)}</p>
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
                                <h2 className="text-slate-100 text-3xl md:text-4xl font-bold mb-8 leading-tight">{t("risk.titlePre")} <br />{t("risk.titlePost")}</h2>
                                <p className="text-slate-400 mb-10 leading-relaxed">{t("risk.lead")}</p>

                                <div className="space-y-6">
                                    {RISK_ITEMS.map((key) => (
                                        <div key={key} className="p-6 bg-white/5 border border-white/10 rounded-xl">
                                            <h4 className="text-slate-100 font-semibold mb-2">{t(`risk.items.${key}.title`)}</h4>
                                            <p className="text-slate-400 text-sm">{t(`risk.items.${key}.desc`)}</p>
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
                                        <div className="text-slate-100 text-2xl font-bold mb-4">{t("risk.panel.title")}</div>
                                        <p className="text-slate-500 text-sm mb-8">{t("risk.panel.desc")}</p>
                                        <button
                                            onClick={() => navigate(wizardPath)}
                                            className="px-8 py-3 bg-white text-[#060b14] rounded-lg font-bold hover:bg-slate-200 transition-colors"
                                        >
                                            {t("risk.panel.cta")}
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
