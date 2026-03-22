import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useDashboardStore, LeadRequest } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Shield, ArrowRight, Clock } from 'lucide-react';

export function LeadInbox() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const leads = useDashboardStore((state: any) => state.leadRequests);

  // For the partner, show only new or viewed leads in the inbox
  const inboxLeads = leads.filter((l: LeadRequest) => l.status === 'new' || l.status === 'viewed');

  return (
    <DashboardLayout type="partner">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.partnerInbox.title', 'Lead Inbox')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.partnerInbox.subtitle', 'Anonymisierte Anfragen von verifizierten Unternehmen.')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {inboxLeads.map((lead: LeadRequest) => (
              <li key={lead.id} className="p-6 hover:bg-gray-50 transition-colors relative">
                {lead.status === 'new' && (
                  <span className="absolute top-6 left-0 w-1 h-10 bg-blue-500 rounded-r-full" />
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg text-gray-500">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Anonymisiertes Dossier <span className="text-xs text-gray-400 font-normal">Ref: {lead.sessionId.split('-')[1]}</span>
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          <Clock className="w-4 h-4" />
                          SLA fällig in 20h
                        </span>
                        <span>•</span>
                        <span>Erstellt: {new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {lead.status === 'new' && (
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Neu
                      </span>
                    )}
                    <NavLink
                      to={`/${locale}/partner-dashboard/leads/${lead.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      {t('dashboard.partnerInbox.viewLead', 'Lead ansehen')}
                      <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </div>
                </div>
              </li>
            ))}
            {inboxLeads.length === 0 && (
              <li className="p-12 text-center text-gray-500">
                {t('dashboard.partnerInbox.empty', 'Keine neuen Leads in der Inbox.')}
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
