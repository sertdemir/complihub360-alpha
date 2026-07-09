import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams, Navigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supportedLngs } from "./i18n/config";
import { SiteHeader } from "./components/layout/SiteHeader";
import { WizardProvider } from "./components/wizard/WizardContext";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { CountriesPage } from "./pages/CountriesPage";
import { PlatformPage } from "./pages/PlatformPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ComplianceAreasPage } from "./pages/ComplianceAreasPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { ResultsRiskMap } from "./pages/ResultsRiskMap";
import { ResourcesPage } from "./pages/ResourcesPage";
import AdvisoryPage from "./pages/AdvisoryPage";
import { AiGovernancePage } from "./pages/AiGovernancePage";
import { PrivacyPage, ImprintPage } from "./pages/legal/LegalPages";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminComingSoonPage } from "./pages/admin/AdminComingSoonPage";
import { DashboardHome } from "./pages/dashboard/DashboardHome";
import { UserDossiers } from "./pages/dashboard/UserDossiers";
import { DossierDetail } from "./pages/dashboard/DossierDetail";
import { KnowledgeCenter } from "./pages/dashboard/KnowledgeCenter";
import { UserWorkspace } from "./pages/dashboard/UserWorkspace";
import { UserMessages } from "./pages/dashboard/UserMessages";
import { PartnerDashboardHome } from "./pages/partner-dashboard/PartnerDashboardHome";
import { LeadInbox } from "./pages/partner-dashboard/LeadInbox";
import { LeadDetail } from "./pages/partner-dashboard/LeadDetail";
import { PartnerProfile } from "./pages/partner-dashboard/PartnerProfile";
import { RequestsPage } from "./pages/provider/RequestsPage";
import { PerformancePage } from "./pages/provider/PerformancePage";
import { CoveragePage } from "./pages/provider/CoveragePage";
import { BillingPage } from "./pages/provider/BillingPage";
import { SettingsPage } from "./pages/provider/SettingsPage";
import { NotificationsPage } from "./pages/provider/NotificationsPage";
import { UserHomePage } from "./pages/user/UserHomePage";
import { SessionsPage } from "./pages/user/SessionsPage";
import { UserRequestsPage } from "./pages/user/UserRequestsPage";
import { WorkbenchPage } from "./pages/user/WorkbenchPage";
import { UserNotificationsPage } from "./pages/user/UserNotificationsPage";
import { SavedProvidersPage } from "./pages/user/SavedProvidersPage";
import { ExportsPage } from "./pages/user/ExportsPage";
import { ComingSoonPage } from "./pages/user/ComingSoonPage";
import { LibraryPage } from "./pages/user/LibraryPage";
import { ActiveClients } from "./pages/partner-dashboard/ActiveClients";
// Wizard Shell Steps
import { WizardPreGateFlow } from "./pages/wizard/WizardPreGateFlow";
import { GenericWizardFlow } from "./pages/wizard/GenericWizardFlow";
// Individualized Category Wizards
import { TaxVatWizard } from "./pages/wizard/flows/TaxVatWizard";
import { DataPrivacyWizard } from "./pages/wizard/flows/DataPrivacyWizard";
import { EprWizard } from "./pages/wizard/flows/EprWizard";
import { MarketingSeoWizard } from "./pages/wizard/flows/MarketingSeoWizard";
import { CorporateWizard } from "./pages/wizard/flows/CorporateWizard";
import { FullSupportWizard } from "./pages/wizard/flows/FullSupportWizard";
// Auth
import { LoginPage } from "./pages/auth/LoginPage";
import { ProviderOnboardingPage } from "./pages/onboarding/ProviderOnboardingPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { AuthGuard } from "./components/auth/AuthGuard";

