import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WizardProvider } from "./components/wizard/WizardContext";
import { LandingPage } from "./pages/LandingPage";
import { ServicesPage } from "./pages/ServicesPage";
import { CountriesPage } from "./pages/CountriesPage";
import AdvisoryPage from "./pages/AdvisoryPage";
import { ResultsOverview } from "./pages/ResultsOverview";
import { Dashboard } from "./pages/Dashboard";
// Wizard Shell Steps
import { WizardStep0 } from "./pages/WizardStep1";
import { WizardCategoryStep } from "./pages/wizard/WizardCategoryStep";
import { WizardReviewStep } from "./pages/wizard/WizardReviewStep";
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

/** All wizard routes share one WizardProvider instance per "session" via navigation.
 *  Each category-level route renders its own individualized multi-step wizard. */
function WizardRoutes() {
    return (
        <WizardProvider>
            <Routes>
                {/* Step 0: Country Gate → redirects to category flow */}
                <Route path="/" element={<WizardStep0 />} />
                {/* Generic category picker (when entering without category) */}
                <Route path="/category" element={<WizardCategoryStep />} />
                {/* 6 individualized category-specific flows */}
                <Route path="/tax-vat" element={<TaxVatWizard />} />
                <Route path="/data-privacy" element={<DataPrivacyWizard />} />
                <Route path="/epr" element={<EprWizard />} />
                <Route path="/marketing-seo" element={<MarketingSeoWizard />} />
                <Route path="/corporate" element={<CorporateWizard />} />
                <Route path="/full-support" element={<FullSupportWizard />} />
                {/* Legacy/shared review step */}
                <Route path="/review" element={<WizardReviewStep />} />
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
                <Route path="/advisory" element={<AdvisoryPage />} />
                <Route path="/results" element={<ResultsOverview />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* Wizard — all flows nested under /wizard/* with shared WizardProvider */}
                <Route path="/wizard/*" element={<WizardRoutes />} />
            </Routes>
        </Router>
    );
}

export default App;
