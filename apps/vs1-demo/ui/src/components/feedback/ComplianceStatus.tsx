import { cn } from "../../utils/cn";

export type ComplianceLevel = "high" | "medium" | "low" | "unknown";

interface ComplianceStatusProps {
    level: ComplianceLevel;
    label?: string; // Optional override for the text
    className?: string;
}

export function ComplianceStatus({ level, label, className }: ComplianceStatusProps) {
    // Mapping logical state to text weight/opacity ONLY. No colors.
    const styles: Record<ComplianceLevel, string> = {
        high: "font-bold text-white", // "High impact" visually via weight
        medium: "font-medium text-white/90",
        low: "font-normal text-white/70",
        unknown: "italic text-white/50",
    };

    const defaultLabels: Record<ComplianceLevel, string> = {
        high: "High Risk",
        medium: "Medium Risk",
        low: "Low Risk",
        unknown: "Status Unknown",
    };

    return (
        <div className={cn("inline-flex items-baseline gap-2", className)}>
            <span className="text-xs uppercase tracking-wider text-white/40">Compliance:</span>
            <span className={cn("text-sm", styles[level])}>
                {label || defaultLabels[level]}
            </span>
        </div>
    );
}
