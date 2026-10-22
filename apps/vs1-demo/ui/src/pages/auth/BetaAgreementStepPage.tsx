import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { Banner } from "../../components/ui/Banner";
import { useAuthStore } from "../../store/useAuthStore";
import { acceptAgreement, fetchAgreement, type UserAgreement } from "../../api/agreements";
import { ApiError } from "../../api/client";
import { markBetaAccepted, resetAgreementGate } from "../../lib/agreementGate";

// ─── Schritt nach dem ersten Login (Canvas-Wahl 2A, 22.10.2026) ─────────────
// Dasselbe Shell wie die Anmeldung: links das Narrativ auf dem Gradient, rechts
// die Karte. Der Tester liest die neun Saetze (Kurzfassung mit Link zum
// Volltext unter /terms), setzt den Haken und geht weiter; der Ausstieg steht
// gleichwertig daneben. DNA: Verstehen vor Zustimmen, keine Reibung, kein
// Druck. Eine veraltete Fassung (409) wird nie still untergeschoben: die Seite
// laedt den Text neu und sagt es.

const CTA = "mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-body-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60";

export function BetaAgreementStepPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { locale } = useParams();
    const { t, i18n } = useTranslation("legal");
    const lang = locale || i18n.resolvedLanguage || "en";
    const { isLoggedIn, loading, logout } = useAuthStore();

    const [agreement, setAgreement] = useState<UserAgreement | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [checked, setChecked] = useState(false);
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<"outdated" | "failed" | null>(null);

    useEffect(() => {
        // Ohne Login fuehrt die Seite zur Anmeldung — dann nichts laden.
        if (loading || !isLoggedIn) return;
        let alive = true;
        setLoadError(false);
        fetchAgreement("beta", lang)
            .then((a) => { if (alive) setAgreement(a); })
            .catch(() => { if (alive) setLoadError(true); });
        return () => { alive = false; };
    }, [lang, attempt]);

    if (loading) return <div className="min-h-screen bg-surface" aria-busy="true" />;
    if (!isLoggedIn) {
        return <Navigate to={`/${lang}/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }

    const redirect = new URLSearchParams(location.search).get("redirect");
    const target = redirect && redirect.startsWith("/") ? redirect : `/${lang}/dashboard`;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTried(true);
        if (!agreement || !checked || saving) return;
        setSaving(true);
        setNotice(null);
        try {
            await acceptAgreement("beta", agreement.version, agreement.language);
            markBetaAccepted();
            navigate(target, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                // Neue Fassung: Text neu laden, Haken zuruecknehmen, sagen warum.
                setNotice("outdated");
                setChecked(false);
                setTried(false);
                setAttempt((n) => n + 1);
            } else {
                setNotice("failed");
            }
        } finally {
            setSaving(false);
        }
    };

    const signOut = async () => {
        resetAgreementGate();
        await logout();
        navigate(`/${lang}/login`, { replace: true });
    };

    const version = agreement?.version ?? "";
    const needCheck = tried && !checked;

    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · Narrativ auf dem Gradient (wie die Anmeldung) */}
            <div className="flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:w-[57%] lg:gap-0 lg:px-16 lg:py-10">
                <Logo lockup="horizontal" href="/" className="h-[36px]" />
                <div className="max-w-[520px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">{t("betaStep.eyebrow")}</p>
                    <h1 className="mt-4 font-serif text-[2rem] font-bold leading-[1.14] tracking-tight text-fg lg:text-[2.625rem]">{t("betaStep.title")}</h1>
                    <p className="mt-5 max-w-[420px] text-body-lg leading-relaxed text-fg-secondary">{t("betaStep.lead")}</p>
                    {version && (
                        <p className="mt-7 flex items-start gap-2.5 text-body-sm leading-relaxed text-fg-tertiary">
                            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" /> {t("betaStep.listLabel", { version })}
                        </p>
                    )}
                </div>
                <div className="hidden lg:block" />
            </div>

            {/* RECHTS · die Karte */}
            <div className="flex flex-1 flex-col justify-center border-stroke-subtle px-6 pb-10 pt-8 lg:border-l lg:px-16 lg:py-12">
                <form noValidate onSubmit={submit} className="mx-auto w-full max-w-[440px]" aria-labelledby="beta-step-title">
                    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary" aria-label={t("betaStep.listLabel", { version })}>
                        <li className="flex items-center gap-1">{t("betaStep.steps.login")} <Check size={12} strokeWidth={3} aria-hidden /></li>
                        <li aria-hidden>›</li>
                        <li className="text-brand" aria-current="step">{t("betaStep.steps.agreement")}</li>
                        <li aria-hidden>›</li>
                        <li>{t("betaStep.steps.workspace")}</li>
                    </ol>

                    <h2 id="beta-step-title" className="font-serif text-[1.75rem] font-bold leading-tight text-fg">{t("betaStep.cardTitle")}</h2>
                    <p className="mt-2 text-body-md leading-relaxed text-fg-secondary">{t("betaStep.cardLead")}</p>

                    {notice === "outdated" && <Banner status="info" title={t("betaStep.outdated")} className="mt-5" />}
                    {notice === "failed" && (
                        <div role="alert" className="mt-5 rounded-lg border border-stroke bg-surface-secondary px-4 py-3 text-body-xs text-fg">
                            {t("betaStep.failed")}
                        </div>
                    )}

                    <p className="mt-7 text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary">{t("betaStep.listLabel", { version })}</p>
                    <div className="mt-2 rounded-xl border border-stroke bg-surface-secondary px-4 py-3.5">
                        {loadError ? (
                            <div role="status" className="text-body-xs text-fg-secondary">
                                <p>{t("beta.error")}</p>
                                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-2 font-semibold text-fg-brand underline underline-offset-2">{t("betaStep.retry")}</button>
                            </div>
                        ) : !agreement ? (
                            <p className="flex items-center gap-2 text-body-xs text-fg-tertiary" aria-live="polite"><Loader2 size={14} className="animate-spin" aria-hidden /> {t("beta.loading")}</p>
                        ) : (
                            <ol className="space-y-2" data-testid="beta-points">
                                {agreement.points.map((p, i) => (
                                    <li key={i} className="flex gap-2.5 text-body-xs leading-snug text-fg">
                                        <span className="w-5 shrink-0 font-mono text-fg-tertiary">{String(i + 1).padStart(2, "0")}</span>
                                        <span><strong className="font-semibold">{p.lead}</strong> <span className="text-fg-secondary">{p.text}</span></span>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <p className="mt-3 text-right">
                            <Link to={`/${lang}/terms`} target="_blank" rel="noreferrer" className="text-body-xs font-semibold text-fg-brand underline-offset-2 hover:underline">{t("betaStep.fullText")} →</Link>
                        </p>
                    </div>

                    <label className="mt-6 flex cursor-pointer items-start gap-3 text-body-xs leading-relaxed text-fg">
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setChecked(e.target.checked)}
                            disabled={!agreement}
                            aria-invalid={needCheck || undefined}
                            aria-describedby={needCheck ? "beta-check-error" : undefined}
                            className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-bg-brand)]"
                        />
                        <span>{t("betaStep.checkbox", { version })}</span>
                    </label>
                    {needCheck && <p id="beta-check-error" role="alert" className="mt-2 text-body-2xs text-fg-secondary">{t("betaStep.needCheck")}</p>}

                    <button type="submit" className={CTA} disabled={!agreement || saving}>
                        {saving ? <><Loader2 size={16} className="animate-spin" aria-hidden /> {t("betaStep.saving")}</> : <>{t("betaStep.cta")} <ArrowRight size={16} aria-hidden /></>}
                    </button>

                    <p className="mt-5 text-center text-body-xs text-fg-secondary">
                        {t("betaStep.exitQuestion")}{" "}
                        <button type="button" onClick={signOut} className="font-semibold text-fg-brand underline-offset-2 hover:underline">{t("betaStep.exit")} →</button>
                    </p>
                    <p className="mt-6 text-center text-body-2xs leading-relaxed text-fg-tertiary">{t("betaStep.fineprint")}</p>
                </form>
            </div>
        </div>
    );
}
