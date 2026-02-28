import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Square, LayoutDashboard, GitBranch, Archive, ExternalLink } from 'lucide-react';
import './index.css';

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
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">

            {/* Sidebar: App Launcher */}
            <div className="w-64 border-r border-slate-800 bg-slate-950 p-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apps</h2>
                    <div className="space-y-3">
                        <AppControl name="vs1-demo" port={5173} appPath="apps/vs1-demo/ui" />
                        <AppControl name="design-system" port={5174} appPath="ui/design-system" />
                    </div>
                </div>
            </div>

            {/* Main Content: Full Board */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
                    <div className="flex items-center">
                        <LayoutDashboard className="w-5 h-5 mr-3 text-emerald-400" />
                        <h1 className="font-semibold text-lg">CompliHub360 Dev Board</h1>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="bg-emerald-600 hover:bg-emerald-500 transition-colors text-white px-3 py-1.5 rounded-md text-sm font-medium">
                        + New Ticket
                    </button>
                </header>

                <div className="flex-1 overflow-x-auto p-6 bg-slate-900">
                    <div className="flex gap-6 h-full min-w-max">
                        {['todo', 'doing', 'review', 'done'].map(col => (
                            <div key={col} className="w-80 shrink-0 flex flex-col gap-3 h-full">
                                <h3 className="font-semibold capitalize text-slate-400 flex items-center justify-between">
                                    {col}
                                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-500 font-medium">
                                        {tickets.filter(t => t.status === col).length}
                                    </span>
                                </h3>
                                <div className="flex-1 overflow-y-auto space-y-3 pb-8">
                                    {tickets.filter(t => t.status === col).map(ticket => (
                                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-mono text-emerald-400 font-medium">{ticket.id}</span>
                                                <div className="flex gap-1">
                                                    {col === 'todo' && <button onClick={(e) => { e.stopPropagation(); handleBranch(ticket.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-all" title="Create Branch"><GitBranch className="w-3.5 h-3.5" /></button>}
                                                    {col === 'done' && <button onClick={(e) => { e.stopPropagation(); handleArchive(ticket.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-all" title="Archive"><Archive className="w-3.5 h-3.5" /></button>}
                                                </div>
                                            </div>
                                            <h4 className="font-semibold text-slate-200 line-clamp-3 leading-snug">
                                                {ticket.content.split('\n').find((l: string) => l.startsWith('#'))?.replace('#', '').trim() || 'Untitled Ticket'}
                                            </h4>
                                        </div>
                                    ))}
                                    {tickets.filter(t => t.status === col).length === 0 && (
                                        <div className="border-2 border-dashed border-slate-800 rounded-lg h-24 flex items-center justify-center text-sm text-slate-600">
                                            Empty
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Ticket Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-start justify-center pt-24 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-xl shadow-2xl">
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
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-md hover:bg-slate-800 text-slate-300 font-medium transition-colors">Cancel</button>
                            <button
                                onClick={handleCreateTicket}
                                disabled={!newTitle}
                                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-900/20 transition-colors"
                            >
                                Create Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" onClick={() => setSelectedTicket(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <span className="text-emerald-400 font-mono font-bold bg-emerald-400/10 px-2 py-1 rounded text-sm">{selectedTicket.id}</span>
                                <span className="text-slate-400 uppercase text-xs font-bold tracking-wider">{selectedTicket.status}</span>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md text-sm font-medium">Close</button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-8 text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-slate-950/50 border-t border-slate-900 shadow-inner">
                            {selectedTicket.content}
                        </div>
                    </div>
                </div>
            )}

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
            await fetch('/api/apps/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, appPath }) });
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
