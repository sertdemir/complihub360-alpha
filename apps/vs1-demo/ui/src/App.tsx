import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { WizardStep1 } from "./pages/WizardStep1";
import { WizardStep2 } from "./pages/WizardStep2";
import { WizardStep3 } from "./pages/WizardStep3";
import { ResultsOverview } from "./pages/ResultsOverview";
import { Dashboard } from "./pages/Dashboard";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/wizard" element={<WizardStep1 />} />
                <Route path="/wizard/2" element={<WizardStep2 />} />
                <Route path="/wizard/3" element={<WizardStep3 />} />
                <Route path="/results" element={<ResultsOverview />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </Router>
    );
}

export default App;
