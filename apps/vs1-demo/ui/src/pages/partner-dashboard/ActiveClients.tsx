import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Briefcase, ArrowRight, FolderDown } from 'lucide-react';

export function ActiveClients() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const leads = useDashboardStore((state: any) => state.leadRequests);

  // Only show accepted leads
  const clients = leads.filter((l: any) => l.status === 'accepted');

  return (
    <DashboardLayout type="partner">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.partnerClients.title', 'Aktive Mandate')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.partnerClients.subtitle', 'Ihre angenommenen Mandate inklusive geteilter Dokumente.')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {clients.map((client: any) => (
              <li key={client.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg text-green-700">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        TechCorp GmbH <span className="text-xs text-gray-400 font-normal">Ref: {client.sessionId}</span>
                      </h3>
                      <p className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        Status: <span className="font-medium text-green-600">Aktiv</span> | 
                        1 Neues Dokument freigegeben
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition text-gray-700">
                      <FolderDown className="w-4 h-4" />
                      Dossier-Export (ZIP)
                    </button>
                    <NavLink
                      to={`/${locale}/partner-dashboard/leads/${client.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 font-medium rounded-lg hover:bg-slate-200 transition"
                    >
                      Akte öffnen
                      <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </div>
                </div>
              </li>
            ))}
            {clients.length === 0 && (
              <li className="p-12 text-center text-gray-500">
                {t('dashboard.partnerClients.empty', 'Keine aktiven Mandate gefunden.')}
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
