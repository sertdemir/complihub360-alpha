import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { Segment } from "../../components/compliance-areas";
import { SystemFooter } from "../../components/auth/SystemFooter";
import { useAuthStore } from "../../store/useAuthStore";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import { DOMAINS, type DomainSlug } from "../../lib/domains";

// ─── Auth · die Registrierung ────────────────────────────────────────────────
// Im hellen Kleid seit 2026-08-28 (Nutzer-Entscheidung, Canvas "Register-Seite":
// R1 A, R2 A, R3 A, R4 B, R5 B) — im selben Zug wie der Login, und mit
// derselben Regel: EINGABE steht im Split (Gradient mit dem Narrativ links,
// weisses Formular rechts), MELDUNG steht als Karte bzw. zentriert.
//
// Was die Seite vorher trug und jetzt nicht mehr:
// - Material-Icon-Ligaturen, deren Font nie geladen wurde — links stand
//   woertlich "verified_user", "speed", "dashboard" als Text, die Knoepfe
//   zeigten "arrow_back"/"arrow_forward".
// - Emojis als Icons (Rollen-Umschalter, Dringlichkeit) — gegen die
//   Site-Konvention; die Flaggen der Laenderauswahl sind die erlaubte Ausnahme.
// - Einen "Beratungspartner"-Tab, der wortlos nach /provider-intake sprang,
//   wo ohne Token nur der Nur-auf-Einladung-Hinweis steht. Die dazugehoerigen
//   PartnerStep1-3 und das Partner-Nutzenpanel waren dadurch UNERREICHBAR —
//   toter Code, hier ersatzlos ausgebaut. Der Tab fuehrt jetzt auf die
//   R4-Weiche: eine Karte, die den echten Weg erklaert (Bewerbung ueber die
//   Kontaktseite, Pruefung, persoenlicher Zugangslink) — wie auf /platform
//   etabliert.
//
// Drei Schritte, unveraendert in der Sache: Konto → Unternehmen → Bedarf.
// Abschluss: mit konfiguriertem Supabase ein echtes signUp mit
// E-Mail-Bestaetigung (weiter nach /verify-email, der R5-Karte); im
// Demo-Fallback wie bisher direkt in den Workspace.

