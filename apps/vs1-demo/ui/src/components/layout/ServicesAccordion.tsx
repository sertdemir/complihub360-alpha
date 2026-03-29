import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Settings, ArrowRight, CheckCircle2, Rocket, ShieldCheck } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const getAudiences = (t: TFunction) => [
  {
    id: 'founder',
    icon: Rocket,
    title: t('landing.services.founder.title', 'For Founders & CEOs'),
    description: t('landing.services.founder.description', 'Scale into new markets without the legal overhead. Get instant clarity on tax, VAT, and corporate structure before you commit.'),
    tags: [
      t('landing.services.founder.tags.0', 'Tax & VAT Registration'),
      t('landing.services.founder.tags.1', 'Corporate Setup'),
      t('landing.services.founder.tags.2', 'Baseline Privacy')
    ],
    animation: { y: [0, -8, 0] },
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
  },
  {
    id: 'ops',
    icon: Settings,
    title: t('landing.services.ops.title', 'For Operations & Expansion'),
    description: t('landing.services.ops.description', 'De-risk your supply chain and product launches. Navigate complex EPR packaging rules, marketing standards, and operational compliance.'),
    tags: [
      t('landing.services.ops.tags.0', 'EPR & Packaging'),
      t('landing.services.ops.tags.1', 'Supply Chain ESG'),
      t('landing.services.ops.tags.2', 'Marketing Standards')
    ],
    animation: { rotate: [0, 360] },
    transition: { duration: 45, repeat: Infinity, ease: "linear" }
  },
  {
    id: 'advisors',
    icon: ShieldCheck,
    title: t('landing.services.advisors.title', 'For In-House Counsel'),
    description: t('landing.services.advisors.description', 'Stop manually tracking global regulatory drift. Use our AI-mapped intelligence to oversee 27+ jurisdictions from a single dashboard.'),
    tags: [
      t('landing.services.advisors.tags.0', 'Global Privacy Mapping'),
      t('landing.services.advisors.tags.1', 'Regulatory Drift Alerts'),
      t('landing.services.advisors.tags.2', 'Compliance Audits')
    ],
    animation: { scale: [1, 1.05, 1], y: [0, -3, 0] },
    transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
  },
  {
    id: 'partners',
    icon: Building2,
    title: t('landing.services.partners.title', 'For Partner Firms'),
    description: t('landing.services.partners.description', 'Receive highly qualified, pre-structured client dossiers. Focus on high-value expert execution rather than tedious initial discovery calls.'),
    tags: [
      t('landing.services.partners.tags.0', 'Pre-vetted Leads'),
      t('landing.services.partners.tags.1', 'Execution-ready Dossiers'),
      t('landing.services.partners.tags.2', 'Partner Network APIs')
    ],
    animation: { rotate: [0, -10, 8, -5, 4, 0] },
    transition: { duration: 12, repeat: Infinity, ease: "easeInOut" }
  }
];

