import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';

export function UserDossiers() {
  const { t } = useTranslation();
  const sessions = useDashboardStore((state: any) => state.sessions);
  const deleteSession = useDashboardStore((state: any) => state.deleteSession);

  return (
    <DashboardLayout type="user">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.dossiers.title', 'Meine Dossiers (Sessions)')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.dossiers.subtitle', 'Hier finden Sie alle Ihre gespeicherten Compliance-Bewertungen.')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session: any) => (
              <li key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {t(`compliance.${session.category}.title`, session.category) as string}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Target: {session.targetMarkets.join(', ')} | Status: {session.status} | {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => deleteSession(session.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('common.delete', 'Löschen')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    <NavLink
                      to={`/de/dashboard/sessions/${session.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {t('dashboard.dossiers.view', 'Dossier ansehen')}
                      <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </div>
                </div>
              </li>
            ))}
            {sessions.length === 0 && (
              <li className="p-12 text-center text-gray-500">
                {t('dashboard.dossiers.empty', 'Keine Dossiers gefunden. Starten Sie eine neue Bewertung.')}
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
