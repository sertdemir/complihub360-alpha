import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Mail, EyeOff, AlertTriangle } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// ─── Auth · Figma 1839:2 / 1842:2288 / 1853:2 / 1855:2 / 1856:2 / 1857:3 ─────
// One dark split-screen shell, several views driven by a small state machine:
//   form        → user magic-link  ·  partner email+password
//   magic-sent  → "check your inbox" (user)
//   forgot      → partner password reset request
//   reset-sent  → "reset link on the way" (partner)
//   error       → expired / invalid / rate-limited sign-in link (?error=…)
// Narrative-LEFT + action-RIGHT. Risk/partner actions in petrol; gold reserved
// for the user magic-link and the one highlighted word per headline.

const GoogleIcon = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

type Mode = "user" | "partner";
type View = "form" | "magic-sent" | "forgot" | "reset-sent" | "error";
type ErrKind = "expired" | "invalid" | "rate-limited";

const ERR_COPY: Record<ErrKind, { title: string; lead: string; why: string }> = {
    expired: {
        title: "Link expired",
        lead: "Sign-in links expire after 15 minutes for security. Request a new one — we'll send it to the same email.",
        why: "Email links expire after 15 minutes. If you waited longer or refreshed the link, it's no longer valid.",
    },
    invalid: {
        title: "Link not recognised",
        lead: "This sign-in link doesn't match any pending request. Request a fresh one to continue.",
        why: "The link was malformed or already used. Each link works exactly once, from the browser that requested it.",
    },
    "rate-limited": {
        title: "Too many attempts",
        lead: "We paused new links for a few minutes to keep your account safe. Try again shortly.",
        why: "Several links were requested in quick succession. This cooldown protects you from sign-in abuse.",
    },
};

function GoogleButton({ onClick }: { onClick: () => void }) {
    return (
        <>
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>
            <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.07]"
            >
                <GoogleIcon /> Continue with Google
            </button>
        </>
    );
}

function SystemFooter({ className = "" }: { className?: string }) {
    return (
        <div className={"flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/50 " + className}>
            <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> All systems operational
            </span>
            <span className="text-white/20">·</span>
            <span><span className="font-semibold text-white">EN</span> / DE</span>
            <span className="text-white/20">·</span>
            <a href="#" className="hover:text-white/80">Privacy</a>
            <a href="#" className="hover:text-white/80">Terms</a>
            <a href="#" className="hover:text-white/80">Imprint</a>
        </div>
    );
}

function BackToSignIn({ onClick }: { onClick: () => void }) {
    return (
        <p className="mt-6 text-center">
            <button type="button" onClick={onClick} className="text-[14px] font-semibold text-emerald-400 hover:text-emerald-300">
                ← Back to sign-in
            </button>
        </p>
    );
}

