import { cn } from "../../utils/cn";

export interface RiskEntry {
    id: string;
    category: string;
    level: "High" | "Medium" | "Low";
}

interface RiskOverviewPanelProps {
    risks: RiskEntry[];
    classname?: string;
}

export function RiskOverviewPanel({ risks, classname }: RiskOverviewPanelProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 p-4 rounded-lg bg-white/5 border border-white/10",
                classname
            )}
            data-testid="risk-overview-panel"
        >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-lg font-semibold text-white">Risk Overview</h3>
            </div>

            <div className="flex flex-col gap-2">
                {risks.map((risk) => (
                    <div
                        key={risk.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-medium text-white/90">
                            {risk.category}
                        </span>
                        <span className="text-sm font-bold text-white/80">
                            {risk.level}
                        </span>
                    </div>
                ))}
                {risks.length === 0 && (
                    <p className="text-sm text-white/40 italic py-2 text-center">No risks found.</p>
                )}
            </div>
        </div>
    );
}