// ⚠️ Old route-based wizard is DISABLED. The assessment now runs inline in the
// landing page (EntryDoor → AnimatedWizard: Markets → Operations → Domains →
// Review → /results). Any legacy /wizard URL redirects to the locale home so the
// old pre-gate / category flows never render.
function WizardRoutes() {
    const { i18n } = useTranslation();
    return <Navigate to={`/${i18n.resolvedLanguage || 'en'}`} replace />;
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
    const navigate = useNavigate();

    const isWizardRoute = /^\/[a-z]{2}\/wizard/.test(location.pathname) || location.pathname.startsWith("/wizard");

    // The wizard renders as an overlay over a "background" page. If the app is
    // opened directly on a wizard URL there is no background yet — fall back to
    // the locale home so the overlay (and its close/backdrop) behave correctly.
    const [bgLocation, setBgLocation] = useState(() => {
        const wiz = /^\/[a-z]{2}\/wizard/.test(location.pathname) || location.pathname.startsWith("/wizard");
        if (wiz) {
            const loc = location.pathname.match(/^\/([a-z]{2})(?=\/|$)/)?.[1] || "en";
            return { ...location, pathname: `/${loc}`, search: "", hash: "" };
        }
        return location;
    });

    useEffect(() => {
        if (!isWizardRoute) {
            setBgLocation(location);
        }
    }, [location, isWizardRoute]);

    return (
        <>
            <SiteHeader />
            {/* Render the background location for main routes if a wizard is open */}
            <Routes location={isWizardRoute ? bgLocation : location}>
                <Route path="/:locale" element={<LocaleLayout />}>
                    {/* Public pages */}
                    {/* Index = new User/Entrepreneur landing (HomePage). Old marketing landing kept at /home-old. */}
                    <Route index element={<HomePage />} />
                    <Route path="home-old" element={<LandingPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="countries" element={<CountriesPage />} />
                    <Route path="platform" element={<PlatformPage />} />
                    <Route path="solutions" element={<SolutionsPage />} />
                    <Route path="compliance" element={<ComplianceAreasPage />} />
                    <Route path="providers" element={<ProvidersPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="advisory" element={<AdvisoryPage />} />
                    <Route path="ai-governance" element={<AiGovernancePage />} />
                    <Route path="results" element={<ResultsRiskMap />} />
                    {/* Legal (launch requirement: Art. 13 GDPR + Impressumspflicht) */}
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="imprint" element={<ImprintPage />} />
                    {/* User Dashboard Routes (Auth Guarded) */}
                    <Route element={<AuthGuard requiredRole="user" />}>
                        <Route path="dashboard" element={<UserHomePage />} />
                        <Route path="dashboard/sessions" element={<SessionsPage />} />
                        <Route path="dashboard/requests" element={<UserRequestsPage />} />
                        <Route path="dashboard/workbench/:domain" element={<WorkbenchPage />} />
                        <Route path="dashboard/notifications" element={<UserNotificationsPage />} />
                        <Route path="dashboard/saved-providers" element={<SavedProvidersPage />} />
                        <Route path="dashboard/exports" element={<ExportsPage />} />
                        <Route path="dashboard/alerts" element={<ComingSoonPage page="alerts" />} />
                        <Route path="dashboard/calendar" element={<ComingSoonPage page="calendar" />} />
                        <Route path="dashboard/library" element={<LibraryPage />} />
                        <Route path="dashboard/sessions/:id" element={<DossierDetail />} />
                        <Route path="dashboard/knowledge" element={<KnowledgeCenter />} />
                        <Route path="dashboard/workspace" element={<UserWorkspace />} />
                        <Route path="dashboard/messages" element={<UserMessages />} />
                        <Route path="dashboard/*" element={<DashboardHome />} />
                    </Route>
                    
                    {/* Partner Dashboard Routes (Auth Guarded) */}
                    <Route element={<AuthGuard requiredRole="partner" />}>
                        {/* Post-login landing = the new provider workspace. The legacy
                            Partner Hub stays reachable at /partner-dashboard/home-old. */}
                        <Route path="partner-dashboard" element={<Navigate to="requests" replace />} />
                        <Route path="partner-dashboard/home-old" element={<PartnerDashboardHome />} />
                        <Route path="partner-dashboard/requests" element={<RequestsPage />} />
                        <Route path="partner-dashboard/performance" element={<PerformancePage />} />
                        <Route path="partner-dashboard/coverage" element={<CoveragePage />} />
                        <Route path="partner-dashboard/billing" element={<BillingPage />} />
                        <Route path="partner-dashboard/settings" element={<SettingsPage />} />
                        <Route path="partner-dashboard/notifications" element={<NotificationsPage />} />
                        <Route path="partner-dashboard/leads" element={<LeadInbox />} />
                        <Route path="partner-dashboard/leads/:id" element={<LeadDetail />} />
                        <Route path="partner-dashboard/clients" element={<ActiveClients />} />
                        <Route path="partner-dashboard/profile" element={<PartnerProfile />} />
                        <Route path="partner-dashboard/*" element={<PartnerDashboardHome />} />
                    </Route>

                    {/* Admin Control Center (Auth Guarded · dev entry: /login?as=admin) */}
                    <Route element={<AuthGuard requiredRole="admin" />}>
                        <Route path="admin" element={<AdminOverviewPage />} />
                        <Route path="admin/events" element={<AdminEventsPage />} />
                        <Route path="admin/providers" element={<AdminComingSoonPage />} />
                        <Route path="admin/security" element={<AdminComingSoonPage />} />
                        <Route path="admin/privacy" element={<AdminComingSoonPage />} />
                        <Route path="admin/alerts" element={<AdminComingSoonPage />} />
                        <Route path="admin/status" element={<AdminComingSoonPage />} />
                    </Route>

                    {/* Auth */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="partner-onboarding" element={<ProviderOnboardingPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="verify-email" element={<EmailVerificationPage />} />
                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                    <Route path="reset-password" element={<ResetPasswordPage />} />
                </Route>
                <Route path="/" element={<RootRedirect />} />
                <Route path="*" element={<RootRedirect />} />
            </Routes>

            {/* Wizard Overlay */}
            <AnimatePresence>
                {isWizardRoute && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] bg-white/40 backdrop-blur-xl overflow-y-auto w-full h-full"
                        style={{
                            cursor: isWizardRoute ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="white" stroke="%23E5E5E5" stroke-width="1"/><path d="M14 14L26 26" stroke="%23171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 26L26 14" stroke="%23171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 20 20, pointer` : 'auto',
                            pointerEvents: isWizardRoute ? 'auto' : 'none',
                        }}
                        onClick={(e) => {
                            if (!(e.target as HTMLElement).closest('.wizard-card')) {
                                const targetPath = (/^\/[a-z]{2}\/wizard/.test(bgLocation.pathname) || bgLocation.pathname.startsWith('/wizard')) && bgLocation.pathname !== location.pathname
                                    ? `/${bgLocation.pathname.split('/')[1]}` 
                                    : bgLocation.pathname;
                                navigate(targetPath || '/');
                            }
                        }}
                    >
                        <div className="min-h-full py-12 px-4 flex flex-col items-center justify-center">
                            <Routes location={location}>
                                <Route path="/:locale" element={<LocaleLayout />}>
                                    <Route path="wizard/*" element={<WizardRoutes />} />
                                </Route>
                                {/* For backward compatibility if someone opens /wizard directly */}
                                <Route path="/wizard/*" element={<WizardRoutes />} />
                            </Routes>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
