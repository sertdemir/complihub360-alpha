import { BarChart3, ShieldCheck, Eye, EyeOff, FileText, Database, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Typography } from '../ui/Typography';

export function animateRiskSnapshot() { } // Keeping exports clean

export function RiskSnapshotTeaser() {
  const { t } = useTranslation('common');

  return (
    <section className="bg-primary-50/50 border-y border-primary-100 py-16 desktop-s:py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 desktop-s:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Text & Features */}
          <div className="desktop-s:col-span-4 flex flex-col">
            <Typography variant="h2" weight="bold" className="text-neutral-900 mb-6 leading-[1.15]">
              {t('landing.snapshot.titleStart', 'How our')} <span className="text-primary-600">AI</span> {t('landing.snapshot.titleEnd', 'works')}
            </Typography>
            <Typography variant="body" className="text-neutral-600 mb-10 text-lg leading-relaxed">
              {t('landing.snapshot.description', 'Complete transparency on how we process your data, integrate live sources, and deliver the perfect expert match.')}
            </Typography>

            <div className="flex flex-col gap-4">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex gap-5 items-start shadow-sm">
                <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Eye size={24} className="text-primary-600" />
                </div>
                <div className="flex flex-col">
                  <Typography variant="body" weight="bold" className="text-neutral-900 mb-1">
                    {t('landing.snapshot.feature1Title', 'What the AI sees')}
                  </Typography>
                  <Typography variant="ui-small" className="text-neutral-500">
                    {t('landing.snapshot.feature1Desc', 'Public footprints, operational metadata, and target market jurisdictions.')}
                  </Typography>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex gap-5 items-start shadow-sm">
                <div className="w-14 h-14 bg-success-50 rounded-xl flex items-center justify-center shrink-0">
                  <EyeOff size={24} className="text-success-600" />
                </div>
                <div className="flex flex-col">
                  <Typography variant="body" weight="bold" className="text-neutral-900 mb-1">
                    {t('landing.snapshot.feature2Title', 'What it never sees')}
                  </Typography>
                  <Typography variant="ui-small" className="text-neutral-500">
                    {t('landing.snapshot.feature2Desc', 'No PII, no sensitive financials. All inputs are strictly anonymized.')}
                  </Typography>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Engine Visualization (Light Bento Grid) */}
          <div className="desktop-s:col-span-8 flex flex-col gap-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {/* Header Box (span 3) */}
              <div className="sm:col-span-3 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <Typography variant="caption" className="text-primary-500 font-bold uppercase tracking-widest block mb-2">
                    {t('landing.snapshot.headerOverline', 'Intelligence Engine')}
                  </Typography>
                  <Typography variant="h3" weight="bold" className="text-neutral-900">
                    {t('landing.snapshot.headerTitle', 'Dossier Generation & Matching')}
                  </Typography>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <div>
                    <Typography variant="caption" className="text-neutral-400 uppercase tracking-widest block mb-1">
                      {t('landing.snapshot.systemStatus', 'System Status')}
                    </Typography>
                    <Typography variant="ui-small" className="text-primary-600 font-mono font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                       {t('landing.snapshot.statusValue', 'Secure & Grounded')}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Card 1: Regulatory Sources (span 2) */}
              <div className="sm:col-span-2 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm flex flex-col group">
                <Typography variant="caption" className="text-neutral-400 font-bold uppercase tracking-wide block mb-4">
                  {t('landing.snapshot.card1Overline', 'Live Validations')}
                </Typography>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-primary-600 text-5xl font-bold tracking-tight group-hover:scale-105 transition-transform origin-left">2.4</span>
                  <span className="text-neutral-400 text-xl font-medium">M+</span>
                </div>
                <Typography variant="ui-small" className="text-neutral-500 mb-4 h-10 leading-tight">
                  {t('landing.snapshot.card1Desc', 'Regulatory signals grounded in official government APIs.')}
                </Typography>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Database size={14} className="text-primary-500" />
                  <Typography variant="ui-small" weight="bold" className="text-primary-600">
                    {t('landing.snapshot.card1Foot', 'Sources verified')}
                  </Typography>
                </div>
              </div>

              {/* Card 2: Dossier Precision (span 2) */}
              <div className="sm:col-span-2 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm flex flex-col group">
                <Typography variant="caption" className="text-neutral-400 font-bold uppercase tracking-wide block mb-4">
                  {t('landing.snapshot.card2Overline', 'Dossier Structure')}
                </Typography>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-neutral-900 text-5xl font-bold tracking-tight group-hover:scale-105 transition-transform origin-left">100</span>
                  <span className="text-neutral-400 text-xl font-medium">%</span>
                </div>
                <Typography variant="ui-small" className="text-neutral-500 mb-4 h-10 leading-tight">
                  {t('landing.snapshot.card2Desc', 'Standardized legal brief format expected by top-tier firms.')}
                </Typography>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <FileText size={14} className="text-primary-500" />
                  <Typography variant="ui-small" weight="bold" className="text-primary-600">
                    {t('landing.snapshot.card2Foot', 'Execution-ready')}
                  </Typography>
                </div>
              </div>

              {/* Card 3: Match Improvement (span 3) */}
              <div className="sm:col-span-3 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm flex flex-col group relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <Typography variant="caption" className="text-neutral-400 font-bold uppercase tracking-wide block mb-4 relative z-10">
                  {t('landing.snapshot.card3Overline', 'Match Precision')}
                </Typography>
                <div className="flex items-baseline mb-4 relative z-10">
                  <span className="text-primary-600 text-5xl font-bold tracking-tight group-hover:scale-105 transition-transform origin-left">85</span>
                  <span className="text-neutral-400 text-xl font-medium">%</span>
                </div>
                <Typography variant="ui-small" className="text-neutral-500 mb-4 max-w-sm leading-relaxed relative z-10">
                  {t('landing.snapshot.card3Desc', 'Faster response times from vetted compliance partners compared to traditional discovery.')}
                </Typography>
                <div className="flex items-center gap-2 mt-auto pt-2 relative z-10">
                   <TrendingUp size={14} className="text-primary-500" />
                   <Typography variant="ui-small" weight="bold" className="text-primary-600">
                     {t('landing.snapshot.card3Foot', 'Higher conversion')}
                   </Typography>
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-neutral-200/70 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0">
                 <Sparkles size={20} className="text-primary-600" />
              </div>
              <Typography variant="body" className="text-neutral-600">
                <span className="text-neutral-900 font-bold">{t('landing.snapshot.bannerWhy', 'Why it matters:')} </span>
                {t('landing.snapshot.bannerDesc', 'Structured AI dossiers eliminate costly "discovery hours" and map your exact footprint to the right local expert, saving weeks of back-and-forth.')}
              </Typography>
            </div>
             
          </div>

        </div>
      </div>
    </section>
  );
}
