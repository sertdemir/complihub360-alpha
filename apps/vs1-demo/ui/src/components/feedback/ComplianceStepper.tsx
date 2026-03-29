import { Search, FileText, Users, Calendar, Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Typography } from '../ui/Typography';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const getFunnelSteps = (t: TFunction) => [
  {
    step: '01',
    icon: Search,
    title: t('landing.stepper.step1.title', 'Assessment'),
    body: t('landing.stepper.step1.body', 'Our AI scans your target footprint and flags exact regulatory gaps instantly.'),
  },
  {
    step: '02',
    icon: FileText,
    title: t('landing.stepper.step2.title', 'Dossier'),
    body: t('landing.stepper.step2.body', 'A structured, anonymised legal brief with all mandatory registrations and operational shifts.'),
  },
  {
    step: '03',
    icon: Users,
    title: t('landing.stepper.step3.title', 'Matching'),
    body: t('landing.stepper.step3.body', 'We algorithmically pair your dossier with pre-vetted local partners who know your gaps.'),
  },
  {
    step: '04',
    icon: Calendar,
    title: t('landing.stepper.step4.title', 'Appointment'),
    body: t('landing.stepper.step4.body', 'Book a strategy call directly with an expert who already understands your case.'),
  },
  {
    step: '05',
    icon: Rocket,
    title: t('landing.stepper.step5.title', 'Execution'),
    body: t('landing.stepper.step5.body', 'Your partner executes registrations, filings, and structural setups locally.'),
  },
];

// Icon circle diameter in px — must match top offset of the track line
const ICON_SIZE = 56; // w-14 h-14
const ICON_CENTER = ICON_SIZE / 2; // 28px

export function ComplianceStepper() {
  const { t } = useTranslation('common');
  const funnelSteps = getFunnelSteps(t);

  return (
    <section className="bg-transparent py-16 desktop-s:py-24 relative overflow-hidden z-10 border-b border-neutral-200/50">
      {/* Background Glow */}
      <div className="absolute top-[-20%] right-[-5%] w-[800px] h-[800px] bg-primary-100/40 rounded-full blur-[120px] pointer-events-none opacity-80" />

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
        >
          <Typography variant="caption" className="text-primary-500 mb-4 block font-bold tracking-widest uppercase">
            {t('landing.stepper.badge', 'The Partner Journey')}
          </Typography>
          <Typography variant="h1" weight="bold" className="text-neutral-900 mb-6 tracking-tight">
            {t('landing.stepper.titleStart', 'From unknown risk to')}<br />{t('landing.stepper.titleEnd', 'local execution')}
          </Typography>
          <Typography variant="body" className="text-neutral-600 max-w-2xl mx-auto">
            {t('landing.stepper.description', 'Our 5-step funnel ensures you don\'t just identify the problem — you solve it with the right local experts immediately.')}
          </Typography>
        </motion.div>

        {/* ── Stepper ── */}
        {/* Outer wrapper is relative so the track line can be absolutely positioned */}
        <div className="relative">

          {/* Track line — centres align with grid column centres.
              Column centre = (containerWidth − 4 × gap) / 10
              With gap-x-6 = 1.5 rem per gap, 4 gaps = 6 rem → calc((100% − 6rem) / 10).
              Only rendered at desktop-m (1280px) where the 5-col grid is active.   */}
          <div
            className="hidden desktop-m:block absolute z-0 pointer-events-none"
            style={{
              top: ICON_CENTER,
              left: 'calc((100% - 6rem) / 10)',
              right: 'calc((100% - 6rem) / 10)',
              height: 1,
            }}
          >
            {/* Grey base */}
            <div className="absolute inset-0 bg-neutral-200" />
            {/* Animated primary fill */}
            <motion.div
              className="absolute inset-0 bg-primary-200 origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.3 }}
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop-s:grid-cols-3 desktop-m:grid-cols-5 gap-x-6 gap-y-10">
            {funnelSteps.map(({ step, icon: Icon, title, body }, index) => {
              const isLast = index === funnelSteps.length - 1;

              return (
                <motion.div
                  key={step}
                  className="relative z-10 flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                >
                  {/* Icon circle — sits ON the track line */}
                  <motion.div
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shrink-0 mb-5 ${
                      isLast
                        ? 'bg-primary-500 border-primary-500 text-accent-500'
                        : 'bg-white border-neutral-200 text-primary-600'
                    }`}
                    initial={{ scale: 0.65, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 18,
                      delay: index * 0.1 + 0.15,
                    }}
                  >
                    <Icon size={20} />
                  </motion.div>

                  {/* Step label */}
                  <motion.span
                    className={`text-[11px] font-bold tracking-widest uppercase mb-1 block ${
                      isLast ? 'text-primary-600' : 'text-neutral-400'
                    }`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.25 }}
                  >
                    {t('landing.stepper.stepLabel', 'Step')} {step}
                  </motion.span>

                  {/* Title */}
                  <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2 leading-tight">
                    {title}
                  </Typography>

                  {/* Description */}
                  <Typography variant="ui-small" className="text-neutral-500 leading-relaxed">
                    {body}
                  </Typography>

                  {/* Execution status widget */}
                  {isLast && (
                    <motion.div
                      className="mt-5 w-full"
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.45 }}
                    >
                      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <motion.div
                            className="w-2 h-2 rounded-full bg-success-500 shrink-0"
                            animate={{ scale: [1, 1.7, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <Typography variant="ui-small" className="text-neutral-500 text-xs font-medium">
                            {t('landing.stepper.partnerAssigned', 'Partner Assigned')}
                          </Typography>
                        </div>
                        <div className="flex items-center justify-between">
                          <Typography variant="body" weight="bold" className="text-neutral-900 text-sm">
                            {t('landing.stepper.actionPlanActive', 'Action Plan Active')}
                          </Typography>
                          <div className="w-5 h-5 rounded-full bg-primary-50 hover:bg-primary-100 transition-colors flex items-center justify-center shrink-0">
                            <ArrowRight size={11} className="text-primary-600" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
