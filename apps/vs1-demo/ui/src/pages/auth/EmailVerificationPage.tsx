import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { SystemFooter } from "../../components/auth/SystemFooter";

// ─── Auth · E-Mail bestätigen (Register R5 · Variante B) ─────────────────────
// Im hellen Kleid seit 2026-08-28, im selben Zug wie Login und Registrierung:
// die Karte auf dem vollflaechigen Gradient — eine MELDUNG, keine Eingabe,
// also dieselbe Form wie die Partner-Weiche der Registrierung. Vorher trug die
// Seite den alten Stil samt Material-Icon-Ligaturen ("verified_user",
// "arrow_forward" als roher Text) und einem eigenen Kopfbalken; Logo und
// Fussleiste sind jetzt die geteilten der Auth-Flaeche.
export function EmailVerificationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation("auth");
    // Jede Route lebt unter /:locale — ein nacktes "/login" fiele in den
    // Locale-Catch-all und wuerfe den Nutzer auf die Startseite.
    const { locale = "en" } = useParams();
    const email = (location.state as { email?: string })?.email || "ihre@email.de";

    const [cooldown, setCooldown] = useState(0);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        if (cooldown > 0) {
            const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
            return () => clearTimeout(id);
        }
    }, [cooldown]);

    const handleResend = () => {
        setCooldown(30);
        setResent(true);
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-stage px-6 py-8 lg:px-16 lg:py-10">
            <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />

            <div className="flex flex-1 items-center justify-center py-10">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full max-w-[470px] rounded-xl bg-surface p-9 text-center shadow-[0_34px_80px_-30px_rgba(2,22,17,0.35)] dark:bg-surface-secondary"
                >
                    <Mail size={30} strokeWidth={1.6} className="mx-auto text-brand" aria-hidden />
                    <h1 className="mt-4 font-serif text-[1.5rem] font-bold leading-tight text-fg">
                        {t("verify.title")}
                    </h1>
                    <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">
                        <Trans
                            t={t}
                            i18nKey="verify.body"
                            values={{ email }}
                            components={{ em: <span className="font-semibold text-fg" /> }}
                        />
                    </p>

                    <div className="mt-5 rounded-lg border border-stroke-subtle bg-surface-secondary px-4 py-3 text-left text-body-2xs leading-relaxed text-fg-tertiary">
                        <p><Trans t={t} i18nKey="verify.spamHint" components={{ b: <span className="font-semibold text-fg" /> }} /></p>
                        <p className="mt-1"><Trans t={t} i18nKey="verify.validHint" components={{ b: <span className="font-semibold text-fg" /> }} /></p>
                    </div>

                    {cooldown > 0 ? (
                        <p className="mt-5 text-body-xs tabular-nums text-fg-tertiary">
                            {t("verify.resendIn", { seconds: cooldown })}
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            className="mt-5 text-body-sm font-semibold text-brand transition-colors hover:text-brand-700"
                        >
                            {resent ? t("verify.resentRetry") : t("verify.resend")}
                        </button>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-5 border-t border-stroke-subtle pt-5 text-body-xs">
                        <button
                            type="button"
                            onClick={() => navigate(`/${locale}/register`)}
                            className="font-semibold text-fg-tertiary transition-colors hover:text-fg"
                        >
                            {t("verify.changeEmail")}
                        </button>
                        <span className="text-stroke">·</span>
                        <button
                            type="button"
                            onClick={() => navigate(`/${locale}/login`)}
                            className="font-semibold text-brand transition-colors hover:text-brand-700"
                        >
                            {t("verify.signIn")}
                        </button>
                    </div>
                </motion.div>
            </div>

            <SystemFooter />
        </div>
    );
}
