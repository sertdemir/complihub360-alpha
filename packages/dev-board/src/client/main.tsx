import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Square, LayoutDashboard, GitBranch, Archive, ExternalLink, Clock, User, ChevronDown, ChevronRight, Bot } from 'lucide-react';
import './index.css';

const STATUSES = ['todo', 'doing', 'waiting', 'review', 'done'];

function App() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const fetchTickets = () => {
        fetch('/api/tickets')
            .then(res => res.json())
            .then(data => data.success && setTickets(data.tickets));
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleCreateTicket = async () => {
        if (!newTitle) return;
        await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, description: newDesc })
        });
        setIsCreating(false);
        setNewTitle('');
        setNewDesc('');
        fetchTickets();
    };

    const handleBranch = async (ticketId: string) => {
        await fetch('/api/branch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId }) });
        alert(`Created and switched to feature/${ticketId}`);
    };

    const handleArchive = async (ticketId: string) => {
        await fetch('/api/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId }) });
        fetchTickets();
        setSelectedTicket(null);
    };

    // Group tickets by Epic
    const epics = Array.from(new Set(tickets.map(t => t.epic || 'Unassigned')));
    // Sort so Unassigned is at the bottom
    epics.sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b));

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">

            {/* Sidebar: App Launcher */}
            <div className="w-64 border-r border-slate-800 bg-slate-950 p-4 flex flex-col gap-6 shrink-0 z-10">
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apps</h2>
                    <div className="space-y-3">
                        <AppControl name="vs1-demo" port={5173} appPath="apps/vs1-demo/ui" />
                        <AppControl name="design-system" port={5174} appPath="ui/design-system" />
                    </div>
                </div>
            </div>

            {/* Main Content: Full Board */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex flex-shrink-0 items-center justify-between px-6">
                    <div className="flex items-center">
                        <LayoutDashboard className="w-5 h-5 mr-3 text-emerald-400" />
                        <h1 className="font-semibold text-lg">CompliHub360 Orchestration</h1>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-3 py-1.5 rounded-md text-sm font-medium">
                        + New Ticket
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-6 bg-slate-900">
                    <div className="min-w-max space-y-6 pb-12">
                        {/* Board Headers */}
                        <div className="flex gap-6 mb-2">
                            {STATUSES.map(col => (
                                <div key={col} className="w-80 shrink-0">
                                    <h3 className="font-semibold capitalize text-slate-400 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {col === 'waiting' && <Clock className="w-4 h-4 text-amber-500" />}
                                            {col}
                                        </div>
                                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-500 font-medium">
                                            {tickets.filter(t => t.status === col).length}
                                        </span>
                                    </h3>
                                </div>
                            ))}
                        </div>

                        {/* Epic Swimlanes */}
                        {epics.map(epicId => (
                            <EpicSwimlane
                                key={epicId}
                                epicId={epicId}
                                tickets={tickets.filter(t => (t.epic || 'Unassigned') === epicId)}
                                onSelectTicket={setSelectedTicket}
                                onBranch={handleBranch}
                                onArchive={handleArchive}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isCreating && (
                <CreateTicketModal
                    newTitle={newTitle} setNewTitle={setNewTitle}
                    newDesc={newDesc} setNewDesc={setNewDesc}
                    onClose={() => setIsCreating(false)}
                    onCreate={handleCreateTicket}
                />
            )}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </div>
    );
}

function EpicSwimlane({ epicId, tickets, onSelectTicket, onBranch, onArchive }: any) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="bg-slate-950/30 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                <h2 className="font-semibold text-lg text-emerald-400">{epicId}</h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{tickets.length} tickets</span>
            </div>

            {expanded && (
                <div className="flex gap-6">
                    {STATUSES.map(col => (
                        <div key={col} className="w-80 shrink-0 min-h-[100px] flex flex-col gap-3">
                            {tickets.filter((t: any) => t.status === col).map((ticket: any) => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onSelect={() => onSelectTicket(ticket)}
                                    onBranch={() => onBranch(ticket.id)}
                                    onArchive={() => onArchive(ticket.id)}
                                />
                            ))}
                            {tickets.filter((t: any) => t.status === col).length === 0 && (
                                <div className="border border-dashed border-slate-800 rounded-lg h-16 flex items-center justify-center text-xs text-slate-600">
                                    Drop here
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TicketCard({ ticket, onSelect, onBranch, onArchive }: any) {
    const isWaiting = ticket.status === 'waiting';
    return (
        <div
            onClick={onSelect}
            className={`bg-slate-800 p-4 rounded-lg shadow-sm border cursor-pointer transition-colors group relative ${isWaiting ? 'border-amber-500/50 hover:border-amber-400' : 'border-slate-700 hover:border-emerald-500/50'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-emerald-400 font-medium">{ticket.id}</span>
                <div className="flex gap-1 absolute top-3 right-3">
                    {ticket.status === 'todo' && <button onClick={(e) => { e.stopPropagation(); onBranch(); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-all" title="Create Branch"><GitBranch className="w-3.5 h-3.5" /></button>}
                    {ticket.status === 'done' && <button onClick={(e) => { e.stopPropagation(); onArchive(); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-all" title="Archive"><Archive className="w-3.5 h-3.5" /></button>}
                </div>
            </div>
            <h4 className="font-semibold text-slate-200 line-clamp-3 leading-snug pr-6">
                {ticket.title}
            </h4>
            <div className="mt-4 flex flex-col gap-2 text-xs font-mono">
                {ticket.auditLog && ticket.auditLog.length > 0 && (
                    <div className="flex items-center justify-between text-slate-500 bg-slate-900/50 px-2 py-1.5 rounded" title="Creator">
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Creator</span>
                        <div className="flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5" />
                            <span>{ticket.auditLog[0].agent}</span>
                        </div>
                    </div>
                )}
                {ticket.assignee && (
                    <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-1.5 rounded" title="Assignee">
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Assignee</span>
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>{ticket.assignee}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AuditTimeline({ auditLog }: { auditLog: any[] }) {
    if (!auditLog || auditLog.length === 0) return null;
    return (
        <div className="mt-8 pt-8 border-t border-slate-800">
            <h3 className="font-semibold text-slate-400 mb-6 uppercase text-xs tracking-wider">Agent Audit Trail</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                {auditLog.map((log, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-900 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/50 p-4 rounded border border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-emerald-400">{log.agent}</span>
                                <time className="font-mono text-xs text-slate-500">{log.timestamp.slice(11, 16)}</time>
                            </div>
                            <div className="text-slate-300 text-sm leading-snug">{log.action}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TicketDetailModal({ ticket, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <span className="text-emerald-400 font-mono font-bold bg-emerald-400/10 px-2 py-1 rounded text-sm">{ticket.id}</span>
                        {ticket.epic && <span className="text-indigo-400 font-mono font-bold bg-indigo-400/10 px-2 py-1 rounded text-sm">{ticket.epic}</span>}
                        <span className={`uppercase text-xs font-bold tracking-wider px-2 py-1 rounded ${ticket.status === 'waiting' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>{ticket.status}</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md text-sm font-medium">Close</button>
                </header>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-950/50 shadow-inner">
                    <div className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {ticket.content}
                    </div>
                    <AuditTimeline auditLog={ticket.auditLog} />
                </div>
            </div>
        </div>
    );
}

function CreateTicketModal({ newTitle, setNewTitle, newDesc, setNewDesc, onClose, onCreate }: any) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-start justify-center pt-24 z-50" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-semibold mb-4 text-white">Create New Ticket</h2>
                <input
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ticket Title (e.g. Add Login Form)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white mb-4 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                    autoFocus
                />
                <textarea
                    value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="Description & Acceptance Criteria..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white h-48 mb-6 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none font-mono text-sm"
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md hover:bg-slate-800 text-slate-300 font-medium transition-colors">Cancel</button>
                    <button
                        onClick={onCreate}
                        disabled={!newTitle}
                        className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-900/20 transition-colors"
                    >
                        Create Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}

function AppControl({ name, port, appPath }: { name: string, port: number, appPath: string }) {
    const [running, setRunning] = useState(false);

    const toggle = async () => {
        if (running) {
            await fetch('/api/apps/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            setRunning(false);
        } else {
            await fetch('/api/apps/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, appPath, port }) });
            setRunning(true);
        }
    };

    return (
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col gap-3 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium text-slate-300">{name}</div>
                    <div className="text-xs text-slate-500 font-mono">localhost:{port}</div>
                </div>
                <button
                    onClick={toggle}
                    className={`p-2 rounded-md transition-colors ${running ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                >
                    {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                </button>
            </div>
            {running && (
                <a href={`http://localhost:${port}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2 mt-1 text-xs font-medium bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors">
                    Open App <ExternalLink className="w-3.5 h-3.5" />
                </a>
            )}
        </div>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
