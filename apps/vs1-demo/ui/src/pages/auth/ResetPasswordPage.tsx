import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, AlertTriangle, CheckCircle2, EyeOff } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// Landing target for the password-reset email link. Supabase establishes a
// short-lived recovery session from the link, so updateUser({ password }) sets
// the new password for the authenticated recovery user.
export function ResetPasswordPage() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.resolvedLanguage || "en";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirm) { setError("The two passwords do not match."); return; }
        if (!isSupabaseConfigured || !supabase) { setError("Authentication is not configured."); return; }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) { setError(error.message); return; }
        setDone(true);
        setTimeout(() => navigate(`/${lang}/login`, { replace: true }), 1600);
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#0b1620] text-white">
            <div className="px-6 pt-8 lg:px-16 lg:py-12">
                <Logo lockup="horizontal" tone="on-petrol" href="/" markClassName="h-9" />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
                <div className="w-full max-w-[400px]">
                    {done ? (
                        <div className="text-center">
                            <CheckCircle2 className="mx-auto text-emerald-400" size={32} />
                            <h2 className="mt-4 font-serif text-[1.75rem] font-bold">Password updated</h2>
                            <p className="mt-2 text-[15px] text-white/65">Redirecting you to sign in…</p>
                        </div>
                    ) : (
                        <form onSubmit={submit}>
                            <h2 className="font-serif text-[1.9rem] font-bold">Set a new password</h2>
                            <p className="mt-2 text-[15px] text-white/65">Choose a strong password for your account.</p>

                            {error && (
                                <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-200">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
                                </div>
                            )}

                            <label className="mt-7 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">New password</label>
                            <div className="relative mt-2">
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••"
                                    className="w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 pr-16 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-white/55 hover:text-white"
                                >
                                    {showPw ? <EyeOff size={16} /> : "Show"}
                                </button>
                            </div>

                            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Confirm password</label>
                            <input
                                type={showPw ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••••"
                                className="mt-2 w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/50"
                            />

                            <button
                                type="submit"
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6450] px-5 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                            >
                                Update password <ArrowRight size={16} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
