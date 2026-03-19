import { useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { Typography } from '../ui/Typography';

export function RiskSnapshotTeaser() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="bg-background py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div 
          className="bg-primary-500 rounded-xl p-6 desktop-s:p-8 text-white relative overflow-hidden transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Background decoration */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="flex flex-col desktop-s:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shrink-0 border border-primary-400 shadow-inner">
                <ShieldAlert size={26} className="text-accent-500" />
              </div>
              <div>
                <Typography variant="caption" className="text-primary-100 mb-1 font-semibold uppercase tracking-wider block">
                  Live Teaser
                </Typography>
                <Typography variant="h3" weight="bold" className="text-white mb-1">
                  Compliance Risk Snapshot
                </Typography>
                <Typography variant="ui-small" className="text-primary-100 max-w-lg">
                  Hover to reveal a dummy analysis of potential regulatory exposure for cross-border operations.
                </Typography>
              </div>
            </div>

            <div className="bg-primary-600 rounded-lg p-5 border border-primary-400 w-full desktop-s:w-auto min-w-[300px] transition-all duration-300 relative overflow-hidden h-24 flex items-center shadow-inner">
              
              {/* Default State */}
              <div className={`absolute inset-0 transition-all duration-500 flex flex-col items-center justify-center gap-2 ${isHovered ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <Typography variant="ui-small" className="text-primary-100">
                  Global Exposure Risk
                </Typography>
                <div className="w-24 h-2 bg-primary-700 rounded-full overflow-hidden relative">
                   <div className="absolute left-0 top-0 h-full bg-accent-500 w-1/3 animate-pulse"></div>
                </div>
                <Typography variant="caption" className="text-accent-300">Hover to scan...</Typography>
              </div>

              {/* Hover State */}
              <div className={`absolute inset-0 p-5 transition-all duration-500 flex justify-between items-center ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                <div className="flex flex-col">
                   <Typography variant="caption" className="text-primary-200 block mb-1">Risk Level</Typography>
                   <div className="flex items-center gap-2">
                     <AlertCircle size={18} className="text-warning-500" />
                     <Typography variant="body" weight="bold" className="text-warning-500 leading-none">Medium</Typography>
                   </div>
                </div>
                <div className="h-full w-px bg-primary-400/50 mx-4" />
                <div className="flex flex-col text-right">
                   <Typography variant="caption" className="text-primary-200 block mb-1">Issues Found</Typography>
                   <Typography variant="body" weight="bold" className="text-white leading-none">3 Obligations</Typography>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
