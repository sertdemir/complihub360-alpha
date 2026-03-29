import { Zap, ShieldCheck, Rocket } from 'lucide-react';
import { Typography } from '../ui/Typography';

const USPS = [
  {
    icon: Zap,
    title: 'Understand Faster',
    text: 'Cut through regulatory noise with AI-driven summaries mapped to your exact business footprint. No more endless PDF reading.',
    color: 'text-accent-500',
    bg: 'bg-accent-50'
  },
  {
    icon: ShieldCheck,
    title: 'Decide Safer',
    text: 'Every finding is grounded in live, verified legal sources. Feel confident making critical cross-border operational choices.',
    color: 'text-success-500',
    bg: 'bg-success-50'
  },
  {
    icon: Rocket,
    title: 'Match Instantly',
    text: "Don't lose weeks searching for vetted advisors. Get connected immediately to local experts who execute your action plan.",
    color: 'text-primary-500',
    bg: 'bg-primary-50'
  }
];

export function WhyUsSection() {
  return (
    <section className="bg-surface py-20 desktop-s:py-32 relative z-10 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Typography variant="caption" className="text-primary-600 font-bold uppercase tracking-widest block mb-4">
            Why CompliHub360?
          </Typography>
          <Typography variant="h2" weight="bold" className="text-neutral-900 mb-6">
            Stop guessing.<br />Start executing.
          </Typography>
          <Typography variant="body" className="text-neutral-600 text-lg">
            We bridge the gap between abstract legal knowledge and concrete local execution, empowering your business to scale globally.
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 desktop-s:gap-12">
          {USPS.map((usp, i) => (
            <div key={i} className="flex flex-col items-center text-center p-8 rounded-3xl bg-neutral-50 border border-neutral-100 transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className={`w-16 h-16 rounded-2xl ${usp.bg} flex items-center justify-center mb-8`}>
                <usp.icon size={32} className={usp.color} />
              </div>
              <Typography variant="h3" weight="bold" className="text-neutral-900 mb-4">
                {usp.title}
              </Typography>
              <Typography variant="body" className="text-neutral-600 leading-relaxed">
                {usp.text}
              </Typography>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
