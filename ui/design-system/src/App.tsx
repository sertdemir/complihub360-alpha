import { BaseButton } from "./components/primitives/BaseButton";
import { AppShell } from "./components/layout/AppShell";
import { DashboardHeader } from "./components/layout/DashboardHeader";
import { ComplianceStatus } from "./components/feedback/ComplianceStatus";
import { RiskOverviewPanel } from "./components/feedback/RiskOverviewPanel";
import { RiskTable } from "./components/dashboard/RiskTable";

function App() {
    return (
        <AppShell title="CompliHub360">
            <DashboardHeader
                title="Compliance Dashboard"
                description="Overview of your organization's compliance posture (Neutral Mode)."
                actions={
                    <BaseButton variant="primary" size="sm">
                        Export Report
                    </BaseButton>
                }
            />

            <div className="space-y-8">
                {/* Compliance Status Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white/90">System Status</h2>

                    <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                            <span className="text-sm font-medium text-white/60">Module</span>
                            <span className="text-sm font-medium text-white/60">Status</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm">GDPR Core</span>
                            <ComplianceStatus level="high" />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm">SOC2 Controls</span>
                            <ComplianceStatus level="medium" />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm">ISO 27001</span>
                            <ComplianceStatus level="low" />
                        </div>
                    </div>
                </section>

                {/* Risk Overview Panel */}
                <section className="space-y-4">
                    <RiskOverviewPanel
                        risks={[
                            { id: "1", category: "Vendor Risk", level: "High" },
                            { id: "2", category: "Cloud Config", level: "Medium" },
                            { id: "3", category: "Policy Gaps", level: "Low" },
                        ]}
                    />
                </section>

                {/* Risk Register Table */}
                <section className="space-y-4">
                    <RiskTable
                        risks={[
                            {
                                id: "101",
                                description: "S3 Bucket Public Access Block disabled",
                                category: "Infrastructure",
                                date: "2024-02-18",
                            },
                            {
                                id: "102",
                                description: "Root user MFA not enabled",
                                category: "IAM",
                                date: "2024-02-15",
                            },
                            {
                                id: "103",
                                description: "Unrotated API Key (90+ days)",
                                category: "Security",
                                date: "2024-01-20",
                            },
                        ]}
                        onExport={() => console.log("Export triggered")}
                    />
                </section>

                {/* BaseButton Demo (Keep existing) */}
                <section className="space-y-4 pt-8 border-t border-white/10">
                    <h2 className="text-xl font-semibold text-white/90">
                        Component Library (Primitives)
                    </h2>

                    <div className="flex gap-4">
                        <BaseButton variant="primary">Primary Action</BaseButton>
                        <BaseButton variant="secondary">Secondary</BaseButton>
                        <BaseButton variant="ghost">Dismiss</BaseButton>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}

export default App;