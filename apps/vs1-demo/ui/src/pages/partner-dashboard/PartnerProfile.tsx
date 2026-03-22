import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Globe, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export function PartnerProfile() {
  const { t } = useTranslation();

  return (
    <DashboardLayout type="partner">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.partnerProfile.title', 'Kanzlei & Service Profil')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.partnerProfile.subtitle', 'Ihre Sichtbarkeit im CompliHub360 Matchmaking-Algorithmus.')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-slate-900 px-6 py-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-slate-900 shadow-lg">
                LL
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">Lexis Legal GmbH</h2>
                <div className="flex items-center gap-4 mt-2 text-slate-300 text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> Berlin, Germany</span>
                  <span className="flex items-center gap-1"><Globe className="w-4 h-4"/> lexis-legal.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Service Scope */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Service Kategorien</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                  Data & Privacy (GDPR)
                </span>
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                  Corporate Structure
                </span>
                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium border border-gray-200">
                  + Service hinzufügen
                </span>
              </div>
            </div>

            {/* Geographical Coverage */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Geografische Abdeckung</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Deutschland', 'Österreich', 'Schweiz', 'Frankreich'].map((country) => (
                  <div key={country} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">{country}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Persons */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Ansprechpartner für Leads</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Dr. Sarah Müller</p>
                    <p className="text-sm text-gray-500">Partnerin (IT-Recht)</p>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> s.mueller@lexis.de</span>
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> +49 30 112233</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
               <button className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition shadow-sm">
                 Profil Speichern
               </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
