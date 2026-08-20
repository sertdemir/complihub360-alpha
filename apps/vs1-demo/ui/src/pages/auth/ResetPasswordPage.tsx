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
    const { t, i18n } = useTranslation("auth");
    const lang = i18n.resolvedLanguage || "en";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 8) { setError(t("reset.errors.tooShort")); return; }
        if (password !== confirm) { setError(t("reset.errors.mismatch")); return; }
        if (!isSupabaseConfigured || !supabase) { setError(t("reset.errors.notConfigured")); return; }
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
                            <h2 className="mt-4 font-serif text-[1.75rem] font-bold">{t("reset.doneTitle")}</h2>
                            <p className="mt-2 text-[15px] text-white/65">{t("reset.doneBody")}</p>
                        </div>
                    ) : (
                        <form onSubmit={submit}>
                            <h2 className="font-serif text-[1.9rem] font-bold">{t("reset.title")}</h2>
                            <p className="mt-2 text-[15px] text-white/65">{t("reset.subtitle")}</p>

                            {error && (
                                <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-200">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
                                </div>
                            )}

                            <label className="mt-7 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{t("reset.newPasswordLabel")}</label>
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
                                    {showPw ? <EyeOff size={16} /> : t("reset.show")}
                                </button>
                            </div>

                            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{t("reset.confirmPasswordLabel")}</label>
                            <input
                                type={showPw ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••••"
                                className="mt-2 w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/50"
                            />

                            <button
                                type="submit"
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-fixed px-5 py-3.5 text-[15px] font-semibold text-fg-on-brand-fixed transition-transform duration-200 hover:-translate-y-0.5"
                            >
                                {t("reset.submit")} <ArrowRight size={16} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
