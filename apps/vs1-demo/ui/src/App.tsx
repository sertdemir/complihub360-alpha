import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { WizardStep1 } from "./pages/WizardStep1";
import { ResultsOverview } from "./pages/ResultsOverview";
import { Dashboard } from "./pages/Dashboard";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/wizard" element={<WizardStep1 />} />
                <Route path="/results" element={<ResultsOverview />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </Router>
    );
}

export default App;
