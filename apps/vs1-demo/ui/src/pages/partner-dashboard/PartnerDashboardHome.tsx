import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Shield, ArrowRight, Clock, AlertTriangle, TrendingUp, Briefcase } from 'lucide-react';

export function PartnerDashboardHome() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const leads = useDashboardStore((state: any) => state.leadRequests);

  // Filter leads for the hub
  const newLeads = leads.filter((l: any) => l.status === 'new' || l.status === 'viewed').slice(0, 3);
  const activeMandates = leads.filter((l: any) => l.status === 'accepted');

  return (
    <DashboardLayout type="partner">
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.partnerHub.title', 'Partner Hub')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.partnerHub.subtitle', 'Ihre Kanzlei-Übersicht: Anfragen, Mandate und SLAs im Blick')}</p>
          </div>
          <NavLink 
            to={`/${locale}/partner-dashboard/leads`}
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            Alle Leads ansehen
          </NavLink>
        </div>

        {/* SLA Alerts */}
        {newLeads.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
            <div className="p-2 bg-red-100 text-red-600 rounded-full mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">SLA Warnung: Reaktionszeit läuft ab</h3>
              <p className="text-sm text-red-700 mt-1">Für eine offene Anfrage (Ref: {newLeads[0].sessionId.split('-')[1]}) läuft das Service Level Agreement in unter 20 Stunden ab.</p>
            </div>
            <NavLink to={`/${locale}/partner-dashboard/leads/${newLeads[0].id}`} className="text-sm font-medium text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition">
              Sofort ansehen
            </NavLink>
          </div>
        )}

        {/* Actionable Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Shield className="w-4 h-4"/> Offene Leads</div>
             <div className="mt-3 text-3xl font-semibold text-gray-900 flex items-baseline gap-2">
                {newLeads.length} <span className="text-sm font-normal text-gray-500">Neu</span>
             </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Briefcase className="w-4 h-4"/> Aktive Mandate</div>
             <div className="mt-3 text-3xl font-semibold text-gray-900 flex items-baseline gap-2">
                {activeMandates.length} <span className="text-sm font-normal text-gray-500">In Bearbeitung</span>
             </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
             <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> Conversion Rate</div>
             <div className="mt-3 text-3xl font-semibold text-blue-600 flex items-baseline gap-2">
                92% <span className="text-sm font-normal text-green-600 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5"/>+2.4%</span>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Recent Leads Box */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Neue Anfragen</h2>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {newLeads.map((lead: any) => (
                  <li key={lead.id} className="p-4 hover:bg-gray-50 transition group flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Anonymisiertes Dossier</h3>
                      <p className="text-xs text-gray-500 mt-1">Ref: {lead.sessionId.split('-')[1]}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs font-medium text-orange-600">
                         <Clock className="w-3 h-3" /> Fällig: Morgen, 12:00
                      </div>
                    </div>
                    <NavLink to={`/${locale}/partner-dashboard/leads/${lead.id}`} className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition">
                      Prüfen
                    </NavLink>
                  </li>
                ))}
                {newLeads.length === 0 && (
                   <li className="p-6 text-center text-sm text-gray-500">Keine neuen Anfragen.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Connect / Activity Feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Kanzlei Aktivitäten</h2>
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
               <div className="relative pl-6">
                 <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></span>
                 <p className="text-sm font-medium text-gray-900">Mandat angenommen: TechCorp GmbH</p>
                 <p className="text-xs text-gray-500">Heute, 10:42</p>
               </div>
               <div className="relative pl-6">
                 <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white"></span>
                 <p className="text-sm font-medium text-gray-900">Profilaktualisierung: Neue Service-Region (FR) hinzugefügt</p>
                 <p className="text-xs text-gray-500">Gestern, 14:15</p>
               </div>
               <div className="relative pl-6">
                 <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-green-500 ring-4 ring-white"></span>
                 <p className="text-sm font-medium text-gray-900">Beratungsprojekt abgeschlossen: Alpha Ltd.</p>
                 <p className="text-xs text-gray-500">18. März, 09:30</p>
               </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
