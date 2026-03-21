import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams, Navigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supportedLngs } from "./i18n/config";
import { GlobalNav } from "./components/layout/GlobalNav";
import { WizardProvider } from "./components/wizard/WizardContext";
import { LandingPage } from "./pages/LandingPage";
import { ServicesPage } from "./pages/ServicesPage";
import { CountriesPage } from "./pages/CountriesPage";
import { PlatformPage } from "./pages/PlatformPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ComplianceAreasPage } from "./pages/ComplianceAreasPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import AdvisoryPage from "./pages/AdvisoryPage";
import { ResultsOverview } from "./pages/ResultsOverview";
import { Dashboard } from "./pages/Dashboard";
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
import { RegisterPage } from "./pages/auth/RegisterPage";
import { EmailVerificationPage } from "./pages/auth/EmailVerificationPage";

function WizardRoutes() {
    return (
        <WizardProvider>
            <Routes>
                {/* Pre-Gate: Country & Category Selection */}
                <Route path="/" element={<WizardPreGateFlow />} />
                <Route path="/category" element={<WizardPreGateFlow />} />
                {/* 6 individualized category-specific flows */}
                <Route path="/tax-vat" element={<TaxVatWizard />} />
                <Route path="/data-privacy" element={<DataPrivacyWizard />} />
                <Route path="/epr" element={<EprWizard />} />
                <Route path="/marketing-seo" element={<MarketingSeoWizard />} />
                <Route path="/corporate" element={<CorporateWizard />} />
                <Route path="/full-support" element={<FullSupportWizard />} />
                {/* Generic flow: Context → Markets → Risk → Complexity → Review */}
                <Route path="/context" element={<GenericWizardFlow />} />
                <Route path="/markets" element={<GenericWizardFlow />} />
                <Route path="/risk" element={<GenericWizardFlow />} />
                <Route path="/complexity" element={<GenericWizardFlow />} />
                <Route path="/review" element={<GenericWizardFlow />} />
            </Routes>
        </WizardProvider>
    );
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
    const [bgLocation, setBgLocation] = useState(location);

    const isWizardRoute = /^\/[a-z]{2}\/wizard/.test(location.pathname) || location.pathname.startsWith("/wizard");

    useEffect(() => {
        if (!isWizardRoute) {
            setBgLocation(location);
        }
    }, [location, isWizardRoute]);

    return (
        <>
            <GlobalNav />
            {/* Render the background location for main routes if a wizard is open */}
            <Routes location={isWizardRoute ? bgLocation : location}>
                <Route path="/:locale" element={<LocaleLayout />}>
                    {/* Public pages */}
                    <Route index element={<LandingPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="countries" element={<CountriesPage />} />
                    <Route path="platform" element={<PlatformPage />} />
                    <Route path="solutions" element={<SolutionsPage />} />
                    <Route path="compliance" element={<ComplianceAreasPage />} />
                    <Route path="resources" element={<ResourcesPage />} />
                    <Route path="advisory" element={<AdvisoryPage />} />
                    <Route path="results" element={<ResultsOverview />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    {/* Auth */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="verify-email" element={<EmailVerificationPage />} />
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
                        style={{ cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" fill="white" stroke="%23E5E5E5" stroke-width="1"/><path d="M14 14L26 26" stroke="%23171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 26L26 14" stroke="%23171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>') 20 20, pointer` }}
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
                                <Route path="/:locale/wizard/*" element={<WizardRoutes />} />
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
