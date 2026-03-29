import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Typography } from "../../components/ui/Typography";
import { Button } from "../../components/ui/Button";
import { useAuthStore, type UserRole } from "../../store/useAuthStore";

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const lang = i18n.resolvedLanguage || 'en';
    const login = useAuthStore(s => s.login);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("user");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        login(role, email.split('@')[0]);
        const queryParams = new URLSearchParams(location.search);
        const redirectTarget = queryParams.get("redirect");

        setTimeout(() => {
             if (redirectTarget) {
                 navigate(redirectTarget);
             } else {
                 const target = role === 'partner' ? `/${lang}/partner-dashboard` : `/${lang}/dashboard`;
                 navigate(target);
             }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-600 text-2xl">verified_user</span>
                        <Typography variant="h3" className="tracking-tight">CompliHub360</Typography>
                    </button>
                    <Link to="/register" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
                        Konto erstellen <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full max-w-lg"
                >
                    {/* Brand mark */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                            className="mx-auto w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mb-5 shadow-lg shadow-primary-500/20"
                        >
                            <span className="material-symbols-outlined text-white text-3xl">shield</span>
                        </motion.div>
                        <Typography variant="h1" weight="bold" className="text-neutral-900 mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                            Willkommen zurück
                        </Typography>
                        <Typography variant="body" className="text-neutral-500">
                            Melden Sie sich an, um auf Ihr Compliance-Dashboard zuzugreifen.
                        </Typography>
                    </div>

                    {/* Card */}
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-8">
                            {/* Role Toggle */}
                            <div className="flex items-center bg-neutral-100 rounded-xl p-1 mb-6">
                                {(["user", "partner"] as UserRole[]).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all ${
                                            role === r
                                                ? "bg-white text-neutral-900 shadow-sm"
                                                : "text-neutral-500 hover:text-neutral-700"
                                        }`}
                                    >
                                        {r === "user" ? "🏢 Unternehmen" : "🤝 Partner"}
                                    </button>
                                ))}
                            </div>

                            {/* Google SSO */}
                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all shadow-sm"
                            >
                                <GoogleIcon />
                                Mit Google fortfahren
                            </button>

                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-px bg-neutral-200" />
                                <span className="text-xs text-neutral-400 font-medium">oder mit E-Mail</span>
                                <div className="flex-1 h-px bg-neutral-200" />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label htmlFor="login-email" className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                                    E-Mail
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@unternehmen.de"
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                />
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-1.5 mb-6">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="login-password" className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                                        Passwort
                                    </label>
                                    <button type="button" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
                                        Passwort vergessen?
                                    </button>
                                </div>
                                <input
                                    id="login-password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                />
                            </div>

                            {/* Submit */}
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                disabled={loading || !email || !password}
                                className="rounded-xl"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Wird angemeldet...
                                    </span>
                                ) : (
                                    "Anmelden"
                                )}
                            </Button>
                        </form>

                        {/* Footer */}
                        <div className="bg-neutral-50 border-t border-neutral-200 px-8 py-4 text-center">
                            <p className="text-sm text-neutral-500">
                                Noch kein Konto?{" "}
                                <Link to="/register" className="text-primary-500 hover:text-primary-600 hover:underline font-semibold transition-colors">
                                    Kostenlos registrieren
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Trust */}
                    <p className="text-center text-xs text-neutral-400 mt-6">
                        Mit der Anmeldung stimmen Sie unseren{" "}
                        <a href="#" className="underline hover:text-neutral-600">AGB</a> und der{" "}
                        <a href="#" className="underline hover:text-neutral-600">Datenschutzerklärung</a> zu.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
