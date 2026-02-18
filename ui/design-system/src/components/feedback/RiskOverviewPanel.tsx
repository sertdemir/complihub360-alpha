import { cn } from "../../utils/cn";

export interface RiskItem {
    id: string;
    title: string;
    description?: string;
    severity: "critical" | "high" | "medium" | "low";
}

interface RiskOverviewPanelProps {
    title?: string;
    risks: RiskItem[];
    className?: string;
}

export function RiskOverviewPanel({ title = "Risk Overview", risks, className }: RiskOverviewPanelProps) {

    const severityLabels: Record<string, string> = {
        critical: "[CRITICAL]",
        high: "[HIGH]",
        medium: "[MED]",
        low: "[LOW]",
    };

    return (
        <div className={cn("border border-white/10 rounded-lg bg-white/5 p-4", className)}>
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

            <div className="space-y-3">
                {risks.length === 0 ? (
                    <div className="text-sm text-white/50 italic">No risks identified.</div>
                ) : (
                    risks.map((risk) => (
                        <div key={risk.id} className="flex flex-col gap-1 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white/90">{risk.title}</span>
                                <span className={cn(
                                    "text-xs font-mono tracking-wide opacity-80",
                                    // Semantic weight only, no color tokens
                                    risk.severity === 'critical' || risk.severity === 'high' ? "font-bold" : "font-normal"
                                )}>
                                    {severityLabels[risk.severity]}
                                </span>
                            </div>
                            {risk.description && (
                                <p className="text-xs text-white/60 line-clamp-2">{risk.description}</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
