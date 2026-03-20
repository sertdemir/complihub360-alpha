import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
    return (
        <Router>
            <Routes>
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
                {/* Wizard — all flows nested under /wizard/* with shared WizardProvider */}
                <Route path="/wizard/*" element={<WizardRoutes />} />
            </Routes>
        </Router>
    );
}

export default App;
