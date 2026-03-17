import { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface DashboardHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export function DashboardHeader({ title, description, actions, className }: DashboardHeaderProps) {
    return (
        <header className={cn("flex flex-col gap-4 border-b border-white/10 pb-6 mb-8", className)}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
                    {description && (
                        <p className="text-sm text-white/60">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}
