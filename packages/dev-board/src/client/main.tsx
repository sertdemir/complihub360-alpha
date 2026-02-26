import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Square, LayoutDashboard, GitBranch, Archive } from 'lucide-react';
import './index.css';

function App() {
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        fetch('/api/tickets')
            .then(res => res.json())
            .then(data => data.success && setTickets(data.tickets));
    }, []);

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">

            {/* Sidebar: App Launcher */}
            <div className="w-64 border-r border-slate-800 bg-slate-950 p-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Apps</h2>
                    <div className="space-y-2">
                        <AppControl name="vs1-demo" port={5173} />
                        <AppControl name="design-system" port={5174} />
                    </div>
                </div>
            </div>

            {/* Main Content: Split View */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-6">
                    <LayoutDashboard className="w-5 h-5 mr-3 text-emerald-400" />
                    <h1 className="font-semibold text-lg">CompliHub360 Dev Board</h1>
                </header>

                <div className="flex-1 flex overflow-hidden">

                    {/* Kanban Section */}
                    <div className="w-1/2 overflow-x-auto p-6 bg-slate-900 border-r border-slate-800">
                        <div className="flex gap-4">
                            {['todo', 'doing', 'review', 'done'].map(col => (
                                <div key={col} className="w-80 shrink-0 flex flex-col gap-3">
                                    <h3 className="font-semibold capitalize text-slate-400 flex items-center justify-between">
                                        {col}
                                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-500">
                                            {tickets.filter(t => t.status === col).length}
                                        </span>
                                    </h3>
                                    {tickets.filter(t => t.status === col).map(ticket => (
                                        <div key={ticket.id} className="bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-mono text-emerald-400">{ticket.id}</span>
                                                <div className="flex gap-2">
                                                    {col === 'todo' && <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400" title="Create Branch"><GitBranch className="w-4 h-4" /></button>}
                                                    {col === 'done' && <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400" title="Archive"><Archive className="w-4 h-4" /></button>}
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-slate-200 line-clamp-2">{ticket.content.split('\n')[0].replace('#', '').trim() || 'Untitled Ticket'}</h4>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Preview Section */}
                    <div className="w-1/2 bg-slate-950 flex flex-col relative">
                        <div className="absolute top-0 right-0 p-2 bg-slate-900/80 backdrop-blur rounded-bl-lg text-xs font-mono text-slate-400 z-10 border-b border-l border-slate-800">
                            Live Preview
                        </div>
                        <iframe src="http://localhost:5173" className="w-full h-full border-none bg-white/5" title="Live App Preview" />
                    </div>

                </div>
            </div>
        </div>
    );
}

function AppControl({ name, port }) {
    const [running, setRunning] = useState(false);

    return (
        <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <div>
                <div className="text-sm font-medium text-slate-300">{name}</div>
                <div className="text-xs text-slate-500 font-mono">:{port}</div>
            </div>
            <button
                onClick={() => setRunning(!running)}
                className={`p-2 rounded-md transition-colors ${running ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
            >
                {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
            </button>
        </div>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
