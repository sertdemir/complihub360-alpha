import React from 'react';
import { Search, Filter, FolderKanban, ShieldAlert, FileText, Activity, Calendar, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function DashboardHome() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-6 md:p-8">

            {/* Top Section: Hero Search */}
            <div className="mb-12 max-w-5xl mx-auto mt-8">
                <h1 className="text-3xl font-bold mb-6 text-center tracking-tight">Search Compliance Records or Policies</h1>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col gap-2 shadow-sm">
                    {/* Primary Search */}
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, policy name, or keyword..."
                            className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-lg focus:outline-none placeholder:text-slate-500"
                        />
                    </div>

                    <div className="h-px bg-slate-800 w-full" />

                    {/* Secondary Filter Input */}
                    <div className="relative flex items-center bg-slate-950/50 rounded-lg">
                        <Filter className="absolute left-4 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Advanced filter (e.g. status:active owner:security)..."
                            className="w-full bg-transparent border-none py-2.5 pl-11 pr-4 text-sm focus:outline-none placeholder:text-slate-600"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Functional Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

                {/* Card 1: Active Projects */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><FolderKanban className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Active Projects</h2>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="group cursor-pointer">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium group-hover:text-blue-400 transition-colors">ISO 27001 Readiness</span>
                                <span className="text-xs font-mono text-slate-400">65%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-slate-400 rounded-full" style={{ width: '65%' }} />
                            </div>
                            <p className="text-xs text-slate-500">Due in 12 days</p>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium group-hover:text-blue-400 transition-colors">SOC2 Type II Audit</span>
                                <span className="text-xs font-mono text-slate-400">30%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-slate-500 rounded-full" style={{ width: '30%' }} />
                            </div>
                            <p className="text-xs text-slate-500">Due in 45 days</p>
                        </div>
                    </div>
                </div>

                {/* Card 2: Recent Security Scans */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><ShieldAlert className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Recent Security Scans</h2>
                    </div>
                    <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-slate-500" />
                            <div>
                                <p className="text-sm font-medium">AWS Infrastructure Scan</p>
                                <p className="text-xs text-slate-500 mt-0.5">Passed • 2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                            <AlertTriangle className="w-4 h-4 mt-0.5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium">Dependencies Audit</p>
                                <p className="text-xs text-slate-500 mt-0.5">2 Warnings • 5 hours ago</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3: Policy Alerts */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><FileText className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Policy Alerts</h2>
                        <span className="ml-auto bg-slate-100 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="border-l-2 border-slate-400 pl-3">
                            <p className="text-sm font-medium text-slate-200">Data Retention Breach</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">Customer logs exceeding 90 days storage limit in Region US-E.</p>
                        </div>
                        <div className="border-l-2 border-slate-600 pl-3">
                            <p className="text-sm font-medium text-slate-300">Password Policy Expiry</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">Executive team password rotation required in 48 hours.</p>
                        </div>
                    </div>
                </div>

                {/* Card 4: Compliance Score */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><Activity className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Compliance Score</h2>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center">
                        <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" className="stroke-slate-800" strokeWidth="12" fill="none" />
                                <circle cx="64" cy="64" r="56" className="stroke-slate-300" strokeWidth="12" fill="none" strokeDasharray="351.8" strokeDashoffset="52.7" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">85</span>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Overall</span>
                            </div>
                        </div>
                        <div className="w-full flex justify-between text-xs font-mono mt-4 pt-4 border-t border-slate-800/50">
                            <div className="flex flex-col items-center"><span className="text-slate-400">Security</span><span className="text-sm text-slate-200">94%</span></div>
                            <div className="flex flex-col items-center"><span className="text-slate-400">Privacy</span><span className="text-sm text-slate-200">71%</span></div>
                        </div>
                    </div>
                </div>

                {/* Card 5: Upcoming Audits */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><Calendar className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Upcoming Audits</h2>
                    </div>
                    <div className="space-y-1 flex-1">
                        <div className="flex gap-4 p-2 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer">
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-950 rounded border border-slate-800 shrink-0">
                                <span className="text-[10px] uppercase text-slate-500 font-bold leading-none">Nov</span>
                                <span className="text-sm font-bold leading-none mt-1">12</span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-medium truncate">Quarterly Security Review</p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" /> 10:00 AM • Internal
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 p-2 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer">
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-950 rounded border border-slate-800 shrink-0 opacity-70">
                                <span className="text-[10px] uppercase text-slate-500 font-bold leading-none">Dec</span>
                                <span className="text-sm font-bold leading-none mt-1">05</span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-medium truncate text-slate-400">GDPR Compliance Check</p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" /> Multi-day • External
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 6: Team Activity */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-slate-800 rounded-lg"><Users className="w-5 h-5 text-slate-300" /></div>
                        <h2 className="text-lg font-semibold">Team Activity</h2>
                    </div>
                    <div className="space-y-4 flex-1 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                        {/* Extremely simplified timeline for neutrality */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-900 bg-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 md:pr-4 group-odd:md:pl-4 group-odd:md:pr-0">
                                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                    <p className="text-xs font-medium text-slate-300"><span className="text-slate-100">Sarah C.</span> updated Incident Plan</p>
                                    <p className="text-[10px] text-slate-500 mt-1">14 mins ago</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-900 bg-slate-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 md:pr-4 group-odd:md:pl-4 group-odd:md:pr-0">
                                <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                    <p className="text-xs font-medium text-slate-400"><span className="text-slate-300">Marcus W.</span> uploaded evidence</p>
                                    <p className="text-[10px] text-slate-500 mt-1">1 hour ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
