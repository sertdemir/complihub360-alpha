import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

/** All wizard routes share one WizardProvider instance per "session" via navigation.
 *  Each category-level route renders its own individualized multi-step wizard. */
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

function AppContent() {
    const location = useLocation();
    const [bgLocation, setBgLocation] = useState(location);

    useEffect(() => {
        if (!location.pathname.startsWith("/wizard")) {
            setBgLocation(location);
        }
    }, [location]);

    const isWizardRoute = location.pathname.startsWith("/wizard");

    return (
        <>
            <GlobalNav />
            {/* Render the background location for main routes if a wizard is open */}
            <Routes location={isWizardRoute ? bgLocation : location}>
                {/* Public pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/countries" element={<CountriesPage />} />
                <Route path="/platform" element={<PlatformPage />} />
                <Route path="/solutions" element={<SolutionsPage />} />
                <Route path="/compliance" element={<ComplianceAreasPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/advisory" element={<AdvisoryPage />} />
                <Route path="/results" element={<ResultsOverview />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
            </Routes>

            {/* Wizard Overlay */}
            <AnimatePresence>
                {isWizardRoute && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] bg-white/5 backdrop-blur-[32px] overflow-y-auto w-full h-full"
                    >
                        <div className="absolute top-6 right-6 z-50">
                            <Link 
                                to={bgLocation.pathname} 
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md transition-all shadow-xl hover:scale-105"
                                aria-label="Close Wizard"
                            >
                                <X size={24} />
                            </Link>
                        </div>
                        <div className="min-h-full py-12 px-4 flex flex-col items-center justify-center">
                            <Routes location={location}>
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
