import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
                        to="/login"
                        className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                    >
                        Bereits registriert? Anmelden
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <AnimatePresence mode="wait">
                    {success ? (
                        /* Success State */
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                            className="flex flex-col items-center gap-5 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary-600 text-3xl">check_circle</span>
                            </div>
                            <div>
                                <Typography variant="h2" className="text-neutral-900">
                                    Konto erstellt!
                                </Typography>
                                <Typography variant="body" className="text-neutral-500 mt-2">
                                    Sie werden zu Ihrem Dashboard weitergeleitet...
                                </Typography>
                            </div>
                            {/* Loading bar */}
                            <div className="w-48 h-1 bg-neutral-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.4, ease: "linear" }}
                                    className="h-full bg-primary-500 rounded-full"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        /* Registration Form */
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                            className="w-full max-w-md"
                        >
                            <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                                {/* Card Header */}
                                <div className="px-8 pt-8 pb-2 text-center">
                                    <Typography variant="h2" className="text-neutral-900">
                                        Konto erstellen
                                    </Typography>
                                    <Typography variant="body" className="text-neutral-500 mt-1">
                                        Kostenlos starten. Ergebnisse speichern, Anfragen verfolgen und Compliance verwalten.
                                    </Typography>
                                </div>

                                <div className="px-8 py-6 flex flex-col gap-5">
                                    {/* Google SSO */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoading(true);
                                            setTimeout(() => {
                                                setSuccess(true);
                                                setTimeout(() => navigate("/dashboard"), 1500);
                                            }, 800);
                                        }}
                                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all"
                                    >
                                        <GoogleIcon />
                                        Mit Google registrieren
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
                                                Vollständiger Name
                                            </label>
                                            <input
                                                id="register-name"
                                                type="text"
                                                required
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Ihr Name"
                                                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                                                E-Mail
                                            </label>
                                            <input
                                                id="register-email"
                                                type="email"
                                                required
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="name@unternehmen.de"
                                                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                                                Passwort
                                            </label>
                                            <input
                                                id="register-password"
                                                type="password"
                                                required
                                                minLength={8}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Mind. 8 Zeichen"
                                                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                            />
                                        </div>

                                        {/* GDPR Consent */}
                                        <label className="flex items-start gap-3 cursor-pointer group select-none">
                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={consent}
                                                onClick={() => setConsent(!consent)}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                                    consent
                                                        ? "border-primary-500 bg-primary-500"
                                                        : "border-neutral-300 group-hover:border-neutral-400"
                                                }`}
                                            >
                                                {consent && (
                                                    <span className="material-symbols-outlined text-white text-[12px]">check</span>
                                                )}
                                            </button>
                                            <span className="text-xs text-neutral-500 leading-relaxed">
                                                Ich stimme den{" "}
                                                <a href="#" className="text-primary-500 hover:underline">AGB</a> und der{" "}
                                                <a href="#" className="text-primary-500 hover:underline">Datenschutzerklärung</a> zu.
                                                Ihre Daten werden DSGVO-konform verarbeitet.
                                            </span>
                                        </label>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            fullWidth
                                            size="lg"
                                            disabled={loading || !consent}
                                            className="mt-1 rounded-xl"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Konto wird erstellt...
                                                </span>
                                            ) : (
                                                "Kostenloses Konto erstellen"
                                            )}
                                        </Button>
                                    </form>

                                    {/* Footer */}
                                    <p className="text-center text-sm text-neutral-500">
                                        Bereits registriert?{" "}
                                        <Link to="/login" className="text-primary-500 hover:text-primary-600 hover:underline font-semibold transition-colors">
                                            Anmelden
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
