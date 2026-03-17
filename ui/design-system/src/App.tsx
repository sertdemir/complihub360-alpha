import { BaseButton } from "./components/primitives/BaseButton";
import { AppShell } from "./components/layout/AppShell";
import DashboardHome from "./pages/DashboardHome";

function App() {
    return (
        <AppShell title="CompliHub360">
            <DashboardHome />
        </AppShell>
    );
}

export default App;