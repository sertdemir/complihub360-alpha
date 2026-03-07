import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdvisoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Services', path: '/services' },
        { name: 'Countries', path: '/countries' },
        { name: 'Advisory', path: '/advisory', active: true },
    ];

    const advisoryFeatures = [
        {
            title: "Adaptive Compliance-Wizard",
            icon: "magic_button",
            description: "Intent Structuring: Instead of static filters, our wizard captures your specific business context in 4-5 dynamic steps, translating uncertainty into a structured search profile.",
            tags: ["Intent-Based", "Dynamic Flow"]
        },
        {
            title: "Privacy-First Redaction Pipeline",
            icon: "security_update_good",
            description: "Data security is built into the architecture. All PII is automatically and locally anonymized before any AI analysis, ensuring no confidential data ever leaves your control.",
            tags: ["Local Anonymization", "PII-Safe"]
        },
        {
            title: "Grounded Intelligence",
            icon: "library_books",
            description: "Our AI is strictly grounded in official, validated legal sources. Every recommendation and summary includes direct links to the regulatory documentation it's based on.",
            tags: ["Hallucination-Free", "Source-Linked"]
        },
        {
            title: "Risk-Based Decision Engine",
            icon: "analytics",
            description: "Continuous risk calculation based on your profile inputs. Connects your context with our database to generate curated checklists and verified provider matches.",
            tags: ["Real-time Assessment", "Curated Matching"]
        }
    ];

    return (
        <div className="min-h-screen bg-[#050A15] text-slate-100 font-sans selection:bg-[#137fec]/30 selection:text-white">
            {/* Navigation Header */}
            <header 
                className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
                    scrolled ? 'bg-[#050A15]/80 backdrop-blur-xl border-slate-800/50 py-3 shadow-2xl' : 'bg-transparent border-transparent py-5'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <div className="h-9 w-9 bg-gradient-to-br from-[#137fec] to-[#0ea5e9] rounded-lg flex items-center justify-center shadow-lg shadow-[#137fec]/20 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-white text-xl">security</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#137fec] transition-colors">
                            CompliHub<span className="text-[#137fec]">360</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                className={`transition-all text-sm font-medium leading-normal cursor-pointer ${
                                    link.active 
                                    ? 'text-[#137fec] font-semibold underline underline-offset-8 decoration-2' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                onClick={() => navigate(link.path)}
                            >
                                {link.name}
                            </a>
                        ))}
                    </nav>

                    <button 
                        onClick={() => navigate('/')}
                        className="bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all hover:shadow-lg active:scale-95"
                    >
                        Search Platform
                    </button>
                </div>
            </header>

            <main className="pt-20">
                {/* Hero Section */}
                <section className="relative px-6 py-24 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img 
                            src="/assets/cognitive_advisory_hero.png" 
                            alt="Cognitive Advisory Layer" 
                            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#050A15] via-transparent to-[#050A15]"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050A15] via-transparent to-transparent"></div>
                    </div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#137fec]/10 border border-[#137fec]/20 text-[#137fec] text-xs font-semibold mb-6 animate-fade-in">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#137fec] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#137fec]"></span>
                                </span>
                                ADVANCED COGNITIVE LAYER
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                                Your intelligent compliance compass: The cognitive <span className="text-[#137fec]">Advisory Layer</span>
                            </h1>
                            <p className="text-xl text-slate-400 leading-relaxed mb-10">
                                Translating unstructured regulatory uncertainty into clear, actionable understanding. We bridge the gap between your business and the complex legal world.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-[#137fec]/20 active:scale-95">
                                    Free Compliance Check
                                </button>
                                <button className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-8 py-4 rounded-xl font-bold transition-all active:scale-95">
                                    Explore Methodology
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Cognitive Layer Features */}
                <section className="px-6 py-24 bg-slate-900/30">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16">
                            <h2 className="text-3xl font-bold mb-4">How our intelligent navigation works</h2>
                            <p className="text-slate-400 max-w-2xl">Going far beyond a traditional directory, our Advisory Layer operates as a cognitive OS for global compliance.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {advisoryFeatures.map((feature, idx) => (
                                <div 
                                    key={idx}
                                    className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-[#137fec]/30 transition-all group"
                                >
                                    <div className="h-14 w-14 bg-[#137fec]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#137fec]/20 transition-colors">
                                        <span className="material-symbols-outlined text-[#137fec] text-3xl">{feature.icon}</span>
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        {feature.tags.map(tag => (
                                            <span key={tag} className="text-[10px] uppercase font-bold tracking-widest text-slate-500 border border-slate-800 px-2 py-0.5 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Anonymization Pipeline Visualization */}
                <section className="px-6 py-24 border-y border-slate-800/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-4xl font-bold mb-6">Transparency and limits of our AI</h2>
                                <p className="text-slate-400 leading-relaxed mb-6 italic">
                                    "Our AI does not replace your lawyer. It makes your lawyer 10x more efficient by providing perfectly pre-structured digital dossiers."
                                </p>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex gap-3 text-slate-300">
                                        <span className="material-symbols-outlined text-green-500 text-sm mt-1">check_circle</span>
                                        <span>Focus on structured orientation & dossier orchestration.</span>
                                    </li>
                                    <li className="flex gap-3 text-slate-300">
                                        <span className="material-symbols-outlined text-green-500 text-sm mt-1">check_circle</span>
                                        <span>Grounded retrieval from official, validated sources.</span>
                                    </li>
                                    <li className="flex gap-3 text-slate-300">
                                        <span className="material-symbols-outlined text-red-400 text-sm mt-1">cancel</span>
                                        <span>No binding legal advice—that belongs to licensed law firms.</span>
                                    </li>
                                </ul>
                                <div className="p-6 bg-blue-900/10 border border-blue-900/20 rounded-xl">
                                    <h4 className="text-blue-400 font-bold mb-2">Country Policy Matrix</h4>
                                    <p className="text-slate-400 text-sm">Every data process follows a strict individual policy matrix matched to local data residency and privacy standards.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square bg-gradient-to-br from-[#137fec]/10 to-transparent rounded-full blur-3xl absolute -z-10 w-full h-full scale-110 opacity-50"></div>
                                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
                                    <div className="flex flex-col gap-6">
                                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-slate-400">description</span>
                                                <span className="text-sm font-medium">User Document</span>
                                            </div>
                                            <span className="text-xs text-slate-500">RAW DATA</span>
                                        </div>
                                        <div className="flex justify-center flex-col items-center">
                                            <span className="material-symbols-outlined text-[#137fec] animate-bounce">expand_more</span>
                                            <div className="bg-[#137fec] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-[#137fec]/30">REDACTION PIPELINE</div>
                                            <span className="material-symbols-outlined text-[#137fec] mt-1">expand_more</span>
                                        </div>
                                        <div className="p-4 bg-green-900/10 rounded-xl border border-green-900/20 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-green-500">visibility_off</span>
                                                <span className="text-sm font-medium">Anonymized Dossier</span>
                                            </div>
                                            <span className="text-xs text-green-500 font-bold">AI READY</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 text-center uppercase tracking-tighter">Your AI never sees plaintext PII. Local extraction only.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="px-6 py-24 text-center">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-4xl font-bold mb-6">Ready for clarity?</h2>
                        <p className="text-slate-400 text-lg mb-10">
                            Stop searching through static directories. Start navigating your compliance journey with our cognitive intelligent operating system.
                        </p>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-white text-black hover:bg-slate-200 px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-2xl shadow-white/10"
                        >
                            Start Search Now
                        </button>
                    </div>
                </section>
            </main>

            {/* Simple Footer */}
            <footer className="px-6 py-12 border-t border-slate-900 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 grayscale brightness-200 opacity-50">
                    <div className="h-6 w-6 bg-slate-100 rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-900 text-sm">security</span>
                    </div>
                    <span className="text-sm font-bold tracking-tight text-white">
                        CompliHub360
                    </span>
                </div>
                <p className="text-xs text-slate-600">© 2026 CompliHub360. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default AdvisoryPage;
