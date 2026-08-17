import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Copy lives in the shared 'layout' namespace (PageHeader + PageFooter). The
// table carries only the route segment; the label comes from nav.<key>.
const NAV_LINKS = [
    { key: "services", segment: "services" },
    { key: "countries", segment: "countries" },
    { key: "advisory", segment: "advisory" },
];

export function PageHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation("layout");
    // Routes live under /:locale — a bare "/services" matches the locale
    // segment instead, so LocaleLayout rejects it and bounces to the start
    // page. Every target below is therefore built with the locale prefix.
    const { locale = "en" } = useParams();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0b1117]/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">

                {/* Logo – Left */}
                <div
                    className="flex items-center gap-2.5 cursor-pointer shrink-0"
                    onClick={() => navigate(`/${locale}`)}
                >
                    <span className="material-symbols-outlined text-[22px] text-[#137fec]">verified_user</span>
                    <span className="text-slate-100 text-lg font-bold tracking-tight leading-none">
                        CompliHub<span className="text-[#137fec]">360</span>
                    </span>
                </div>

                {/* Nav Links – Center */}
                <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {NAV_LINKS.map(link => {
                        const path = `/${locale}/${link.segment}`;
                        const isActive = location.pathname === path;
                        return (
                            <button
                                key={link.key}
                                onClick={() => navigate(path)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "text-[#137fec] bg-[#137fec]/10"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                                }`}
                            >
                                {t(`nav.${link.key}`)}
                            </button>
                        );
                    })}
                </nav>

                {/* Auth – Right */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        className="text-slate-400 hover:text-slate-100 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                        onClick={() => navigate(`/${locale}/login`)}
                    >
                        {t("auth.login")}
                    </button>
                    <button
                        onClick={() => navigate(`/${locale}/register`)}
                        className="flex items-center gap-2 h-9 px-5 bg-[#137fec] hover:bg-[#137fec]/80 transition-colors text-white text-sm font-semibold rounded-lg"
                    >
                        {t("auth.signup")}
                    </button>
                </div>
            </div>
        </header>
    );
}
