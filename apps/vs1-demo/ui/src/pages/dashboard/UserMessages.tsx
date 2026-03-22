import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../../store/useDashboardStore';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Search, Send } from 'lucide-react';

export function UserMessages() {
  const { t } = useTranslation();
  const leads = useDashboardStore((state: any) => state.leadRequests);

  // Filter leads that belong to this user's active sessions
  const activeConversations = leads.filter((l: any) => l.status !== 'declined');

  return (
    <DashboardLayout type="user">
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Chat Layout: Sidebar + Main Area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Conversation List Sidebar */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('dashboard.messages.title', 'Nachrichten')}</h2>
              <div className="mt-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('dashboard.messages.search', 'Partner suchen...')}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {activeConversations.map((conv: any, idx: number) => (
                <div 
                  key={conv.id} 
                  className={`p-4 border-b border-gray-100 cursor-pointer transition ${idx === 0 ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-100 border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 truncate pr-2">{conv.providerName}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">10:42</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">Vielen Dank für Ihre Anfrage. Wir prüfen das Dossier derzeit.</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">Ref: {conv.sessionId}</span>
                </div>
              ))}
              {activeConversations.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Keine aktiven Unterhaltungen.
                </div>
              )}
            </div>
          </div>

          {/* Chat Main Area */}
          <div className="flex-1 flex flex-col bg-white">
            {activeConversations.length > 0 ? (
              <>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{activeConversations[0].providerName}</h2>
                    <p className="text-sm text-gray-500">Status: {activeConversations[0].status}</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                  {/* Mock Messages */}
                  <div className="flex flex-col gap-1 items-start">
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-[80%] shadow-sm text-sm text-gray-800">
                      Guten Tag, wir haben Ihr Compliance-Dossier (Ref: {activeConversations[0].sessionId}) erhalten. Darf ich kurz fragen, in welchem Monat der geplante Markteintritt in Frankreich stattfinden soll?
                    </div>
                    <span className="text-xs text-gray-400 ml-2">10:42</span>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder={t('dashboard.messages.typeMessage', 'Nachricht schreiben...')}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Wählen Sie eine Unterhaltung aus.
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