const GoogleIcon = () => (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface FormData {
    name: string; email: string; password: string; consent: boolean;
    companyName: string; industry: string; companySize: string; country: string; targetMarkets: string[];
    complianceAreas: string[]; intent: string; urgency: string;
}
const DEFAULT_DATA: FormData = {
    name: "", email: "", password: "", consent: false,
    companyName: "", industry: "", companySize: "", country: "", targetMarkets: [],
    complianceAreas: [], intent: "", urgency: "",
};

/* Option definitions carry stable values + i18n key segments; labels resolve
   via the 'auth' namespace (register.*). */
const INDUSTRY_KEYS = ["ecommerce", "marketplace", "saas", "agency", "manufacturing", "other"] as const;
const COMPANY_SIZE_VALUES = ["1-10", "11-50", "51-200", "201+"] as const;

// Flaggen-Emojis sind die dokumentierte Ausnahme der Icon-Konvention.
const COUNTRY_DEFS = [
    { value: "de", flag: "🇩🇪" }, { value: "uk", flag: "🇬🇧" }, { value: "fr", flag: "🇫🇷" }, { value: "nl", flag: "🇳🇱" },
    { value: "at", flag: "🇦🇹" }, { value: "ch", flag: "🇨🇭" }, { value: "it", flag: "🇮🇹" }, { value: "es", flag: "🇪🇸" },
    { value: "pl", flag: "🇵🇱" }, { value: "se", flag: "🇸🇪" }, { value: "us", flag: "🇺🇸" }, { value: "eu", flag: "🇪🇺" },
] as const;

/* Der Bereichs-Picker leitet sich aus der kanonischen DOMAINS-Liste ab statt
   aus einer Handkopie — die war zweimal auseinandergedriftet (Werte, die der
   Matcher nie scoren kann, und fuenf Bereiche, nachdem die Liste auf acht
   gewachsen war). Slugs sind, was das Backend erwartet. */
const COMPLIANCE_AREA_DEFS = DOMAINS.map((d) => ({ value: d.slug as DomainSlug, tKey: d.i18nKey }));

const INTENT_DEFS = [
    { value: "self-check", tKey: "selfCheck" },
    { value: "expert", tKey: "expert" },
    { value: "full-service", tKey: "fullService" },
] as const;
const URGENCY_DEFS = ["today", "week", "month", "researching"] as const;

const FIELD =
    "mt-2 w-full rounded-lg border border-stroke bg-surface px-3.5 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35";
const LABEL = "block text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary";

function Field({ id, label, type = "text", value, onChange, placeholder, minLength }: {
    id: string; label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; minLength?: number;
}) {
    return (
        <div>
            <label htmlFor={id} className={"mt-5 " + LABEL}>{label}</label>
            <input id={id} type={type} value={value} minLength={minLength} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
        </div>
    );
}

function Select({ id, label, value, onChange, options, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; placeholder: string;
}) {
    return (
        <div>
            <label htmlFor={id} className={"mt-5 " + LABEL}>{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={FIELD + (value ? "" : " text-fg-tertiary")}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

/** Mehrfachauswahl im geteilten Segment-Vokabular (Explorer/Kontaktseite). */
function SegmentGroup({ label, options, selected, onChange }: {
    label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void;
}) {
    const toggle = (v: string) =>
        onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    return (
        <div>
            <span className={"mt-5 " + LABEL}>{label}</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
                {options.map((o) => (
                    <Segment key={o.value} selected={selected.includes(o.value)} onClick={() => toggle(o.value)}>
                        {o.label}
                    </Segment>
                ))}
            </div>
        </div>
    );
}

// ─── Fortschritt: drei benannte Punkte statt Prozentbalken ──────────────────
function StepDots({ current }: { current: number }) {
    const { t } = useTranslation("auth");
    return (
        <div className="mb-7 flex items-center gap-2.5">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-w-0 items-center gap-2.5" style={{ flex: i > 0 ? 1 : undefined }}>
                    {i > 0 && <span className="h-px min-w-3 flex-1 bg-stroke-subtle" aria-hidden />}
                    <span
                        className={
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full text-body-3xs font-bold " +
                            (i < current
                                ? "bg-brand text-fg-on-brand"
                                : i === current
                                  ? "bg-brand text-fg-on-brand"
                                  : "border border-stroke text-fg-tertiary")
                        }
                        aria-hidden
                    >
                        {i < current ? <Check size={13} /> : i + 1}
                    </span>
                    <span className={"truncate text-body-2xs " + (i === current ? "font-bold text-fg" : "font-semibold text-fg-tertiary")}>
                        {t(`register.userSteps.${i}`)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation("auth");
    const lang = i18n.resolvedLanguage || "en";
    const authLogin = useAuthStore((s) => s.login);

    const [role, setRole] = useState<"user" | "partner">("user");
    const [step, setStep] = useState(0);
    const [data, setData] = useState<FormData>(DEFAULT_DATA);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const patch = (d: Partial<FormData>) => setData((prev) => ({ ...prev, ...d }));

    const countryOptions = COUNTRY_DEFS.map((c) => ({ value: c.value, label: `${c.flag} ${t(`register.countryNames.${c.value}`)}` }));
    const isLast = step === 2;

    const canProceed =
        step === 0 ? Boolean(data.name && data.email && data.password.length >= 8 && data.consent) : true;

    const finish = async () => {
        setAuthError(null);
        setLoading(true);
        const sb = isSupabaseConfigured ? await getSupabase() : null;
        if (!sb) {
            // Demo-Fallback wie bisher: direkt in den Workspace — ein
            // vorgetaeuschter Bestaetigungs-Schirm waere hier eine Luege.
            authLogin("user", data.name || (data.email || "you").split("@")[0]);
            const redirect = new URLSearchParams(location.search).get("redirect");
            navigate(redirect || `/${lang}/dashboard`);
            return;
        }
        const { error } = await sb.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                emailRedirectTo: `${window.location.origin}/${lang}/auth/callback`,
                data: {
                    full_name: data.name,
                    company_name: data.companyName,
                    industry: data.industry,
                    company_size: data.companySize,
                    country: data.country,
                    target_markets: data.targetMarkets,
                    compliance_areas: data.complianceAreas,
                    intent: data.intent,
                    urgency: data.urgency,
                },
            },
        });
        setLoading(false);
        if (error) { setAuthError(error.message); return; }
        navigate(`/${lang}/verify-email`, { state: { email: data.email } });
    };

    const roleToggle = (
        <div className="mb-7 flex flex-wrap gap-2">
            {(["user", "partner"] as const).map((r) => (
                <Segment key={r} selected={role === r} onClick={() => setRole(r)}>
                    {t(r === "user" ? "register.roleUser" : "register.rolePartner")}
                </Segment>
            ))}
        </div>
    );

    // ── R4-B · Die Partner-Weiche: Karte auf vollflaechigem Gradient ─────────
    // Anbieter werden geprueft aufgenommen, nicht selbst registriert (v2
    // §10/D7). Statt den Tab wortlos vor die Invite-only-Wand von
    // /provider-intake springen zu lassen, sagt die Karte den echten Weg.
    if (role === "partner") {
        return (
            <div className="flex min-h-screen flex-col bg-gradient-stage px-6 py-8 lg:px-16 lg:py-10">
                <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />
                <div className="flex flex-1 items-center justify-center py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-full max-w-[520px] rounded-xl bg-surface p-9 text-center shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary"
                    >
                        <div className="mx-auto mb-7 flex flex-wrap justify-center gap-2">
                            {(["user", "partner"] as const).map((r) => (
                                <Segment key={r} selected={role === r} onClick={() => setRole(r)}>
                                    {t(r === "user" ? "register.roleUser" : "register.rolePartner")}
                                </Segment>
                            ))}
                        </div>
                        <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">
                            {t("register.partnerGate.kicker")}
                        </p>
                        <h1 className="mt-2.5 font-serif text-[1.5rem] font-bold leading-tight text-fg">
                            {t("register.partnerGate.title")}
                        </h1>
                        <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                            {t("register.partnerGate.body")}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate(`/${lang}/contact`)}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3.5 text-body-md font-semibold text-fg-on-brand transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            {t("register.partnerGate.cta")} <ArrowRight size={16} />
                        </button>
                        <p className="mt-4 text-body-xs">
                            <button
                                type="button"
                                onClick={() => navigate(`/${lang}/platform`)}
                                className="font-semibold text-brand transition-colors hover:text-brand-700"
                            >
                                {t("register.partnerGate.learnMore")}
                            </button>
                        </p>
                    </motion.div>
                </div>
                <SystemFooter />
            </div>
        );
    }

    // ── R1-A/R2-A/R3-A · Die drei Schritte im Split ──────────────────────────
    // Schritt 1 traegt das breite Narrativ mit den drei Zusagen; die Schritte
    // 2 und 3 ruecken die Spalte schmaler, weil ihre Formulare mehr Platz
    // brauchen — beides wie im Canvas gewaehlt.
    const promises = [0, 1, 2] as const;

    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · Narrativ auf dem Gradient */}
            <div
                className={
                    "flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:gap-0 lg:px-14 lg:py-10 " +
                    (step === 0 ? "lg:w-[52%]" : "lg:w-[42%]")
                }
            >
                <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />

                <div className="max-w-[480px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">
                        {t("register.left.eyebrow")}
                    </p>
                    <h1 className="mt-4 font-serif text-[1.75rem] font-bold leading-[1.16] tracking-tight text-fg lg:text-[2.25rem]">
                        <Trans
                            t={t}
                            i18nKey={`register.left.title${step === 0 ? "" : step + 1}`}
                            components={{ gold: <span className="text-accent-700 dark:text-fg-accent-strong" />, br: <br /> }}
                        />
                    </h1>
                    {step === 0 && (
                        <div className="mt-7 divide-y divide-[rgba(2,22,17,0.08)] border-y border-[rgba(2,22,17,0.08)]">
                            {promises.map((i) => (
                                <p key={i} className="flex items-start gap-3 py-3 text-body-sm leading-relaxed text-fg-secondary">
                                    <Check size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                                    {t(`register.left.promises.${i}`)}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <SystemFooter className="hidden lg:flex" />
            </div>

            {/* RECHTS · Formular */}
            <div className="flex flex-1 flex-col justify-center border-stroke-subtle px-6 pb-10 pt-8 lg:border-l lg:px-14 lg:py-12">
                <div className="mx-auto w-full max-w-[420px]">
                    {step === 0 && roleToggle}
                    <StepDots current={step} />

                    {authError && (
                        <div className="mb-5 rounded-lg border border-error-500/30 bg-error-bg px-4 py-2.5 text-body-xs text-error-700">
                            {authError}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            {step === 0 && (
                                <>
                                    <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">
                                        {t("register.stepTitles.account")}
                                    </h2>
                                    <button
                                        type="button"
                                        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg border border-stroke bg-surface px-5 py-3 text-body-sm font-semibold text-fg transition-colors hover:bg-surface-secondary"
                                    >
                                        <GoogleIcon /> {t("register.googleSignup")}
                                    </button>
                                    <div className="my-5 flex items-center gap-3 text-body-4xs font-bold uppercase tracking-[0.12em] text-fg-tertiary">
                                        <span className="h-px flex-1 bg-stroke-subtle" /> {t("register.orEmail")} <span className="h-px flex-1 bg-stroke-subtle" />
                                    </div>
                                    <Field id="reg-name" label={t("register.nameLabel")} value={data.name} onChange={(v) => patch({ name: v })} placeholder={t("register.namePlaceholder")} />
                                    <Field id="reg-email" label={t("register.emailLabel")} type="email" value={data.email} onChange={(v) => patch({ email: v })} placeholder="name@unternehmen.de" />
                                    <Field id="reg-password" label={t("register.passwordLabel")} type="password" value={data.password} onChange={(v) => patch({ password: v })} placeholder={t("register.passwordPlaceholder")} minLength={8} />
                                    <label className="mt-5 flex cursor-pointer items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={data.consent}
                                            onChange={(e) => patch({ consent: e.target.checked })}
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand,#004D40)]"
                                        />
                                        <span className="text-body-2xs leading-relaxed text-fg-tertiary">
                                            <Trans
                                                t={t}
                                                i18nKey="register.consent"
                                                components={{
                                                    terms: <a href={`/${lang}/terms`} className="font-semibold text-brand" />,
                                                    privacy: <a href={`/${lang}/privacy`} className="font-semibold text-brand" />,
                                                }}
                                            />
                                        </span>
                                    </label>
                                </>
                            )}

                            {step === 1 && (
                                <>
                                    <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">
                                        {t("register.stepTitles.company")}
                                    </h2>
                                    <Field id="reg-company" label={t("register.companyLabel")} value={data.companyName} onChange={(v) => patch({ companyName: v })} placeholder={t("register.companyPlaceholder")} />
                                    <Select id="reg-industry" label={t("register.industryLabel")} value={data.industry} onChange={(v) => patch({ industry: v })} placeholder={t("register.industryPlaceholder")}
                                        options={INDUSTRY_KEYS.map((k) => ({ value: k, label: t(`register.industries.${k}`) }))} />
                                    <Select id="reg-size" label={t("register.sizeLabel")} value={data.companySize} onChange={(v) => patch({ companySize: v })} placeholder={t("register.sizePlaceholder")}
                                        options={COMPANY_SIZE_VALUES.map((v, i) => ({ value: v, label: t(`register.companySizes.${i}`) }))} />
                                    <Select id="reg-country" label={t("register.countryLabel")} value={data.country} onChange={(v) => patch({ country: v })} placeholder={t("register.countryPlaceholder")}
                                        options={countryOptions} />
                                    <SegmentGroup label={t("register.targetMarketsLabel")} options={countryOptions} selected={data.targetMarkets} onChange={(v) => patch({ targetMarkets: v })} />
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">
                                        {t("register.stepTitles.needs")}
                                    </h2>
                                    <SegmentGroup
                                        label={t("register.complianceAreasLabel")}
                                        options={COMPLIANCE_AREA_DEFS.map((a) => ({ value: a.value, label: t(`register.domains.${a.tKey}`) }))}
                                        selected={data.complianceAreas}
                                        onChange={(v) => patch({ complianceAreas: v })}
                                    />
                                    <span className={"mt-6 " + LABEL}>{t("register.intentLabel")}</span>
                                    <div className="mt-2.5 flex flex-col gap-2">
                                        {INTENT_DEFS.map((opt) => {
                                            const active = data.intent === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => patch({ intent: opt.value })}
                                                    className={
                                                        "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors " +
                                                        (active ? "border-brand bg-brand/5" : "border-stroke bg-surface hover:border-stroke-strong")
                                                    }
                                                >
                                                    <span
                                                        aria-hidden
                                                        className={
                                                            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 " +
                                                            (active ? "border-brand" : "border-stroke")
                                                        }
                                                    >
                                                        {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-body-sm font-bold text-fg">{t(`register.intents.${opt.tKey}.label`)}</span>
                                                        <span className="block text-body-2xs text-fg-tertiary">{t(`register.intents.${opt.tKey}.desc`)}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <SegmentGroup
                                        label={t("register.urgencyLabel")}
                                        options={URGENCY_DEFS.map((k) => ({ value: k, label: t(`register.urgencyOptions.${k}`) }))}
                                        selected={data.urgency ? [data.urgency] : []}
                                        onChange={(v) => patch({ urgency: v[v.length - 1] ?? "" })}
                                    />
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="mt-7 flex items-center justify-between border-t border-stroke-subtle pt-5">
                        <button
                            type="button"
                            onClick={() => step > 0 && setStep(step - 1)}
                            disabled={step === 0}
                            className="text-body-sm font-semibold text-fg-tertiary transition-colors enabled:hover:text-fg disabled:opacity-40"
                        >
                            ← {t("register.back")}
                        </button>
                        <button
                            type="button"
                            disabled={!canProceed || loading}
                            onClick={() => (isLast ? finish() : setStep(step + 1))}
                            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-body-md font-semibold text-fg-on-brand transition-transform duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {loading ? t("register.creating") : isLast ? t("register.createAccount") : t("register.next")}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </div>

                    <p className="mt-5 text-center text-body-xs text-fg-tertiary">
                        {t("register.alreadyRegistered")}{" "}
                        <button type="button" onClick={() => navigate(`/${lang}/login`)} className="font-semibold text-brand transition-colors hover:text-brand-700">
                            {t("register.login")}
                        </button>
                    </p>
                </div>
                <SystemFooter className="mt-10 lg:hidden" />
            </div>
        </div>
    );
}
