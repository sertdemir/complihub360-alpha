import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { BookOpen, Search, Filter } from 'lucide-react';

export function KnowledgeCenter() {
  const { t } = useTranslation();

  return (
    <DashboardLayout type="user">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.knowledge.title', 'Knowledge Center')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.knowledge.subtitle', 'Personalisierte Compliance-Richtlinien, Gesetzestexte und Guides.')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder={t('dashboard.knowledge.search', 'Suchen Sie nach VAT, DSGVO...')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" />
              {t('common.filter', 'Filter')}
            </button>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Empfohlen (Passend zu Ihrem Profil)</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="group p-4 border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Guide</span>
                  </div>
                  <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition">VAT Compliance Report {i}</h4>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">Detaillierte Analyse zu den Umsatzsteuer-Schwellenwerten und neuen Registrierungspflichten für E-Commerce in der EU.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
