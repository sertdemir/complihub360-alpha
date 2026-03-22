import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';

export function PartnerDashboardHome() {
  const { t } = useTranslation();
  const leads = useDashboardStore((state) => state.leadRequests);

  const activeLeads = leads.filter(l => l.status === 'new' || l.status === 'viewed').length;

  return (
    <DashboardLayout type="partner">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.partnerHub.title', 'Partner Hub')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.partnerHub.subtitle', 'Übersicht Ihrer Performance, SLAs und offenen Leads')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
           {/* Mock Metrics Cards */}
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.partnerHub.activeLeads', 'Wartende Anfragen')}</div>
             <div className="mt-2 text-3xl font-semibold text-gray-900">{activeLeads}</div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.partnerHub.slaScore', 'SLA Response Rate')}</div>
             <div className="mt-2 text-3xl font-semibold text-green-600">100%</div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="text-sm font-medium text-gray-500">{t('dashboard.partnerHub.activeClients', 'Aktive Mandate')}</div>
             <div className="mt-2 text-3xl font-semibold text-gray-900">0</div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
