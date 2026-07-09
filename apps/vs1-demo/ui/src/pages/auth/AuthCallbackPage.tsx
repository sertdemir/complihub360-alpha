import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Session } from "@supabase/supabase-js";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

// Landing target for magic-link and OAuth redirects. The Supabase client is
// configured with detectSessionInUrl, so it consumes the token from the URL and
// emits a session; we wait for it, then route by role.
export function AuthCallbackPage() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.resolvedLanguage || "en";
    const [error, setError] = useState<string | null>(null);

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
            if (!done) setError("This sign-in link could not be verified or has expired. Request a new one.");
        }, 6000);
        return () => {
            sub.subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [lang, navigate]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1620] px-6 text-center text-white">
            {error ? (
                <>
                    <AlertTriangle className="text-rose-400" size={28} />
                    <p className="max-w-sm text-[15px] text-white/70">{error}</p>
                    <button
                        type="button"
                        onClick={() => navigate(`/${lang}/login`, { replace: true })}
                        className="mt-2 rounded-xl bg-[#0e6450] px-5 py-3 text-[14px] font-semibold text-white"
                    >
                        Back to sign-in
                    </button>
                </>
            ) : (
                <>
                    <Loader2 className="animate-spin text-accent-400" size={28} />
                    <p className="text-[15px] text-white/70">Signing you in…</p>
                </>
            )}
        </div>
    );
}
