import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

// ─── Zone 0: Navigation ───────────────────────────────────────────────────────

function LandingNav() {
    const navigate = useNavigate();
    return (
        <header className="sticky top-0 z-50 w-full border border-b-neutral-200 bg-white/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
                <button
                    className="flex items-center gap-2 cursor-pointer shrink-0"
                    onClick={() => navigate("/")}
                >
                    <span className="material-symbols-outlined text-[22px] text-primary-500">verified_user</span>
                    <span className="font-sans font-bold text-neutral-900 tracking-tight">
                        CompliHub<span className="text-primary-500">360</span>
                    </span>
                </button>

                <nav className="hidden tablet:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {[
                        { label: "Services", path: "/services" },
                        { label: "Countries", path: "/countries" },
                        { label: "Advisory", path: "/advisory" },
                    ].map(link => (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className="px-4 py-2 rounded-md text-ui-small font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        className="hidden tablet:inline-flex text-neutral-600 hover:text-neutral-900 text-ui-small font-medium px-4 py-2 rounded-md hover:bg-neutral-100 transition-colors"
                        onClick={() => navigate("/login")}
                    >
                        Log in
                    </button>
                    <Button variant="primary" size="sm" onClick={() => navigate("/register")}>
                        Get Started Free
                    </Button>
                </div>
            </div>
        </header>
    );
}

// ─── Zone 1: Hero & Intent-Gate ───────────────────────────────────────────────

function HeroZone() {
    const navigate = useNavigate();
    const [country, setCountry] = useState("uk");
    const [category, setCategory] = useState("tax-vat");

    return (
        <section className="relative bg-background overflow-hidden">
            {/* Subtle background accent */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 55% at 65% -5%, rgba(9,112,112,0.08) 0%, transparent 70%)",
                }}
            />
            <div className="relative max-w-7xl mx-auto px-6 py-10 desktop-s:py-12 grid desktop-s:grid-cols-2 gap-10 items-center">

                {/* Left — Headline & Trust */}
                <div>
                    <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-200 text-accent-700 text-caption font-semibold uppercase tracking-wider px-3 py-1 rounded-md mb-6">
                        <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                        AI-Powered Advisory System
                    </div>

                    <h1 className="font-serif text-display font-bold text-neutral-900 leading-tight mb-5">
                        Your Compliance<br />
                        <span className="text-primary-500">Compass</span> for<br />
                        Post-Brexit UK
                    </h1>

                    <p className="text-body text-neutral-600 max-w-md mb-7">
                        Navigate Tax &amp; VAT obligations and EPR requirements with precision.
                        CompliHub360 translates regulatory fragmentation into a structured
                        Action Plan — in max. 5 steps.
                    </p>

                    <div className="flex flex-wrap gap-5 text-ui-small text-neutral-500">
                        {[
                            { icon: "verified", text: "Privacy-first architecture" },
                            { icon: "lock", text: "No PII stored without consent" },
                            { icon: "gavel", text: "Grounded regulatory sources" },
                        ].map(item => (
                            <span key={item.icon} className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-success-500">{item.icon}</span>
                                {item.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right — Intent-Gate Card */}
                <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-7">
                    <h2 className="font-sans text-h3 font-bold text-neutral-900 mb-1">
                        Start your qualification
                    </h2>
                    <p className="text-ui-small text-neutral-500 mb-6">
                        Select your market and category to receive a personalised compliance dossier.
                    </p>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-ui-small font-semibold text-neutral-700 mb-1.5">
                                Target Market
                            </label>
                            <div className="relative">
                                <select
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                    className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-10 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                                >
                                    <option value="uk">🇬🇧 United Kingdom (Post-Brexit)</option>
                                    <option value="eu">🇪🇺 European Union</option>
                                    <option value="de">🇩🇪 Germany</option>
                                    <option value="us">🇺🇸 United States</option>
                                    <option value="global">🌐 Global / Multi-Market</option>
                                </select>
                                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                                    expand_more
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-ui-small font-semibold text-neutral-700 mb-1.5">
                                Compliance Category
                            </label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-10 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                                >
                                    <option value="tax-vat">Tax &amp; VAT — Cross-border obligations</option>
                                    <option value="epr">EPR / Packaging — Producer Responsibility</option>
                                    <option value="data-privacy">Data &amp; Privacy — UK GDPR</option>
                                    <option value="marketing-seo">Marketing &amp; Advertising Standards</option>
                                    <option value="corporate">Corporate &amp; Legal Structure</option>
                                </select>
                                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px]">
                                    expand_more
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/wizard?category=${category}&country=${country}`)}
                        className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-body rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">route</span>
                        Qualify in max. 5 Steps
                    </button>

                    <p className="text-caption text-neutral-400 text-center mt-3">
                        No account required · Results in under 3 minutes
                    </p>
                </div>
            </div>
        </section>
    );
}

// ─── Zone 2: Social Proof Strip ───────────────────────────────────────────────

function SocialProofStrip() {
    const partners = ["Deloitte", "KPMG", "Baker McKenzie", "DLA Piper", "Grant Thornton", "BDO"];
    return (
        <section className="bg-primary-50 border-y border-primary-100 py-6">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-caption text-neutral-500 uppercase tracking-wider font-semibold text-center mb-5">
                    Trusted by compliance teams at
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 desktop-s:gap-7">
                    {partners.map(name => (
                        <div
                            key={name}
                            className="h-8 px-5 bg-white border border-neutral-200 rounded-md flex items-center justify-center shadow-xs"
                        >
                            <span className="text-ui-small font-semibold text-neutral-400 tracking-tight">{name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Zone 3: Advisory Preview (The Value Engine) ──────────────────────────────

function AdvisoryPreviewZone() {
    return (
        <section className="bg-white py-10 desktop-s:py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-10">
                    <p className="text-caption text-primary-500 uppercase tracking-wider font-semibold mb-3">
                        How It Works
                    </p>
                    <h2 className="font-serif text-h1 font-bold text-neutral-900 mb-4">
                        From raw context to a structured<br />compliance dossier
                    </h2>
                    <p className="text-body text-neutral-600 max-w-xl mx-auto">
                        Our privacy-first pipeline anonymizes your data locally before processing,
                        ensuring zero PII exposure while delivering expert-grade regulatory guidance.
                    </p>
                </div>

                <div className="grid desktop-s:grid-cols-3 gap-5">
                    {/* Step 01 — Input */}
                    <div className="relative border border-primary-200 bg-primary-50 rounded-xl p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            </div>
                            <div>
                                <p className="text-caption text-neutral-400 uppercase tracking-wider font-semibold">Step 01</p>
                                <h3 className="font-sans text-h3 font-bold text-neutral-900">Unstructured Input</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-xs font-mono text-ui-small text-neutral-600 leading-relaxed">
                            <span className="text-neutral-400 select-none">&gt;&nbsp;</span>
                            "We plan to expand our D2C e-commerce brand to the UK and sell physical goods. Revenue approx. £180k/year. Need to understand VAT and packaging obligations."
                        </div>
                        <div className="hidden desktop-s:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-neutral-300">chevron_right</span>
                        </div>
                    </div>

                    {/* Step 02 — Privacy Pipeline */}
                    <div className="relative border border-[#C3DDDC] bg-[#C3DDDC]/20 rounded-xl p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-[#C3DDDC] text-primary-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">security</span>
                            </div>
                            <div>
                                <p className="text-caption text-neutral-400 uppercase tracking-wider font-semibold">Step 02</p>
                                <h3 className="font-sans text-h3 font-bold text-neutral-900">Privacy Pipeline</h3>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {[
                                { raw: "contact@mybrand.com", masked: "****@***.**", type: "Email" },
                                { raw: "Jane Hoffmann", masked: "J. H*******", type: "Name" },
                                { raw: "DE123456789", masked: "DE*********", type: "Tax ID" },
                            ].map(item => (
                                <div key={item.type} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-3 py-2 shadow-xs">
                                    <span className="material-symbols-outlined text-[15px] text-warning-500 shrink-0">lock</span>
                                    <span className="text-ui-small text-neutral-400 line-through truncate">{item.raw}</span>
                                    <span className="material-symbols-outlined text-[14px] text-neutral-300 shrink-0">arrow_forward</span>
                                    <span className="text-ui-small font-mono font-semibold text-primary-600 truncate">{item.masked}</span>
                                    <span className="ml-auto text-caption text-neutral-400 shrink-0">{item.type}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 text-caption text-neutral-500 mt-2">
                                <span className="material-symbols-outlined text-[14px] text-success-500">check_circle</span>
                                PII processed locally — never leaves your device
                            </div>
                        </div>
                        <div className="hidden desktop-s:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-neutral-300">chevron_right</span>
                        </div>
                    </div>

                    {/* Step 03 — Output */}
                    <div className="border border-success-500/30 bg-success-bg/40 rounded-xl p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-success-bg text-success-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">description</span>
                            </div>
                            <div>
                                <p className="text-caption text-neutral-400 uppercase tracking-wider font-semibold">Step 03</p>
                                <h3 className="font-sans text-h3 font-bold text-neutral-900">Structured Dossier</h3>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {[
                                { icon: "account_balance", label: "UK VAT registration threshold analysis", badge: "Action Required", cls: "bg-error-bg text-error-500" },
                                { icon: "inventory_2", label: "EPR Packaging Producer Obligations", badge: "Applicable", cls: "bg-warning-bg text-warning-500" },
                                { icon: "receipt_long", label: "HMRC MTD Compliance Roadmap", badge: "Info", cls: "bg-primary-50 text-primary-600" },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-md px-3 py-2.5 shadow-xs">
                                    <span className="material-symbols-outlined text-[18px] text-primary-500 shrink-0">{item.icon}</span>
                                    <span className="text-ui-small text-neutral-700 flex-1 leading-snug">{item.label}</span>
                                    <span className={`text-caption font-semibold px-2 py-0.5 rounded-md shrink-0 ${item.cls}`}>{item.badge}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Zone 4: Testimonials ─────────────────────────────────────────────────────

function TestimonialsZone() {
    const testimonials = [
        {
            persona: "U1 — E-Commerce Founder",
            name: "Sarah K.",
            role: "Founder & CEO, D2C Brand (UK Expansion)",
            avatar: "storefront",
            quote:
                "I saved 3 weeks of legal research in under 30 minutes. CompliHub360 immediately flagged our EPR packaging obligation that our accountant had completely missed. The structured dossier was ready to hand over to our solicitor the same day.",
            result: "Time Savings",
            resultIcon: "timer",
            resultCls: "text-accent-700 bg-accent-50 border-accent-200",
            tag: "E-Commerce · UK · EPR + VAT",
        },
        {
            persona: "U2 — SaaS Operations Manager",
            name: "Marcus L.",
            role: "Head of Operations, B2B SaaS Scale-up",
            avatar: "laptop_mac",
            quote:
                "As a non-lawyer, navigating post-Brexit UK GDPR differences was genuinely stressful. CompliHub360 gave me a grounded, cited analysis I could defend in front of our board. I finally feel confident in our compliance stance.",
            result: "Legal Certainty",
            resultIcon: "verified_user",
            resultCls: "text-primary-600 bg-primary-50 border-primary-200",
            tag: "SaaS · Data & Privacy · UK GDPR",
        },
    ];

    return (
        <section className="bg-neutral-50 py-10 desktop-s:py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-10">
                    <p className="text-caption text-primary-500 uppercase tracking-wider font-semibold mb-3">Real Results</p>
                    <h2 className="font-serif text-h1 font-bold text-neutral-900 mb-4">
                        Trusted by founders and<br />operations teams
                    </h2>
                    <p className="text-body text-neutral-600">
                        See how CompliHub360 converts regulatory uncertainty into structured confidence.
                    </p>
                </div>

                <div className="grid tablet:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {testimonials.map(t => (
                        <div key={t.name} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-7 flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-caption text-neutral-400 font-semibold uppercase tracking-wider">
                                    {t.persona}
                                </span>
                                <span className={`inline-flex items-center gap-1.5 text-caption font-bold px-3 py-1 rounded-md border ${t.resultCls}`}>
                                    <span className="material-symbols-outlined text-[14px]">{t.resultIcon}</span>
                                    {t.result}
                                </span>
                            </div>

                            {/* Quote */}
                            <blockquote className="text-body text-neutral-700 leading-relaxed flex-1 mb-6 relative pl-5">
                                <span className="absolute left-0 -top-1 text-[36px] text-neutral-200 font-serif leading-none select-none">"</span>
                                {t.quote}
                            </blockquote>

                            {/* Author */}
                            <div className="flex items-center gap-3 pt-5 border-t border-neutral-100">
                                <div className="w-10 h-10 rounded-[9999px] bg-primary-50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[20px] text-primary-500">{t.avatar}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-ui-small font-bold text-neutral-900">{t.name}</p>
                                    <p className="text-caption text-neutral-500 truncate">{t.role}</p>
                                </div>
                                <span className="hidden desktop-s:inline text-caption text-neutral-400 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded-md shrink-0 whitespace-nowrap">
                                    {t.tag}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Zone 5: Dossier-Export & Conversion Hook ─────────────────────────────────

function DossierExportZone() {
    const navigate = useNavigate();
    const sources = [
        { ref: "HMRC VAT Notice 700/1", label: "Should I be registered for VAT?", type: "Guidance" },
        { ref: "Environment Act 2021", label: "UK Extended Producer Responsibility", type: "Legislation" },
        { ref: "HMRC MTD for VAT", label: "Making Tax Digital — Phase 2", type: "Directive" },
        { ref: "OPSS Guidance 2024", label: "Product Safety & Standards Post-Brexit", type: "Guidance" },
    ];

    return (
        <section className="bg-primary-900 py-10 desktop-s:py-12">
            <div className="max-w-7xl mx-auto px-6 grid desktop-s:grid-cols-2 gap-10 items-start">

                {/* Left — Risk Snapshot */}
                <div>
                    <p className="text-caption text-primary-200 uppercase tracking-wider font-semibold mb-3">
                        Sample Output — Page 1 of 3
                    </p>
                    <h2 className="font-serif text-h1 font-bold text-white mb-2">
                        UK Compliance<br />Risk Snapshot
                    </h2>
                    <p className="text-body text-primary-200 mb-7">
                        A preview of the structured dossier generated for a typical D2C expansion
                        to the United Kingdom.
                    </p>

                    {/* Risk Level */}
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 mb-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-ui-small font-semibold text-primary-200 uppercase tracking-wider">
                                Overall Risk Level
                            </span>
                            <span className="flex items-center gap-2 text-h3 font-bold text-error-500">
                                <span className="material-symbols-outlined text-[22px]">warning</span>
                                High
                            </span>
                        </div>
                        <div className="w-full h-2 bg-primary-700 rounded-[9999px] overflow-hidden">
                            <div className="h-full w-3/4 bg-error-500 rounded-[9999px]" />
                        </div>
                        <div className="flex justify-between mt-2 text-caption text-primary-400">
                            <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
                        </div>
                    </div>

                    {/* Findings */}
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                        <p className="text-ui-small font-semibold text-white mb-3">Key Findings</p>
                        <div className="space-y-2">
                            {[
                                { status: "error", icon: "cancel", label: "VAT Registration threshold exceeded", detail: "Mandatory registration required" },
                                { status: "warning", icon: "warning", label: "EPR Packaging Producer Obligation", detail: "Registration with PRN scheme required" },
                                { status: "warning", icon: "warning", label: "MTD for VAT — Digital Records", detail: "Phase 2 compliance gap identified" },
                                { status: "success", icon: "check_circle", label: "UK GDPR — Privacy Policy", detail: "Current policy covers requirements" },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-3 py-2 border-b border-primary-700 last:border-0">
                                    <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${item.status === "error" ? "text-error-500" : item.status === "warning" ? "text-warning-500" : "text-success-500"}`}>
                                        {item.icon}
                                    </span>
                                    <div>
                                        <p className="text-ui-small font-semibold text-white">{item.label}</p>
                                        <p className="text-caption text-primary-300">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right — Sources + Export CTA */}
                <div className="flex flex-col gap-5">
                    {/* Grounded Sources */}
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-[18px] text-primary-300">menu_book</span>
                            <p className="text-ui-small font-semibold text-white">Grounded Sources</p>
                        </div>
                        <div className="space-y-2">
                            {sources.map(s => (
                                <div key={s.ref} className="flex items-start gap-3 p-3 bg-primary-700/50 rounded-md">
                                    <span className="material-symbols-outlined text-[15px] text-primary-300 mt-0.5 shrink-0">link</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-ui-small font-semibold text-white truncate">{s.label}</p>
                                        <p className="text-caption text-primary-300">{s.ref}</p>
                                    </div>
                                    <span className="text-caption text-primary-400 bg-primary-700 px-2 py-0.5 rounded-md shrink-0">
                                        {s.type}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Export CTA Card */}
                    <div className="bg-white rounded-xl p-6 shadow-md">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[22px] text-accent-700">picture_as_pdf</span>
                            </div>
                            <div>
                                <p className="font-sans font-bold text-neutral-900">Export Full Dossier</p>
                                <p className="text-caption text-neutral-500">3 pages · PDF · Generated in real-time</p>
                            </div>
                        </div>

                        {/* Page Previews */}
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {[
                                { page: "Page 1", label: "Risk Snapshot", locked: false },
                                { page: "Page 2", label: "Action Plan", locked: true },
                                { page: "Page 3", label: "Expert Match", locked: true },
                            ].map(p => (
                                <div
                                    key={p.page}
                                    className={`rounded-md border p-3 text-center ${p.locked ? "bg-neutral-50 border-neutral-200" : "bg-primary-50 border-primary-200"}`}
                                >
                                    {p.locked ? (
                                        <span className="material-symbols-outlined text-[24px] text-neutral-300 block mb-1">lock</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[24px] text-primary-500 block mb-1">description</span>
                                    )}
                                    <p className="text-caption font-bold text-neutral-700">{p.page}</p>
                                    <p className="text-caption text-neutral-500">{p.label}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate("/register")}
                            className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-bold text-body rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm mb-3"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Export PDF — Free
                        </button>
                        <p className="text-caption text-neutral-400 text-center">
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">lock</span>
                            Action Plan &amp; Expert Match require a free account
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Landing Footer ────────────────────────────────────────────────────────────

function LandingFooter() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    return (
        <footer className="bg-primary-950 border-t border-primary-800">
            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid tablet:grid-cols-4 gap-8 mb-10">
                    <div className="tablet:col-span-2">
                        <button
                            className="flex items-center gap-2 mb-3"
                            onClick={() => navigate("/")}
                        >
                            <span className="material-symbols-outlined text-[20px] text-accent-500">verified_user</span>
                            <span className="font-sans font-bold text-white">CompliHub<span className="text-accent-500">360</span></span>
                        </button>
                        <p className="text-ui-small text-primary-300 max-w-xs leading-relaxed mb-5">
                            Your intelligent compliance compass. Navigate global regulatory complexity
                            with AI-driven precision and a privacy-first architecture.
                        </p>
                        {subscribed ? (
                            <div className="flex items-center gap-2 text-success-500 text-ui-small font-medium">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                Subscribed to the Compliance Digest
                            </div>
                        ) : (
                            <form
                                onSubmit={e => { e.preventDefault(); if (email) setSubscribed(true); }}
                                className="flex gap-2"
                            >
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="flex-1 h-10 px-4 rounded-md bg-primary-800 border border-primary-700 text-white placeholder-primary-400 text-ui-small focus:outline-none focus:border-accent-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="h-10 px-4 bg-accent-500 hover:bg-accent-600 text-neutral-900 font-semibold text-ui-small rounded-md transition-colors shrink-0"
                                >
                                    Subscribe
                                </button>
                            </form>
                        )}
                    </div>

                    {[
                        {
                            heading: "Platform",
                            links: [
                                { label: "Services", path: "/services" },
                                { label: "Countries", path: "/countries" },
                                { label: "Advisory", path: "/advisory" },
                                { label: "Compliance Wizard", path: "/wizard" },
                            ],
                        },
                        {
                            heading: "Legal",
                            links: [
                                { label: "Privacy Policy", path: "#" },
                                { label: "Terms of Service", path: "#" },
                                { label: "Cookie Policy", path: "#" },
                                { label: "GDPR Compliance", path: "#" },
                            ],
                        },
                    ].map(section => (
                        <div key={section.heading}>
                            <p className="text-caption font-bold text-white uppercase tracking-wider mb-4">
                                {section.heading}
                            </p>
                            <ul className="space-y-2">
                                {section.links.map(link => (
                                    <li key={link.label}>
                                        <a
                                            href={link.path}
                                            onClick={e => {
                                                if (link.path.startsWith("/")) {
                                                    e.preventDefault();
                                                    navigate(link.path);
                                                }
                                            }}
                                            className="text-ui-small text-primary-300 hover:text-white transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-primary-800 flex flex-col tablet:flex-row items-center justify-between gap-3">
                    <p className="text-caption text-primary-400">
                        © {new Date().getFullYear()} CompliHub360. All rights reserved.
                    </p>
                    <div className="flex items-center gap-1.5 text-caption text-primary-400">
                        <span className="material-symbols-outlined text-[14px] text-accent-500">verified_user</span>
                        Privacy-first · No PII stored without consent
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function LandingPage() {
    return (
        <div className="bg-background min-h-screen flex flex-col font-sans text-neutral-900 antialiased">
            <LandingNav />
            <HeroZone />
            <SocialProofStrip />
            <AdvisoryPreviewZone />
            <TestimonialsZone />
            <DossierExportZone />
            <LandingFooter />
        </div>
    );
}
