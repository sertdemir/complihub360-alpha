import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { FileText, Bell, ArrowRight, BookOpen, Clock, ShieldAlert } from 'lucide-react';

export function DashboardHome() {
  const { t } = useTranslation();
  const sessions = useDashboardStore((state: any) => state.sessions);

  // Get the 3 most recent sessions
  const recentSessions = sessions.slice(0, 3);

  return (
    <DashboardLayout type="user">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.hub.title', 'My Compliance Hub')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.hub.subtitle', 'Ihre Übersicht: Metriken, aktive Dossiers und anstehende Aufgaben')}</p>
          </div>
          <NavLink 
            to="/de/wizard/context"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            Neue Bewertung starten
          </NavLink>
        </div>

        {/* Action Alerts */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-full mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-800">Offene Provider-Antwort ausstehend</h3>
            <p className="text-sm text-orange-700 mt-1">Lexis Legal GmbH hat auf Ihre Anfrage (Data Privacy) geantwortet. Bitte prüfen Sie Ihre Nachrichten.</p>
          </div>
          <NavLink to="/de/dashboard/messages" className="text-sm font-medium text-orange-800 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition">
            Nachricht ansehen
          </NavLink>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.savedSessions', 'Gespeicherte Dossiers')}</div>
             <div className="mt-3 text-3xl font-semibold text-gray-900 flex items-baseline gap-2">
                {sessions.length} <span className="text-sm font-normal text-gray-500">Gesamt</span>
             </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.activeRequests', 'Aktive Partner-Anfragen')}</div>
             <div className="mt-3 text-3xl font-semibold text-gray-900 flex items-baseline gap-2">
                1 <span className="text-sm font-normal text-gray-500">In Bearbeitung</span>
             </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.complianceScore', 'Profil Vollständigkeit')}</div>
             <div className="mt-3 text-3xl font-semibold text-blue-600 flex items-baseline gap-2">
                80% <span className="text-sm font-normal text-gray-500">Gut</span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
               <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '80%' }}></div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sessions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Letzte Dossiers</h2>
              <NavLink to="/de/dashboard/sessions" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Alle ansehen &rarr;
              </NavLink>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {recentSessions.map((session: any) => (
                  <li key={session.id} className="p-4 hover:bg-gray-50 transition group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                         <FileText className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="text-sm font-medium text-gray-900">
                           {String(t(`compliance.${session.category}.title`, { defaultValue: session.category }))}
                         </h3>
                         <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                           <span className="capitalize">{session.status}</span>
                           <span>•</span>
                           <span>Update: {new Date(session.updatedAt).toLocaleDateString()}</span>
                         </div>
                       </div>
                    </div>
                    <NavLink to={`/de/dashboard/sessions/${session.id}`} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 transition">
                      <ArrowRight className="w-5 h-5" />
                    </NavLink>
                  </li>
                ))}
                {recentSessions.length === 0 && (
                  <li className="p-8 text-center text-gray-500 text-sm">Keine Einträge vorhanden.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Quick Actions / Knowledge */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Für Sie empfohlen</h2>
            <div className="space-y-3">
              <NavLink to="/de/dashboard/knowledge" className="block p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition group">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">VAT Compliance Checkliste 2026</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">Laden Sie die neueste Guideline für grenzüberschreitenden E-Commerce herunter.</p>
                  </div>
                </div>
              </NavLink>
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">System-Updates</h3>
                    <p className="text-xs text-gray-500 mt-1">Die EPR-Regularien für Frankreich wurden aktualisiert. Ihr Dossier ist noch konform.</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">Vor 2 Tagen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
