import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { ResultsOverview } from '../ResultsOverview';
import { ArrowLeft, CheckCircle, Clock, ShieldAlert, Lock, User, FileText } from 'lucide-react';

export function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const leads = useDashboardStore((state: any) => state.leadRequests);
  const sessions = useDashboardStore((state: any) => state.sessions);
  const updateLeadStatus = useDashboardStore((state: any) => state.updateLeadStatus);
  
  const lead = leads.find((l: any) => l.id === id);
  const session = sessions.find((s: any) => s.id === lead?.sessionId);

  // Derive "accepted" state from the store's status
  const isAccepted = lead?.status === 'accepted';

  useEffect(() => {
    // If opening a new lead, mark it as viewed. 
    // In a real app we'd trigger an API call. For local dev we just use the store.
    if (lead && lead.status === 'new') {
      updateLeadStatus(lead.id, 'viewed');
    }
  }, [lead, updateLeadStatus]);

  if (!lead || !session) {
    return (
      <DashboardLayout type="partner">
        <div className="p-12 text-center text-gray-500">Lead not found.</div>
      </DashboardLayout>
    );
  }

  const handleAcceptLead = () => {
    if (confirm(t('dashboard.partnerInbox.confirmAccept', 'Möchten Sie diesen Lead verbindlich annehmen? Dadurch werden die PII-Daten (Name, Kontakt) freigeschaltet und das SLA beginnt.'))) {
      updateLeadStatus(lead.id, 'accepted');
    }
  };

  return (
    <DashboardLayout type="partner">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {isAccepted ? 'Lead Dossier (Entsperrt)' : 'Anonymisiertes Dossier'}
              </h1>
              {isAccepted ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span className="mt-0.5">Mandat Aktiv</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  <span className="mt-0.5">SLA fällig in 20h</span>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
               Lead-ID: {lead.id} | Erstellt am: {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {!isAccepted && (
            <button 
              onClick={handleAcceptLead}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              Interesse bestätigen & PII entsperren
            </button>
          )}
        </div>

        {/* Lead Identity / Privacy Gate Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 relative">
          {!isAccepted && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center border border-gray-100">
              <div className="p-4 bg-white rounded-full shadow-lg border border-gray-100 mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Privacy Gate</h2>
              <p className="text-gray-600 max-w-md text-center mt-2 font-medium">
                Kontaktdaten und Unternehmensname sind verschlüsselt. <br/>
                Bitte bestätigen Sie das Mandat, um die PII (Personally Identifiable Information) freizuschalten.
              </p>
            </div>
          )}
          
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Kontaktinformationen
          </h2>
          {isAccepted ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Unternehmen</p>
                <p className="font-medium text-gray-900">TechCorp GmbH (Demodaten)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ansprechpartner</p>
                <p className="font-medium text-gray-900">Max Mustermann</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-medium text-gray-900">+49 30 1234567</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-blue-600 cursor-pointer hover:underline">m.mustermann@techcorp.de</p>
              </div>
            </div>
          ) : (
             <div className="grid grid-cols-2 gap-4 opacity-30 select-none blur-sm">
              <div>
                <p className="text-sm text-gray-500">Unternehmen</p>
                <p className="font-medium text-gray-900">████████ GmbH</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ansprechpartner</p>
                <p className="font-medium text-gray-900">███ █████████</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-medium text-gray-900">+██ ██ ███████</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">█████@███████.██</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Compliance Risk Dossier Viewer (Always Visible for Context) */}
        <div>
           <div className="flex items-center gap-2 mb-4 p-4 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 text-sm">
             <ShieldAlert className="w-5 h-5 flex-shrink-0" />
             <p>Dies ist das anonymisierte Ziel-Dossier des Mandanten. Bewerten Sie die regulatorischen Risiken, bevor Sie das Mandat annehmen.</p>
           </div>
           
           <div className={`mt-4 ${!isAccepted ? 'pointer-events-none' : ''}`}>
             <ResultsOverview />
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
