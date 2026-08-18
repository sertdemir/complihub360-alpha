import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams, Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supportedLngs } from "./i18n/config";
import { SiteHeader } from "./components/layout/SiteHeader";
import { HomePage } from "./pages/HomePage";
import { PlatformPage } from "./pages/PlatformPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ComplianceAreasPage } from "./pages/ComplianceAreasPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { PricingPage } from "./pages/PricingPage";
import { MarketsIndexPage, MarketPage } from "./pages/MarketsPage";
import { ResultsRiskMap } from "./pages/ResultsRiskMap";
import { SearchResultPage } from "./pages/SearchResultPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { AiGovernancePage } from "./pages/AiGovernancePage";
import { PrivacyPage, ImprintPage } from "./pages/legal/LegalPages";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { CockpitPage } from "./pages/admin/CockpitPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminComingSoonPage } from "./pages/admin/AdminComingSoonPage";
import { ProviderMagicActionPage } from "./pages/provider/ProviderMagicActionPage";
import { ConfirmEmailPage } from "./pages/provider/ConfirmEmailPage";
import { RequestsPage } from "./pages/provider/RequestsPage";
import { LeadsPage } from "./pages/provider/LeadsPage";
import { PerformancePage } from "./pages/provider/PerformancePage";
import { CoveragePage } from "./pages/provider/CoveragePage";
import { BillingPage } from "./pages/provider/BillingPage";
import { SettingsPage } from "./pages/provider/SettingsPage";
import { NotificationsPage } from "./pages/provider/NotificationsPage";
import { UserHomePage } from "./pages/user/UserHomePage";
import { SessionsPage } from "./pages/user/SessionsPage";
import { UserRequestsPage } from "./pages/user/UserRequestsPage";
import { TerminePage } from "./pages/user/TerminePage";
import { ProviderDetailPage } from "./pages/ProviderDetailPage";
import { ProviderSchedulePage } from "./pages/ProviderSchedulePage";
import { WorkbenchPage } from "./pages/user/WorkbenchPage";
import { UserNotificationsPage } from "./pages/user/UserNotificationsPage";
import { SavedProvidersPage } from "./pages/user/SavedProvidersPage";
import { ExportsPage } from "./pages/user/ExportsPage";
import { ComingSoonPage } from "./pages/user/ComingSoonPage";
import { LibraryPage } from "./pages/user/LibraryPage";
// Wizard Shell Steps
// Individualized Category Wizards
// Auth
import { LoginPage } from "./pages/auth/LoginPage";
import { ProviderIntakePage } from "./pages/onboarding/ProviderIntakePage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AnimatedWizard } from "./components/home/AnimatedWizard";

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
    const refine = new URLSearchParams(location.search).get('refine') === '1';
    const initialProfile = (() => {
        if (!refine) return undefined;
        try { return JSON.parse(localStorage.getItem('ch360_last_profile') || 'null') ?? undefined; }
        catch { return undefined; }
    })();
    return (
        <AnimatedWizard
            spacious
            interactive
            initialProfile={initialProfile}
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
    return <Navigate to={`/${locale || 'en'}/${to}`} replace />;
}

function RootRedirect() {
    const { i18n } = useTranslation();
    return <Navigate to={`/${i18n.resolvedLanguage || 'en'}`} replace />;
}

function LocaleLayout() {
    const { locale } = useParams();
    const { i18n } = useTranslation();

    useEffect(() => {
        if (locale && supportedLngs.includes(locale) && i18n.resolvedLanguage !== locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale, i18n]);

    if (!locale || !supportedLngs.includes(locale)) {
        return <Navigate to={`/${i18n.resolvedLanguage || 'en'}`} replace />;
    }

    return <Outlet />;
}

function AppContent() {
    const location = useLocation();

    return (
        <>
            <SiteHeader />
            <Routes location={location}>
                <Route path="/:locale" element={<LocaleLayout />}>
                    {/* Public pages */}
                    {/* Index = User/Entrepreneur landing (HomePage). */}
                    <Route index element={<HomePage />} />
                    <Route path="countries" element={<LocaleRedirect to="markets" />} />  {/* /countries wurde 2026-08-18 in /markets zusammengeführt; Redirect erhält die Bestands-URL */}
                    <Route path="platform" element={<PlatformPage />} />
                    <Route path="solutions" element={<SolutionsPage />} />
                    <Route path="compliance" element={<ComplianceAreasPage />} />
                    <Route path="how-it-works" element={<HowItWorksPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="markets" element={<MarketsIndexPage />} />
                    <Route path="markets/:code" element={<MarketPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="ai-governance" element={<AiGovernancePage />} />
                    <Route path="results" element={<ResultsRiskMap />} />
                    {/* Station 1A: prose-search answers page (no risk map, no gating). */}
                    <Route path="search" element={<SearchResultPage />} />
                    <Route path="wizard/*" element={<WizardRoutes />} />
                    {/* Legal (launch requirement: Art. 13 GDPR + Impressumspflicht) */}
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="imprint" element={<ImprintPage />} />
                    {/* Magic-link target from provider e-mails — public by design,
                        the single-use token IS the credential. */}
                    <Route path="provider/action" element={<ProviderMagicActionPage />} />
                    <Route path="provider/confirm-email" element={<ConfirmEmailPage />} />
                    {/* User Dashboard Routes (Auth Guarded) */}
                    <Route element={<AuthGuard requiredRole="user" />}>
                        <Route path="dashboard" element={<UserHomePage />} />
                        <Route path="dashboard/sessions" element={<SessionsPage />} />
                        <Route path="dashboard/requests" element={<UserRequestsPage />} />
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
                    <Route path="verify-email" element={<EmailVerificationPage />} />
                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                    <Route path="reset-password" element={<ResetPasswordPage />} />
                </Route>
                <Route path="/" element={<RootRedirect />} />
                <Route path="*" element={<RootRedirect />} />
            </Routes>

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
