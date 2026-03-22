import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { UploadCloud, File, MoreVertical } from 'lucide-react';

export function UserWorkspace() {
  const { t } = useTranslation();

  return (
    <DashboardLayout type="user">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.workspace.title', 'Workspace & Dokumente')}</h1>
            <p className="text-gray-600 mt-1">{t('dashboard.workspace.subtitle', 'Ihr sicherer Tresor für Compliance-Dokumente und Verträge.')}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <UploadCloud className="w-4 h-4" />
            {t('dashboard.workspace.upload', 'Dokument hochladen')}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Mock Document List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dateiname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zuletzt geändert</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Größe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freigabe Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Aktionen</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { name: 'GmbH_Gesellschaftervertrag_2025.pdf', date: '15. Okt 2025', size: '2.4 MB', shared: 'Privat' },
                  { name: 'VAT_Registration_Spain.pdf', date: '02. Nov 2025', size: '1.1 MB', shared: 'Geteilt mit Lexis Legal' },
                ].map((doc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.size}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.shared === 'Privat' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                        {doc.shared}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-900">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
