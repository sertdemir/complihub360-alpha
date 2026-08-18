import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Copy lives in the shared 'layout' namespace (PageHeader + PageFooter). The
// table carries only what is not language-dependent: the column key, the link
// key and the route segment. `segment: null` marks a link with no page behind
// it yet — those stay inert "#" anchors, as before.
type FooterLink = { key: string; segment: string | null };

const FOOTER_COLUMNS: { key: string; links: FooterLink[] }[] = [
    {
        key: "platform",
        links: [
            { key: "services", segment: "services" },
            { key: "countries", segment: "countries" },
            { key: "advisory", segment: "advisory" },
            { key: "wizard", segment: "wizard" },
        ],
    },
    {
        key: "company",
        links: [
            { key: "about", segment: null },
            { key: "howItWorks", segment: null },
            { key: "pricing", segment: null },
            { key: "blog", segment: null },
        ],
    },
    {
        key: "legal",
        links: [
            { key: "privacy", segment: "privacy" },
            { key: "terms", segment: "terms" },
            { key: "cookies", segment: "cookies" },
            { key: "imprint", segment: "imprint" },
        ],
    },
    {
        key: "support",
        links: [
            { key: "help", segment: null },
            { key: "contact", segment: null },
            { key: "status", segment: null },
            { key: "api", segment: null },
        ],
    },
];

export function PageFooter() {
    const navigate = useNavigate();
    const { t } = useTranslation("layout");
    // Routes live under /:locale — see the note in PageHeader.
    const { locale = "en" } = useParams();
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setEmail("");
        }
    };

    return (
        <footer className="border-t border-slate-800 bg-[#070d12] mt-auto">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">

                {/* Top Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-14">

                    {/* Brand Column */}
                    <div className="lg:col-span-2">
                        <div
                            className="flex items-center gap-2.5 cursor-pointer mb-4"
                            onClick={() => navigate(`/${locale}`)}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#137fec]">verified_user</span>
                            <span className="text-slate-100 text-base font-bold tracking-tight">
                                CompliHub<span className="text-[#137fec]">360</span>
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                            {t("footer.tagline")}
                        </p>
                        <div className="flex gap-3 mt-6">
                            {["language", "corporate_fare", "rss_feed"].map(icon => (
                                <a
                                    key={icon}
                                    href="#"
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link Columns */}
                    {FOOTER_COLUMNS.map(column => (
                        <div key={column.key}>
                            <h4 className="text-slate-100 text-sm font-semibold mb-4 tracking-wide uppercase">
                                {t(`footer.columns.${column.key}`)}
                            </h4>
                            <ul className="space-y-2.5">
                                {column.links.map(link => {
                                    const path = link.segment ? `/${locale}/${link.segment}` : "#";
                                    return (
                                        <li key={link.key}>
                                            <a
                                                href={path}
                                                onClick={e => {
                                                    if (link.segment) {
                                                        e.preventDefault();
                                                        navigate(path);
                                                    }
                                                }}
                                                className="text-slate-400 hover:text-slate-100 text-sm transition-colors"
                                            >
                                                {t(`footer.links.${link.key}`)}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Newsletter Banner */}
                <div className="rounded-2xl border border-slate-800 bg-[#0b1117] px-8 py-8 mb-14 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[18px] text-[#137fec]">mail</span>
                            <span className="text-[#137fec] text-xs font-semibold uppercase tracking-wider">{t("footer.newsletter.eyebrow")}</span>
                        </div>
                        <h3 className="text-slate-100 text-lg font-bold mb-1">
                            {t("footer.newsletter.title")}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {t("footer.newsletter.body")}
                        </p>
                    </div>
                    {subscribed ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-medium shrink-0">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            {t("footer.newsletter.success")}
                        </div>
                    ) : (
                        <form onSubmit={handleSubscribe} className="flex gap-3 w-full md:w-auto shrink-0">
                            <input
                                type="email"
                                placeholder={t("footer.newsletter.placeholder")}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="h-10 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#137fec] transition-colors w-56"
                            />
                            <button
                                type="submit"
                                className="h-10 px-5 bg-[#137fec] hover:bg-[#137fec]/80 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                            >
                                {t("footer.newsletter.cta")}
                            </button>
                        </form>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
                    <p className="text-slate-500 text-sm">
                        {t("footer.bottom.copyright", { year: new Date().getFullYear() })}
                    </p>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <span className="material-symbols-outlined text-[14px] text-[#137fec]">verified_user</span>
                        {t("footer.bottom.privacyNote")}
                    </div>
                </div>
            </div>
        </footer>
    );
}
