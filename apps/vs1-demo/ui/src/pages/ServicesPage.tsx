import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/layout/PageHeader";
import { PageFooter } from "../components/layout/PageFooter";
import {
    ComplianceDomain,
} from "@complihub/compliance-engine";

// Copy lives in the 'services' namespace. These tables carry only what is NOT
// language-dependent: the engine domain, the icon, the risk score and the i18n
// key. The "Full Compliance Support" card was dropped here — #20/#22 retired
// that concept everywhere else and lib/domains.ts has not carried it since
// 2026-08-04; the titles below follow the canonical domain names.
const DOMAIN_DATA: { id: ComplianceDomain; key: string; icon: string; risk: number }[] = [
    { id: ComplianceDomain.TAX, key: "tax", icon: "payments", risk: 7 },
    { id: ComplianceDomain.PRODUCT, key: "product", icon: "inventory_2", risk: 8 },
    { id: ComplianceDomain.DATA, key: "data", icon: "admin_panel_settings", risk: 9 },
    { id: ComplianceDomain.MARKETING, key: "marketing", icon: "ads_click", risk: 6 },
    { id: ComplianceDomain.CORPORATE, key: "corporate", icon: "balance", risk: 5 },
];

const PILLARS: { key: string; icon: string }[] = [
    { key: "risk", icon: "psychology" },
    { key: "matching", icon: "handshake" },
    { key: "monitoring", icon: "dashboard_customize" },
];

const TRUST_SIGNALS: { key: string; icon: string }[] = [
    { key: "privacy", icon: "fingerprint" },
    { key: "sla", icon: "verified" },
    { key: "sources", icon: "menu_book" },
];

export function ServicesPage() {
    const navigate = useNavigate();
    const { t } = useTranslation("services");
    // Routes live under /:locale — a bare "/wizard" matches the locale segment
    // instead, so LocaleLayout rejects it and bounces to the start page.
    const { locale = "en" } = useParams();

    return (
        <div className="min-h-screen bg-[#060b14] text-slate-100 font-['Inter',sans-serif] flex flex-col">
            <PageHeader />

            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center justify-center overflow-hidden border-b border-white/5">
                {/* Generated Hero Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/compliance_orchestration_hero.png"
                        alt={t("hero.imageAlt")}
                        className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#060b14]/50 via-[#060b14]/80 to-[#060b14]" />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-8">
                        <span className="material-symbols-outlined text-cyan-400 text-[14px]">hub</span>
                        <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest">{t("hero.badge")}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8">
                        {t("hero.titlePre")} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                            {t("hero.titleAccent")}
                        </span>
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
                        {t("hero.lead")}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={() => navigate(`/${locale}/wizard`)} className="w-full sm:w-auto px-8 py-3.5 bg-[#137fec] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all">
                            {t("hero.ctaPrimary")}
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                        <a href="#pillars" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 text-white rounded-xl font-bold border border-white/10 hover:bg-white/10 transition-all">
                            {t("hero.ctaSecondary")}
                        </a>
                    </div>
                </div>
            </section>

            {/* Compliance Domains Grid */}
            <section className="max-w-7xl mx-auto px-10 py-24 w-full">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">{t("domains.title")}</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">{t("domains.lead")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DOMAIN_DATA.map((domain) => (
                        <div key={domain.id} className="group p-8 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-cyan-500/30 transition-all backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="size-12 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[28px]">{domain.icon}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("domains.risk", { score: domain.risk })}</span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{t(`domains.items.${domain.key}.title`)}</h3>
                            <p className="text-xs text-cyan-500/70 font-medium mb-4 uppercase tracking-wide">{t(`domains.items.${domain.key}.short`)}</p>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">{t(`domains.items.${domain.key}.desc`)}</p>

                            <div className="flex flex-wrap gap-1.5 pt-6 border-t border-white/5">
                                {(t(`domains.items.${domain.key}.features`, { returnObjects: true }) as string[]).map(f => (
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
                        <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 block">{t("pillars.overline")}</span>
                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            {t("pillars.titleLine1")} <br /> {t("pillars.titleLine2")}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                        {PILLARS.map((p, idx) => (
                            <div key={p.key} className="flex flex-col gap-6 relative">
                                {idx < 2 && (
                                    <div className="hidden lg:block absolute -right-8 top-12 w-16 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                                )}
                                <div className="size-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-400/20 flex items-center justify-center text-cyan-400 border border-cyan-400/30">
                                    <span className="material-symbols-outlined text-[32px]">{p.icon}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-snug">{t(`pillars.items.${p.key}.title`)}</h3>
                                <p className="text-slate-400 leading-relaxed">{t(`pillars.items.${p.key}.desc`)}</p>

                                <div className="mt-4 flex items-center gap-2 text-cyan-500 text-xs font-bold uppercase tracking-widest cursor-pointer hover:gap-4 transition-all">
                                    {t("pillars.learnMore")} <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Simple Visualization of Flow */}
                    <div className="mt-24 p-10 bg-[#060b14] border border-white/5 rounded-3xl relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                            <div className="text-center p-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">{t("flow.step1Label")}</span>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium">{t("flow.step1Value")}</div>
                            </div>
                            <div className="flex justify-center text-slate-700">
                                <span className="material-symbols-outlined text-[40px] animate-pulse">arrow_forward</span>
                            </div>
                            <div className="md:col-span-1 text-center bg-cyan-500/10 border border-cyan-500/30 p-8 rounded-2xl">
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 block">{t("flow.step2Label")}</span>
                                <div className="text-white font-bold text-lg">{t("flow.step2Value")}</div>
                            </div>
                            <div className="flex justify-center text-slate-700">
                                <span className="material-symbols-outlined text-[40px] animate-pulse">arrow_forward</span>
                            </div>
                            <div className="text-center p-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">{t("flow.step3Label")}</span>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium">{t("flow.step3Value")}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Signals Footer */}
            <section className="max-w-7xl mx-auto px-10 py-24 w-full border-b border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {TRUST_SIGNALS.map(s => (
                        <div key={s.key} className="flex gap-5">
                            <span className="material-symbols-outlined text-cyan-500 shrink-0">{s.icon}</span>
                            <div>
                                <h4 className="text-white font-bold mb-1">{t(`trust.items.${s.key}.title`)}</h4>
                                <p className="text-sm text-slate-500 leading-relaxed">{t(`trust.items.${s.key}.text`)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <PageFooter />
        </div>
    );
}
