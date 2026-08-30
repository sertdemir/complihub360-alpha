import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { ArrowRight, AlertTriangle, Mail } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuthStore } from "../../store/useAuthStore";
import { SystemFooter } from "../../components/auth/SystemFooter";
import { getSupabase, isSupabaseConfigured, isDemoLoginEnabled } from "../../lib/supabase";

// ─── Auth · die Anmeldeseite ─────────────────────────────────────────────────
// Im hellen Kleid seit 2026-08-28 (Nutzer-Entscheidung, Canvas "Login-Seite":
// L1 A, L2 A, L3 C, L4 C, L5 B). Sie war die LETZTE dunkle Flaeche der Site —
// die Marketing-Baender sind ueber die Redesigns alle hell geworden, und ein
// petrol-schwarzer Split-Screen hinter dem Login brach diese Sprache genau da,
// wo ein Besucher zum ersten Mal etwas eingibt.
//
// Eine Regel traegt alle fuenf Ansichten: EINGABE steht im Split (Gradient mit
// dem Narrativ links, weisses Formular rechts), MELDUNG steht zentriert auf
// Weiss. So weiss man an der Form schon, ob man etwas tun muss.
//
// Die Zustandsmaschine ist unveraendert:
//   form        → user magic-link  ·  partner email+password
//   magic-sent  → "Postfach pruefen" (user)
//   forgot      → partner password reset request
//   reset-sent  → "Reset-Link unterwegs" (partner)
//   error       → abgelaufener / ungueltiger / limitierter Anmeldelink (?error=)

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

const ERR_KINDS: ErrKind[] = ["expired", "invalid", "rate-limited"];
const errKey = (k: ErrKind) => (k === "rate-limited" ? "rateLimited" : k);

// Gold hebt EIN Wort je Headline hervor — dieselbe Rolle wie <GoldWord> auf der
// Marketing-Flaeche.
const goldComponents = {
    br: <br />,
    gold: <span className="text-accent-700 dark:text-fg-accent-strong" />,
};

/** Wie in LegalPages.tsx und auf der Kontaktseite: sichtbar offen statt erfunden. */
function Placeholder({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded bg-warning-bg px-1.5 py-0.5 font-mono text-[0.85em] text-warning-700 ring-1 ring-inset ring-warning-500/30">
            [{children}]
        </span>
    );
}

const FIELD =
    "mt-2 w-full rounded-lg border border-stroke bg-surface px-3.5 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35";
const LABEL = "block text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary";
const CTA =
    "mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3.5 text-body-md font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5";

function GoogleButton({ onClick }: { onClick: () => void }) {
    const { t } = useTranslation("auth");
    return (
        <>
            <div className="my-5 flex items-center gap-3 text-body-4xs font-bold uppercase tracking-[0.12em] text-fg-tertiary">
                <span className="h-px flex-1 bg-stroke-subtle" /> {t("login.or")} <span className="h-px flex-1 bg-stroke-subtle" />
            </div>
            <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-stroke bg-surface px-5 py-3 text-body-sm font-semibold text-fg transition-colors hover:bg-surface-secondary"
            >
                <GoogleIcon /> {t("login.continueWithGoogle")}
            </button>
        </>
    );
}


// Ausdruecklicher, beschrifteter Demo-Einstieg — nur wenn VITE_DEMO_LOGIN ihn
// erlaubt (Staging). Die echte Anmeldung bleibt unberuehrt.
function DemoLoginRow({ role, onEnter }: { role: "user" | "partner"; onEnter: (r: "user" | "partner") => void }) {
    const { t } = useTranslation("auth");
    return (
        <button
            type="button"
            onClick={() => onEnter(role)}
            className="mt-4 w-full rounded-lg border border-dashed border-stroke px-5 py-2.5 text-body-xs font-medium text-fg-tertiary transition-colors hover:border-stroke-strong hover:text-fg"
        >
            {role === "partner" ? t("login.demo.partner") : t("login.demo.user")}
        </button>
    );
}

function BackToSignIn({ onClick }: { onClick: () => void }) {
    const { t } = useTranslation("auth");
    return (
        <p className="mt-6 text-center">
            <button type="button" onClick={onClick} className="text-body-sm font-semibold text-brand transition-colors hover:text-brand-700">
                {t("login.backToSignIn")}
            </button>
        </p>
    );
}

