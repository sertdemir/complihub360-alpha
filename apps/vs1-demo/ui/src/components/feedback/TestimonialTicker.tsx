import { Clock, ShieldCheck, Quote, Star, TrendingUp } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const getAllTestimonials = (t: TFunction) => [
  {
    id: 'u1',
    persona: t('landing.testimonials.u1.persona', 'U1 — E-Commerce Founder'),
    name: t('landing.testimonials.u1.name', 'Sarah K.'),
    role: t('landing.testimonials.u1.role', 'Founder & CEO, D2C Brand'),
    quote: t('landing.testimonials.u1.quote', 'We saved 3 weeks of legal research in 30 minutes. CompliHub360 flagged our EPR packaging obligation early. The structured dossier was sent to our solicitor the same day, preventing a €20k compliance penalty.'),
    result: t('landing.testimonials.u1.result', 'Prevented €20k Penalty'),
    resultIcon: ShieldCheck,
    resultCls: 'bg-success-100 text-success-800 border-success-200',
    tag: t('landing.testimonials.u1.tag', 'E-Commerce · EPR + VAT')
  },
  {
    id: 'u2',
    persona: t('landing.testimonials.u2.persona', 'U2 — SaaS Operations Manager'),
    name: t('landing.testimonials.u2.name', 'Marcus L.'),
    role: t('landing.testimonials.u2.role', 'Head of Operations, B2B SaaS'),
    quote: t('landing.testimonials.u2.quote', 'Navigating post-Brexit UK GDPR differences was stalling our enterprise deals. CompliHub360 gave us a grounded, cited analysis we could defend in front of our board. We closed our biggest deal 40% faster.'),
    result: t('landing.testimonials.u2.result', 'Deal Closed 40% Faster'),
    resultIcon: TrendingUp,
    resultCls: 'bg-accent-100 text-accent-800 border-accent-200',
    tag: t('landing.testimonials.u2.tag', 'SaaS · UK GDPR')
  },
  {
    id: 'u3',
    persona: t('landing.testimonials.u3.persona', 'U3 — Agency Director'),
    name: t('landing.testimonials.u3.name', 'Elena R.'),
    role: t('landing.testimonials.u3.role', 'Managing Director, Creative Hub'),
    quote: t('landing.testimonials.u3.quote', 'We were expanding into Germany. The AI mapped exactly what was needed for a subsidiary versus a branch, saving us over €15k in consulting fees and 2 months of waiting for preliminary legal advice.'),
    result: t('landing.testimonials.u3.result', 'Saved €15k in Consulting'),
    resultIcon: TrendingUp,
    resultCls: 'bg-primary-100 text-primary-800 border-primary-200',
    tag: t('landing.testimonials.u3.tag', 'Agency · Corporate')
  },
  {
    id: 'u4',
    persona: t('landing.testimonials.u4.persona', 'U4 — FinTech Compliance'),
    name: t('landing.testimonials.u4.name', 'David P.'),
    role: t('landing.testimonials.u4.role', 'Compliance Officer, FinPay'),
    quote: t('landing.testimonials.u4.quote', 'The speed at which CompliHub360 mapped our product against FCA thresholds was astonishing. Having live references to legislation built immense trust, allowing us to launch our UK pilot 3 months ahead of schedule.'),
    result: t('landing.testimonials.u4.result', 'Launched 3 Months Early'),
    resultIcon: Clock,
    resultCls: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    tag: t('landing.testimonials.u4.tag', 'FinTech · Regulatory')
  }
];

// Duplicate for the infinite loop ticker effect
const getTickerItems = (t: TFunction) => {
  const items = getAllTestimonials(t);
  return [...items, ...items];
};

export function TestimonialTicker() {
  const { t } = useTranslation('common');
  const TICKER_ITEMS = getTickerItems(t);

  return (
    <section className="bg-white py-16 desktop-s:py-24 relative overflow-hidden z-20 border-y border-neutral-200">
      
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <Typography variant="caption" className="text-primary-500 font-bold uppercase tracking-widest block mb-4">
          {t('landing.testimonials.badge', 'Real Results')}
        </Typography>
        <Typography variant="h1" weight="bold" className="text-neutral-900 tracking-tight">
          {t('landing.testimonials.titleStart', 'Trusted by founders and')}<br/>{t('landing.testimonials.titleEnd', 'operations teams')}
        </Typography>
      </div>

      {/* Ticker Container */}
      <div className="relative w-full flex overflow-hidden">

        {/* Left/Right Fade Masks to create a smooth enter/exit feeling */}
        <div className="absolute top-0 left-0 bottom-0 w-12 desktop-s:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 bottom-0 w-12 desktop-s:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Custom CSS for seamless scroll and pause on hover */}
        <style>{`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker-scroll {
            animation: ticker-scroll 55s linear infinite;
          }
          .animate-ticker-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="flex gap-6 px-6 w-max items-stretch animate-ticker-scroll">
          {TICKER_ITEMS.map((testimonial, idx) => {
            const Icon = testimonial.resultIcon;
            return (
              <div 
                key={`${testimonial.id}-${idx}`} 
                // 16:9 Card sizing — wide enough to read comfortably, ensuring the quote fits
                className="w-[400px] desktop-s:w-[550px] flex flex-col p-8 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                
                {/* Header: Persona + Badge */}
                <div className="flex justify-between items-center mb-6">
                  <Typography variant="caption" className="text-neutral-400 font-bold uppercase tracking-widest text-[10px] desktop-s:text-[11px]">
                    {testimonial.persona}
                  </Typography>
                  <div className={`px-2.5 py-1 rounded-md text-[10px] desktop-s:text-[11px] font-bold tracking-wider flex items-center gap-1.5 border ${testimonial.resultCls}`}>
                    <Icon size={12} />
                    {testimonial.result}
                  </div>
                </div>

                {/* Quote (Main body) */}
                <div className="flex-1 mb-6">
                  <Quote size={28} className="text-primary-100 mb-4" />
                  <Typography variant="body" className="text-neutral-700 leading-relaxed text-base desktop-s:text-lg">
                    {testimonial.quote}
                  </Typography>
                </div>

                {/* Footer: User Profile */}
                <div className="mt-auto flex items-center gap-4 pt-6 border-t border-neutral-100">
                  <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 font-bold shrink-0">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <Typography variant="ui-small" weight="bold" className="text-neutral-900 block">
                      {testimonial.name}
                    </Typography>
                    <Typography variant="caption" className="text-neutral-500 block">
                      {testimonial.role}
                    </Typography>
                  </div>
                  <div className="px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-md hidden desktop-s:block">
                    <Typography variant="caption" className="text-neutral-500 font-medium">
                      {testimonial.tag}
                    </Typography>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
