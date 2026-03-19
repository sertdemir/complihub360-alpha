import { FileText, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Typography } from '../ui/Typography';

const AI_STEPS = [
  {
    step: '01',
    icon: FileText,
    title: 'Smart Context Ingestion',
    body: 'The AI translates your unstructured business context into a validated structured schema — extracting entity type, industry, revenue bands, and market intent.',
  },
  {
    step: '02',
    icon: Lock,
    title: 'PII Redaction Pipeline',
    body: 'Local AI models strip all Personally Identifiable Information — names, emails, tax IDs, phone numbers — before the anonymised schema is passed to the mapping engine.',
  },
  {
    step: '03',
    icon: ShieldCheck,
    title: 'Verified Compliance Dossier',
    body: 'The engine cross-references your anonymised profile with live country-specific risk matrices to produce a structured, verifiable compliance dossier ready for action.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.25,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function ComplianceStepper() {
  return (
    <section className="bg-surface py-12 desktop-s:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary-50/50 rounded-bl-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <Typography variant="caption" className="text-primary-500 mb-4 block font-bold tracking-widest uppercase">
            The AI Engine
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900 mb-6 whitespace-pre-line tracking-tight">
            {"From raw context to a structured\ncompliance dossier"}
          </Typography>
          <Typography variant="body" className="text-neutral-600 max-w-2xl mx-auto">
            Our privacy-first AI pipeline has three stages — each designed to maximise output quality while minimising your data exposure.
          </Typography>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid desktop-s:grid-cols-3 gap-8 relative"
        >
          {AI_STEPS.map(({ step, icon: Icon, title, body }, index) => {
            const isLast = index === AI_STEPS.length - 1;
            // The last step is highlighted differently to show the tangible output requested in Stitch design
            const cardBg = isLast ? 'bg-brand-surface border-primary-200 shadow-md ring-1 ring-primary-500/10' : 'bg-white border-neutral-200';
            const iconBg = isLast ? 'bg-primary-500 text-accent-500 shadow-inner' : 'bg-neutral-50 border border-neutral-100 text-primary-600';

            return (
              <motion.div key={step} variants={itemVariants} className="relative group flex flex-col">
                
                {/* Connecting Line (Desktop) */}
                {!isLast && (
                  <div className="hidden desktop-s:block absolute left-[calc(100%-1rem)] top-[36px] w-[calc(100%+2rem)] h-0.5 bg-gradient-to-r from-neutral-200 to-neutral-200 z-0 opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity" />
                )}

                <div className={`relative z-10 border rounded-2xl p-8 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardBg}`}>
                  <div className="flex items-start gap-5 mb-6">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
                      <Icon size={26} />
                    </div>
                    <div>
                      <Typography variant="caption" className={`block mb-1.5 font-bold tracking-widest ${isLast ? 'text-primary-700' : 'text-neutral-400'}`}>
                        STEP {step}
                      </Typography>
                      <Typography variant="h3" weight="bold" className="text-neutral-900 leading-tight">
                        {title}
                      </Typography>
                    </div>
                  </div>
                  <Typography variant="body" className="text-neutral-600 leading-relaxed flex-1">
                    {body}
                  </Typography>

                  {/* Visual tangibility for 'Verified Dossier' */}
                  {isLast && (
                     <div className="mt-8 pt-8 border-t border-primary-200/60">
                        <div className="bg-white rounded-lg border border-neutral-200 p-5 shadow-sm flex flex-col gap-3 group/card hover:border-primary-300 transition-colors cursor-pointer">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2.5">
                               <div className="w-2.5 h-2.5 rounded-full bg-warning-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                               <Typography variant="ui-small" className="text-neutral-500 font-medium">EPR Packaging DE</Typography>
                             </div>
                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase tracking-wider">Preview</span>
                           </div>
                           <div className="flex items-center justify-between mt-1">
                             <Typography variant="body" weight="bold" className="text-neutral-900">Registration Overdue</Typography>
                             <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center group-hover/card:bg-primary-100 transition-colors">
                               <ArrowRight size={14} className="text-primary-600" />
                             </div>
                           </div>
                        </div>
                     </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
