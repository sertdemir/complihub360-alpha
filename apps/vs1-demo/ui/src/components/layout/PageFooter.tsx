import { useNavigate } from "react-router-dom";
import { useState } from "react";

const FOOTER_LINKS = {
    Platform: [
        { label: "Services", path: "/services" },
        { label: "Countries", path: "/countries" },
        { label: "Advisory", path: "/advisory" },
        { label: "Compliance Wizard", path: "/wizard" },
    ],
    Company: [
        { label: "About CompliHub360", path: "#" },
        { label: "How it works", path: "#" },
        { label: "Pricing", path: "#" },
        { label: "Blog", path: "#" },
    ],
    Legal: [
        { label: "Privacy Policy", path: "#" },
        { label: "Terms of Service", path: "#" },
        { label: "Cookie Policy", path: "#" },
        { label: "GDPR Compliance", path: "#" },
    ],
    Support: [
        { label: "Help Center", path: "#" },
        { label: "Contact Us", path: "#" },
        { label: "Status", path: "#" },
        { label: "Developer API", path: "#" },
    ],
};

export function PageFooter() {
    const navigate = useNavigate();
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
                            onClick={() => navigate("/")}
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#137fec]">verified_user</span>
                            <span className="text-slate-100 text-base font-bold tracking-tight">
                                CompliHub<span className="text-[#137fec]">360</span>
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                            Your intelligent compliance compass. Navigate global regulatory complexity with AI-driven precision and privacy-first architecture.
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
                    {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="text-slate-100 text-sm font-semibold mb-4 tracking-wide uppercase">
                                {category}
                            </h4>
                            <ul className="space-y-2.5">
                                {links.map(link => (
                                    <li key={link.label}>
                                        <a
                                            href={link.path}
                                            onClick={e => {
                                                if (link.path.startsWith("/")) {
                                                    e.preventDefault();
                                                    navigate(link.path);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-slate-100 text-sm transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Newsletter Banner */}
                <div className="rounded-2xl border border-slate-800 bg-[#0b1117] px-8 py-8 mb-14 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[18px] text-[#137fec]">mail</span>
                            <span className="text-[#137fec] text-xs font-semibold uppercase tracking-wider">Compliance Digest</span>
                        </div>
                        <h3 className="text-slate-100 text-lg font-bold mb-1">
                            Stay ahead of regulatory change.
                        </h3>
                        <p className="text-slate-400 text-sm">
                            Weekly digest of critical compliance updates across EU, UK, and global markets.
                        </p>
                    </div>
                    {subscribed ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-medium shrink-0">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            You're subscribed — thank you!
                        </div>
                    ) : (
                        <form onSubmit={handleSubscribe} className="flex gap-3 w-full md:w-auto shrink-0">
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="h-10 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#137fec] transition-colors w-56"
                            />
                            <button
                                type="submit"
                                className="h-10 px-5 bg-[#137fec] hover:bg-[#137fec]/80 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                            >
                                Subscribe
                            </button>
                        </form>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} CompliHub360. All rights reserved.
                    </p>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <span className="material-symbols-outlined text-[14px] text-[#137fec]">verified_user</span>
                        Privacy-first architecture · No PII stored without consent
                    </div>
                </div>
            </div>
        </footer>
    );
}
