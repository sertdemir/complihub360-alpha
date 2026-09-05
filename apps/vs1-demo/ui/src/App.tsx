import { lazy, useEffect } from "react";
import { trackScrollDepth } from "./lib/analytics";
import { useSeo } from "./hooks/useSeo";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams, Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportedLngs } from "./i18n/config";
import { SiteHeader } from "./components/layout/SiteHeader";
import { HomePage } from "./pages/HomePage";
import { PlatformPage } from "./pages/PlatformPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ComplianceAreasPage } from "./pages/ComplianceAreasPage";
import { ComplianceAreaPage } from "./pages/ComplianceAreaPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { PricingPage } from "./pages/PricingPage";
import { MarketsIndexPage, MarketPage } from "./pages/MarketsPage";
import { ResultsRiskMap } from "./pages/ResultsRiskMap";
import { SearchResultPage } from "./pages/SearchResultPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AiGovernancePage } from "./pages/AiGovernancePage";
import { PrivacyPage, ImprintPage, TermsPage, CookiePage } from "./pages/legal/LegalPages";

// Rollen-Bereiche werden nachgeladen, nicht mitgeliefert. Bis 20.08. steckte
// der komplette Admin-, Provider-, User-, Auth- und Onboarding-Code im selben
// Chunk wie die Marketing-Seiten: wer /de/imprint aufrief, lud die
// Partner-Abrechnung und das Admin-Cockpit mit. recharts haengt ueber
// MetricCard nur an zwei Admin-Seiten und verschwindet damit ebenfalls aus
// dem Einstiegs-Chunk. Die Suspense-Grenze steht in main.tsx.
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage").then((m) => ({ default: m.AdminOverviewPage })));
const CockpitPage = lazy(() => import("./pages/admin/CockpitPage").then((m) => ({ default: m.CockpitPage })));
const AdminEventsPage = lazy(() => import("./pages/admin/AdminEventsPage").then((m) => ({ default: m.AdminEventsPage })));
const AdminComingSoonPage = lazy(() => import("./pages/admin/AdminComingSoonPage").then((m) => ({ default: m.AdminComingSoonPage })));
const ProviderMagicActionPage = lazy(() => import("./pages/provider/ProviderMagicActionPage").then((m) => ({ default: m.ProviderMagicActionPage })));
const ConfirmEmailPage = lazy(() => import("./pages/provider/ConfirmEmailPage").then((m) => ({ default: m.ConfirmEmailPage })));
const RequestsPage = lazy(() => import("./pages/provider/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const LeadsPage = lazy(() => import("./pages/provider/LeadsPage").then((m) => ({ default: m.LeadsPage })));
const PerformancePage = lazy(() => import("./pages/provider/PerformancePage").then((m) => ({ default: m.PerformancePage })));
const CoveragePage = lazy(() => import("./pages/provider/CoveragePage").then((m) => ({ default: m.CoveragePage })));
const BillingPage = lazy(() => import("./pages/provider/BillingPage").then((m) => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import("./pages/provider/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("./pages/provider/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const UserHomePage = lazy(() => import("./pages/user/UserHomePage").then((m) => ({ default: m.UserHomePage })));
const SessionsPage = lazy(() => import("./pages/user/SessionsPage").then((m) => ({ default: m.SessionsPage })));
const TerminePage = lazy(() => import("./pages/user/TerminePage").then((m) => ({ default: m.TerminePage })));
import { ProviderDetailPage } from "./pages/ProviderDetailPage";
import { ProviderSchedulePage } from "./pages/ProviderSchedulePage";
const WorkbenchPage = lazy(() => import("./pages/user/WorkbenchPage").then((m) => ({ default: m.WorkbenchPage })));
const UserNotificationsPage = lazy(() => import("./pages/user/UserNotificationsPage").then((m) => ({ default: m.UserNotificationsPage })));
const SavedProvidersPage = lazy(() => import("./pages/user/SavedProvidersPage").then((m) => ({ default: m.SavedProvidersPage })));
const ExportsPage = lazy(() => import("./pages/user/ExportsPage").then((m) => ({ default: m.ExportsPage })));
const ComingSoonPage = lazy(() => import("./pages/user/ComingSoonPage").then((m) => ({ default: m.ComingSoonPage })));
const LibraryPage = lazy(() => import("./pages/user/LibraryPage").then((m) => ({ default: m.LibraryPage })));
// Wizard Shell Steps
// Individualized Category Wizards
// Auth
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ProviderIntakePage = lazy(() => import("./pages/onboarding/ProviderIntakePage").then((m) => ({ default: m.ProviderIntakePage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const PartnerApplyPage = lazy(() => import("./pages/PartnerApplyPage").then((m) => ({ default: m.PartnerApplyPage })));
const EmailVerificationPage = lazy(() => import("./pages/auth/EmailVerificationPage").then((m) => ({ default: m.EmailVerificationPage })));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
import { AuthGuard } from "./components/auth/AuthGuard";
import { AnimatedWizard } from "./components/home/AnimatedWizard";
import { WizardDrawerProvider } from "./components/user/WizardDrawer";

// Full-view assessment (/:locale/wizard, Figma 1705:262 light + · Dark): the
// hero CTA opens the SAME 4-step wizard as the Entry-Door section, but as a
// dedicated full page (own topbar, no marketing header). The old pre-gate /
// category flows stay retired.
function WizardRoutes() {
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const locale = i18n.resolvedLanguage || 'en';
    // C6 "Refine existing": ?refine=1 pre-fills from the last saved profile and
    // opens on the Review step (edit from there). Fresh run otherwise.
    const params = new URLSearchParams(location.search);
    const refine = params.get('refine') === '1';
    const initialProfile = (() => {
        if (!refine) return undefined;
        try { return JSON.parse(localStorage.getItem('ch360_last_profile') || 'null') ?? undefined; }
        catch { return undefined; }
    })();
    // ?market=DE — a market page's CTA already knows its market, so the wizard
    // must not reopen with the country question that page just answered. The
    // code is validated inside AnimatedWizard; unknown values start normally.
    const market = params.get('market');
    return (
        <AnimatedWizard
            spacious
            interactive
            initialProfile={initialProfile}
            initialMarkets={market ? market.split(',') : undefined}
            onComplete={(profile) => navigate(`/${locale}/results`, { state: { searchProfile: profile } })}
            className="min-h-screen !rounded-none !border-0"
        />
    );
}

// v2 cleanup: legacy v0 dashboard screens were removed — any unknown
// dashboard/* URL now redirects into the current shell instead of falling
// back to the old light-mode fixtures.
function LocaleRedirect({ to }: { to: string }) {
    const { locale } = useParams();
    const base = `/${locale || 'en'}`;
    return <Navigate to={to ? `${base}/${to}` : base} replace />;
}

// Anfragen → Termine-Reiter (Canvas-Wahl 1C, 2026-09-01). Bestehende
// Parameter (?thread=… aus Glocke und Suche) reisen mit.
function RequestsRedirect() {
    const { locale } = useParams();
    const params = new URLSearchParams(useLocation().search);
    params.set('tab', 'anfragen');
    return <Navigate to={`/${locale || 'en'}/dashboard/termine?${params.toString()}`} replace />;
}

function RootRedirect() {
    const { i18n } = useTranslation();
    return <Navigate to={`/${i18n.resolvedLanguage || 'en'}`} replace />;
}

function LocaleLayout() {
    const { locale } = useParams();
    const { i18n } = useTranslation();

    useEffect(() => {
        if (!locale || !supportedLngs.includes(locale)) return;
        if (i18n.resolvedLanguage !== locale) {
            i18n.changeLanguage(locale);
        }
        // index.html ships lang="en". Without this every locale claimed to be
        // English: screen readers spoke German legal copy with English phonetics
        // (WCAG 3.1.1), and MarketsDrawer reads this attribute to build the
        // magic-link return URL — so every signup returned to /en/results.
        document.documentElement.lang = locale;
    }, [locale, i18n]);

    if (!locale || !supportedLngs.includes(locale)) {
        return <Navigate to={`/${i18n.resolvedLanguage || 'en'}`} replace />;
    }

    return <Outlet />;
}

function SkipToContent() {
    const { t } = useTranslation('common');
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-[15px] focus:font-semibold focus:text-fg-on-brand focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-stroke-focus"
        >
            {t('a11y.skipToContent', { defaultValue: 'Skip to content' })}
        </a>
    );
}

function AppContent() {
    const location = useLocation();

    // Titel, Description, Canonical, hreflang und Open Graph — zentral statt je
    // Seite, damit eine neue Route ihren Kopf aus lib/publicRoutes.ts bekommt.
    useSeo();

    // Scroll depth per page view. Re-armed on every navigation so the milestones
    // are per page, not per session; a no-op unless Plausible is configured.
    useEffect(() => trackScrollDepth(location.pathname), [location.pathname]);

    return (
        <>
            {/* Bypass Blocks (WCAG 2.4.1). Bis 20.08. gab es auf KEINER Seite einen
                Weg an den ~10 Kopfzeilen-Links vorbei, und fuenf Seiten hatten
                nicht einmal ein <main>, an dem eine Landmark-Navigation greifen
                koennte. Das Ziel ist deshalb ein eigener Anker direkt vor den
                Routen — der funktioniert unabhaengig davon, was die Seite selbst
                fuer eine Struktur mitbringt. tabIndex={-1} macht ihn
                fokussierbar, ohne ihn in die Tab-Reihenfolge zu haengen. */}
            <SkipToContent />
            <SiteHeader />
            <div id="main-content" tabIndex={-1} className="outline-none">
            <Routes location={location}>
                <Route path="/:locale" element={<LocaleLayout />}>
                    {/* Public pages */}
                    {/* Index = User/Entrepreneur landing (HomePage). */}
                    <Route index element={<HomePage />} />
                    <Route path="countries" element={<LocaleRedirect to="markets" />} />  {/* /countries wurde 2026-08-18 in /markets zusammengeführt; Redirect erhält die Bestands-URL */}
                    <Route path="platform" element={<PlatformPage />} />
                    <Route path="solutions" element={<SolutionsPage />} />
                    <Route path="compliance" element={<ComplianceAreasPage />} />
                    <Route path="compliance/:area" element={<ComplianceAreaPage />} />
                    <Route path="how-it-works" element={<HowItWorksPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="markets" element={<MarketsIndexPage />} />
                    <Route path="markets/:code" element={<MarketPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="ai-governance" element={<AiGovernancePage />} />
                    {/* Kontakt UND Support: beide Footer-Eintraege zeigen hierher,
                        die Seite sortiert nach Anliegen statt nach Abteilung. */}
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="results" element={<ResultsRiskMap />} />
                    {/* Station 1A: prose-search answers page (no risk map, no gating). */}
                    <Route path="search" element={<SearchResultPage />} />
                    <Route path="wizard/*" element={<WizardRoutes />} />
                    {/* Legal (launch requirement: Art. 13 GDPR + Impressumspflicht) */}
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="imprint" element={<ImprintPage />} />
                    <Route path="terms" element={<TermsPage />} />
                    <Route path="cookies" element={<CookiePage />} />
                    {/* Magic-link target from provider e-mails — public by design,
                        the single-use token IS the credential. */}
                    <Route path="provider/action" element={<ProviderMagicActionPage />} />
                    <Route path="provider/confirm-email" element={<ConfirmEmailPage />} />
                    {/* User Dashboard Routes (Auth Guarded) */}
                    {/* Wizard-Schublade fuer den ganzen Arbeitsbereich (2026-09-05):
                        die Seiten rendern die Shell selbst, deshalb sitzt der
                        Kontext hier, eine Ebene ueber ihnen. */}
                    <Route element={<WizardDrawerProvider><AuthGuard requiredRole="user" /></WizardDrawerProvider>}>
                        <Route path="dashboard" element={<UserHomePage />} />
                        <Route path="dashboard/sessions" element={<SessionsPage />} />
                        {/* Anfragen ist seit 2026-09-01 ein Reiter der Termine-Seite
                            (Canvas-Wahl 1C). Alte Links — Glocke, Lesezeichen — laufen
                            hier auf und behalten ihre Parameter (?thread=…). */}
                        <Route path="dashboard/requests" element={<RequestsRedirect />} />
                        <Route path="dashboard/termine" element={<TerminePage />} />
                        {/* Phase-3: stage-2 detail (monetised open) + native scheduling */}
                        <Route path="provider/:key" element={<ProviderDetailPage />} />
                        <Route path="provider/:key/schedule" element={<ProviderSchedulePage />} />
                        <Route path="dashboard/workbench/:domain" element={<WorkbenchPage />} />
                        <Route path="dashboard/notifications" element={<UserNotificationsPage />} />
                        <Route path="dashboard/saved-providers" element={<SavedProvidersPage />} />
                        <Route path="dashboard/exports" element={<ExportsPage />} />
                        <Route path="dashboard/alerts" element={<ComingSoonPage page="alerts" />} />
                        <Route path="dashboard/calendar" element={<ComingSoonPage page="calendar" />} />
                        <Route path="dashboard/library" element={<LibraryPage />} />
                        <Route path="dashboard/*" element={<LocaleRedirect to="dashboard" />} />
                    </Route>
                    
                    {/* Partner Dashboard Routes (Auth Guarded) */}
                    <Route element={<AuthGuard requiredRole="partner" />}>
                        {/* Post-login landing = the new provider workspace. The legacy
                            Partner Hub stays reachable at /partner-dashboard/home-old. */}
                        <Route path="partner-dashboard" element={<Navigate to="requests" replace />} />
                        <Route path="partner-dashboard/requests" element={<RequestsPage />} />
                        <Route path="partner-dashboard/termine" element={<LeadsPage />} />
                        <Route path="partner-dashboard/performance" element={<PerformancePage />} />
                        <Route path="partner-dashboard/coverage" element={<CoveragePage />} />
                        <Route path="partner-dashboard/billing" element={<BillingPage />} />
                        <Route path="partner-dashboard/settings" element={<SettingsPage />} />
                        <Route path="partner-dashboard/notifications" element={<NotificationsPage />} />
                        <Route path="partner-dashboard/*" element={<LocaleRedirect to="partner-dashboard/requests" />} />
                    </Route>

                    {/* Admin Control Center (Auth Guarded · dev entry: /login?as=admin) */}
                    <Route element={<AuthGuard requiredRole="admin" />}>
                        <Route path="admin" element={<AdminOverviewPage />} />
                        <Route path="admin/cockpit" element={<CockpitPage />} />
                        <Route path="admin/events" element={<AdminEventsPage />} />
                        <Route path="admin/providers" element={<AdminComingSoonPage />} />
                        <Route path="admin/security" element={<AdminComingSoonPage />} />
                        <Route path="admin/privacy" element={<AdminComingSoonPage />} />
                        <Route path="admin/alerts" element={<AdminComingSoonPage />} />
                        <Route path="admin/status" element={<AdminComingSoonPage />} />
                    </Route>

                    {/* Auth */}
                    <Route path="login" element={<LoginPage />} />
                    {/* v2 (D7): providers onboard via the token-gated intake link —
                        the old self-registration wizard is retired. */}
                    <Route path="provider-intake" element={<ProviderIntakePage />} />
                    <Route path="partner-onboarding" element={<ProviderIntakePage />} />
                    <Route path="register" element={<RegisterPage />} />
                    {/* Oeffentliche Partner-Bewerbung — fuehrt in die manuelle
                        Pruefung; der token-gesicherte Intake bleibt der Weg fuer
                        eingeladene Partner. */}
                    <Route path="partner-apply" element={<PartnerApplyPage />} />
                    <Route path="verify-email" element={<EmailVerificationPage />} />
                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                    <Route path="reset-password" element={<ResetPasswordPage />} />
                    {/* Anything unknown below a locale stays in that locale. Without
                        this it falls to the top-level "*", which redirects to the
                        i18n default — a German visitor on a retired URL landed on
                        the English home. */}
                    <Route path="*" element={<LocaleRedirect to="" />} />
                </Route>
                <Route path="/" element={<RootRedirect />} />
                <Route path="*" element={<RootRedirect />} />
            </Routes>
            </div>

        </>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