function ResendTimer({ label, total = 58, onResend }: { label: string; total?: number; onResend?: () => void }) {
    const [remaining, setRemaining] = useState(total);
    const ref = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        setRemaining(total);
        ref.current = setInterval(() => {
            setRemaining((r) => {
                if (r <= 1) {
                    clearInterval(ref.current);
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
        return () => clearInterval(ref.current);
    }, [total]);

    const restart = () => {
        clearInterval(ref.current);
        onResend?.();
        setRemaining(total);
        ref.current = setInterval(() => {
            setRemaining((r) => (r <= 1 ? (clearInterval(ref.current), 0) : r - 1));
        }, 1000);
    };

    const done = remaining <= 0;
    // Bar fills green as the cooldown elapses → 100% when resend is available.
    const pct = Math.round(((total - remaining) / total) * 100);
    const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

    return (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
                {done ? (
                    <>
                        <span className="text-emerald-400">Link ready to resend</span>
                        <button type="button" onClick={restart} className="text-emerald-400 hover:text-emerald-300">
                            Resend
                        </button>
                    </>
                ) : (
                    <>
                        <span>{label}</span>
                        <span className="tabular-nums">{mmss}</span>
                    </>
                )}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const lang = i18n.resolvedLanguage || "en";
    const login = useAuthStore((s) => s.login);

    const params = new URLSearchParams(location.search);
    const errParam = params.get("error") as ErrKind | null;

    const [mode, setMode] = useState<Mode>("user");
    const [view, setView] = useState<View>(errParam ? "error" : "form");
    const [errKind, setErrKind] = useState<ErrKind>(errParam && ERR_COPY[errParam] ? errParam : "expired");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);

    const finishLogin = (role: "user" | "partner") => {
        login(role, (email || "you").split("@")[0]);
        const redirect = params.get("redirect");
        navigate(redirect || `/${lang}/${role === "partner" ? "partner-dashboard" : "dashboard"}`);
    };

    // Dev entry for the admin workspace (no public admin login UI by design):
    // /:locale/login?as=admin — only active with the demo-auth fallback.
    useEffect(() => {
        if (params.get("as") === "admin" && !isSupabaseConfigured) {
            login("admin", "admin");
            navigate(`/${lang}/admin`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Real Supabase Auth handlers (with a dev fallback when env is unset) ────
    const [authError, setAuthError] = useState<string | null>(null);
    const callbackUrl = `${window.location.origin}/${lang}/auth/callback`;
    const resetUrl = `${window.location.origin}/${lang}/reset-password`;

    // User · passwordless magic-link
    const handleMagicLink = async () => {
        setAuthError(null);
        if (!/.+@.+\..+/.test(email)) { setAuthError("Please enter a valid email address."); return; }
        if (!isSupabaseConfigured || !supabase) { setView("magic-sent"); return; } // dev fallback
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } });
        if (error) { setAuthError(error.message); return; }
        setView("magic-sent");
    };

    // Partner · email + password
    const handlePasswordSignIn = async () => {
        setAuthError(null);
        if (!isSupabaseConfigured || !supabase) { finishLogin("partner"); return; } // dev fallback
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setAuthError(error.message); return; }
        navigate(params.get("redirect") || `/${lang}/partner-dashboard`);
    };

    // Partner · request password reset (same confirmation regardless, to avoid
    // leaking which emails have accounts).
    const handleForgot = async () => {
        setAuthError(null);
        if (!/.+@.+\..+/.test(email)) { setAuthError("Please enter a valid email address."); return; }
        if (isSupabaseConfigured && supabase) {
            await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
        }
        setView("reset-sent");
    };

    // OAuth · Google
    const handleOAuth = async (role: "user" | "partner") => {
        setAuthError(null);
        if (!isSupabaseConfigured || !supabase) { finishLogin(role); return; } // dev fallback
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl } });
        if (error) setAuthError(error.message);
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        setView("form");
    };

    // ── Left narrative, per view / mode ───────────────────────────────────────
    type Left = {
        eyebrow: string;
        eyebrowTone?: string;
        title: React.ReactNode;
        body?: string;
        note?: string;
        stat?: { label: string; value: string };
        meta?: { label: string; value: string }[];
    };

    const left: Left =
        view === "magic-sent"
            ? {
                  eyebrow: "Magic link sent",
                  title: (<>Almost there.<br /><span className="text-accent-400">Check</span> your inbox.</>),
                  body: "We sent a one-time sign-in link to your email. Open it on this device to enter your workspace. The link expires in 15 minutes.",
                  note: "Not in your inbox? Check Spam — or resend below.",
              }
            : view === "forgot"
              ? {
                    eyebrow: "Reset password",
                    title: (<>Locked out?<br />Let's get you <span className="text-accent-400">back</span> in.</>),
                    body: "Enter the email tied to your Partner workspace. We'll send a single-use reset link to that inbox.",
                    note: "Reset link expires in 30 minutes · Same-browser session required",
                }
              : view === "reset-sent"
                ? {
                      eyebrow: "Reset link sent",
                      title: (<>Reset link on the way.<br /><span className="text-accent-400">Check</span> your inbox.</>),
                      body: "Open the link from the same browser session — it expires in 30 minutes. After reset, you'll sign back in with your new password.",
                      note: "Didn't arrive? Check spam — most reset emails land in <2 min.",
                  }
                : view === "error"
                  ? {
                        eyebrow: "Sign-in interrupted",
                        eyebrowTone: "text-accent-400",
                        title: (<>That link won't work.<br />Let's get you back on <span className="text-accent-400">track</span>.</>),
                        body: "The link you opened is no longer valid. We'll route you to recover in one click — your assessment progress is saved.",
                        meta: [
                            { label: "Request", value: "req_8f24b1c · 2026-05-17 14:32 UTC" },
                            { label: "Support", value: "support@complihub360.com" },
                        ],
                    }
                  : mode === "user"
                    ? {
                          eyebrow: "Your workspace",
                          title: (<>Your risk map, saved. Your <span className="text-accent-400">specialists</span>, matched.</>),
                          stat: { label: "Last update · 17 May 2026", value: "8 new obligations across DE / UK markets" },
                      }
                    : {
                          eyebrow: "Partner workspace",
                          title: (<>Welcome back. Your partner <span className="text-accent-400">inbox</span> is waiting.</>),
                          stat: { label: "Founding cohort", value: "23 of 100 spots claimed" },
                      };

    return (
        <div className="flex min-h-screen flex-col bg-[#0b1620] text-white lg:flex-row">
            {/* ── LEFT · narrative ── */}
            <div className="relative flex flex-col gap-7 px-6 pb-2 pt-8 lg:w-[57%] lg:justify-between lg:gap-0 lg:px-16 lg:py-12">
                <Logo lockup="horizontal" tone="on-petrol" href="/" markClassName="h-9" />

                <div className="max-w-[640px] lg:py-0">
                    <span className={"text-[12px] font-semibold uppercase tracking-[0.16em] " + (left.eyebrowTone || "text-emerald-400")}>
                        {left.eyebrow}
                    </span>
                    <h1 className="mt-4 font-serif text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white lg:text-[3.25rem] lg:leading-[1.08]">
                        {left.title}
                    </h1>
                    {left.body ? <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/65">{left.body}</p> : null}
                    {left.stat ? (
                        <div className="mt-7">
                            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> {left.stat.label}
                            </p>
                            <p className="mt-1 text-[15px] text-white/80">{left.stat.value}</p>
                        </div>
                    ) : null}
                    {left.note ? (
                        <p className="mt-8 flex items-start gap-2 text-[14px] text-white/55">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" /> {left.note}
                        </p>
                    ) : null}
                    {left.meta ? (
                        <div className="mt-10 flex flex-wrap gap-x-16 gap-y-4">
                            {left.meta.map((m) => (
                                <div key={m.label}>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">{m.label}</p>
                                    <p className="mt-1 text-[14px] text-white/70">{m.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <SystemFooter className="hidden lg:flex" />
            </div>

            {/* ── RIGHT · action ── */}
            {/* Top-anchored (not vertically centred) so switching the Business/
                Provider tabs grows the form downward instead of re-centring the
                whole block — keeps the toggle and upper fields perfectly still. */}
            <div className="flex flex-1 flex-col px-6 pb-8 pt-2 lg:items-center lg:justify-start lg:border-l lg:border-white/10 lg:bg-[#101c28] lg:px-16 lg:pb-12 lg:pt-[14vh]">
                <div className="mx-auto w-full max-w-[400px]">
                    {authError && (
                        <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-[13px] text-rose-200">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {authError}
                        </div>
                    )}
                    {/* Mode toggle (form view only) */}
                    {view === "form" && (
                        <div className="mb-8 flex w-full rounded-full bg-white/5 p-1 text-[13px] font-semibold">
                            {(["user", "partner"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => switchMode(m)}
                                    className={"flex-1 rounded-full px-4 py-2 text-center transition-colors " + (mode === m ? "bg-white/10 text-white" : "text-white/55 hover:text-white")}
                                >
                                    {m === "user" ? "Business" : "Provider"}
                                </button>
                            ))}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view + (view === "form" ? mode : "")}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            {view === "magic-sent" ? (
                                /* ── User · magic-link sent ── */
                                <>
                                    <h2 className="flex items-center gap-2.5 font-serif text-[1.75rem] font-bold text-white">
                                        <Mail size={22} className="text-accent-400" /> Check your inbox
                                    </h2>
                                    <p className="mt-3 text-[15px] leading-relaxed text-white/65">
                                        We sent a sign-in link to <span className="font-semibold text-accent-400">{email || "you@yourcompany.com"}</span>. Click it to access your workspace.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { if (!isSupabaseConfigured) finishLogin("user"); else window.location.href = "mailto:"; }}
                                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3.5 text-[15px] font-semibold text-primary-950 transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Open Mail App <ArrowRight size={16} />
                                    </button>
                                    <ResendTimer label="Resend link available in" />
                                    <p className="mt-6 text-center text-[14px] text-white/55">
                                        Wrong email?{" "}
                                        <button onClick={() => setView("form")} className="font-semibold text-accent-400 hover:text-accent-300">
                                            Use a different one →
                                        </button>
                                    </p>
                                    <p className="mt-8 text-center text-[12px] text-white/35">Single-use link · Expires in 15:00 · Encrypted in transit</p>
                                </>
                            ) : view === "forgot" ? (
                                /* ── Partner · password reset request ── */
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleForgot();
                                    }}
                                >
                                    <h2 className="font-serif text-[1.9rem] font-bold text-white">Reset password</h2>
                                    <p className="mt-2 text-[15px] text-white/65">We'll send a single-use reset link to your Partner email.</p>
                                    <label className="mt-7 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Partner email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@partner-firm.com"
                                        className="mt-2 w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/50"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6450] px-5 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Send reset link <ArrowRight size={16} />
                                    </button>
                                    <p className="mt-4 text-center text-[12px] text-white/35">Argon2id · Encrypted in transit · Audit-logged</p>
                                    <BackToSignIn onClick={() => setView("form")} />
                                    <p className="mt-6 text-center text-[12px] text-white/30">No magic-link option for Partner accounts · password reset required</p>
                                </form>
                            ) : view === "reset-sent" ? (
                                /* ── Partner · reset link sent ── */
                                <>
                                    <h2 className="flex items-center gap-2.5 font-serif text-[1.75rem] font-bold text-white">
                                        <Mail size={22} className="text-emerald-400" /> Reset link sent
                                    </h2>
                                    <p className="mt-3 text-[15px] leading-relaxed text-white/65">
                                        If a Partner account exists for <span className="font-semibold text-emerald-400">{email || "you@partner-firm.com"}</span>, a reset link is on its way. Open it in this same browser within 30 minutes.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { if (!isSupabaseConfigured) finishLogin("partner"); else window.location.href = "mailto:"; }}
                                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6450] px-5 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Open Mail App <ArrowRight size={16} />
                                    </button>
                                    <ResendTimer label="Resend reset link available in" />
                                    <BackToSignIn onClick={() => setView("form")} />
                                    <p className="mt-6 text-center text-[12px] text-white/30">Single-use link · Expires in 30:00 · Same-browser session</p>
                                </>
                            ) : view === "error" ? (
                                /* ── Auth error (expired / invalid / rate-limited) ── */
                                <>
                                    <div className="mb-8 flex w-full rounded-full bg-white/5 p-1 text-[12px] font-semibold lg:inline-flex lg:w-auto">
                                        {(["expired", "invalid", "rate-limited"] as ErrKind[]).map((k) => (
                                            <button
                                                key={k}
                                                type="button"
                                                onClick={() => setErrKind(k)}
                                                className={"flex-1 rounded-full px-3.5 py-1.5 capitalize transition-colors lg:flex-none " + (errKind === k ? "bg-[#0e6450] text-white" : "text-white/55 hover:text-white")}
                                            >
                                                {k}
                                            </button>
                                        ))}
                                    </div>
                                    <h2 className="flex items-center gap-2.5 font-serif text-[1.75rem] font-bold text-white">
                                        <AlertTriangle size={22} className="text-rose-400" /> {ERR_COPY[errKind].title}
                                    </h2>
                                    <p className="mt-3 text-[15px] leading-relaxed text-white/65">{ERR_COPY[errKind].lead}</p>
                                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">Why this happened</p>
                                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{ERR_COPY[errKind].why}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setView("form")}
                                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6450] px-5 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Send a new link <ArrowRight size={16} />
                                    </button>
                                    <BackToSignIn onClick={() => setView("form")} />
                                </>
                            ) : mode === "user" ? (
                                /* ── User · magic-link ── */
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleMagicLink();
                                    }}
                                >
                                    <h2 className="font-serif text-[1.9rem] font-bold text-white">Welcome back</h2>
                                    <p className="mt-2 text-[15px] text-white/65">Enter your email — we&rsquo;ll send you a magic-link to sign in.</p>
                                    <label className="mt-7 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@yourcompany.com"
                                        className="mt-2 w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent-400/60"
                                    />
                                    <button
                                        type="submit"
                                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3.5 text-[15px] font-semibold text-primary-950 transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Send magic-link <ArrowRight size={16} />
                                    </button>
                                    <GoogleButton onClick={() => handleOAuth("user")} />
                                    <p className="mt-6 text-center text-[14px] text-white/60">
                                        New here?{" "}
                                        <button type="button" onClick={() => navigate(`/${lang}`)} className="font-semibold text-accent-400 hover:text-accent-300">
                                            Start your risk map →
                                        </button>
                                    </p>
                                    <p className="mt-8 text-center text-[12px] leading-relaxed text-white/35">By signing in you agree to our Terms and Privacy Policy. We never sell your data.</p>
                                </form>
                            ) : (
                                /* ── Partner · password ── */
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handlePasswordSignIn();
                                    }}
                                >
                                    <h2 className="font-serif text-[1.9rem] font-bold text-white">Sign in to your Partner workspace</h2>
                                    <p className="mt-2 text-[15px] text-white/65">Email and password.</p>
                                    <label className="mt-7 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@yourfirm.com"
                                        className="mt-2 w-full rounded-xl border border-white/12 bg-[#0a1019] px-4 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/50"
                                    />
                                    <div className="mt-5 flex items-center justify-between">
                                        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Password</label>
                                        <button type="button" onClick={() => setView("forgot")} className="text-[12px] font-semibold text-accent-400 hover:text-accent-300">Forgot?</button>
                                    </div>
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
                                    <button
                                        type="submit"
                                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6450] px-5 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                                    >
                                        Sign in <ArrowRight size={16} />
                                    </button>
                                    <GoogleButton onClick={() => handleOAuth("partner")} />
                                    <p className="mt-6 text-center text-[14px] text-white/60">
                                        Not a Partner yet?{" "}
                                        <button type="button" onClick={() => navigate(`/${lang}/providers`)} className="font-semibold text-accent-400 hover:text-accent-300">
                                            Apply for Beta cohort →
                                        </button>
                                    </p>
                                    <p className="mt-8 text-center text-[12px] leading-relaxed text-white/35">By signing in you agree to our Terms and Privacy Policy. Account activity is logged for security and dispute audits.</p>
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <SystemFooter className="mt-12 w-full justify-center text-center lg:hidden" />
            </div>
        </div>
    );
}
