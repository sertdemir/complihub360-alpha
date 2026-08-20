import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { Typography } from "../../components/ui/Typography";
import { Button } from "../../components/ui/Button";

export function EmailVerificationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation("auth");
    // Every route lives under /:locale — a bare "/login" falls through to the
    // locale catch-all and dumps the user on the homepage instead.
    const { locale = "en" } = useParams();
    const email = (location.state as { email?: string })?.email || "ihre@email.de";

    const [cooldown, setCooldown] = useState(0);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        if (cooldown > 0) {
            const t = setTimeout(() => setCooldown(c => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [cooldown]);

    const handleResend = () => {
        setCooldown(30);
        setResent(true);
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
                    <Link to={`/${locale}/login`} className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
                        {t("verify.signIn")} <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-6 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 p-8 text-center">
                        {/* Animated Envelope */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                            className="mx-auto w-20 h-20 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-6"
                        >
                            <motion.span
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="material-symbols-outlined text-primary-600 text-4xl"
                            >
                                mail
                            </motion.span>
                        </motion.div>

                        <Typography variant="h2" weight="bold" className="text-neutral-900 mb-2">
                            {t("verify.title")}
                        </Typography>
                        <Typography variant="body" className="text-neutral-500 mb-6 leading-relaxed">
                            <Trans
                                t={t}
                                i18nKey="verify.body"
                                values={{ email }}
                                components={{ em: <span className="font-semibold text-neutral-900" /> }}
                            />
                        </Typography>

                        {/* Info box */}
                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 text-left">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-neutral-400 text-xl mt-0.5">info</span>
                                <div className="text-xs text-neutral-500 leading-relaxed space-y-1">
                                    <p><Trans t={t} i18nKey="verify.spamHint" components={{ b: <span className="font-semibold text-neutral-700" /> }} /></p>
                                    <p><Trans t={t} i18nKey="verify.validHint" components={{ b: <span className="font-semibold text-neutral-700" /> }} /></p>
                                </div>
                            </div>
                        </div>

                        {/* Resend */}
                        <Button
                            variant="secondary"
                            size="md"
                            fullWidth
                            onClick={handleResend}
                            disabled={cooldown > 0}
                            className="rounded-xl mb-3"
                        >
                            {cooldown > 0 ? (
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">schedule</span>
                                    {t("verify.resendIn", { seconds: cooldown })}
                                </span>
                            ) : resent ? (
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base text-primary-500">check</span>
                                    {t("verify.resentRetry")}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">send</span>
                                    {t("verify.resend")}
                                </span>
                            )}
                        </Button>

                        {/* Change email */}
                        <Link
                            to={`/${locale}/register`}
                            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            {t("verify.changeEmail")}
                        </Link>
                    </div>

                    {/* Success indicator */}
                    {resent && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 bg-success-bg border border-success-200 rounded-xl p-3 text-center"
                        >
                            <span className="text-xs text-success-500 font-medium flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {t("verify.resentToast")}
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