function ResendTimer({ label, total = 58, onResend }: { label: string; total?: number; onResend?: () => void }) {
    const { t } = useTranslation("auth");
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
    // Der Balken fuellt sich, waehrend die Sperre ablaeuft → 100 % heisst bereit.
    const pct = Math.round(((total - remaining) / total) * 100);
    const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

    return (
        <div className="mt-5 rounded-lg border border-stroke-subtle bg-surface-secondary px-4 py-3 text-left">
            <div className="flex items-center justify-between text-body-4xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
                {done ? (
                    <>
                        <span className="text-brand">{t("login.resend.ready")}</span>
                        <button type="button" onClick={restart} className="text-brand transition-colors hover:text-brand-700">
                            {t("login.resend.button")}
                        </button>
                    </>
                ) : (
                    <>
                        <span>{label}</span>
                        <span className="tabular-nums">{mmss}</span>
                    </>
                )}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-brand/10">
                <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation("auth");
    const lang = i18n.resolvedLanguage || "en";
    const login = useAuthStore((s) => s.login);

    const params = new URLSearchParams(location.search);
    const errParam = params.get("error") as ErrKind | null;

    const [mode, setMode] = useState<Mode>("user");
    const [view, setView] = useState<View>(errParam ? "error" : "form");
    // Die Fehlerart kommt aus ?error= und ist danach fest. Bis 2026-08-28 stand
    // hier eine Umschaltleiste, mit der ein Besucher sich seine Fehlermeldung
    // aussuchen konnte — ein Schaufenster fuer drei Zustaende, von denen im
    // Ernstfall genau einer zutrifft.
    const errKind: ErrKind = errParam && ERR_KINDS.includes(errParam) ? errParam : "expired";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);

    const finishLogin = (role: "user" | "partner") => {
        login(role, (email || "you").split("@")[0]);
        const redirect = params.get("redirect");
        navigate(redirect || `/${lang}/${role === "partner" ? "partner-dashboard" : "dashboard"}`);
    };

    // Dev-Einstieg in den Admin-Workspace (bewusst ohne oeffentliche Admin-UI):
    // /:locale/login?as=admin — nur mit aktivem Demo-Auth-Fallback.
    useEffect(() => {
        if (params.get("as") === "admin" && isDemoLoginEnabled) {
            login("admin", "admin");
            navigate(`/${lang}/admin`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Echte Supabase-Auth (mit Dev-Fallback, wenn die Umgebung fehlt) ───────
    const [authError, setAuthError] = useState<string | null>(null);
    const callbackUrl = `${window.location.origin}/${lang}/auth/callback`;
    const resetUrl = `${window.location.origin}/${lang}/reset-password`;

    // Supabase reicht bei manchen Fehlern eine leere Nachricht durch — dann
    // stand im Banner woertlich "{}" (Befund 2026-08-30, Magic-Link bei
    // kaputtem SMTP). Eine unlesbare Fehlermeldung ist schlimmer als eine
    // allgemeine: sie sieht aus wie ein Anzeigefehler und nicht wie ein
    // Hinweis. Kurze oder klammerartige Werte fallen deshalb auf einen
    // uebersetzten Satz zurueck.
    const readableError = (raw: string | null | undefined): string => {
        const m = (raw ?? "").trim();
        if (!m || m === "{}" || m === "[]" || m.length < 3) return t("login.validation.unknownError");
        return m;
    };

    const handleMagicLink = async () => {
        setAuthError(null);
        if (!/.+@.+\..+/.test(email)) { setAuthError(t("login.validation.invalidEmail")); return; }
        const sb = isSupabaseConfigured ? await getSupabase() : null;
        if (!sb) { setView("magic-sent"); return; }
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } });
        if (error) { setAuthError(readableError(error.message)); return; }
        setView("magic-sent");
    };

    const handlePasswordSignIn = async () => {
        setAuthError(null);
        const sb = isSupabaseConfigured ? await getSupabase() : null;
        if (!sb) { finishLogin("partner"); return; }
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setAuthError(readableError(error.message)); return; }
        navigate(params.get("redirect") || `/${lang}/partner-dashboard`);
    };

    // Dieselbe Bestaetigung, egal ob es das Konto gibt — sonst verraet die Seite,
    // welche Adressen registriert sind.
    const handleForgot = async () => {
        setAuthError(null);
        if (!/.+@.+\..+/.test(email)) { setAuthError(t("login.validation.invalidEmail")); return; }
        const sb = isSupabaseConfigured ? await getSupabase() : null;
        if (sb) {
            await sb.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
        }
        setView("reset-sent");
    };

    const handleOAuth = async (role: "user" | "partner") => {
        setAuthError(null);
        const sb = isSupabaseConfigured ? await getSupabase() : null;
        if (!sb) { finishLogin(role); return; }
        const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl } });
        if (error) setAuthError(readableError(error.message));
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        setView("form");
    };

    // Eingabe steht im Split, Meldung zentriert — siehe Kopfkommentar.
    const isMessage = view === "magic-sent" || view === "reset-sent" || view === "error";

    const errorBanner = authError ? (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-error-500/30 bg-error-bg px-4 py-2.5 text-body-xs text-error-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {authError}
        </div>
    ) : null;

    const modeToggle = (
        <div className="mb-8 inline-flex gap-1.5">
            {(["user", "partner"] as Mode[]).map((m) => (
                <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => switchMode(m)}
                    className={
                        "rounded-lg px-4 py-2 text-body-xs font-semibold transition-colors " +
                        (mode === m
                            ? "bg-fg text-surface"
                            : "border border-stroke bg-surface text-fg-secondary hover:border-stroke-strong hover:text-fg")
                    }
                >
                    {m === "user" ? t("login.toggle.business") : t("login.toggle.provider")}
                </button>
            ))}
        </div>
    );

    // ── Das Narrativ der Split-Ansichten ──────────────────────────────────────
    const narrative =
        view === "forgot"
            ? {
                  eyebrow: t("login.left.forgot.eyebrow"),
                  title: <Trans t={t} i18nKey="login.left.forgot.title" components={goldComponents} />,
                  body: t("login.left.forgot.body"),
                  note: t("login.left.forgot.note"),
              }
            : mode === "user"
              ? {
                    eyebrow: t("login.left.user.eyebrow"),
                    title: <Trans t={t} i18nKey="login.left.user.title" components={goldComponents} />,
                    body: t("login.left.user.lead"),
                    note: undefined as string | undefined,
                }
              : {
                    eyebrow: t("login.left.partner.eyebrow"),
                    title: <Trans t={t} i18nKey="login.left.partner.title" components={goldComponents} />,
                    body: t("login.left.partner.lead"),
                    note: undefined as string | undefined,
                };

    // ── Das Formular der Split-Ansichten ─────────────────────────────────────
    const formPane = (
        <div className="mx-auto w-full max-w-[400px]">
            {errorBanner}
            {view === "form" && modeToggle}

            <AnimatePresence mode="wait">
                <motion.div
                    key={view + (view === "form" ? mode : "")}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    {view === "forgot" ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleForgot(); }}>
                            <h2 className="font-serif text-[1.75rem] font-bold leading-tight text-fg">{t("login.forgot.title")}</h2>
                            <p className="mt-2 text-body-md leading-relaxed text-fg-secondary">{t("login.forgot.subtitle")}</p>
                            <label htmlFor="login-email" className={"mt-7 " + LABEL}>{t("login.forgot.emailLabel")}</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@kanzlei.de"
                                className={FIELD}
                            />
                            <button type="submit" className={CTA}>
                                {t("login.forgot.send")} <ArrowRight size={16} />
                            </button>
                            <p className="mt-4 text-center text-body-2xs text-fg-tertiary">{t("login.forgot.fineprint")}</p>
                            <BackToSignIn onClick={() => setView("form")} />
                        </form>
                    ) : mode === "user" ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleMagicLink(); }}>
                            <h2 className="font-serif text-[1.75rem] font-bold leading-tight text-fg">{t("login.user.title")}</h2>
                            <label htmlFor="login-email" className={"mt-7 block " + LABEL}>{t("login.emailLabel")}</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="sie@ihrunternehmen.de"
                                className={FIELD}
                            />
                            <button type="submit" className={CTA}>
                                {t("login.user.send")} <ArrowRight size={16} />
                            </button>
                            <GoogleButton onClick={() => handleOAuth("user")} />
                            {isDemoLoginEnabled && <DemoLoginRow role="user" onEnter={finishLogin} />}
                            <p className="mt-6 text-center text-body-sm text-fg-secondary">
                                {t("login.user.newHere")}{" "}
                                <button type="button" onClick={() => navigate(`/${lang}/register`)} className="font-semibold text-brand transition-colors hover:text-brand-700">
                                    {t("login.user.createAccount")}
                                </button>
                            </p>
                            <p className="mt-7 text-center text-body-2xs leading-relaxed text-fg-tertiary">{t("login.user.legal")}</p>
                        </form>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handlePasswordSignIn(); }}>
                            <h2 className="font-serif text-[1.75rem] font-bold leading-tight text-fg">{t("login.partner.title")}</h2>
                            <label htmlFor="login-email" className={"mt-7 block " + LABEL}>{t("login.emailLabel")}</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="sie@kanzlei.de"
                                className={FIELD}
                            />
                            <div className="mt-5 flex items-center justify-between">
                                <label htmlFor="login-password" className={LABEL}>{t("login.partner.passwordLabel")}</label>
                                <button type="button" onClick={() => setView("forgot")} className="text-body-2xs font-semibold text-brand transition-colors hover:text-brand-700">
                                    {t("login.partner.forgotLink")}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••"
                                    className={FIELD + " pr-16"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-body-2xs font-semibold text-fg-tertiary transition-colors hover:text-fg"
                                >
                                    {showPw ? t("login.hide") : t("login.show")}
                                </button>
                            </div>
                            <button type="submit" className={CTA}>
                                {t("login.partner.signIn")} <ArrowRight size={16} />
                            </button>
                            <GoogleButton onClick={() => handleOAuth("partner")} />
                            {isDemoLoginEnabled && <DemoLoginRow role="partner" onEnter={finishLogin} />}
                            <p className="mt-7 text-center text-body-2xs leading-relaxed text-fg-tertiary">{t("login.partner.legal")}</p>
                        </form>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );

    // ── L3-C / L4-C · Meldungen, zentriert auf Weiss ──────────────────────────
    if (isMessage) {
        const sent = view === "magic-sent" || view === "reset-sent";
        const shown = email || (view === "reset-sent" ? "sie@kanzlei.de" : "sie@ihrunternehmen.de");
        return (
            <div className="flex min-h-screen flex-col bg-surface px-6 py-8 lg:px-16 lg:py-10">
                <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />

                <div className="flex flex-1 items-center justify-center py-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full max-w-[640px] text-center"
                        >
                            {sent ? (
                                <>
                                    <Mail size={30} strokeWidth={1.6} className="mx-auto text-brand" aria-hidden />
                                    <p className="mt-5 text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">
                                        {t(view === "magic-sent" ? "login.left.magicSent.eyebrow" : "login.left.resetSent.eyebrow")}
                                    </p>
                                    <h1 className="mt-3 font-serif text-[2.25rem] font-bold leading-tight tracking-tight text-fg">
                                        <Trans
                                            t={t}
                                            i18nKey={view === "magic-sent" ? "login.left.magicSent.title" : "login.left.resetSent.title"}
                                            components={goldComponents}
                                        />
                                    </h1>
                                    <p className="mx-auto mt-4 max-w-[480px] text-body-lg leading-relaxed text-fg-secondary">
                                        <Trans
                                            t={t}
                                            i18nKey={view === "magic-sent" ? "login.magicSent.body" : "login.resetSent.body"}
                                            values={{ email: shown }}
                                            components={{ em: <span className="font-semibold text-fg" /> }}
                                        />
                                    </p>
                                    <div className="mx-auto mt-7 grid max-w-[420px] grid-cols-2 border-y border-accent-500/40 py-5">
                                        <div>
                                            <p className="font-serif text-[1.0625rem] font-bold text-fg">
                                                {t(view === "magic-sent" ? "login.facts.validMagic" : "login.facts.validReset")}
                                            </p>
                                            <p className="mt-1 text-body-2xs text-fg-tertiary">{t("login.facts.validLabel")}</p>
                                        </div>
                                        <div className="border-l border-stroke-subtle">
                                            <p className="font-serif text-[1.0625rem] font-bold text-fg">{t("login.facts.onceValue")}</p>
                                            <p className="mt-1 text-body-2xs text-fg-tertiary">{t("login.facts.onceLabel")}</p>
                                        </div>
                                    </div>
                                    <div className="mx-auto max-w-[340px]">
                                        <ResendTimer label={t(view === "magic-sent" ? "login.magicSent.resendIn" : "login.resetSent.resendIn")} />
                                    </div>
                                    <BackToSignIn onClick={() => { setView("form"); setMode(view === "reset-sent" ? "partner" : "user"); }} />
                                    <p className="mt-6 text-body-2xs text-fg-tertiary">
                                        {t(view === "magic-sent" ? "login.magicSent.fineprint" : "login.resetSent.fineprint")}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={30} strokeWidth={1.6} className="mx-auto text-warning-700" aria-hidden />
                                    <p className="mt-5 text-body-3xs font-bold uppercase tracking-[0.14em] text-warning-700">
                                        {t(`login.errors.kindLabels.${errKey(errKind)}`)}
                                    </p>
                                    <h1 className="mt-3 font-serif text-[2.25rem] font-bold leading-tight tracking-tight text-fg">
                                        {t(`login.errors.${errKey(errKind)}.title`)}
                                    </h1>
                                    <p className="mx-auto mt-4 max-w-[480px] text-body-lg leading-relaxed text-fg-secondary">
                                        {t(`login.errors.${errKey(errKind)}.lead`)}
                                    </p>
                                    {/* Abgesetzt statt als zweiter Fliesstext: bei "abgelaufen"
                                        wiederholt die Erklaerung sonst nur den Lead, waehrend sie
                                        bei "ungueltig" und "limitiert" echte Zusatzinfo traegt.
                                        Die Hairline-Box macht sie als Fussnote lesbar. */}
                                    <p className="mx-auto mt-6 max-w-[440px] rounded-lg border border-stroke-subtle bg-surface-secondary px-4 py-3 text-body-xs leading-relaxed text-fg-tertiary">
                                        {t(`login.errors.${errKey(errKind)}.why`)}
                                    </p>

                                    <div className="mx-auto mt-8 max-w-[360px] text-left">
                                        {errorBanner}
                                        <form onSubmit={(e) => { e.preventDefault(); handleMagicLink(); }}>
                                            <label htmlFor="login-email" className={LABEL}>{t("login.emailLabel")}</label>
                                            <input
                                                id="login-email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="sie@ihrunternehmen.de"
                                                className={FIELD}
                                            />
                                            <button type="submit" className={CTA}>
                                                {t("login.errors.sendNewLink")} <ArrowRight size={16} />
                                            </button>
                                        </form>
                                    </div>

                                    {/* TODO(contact-live): Support-Adresse und die echte Request-ID
                                        einsetzen. Bis dahin stehen beide als Platzhalter da, statt
                                        eine erfundene Kennung wie "req_8f24b1c" auszugeben. */}
                                    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-body-2xs text-fg-tertiary">
                                        <span>{t("login.left.error.supportLabel")}:</span>
                                        <Placeholder>support@…</Placeholder>
                                        <span className="text-stroke">·</span>
                                        <span>{t("login.left.error.requestLabel")}</span>
                                        <Placeholder>Request-ID</Placeholder>
                                    </p>
                                    <BackToSignIn onClick={() => setView("form")} />
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <SystemFooter />
            </div>
        );
    }

    // ── L1-A / L2-A · Eingabe im Split ────────────────────────────────────────
    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · Narrativ auf dem Gradient */}
            <div className="flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:w-[57%] lg:gap-0 lg:px-16 lg:py-10">
                <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />

                <div className="max-w-[520px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">{narrative.eyebrow}</p>
                    <h1 className="mt-4 font-serif text-[2rem] font-bold leading-[1.14] tracking-tight text-fg lg:text-[2.625rem]">
                        {narrative.title}
                    </h1>
                    {narrative.body && (
                        <p className="mt-5 max-w-[420px] text-body-lg leading-relaxed text-fg-secondary">{narrative.body}</p>
                    )}
                    {narrative.note && (
                        <p className="mt-7 flex items-start gap-2.5 text-body-sm leading-relaxed text-fg-tertiary">
                            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" /> {narrative.note}
                        </p>
                    )}
                </div>

                <SystemFooter className="hidden lg:flex" />
            </div>

            {/* RECHTS · Formular auf Weiss */}
            <div className="flex flex-1 flex-col justify-center border-stroke-subtle px-6 pb-10 pt-8 lg:border-l lg:px-16 lg:py-12">
                {formPane}
                <SystemFooter className="mt-10 lg:hidden" />
            </div>
        </div>
    );
}
