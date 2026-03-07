import { useNavigate } from "react-router-dom";

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#0b1117] font-['Inter'] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-800 px-10 py-4 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-4 text-slate-100">
                            <div className="size-6 text-[#137fec] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[24px]">verified_user</span>
                            </div>
                            <h2 className="text-slate-100 text-xl font-bold leading-tight tracking-[-0.015em]">CompliHub360</h2>
                        </div>
                        <div className="flex flex-1 justify-end gap-8">
                            <nav className="hidden md:flex items-center gap-9">
                                <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal" href="#">Services</a>
                                <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal" href="#">Countries</a>
                                <a className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium leading-normal" href="#">Advisory</a>
                            </nav>
                            <div className="flex gap-3 items-center">
                                <button className="text-slate-400 hover:text-slate-100 text-sm font-medium leading-normal transition-colors px-4 py-2">
                                    Login
                                </button>
                                <button
                                    onClick={() => navigate("/dashboard")}
                                    className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-[#137fec] hover:bg-[#137fec]/90 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]">
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    </header>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <a className="group block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-[#137fec]/50 hover:bg-slate-800/50 transition-all duration-200" href="#">
                                    <div className="h-12 w-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">account_balance</span>
                                    </div>
                                    <h4 className="text-slate-100 font-semibold text-lg mb-2">Tax & VAT</h4>
                                    <p className="text-slate-400 text-sm">Cross-border tax regulations, VAT compliance, and reporting.</p>
                                </a>
                                <a className="group block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-[#137fec]/50 hover:bg-slate-800/50 transition-all duration-200" href="#">
                                    <div className="h-12 w-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">shield_locked</span>
                                    </div>
                                    <h4 className="text-slate-100 font-semibold text-lg mb-2">Data Privacy</h4>
                                    <p className="text-slate-400 text-sm">GDPR, CCPA, data handling policies, and user consent.</p>
                                </a>
                                <a className="group block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-[#137fec]/50 hover:bg-slate-800/50 transition-all duration-200" href="#">
                                    <div className="h-12 w-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">campaign</span>
                                    </div>
                                    <h4 className="text-slate-100 font-semibold text-lg mb-2">Marketing & SEO</h4>
                                    <p className="text-slate-400 text-sm">Advertising standards, cookie laws, and digital marketing rules.</p>
                                </a>
                                <a className="group block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-[#137fec]/50 hover:bg-slate-800/50 transition-all duration-200" href="#">
                                    <div className="h-12 w-12 rounded-lg bg-[#137fec]/10 text-[#137fec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">gavel</span>
                                    </div>
                                    <h4 className="text-slate-100 font-semibold text-lg mb-2">Corporate Law</h4>
                                    <p className="text-slate-400 text-sm">Entity formation, labor laws, and general corporate governance.</p>
                                </a>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
