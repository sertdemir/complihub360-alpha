import { BaseButton } from "../../components/primitives/BaseButton";
import { cn } from "../../utils/cn";

export interface RiskRow {
    id: string;
    description: string;
    category: string;
    date: string;
}

interface RiskTableProps {
    risks: RiskRow[];
    className?: string;
    onExport?: () => void;
}

export function RiskTable({ risks, className, onExport }: RiskTableProps) {
    return (
        <div className={cn("border border-white/10 rounded-lg bg-white/5 overflow-hidden", className)}>
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white">Risk Register</h3>
                <BaseButton variant="secondary" size="sm" onClick={onExport}>
                    Export CSV
                </BaseButton>
            </div>

            <div className="w-full text-left text-sm">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/10 font-medium text-white/60">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-3 text-right">Date Detected</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                    {risks.length === 0 ? (
                        <div className="p-4 text-center text-white/40 italic">No risks found.</div>
                    ) : (
                        risks.map((risk) => (
                            <div key={risk.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                                <div className="col-span-6 text-white/90 font-medium truncate" title={risk.description}>
                                    {risk.description}
                                </div>
                                <div className="col-span-3 text-white/70">
                                    {risk.category}
                                </div>
                                <div className="col-span-3 text-right text-white/50 font-mono text-xs pt-0.5">
                                    {risk.date}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