export function ServicesAccordion() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const [activeIndex, setActiveIndex] = useState(0);

  const audiences = useMemo(() => getAudiences(t), [t, i18n.language]);
  const activeAudience = audiences[activeIndex];
  const ActiveIcon = activeAudience.icon;

  return (
    <section className="bg-transparent border-y border-neutral-200/50 py-16 desktop-s:py-24 relative z-10 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <Typography variant="caption" className="text-primary-500 mb-3 block font-bold uppercase tracking-widest text-center desktop-s:text-left">
          {t('landing.services.badge', 'Tailored Compliance')}
        </Typography>
        <Typography variant="h1" weight="bold" className="text-neutral-900 mb-12 text-center desktop-s:text-left tracking-tight">
          {t('landing.services.title', 'What we cover, whoever you are')}
        </Typography>

        <div className="grid desktop-s:grid-cols-12 gap-8 items-stretch min-h-[500px]">
          {/* Left Side: Accordion Triggers */}
          <div className="desktop-s:col-span-5 flex flex-col gap-3">
            {audiences.map((audience, index) => {
              const isActive = index === activeIndex;
              const Icon = audience.icon;
              return (
                <div
                  key={audience.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                  className={`
                    group cursor-pointer p-4 desktop-s:p-5 rounded-xl border transition-all duration-300 flex items-center gap-4
                    ${isActive 
                      ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500/10' 
                      : 'bg-transparent border-transparent hover:bg-neutral-200/50'
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300
                    ${isActive ? 'bg-primary-500 text-accent-500 shadow-inner' : 'bg-white border border-neutral-200 text-primary-600 group-hover:border-primary-200'}
                  `}>
                    <Icon size={24} />
                  </div>
                  <Typography 
                    variant="h3" 
                    weight="bold" 
                    className={`transition-colors duration-300 ${isActive ? 'text-primary-700' : 'text-neutral-600 group-hover:text-neutral-900'}`}
                  >
                    {audience.title}
                  </Typography>
                </div>
              );
            })}
          </div>

          {/* Right Side: Bento Grid Content */}
          <div className="desktop-s:col-span-7 relative h-full flex flex-col mt-4 desktop-s:mt-0">
             <AnimatePresence mode="wait">
               <motion.div
                 key={activeAudience.id}
                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.98, y: -10 }}
                 transition={{ duration: 0.3, ease: "easeOut" }}
                 className="grid grid-cols-1 tablet:grid-cols-5 tablet:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 h-full min-h-[480px]"
               >
                 
                 {/* Top Left: Big Icon */}
                 <div className="tablet:col-span-2 bg-white rounded-[32px] p-8 flex items-center justify-center border border-neutral-200/70 shadow-sm relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-primary-50/40 to-transparent" />
                   <div className="absolute -right-6 -top-6 w-32 h-32 bg-accent-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                   <motion.div
                     animate={activeAudience.animation as any}
                     transition={activeAudience.transition as any}
                     className="relative z-10 flex"
                   >
                     <ActiveIcon size={80} className="text-primary-600 drop-shadow-sm transition-transform group-hover:scale-105 duration-500" strokeWidth={1.5} />
                   </motion.div>
                 </div>

                 {/* Top Right: Title & Desc */}
                 <div className="tablet:col-span-3 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-brand-surface rounded-bl-[100px] z-0 pointer-events-none opacity-40" />
                   <Typography variant="h2" weight="bold" className="text-neutral-900 mb-4 tracking-tight relative z-10">
                     {t('landing.services.builtForRole', 'Built for your role')}
                   </Typography>
                   <Typography variant="body" className="text-neutral-600 leading-relaxed text-lg relative z-10">
                     {activeAudience.description}
                   </Typography>
                 </div>

                 {/* Bottom Left: Integrations */}
                 <div className="tablet:col-span-3 bg-white rounded-[32px] p-8 border border-neutral-200/70 shadow-sm flex flex-col justify-center">
                   <Typography variant="caption" className="text-neutral-400 mb-6 uppercase tracking-widest block font-bold">
                     {t('landing.services.coreDomains', 'Core Domains Covered')}
                   </Typography>
                   <ul className="grid grid-cols-1 gap-y-4">
                     {activeAudience.tags.map(tag => (
                       <li key={tag} className="flex items-center gap-3">
                         <CheckCircle2 size={20} className="text-success-500 shrink-0 drop-shadow-sm" />
                         <Typography variant="body" className="text-neutral-700 font-medium">{tag}</Typography>
                       </li>
                     ))}
                   </ul>
                 </div>

                 {/* Bottom Right: CTA */}
                 <div 
                    className="tablet:col-span-2 bg-primary-900 rounded-[32px] p-8 border border-primary-800 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer" 
                    onClick={() => navigate(`/${i18n.language}/register`)}
                 >
                   <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent-500/20 rounded-full blur-2xl transition-all duration-500 group-hover:bg-accent-500/40" />
                   <div className="absolute inset-0 bg-primary-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                   
                   <div className="relative z-10 flex flex-col items-center gap-5">
                      <div className="w-16 h-16 bg-accent-500 text-primary-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.6)]">
                        <ArrowRight size={28} />
                      </div>
                      <Typography variant="body" weight="bold" className="text-white">
                        {t('landing.services.cta', 'Start your tailored assessment')}
                      </Typography>
                   </div>
                 </div>

               </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
