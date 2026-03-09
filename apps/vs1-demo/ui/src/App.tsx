import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WizardProvider } from "./components/wizard/WizardContext";
import { LandingPage } from "./pages/LandingPage";
import { ServicesPage } from "./pages/ServicesPage";
import { CountriesPage } from "./pages/CountriesPage";
import AdvisoryPage from "./pages/AdvisoryPage";
import { ResultsOverview } from "./pages/ResultsOverview";
import { Dashboard } from "./pages/Dashboard";
// Wizard Steps
import { WizardStep0 } from "./pages/WizardStep1"; // renamed to WizardStep0 inside
import { WizardCategoryStep } from "./pages/wizard/WizardCategoryStep";
import { WizardContextStep } from "./pages/wizard/WizardContextStep";
import { WizardMarketsStep } from "./pages/wizard/WizardMarketsStep";
import { WizardRiskStep } from "./pages/wizard/WizardRiskStep";
import { WizardComplexityStep } from "./pages/wizard/WizardComplexityStep";
import { WizardReviewStep } from "./pages/wizard/WizardReviewStep";
// Auth
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

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

                {/* Wizard — all wrapped in WizardProvider for shared state */}
                <Route
                    path="/wizard"
                    element={
                        <WizardProvider>
                            <WizardStep0 />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/category"
                    element={
                        <WizardProvider>
                            <WizardCategoryStep />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/context"
                    element={
                        <WizardProvider>
                            <WizardContextStep />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/markets"
                    element={
                        <WizardProvider>
                            <WizardMarketsStep />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/risk"
                    element={
                        <WizardProvider>
                            <WizardRiskStep />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/complexity"
                    element={
                        <WizardProvider>
                            <WizardComplexityStep />
                        </WizardProvider>
                    }
                />
                <Route
                    path="/wizard/review"
                    element={
                        <WizardProvider>
                            <WizardReviewStep />
                        </WizardProvider>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
