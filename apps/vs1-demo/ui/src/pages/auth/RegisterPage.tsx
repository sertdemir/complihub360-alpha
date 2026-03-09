import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            setTimeout(() => navigate("/dashboard"), 1500);
        }, 1200);
    };

    if (success) {
        return (
            <div className="bg-[#0b1117] min-h-screen flex flex-col items-center justify-center px-4 font-['Inter',sans-serif] text-slate-100">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                    </div>
                    <h1 className="text-2xl font-bold">Account created!</h1>
                    <p className="text-slate-400 text-sm">Redirecting you to your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0b1117] min-h-screen flex flex-col items-center justify-center px-4 py-10 font-['Inter',sans-serif] text-slate-100">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10 cursor-pointer" onClick={() => navigate("/")}>
                    <span className="material-symbols-outlined text-[#137fec] text-3xl">verified_user</span>
                    <span className="text-xl font-bold text-slate-100 tracking-tight">CompliHub360</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-100">Create your account</h1>
                        <p className="text-slate-400 text-sm mt-1">Free to start. Save results, track requests, and manage compliance.</p>
                    </div>

                    {/* Google SSO */}
                    <button
                        type="button"
                        onClick={() => { setLoading(true); setTimeout(() => { setSuccess(true); setTimeout(() => navigate("/dashboard"), 1500); }, 800); }}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Sign up with Google
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-xs text-slate-600 font-medium">or register with email</span>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#137fec] transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#137fec] transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Password</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#137fec] transition-colors"
                            />
                        </div>

                        {/* GDPR Consent */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                consent ? "border-[#137fec] bg-[#137fec]" : "border-slate-600 group-hover:border-slate-500"
                            }`} onClick={() => setConsent(!consent)}>
                                {consent && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                            </div>
                            <span className="text-xs text-slate-400 leading-relaxed">
                                I agree to the{" "}
                                <a href="#" className="text-[#137fec] hover:underline">Terms of Service</a> and{" "}
                                <a href="#" className="text-[#137fec] hover:underline">Privacy Policy</a>.
                                Your data is processed in accordance with GDPR.
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !consent}
                            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mt-1 ${
                                loading || !consent
                                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                    : "bg-[#137fec] hover:bg-[#137fec]/90 text-white shadow-lg shadow-[#137fec]/20"
                            }`}
                        >
                            {loading ? "Creating account..." : "Create free account"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#137fec] hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
