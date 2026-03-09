import { useNavigate, useLocation } from "react-router-dom";

const NAV_LINKS = [
    { label: "Services", path: "/services" },
    { label: "Countries", path: "/countries" },
    { label: "Advisory", path: "/advisory" },
];

export function PageHeader() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0b1117]/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">

                {/* Logo – Left */}
                <div
                    className="flex items-center gap-2.5 cursor-pointer shrink-0"
                    onClick={() => navigate("/")}
                >
                    <span className="material-symbols-outlined text-[22px] text-[#137fec]">verified_user</span>
                    <span className="text-slate-100 text-lg font-bold tracking-tight leading-none">
                        CompliHub<span className="text-[#137fec]">360</span>
                    </span>
                </div>

                {/* Nav Links – Center */}
                <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {NAV_LINKS.map(link => {
                        const isActive = location.pathname === link.path;
                        return (
                            <button
                                key={link.path}
                                onClick={() => navigate(link.path)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "text-[#137fec] bg-[#137fec]/10"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                                }`}
                            >
                                {link.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Auth – Right */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        className="text-slate-400 hover:text-slate-100 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                        onClick={() => navigate("/dashboard")}
                    >
                        Log in
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 h-9 px-5 bg-[#137fec] hover:bg-[#137fec]/80 transition-colors text-white text-sm font-semibold rounded-lg"
                    >
                        Sign up free
                    </button>
                </div>
            </div>
        </header>
    );
}
