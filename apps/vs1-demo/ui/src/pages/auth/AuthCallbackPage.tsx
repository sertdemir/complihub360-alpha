import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// Landing target for magic-link and OAuth redirects. The Supabase client is
// configured with detectSessionInUrl, so it consumes the token from the URL and
// emits a session; we wait for it, then route by role. Failure routes to the
// DESIGNED error view on the login page (?error=expired) — no bare fallback.
export function AuthCallbackPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation("auth");
    const lang = i18n.resolvedLanguage || "en";

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            navigate(`/${lang}/login`, { replace: true });
            return;
        }
        let done = false;
        const client = supabase;
        const go = (session: Session | null) => {
            if (done || !session) return;
            done = true;
            const claimed =
                (session.user?.app_metadata?.role as string | undefined) ??
                (session.user?.user_metadata?.role as string | undefined);
            const target = claimed === "partner" ? "partner-dashboard" : "dashboard";
            navigate(`/${lang}/${target}`, { replace: true });
        };
        client.auth.getSession().then(({ data }) => go(data.session));
        const { data: sub } = client.auth.onAuthStateChange((_e, session) => go(session));
        const timer = setTimeout(() => {
            if (!done) navigate(`/${lang}/login?error=expired`, { replace: true });
        }, 6000);
        return () => {
            sub.subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [lang, navigate]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1620] px-6 text-center text-white">
            <Loader2 className="animate-spin text-accent-400" size={28} />
            <p className="text-[15px] text-white/70">{t("callback.signingIn")}</p>
        </div>
    );
}
