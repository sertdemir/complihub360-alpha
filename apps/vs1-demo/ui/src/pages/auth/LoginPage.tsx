import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Typography } from "../../components/ui/Typography";
import { Button } from "../../components/ui/Button";

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
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => navigate("/dashboard"), 1200);
    };

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col">
            {/* Auth Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 group"
                    >
                        <span className="material-symbols-outlined text-primary-600 text-2xl">
                            verified_user
                        </span>
                        <Typography variant="h3" className="tracking-tight">
                            CompliHub360
                        </Typography>
                    </button>
                    <Link
                        to="/register"
                        className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                    >
                        Create account
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                        {/* Card Header */}
                        <div className="px-8 pt-8 pb-2 text-center">
                            <Typography variant="h2" className="text-neutral-900">
                                Willkommen zurück
                            </Typography>
                            <Typography variant="body" className="text-neutral-500 mt-1">
                                Melden Sie sich an, um auf Ihr Compliance-Dashboard zuzugreifen.
                            </Typography>
                        </div>

                        <div className="px-8 py-6 flex flex-col gap-5">
                            {/* Google SSO */}
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard")}
                                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all"
                            >
                                <GoogleIcon />
                                Mit Google fortfahren
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-neutral-200" />
                                <span className="text-xs text-neutral-400 font-medium">oder mit E-Mail</span>
                                <div className="flex-1 h-px bg-neutral-200" />
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
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

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                                            Passwort
                                        </label>
                                        <a href="#" className="text-xs text-primary-500 hover:text-primary-600 hover:underline font-medium transition-colors">
                                            Passwort vergessen?
                                        </a>
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

                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    size="lg"
                                    disabled={loading}
                                    className="mt-1 rounded-xl"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Anmeldung läuft...
                                        </span>
                                    ) : (
                                        "Anmelden"
                                    )}
                                </Button>
                            </form>

                            {/* Footer Link */}
                            <p className="text-center text-sm text-neutral-500">
                                Noch kein Konto?{" "}
                                <Link to="/register" className="text-primary-500 hover:text-primary-600 hover:underline font-semibold transition-colors">
                                    Kostenlos registrieren
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Legal */}
                    <p className="text-center text-xs text-neutral-400 mt-6">
                        Mit der Anmeldung stimmen Sie unseren{" "}
                        <a href="#" className="hover:text-neutral-600 underline">AGB</a> und der{" "}
                        <a href="#" className="hover:text-neutral-600 underline">Datenschutzerklärung</a> zu.
                    </p>
                </motion.div>
            </main>
        </div>
    );
}
