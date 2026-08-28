import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportedLngs } from "../../i18n/config";

// ─── Die Auth-Fussleiste (Login L5 · Variante B) ─────────────────────────────
// Extrahiert aus der LoginPage am 2026-08-28, als die Register-Seite dieselbe
// Leiste brauchte — die Regel der geteilten FaqList: eine Komponente, kein
// Nachbau. Dreigeteilt: Betriebsstatus links, Sprachen mittig, Rechtslinks
// rechts.
//
// Die Sprachen kommen aus supportedLngs und fuehren als echte Links auf
// denselben Pfad in der anderen Sprache, wie im SiteFooter — die Leiste hatte
// vorher den festen, toten Text "EN / DE".
export function SystemFooter({ className = "" }: { className?: string }) {
    const { t, i18n } = useTranslation("auth");
    const { locale = "en" } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const current = i18n.resolvedLanguage || locale;

    const languagePath = (lng: string) => {
        const parts = location.pathname.split("/").filter(Boolean);
        const rest = supportedLngs.includes(parts[0]) ? parts.slice(1) : parts;
        const tail = rest.join("/");
        return `/${lng}${tail ? `/${tail}` : ""}${location.search}${location.hash}`;
    };

    return (
        <div className={"flex flex-col gap-4 border-t border-stroke-subtle pt-5 text-body-2xs text-fg-tertiary sm:flex-row sm:items-center sm:justify-between " + className}>
            <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" /> {t("login.footer.operational")}
            </span>
            <span className="flex items-center gap-2 font-semibold">
                {supportedLngs.map((lng, i) => (
                    <span key={lng} className="flex items-center gap-2">
                        {i > 0 && <span className="text-stroke">·</span>}
                        <a
                            href={languagePath(lng)}
                            hrefLang={lng}
                            aria-current={lng === current ? "true" : undefined}
                            onClick={(e) => {
                                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                                e.preventDefault();
                                navigate(languagePath(lng));
                            }}
                            className={lng === current ? "text-fg" : "transition-colors hover:text-fg"}
                        >
                            {lng.toUpperCase()}
                        </a>
                    </span>
                ))}
            </span>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <a href={`/${locale}/privacy`} className="transition-colors hover:text-fg">{t("login.footer.privacy")}</a>
                <a href={`/${locale}/terms`} className="transition-colors hover:text-fg">{t("login.footer.terms")}</a>
                <a href={`/${locale}/imprint`} className="transition-colors hover:text-fg">{t("login.footer.imprint")}</a>
            </span>
        </div>
    );
}
