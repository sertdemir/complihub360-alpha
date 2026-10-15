import { Navigate, useLocation, useParams } from "react-router-dom";

// Alte Partner-Adressen (bis 15.10.2026) → Provider-Adressen. Links in
// verschickten Mails, Lesezeichen und der Stripe-/Nylas-Rueckweg alter
// Sitzungen landen so weiter richtig; Unterpfad, Query (?calendar=, ?token=)
// und Anker reisen mit.
export function LegacyPartnerRedirect({ from, to }: { from: string; to: string }) {
    const { locale } = useParams();
    const { pathname, search, hash } = useLocation();
    const rest = pathname.split(`/${from}`)[1] ?? '';
    return <Navigate to={`/${locale || 'en'}/${to}${rest}${search}${hash}`} replace />;
}
