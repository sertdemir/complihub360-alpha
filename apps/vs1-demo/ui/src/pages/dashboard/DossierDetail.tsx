import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { ResultsOverview } from '../ResultsOverview';
import { ArrowLeft, Send } from 'lucide-react';

export function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  
  const sessions = useDashboardStore((state: any) => state.sessions);
  const createLeadRequest = useDashboardStore((state: any) => state.createLeadRequest);
  
  const session = sessions.find((s: any) => s.id === id);

  if (!session) {
    return (
      <DashboardLayout type="user">
        <div className="p-12 text-center text-gray-500">
          Session not found.
        </div>
      </DashboardLayout>
    );
  }

  const handlePartnerRequest = () => {
    // Mock Provider Request Flow
    // In a real app, this would open a modal to select a provider or auto-match.
    // For now we directly create a lead request for demo purposes.
    createLeadRequest(session.id, 'prov-001', 'Demo Partner GmbH');
    alert(t('dashboard.dossiers.requestSent', 'Anfrage erfolgreich an Partner gesendet! (Demo)'));
  };

  return (
    <DashboardLayout type="user">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              {t(`compliance.${session.category}.title`, session.category)} Dossier
            </h1>
            <p className="text-sm text-gray-500 mt-1">
               Ref: {session.id} | Erstellt am: {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={handlePartnerRequest}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            {t('dashboard.dossiers.sendToPartner', 'An Provider senden')}
          </button>
        </div>

        {/* This re-uses the actual Results view, but we'd pass the session data as context normally. */}
        {/* For demo, we just render the placeholder ResultsOverview component. */}
        <div className="mt-8">
           <ResultsOverview />
        </div>
      </div>
    </DashboardLayout>
  );
}
