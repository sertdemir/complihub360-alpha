import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionStatus = 'draft' | 'completed';
export type LeadStatus = 'new' | 'viewed' | 'accepted' | 'declined';

export interface SavedSession {
  id: string;
  category: string;
  country: string;
  targetMarkets: string[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  data: any; // The wizard payload
}

export interface LeadRequest {
  id: string;
  sessionId: string;
  providerId: string;
  providerName: string;
  status: LeadStatus;
  createdAt: string;
  slaDeadline: string | null;
}

interface DashboardState {
  // User Data
  sessions: SavedSession[];
  saveSession: (session: Omit<SavedSession, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteSession: (id: string) => void;
  
  // Lead Requests (Both User & Provider perspective for demo)
  leadRequests: LeadRequest[];
  createLeadRequest: (sessionId: string, providerId: string, providerName: string) => void;
  updateLeadStatus: (requestId: string, status: LeadStatus) => void;
}

// Generate some mock initial data
const initialSessions: SavedSession[] = [
  {
    id: 'sess-001',
    category: 'data-privacy',
    country: 'DE',
    targetMarkets: ['FR', 'ES'],
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    data: { role: 'founder' }
  },
  {
    id: 'sess-002',
    category: 'tax-vat',
    country: 'UK',
    targetMarkets: ['DE', 'IT'],
    status: 'draft',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    data: { role: 'operations' }
  }
];

const initialLeads: LeadRequest[] = [
  {
    id: 'lead-001',
    sessionId: 'sess-001',
    providerId: 'prov-101',
    providerName: 'Lexis Legal GmbH',
    status: 'new',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    slaDeadline: new Date(Date.now() + 3600000 * 20).toISOString(), // 20 hours from now
  }
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      sessions: initialSessions,
      leadRequests: initialLeads,
      
      saveSession: (sessionData) => set((state) => {
        const newSession: SavedSession = {
          ...sessionData,
          id: `sess-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { sessions: [newSession, ...state.sessions] };
      }),
      
      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      })),
      
      createLeadRequest: (sessionId, providerId, providerName) => set((state) => {
        const newLead: LeadRequest = {
          id: `lead-${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          providerId,
          providerName,
          status: 'new',
          createdAt: new Date().toISOString(),
          slaDeadline: new Date(Date.now() + 86400000).toISOString(), // 24h SLA
        };
        return { leadRequests: [newLead, ...state.leadRequests] };
      }),
      
      updateLeadStatus: (requestId, status) => set((state) => ({
        leadRequests: state.leadRequests.map(lead => 
          lead.id === requestId ? { ...lead, status } : lead
        )
      })),
    }),
    {
      name: 'complihub-dashboard-storage',
    }
  )
);
