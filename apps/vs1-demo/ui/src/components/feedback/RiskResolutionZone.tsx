import { AlertTriangle, Lock, Download, FileText, ArrowRight } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { useNavigate } from 'react-router-dom';

export function RiskResolutionZone() {
  const navigate = useNavigate();

  return (
    <section className="bg-primary-900 py-16 desktop-s:py-24 relative overflow-hidden z-20 w-full mt-20">
      {/* Dark background base to match the user's "Premium Compliance OS" look for this section */}
      
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-[-20%] w-[600px] h-[600px] bg-primary-800/60 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-700/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid desktop-s:grid-cols-2 gap-12 desktop-s:gap-16 items-center relative z-10">
        
        {/* Left Column: Context & Simulated Output */}
        <div className="flex flex-col gap-8">
          <div>
            <Typography variant="caption" className="text-success-400 mb-3 block tracking-widest uppercase font-bold">
              Sample Output — Page 1 of 3
            </Typography>
            <Typography variant="h1" weight="bold" className="text-white mb-5 tracking-tight">
              UK Compliance<br />Risk Snapshot
            </Typography>
            <Typography variant="body" className="text-primary-100/90 leading-relaxed max-w-lg text-lg">
              You have your risk profile. Now fix it. Here is what a typical UK expansion dossier looks like — and the three paths to resolving it.
            </Typography>
          </div>

          <div className="flex flex-col gap-4">
            {/* Overall Risk Card */}
            <div className="bg-primary-800/40 backdrop-blur-md border border-primary-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <Typography variant="body" weight="bold" className="text-primary-200">
                  Overall Risk Level
                </Typography>
                <div className="flex items-center gap-2 text-error-500">
                  <AlertTriangle size={20} />
                  <Typography variant="h3" weight="bold">High</Typography>
                </div>
              </div>
              <div className="w-full h-2.5 bg-primary-900/80 rounded-full overflow-hidden mb-3 shadow-inner">
                <div className="h-full bg-error-500 rounded-full w-[70%] shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
              </div>
              <div className="flex justify-between text-[11px] font-bold tracking-widest uppercase text-primary-400/80">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
                <span>Critical</span>
              </div>
            </div>

            {/* Key Findings Card */}
            <div className="bg-primary-800/40 backdrop-blur-md border border-primary-700/50 rounded-2xl p-6 shadow-2xl">
               <Typography variant="ui-small" weight="bold" className="text-white mb-6 block">
                 Key Findings
               </Typography>

               <div className="flex flex-col gap-5">
                 {/* Finding 1 */}
                 <div className="flex items-start justify-between gap-4 pb-5 border-b border-primary-700/50">
                   <div className="flex items-start gap-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-error-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                     <div>
                       <Typography variant="body" weight="bold" className="text-white mb-1">VAT Registration threshold exceeded</Typography>
                       <Typography variant="ui-small" className="text-primary-300">Mandatory registration — HMRC threshold £85,000</Typography>
                     </div>
                   </div>
                   <span className="bg-white text-error-600 font-bold text-[10px] px-2.5 py-1 rounded-[4px] uppercase tracking-wider shrink-0 shadow-sm">Action Req.</span>
                 </div>
                 
                 {/* Finding 2 */}
                 <div className="flex items-start justify-between gap-4 pb-5 border-b border-primary-700/50">
                   <div className="flex items-start gap-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-warning-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                     <div>
                       <Typography variant="body" weight="bold" className="text-white mb-1">EPR Packaging Producer Obligation</Typography>
                       <Typography variant="ui-small" className="text-primary-300">PRN registration required by Q1 2025</Typography>
                     </div>
                   </div>
                   <span className="bg-white text-warning-600 font-bold text-[10px] px-2.5 py-1 rounded-[4px] uppercase tracking-wider shrink-0 shadow-sm">Review</span>
                 </div>

                 {/* Finding 3 */}
                 <div className="flex items-start justify-between gap-4 pb-5 border-b border-primary-700/50">
                   <div className="flex items-start gap-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-warning-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                     <div>
                       <Typography variant="body" weight="bold" className="text-white mb-1">MTD for VAT — Digital Records Gap</Typography>
                       <Typography variant="ui-small" className="text-primary-300">Phase 2 compliance gap in current workflow</Typography>
                     </div>
                   </div>
                   <span className="bg-white text-warning-600 font-bold text-[10px] px-2.5 py-1 rounded-[4px] uppercase tracking-wider shrink-0 shadow-sm">Review</span>
                 </div>

                 {/* Finding 4 */}
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex items-start gap-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-success-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                     <div>
                       <Typography variant="body" weight="bold" className="text-white mb-1">UK GDPR — Privacy Policy</Typography>
                       <Typography variant="ui-small" className="text-primary-300">Meets baseline UK GDPR requirements</Typography>
                     </div>
                   </div>
                   <span className="bg-white text-success-700 font-bold text-[10px] px-2.5 py-1 rounded-[4px] uppercase tracking-wider shrink-0 shadow-sm">Compliant</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Unlock Mechanism */}
        <div className="bg-white rounded-3xl p-8 desktop-s:p-12 shadow-2xl relative overflow-hidden">
          <Typography variant="h2" weight="bold" className="text-neutral-900 mb-3 tracking-tight">
            You have your risk profile.
          </Typography>
          <Typography variant="body" className="text-neutral-500 mb-10 text-lg">
            Choose how you want to resolve it.
          </Typography>

          {/* Steps Horizontal display */}
          <div className="flex items-stretch gap-3 mb-8">
            <div className="flex-1 bg-success-50 border-2 border-success-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
               <FileText size={24} className="text-success-600" />
               <Typography variant="ui-small" className="text-success-800 leading-tight">
                 Page 1<br/><span className="font-bold">Risk Snapshot</span>
               </Typography>
            </div>
            <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 opacity-70">
               <Lock size={20} className="text-neutral-400" />
               <Typography variant="ui-small" className="text-neutral-400 leading-tight">
                 Page 2<br/>Action Plan
               </Typography>
            </div>
            <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 opacity-70">
               <Lock size={20} className="text-neutral-400" />
               <Typography variant="ui-small" className="text-neutral-400 leading-tight">
                 Page 3<br/>Expert Match
               </Typography>
            </div>
          </div>

          {/* Simplified Final CTA */}
          <div className="flex flex-col gap-4 mb-6">
             <button
               onClick={() => navigate('/register')}
               className="w-full h-16 bg-primary-700 hover:bg-primary-800 text-white font-bold text-lg rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center"
             >
               Create Profile — Unlock Action Plan
             </button>

             <div className="relative flex items-center justify-center my-2">
               <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-neutral-200" />
               </div>
               <div className="relative bg-white px-4 text-[11px] uppercase font-bold text-neutral-400 tracking-widest">
                 or
               </div>
             </div>

             <button
               onClick={() => navigate('/register?intent=expert')}
               className="w-full h-14 bg-white hover:bg-neutral-50 border-2 border-accent-500 text-neutral-900 font-bold text-base rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex justify-center items-center gap-2"
             >
               Skip to Expert Match
               <ArrowRight size={18} className="text-accent-600" />
             </button>
          </div>

          <Typography variant="caption" className="text-neutral-500 text-center block max-w-sm mx-auto leading-relaxed">
            Expert Match connects you with a verified local tax or legal specialist who executes the action plan on your behalf.
          </Typography>
        </div>

      </div>
    </section>
  );
}
