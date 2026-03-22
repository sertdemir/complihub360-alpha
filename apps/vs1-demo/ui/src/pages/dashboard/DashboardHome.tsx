import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';

export function DashboardHome() {
  const { t } = useTranslation();
  const sessions = useDashboardStore((state) => state.sessions);

  return (
    <DashboardLayout type="user">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.hub.title', 'My Compliance Hub')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.hub.subtitle', 'Ihre Übersicht: Metriken, aktive Dossiers und anstehende Aufgaben')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
           {/* Mock Metrics Cards */}
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.savedSessions', 'Gespeicherte Sessions')}</div>
             <div className="mt-2 text-3xl font-semibold text-gray-900">{sessions.length}</div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.activeRequests', 'Aktive Partner-Anfragen')}</div>
             <div className="mt-2 text-3xl font-semibold text-gray-900">0</div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.hub.complianceScore', 'Profil Vollständigkeit')}</div>
             <div className="mt-2 text-3xl font-semibold text-blue-600">80%</div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
