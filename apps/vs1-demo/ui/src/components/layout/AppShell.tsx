import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";

interface AppShellProps {
    children: ReactNode;
    title?: string;
    className?: string;
}

export function AppShell({ children, title = "CompliHub360", className }: AppShellProps) {
    const navigate = useNavigate();
    return (
        <div className={cn("min-h-screen grid grid-cols-[240px_1fr] bg-background text-slate-100", className)}>
            {/* Sidebar */}
            <aside className="border-r border-white/10 bg-slate-950/50 p-4 flex flex-col gap-4">
                <div className="h-10 flex items-center px-2 font-display font-semibold text-lg tracking-wide">
                    {title}
                </div>
                <nav className="flex-1 space-y-1">
                    <div className="px-2 py-1 text-sm font-medium text-slate-400">Main</div>
                    <div 
                        className="rounded-md px-2 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        Search
                    </div>
                    <div 
                        className="rounded-md px-2 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                        onClick={() => navigate("/services")}
                    >
                        Services
                    </div>
                    <div 
                        className="rounded-md px-2 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                        onClick={() => navigate("/countries")}
                    >
                        Countries
                    </div>
                    <div 
                        className="rounded-md px-2 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                        onClick={() => navigate("/advisory")}
                    >
                        Advisory
                    </div>
                </nav>
                <div className="text-xs text-slate-600 px-2">
                    Neutral Mode v0.1
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-white/10 flex items-center px-8 bg-slate-950/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="text-slate-600">/</span> Breadcrumb
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
